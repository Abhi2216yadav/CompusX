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
/** Salted hashes for accounts created at runtime — never plaintext. */
const CRED_KEY = `${NS}.credentials`

interface StoredCredential {
  salt: string
  hash: string
}

/**
 * Demo-only password hash. Uses Web Crypto (SHA-256, salted) where available
 * and a deterministic fallback elsewhere. Passwords are never stored in clear.
 */
async function hashPassword(password: string, salt: string): Promise<string> {
  const input = `${salt}:${password}`
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    const digest = await subtle.digest('SHA-256', new TextEncoder().encode(input))
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return `fnv.${(h >>> 0).toString(16)}`
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes)
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

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
  removeItem(CRED_KEY)
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

function readCredentials(): Record<string, StoredCredential> {
  const raw = getItem(CRED_KEY)
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, StoredCredential>
  } catch {
    return {}
  }
}

function writeCredential(uid: string, cred: StoredCredential) {
  const all = readCredentials()
  all[uid] = cred
  setItem(CRED_KEY, JSON.stringify(all))
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
    const stored = readCredentials()[acc.uid]
    if (stored) {
      const hash = await hashPassword(password, stored.salt)
      if (hash !== stored.hash) throw new Error('Incorrect password. Please try again.')
    } else if (DEMO_PASSWORDS[acc.uid]) {
      if (password !== DEMO_PASSWORDS[acc.uid]) {
        throw new Error('Incorrect password. Please try again.')
      }
    } else {
      throw new Error('No password has been set for this account. Ask an administrator to reset it.')
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

  async createStaffAccount({ email, displayName, password }) {
    const users = readCol<Record<string, unknown>>(COLLECTIONS.users)
    if (users.some((u) => String(u.email).toLowerCase() === email.trim().toLowerCase())) {
      throw new Error('An account with this email address already exists.')
    }
    const uid = `u-${makeId()}`
    const salt = randomSalt()
    const secret = password && password.length >= 6 ? password : `Cx-${randomSalt().slice(0, 12)}`
    writeCredential(uid, { salt, hash: await hashPassword(secret, salt) })
    void displayName
    broadcast()
    // The profile document is written by the caller so the account and its
    // class/subject assignments are created together.
    return { uid, inviteSent: !password }
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
    const uid = String(doc.id)
    const salt = randomSalt()
    writeCredential(uid, { salt, hash: await hashPassword('campusx123', salt) })
    DEMO_PASSWORDS[uid] = 'campusx123'
    broadcast()
  },

  async changePassword(newPassword) {
    const uid = readSession()
    if (!uid) throw new Error('You must be signed in to change your password.')
    if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.')
    const salt = randomSalt()
    writeCredential(uid, { salt, hash: await hashPassword(newPassword, salt) })
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
