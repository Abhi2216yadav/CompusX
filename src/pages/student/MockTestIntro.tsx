import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Clock, Play, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import {
  clearSession,
  findSessionByStudent,
  loadSession,
  pickMockQuestions,
  saveSession,
  type MockSession,
} from '@/services/attempts'
import type { MockTest, Pyq, Question } from '@/services/types'
import { useAsync } from '@/hooks/useCollection'
import { useSchoolData } from '@/hooks/useSchoolData'
import { makeId } from '@/utils/id'
import TestRunner from '@/components/test/TestRunner'
import { Card, PageHeader, SectionCard } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { cn } from '@/utils/cn'

export default function MockTestIntro() {
  const { testId = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { subjects, subjectById } = useSchoolData(profile?.schoolId)
  const [starting, setStarting] = useState(false)

  const test = useAsync<MockTest | null>(() => db.get<MockTest>(COLLECTIONS.mockTests, testId), [testId])

  /**
 * An unfinished attempt for this exact test — resumed after any refresh.
 * Not memoised on purpose: it reads localStorage, and memoising on `profile`
 * would pin a stale result when the profile object identity changes.
 */
  const resume = (() => {
    if (!profile) return null
    const session = findSessionByStudent(profile.id)
    if (!session || session.mockTestId !== testId) return null
    const saved = loadSession(session.attemptId)
    return saved && saved.questions.length > 0 ? saved : null
  })()

  async function buildSession(active: MockTest): Promise<MockSession> {
    const student = profile!
    const [practice, pyqs] = await Promise.all([
      db.list<Question>(COLLECTIONS.questions, {
        where: [
          { field: 'schoolId', op: '==', value: student.schoolId },
          { field: 'subjectId', op: '==', value: active.subjectId },
          { field: 'classLevel', op: '==', value: active.classLevel },
          { field: 'isActive', op: '==', value: true },
        ],
      }),
      db.list<Pyq>(COLLECTIONS.pyqs, {
        where: [
          { field: 'schoolId', op: '==', value: student.schoolId },
          { field: 'subjectId', op: '==', value: active.subjectId },
          { field: 'classLevel', op: '==', value: active.classLevel },
          { field: 'isActive', op: '==', value: true },
        ],
      }),
    ])

    const picked = pickMockQuestions(active, pyqs, practice)
    const subjectName = subjectById.get(active.subjectId)?.name ?? 'General'

    return {
      attemptId: makeId('attempt'),
      mockTestId: active.id,
      title: active.title,
      studentId: student.id,
      questionIds: picked.questions.map((q) => q.id),
      questions: picked.questions.map((q) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        marks: active.totalMarks / Math.max(1, picked.questions.length),
        subjectName,
      })),
      answers: {},
      marked: [],
      // The absolute deadline is fixed here and stored with the session, which is
      // exactly why a reload cannot hand the student more time.
      startedAt: Date.now(),
      durationMin: active.durationMin,
      timeSpentPerQuestion: {},
      currentIndex: 0,
    }
  }

  async function handleStart() {
    if (!profile || !test.data || starting) return
    setStarting(true)
    try {
      const session = await buildSession(test.data)
      saveSession(session)
      navigate(`/tests/${testId}/run`, { replace: true })
    } catch (error) {
      console.error('[CampusX] could not start mock test', error)
      setStarting(false)
    }
  }


  if (test.loading) return <LoadingState label="Loading test instructions…" rows={5} />
  if (test.error) return <ErrorState message={test.error.message} onRetry={test.reload} />
  if (!test.data) {
    return (
      <EmptyState
        title="Test not found"
        description="This mock test may have been unpublished."
        action={
          <Link to="/tests">
            <Button>Back to mock tests</Button>
          </Link>
        }
      />
    )
  }

  const active = test.data

  if (resume) {
    return (
      <TestRunner
        questions={resume.questions}
        deadline={resume.startedAt + resume.durationMin * 60_000}
        context={{
          student: profile!,
          kind: 'mock',
          refId: active.id,
          refTitle: active.title,
          subjectId: active.subjectId,
          subjectName: subjectById.get(active.subjectId)?.name ?? 'General',
        }}
        title={active.title}
        onFinished={(attemptId) => {
          clearSession(attemptId)
          navigate(`/tests/${active.id}/result/${attemptId}`, { replace: true })
        }}
        onExit={() => navigate(`/tests/${active.id}`)}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={active.title}
        description={active.description}
        breadcrumb={
          <Link to="/tests" className="font-semibold text-muted hover:text-brand">
            ← Mock tests
          </Link>
        }
      />

      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Questions', value: active.pyqCount + active.practiceCount },
            { label: 'Total marks', value: active.totalMarks },
            { label: 'Duration', value: `${active.durationMin} min` },
            {
              label: 'Board weight',
              value: `${Math.round((active.pyqCount / Math.max(1, active.pyqCount + active.practiceCount)) * 100)}%`,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-surface-2 px-3 py-2.5">
              <p className="text-[10px] font-bold tracking-wide text-muted uppercase">{item.label}</p>
              <p className="tabular mt-0.5 text-lg font-extrabold text-ink">{item.value}</p>
            </div>
          ))}
        </div>

        {active.subjectId && (
          <p className="mt-3 text-xs text-muted">
            Subject:{' '}
            <span className="font-bold text-ink-2">{subjectById.get(active.subjectId)?.name ?? 'General'}</span>
            {' · '}
            Class {active.classLevel}
          </p>
        )}
      </Card>

      <SectionCard title="Instructions" icon={<ShieldCheck className="size-4" />}>
        <ul className="space-y-2.5">
          {(active.instructions.length
            ? active.instructions
            : [
                'Answer every question. Unanswered questions are marked wrong.',
                'You cannot change an answer once you move to the next question.',
                'The test submits itself automatically when the clock reaches zero.',
              ]
          ).map((line, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-brand-soft text-[10px] font-bold text-brand">
                {i + 1}
              </span>
              {line}
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-info/25 bg-info-soft px-4 py-3 text-sm text-ink-2">
        <Clock className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
        <p>
          <span className="font-semibold">Your timer starts the moment you begin</span> and is stored as a fixed
          deadline. Refreshing the page or switching tabs will not pause or reset it — you keep exactly{' '}
          {active.durationMin} minutes of wall-clock time.
        </p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          size="lg"
          loading={starting}
          onClick={() => void handleStart()}
          icon={<Play className="size-4" />}
          className={cn('flex-1 sm:flex-none')}
        >
          Start test — {active.durationMin} minutes
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate('/tests')}>
          Not yet
        </Button>
      </div>

      {subjects.length === 0 && (
        <p className="mt-4 text-center text-xs text-muted">No subjects configured for this school yet.</p>
      )}
    </div>
  )
}

