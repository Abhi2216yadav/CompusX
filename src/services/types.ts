/**
 * CampusX — domain model
 * ───────────────────────────────────────────────────────────────────────────
 * Every interface below maps 1:1 to a Firestore collection document.
 * The architecture is single-school-first: every school-scoped document
 * carries a `schoolId`, so adding a second school only requires creating
 * new school + class + subject documents and filtering by `schoolId`.
 */

/* ── Primitives ─────────────────────────────────────────────────────────── */

export type ID = string
/** Firestore Timestamp | ISO string | epoch ms — normalised by `toDate()`. */
export type TimestampValue = unknown

export type Role = 'student' | 'teacher' | 'admin'
export type AcademicYear = string // e.g. "2026-27"
export type Level = number // 6..12

/* ── Identity ───────────────────────────────────────────────────────────── */

export interface School {
  id: ID
  name: string
  code: string
  address: string
  city?: string
  logoUrl?: string
  email?: string
  phone?: string
  currentAcademicYear: AcademicYear
  /** School-wide switches used by admin settings. */
  leaderboardPublic: boolean
  peerLearningEnabled: boolean
  createdAt: TimestampValue
}

export interface UserProfile {
  id: ID
  /** == Auth uid (Firebase) or synthetic demo id. */
  schoolId: ID
  role: Role
  name: string
  email: string
  photoUrl?: string
  academicYear: AcademicYear

  /* student-only */
  classId?: ID
  classLevel?: Level
  section?: string
  rollNo?: string

  /* teacher / admin-only */
  subjects?: ID[]
  /** Classes a teacher is assigned to (multi-select). */
  classIds?: ID[]
  designation?: string
  /** Human-readable staff id, e.g. `TCH-2026-0004`. Unique per school. */
  teacherId?: string
  qualification?: string
  /** `yyyy-MM-dd`. */
  joiningDate?: string
  /** Forces a password change on first sign-in (admin-created accounts). */
  mustChangePassword?: boolean
  /** uid of the administrator who created the account. */
  createdBy?: ID

  /** Generic public-safe extras. */
  bio?: string
  phone?: string
  address?: string
  isActive: boolean
  isDemo?: boolean
  createdAt: TimestampValue
  updatedAt: TimestampValue
}

/* ── Academic structure ─────────────────────────────────────────────────── */

export interface ClassRoom {
  id: ID
  schoolId: ID
  name: string // "Class 10"
  classLevel: Level
  section: string // "A"
  academicYear: AcademicYear
  homeroomTeacherId?: ID
  studentCount?: number
  createdAt: TimestampValue
}

export interface Subject {
  id: ID
  schoolId: ID
  name: string
  code: string // "MATH"
  color: string // tailwind-safe hex
  /** Which class levels teach this subject. */
  classLevels: Level[]
  description?: string
  createdAt: TimestampValue
}

export interface Chapter {
  id: ID
  schoolId: ID
  subjectId: ID
  classLevel: Level
  name: string
  order: number
  /** Short learning objective shown on the chapter card. */
  summary?: string
  createdAt: TimestampValue
}

/* ── Content ────────────────────────────────────────────────────────────── */

export type MaterialType = 'notes' | 'pdf' | 'important' | 'revision' | 'pyq' | 'video'

export interface Material {
  id: ID
  schoolId: ID
  subjectId: ID
  chapterId?: ID
  classLevel: Level
  academicYear: AcademicYear
  title: string
  description?: string
  type: MaterialType
  fileUrl: string
  fileName: string
  fileSize?: number
  uploadedBy: ID
  uploadedByName: string
  /** Student contributions require teacher/admin approval. */
  isStudentContribution: boolean
  isApproved: boolean
  downloadCount: number
  tags: string[]
  createdAt: TimestampValue
}

export type TaskStatus = 'pending' | 'completed' | 'overdue'
export type TaskKind = 'homework' | 'assignment'

/** Shared shape for `homework` and `assignments` collections. */
export interface Task {
  id: ID
  schoolId: ID
  kind: TaskKind
  subjectId: ID
  classLevel: Level
  academicYear: AcademicYear
  title: string
  description: string
  teacherId: ID
  teacherName: string
  assignedAt: TimestampValue
  dueAt: TimestampValue
  attachmentUrl?: string
  attachmentName?: string
  maxMarks: number
  /** Ids of students who marked this complete. */
  completedBy: ID[]
  createdAt: TimestampValue
}

export type NoticePriority = 'normal' | 'important' | 'urgent'
export type NoticeCategory =
  | 'exam'
  | 'holiday'
  | 'circular'
  | 'competition'
  | 'deadline'
  | 'class'

export interface Notice {
  id: ID
  schoolId: ID
  title: string
  body: string
  category: NoticeCategory
  priority: NoticePriority
  authorId: ID
  authorName: string
  /** Empty array = whole school. */
  targetClassLevels: Level[]
  targetSections: string[]
  pinned: boolean
  publishAt: TimestampValue
  expiresAt?: TimestampValue
  createdAt: TimestampValue
}

export type EventCategory =
  | 'sports'
  | 'cultural'
  | 'science'
  | 'technology'
  | 'quiz'
  | 'workshop'
  | 'competition'
  | 'club'

export interface SchoolEvent {
  id: ID
  schoolId: ID
  name: string
  description: string
  category: EventCategory
  startsAt: TimestampValue
  endsAt?: TimestampValue
  venue: string
  organiserId: ID
  organiserName: string
  registrationDeadline?: TimestampValue
  imageUrl?: string
  classLevels: Level[]
  capacity?: number
  /** Student ids who registered. */
  attendeeIds: ID[]
  createdAt: TimestampValue
}

/* ── Questions, quizzes and tests ───────────────────────────────────────── */

export type QuestionType = 'mcq' | 'truefalse'
export type Difficulty = 'easy' | 'medium' | 'hard'

/** Body shared by quiz `questions` and PYQ `pyqs`. */
export interface QuestionBody {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  marks: number
}

export interface Question extends QuestionBody {
  id: ID
  schoolId: ID
  subjectId: ID
  chapterId?: ID
  classLevel: Level
  academicYear: AcademicYear
  type: QuestionType
  difficulty: Difficulty
  tags: string[]
  createdBy: ID
  createdByName: string
  isActive: boolean
  createdAt: TimestampValue
}

export interface Pyq extends QuestionBody {
  id: ID
  schoolId: ID
  subjectId: ID
  chapterId?: ID
  classLevel: Level
  /** "Board Exam" | "Pre-Board" | "Unit Test" */
  examName: string
  board?: string
  year: number
  type: QuestionType
  difficulty: Difficulty
  tags: string[]
  createdBy: ID
  isActive: boolean
  createdAt: TimestampValue
}

export interface Quiz {
  id: ID
  schoolId: ID
  title: string
  description?: string
  subjectId: ID
  chapterId?: ID
  classLevel: Level
  academicYear: AcademicYear
  difficulty: Difficulty | 'mixed'
  /** Number of questions pulled at random from the eligible pool. */
  questionCount: number
  /** Optional fixed set — when empty, questions are sampled by difficulty. */
  questionIds: ID[]
  timeLimitSec: number
  marksPerQuestion: number
  isPublished: boolean
  allowRetry: boolean
  createdBy: ID
  createdByName: string
  createdAt: TimestampValue
}

export interface MockTest {
  id: ID
  schoolId: ID
  title: string
  description?: string
  instructions: string[]
  subjectId: ID
  classLevel: Level
  academicYear: AcademicYear
  /** Mix of PYQs and practice questions. */
  pyqCount: number
  practiceCount: number
  totalMarks: number
  durationMin: number
  isPublished: boolean
  allowRetry: boolean
  createdBy: ID
  createdByName: string
  createdAt: TimestampValue
}

export interface AttemptResultRow {
  questionId: ID
  chosen: number | null
  correct: number
  isCorrect: boolean
  timeSpentSec: number
}

export type AttemptKind = 'quiz' | 'pyq' | 'mock'

export interface TestAttempt {
  id: ID
  schoolId: ID
  studentId: ID
  studentName: string
  classId: ID
  classLevel: Level
  section: string
  academicYear: AcademicYear
  kind: AttemptKind
  refId: ID
  refTitle: string
  subjectId: ID
  subjectName: string
  chapterId?: ID
  /** Pre-computed period bucket: `2026-W07`, `2026-03`, `all`. */
  period: string
  startedAt: TimestampValue
  submittedAt: TimestampValue
  timeSpentSec: number
  answers: Record<ID, number>
  results: AttemptResultRow[]
  totalQuestions: number
  correctCount: number
  wrongCount: number
  unattemptedCount: number
  totalMarks: number
  scoredMarks: number
  percentage: number
  autoSubmitted: boolean
}

/* ── Attendance ─────────────────────────────────────────────────────────── */

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export interface MonthlyAttendance {
  total: number
  present: number
  absent: number
  late: number
  excused: number
}

/**
 * `attendance/{studentId}` — one aggregate document per student instead of one
 * per class period. Keeps attendance reads to a single fetch for the whole
 * class while still supporting month-wise drill-down.
 */
export interface AttendanceRecord {
  id: ID
  schoolId: ID
  studentId: ID
  classId: ID
  classLevel: Level
  section: string
  /** Keyed by `yyyy-mm`. */
  monthly: Record<string, MonthlyAttendance>
  /** Most recent 25 class days for the teacher's day-wise view. */
  recent: { date: string; status: AttendanceStatus }[]
  totalClasses: number
  present: number
  absent: number
  late: number
  excused: number
  percentage: number
  updatedAt: TimestampValue
}

/* ── Community ──────────────────────────────────────────────────────────── */

export type LostFoundType = 'lost' | 'found'
export type LostFoundStatus = 'open' | 'resolved' | 'rejected'

export interface LostFoundPost {
  id: ID
  schoolId: ID
  type: LostFoundType
  itemName: string
  description: string
  location: string
  /** yyyy-MM-dd */
  lostDate?: string
  imageUrl?: string
  contactName: string
  contactMethod: string
  postedBy: ID
  postedByName: string
  classLevel: Level
  status: LostFoundStatus
  moderatedBy?: ID
  moderatedAt?: TimestampValue
  createdAt: TimestampValue
}

export type QuestionCategory = 'Mathematics' | 'Science' | 'English' | 'Computer' | 'General'

export interface PeerAnswer {
  id: ID
  body: string
  authorId: ID
  authorName: string
  isAccepted: boolean
  upvotes: ID[]
  isRemoved: boolean
  createdAt: TimestampValue
}

export interface PeerQuestion {
  id: ID
  schoolId: ID
  category: QuestionCategory
  subjectId?: ID
  title: string
  body: string
  authorId: ID
  authorName: string
  classLevel: Level
  isResolved: boolean
  answers: PeerAnswer[]
  upvotes: ID[]
  reports: { userId: ID; reason: string; createdAt: TimestampValue }[]
  createdAt: TimestampValue
}

export interface ClubAnnouncement {
  id: ID
  body: string
  authorName: string
  createdAt: TimestampValue
}

export interface Club {
  id: ID
  schoolId: ID
  name: string
  description: string
  icon: string
  color: string
  coordinatorId: ID
  coordinatorName: string
  memberIds: ID[]
  announcements: ClubAnnouncement[]
  activities: string[]
  gallery: { url: string; caption: string }[]
  createdAt: TimestampValue
}

/* ── Reputation & notifications ─────────────────────────────────────────── */

export type ContributionKind =
  | 'material'
  | 'peerHelp'
  | 'quiz'
  | 'pyq'
  | 'mock'
  | 'event'
  | 'club'
  | 'moderation'

export interface Contribution {
  id: ID
  schoolId: ID
  studentId: ID
  studentName: string
  kind: ContributionKind
  points: number
  description: string
  refId?: ID
  approvedBy?: ID
  createdAt: TimestampValue
}

export type NotificationType =
  | 'homework'
  | 'assignment'
  | 'notice'
  | 'deadline'
  | 'material'
  | 'event'
  | 'testResult'
  | 'club'
  | 'peerAnswer'
  | 'system'

export interface AppNotification {
  id: ID
  /** Empty = broadcast to a role; otherwise the specific user id. */
  audience: 'user' | 'role'
  role?: Role
  userId?: ID
  schoolId: ID
  type: NotificationType
  title: string
  body: string
  link?: string
  readBy: ID[]
  createdAt: TimestampValue
}

/* ── Feature 33 — Student Ranking & Progress ────────────────────────────── */

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'overall'

export interface LeaderboardFilters {
  period: LeaderboardPeriod
  academicYear: AcademicYear
  classId: ID | 'all'
  section: string | 'all'
  subjectId: ID | 'all'
}

/** Lightweight aggregate stored on `studentMetrics/{studentId}`. */
export interface PeriodMetrics {
  quizAverage: number
  pyqAccuracy: number
  mockTestAverage: number
  quizCount: number
  pyqCount: number
  mockCount: number
  testsAttempted: number
  questionsAttempted: number
  questionsCorrect: number
  /** 0-100: volume + score stability + recency. */
  consistency: number
  contributionPoints: number
  activityPoints: number
  /** Final ranking score 0-100. */
  overallScore: number
  progressPercentage: number
  /** Rolling window of the last 20 attempt percentages — feeds consistency. */
  recent: number[]
}

export interface SubjectMastery {
  attempted: number
  correct: number
  percentage: number
}

/**
 * `studentMetrics/{studentId}` — the single source of truth for ranking.
 * Written incrementally on every attempt/contribution so the leaderboard
 * never has to scan `testAttempts`.
 */
export interface StudentMetrics {
  id: ID
  schoolId: ID
  studentId: ID
  studentName: string
  classId: ID
  classLevel: Level
  classLabel: string
  section: string
  rollNo: string
  academicYear: AcademicYear
  photoUrl?: string
  /** Bucket keys: `2026-W07`, `2026-03`, and `all`. */
  periods: Record<string, PeriodMetrics>
  subjectMastery: Record<ID, SubjectMastery>
  chapterMastery: Record<ID, SubjectMastery>
  contributionPoints: number
  activityPoints: number
  reputationLevel: ReputationLevel
  streakWeeks: number
  lastActiveAt: TimestampValue
  updatedAt: TimestampValue
}

export type ReputationLevel = 'Beginner' | 'Contributor' | 'Helper' | 'Star Student'

export type PerformanceBand = 'chasing' | 'rising' | 'steady' | 'needsPractice'

/** Public-safe. Deliberately excludes attendance, email, roll numbers of others. */
export interface LeaderboardEntry {
  rank: number
  studentId: ID
  studentName: string
  photoUrl?: string
  classLabel: string
  classLevel: Level
  section: string
  overallScore: number
  progressPercentage: number
  quizAverage: number
  pyqAccuracy: number
  mockTestAverage: number
  testsAttempted: number
  questionsAttempted: number
  questionsCorrect: number
  consistency: number
  contributionPoints: number
  activityPoints: number
  band: PerformanceBand
}

/**
 * `leaderboardSnapshots/{scopeId}` — a pre-computed, ranked list for one
 * filter combination. Pages read the snapshot instead of recomputing.
 */
export interface LeaderboardSnapshot {
  id: ID
  schoolId: ID
  period: LeaderboardPeriod
  periodKey: string
  academicYear: AcademicYear
  classId: ID | 'all'
  section: string | 'all'
  subjectId: ID | 'all'
  /** Top N (default 50). `totalStudents` covers everyone for "my rank". */
  entries: LeaderboardEntry[]
  /**
   * Compact `{studentId, rank, overallScore}` index for every ranked student
   * including those outside `entries`. ~30 bytes each, so "My Rank" stays exact
   * without storing full entry objects for the whole school.
   */
  rankIndex: { studentId: ID; rank: number; overallScore: number; progressPercentage: number }[]
  totalStudents: number
  /** Best student outside the stored window — enables "N points away". */
  nextAfterWindow?: LeaderboardEntry
  generatedAt: TimestampValue
  generatedBy: 'system' | 'admin'
  /** Bumped on every recompute so clients can invalidate caches. */
  generation: number
}

export interface StudentProgressDetail {
  student: LeaderboardEntry
  rank: number
  totalStudents: number
  subjectBreakdown: { subjectId: ID; name: string; color: string; percentage: number }[]
  chapterWeak: { chapterId: ID; name: string; subjectName: string; percentage: number }[]
  chapterStrong: { chapterId: ID; name: string; subjectName: string; percentage: number }[]
  timeline: { label: string; percentage: number; tests: number }[]
  quizHistory: { id: ID; title: string; subjectName: string; percentage: number; date: string }[]
  contributionBreakdown: { kind: ContributionKind; label: string; points: number }[]
}
