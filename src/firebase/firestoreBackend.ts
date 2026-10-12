/** Firestore implementation of the `Db` contract. */
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy as fsOrderBy,
  query,
  setDoc,
  updateDoc,
  where as fsWhere,
  writeBatch,
  type QueryConstraint,
  type WhereFilterOp,
} from 'firebase/firestore'
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updatePassword,
  updateProfile,
  type User,
} from 'firebase/auth'
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage'

import { auth, db, storage } from '@/firebase/config'
import {
  applyLocal,
  type AuthUser,
  type CollectionName,
  type Db,
  type FilterSpec,
  type ListOptions,
  type Unsubscribe,
  type UploadResult,
  type WriteOp,
} from '@/services/db'

/**
 * Firestore refuses to store `undefined`, while the domain model uses it to
 * mean "not set" (e.g. `photoUrl: undefined`, `board: undefined`). The whole
 * document is cleaned recursively, because a single nested `undefined` — inside
 * a chapter's topic list or a quiz's per-question block — fails the write just
 * as loudly as a top-level one.
 */
function toFirestorePayload(value: unknown): Record<string, unknown> {
  return cleanObject(value, 0)
}

const MAX_CLEAN_DEPTH = 12

function cleanObject(value: unknown, depth: number): Record<string, unknown> {
  if (depth > MAX_CLEAN_DEPTH) return {}
  if (value === null || typeof value !== 'object') return {}

  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
          ? cleanObject(item, depth + 1)
          : item
      ) as unknown as Record<string, unknown>
  }

  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val === undefined) continue
    out[key] =
      val !== null && typeof val === 'object'
        ? Array.isArray(val)
          ? cleanObject(val, depth + 1)
          : cleanObject(val, depth + 1)
        : val
  }
  return out
}

function assertReady() {
  if (!db || !auth) throw new Error('Firebase is not configured. See README → Firebase setup.')
}

function opToWhereOp(op: FilterSpec['op']): WhereFilterOp {
  return op as WhereFilterOp
}

function constraints(opts: ListOptions = {}): QueryConstraint[] {
  const cs: QueryConstraint[] = (opts.where ?? []).map((f) =>
    fsWhere(f.field, opToWhereOp(f.op), f.value as never)
  )
  for (const o of opts.orderBy ?? []) cs.push(fsOrderBy(o.field, o.dir ?? 'asc'))
  if (opts.limit != null) cs.push(fsLimit(opts.limit))
  return cs
}

/**
 * Runs the full server query. Falls back to an unindexed fetch + in-memory
 * filtering when Firestore reports a missing composite index, so the UI never
 * breaks before the owner creates the indexes listed in the README.
 */
async function safeQuery<T>(
  col: CollectionName,
  opts: ListOptions
): Promise<T[]> {
  assertReady()
  const snapshot = await getDocs(query(collection(db!, col), ...constraints(opts)))
  return snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as T)
}

async function fallbackQuery<T>(
  col: CollectionName,
  opts: ListOptions
): Promise<T[]> {
  assertReady()
  const where = opts.where ?? []
  const equality = where.filter((f) => f.op === '==')
  // Prefer the filter that looks most selective; equality filters first.
  const primary = equality[where.length - 1] ?? (where.length ? where[0] : undefined)
  const base = primary
    ? query(collection(db!, col), fsWhere(primary.field, opToWhereOp(primary.op), primary.value as never))
    : query(collection(db!, col))
  const snapshot = await getDocs(base)
  const rows = snapshot.docs.map((d) => ({ ...d.data(), id: d.id }) as T)
  return applyLocal(rows, { ...opts, where: primary ? where.filter((f) => f !== primary) : [] })
}

async function runQuery<T>(
  col: CollectionName,
  opts: ListOptions
): Promise<T[]> {
  try {
    return await safeQuery<T>(col, opts)
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === 'failed-precondition' || code === 'permission-denied' || code === 'unavailable') {
      return fallbackQuery<T>(col, opts)
    }
    throw error
  }
}

function toAuthUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  }
}

export const firestoreBackend: Db = {
  kind: 'firestore',
  label: 'Cloud Firestore',

  async list<T>(col: CollectionName, opts?: ListOptions) {
    return runQuery<T>(col, opts ?? {})
  },

  async get<T>(col: CollectionName, id: string) {
    assertReady()
    const snap = await getDoc(doc(db!, col, id))
    return snap.exists() ? ({ ...snap.data(), id: snap.id } as T) : null
  },

  async create<T>(col: CollectionName, data: T, id?: string) {
    assertReady()
    // Firestore rejects `undefined` values, so strip them before writing.
    const payload = toFirestorePayload(data)
    if (id) {
      await setDoc(doc(db!, col, id), payload)
      return id
    }
    const ref = await addDoc(collection(db!, col), payload)
    return ref.id
  },

  async set(col: CollectionName, id: string, data: Record<string, unknown>) {
    assertReady()
    await setDoc(doc(db!, col, id), toFirestorePayload(data), { merge: true })
  },

  async update(col: CollectionName, id: string, patch: Record<string, unknown>) {
    assertReady()
    await updateDoc(doc(db!, col, id), toFirestorePayload(patch))
  },

  async remove(col: CollectionName, id: string) {
    assertReady()
    await deleteDoc(doc(db!, col, id))
  },

  async writeBatch(ops: WriteOp[]) {
    assertReady()
    const batch = writeBatch(db!)
    for (const op of ops) {
      const ref = doc(db!, op.collection, op.id)
      if (op.type === 'delete') batch.delete(ref)
      else if (op.type === 'update') batch.update(ref, toFirestorePayload(op.data ?? {}))
      else batch.set(ref, toFirestorePayload(op.data ?? {}), { merge: op.type === 'set' })
    }
    await batch.commit()
  },

  subscribe<T>(col: CollectionName, opts: ListOptions | undefined, cb: (rows: T[]) => void, onError?: (e: Error) => void) {
    assertReady()
    return onSnapshot(
      query(collection(db!, col), ...constraints(opts ?? {})),
      (snap) => cb(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as T)),
      (error) => {
        console.warn(`[CampusX] live query on "${col}" failed:`, error.message)
        // Fall back to a one-shot fetch so the page still renders.
        runQuery<T>(col, opts ?? {}).then(cb, onError)
      }
    ) as Unsubscribe
  },

  onAuth(cb: (user: AuthUser | null) => void) {
    assertReady()
    return onAuthStateChanged(auth!, (user) => cb(user ? toAuthUser(user) : null))
  },

  async signIn(email: string, password: string) {
    assertReady()
    await signInWithEmailAndPassword(auth!, email, password)
  },

  async signUp(email: string, password: string, displayName: string) {
    assertReady()
    const { user } = await createUserWithEmailAndPassword(auth!, email, password)
    await updateProfile(user, { displayName })
    return toAuthUser(user)
  },

  async signInWithGoogle() {
    assertReady()
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })
    const { user } = await signInWithPopup(auth!, provider)
    return toAuthUser(user)
  },

  async resetPassword(email: string) {
    assertReady()
    await sendPasswordResetEmail(auth!, email)
  },

  async changePassword(newPassword: string) {
    assertReady()
    if (!auth?.currentUser) throw new Error('You must be signed in to change your password.')
    await updatePassword(auth!.currentUser, newPassword)
  },

  async signOut() {
    assertReady()
    await fbSignOut(auth!)
  },

  async uploadFile(path: string, file: File | Blob, fileName?: string): Promise<UploadResult> {
    if (!storage) throw new Error('Firebase Storage is not configured.')
    const target = ref(storage, path)
    await uploadBytes(target, file)
    const url = await getDownloadURL(target)
    const name = fileName ?? (file instanceof File ? file.name : path.split('/').pop() ?? 'file')
    return {
      url,
      name,
      size: file instanceof File ? file.size : (file as Blob).size,
      path,
    }
  },

  async deleteFile(path: string) {
    if (!storage) return
    try {
      await deleteObject(ref(storage, path))
    } catch {
      /* already deleted */
    }
  },
}
