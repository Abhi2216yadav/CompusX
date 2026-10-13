/**
 * CampusX data-access contract.
 * ───────────────────────────────────────────────────────────────────────────
 * Two interchangeable implementations satisfy this interface:
 *
 *   • `firestoreBackend` — Cloud Firestore (production)
 *   • `demoBackend`      — localStorage-backed store (no Firebase project needed)
 *
 * Business logic never imports either one directly; it calls `db` from
 * `src/services/index.ts`, which picks the backend at boot based on whether
 * Firebase environment variables are present.
 *
 * Firestore note: `list()` sends the full `where` + `orderBy` query to the
 * server. If the required composite index is missing, it transparently falls
 * back to a single-filter fetch plus in-memory filtering so the app never
 * hard-fails. See README → "Required Firestore indexes".
 */

export const COLLECTIONS = {
  schools: 'schools',
  users: 'users',
  classes: 'classes',
  subjects: 'subjects',
  chapters: 'chapters',
  materials: 'materials',
  homework: 'homework',
  assignments: 'assignments',
  notices: 'notices',
  events: 'events',
  questions: 'questions',
  pyqs: 'pyqs',
  quizzes: 'quizzes',
  mockTests: 'mockTests',
  testAttempts: 'testAttempts',
  attendance: 'attendance',
  clubs: 'clubs',
  lostFound: 'lostFound',
  studentQuestions: 'studentQuestions',
  notifications: 'notifications',
  contributions: 'contributions',
  studentMetrics: 'studentMetrics',
  leaderboardSnapshots: 'leaderboardSnapshots',
  leaderboardConfig: 'leaderboardConfig',
} as const

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS]

export type FilterOp =
  | '=='
  | '!='
  | '<'
  | '<='
  | '>'
  | '>='
  | 'array-contains'
  | 'array-contains-any'
  | 'in'

export interface FilterSpec {
  field: string
  op: FilterOp
  value: unknown
}

export interface OrderSpec {
  field: string
  dir?: 'asc' | 'desc'
}

export interface ListOptions {
  where?: FilterSpec[]
  orderBy?: OrderSpec[]
  limit?: number
}

export interface WriteOp {
  type: 'create' | 'set' | 'update' | 'delete'
  collection: CollectionName
  id: string
  data?: Record<string, unknown>
}

export interface UploadResult {
  url: string
  name: string
  size: number
  path: string
}

export interface AuthUser {
  uid: string
  email: string
  displayName: string
  photoURL?: string | null
  emailVerified: boolean
}

export type Unsubscribe = () => void

export interface CreateStaffAccountParams {
  email: string
  displayName: string
  /**
   * Administrator-chosen temporary password. When omitted the backend creates
   * the account with a random secret and the caller should trigger a secure
   * password-setup (reset) email so the user chooses their own password.
   */
  password?: string
}

export interface CreateStaffAccountResult {
  uid: string
  /** True when no password was supplied and a setup email should be sent. */
  inviteSent: boolean
}

export interface Db {
  readonly kind: 'firestore' | 'demo'
  readonly label: string

  list<T = Record<string, unknown>>(col: CollectionName, opts?: ListOptions): Promise<T[]>
  get<T = Record<string, unknown>>(col: CollectionName, id: string): Promise<T | null>
  create<T = Record<string, unknown>>(
    col: CollectionName,
    data: T,
    id?: string
  ): Promise<string>
  set(col: CollectionName, id: string, data: Record<string, unknown>): Promise<void>
  update(col: CollectionName, id: string, patch: Record<string, unknown>): Promise<void>
  remove(col: CollectionName, id: string): Promise<void>
  writeBatch(ops: WriteOp[]): Promise<void>

  subscribe<T = Record<string, unknown>>(
    col: CollectionName,
    opts: ListOptions | undefined,
    cb: (rows: T[]) => void,
    onError?: (e: Error) => void
  ): Unsubscribe

  /* ── Auth ── */
  onAuth(cb: (user: AuthUser | null) => void): Unsubscribe
  signIn(email: string, password: string): Promise<void>
  signUp(email: string, password: string, displayName: string): Promise<AuthUser>
  /**
   * Creates a Firebase Auth (or demo) account for another person without
   * disturbing the caller's own session. Only ever invoked by an administrator;
   * authorisation is enforced by the backend and the security rules, never by
   * this call site alone.
   */
  createStaffAccount(params: CreateStaffAccountParams): Promise<CreateStaffAccountResult>
  signInWithGoogle(): Promise<AuthUser>
  resetPassword(email: string): Promise<void>
  changePassword(newPassword: string): Promise<void>
  signOut(): Promise<void>

  /* ── Storage ── */
  uploadFile(path: string, file: File | Blob, fileName?: string): Promise<UploadResult>
  deleteFile(path: string): Promise<void>
}

/* ── Shared in-memory helpers ───────────────────────────────────────────── */

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  const da = a as number
  const db_ = b as number
  const as = a == null ? Number.NEGATIVE_INFINITY : da
  const bs = b == null ? Number.NEGATIVE_INFINITY : db_
  if (as === bs) return 0
  return as < bs ? -1 : 1
}

function readPath(doc: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null) return undefined
    return (acc as Record<string, unknown>)[key]
  }, doc)
}

export function matchesFilter(doc: unknown, f: FilterSpec): boolean {
  const value = readPath(doc, f.field)
  switch (f.op) {
    case '==':
      return value === f.value
    case '!=':
      return value !== f.value
    case '<':
      return compare(value, f.value) < 0
    case '<=':
      return compare(value, f.value) <= 0
    case '>':
      return compare(value, f.value) > 0
    case '>=':
      return compare(value, f.value) >= 0
    case 'array-contains':
      return Array.isArray(value) && value.includes(f.value)
    case 'array-contains-any':
      return Array.isArray(value) && Array.isArray(f.value) && f.value.some((v) => value.includes(v))
    case 'in':
      return Array.isArray(f.value) && f.value.includes(value)
    default:
      return false
  }
}

/** Applies filters, sorting and limit locally. Shared by both backends. */
export function applyLocal<T>(rows: T[], opts: ListOptions = {}): T[] {
  let out = rows
  if (opts.where?.length) out = out.filter((r) => opts.where!.every((f) => matchesFilter(r, f)))
  if (opts.orderBy?.length) {
    const specs = [...opts.orderBy]
    out = [...out].sort((a, b) => {
      for (const spec of specs) {
        const av = readPath(a, spec.field)
        const bv = readPath(b, spec.field)
        const res = compare(av, bv)
        if (res !== 0) return spec.dir === 'desc' ? -res : res
      }
      return 0
    })
  }
  if (opts.limit != null) out = out.slice(0, opts.limit)
  return out
}
