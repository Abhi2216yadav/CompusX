import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertTriangle, Play, RotateCcw } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import {
  clearSession,
  findSessionByStudent,
  saveSession,
  type MockSession,
} from '@/services/attempts'
import type { Pyq } from '@/services/types'
import { useAsync } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions } from '@/hooks/useSchoolData'
import { makeId } from '@/utils/id'
import TestRunner from '@/components/test/TestRunner'
import { PageHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'

const SET_SIZE = 10

export default function PyqPractice() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { subjects, subjectById } = useSchoolData(profile?.schoolId)

  const [subjectId, setSubjectId] = useState('all')
  const [sessionKey, setSessionKey] = useState(0)

  /**
   * A practice session is stored in localStorage, so it survives a refresh and
   * the student resumes exactly where they stopped.
   */
  const session = useMemo<MockSession | null>(() => {
    if (!profile) return null
    const stub = findSessionByStudent(profile.id)
    if (!stub || stub.mockTestId !== 'pyq-practice') return null
    return stub.questions.length > 0 ? stub : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, sessionKey])

  const loader = useAsync<Pyq[]>(async () => {
    if (!profile) return []
    const rows = await db.list<Pyq>(COLLECTIONS.pyqs, {
      where: [
        { field: 'schoolId', op: '==', value: profile.schoolId },
        { field: 'classLevel', op: '==', value: profile.classLevel ?? 10 },
        { field: 'isActive', op: '==', value: true },
        ...(subjectId !== 'all'
          ? [{ field: 'subjectId' as const, op: '==' as const, value: subjectId }]
          : []),
      ],
    })
    return rows.sort((a, b) => b.year - a.year)
  }, [profile?.schoolId, subjectId])

  async function startSession() {
    const pool = loader.data ?? []
    const picked = pool.slice(0, SET_SIZE)
    if (!profile || picked.length === 0) return

    const record: MockSession = {
      attemptId: makeId('attempt'),
      mockTestId: 'pyq-practice',
      title: 'PYQ Practice',
      studentId: profile.id,
      questionIds: picked.map((q) => q.id),
      questions: picked.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        marks: q.marks,
        subjectName: subjectById.get(q.subjectId)?.name ?? 'General',
      })),
      answers: {},
      marked: [],
      startedAt: Date.now(),
      // Untimed: PYQ practice is for learning, so no deadline is stored.
      durationMin: 0,
      timeSpentPerQuestion: {},
      currentIndex: 0,
    }
    saveSession(record)
    setSessionKey((k) => k + 1)
  }

  if (session) {
    return (
      <TestRunner
        questions={session.questions}
        initial={{
          answers: session.answers,
          marked: session.marked,
          currentIndex: session.currentIndex,
          startedAt: session.startedAt,
          timePerQuestion: session.timeSpentPerQuestion,
        }}
        onCheckpoint={(state) => saveSession({ ...session, ...state, timeSpentPerQuestion: state.timePerQuestion })}
        context={{
          student: profile!,
          kind: 'pyq',
          refId: 'pyq-practice',
          refTitle: 'PYQ Practice',
          subjectId: subjectId === 'all' ? '' : subjectId,
          subjectName: 'PYQ Practice',
        }}
        title="PYQ Practice"
        onFinished={(attemptId) => {
          clearSession(attemptId)
          navigate(`/pyq/result/${attemptId}`, { replace: true })
        }}
        onExit={() => {
          clearSession(session.attemptId)
          setSessionKey((k) => k + 1)
        }}
      />
    )
  }

  if (loader.loading) return <LoadingState label="Loading PYQ practice…" rows={5} />
  if (loader.error) return <ErrorState message={loader.error.message} onRetry={loader.reload} />

  const pool = loader.data ?? []

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="PYQ Practice"
        description="Practise previous-year board questions. Board papers count for more in your leaderboard score than practice questions."
        action={
          sessionKey > 0 ? (
            <Button
              variant="secondary"
              icon={<RotateCcw className="size-4" />}
              onClick={() => {
                const stub = findSessionByStudent(profile?.id ?? '')
                if (stub) clearSession(stub.attemptId)
                setSessionKey((k) => k + 1)
              }}
            >
              Clear saved session
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-64">
          <Select
            label="Subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            options={subjectOptions(subjects)}
          />
        </div>
        <p className="text-xs text-muted">
          {pool.length} question{pool.length === 1 ? '' : 's'} available
        </p>
      </div>

      {pool.length === 0 ? (
        <EmptyState
          title="No PYQs yet"
          description="Ask your teacher to add previous-year papers for this subject and class."
        />
      ) : (
        <>
          <div className="mb-5 rounded-2xl border border-brand/25 bg-brand-soft p-5">
            <h2 className="text-base font-bold text-ink">Start a {SET_SIZE}-question practice set</h2>
            <p className="mt-1 text-sm text-muted">
              Untimed, instant feedback, and an explanation for every answer. Your attempt is recorded and updates
              your leaderboard metrics immediately.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => void startSession()} icon={<Play className="size-4" />}>
                Start practice
              </Button>
              {profile && (
                <span className="flex items-center gap-1.5 self-center text-xs text-muted">
                  <AlertTriangle className="size-3.5 text-info" aria-hidden />
                  Your set is saved, so a refresh will not lose your progress.
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {pool.slice(0, 12).map((pyq) => (
              <article
                key={pyq.id}
                className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand/30"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-warn-soft px-2 py-0.5 text-[11px] font-bold text-warn">
                    {pyq.year}
                  </span>
                  <span className="truncate text-[11px] text-muted">{pyq.examName}</span>
                  <span className="ml-auto shrink-0 text-[11px] text-muted">{pyq.marks}m</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed font-medium text-ink">{pyq.question}</p>
              </article>
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-muted">
            Want exam conditions?{' '}
            <Link to="/tests" className="font-semibold text-brand hover:underline">
              Try a full timed mock test
            </Link>
            .
          </p>
        </>
      )}
    </div>
  )
}