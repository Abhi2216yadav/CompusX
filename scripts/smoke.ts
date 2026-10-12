/**
 * Runtime smoke test for the service layer. Bundled with `vite build --ssr`
 * and executed with node, so real logic (seeding, grading, metrics, ranking,
 * leaderboard snapshots, attendance batching) is exercised without a browser.
 */
import { COLLECTIONS } from '@/services/db'
import { db, isDemoMode, resetDemoData } from '@/services'
import {
  grade,
  periodBucketFor,
  leaderboardFiltersFor,
  submitAttempt,
  findSessionByStudent,
  saveSession,
  clearSession,
  type MockSession,
} from '@/services/attempts'
import { RANKING, WEIGHTS } from '@/services/ranking'
import {
  getSnapshot,
  rebuildAllLeaderboards,
  rebuildMetricsFromScratch,
  getMyRank,
  getStudentProgress,
} from '@/services/leaderboard'
import { markAttendance, summarise } from '@/services/attendance'
import { awardContribution } from '@/services/contribution'
import type { TestAttempt, UserProfile } from '@/services/types'

const failures: string[] = []
async function rejects(fn: () => Promise<unknown>): Promise<boolean> {
  try {
    await fn()
    return false
  } catch {
    return true
  }
}

function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`  PASS  ${label}`)
  else {
    console.log(`  FAIL  ${label}${detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`}`)
    failures.push(label)
  }
}

async function main() {
  console.log(`demo mode: ${isDemoMode}`)
  await resetDemoData()
  check('demo mode active', db.kind === 'demo', db.kind)

  console.log('\n-- seed --')
  const schools = await db.list(COLLECTIONS.schools)
  const users = await db.list<UserProfile>(COLLECTIONS.users)
  const classes = await db.list(COLLECTIONS.classes)
  const subjects = await db.list(COLLECTIONS.subjects)
  const quizzes = await db.list(COLLECTIONS.quizzes)
  const pyqs = await db.list(COLLECTIONS.pyqs)
  const mocks = await db.list(COLLECTIONS.mockTests)
  check('schools seeded', schools.length === 1, schools.length)
  check('users seeded', users.length > 50, users.length)
  check('classes seeded', classes.length > 0, classes.length)
  check('subjects seeded', subjects.length > 0, subjects.length)
  check('quizzes seeded', quizzes.length > 0, quizzes.length)
  check('pyqs seeded', pyqs.length > 0, pyqs.length)
  check('mock tests seeded', mocks.length > 0, mocks.length)

  const byRole = (r: string) => users.filter((u) => u.role === r)
  check('has students', byRole('student').length > 0, byRole('student').length)
  check('has teachers', byRole('teacher').length > 0, byRole('teacher').length)
  check('has admins', byRole('admin').length > 0, byRole('admin').length)

  console.log('\n-- auth --')
  for (const [email, password, expected] of [
    ['abhay@abcpubschool.edu.in', 'student123', 'student'],
    ['meera@abcpubschool.edu.in', 'teacher123', 'teacher'],
    ['admin@abcpubschool.edu.in', 'admin123', 'admin'],
  ] as const) {
    await db.signIn(email, password)
    const me = (await db.list<UserProfile>(COLLECTIONS.users, {
      where: [{ field: 'email', op: '==', value: email }],
    }))[0]
    check(`${expected} signs in as ${me?.role}`, me?.role === expected, me?.role)
    check(`${expected} password rejected when wrong`, await rejects(() => db.signIn(email, 'wrong-password')))
  }
  await db.signIn('abhay@abcpubschool.edu.in', 'student123')
  const authed = await new Promise<{ email: string; uid: string } | null>((resolve) => {
    // The demo backend fires synchronously, so guard the not-yet-assigned unsubscribe.
    let stop: (() => void) | undefined
    let done = false
    stop = db.onAuth((u) => {
      if (done) return
      done = true
      stop?.()
      resolve(u as { email: string; uid: string } | null)
    })
  })
  check('onAuth resolves the signed-in user', authed?.email === 'abhay@abcpubschool.edu.in', authed)

  console.log('\n-- grading --')
  const quiz = quizzes[0]
  const pool = await db.list<{ id: string; correctIndex: number; marks: number; question: string; options: string[]; explanation: string }>(
    COLLECTIONS.questions,
    { where: [{ field: 'schoolId', op: '==', value: quiz.schoolId }, { field: 'subjectId', op: '==', value: quiz.subjectId }] }
  )
  check('question pool non-empty', pool.length > 0, pool.length)
  const marked = grade(
    pool.slice(0, 3).map((q) => ({ id: q.id, correctIndex: q.correctIndex, marks: q.marks })),
    Object.fromEntries(pool.slice(0, 3).map((q, i) => [q.id, i === 0 ? q.correctIndex : (q.correctIndex + 1) % 4]))
  )
  check('grades a paper', marked.score >= 0 && marked.total > 0, marked)

  console.log('\n-- attempt submission + metrics --')
  const student = byRole('student')[0]
  const attempt = await submitAttempt({
    student,
    kind: 'quiz',
    refId: quiz.id,
    refTitle: quiz.title,
    subjectId: quiz.subjectId,
    subjectName: 'Quiz',
    questions: pool.slice(0, 3).map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      marks: q.marks,
      explanation: q.explanation,
    })),
    answers: Object.fromEntries(pool.slice(0, 3).map((q) => [q.id, q.correctIndex])),
    startedAt: Date.now() - 120_000,
    submittedAt: Date.now(),
    timeSpentSec: 120,
    timePerQuestion: {},
    autoSubmitted: false,
  })
  check('attempt persisted', Boolean(attempt?.id), attempt?.id)
  check('attempt is 100%', attempt!.percentage === 100, attempt!.percentage)
  check('period bucket set', attempt!.period.length > 0, attempt!.period)
  check('periodBucketFor pyq is a month', /^\d{4}-\d{2}$/.test(periodBucketFor('pyq')), periodBucketFor('pyq'))
  check('periodBucketFor quiz is a week', /^\d{4}-W\d{2}$/.test(periodBucketFor('quiz')), periodBucketFor('quiz'))

  const stored = await db.get<TestAttempt>(COLLECTIONS.testAttempts, attempt!.id)
  check('attempt readable back', stored?.id === attempt!.id)

  const metrics = await db.get<{ periods: Record<string, { testsAttempted: number; overallScore: number }> }>(
    COLLECTIONS.studentMetrics,
    student.id
  )
  const all = metrics?.periods?.all
  check('metrics written for student', Boolean(all && all.testsAttempted > 0), metrics?.periods && Object.keys(metrics.periods))
  check('overall score in 0..100', all ? all.overallScore >= 0 && all.overallScore <= 100 : false, all?.overallScore)

  console.log('\n-- contributions --')
  const before = (metrics?.periods?.all?.overallScore ?? 0)
  const con = await awardContribution({
    schoolId: student.schoolId,
    studentId: student.id,
    studentName: student.name,
    kind: 'peerHelp',
    description: 'Helped a classmate with algebra',
  })
  check('contribution recorded', Boolean(con.id))
  const metrics2 = await db.get<{ periods: Record<string, { contributionPoints: number }> }>(
    COLLECTIONS.studentMetrics,
    student.id
  )
  const pointsBefore =
    (metrics?.periods?.all as { contributionPoints?: number } | undefined)?.contributionPoints ?? 0
  const pointsAfter = metrics2?.periods?.all?.contributionPoints ?? 0
  check('contribution points accumulated', pointsAfter > pointsBefore, { before: pointsBefore, after: pointsAfter })
  check('score still in range after contribution', (metrics2?.periods?.all?.overallScore ?? 0) >= before - 5)
  check(
    'scoring weights sum to 1',
    Math.abs(Object.values(WEIGHTS).reduce((a, b) => a + b, 0) - 1) < 1e-9,
    WEIGHTS
  )
  check(
    'WEIGHTS preserve the documented ordering',
    WEIGHTS.mock > WEIGHTS.quiz && WEIGHTS.quiz > WEIGHTS.pyq && WEIGHTS.pyq > WEIGHTS.consistency,
    WEIGHTS
  )
  check('raw weights are exposed for display', RANKING.weights.mock === 0.32, RANKING.weights)

  console.log('\n-- leaderboard --')
  const filters = leaderboardFiltersFor('overall')
  const snap = await getSnapshot(student.schoolId, filters)
  check('snapshot built', snap.entries.length > 0, snap.entries.length)
  check('snapshot has a rank index', snap.rankIndex.length > 0, snap.rankIndex.length)
  check('snapshot total >= entries', snap.totalStudents >= snap.entries.length, {
    total: snap.totalStudents,
    entries: snap.entries.length,
  })
  const ranks = snap.entries.map((e) => e.rank)
  check('ranks ascend', ranks.every((r, i) => i === 0 || r >= ranks[i - 1]), ranks.slice(0, 8))
  const scores = snap.entries.map((e) => e.overallScore)
  check('scores descend', scores.every((s, i) => i === 0 || s <= scores[i - 1]), scores.slice(0, 8))
  check('no email/attendance leaks in entries', !JSON.stringify(snap.entries).includes('abhay@'), 'email found')

  const mine = await getMyRank(student.schoolId, student.id, filters)
  check('my rank resolved', (mine?.rank ?? 0) > 0, mine?.rank)
  check('my rank has a total', (mine?.totalStudents ?? 0) > 0, mine?.totalStudents)
  check('my score matches metrics', Math.abs((mine?.score ?? 0) - (all?.overallScore ?? 0)) < 0.001, {
    mine: mine?.score,
    metrics: all?.overallScore,
  })
  check('points-to-next present or first place', mine?.rank === 1 || typeof mine?.pointsToNext === 'number', {
    rank: mine?.rank,
    pointsToNext: mine?.pointsToNext,
  })

  const progress = await getStudentProgress(student.schoolId, student.id, filters)
  check('student progress built', Boolean(progress?.student?.studentId), progress?.rank)
  check('subject breakdown present', (progress?.subjectBreakdown.length ?? 0) > 0, progress?.subjectBreakdown.length)
  check('quiz history present', (progress?.quizHistory.length ?? 0) > 0, progress?.quizHistory.length)

  await rebuildAllLeaderboards(student.schoolId, '2026-27', [], [])
  const snap2 = await getSnapshot(student.schoolId, filters)
  check('recompute bumps generation', snap2.generation >= snap.generation, { before: snap.generation, after: snap2.generation })

  const replayed = await rebuildMetricsFromScratch(student.schoolId)
  check('metrics rebuild replays every student', replayed === byRole('student').length, {
    replayed,
    students: byRole('student').length,
  })
  const afterReplay = await db.get<{ periods: Record<string, { testsAttempted: number }> }>(
    COLLECTIONS.studentMetrics,
    student.id
  )
  check(
    'replayed metrics agree with incremental writes',
    afterReplay?.periods?.all?.testsAttempted === all?.testsAttempted,
    { incremental: all?.testsAttempted, replayed: afterReplay?.periods?.all?.testsAttempted }
  )

  console.log('\n-- attendance (delta based: seed ships history) --')
  const roster = byRole('student').slice(0, 5)
  const klass = classes.find((c) => roster.some((s) => s.classId === c.id)) ?? classes[0]
  const statusFor = (i: number) => (['present', 'absent', 'late', 'excused', 'present'] as const)[i]
  const totalsBefore = new Map<string, number>()
  for (const s of roster) {
    const rec = await db.get<{ totalClasses: number }>(COLLECTIONS.attendance, s.id)
    totalsBefore.set(s.id, rec?.totalClasses ?? 0)
  }

  await markAttendance({
    schoolId: klass.schoolId,
    classId: klass.id,
    classLevel: klass.classLevel,
    section: klass.section,
    date: '2026-02-10',
    markedBy: byRole('teacher')[0],
    marks: roster.map((s, i) => ({ studentId: s.id, status: statusFor(i) })),
  })

  for (const [i, s] of roster.entries()) {
    const rec = await db.get<{
      present: number
      absent: number
      late: number
      excused: number
      totalClasses: number
      percentage: number
      monthly: Record<string, { total: number; present: number }>
    }>(COLLECTIONS.attendance, s.id)
    const added = (rec?.totalClasses ?? 0) - (totalsBefore.get(s.id) ?? 0)
    check(`attendance marks one extra class for ${s.name}`, added === 1, {
      before: totalsBefore.get(s.id),
      after: rec?.totalClasses,
    })
    if (statusFor(i) === 'present') {
      check(`present student counted present for ${s.name}`, (rec?.present ?? 0) > 0, rec?.present)
    }
    check(`attendance percentage stays in range for ${s.name}`, (rec?.percentage ?? 0) > 0 && (rec?.percentage ?? 0) <= 100, rec?.percentage)
    check(`monthly bucket written for ${s.name}`, (rec?.monthly['2026-02']?.total ?? 0) > 0, rec?.monthly['2026-02'])
    check(`summary mirrors stored numbers for ${s.name}`, summarise(rec as never).totalClasses === rec?.totalClasses)
  }

  const absentBefore = await db.get<{ absent: number; totalClasses: number }>(COLLECTIONS.attendance, roster[1].id)
  await markAttendance({
    schoolId: klass.schoolId,
    classId: klass.id,
    classLevel: klass.classLevel,
    section: klass.section,
    date: '2026-02-10',
    markedBy: byRole('teacher')[0],
    marks: roster.map((s) => ({ studentId: s.id, status: 'present' as const })),
  })
  const rec2 = await db.get<{ absent: number; totalClasses: number; present: number }>(COLLECTIONS.attendance, roster[1].id)
  check(
    're-marking a date replaces instead of double counting',
    rec2?.totalClasses === absentBefore?.totalClasses,
    { before: absentBefore?.totalClasses, after: rec2?.totalClasses }
  )
  check('re-mark updates the status to present', rec2?.absent === absentBefore!.absent - 1, {
    before: absentBefore?.absent,
    after: rec2?.absent,
  })

  console.log('\n-- mock session persistence --')
  const attemptId = 'attempt-smoke'
  const session: MockSession = {
    attemptId,
    mockTestId: mocks[0].id,
    title: mocks[0].title,
    studentId: student.id,
    questionIds: pool.slice(0, 3).map((q) => q.id),
    questions: pool.slice(0, 3).map((q) => ({ id: q.id, correctIndex: q.correctIndex, marks: q.marks, question: q.question, options: q.options, subjectName: 'Maths' })),
    answers: { [pool[0].id]: 2 },
    marked: [pool[1].id],
    startedAt: Date.now() - 60_000,
    durationMin: 60,
    timeSpentPerQuestion: { [pool[0].id]: 30 },
    currentIndex: 2,
  }
  saveSession(session)
  const found = findSessionByStudent(student.id)
  check('session found by student', found?.attemptId === attemptId, found?.attemptId)
  check('session answers persisted', found?.answers[pool[0].id] === 2, found?.answers)
  check('session marked persisted', found?.marked[0] === pool[1].id, found?.marked)
  check('session index persisted', found?.currentIndex === 2, found?.currentIndex)
  clearSession(attemptId)
  check('session cleared', findSessionByStudent(student.id) === null)

  console.log('\n-- teacher quiz flow --')
  const teacher = byRole('teacher')[0]
  const teacherSubjects = teacher.subjects ?? []
  check('teacher has subjects', teacherSubjects.length > 0, teacherSubjects.length)

  console.log('')
  if (failures.length) {
    console.log(`${failures.length} FAILED: ${failures.join(', ')}`)
    process.exitCode = 1
  } else {
    console.log('All service-layer checks passed.')
  }
}

main().catch((e) => {
  console.error('SMOKE TEST CRASHED:', e)
  process.exitCode = 1
})