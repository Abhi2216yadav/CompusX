/**
 * Demo backend — a localStorage-backed implementation of the `Db` contract.
 *
 * It exists so CampusX is fully functional (auth, CRUD, scoring, timers,
 * ranking) before a Firebase project exists. It implements the exact same
 * interface as `firestoreBackend`, so swapping in Firebase is a config change.
 *
 * Multi-tab safety: every write broadcasts a `storage` event which the
 * subscriber re-reads, so two open tabs stay in sync.
 */
import {
  applyLocal,
  COLLECTIONS,
  type AuthUser,
  type CollectionName,
  type ListOptions,
  type Db,
  type Unsubscribe,
  type UploadResult,
  type WriteOp,
} from '@/services/db'
import { buildSeed } from '@/data/seed'
import { makeId } from '@/utils/id'

const NS = 'campusx.demo.v1'
const KEY = (col: CollectionName) => `${NS}.${col}`
const SESSION_KEY = `${NS}.session`

export type DemoRole = 'student' | 'teacher' | 'admin'

export interface DemoAccount {
  uid: string
  password: string
  role: DemoRole
  name: string
  email: string
  photoUrl?: string
  classId?: string
  classLevel?: number
  section?: string
  rollNo?: string
  academicYear: string
  schoolId: string
}

/* ── Storage plumbing ───────────────────────────────────────────────────── */

function readStore(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(`${NS}.seeded`)
    if (raw) return {}
  } catch {
    /* storage unavailable */
  }
  return {}
}

function ensureSeeded() {
  let seeded = false
  try {
    seeded = localStorage.getItem(`${NS}.seeded`) === '1'
  } catch {
    seeded = true // private mode: keep in memory only
  }
  if (seeded) return
  const seed = buildSeed()
  for (const [col, docs] of Object.entries(seed)) {
    localStorage.setItem(KEY(col as CollectionName), JSON.stringify(docs))
  }
  localStorage.setItem(`${NS}.seeded`, '1')
}

export function resetDemoData() {
  for (const col of Object.values(COLLECTIONS)) localStorage.removeItem(KEY(col))
  localStorage.removeItem(`${NS}.seeded`)
  localStorage.removeItem(SESSION_KEY)
  ensureSeeded()
  broadcast()
}

let memoryFallback: Record<string, string> = {}

function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? memoryFallback[key] ?? null
  } catch {
    return memoryFallback[key] ?? null
  }
}

function setItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    memoryFallback[key] = value
  }
}

function removeItem(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    delete memoryFallback[key]
  }
}

function readCol<T>(col: CollectionName): T[] {
  const raw = getItem(KEY(col))
  if (!raw) return []
  try {
    return JSON.parse(raw) as T[]
  } catch {
    return []
  }
}

function writeCol<T>(col: CollectionName, docs: T[]) {
  setItem(KEY(col), JSON.stringify(docs))
  broadcast()
}

/* ── Change notification (in-tab + cross-tab) ───────────────────────────── */

type Listener = () => void
const listeners = new Set<Listener>()

function broadcast() {
  for (const l of [...listeners]) l()
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key?.startsWith(NS)) return
    broadcast()
  })
}

function subscribeToChanges(fn: Listener): Unsubscribe {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/* ── Auth ───────────────────────────────────────────────────────────────── */

function readSession(): string | null {
  return getItem(SESSION_KEY)
}

function writeSession(uid: string | null) {
  if (uid) setItem(SESSION_KEY, uid)
  else removeItem(SESSION_KEY)
}

function findAccountByUid(uid: string): DemoAccount | null {
  const users = readCol<Record<string, unknown>>(COLLECTIONS.users)
  const doc = users.find((u) => u.id === uid)
  // Seeded documents store `id`, never `uid` — they must be mapped through
  // `accountFromUserDoc` or `authUser.uid` comes back undefined.
  return doc ? accountFromUserDoc(doc) : null
}

function accountFromUserDoc(u: Record<string, unknown>): DemoAccount {
  return {
    uid: String(u.id),
    password: '',
    role: u.role as DemoRole,
    name: String(u.name),
    email: String(u.email),
    photoUrl: (u.photoUrl as string) ?? undefined,
    classId: (u.classId as string) ?? undefined,
    classLevel: u.classLevel as number,
    section: (u.section as string) ?? undefined,
    rollNo: (u.rollNo as string) ?? undefined,
    academicYear: String(u.academicYear),
    schoolId: String(u.schoolId),
  }
}

function toAuthUser(acc: DemoAccount): AuthUser {
  return {
    uid: acc.uid,
    email: acc.email,
    displayName: acc.name,
    photoURL: acc.photoUrl ?? null,
    emailVerified: true,
  }
}

ensureSeeded()

/* ── Backend ────────────────────────────────────────────────────────────── */

export const demoBackend: Db = {
  kind: 'demo',
  label: 'Local demo store',

  async list<T>(col: CollectionName, opts?: ListOptions) {
    return applyLocal(readCol<T>(col), opts ?? {})
  },

async get<T>(col: CollectionName, id: string) {
    const docs = readCol<Record<string, unknown>>(col)
    return (docs.find((d) => d.id === id) as T | undefined) ?? null
  },

  async create<T>(col: CollectionName, data: T, id?: string) {
    const docs = readCol<Record<string, unknown>>(col)
    const provided = (data as { id?: string }).id
    const newId = id ?? provided ?? makeId()
    docs.push({ ...(data as Record<string, unknown>), id: newId })
    writeCol(col, docs)
    return newId
  },

  async set(col, id, data) {
    const docs = readCol<Record<string, unknown>>(col)
    const idx = docs.findIndex((d) => d.id === id)
    const merged = idx >= 0 ? { ...docs[idx], ...deepMerge(docs[idx], data), id } : { ...data, id }
    if (idx >= 0) docs[idx] = merged
    else docs.push(merged)
    writeCol(col, docs)
  },

  async update(col, id, patch) {
    const docs = readCol<Record<string, unknown>>(col)
    const idx = docs.findIndex((d) => d.id === id)
    if (idx < 0) {
      docs.push({ ...patch, id })
    } else {
      docs[idx] = { ...docs[idx], ...deepMerge(docs[idx], patch), id }
    }
    writeCol(col, docs)
  },

  async remove(col, id) {
    writeCol(col, readCol<Record<string, unknown>>(col).filter((d) => d.id !== id))
  },

  async writeBatch(ops: WriteOp[]) {
    for (const op of ops) {
      if (op.type === 'delete') {
        writeCol(op.collection, readCol<Record<string, unknown>>(op.collection).filter((d) => d.id !== op.id))
      } else {
        await demoBackend.set(op.collection, op.id, op.data ?? {})
      }
    }
  },

  subscribe<T>(col: CollectionName, opts: ListOptions | undefined, cb: (rows: T[]) => void, onError?: (e: Error) => void) {
    try {
      cb(applyLocal(readCol<T>(col), opts ?? {}))
    } catch (e) {
      onError?.(e as Error)
    }
    return subscribeToChanges(() => {
      try {
        cb(applyLocal(readCol<T>(col), opts ?? {}))
      } catch (e) {
        onError?.(e as Error)
      }
    })
  },

  onAuth(cb) {
    const emit = () => {
      const uid = readSession()
      if (!uid) {
        cb(null)
        return
      }
      const acc = findAccountByUid(uid)
      cb(acc ? toAuthUser(acc) : null)
    }
    emit()
    return subscribeToChanges(emit)
  },

  async signIn(email, password) {
    await new Promise((r) => setTimeout(r, 260)) // realistic latency
    const users = readCol<Record<string, unknown>>(COLLECTIONS.users)
    const doc = users.find(
      (u) => String(u.email).toLowerCase() === email.trim().toLowerCase() && u.isActive !== false
    )
    if (!doc) throw new Error('No account found with that email address.')
    const acc = accountFromUserDoc(doc)
    const expected = DEMO_PASSWORDS[acc.uid]
    if (expected && password !== expected) {
      throw new Error('Incorrect password. Please try again.')
    }
    if (!expected && password.length < 6) {
      throw new Error('Incorrect password. Please try again.')
    }
    writeSession(acc.uid)
    broadcast()
  },

  async signUp(email, password, displayName) {
    if (password.length < 6) throw new Error('Password must be at least 6 characters.')
    const users = readCol<Record<string, unknown>>(COLLECTIONS.users)
    if (users.some((u) => String(u.email).toLowerCase() === email.toLowerCase())) {
      throw new Error('An account with this email already exists.')
    }
    const uid = `u-${makeId()}`
    DEMO_PASSWORDS[uid] = password
    users.push({
      id: uid,
      schoolId: 'school-abc',
      role: 'student',
      name: displayName,
      email,
      academicYear: '2026-27',
      isActive: true,
      isDemo: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    writeCol(COLLECTIONS.users, users)
    writeSession(uid)
    broadcast()
    return {
      uid,
      email,
      displayName,
      photoURL: null,
      emailVerified: false,
    }
  },

  async signInWithGoogle() {
    // Simulates the Google popup by attaching the email to the demo student.
    const users = readCol<Record<string, unknown>>(COLLECTIONS.users)
    const doc = users.find((u) => u.id === 'u-abhay')
    if (!doc) throw new Error('Demo Google account unavailable.')
    writeSession(String(doc.id))
    broadcast()
    return toAuthUser(accountFromUserDoc(doc))
  },

  async resetPassword(email) {
    const users = readCol<Record<string, unknown>>(COLLECTIONS.users)
    const doc = users.find((u) => String(u.email).toLowerCase() === email.toLowerCase())
    if (!doc) throw new Error('No account found with that email address.')
    DEMO_PASSWORDS[String(doc.id)] = 'campusx123'
    broadcast()
  },

  async changePassword(newPassword) {
    const uid = readSession()
    if (!uid) throw new Error('You must be signed in to change your password.')
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.')
    DEMO_PASSWORDS[uid] = newPassword
    broadcast()
  },

  async signOut() {
    writeSession(null)
    broadcast()
  },

  async uploadFile(path, file, fileName): Promise<UploadResult> {
    const name = fileName ?? (file instanceof File ? file.name : 'upload')
    const dataUrl =
      file instanceof File
        ? await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(new Error('Could not read file.'))
            reader.readAsDataURL(file)
          })
        : ''
    setItem(`${NS}.file.${path}`, dataUrl)
    return {
      url: dataUrl,
      name,
      size: file instanceof File ? file.size : (file as Blob).size,
      path,
    }
  },

  async deleteFile(path) {
    removeItem(`${NS}.file.${path}`)
  },
}

/** Passwords are kept out of the seeded documents so they are not inspectable. */
export const DEMO_PASSWORDS: Record<string, string> = {
  'u-abhay': 'student123',
  'u-aarav': 'student123',
  'u-priya': 'student123',
  'u-teacher': 'teacher123',
  'u-admin': 'admin123',
}

/** Deep-merges patch objects, creating nested objects as needed. */
export function deepMerge(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const current = out[key]
      out[key] =
        current && typeof current === 'object' && !Array.isArray(current)
          ? deepMerge(current as Record<string, unknown>, value as Record<string, unknown>)
          : { ...(value as Record<string, unknown>) }
    } else if (Array.isArray(value)) {
      // Arrays are replaced wholesale by index so partial updates behave.
      const current = Array.isArray(out[key]) ? (out[key] as unknown[]) : []
      const merged = [...current]
      value.forEach((item, i) => {
        const prev = merged[i]
        if (
          item && typeof item === 'object' && !Array.isArray(item) &&
          prev && typeof prev === 'object' && !Array.isArray(prev)
        ) {
          merged[i] = { ...(prev as object), ...(item as object) }
        } else {
          merged[i] = item
        }
      })
      out[key] = merged
    } else {
      out[key] = value
    }
  }
  return out
}

export function getDemoSessionUid(): string | null {
  return readSession()
}

export { readStore }
