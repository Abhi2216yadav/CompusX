/**
 * CampusX — Student Ranking & Progress engine (Feature 33)
 * ───────────────────────────────────────────────────────────────────────────
 * Design goals
 *   1. Rankings are **stored**, never recomputed on page load. Every attempt
 *      updates one small `studentMetrics/{studentId}` document; a batch job
 *      materialises ranked `leaderboardSnapshots/{scopeId}` documents that the
 *      UI reads directly.
 *   2. Academic performance dominates. Contributions are a small positive
 *      modifier so the board stays educational rather than a popularity
 *      contest.
 *   3. **Attendance is deliberately excluded from the score.** It is shown in
 *      the attendance page only, per school policy.
 *
 * Score formula (documented in the UI so it is transparent to students):
 *
 *   academic    = 0.30·quizAvg + 0.22·pyqAccuracy + 0.32·mockAvg + 0.10·consistency
 *   contribution= min(100, contributionPoints / 2.5)
 *   overallScore= 0.90·academic + 0.10·contribution
 *
 * Consistency = 45% volume + 30% score stability (inverse std-dev) + 25% trend.
 */
import type {
  Contribution,
  LeaderboardEntry,
  LeaderboardFilters,
  LeaderboardPeriod,
  LeaderboardSnapshot,
  PeriodMetrics,
  PerformanceBand,
  ReputationLevel,
  StudentMetrics,
  SubjectMastery,
  TestAttempt,
} from '@/services/types'
import { DAY_MS, monthKey, startOfDay, weekKey } from '@/utils/date'
import { round1, clamp } from '@/utils/format'
import { stableId } from '@/utils/id'

/**
 * Relative importance of each signal. The academic weights are *relative* and
 * deliberately do not sum to 1 — `WEIGHTS` below renormalises them so the
 * overall score always tops out at exactly 100 no matter how these are edited.
 */
const RAW_WEIGHTS = {
  quiz: 0.3,
  pyq: 0.22,
  mock: 0.32,
  consistency: 0.1,
  contribution: 0.1,
} as const

const ACADEMIC_SUM =
  RAW_WEIGHTS.quiz + RAW_WEIGHTS.pyq + RAW_WEIGHTS.mock + RAW_WEIGHTS.consistency
const ACADEMIC_BUDGET = 1 - RAW_WEIGHTS.contribution

/** Absolute weights used for scoring: academic signals fill the remaining budget. */
export const WEIGHTS = {
  quiz: (RAW_WEIGHTS.quiz / ACADEMIC_SUM) * ACADEMIC_BUDGET,
  pyq: (RAW_WEIGHTS.pyq / ACADEMIC_SUM) * ACADEMIC_BUDGET,
  mock: (RAW_WEIGHTS.mock / ACADEMIC_SUM) * ACADEMIC_BUDGET,
  consistency: (RAW_WEIGHTS.consistency / ACADEMIC_SUM) * ACADEMIC_BUDGET,
  contribution: RAW_WEIGHTS.contribution,
} as const

export const RANKING = {
  /** Display/normalisation source. Use `WEIGHTS` when computing a score. */
  weights: RAW_WEIGHTS,
  /** Contribution points that map to a perfect contribution score. */
  contributionForFullScore: 250,
  /** Scores within this many points count as a tie (shared rank). */
  tieBand: 0.5,
  /** How many entries are materialised per snapshot. */
  snapshotSize: 50,
  reputationThresholds: [
    { level: 'Star Student' as const, min: 200 },
    { level: 'Helper' as const, min: 100 },
    { level: 'Contributor' as const, min: 40 },
    { level: 'Beginner' as const, min: 0 },
  ],
  bandLabels: {
    chasing: 'Chasing the top',
    rising: 'Rising fast',
    steady: 'Steady progress',
    needsPractice: 'Needs practice',
  },
} as const

export const PERIOD_OPTIONS: { value: LeaderboardPeriod; label: string }[] = [
  { value: 'weekly', label: 'This week' },
  { value: 'monthly', label: 'This month' },
  { value: 'overall', label: 'Overall' },
]

/** Contribution points awarded per activity — mirrors `services/contribution`. */
export const CONTRIBUTION_POINTS = {
  material: 25,
  peerHelp: 12,
  quiz: 4,
  pyq: 3,
  mock: 8,
  event: 20,
  club: 10,
  moderation: 15,
} as const

export const CONTRIBUTION_LABELS: Record<string, string> = {
  material: 'Study material',
  peerHelp: 'Helping classmates',
  quiz: 'Quiz practice',
  pyq: 'PYQ practice',
  mock: 'Mock tests',
  event: 'School events',
  club: 'Club activities',
  moderation: 'Moderation help',
}

/* ── Period helpers ─────────────────────────────────────────────────────── */

export function periodKeyFor(period: LeaderboardPeriod, at: Date | number = Date.now()): string {
  if (period === 'weekly') return weekKey(at)
  if (period === 'monthly') return monthKey(at)
  return 'all'
}

/** Stable document id for a snapshot of a given filter combination. */
export function snapshotIdFor(schoolId: string, filters: LeaderboardFilters): string {
  return stableId(
    schoolId,
    filters.academicYear,
    filters.period,
    filters.classId,
    filters.section,
    filters.subjectId
  )
}

export function snapshotKeyFor(filters: LeaderboardFilters): string {
  return periodKeyFor(filters.period)
}

/* ── Metrics lifecycle ──────────────────────────────────────────────────── */

export function emptyPeriod(): PeriodMetrics {
  return {
    quizAverage: 0,
    pyqAccuracy: 0,
    mockTestAverage: 0,
    quizCount: 0,
    pyqCount: 0,
    mockCount: 0,
    testsAttempted: 0,
    questionsAttempted: 0,
    questionsCorrect: 0,
    consistency: 0,
    contributionPoints: 0,
    activityPoints: 0,
    overallScore: 0,
    progressPercentage: 0,
    recent: [],
  }
}

export interface MetricsSeed {
  id: string
  schoolId: string
  studentId: string
  studentName: string
  classId: string
  classLevel: number
  classLabel: string
  section: string
  rollNo: string
  academicYear: string
  photoUrl?: string
}

export function newMetricsDoc(seed: MetricsSeed): StudentMetrics {
  const all = emptyPeriod()
  const now = Date.now()
  return {
    ...seed,
    periods: { all },
    subjectMastery: {},
    chapterMastery: {},
    contributionPoints: 0,
    activityPoints: 0,
    reputationLevel: 'Beginner',
    // A brand-new student has never been active — the first attempt sets both.
    streakWeeks: 0,
    lastActiveAt: 0,
    updatedAt: now,
  }
}

/**
 * Study streak, counted in rolling 7-day windows of activity.
 *   · activity inside the current window keeps the streak (never below 1);
 *   · crossing into the next window extends it by one;
 *   · missing a whole window resets it to 1 when the student returns.
 * `previousActiveAt` of 0 means "never active yet".
 */
export function nextStreak(current: number, previousActiveAt: number, at: number): number {
  const base = Math.max(1, current)
  if (!previousActiveAt) return base
  const gap = startOfDay(at).getTime() - startOfDay(previousActiveAt).getTime()
  if (gap < 0) return base // out-of-order write — keep the recorded streak
  const windows = Math.floor(gap / (7 * DAY_MS))
  if (windows === 0) return base
  if (windows === 1) return base + 1
  return 1
}

/**
 * Streak as shown in the UI: the stored value, or 0 once the student has been
 * idle for more than two windows (the stored count has lapsed).
 */
export function currentStreakWeeks(
  metrics: Pick<StudentMetrics, 'streakWeeks' | 'lastActiveAt'> | null | undefined,
  now: number = Date.now()
): number {
  if (!metrics?.streakWeeks) return 0
  const last = toMs(metrics.lastActiveAt)
  if (!last) return 0
  return now - last <= 14 * DAY_MS ? metrics.streakWeeks : 0
}

/** Averages two running means without needing the raw attempt list. */
function blend(mean: number, count: number, value: number): number {
  return count === 0 ? value : (mean * count + value) / (count + 1)
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

function computeConsistency(recent: number[]): number {
  const volume = clamp(recent.length / 8, 0, 1)
  const stability = clamp(1 - stdDev(recent) / 25, 0, 1)
  let trend = 0.5
  if (recent.length >= 4) {
    const half = Math.floor(recent.length / 2)
    const older = recent.slice(0, half)
    const newer = recent.slice(half)
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    trend = clamp(0.5 + (avg(newer) - avg(older)) / 60, 0, 1)
  } else if (recent.length) {
    trend = clamp(recent[recent.length - 1] / 100, 0, 1)
  }
  return Math.round(100 * (0.45 * volume + 0.3 * stability + 0.25 * trend))
}

function contributionScore(points: number): number {
  return Math.min(100, points / RANKING.contributionForFullScore) * 100
}

/** Recomputes every derived value on a metrics document in place. */
export function finalizeMetrics(metrics: StudentMetrics): StudentMetrics {
  for (const key of Object.keys(metrics.periods)) {
    metrics.periods[key] = finalizePeriod(metrics.periods[key])
  }
  metrics.contributionPoints = metrics.periods.all.contributionPoints
  metrics.activityPoints = metrics.periods.all.activityPoints
  metrics.reputationLevel = reputationLevel(metrics.contributionPoints)
  metrics.updatedAt = Date.now()
  return metrics
}

function finalizePeriod(p: PeriodMetrics): PeriodMetrics {
  p.consistency = computeConsistency(p.recent)
  const academic =
    p.quizAverage * WEIGHTS.quiz +
    p.pyqAccuracy * WEIGHTS.pyq +
    p.mockTestAverage * WEIGHTS.mock +
    p.consistency * WEIGHTS.consistency
  p.overallScore = Math.round(
    clamp(
      academic + contributionScore(p.contributionPoints) * WEIGHTS.contribution,
      0,
      100
    ) * 10
  ) / 10
  p.progressPercentage =
    p.questionsAttempted > 0
      ? Math.round((p.questionsCorrect / p.questionsAttempted) * 1000) / 10
      : p.overallScore
  return p
}

export function reputationLevel(points: number): ReputationLevel {
  for (const t of RANKING.reputationThresholds) if (points >= t.min) return t.level
  return 'Beginner'
}

export function nextLevelInfo(points: number) {
  const order = ['Beginner', 'Contributor', 'Helper', 'Star Student']
  const idx = order.indexOf(reputationLevel(points))
  const next = order[idx + 1]
  const nextMin = RANKING.reputationThresholds.find((t) => t.level === next)?.min
  return {
    level: order[idx],
    next,
    pointsToNext: nextMin == null ? 0 : Math.max(0, nextMin - points),
    progress: nextMin == null ? 100 : clamp(((points % 100) / 100) * 100, 6, 100),
  }
}

/**
 * Applies one finished attempt to a metrics document.
 * Used identically by the live submission path and by the demo seeder, so the
 * stored numbers can never drift between the two.
 */
export function applyAttemptToMetrics(
  metrics: StudentMetrics,
  attempt: TestAttempt,
  opts?: { chapterName?: string }
): StudentMetrics {
  const buckets = new Set([attempt.period, 'all'])
  for (const key of buckets) {
    const current = metrics.periods[key] ?? emptyPeriod()
    const pct = attempt.percentage
    if (attempt.kind === 'quiz') {
      current.quizAverage = round1(blend(current.quizAverage, current.quizCount, pct))
      current.quizCount += 1
    } else if (attempt.kind === 'pyq') {
      current.pyqAccuracy = round1(blend(current.pyqAccuracy, current.pyqCount, pct))
      current.pyqCount += 1
    } else {
      current.mockTestAverage = round1(blend(current.mockTestAverage, current.mockCount, pct))
      current.mockCount += 1
    }
    current.testsAttempted += 1
    current.questionsAttempted += attempt.totalQuestions
    current.questionsCorrect += attempt.correctCount
    current.recent = [...current.recent, pct].slice(-20)

    if (attempt.kind !== 'mock') {
      current.activityPoints += CONTRIBUTION_POINTS[attempt.kind]
    } else {
      current.activityPoints += CONTRIBUTION_POINTS.mock
    }
    metrics.periods[key] = current
  }

  // Mastery maps are cumulative across all periods — they drive subject and
  // chapter breakdowns on the progress page.
  const subject = (metrics.subjectMastery[attempt.subjectId] ?? {
    attempted: 0,
    correct: 0,
    percentage: 0,
  }) as SubjectMastery
  subject.attempted += attempt.totalQuestions
  subject.correct += attempt.correctCount
  subject.percentage = round1((subject.correct / Math.max(1, subject.attempted)) * 100)
  metrics.subjectMastery[attempt.subjectId] = subject

  if (attempt.chapterId) {
    const chapter = (metrics.chapterMastery[attempt.chapterId] ?? {
      attempted: 0,
      correct: 0,
      percentage: 0,
    }) as SubjectMastery
    chapter.attempted += attempt.totalQuestions
    chapter.correct += attempt.correctCount
    chapter.percentage = round1((chapter.correct / Math.max(1, chapter.attempted)) * 100)
    metrics.chapterMastery[attempt.chapterId] = chapter
    void opts?.chapterName
  }

  // Anchor the streak and "last active" to when the attempt was submitted —
  // replaying historical attempts must not stamp them as active today.
  const at = toMs(attempt.submittedAt) || Date.now()
  metrics.streakWeeks = nextStreak(metrics.streakWeeks, toMs(metrics.lastActiveAt), at)
  metrics.lastActiveAt = Math.max(at, toMs(metrics.lastActiveAt))
  return finalizeMetrics(metrics)
}

export function applyContributionToMetrics(
  metrics: StudentMetrics,
  contribution: Contribution
): StudentMetrics {
  const at = toMs(contribution.createdAt) || Date.now()
  const buckets = new Set([monthKey(at), weekKey(at), 'all'])
  for (const key of buckets) {
    const current = metrics.periods[key] ?? emptyPeriod()
    current.contributionPoints += contribution.points
    if (contribution.kind === 'event' || contribution.kind === 'club') {
      current.activityPoints += contribution.points
    }
    metrics.periods[key] = current
  }
  return finalizeMetrics(metrics)
}

export function periodFor(metrics: StudentMetrics, filters: LeaderboardFilters): PeriodMetrics {
  return metrics.periods[periodKeyFor(filters.period)] ?? emptyPeriod()
}

/* ── Rank computation ───────────────────────────────────────────────────── */

export function bandFor(p: PeriodMetrics): PerformanceBand {
  if (p.testsAttempted < 2 || p.progressPercentage < 55) return 'needsPractice'
  if (p.progressPercentage >= 90) return 'chasing'
  const recent = p.recent
  if (recent.length >= 4) {
    const half = Math.floor(recent.length / 2)
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    if (avg(recent.slice(half)) - avg(recent.slice(0, half)) >= 6) return 'rising'
  }
  return 'steady'
}

export interface EntryInput {
  metrics: StudentMetrics
  /** Set when a subject filter is active to narrow mastery stats. */
  subjectId?: ID
  /** Honours the school's "hide rankings" privacy switch. */
  includeIdentity: boolean
}

type ID = string

export function toEntry(input: EntryInput, filters: LeaderboardFilters): LeaderboardEntry | null {
  const { metrics } = input
  const p = periodFor(metrics, filters)
  if (filters.subjectId && filters.subjectId !== 'all') {
    const mastery = metrics.subjectMastery[filters.subjectId]
    if (!mastery) return null
  }
  const base: LeaderboardEntry = {
    rank: 0,
    studentId: metrics.studentId,
    studentName: input.includeIdentity ? metrics.studentName : 'Student',
    photoUrl: input.includeIdentity ? metrics.photoUrl : undefined,
    classLabel: metrics.classLabel,
    classLevel: metrics.classLevel,
    section: metrics.section,
    overallScore: p.overallScore,
    progressPercentage: p.progressPercentage,
    quizAverage: p.quizAverage,
    pyqAccuracy: p.pyqAccuracy,
    mockTestAverage: p.mockTestAverage,
    testsAttempted: p.testsAttempted,
    questionsAttempted: p.questionsAttempted,
    questionsCorrect: p.questionsCorrect,
    consistency: p.consistency,
    contributionPoints: p.contributionPoints,
    activityPoints: p.activityPoints,
    band: bandFor(p),
  }
  if (filters.subjectId && filters.subjectId !== 'all') {
    const mastery = metrics.subjectMastery[filters.subjectId]
    if (mastery) {
      base.progressPercentage = mastery.percentage
    }
  }
  return base
}

/** Standard competition ranking: equal scores share a rank, then skip. */
export function rankEntries(entries: LeaderboardEntry[]): LeaderboardEntry[] {
  const sorted = [...entries].sort((a, b) => {
    if (Math.abs(b.overallScore - a.overallScore) > 0.001) return b.overallScore - a.overallScore
    if (b.testsAttempted !== a.testsAttempted) return b.testsAttempted - a.testsAttempted
    if (b.contributionPoints !== a.contributionPoints) return b.contributionPoints - a.contributionPoints
    return a.studentName.localeCompare(b.studentName)
  })
  let rank = 0
  let lastScore: number | null = null
  return sorted.map((entry, i) => {
    if (lastScore === null || Math.abs(entry.overallScore - lastScore) > RANKING.tieBand) {
      rank = i + 1
      lastScore = entry.overallScore
    }
    return { ...entry, rank }
  })
}

export function buildSnapshot(params: {
  id: string
  schoolId: string
  filters: LeaderboardFilters
  entries: LeaderboardEntry[]
  generatedBy: 'system' | 'admin'
  generation: number
}): LeaderboardSnapshot {
  const ranked = rankEntries(params.entries)
  const stored = ranked.slice(0, RANKING.snapshotSize)
  return {
    id: params.id,
    schoolId: params.schoolId,
    period: params.filters.period,
    periodKey: periodKeyFor(params.filters.period),
    academicYear: params.filters.academicYear,
    classId: params.filters.classId,
    section: params.filters.section,
    subjectId: params.filters.subjectId,
    entries: stored,
    rankIndex: ranked.map((e) => ({
      studentId: e.studentId,
      rank: e.rank,
      overallScore: e.overallScore,
      progressPercentage: e.progressPercentage,
    })),
    totalStudents: ranked.length,
    nextAfterWindow: ranked[RANKING.snapshotSize] ?? undefined,
    generatedAt: Date.now(),
    generatedBy: params.generatedBy,
    generation: params.generation,
  }
}

export interface RankLookup {
  rank: number
  totalStudents: number
  /** Rank the student needs to overtake next. */
  nextRank?: number
  /** Points needed to overtake that rank (0 when already at the top). */
  pointsToNext: number
  nextStudentName?: string
  nextStudentScore?: number
}

/**
 * Answers "where am I?" for every student, including those outside the stored
 * window, using only the snapshot document — no extra reads.
 */
export function locateStudent(
  snapshot: LeaderboardSnapshot,
  studentId: string,
  liveScore?: number
): RankLookup | null {
  const inWindow = snapshot.entries.find((e) => e.studentId === studentId)
  if (inWindow) {
    const next = snapshot.entries.find((e) => e.rank === inWindow.rank + 1)
    return {
      rank: inWindow.rank,
      totalStudents: snapshot.totalStudents,
      nextRank: next?.rank,
      pointsToNext: next ? Math.max(0, round1(next.overallScore - inWindow.overallScore + 0.1)) : 0,
      nextStudentName: next?.studentName,
      nextStudentScore: next?.overallScore,
    }
  }

  // Outside the window — the compact index still carries an exact rank.
  const indexed = snapshot.rankIndex?.find((r) => r.studentId === studentId)
  if (indexed) {
    const better = [...(snapshot.rankIndex ?? [])]
      .filter((r) => r.rank === indexed.rank - 1)
      .sort((a, b) => b.overallScore - a.overallScore)[0]
    const myScore = liveScore ?? indexed.overallScore
    return {
      rank: indexed.rank,
      totalStudents: snapshot.totalStudents,
      nextRank: better?.rank,
      pointsToNext: better ? Math.max(0, round1(better.overallScore - myScore + 0.1)) : 0,
    }
  }

  // Truly unranked (no attempts yet) — place at the end.
  if (!liveScore) {
    return {
      rank: snapshot.totalStudents + 1,
      totalStudents: snapshot.totalStudents,
      pointsToNext: 0,
    }
  }
  const last = snapshot.entries[snapshot.entries.length - 1]
  return {
    rank: snapshot.totalStudents,
    totalStudents: snapshot.totalStudents,
    nextRank: snapshot.totalStudents,
    pointsToNext: last ? Math.max(0, round1(last.overallScore - liveScore + 0.1)) : 0,
  }
}

/* ── Replay helpers (demo seeding + "recalculate all") ──────────────────── */

export function replayAttempts(
  seed: MetricsSeed,
  attempts: TestAttempt[],
  contributions: Contribution[] = []
): StudentMetrics {
  let metrics = newMetricsDoc(seed)
  for (const attempt of [...attempts].sort((a, b) => toMs(a.submittedAt) - toMs(b.submittedAt))) {
    metrics = applyAttemptToMetrics(metrics, attempt)
  }
  for (const contribution of [...contributions].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt))) {
    metrics = applyContributionToMetrics(metrics, contribution)
  }
  return metrics
}

function toMs(value: unknown): number {
  if (typeof value === 'number') return value
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'string') return new Date(value).getTime()
  const v = value as { toDate?: () => Date } | null
  if (v && typeof v.toDate === 'function') return v.toDate().getTime()
  return 0
}
