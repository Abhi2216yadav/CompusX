import { useCallback, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import { clearSession, findSessionByStudent, loadSession, saveSession, type MockSession } from '@/services/attempts'
import { useAsync } from '@/hooks/useCollection'
import { useSchoolData } from '@/hooks/useSchoolData'
import TestRunner from '@/components/test/TestRunner'
import type { RunnerCheckpoint } from '@/hooks/useTestRunner'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'

/**
 * Dedicated route for an in-progress mock test.
 *
 * The deadline is always re-read from the stored session rather than being
 * recalculated from a fresh `Date.now()`, so this route is fully refresh-safe.
 * Answers, marked questions and the current index are written back to the
 * session on every interaction, so a refresh restores the paper as it was.
 */
export default function MockTestRunner() {
  const { testId = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { subjectById } = useSchoolData(profile?.schoolId)

  const studentId = profile?.id ?? ''

  // Read once per mount: the session only changes while the paper is in
  // progress, and every transition out of it unmounts this component.
  const [session] = useState<MockSession | null>(() => {
    if (!studentId) return null
    const stub = findSessionByStudent(studentId)
    if (!stub || stub.mockTestId !== testId) return null
    return loadSession(stub.attemptId)
  })

  const testMeta = useAsync(
    () => db.get<{ title: string; subjectId: string }>(COLLECTIONS.mockTests, testId),
    [testId]
  )

  const [live, setLive] = useState<MockSession | null>(session)

  const persist = useCallback(
    (state: RunnerCheckpoint) => {
      setLive((previous) => {
        if (!previous) return previous
        const next: MockSession = { ...previous, ...state, timeSpentPerQuestion: state.timePerQuestion }
        saveSession(next)
        return next
      })
    },
    []
  )

  const abandon = useCallback(() => {
    if (live) clearSession(live.attemptId)
  }, [live])

  if (!live || live.questions.length === 0) {
    if (testMeta.loading) return <LoadingState label="Loading test…" rows={4} />
    return (
      <EmptyState
        title="No active session"
        description="This test is not currently running for you. Start it from the instructions page."
        action={
          <Link to={`/tests/${testId}`}>
            <Button>Go to test instructions</Button>
          </Link>
        }
      />
    )
  }

  // Guard against a session belonging to a different test.
  if (live.mockTestId !== testId) return <Navigate to={`/tests/${testId}`} replace />

  const subjectId = testMeta.data?.subjectId ?? ''

  return (
    <TestRunner
      questions={live.questions}
      deadline={live.startedAt + live.durationMin * 60_000}
      initial={{
        answers: live.answers,
        marked: live.marked,
        currentIndex: live.currentIndex,
        startedAt: live.startedAt,
        timePerQuestion: live.timeSpentPerQuestion,
      }}
      onCheckpoint={persist}
      context={{
        student: profile!,
        kind: 'mock',
        refId: testId,
        refTitle: live.title,
        subjectId,
        subjectName: subjectById.get(subjectId)?.name ?? 'General',
      }}
      title={live.title}
      onFinished={(attemptId) => {
        abandon()
        navigate(`/tests/${testId}/result/${attemptId}`, { replace: true })
      }}
      onExit={() => {
        abandon()
        navigate(`/tests/${testId}`)
      }}
    />
  )
}