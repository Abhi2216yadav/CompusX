/**
 * Feature 33 service layer — Student Ranking & Progress.
 *
 * Read path  : read the stored `leaderboardSnapshots/{scopeId}` document.
 * Write path : `rebuildLeaderboard()` recomputes a scope from `studentMetrics`
 *              and stores the ranked result. Triggered after every attempt and
 *              available on demand to admins.
 */
import type {
  Contribution,
  LeaderboardEntry,
  LeaderboardFilters,
  LeaderboardSnapshot,
  StudentMetrics,
  StudentProgressDetail,
  TestAttempt,
} from '@/services/types'
import { COLLECTIONS } from '@/services/db'
import { db } from './index'
import {
  CONTRIBUTION_LABELS,
  buildSnapshot,
  locateStudent,
  periodFor,
  rankEntries,
  replayAttempts,
  snapshotIdFor,
  toEntry,
} from './ranking'
import { daysUntil } from '@/utils/date'
import { round1 } from '@/utils/format'

/* ── Guards & settings ──────────────────────────────────────────────────── */

export interface LeaderboardSettings {
  /** When false, students see only their own rank — no public names. */
  publicRankings: boolean
  /** Optional minimum attempts before a student appears on the board. */
  minAttempts: number
  updatedAt: number
}

export const DEFAULT_LEADERBOARD_SETTINGS: LeaderboardSettings = {
  publicRankings: true,
  minAttempts: 1,
  updatedAt: 0,
}

export async function getLeaderboardSettings(
  schoolId: string
): Promise<LeaderboardSettings> {
  const school = await db.get<{ leaderboardPublic: boolean }>(COLLECTIONS.schools, schoolId)
  const overrides = await db.get<Partial<LeaderboardSettings>>(
    COLLECTIONS.leaderboardConfig,
    schoolId
  )
  return {
    ...DEFAULT_LEADERBOARD_SETTINGS,
    publicRankings: overrides?.publicRankings ?? school?.leaderboardPublic ?? true,
    minAttempts: overrides?.minAttempts ?? DEFAULT_LEADERBOARD_SETTINGS.minAttempts,
    updatedAt: overrides?.updatedAt ?? 0,
  }
}

export async function setLeaderboardSettings(
  schoolId: string,
  patch: Partial<LeaderboardSettings>
): Promise<void> {
  await db.set(COLLECTIONS.leaderboardConfig, schoolId, {
    ...patch,
    updatedAt: Date.now(),
  })
}

/* ── Read path ──────────────────────────────────────────────────────────── */

export async function getSnapshot(
  schoolId: string,
  filters: LeaderboardFilters
): Promise<LeaderboardSnapshot | null> {
  const id = snapshotIdFor(schoolId, filters)
  const cached = await db.get<LeaderboardSnapshot>(COLLECTIONS.leaderboardSnapshots, id)
  if (cached) return cached
  // First visit for this filter combination — materialise it, then read back.
  await rebuildLeaderboard(schoolId, filters, 'system')
  return db.get<LeaderboardSnapshot>(COLLECTIONS.leaderboardSnapshots, id)
}

/* ── Write path ─────────────────────────────────────────────────────────── */

export function passesFilters(
  metrics: StudentMetrics,
  filters: LeaderboardFilters,
  minAttempts: number
): boolean {
  if (metrics.academicYear !== filters.academicYear) return false
  if (filters.classId !== 'all' && metrics.classId !== filters.classId) return false
  if (filters.section !== 'all' && metrics.section !== filters.section) return false
  return periodFor(metrics, filters).testsAttempted >= minAttempts
}

/** Recomputes and stores the ranked snapshot for one filter combination. */
export async function rebuildLeaderboard(
  schoolId: string,
  filters: LeaderboardFilters,
  generatedBy: 'system' | 'admin' = 'system'
): Promise<LeaderboardSnapshot> {
  const [allMetrics, settings] = await Promise.all([
    db.list<StudentMetrics>(COLLECTIONS.studentMetrics, { where: [{ field: 'schoolId', op: '==', value: schoolId }] }),
    getLeaderboardSettings(schoolId),
  ])

  const entries: LeaderboardEntry[] = []
  for (const metrics of allMetrics) {
    if (!passesFilters(metrics, filters, settings.minAttempts)) continue
    const entry = toEntry({ metrics, includeIdentity: settings.publicRankings }, filters)
    if (entry) entries.push(entry)
  }

  const id = snapshotIdFor(schoolId, filters)
  const existing = await db.get<LeaderboardSnapshot>(COLLECTIONS.leaderboardSnapshots, id)
  const snapshot = buildSnapshot({
    id,
    schoolId,
    filters,
    entries,
    generatedBy,
    generation: (existing?.generation ?? 0) + 1,
  })
  await db.set(COLLECTIONS.leaderboardSnapshots, id, snapshot as unknown as Record<string, unknown>)
  return snapshot
}

/**
 * Cheap incremental refresh: after a student finishes a test, only the scopes
 * that could be affected are touched. Call this instead of a full rebuild.
 */
export async function refreshLeaderboardForStudent(
  schoolId: string,
  filters: LeaderboardFilters = {
    period: 'overall',
    academicYear: '2026-27',
    classId: 'all',
    section: 'all',
    subjectId: 'all',
  }
): Promise<void> {
  try {
    await rebuildLeaderboard(schoolId, filters, 'system')
  } catch (error) {
    console.warn('[CampusX] leaderboard refresh failed', error)
  }
}

/**
 * Full rebuild of every scope a school needs: all-time, this month, this week,
 * plus per-class and per-subject variants. Used by the admin "Recalculate" action
 * and after bulk imports.
 */
export async function rebuildAllLeaderboards(
  schoolId: string,
  academicYear: string,
  classIds: string[],
  subjectIds: string[]
): Promise<number> {
  let count = 0
  const base = { academicYear, classId: 'all' as const, section: 'all' as const, subjectId: 'all' as const }

  for (const period of ['overall', 'monthly', 'weekly'] as const) {
    await rebuildLeaderboard(schoolId, { ...base, period }, 'admin')
    count += 1
  }
  for (const classId of classIds) {
    for (const period of ['overall', 'monthly'] as const) {
      await rebuildLeaderboard(schoolId, { ...base, period, classId }, 'admin')
      count += 1
    }
  }
  for (const subjectId of subjectIds) {
    await rebuildLeaderboard(schoolId, { ...base, period: 'overall', subjectId }, 'admin')
    count += 1
  }
  return count
}

/* ── "My rank" ──────────────────────────────────────────────────────────── */

export interface MyRankResult {
  rank: number
  totalStudents: number
  score: number
  progress: number
  /** Next rank up, if any. */
  nextRank?: number
  pointsToNext: number
  nextStudentName?: string
  entries: LeaderboardEntry[]
  isPublic: boolean
  snapshotGeneratedAt: number
}

export async function getMyRank(
  schoolId: string,
  studentId: string,
  filters: LeaderboardFilters
): Promise<MyRankResult | null> {
  const [snapshot, metrics, settings] = await Promise.all([
    getSnapshot(schoolId, filters),
    db.get<StudentMetrics>(COLLECTIONS.studentMetrics, studentId),
    getLeaderboardSettings(schoolId),
  ])
  if (!snapshot) return null

  const me = snapshot.entries.find((e) => e.studentId === studentId)
  const period = metrics ? periodFor(metrics, filters) : null
  const myScore = me?.overallScore ?? period?.overallScore ?? 0
  const lookup = locateStudent(snapshot, studentId, myScore)
  if (!lookup) return null

  const nextName =
    lookup.nextStudentName ??
    snapshot.entries.find((e) => e.rank === (lookup.nextRank ?? -1))?.studentName

  return {
    rank: lookup.rank,
    totalStudents: snapshot.totalStudents,
    score: myScore,
    progress: me?.progressPercentage ?? period?.progressPercentage ?? 0,
    nextRank: lookup.nextRank,
    pointsToNext: lookup.pointsToNext,
    nextStudentName: nextName,
    entries: snapshot.entries,
    isPublic: settings.publicRankings,
    snapshotGeneratedAt: Number(snapshot.generatedAt) || 0,
  }
}

/* ── Student progress detail ────────────────────────────────────────────── */

export async function getStudentProgress(
  schoolId: string,
  studentId: string,
  filters: LeaderboardFilters
): Promise<StudentProgressDetail | null> {
  const [snapshot, metrics, attempts, contributions, subjects, chapters, settings] =
    await Promise.all([
      getSnapshot(schoolId, filters),
      db.get<StudentMetrics>(COLLECTIONS.studentMetrics, studentId),
      db.list<TestAttempt>(COLLECTIONS.testAttempts, {
        where: [
          { field: 'schoolId', op: '==', value: schoolId },
          { field: 'studentId', op: '==', value: studentId },
        ],
        orderBy: [{ field: 'submittedAt', dir: 'desc' }],
        limit: 200,
      }),
      db.list<Contribution>(COLLECTIONS.contributions, {
        where: [
          { field: 'schoolId', op: '==', value: schoolId },
          { field: 'studentId', op: '==', value: studentId },
        ],
      }),
      db.list<{ id: string; name: string; color: string }>(COLLECTIONS.subjects, {
        where: [{ field: 'schoolId', op: '==', value: schoolId }],
      }),
      db.list<{ id: string; name: string; subjectId: string }>(COLLECTIONS.chapters, {
        where: [{ field: 'schoolId', op: '==', value: schoolId }],
      }),
      getLeaderboardSettings(schoolId),
    ])

  if (!metrics) return null

  const ranked = rankEntries(
    snapshot?.entries ?? []
  )
  const found = ranked.find((e) => e.studentId === studentId)
  const entry: LeaderboardEntry =
    found ??
    toEntry({ metrics, includeIdentity: settings.publicRankings }, filters) ?? {
      rank: snapshot?.totalStudents ?? 1,
      studentId,
      studentName: metrics.studentName,
      classLabel: metrics.classLabel,
      classLevel: metrics.classLevel,
      section: metrics.section,
      overallScore: periodFor(metrics, filters).overallScore,
      progressPercentage: periodFor(metrics, filters).progressPercentage,
      quizAverage: periodFor(metrics, filters).quizAverage,
      pyqAccuracy: periodFor(metrics, filters).pyqAccuracy,
      mockTestAverage: periodFor(metrics, filters).mockTestAverage,
      testsAttempted: periodFor(metrics, filters).testsAttempted,
      questionsAttempted: periodFor(metrics, filters).questionsAttempted,
      questionsCorrect: periodFor(metrics, filters).questionsCorrect,
      consistency: periodFor(metrics, filters).consistency,
      contributionPoints: periodFor(metrics, filters).contributionPoints,
      activityPoints: periodFor(metrics, filters).activityPoints,
      band: 'steady',
    }

  const subjectName = new Map(subjects.map((s) => [s.id, s.name]))
  const subjectColor = new Map(subjects.map((s) => [s.id, s.color]))
  const chapterName = new Map(chapters.map((c) => [c.id, c.name]))
  const chapterSubject = new Map(chapters.map((c) => [c.id, c.subjectId]))

  const subjectBreakdown = Object.entries(metrics.subjectMastery)
    .map(([subjectId, m]) => ({
      subjectId,
      name: subjectName.get(subjectId) ?? 'Subject',
      color: subjectColor.get(subjectId) ?? '#6366f1',
      percentage: m.percentage,
    }))
    .sort((a, b) => b.percentage - a.percentage)

  const chapterRows = Object.entries(metrics.chapterMastery)
    .map(([chapterId, m]) => ({
      chapterId,
      name: chapterName.get(chapterId) ?? 'Chapter',
      subjectName: subjectName.get(chapterSubject.get(chapterId) ?? '') ?? '',
      percentage: m.percentage,
      attempted: m.attempted,
    }))
    .filter((c) => c.attempted >= 3)

  return {
    student: entry,
    rank: entry.rank,
    totalStudents: snapshot?.totalStudents ?? entry.rank,
    subjectBreakdown,
    chapterWeak: chapterRows.filter((c) => c.percentage < 65).sort((a, b) => a.percentage - b.percentage).slice(0, 5),
    chapterStrong: chapterRows.filter((c) => c.percentage >= 75).sort((a, b) => b.percentage - a.percentage).slice(0, 5),
    timeline: buildTimeline(attempts),
    quizHistory: attempts.slice(0, 12).map((a) => ({
      id: a.id,
      title: a.refTitle,
      subjectName: a.subjectName,
      percentage: a.percentage,
      date: new Date(Number(a.submittedAt) || 0).toISOString().slice(0, 10),
    })),
    contributionBreakdown: buildContributionBreakdown(contributions),
  }
}

/** Weekly average for the last 8 weeks — powers the progress-over-time chart. */
function buildTimeline(attempts: TestAttempt[]): { label: string; percentage: number; tests: number }[] {
  if (!attempts.length) return []
  const buckets = new Map<string, number[]>()
  for (const a of attempts) {
    const key = weekLabel(Number(a.submittedAt) || 0)
    const list = buckets.get(key) ?? []
    list.push(a.percentage)
    buckets.set(key, list)
  }
  return [...buckets.entries()]
    .sort((x, y) => x[0].localeCompare(y[0]))
    .slice(-8)
    .map(([label, values]) => ({
      label,
      percentage: round1(values.reduce((s, v) => s + v, 0) / values.length),
      tests: values.length,
    }))
}

function weekLabel(ms: number): string {
  const d = new Date(ms)
  const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
    d.getMonth()
  ]
  return `${d.getDate()} ${month}`
}

function buildContributionBreakdown(
  contributions: Contribution[]
): { kind: Contribution['kind']; label: string; points: number }[] {
  const totals = new Map<string, number>()
  for (const c of contributions) {
    totals.set(c.kind, (totals.get(c.kind) ?? 0) + c.points)
  }
  return [...totals.entries()]
    .map(([kind, points]) => ({
      kind: kind as Contribution['kind'],
      label: CONTRIBUTION_LABELS[kind] ?? kind,
      points,
    }))
    .sort((a, b) => b.points - a.points)
}

/* ── Rebuild from raw data (imports, migrations, "fix my data") ─────────── */

export async function rebuildMetricsFromScratch(schoolId: string): Promise<number> {
  const [users, attempts, contributions] = await Promise.all([
    db.list<{ id: string; role: string; name: string; classId?: string; classLevel?: number; section?: string; rollNo?: string; academicYear: string }>(
      COLLECTIONS.users,
      { where: [{ field: 'schoolId', op: '==', value: schoolId }, { field: 'role', op: '==', value: 'student' }] }
    ),
    db.list<TestAttempt>(COLLECTIONS.testAttempts, {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
    }),
    db.list<Contribution>(COLLECTIONS.contributions, {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
    }),
  ])

  let count = 0
  for (const user of users) {
    const metrics = replayAttempts(
      {
        id: user.id,
        schoolId,
        studentId: user.id,
        studentName: user.name,
        classId: user.classId ?? '',
        classLevel: user.classLevel ?? 0,
        classLabel: `${user.classLevel ?? '—'}-${user.section ?? '—'}`,
        section: user.section ?? '',
        rollNo: user.rollNo ?? '—',
        academicYear: user.academicYear,
      },
      attempts.filter((a) => a.studentId === user.id),
      contributions.filter((c) => c.studentId === user.id)
    )
    await db.set(COLLECTIONS.studentMetrics, user.id, metrics as unknown as Record<string, unknown>)
    count += 1
  }
  return count
}

export { daysUntil }
