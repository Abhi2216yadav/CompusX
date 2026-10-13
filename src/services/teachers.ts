/**
 * Teacher management service.
 * ───────────────────────────────────────────────────────────────────────────
 * Business logic for the admin "Add Teacher" flow: validation, duplicate
 * detection, unique teacher-id generation and account creation. It talks only
 * to the `Db` contract, so it works unchanged against the demo backend and
 * Cloud Firestore.
 *
 * Creating a teacher is a two-step operation (an Auth account plus a profile
 * document). Authorisation is enforced server-side — see `firestore.rules` —
 * so an unauthorised caller is rejected by the backend even though the same
 * code path is used by the UI.
 */
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import type { ID, UserProfile } from '@/services/types'

export type TeacherStatus = 'active' | 'inactive'
export type PasswordMode = 'password' | 'invite'

export interface TeacherInput {
  /* Personal */
  name: string
  email: string
  phone: string
  address: string
  /* Professional */
  teacherId: string
  designation: string
  qualification: string
  joiningDate: string
  subjectIds: string[]
  classIds: string[]
  status: TeacherStatus
  /* Credentials */
  passwordMode: PasswordMode
  password: string
  confirmPassword: string
}

export type TeacherFieldErrors = Record<string, string>

export const MIN_PASSWORD_LENGTH = 8

export function emptyTeacherInput(): TeacherInput {
  return {
    name: '',
    email: '',
    phone: '',
    address: '',
    teacherId: '',
    designation: '',
    qualification: '',
    joiningDate: new Date().toISOString().slice(0, 10),
    subjectIds: [],
    classIds: [],
    status: 'active',
    passwordMode: 'password',
    password: '',
    confirmPassword: '',
  }
}

/** Turns an existing profile into editable form values. */
export function teacherInputFromProfile(teacher: UserProfile): TeacherInput {
  return {
    name: teacher.name ?? '',
    email: teacher.email ?? '',
    phone: teacher.phone ?? '',
    address: teacher.address ?? '',
    teacherId: teacher.teacherId ?? '',
    designation: teacher.designation ?? '',
    qualification: teacher.qualification ?? '',
    joiningDate: teacher.joiningDate ?? '',
    subjectIds: teacher.subjects ?? [],
    classIds: teacher.classIds ?? [],
    status: teacher.isActive === false ? 'inactive' : 'active',
    passwordMode: 'password',
    password: '',
    confirmPassword: '',
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^[+]?[\d][\d\s().-]{5,}$/

/**
 * Synchronous, format-only validation. Duplicate checks need a round trip to
 * the database and live in `createTeacher`.
 */
export function validateTeacherForm(
  input: TeacherInput,
  opts: { requireCredentials: boolean; originalEmail?: string }
): TeacherFieldErrors {
  const errors: TeacherFieldErrors = {}

  if (!input.name.trim()) errors.name = 'Full name is required.'

  const email = input.email.trim()
  if (!email) errors.email = 'Email address is required.'
  else if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.'

  if (input.phone.trim() && !PHONE_RE.test(input.phone.trim())) {
    errors.phone = 'Enter a valid phone number.'
  }

  if (!input.designation.trim()) errors.designation = 'Designation is required.'
  if (!input.joiningDate) errors.joiningDate = 'Joining date is required.'

  if (!input.subjectIds.length) errors.subjectIds = 'Assign at least one subject.'
  if (!input.classIds.length) errors.classIds = 'Assign at least one class.'

  if (opts.requireCredentials && input.passwordMode === 'password') {
    if (!input.password) errors.password = 'Set a temporary password.'
    else if (input.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`
    }
    if (input.password && input.confirmPassword !== input.password) {
      errors.confirmPassword = 'Passwords do not match.'
    }
  }

  return errors
}

export function hasErrors(errors: TeacherFieldErrors): boolean {
  return Object.keys(errors).length > 0
}

export function isTeacherEmailValid(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

/* ── Teacher id generation ──────────────────────────────────────────────── */

const TEACHER_ID_RE = /^TCH-(\d{4})-(\d+)$/

function academicYearNumber(academicYear: string): number {
  const match = /(\d{4})/.exec(academicYear)
  if (match) return Number(match[1])
  return new Date().getFullYear()
}

/**
 * Builds the next sequential staff id (`TCH-2026-0007`) from the ids already
 * in use, so ids stay human-readable and unique per academic year.
 */
export function nextTeacherId(existingIds: (string | undefined)[], year: number): string {
  let max = 0
  for (const id of existingIds) {
    if (!id) continue
    const match = TEACHER_ID_RE.exec(id.trim())
    if (match && Number(match[1]) === year) max = Math.max(max, Number(match[2]))
  }
  return `TCH-${year}-${String(max + 1).padStart(4, '0')}`
}

/* ── Queries ────────────────────────────────────────────────────────────── */

export async function listTeachers(schoolId: string): Promise<UserProfile[]> {
  return db.list<UserProfile>(COLLECTIONS.users, {
    where: [
      { field: 'schoolId', op: '==', value: schoolId },
      { field: 'role', op: '==', value: 'teacher' },
    ],
    orderBy: [{ field: 'name' }],
  })
}

export interface TeacherDuplicates {
  email?: UserProfile
  teacherId?: UserProfile
}

/** Finds an existing teacher sharing the email or staff id. */
export async function findTeacherDuplicates(
  schoolId: string,
  email: string,
  teacherId: string,
  ignoreUid?: string
): Promise<TeacherDuplicates> {
  const teachers = await listTeachers(schoolId)
  const emailLc = email.trim().toLowerCase()
  const idLc = teacherId.trim().toLowerCase()
  const others = teachers.filter((t) => t.id !== ignoreUid)
  return {
    email: others.find((t) => (t.email ?? '').toLowerCase() === emailLc),
    teacherId: idLc ? others.find((t) => (t.teacherId ?? '').toLowerCase() === idLc) : undefined,
  }
}

/** Proposes the next free staff id for a school. */
export async function suggestTeacherId(schoolId: string, academicYear: string): Promise<string> {
  const teachers = await listTeachers(schoolId)
  return nextTeacherId(teachers.map((t) => t.teacherId), academicYearNumber(academicYear))
}

/* ── Mutations ──────────────────────────────────────────────────────────── */

export interface CreateTeacherResult {
  uid: string
  teacherId: string
  email: string
  /** True when no password was set and a setup email was triggered. */
  inviteSent: boolean
  /** Present only when the admin chose a temporary password. */
  temporaryPassword?: string
}

export async function createTeacher(params: {
  schoolId: string
  academicYear: string
  createdBy: ID
  input: TeacherInput
  photoUrl?: string
}): Promise<CreateTeacherResult> {
  const { schoolId, academicYear, createdBy, input, photoUrl } = params
  const email = input.email.trim().toLowerCase()

  const year = academicYearNumber(academicYear)
  let teacherId = input.teacherId.trim().toUpperCase()
  if (!teacherId) {
    const teachers = await listTeachers(schoolId)
    teacherId = nextTeacherId(teachers.map((t) => t.teacherId), year)
  }

  const dup = await findTeacherDuplicates(schoolId, email, teacherId)
  if (dup.email) throw new Error('A teacher with this email address already exists.')
  if (dup.teacherId) throw new Error(`Teacher ID "${teacherId}" is already in use.`)

  const account = await db.createStaffAccount({
    email,
    displayName: input.name.trim(),
    password: input.passwordMode === 'password' ? input.password : undefined,
  })

  const now = Date.now()
  const profile: UserProfile = {
    id: account.uid,
    schoolId,
    role: 'teacher',
    name: input.name.trim(),
    email,
    photoUrl: photoUrl || undefined,
    academicYear,
    teacherId,
    designation: input.designation.trim(),
    qualification: input.qualification.trim() || undefined,
    joiningDate: input.joiningDate || undefined,
    phone: input.phone.trim() || undefined,
    address: input.address.trim() || undefined,
    subjects: input.subjectIds,
    classIds: input.classIds,
    mustChangePassword: input.passwordMode === 'password',
    createdBy,
    isActive: input.status === 'active',
    isDemo: false,
    createdAt: now,
    updatedAt: now,
  }

  try {
    await db.create(COLLECTIONS.users, profile, account.uid)
  } catch {
    // The login account exists but the profile write failed. There is no server
    // runtime to roll the Auth user back from the browser, so surface a clear,
    // actionable message instead of leaving a silent broken account.
    throw new Error(
      'The login account was created but saving the teacher profile failed. Retry, or use “Resend invite” once the teacher appears.'
    )
  }

  // Invite mode: trigger the secure password-setup flow for the new user.
  if (account.inviteSent) {
    try {
      await db.resetPassword(email)
    } catch {
      /* Non-fatal: the admin can resend the invite from the teacher list. */
    }
  }

  return {
    uid: account.uid,
    teacherId,
    email,
    inviteSent: account.inviteSent,
    temporaryPassword: input.passwordMode === 'password' ? input.password : undefined,
  }
}

export interface UpdateTeacherPatch {
  name: string
  email: string
  phone: string
  address: string
  teacherId: string
  designation: string
  qualification: string
  joiningDate: string
  subjectIds: string[]
  classIds: string[]
  status: TeacherStatus
  photoUrl?: string
}

/**
 * Updates a teacher's profile. Email changes are admin-approved and the Auth
 * email is deliberately left untouched here (changing it requires the user to
 * re-verify), so the profile email stays the source of truth for display.
 */
export async function updateTeacher(uid: string, patch: UpdateTeacherPatch): Promise<void> {
  await db.set(COLLECTIONS.users, uid, {
    name: patch.name.trim(),
    email: patch.email.trim().toLowerCase(),
    phone: patch.phone.trim() || undefined,
    address: patch.address.trim() || undefined,
    teacherId: patch.teacherId.trim().toUpperCase(),
    designation: patch.designation.trim(),
    qualification: patch.qualification.trim() || undefined,
    joiningDate: patch.joiningDate || undefined,
    subjects: patch.subjectIds,
    classIds: patch.classIds,
    isActive: patch.status === 'active',
    ...(patch.photoUrl ? { photoUrl: patch.photoUrl } : {}),
    updatedAt: Date.now(),
  })
}

export async function setTeacherActive(uid: string, isActive: boolean): Promise<void> {
  await db.set(COLLECTIONS.users, uid, { isActive, updatedAt: Date.now() })
}

/** Deletes a teacher's profile, which revokes their access (rules read it). */
export async function deleteTeacher(uid: string): Promise<void> {
  await db.remove(COLLECTIONS.users, uid)
}

/** Sends (or re-sends) the secure password-setup email. */
export async function sendTeacherInvite(email: string): Promise<void> {
  await db.resetPassword(email)
}
