import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import { pickQuizQuestions } from '@/services/attempts'
import type { Question, Quiz } from '@/services/types'
import { useAsync } from '@/hooks/useCollection'
import type { RunnerQuestion } from '@/hooks/useTestRunner'
import TestRunner from '@/components/test/TestRunner'
import { Button } from '@/components/ui/Button'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'

export default function QuizRunner() {
  const { quizId = '' } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const quiz = useAsync<Quiz | null>(() => db.get<Quiz>(COLLECTIONS.quizzes, quizId), [quizId])

  const questions = useAsync<RunnerQuestion[]>(async () => {
    const q = quiz.data
    if (!q || !profile) return []
    const pool = await db.list<Question>(COLLECTIONS.questions, {
      where: [
        { field: 'schoolId', op: '==', value: profile.schoolId },
        { field: 'subjectId', op: '==', value: q.subjectId },
        { field: 'classLevel', op: '==', value: q.classLevel },
        { field: 'isActive', op: '==', value: true },
      ],
    })
    const scoped = pool.filter((item) => !q.chapterId || item.chapterId === q.chapterId)
    const picked = q.questionIds.length
      ? scoped.filter((item) => q.questionIds.includes(item.id))
      : pickQuizQuestions(q, scoped)
    return picked.map((item) => ({
      id: item.id,
      question: item.question,
      options: item.options,
      correctIndex: item.correctIndex,
      marks: q.marksPerQuestion || item.marks,
      explanation: item.explanation,
    }))
  }, [quiz.data?.id, profile?.id])

  const active = quiz.data

  const context = useMemo(
    () =>
      profile && active
        ? {
            student: profile,
            kind: 'quiz' as const,
            refId: active.id,
            refTitle: active.title,
            subjectId: active.subjectId,
            subjectName: 'Quiz',
          }
        : null,
    [profile, active]
  )

  if (quiz.loading || questions.loading) return <LoadingState label="Preparing your quiz…" rows={5} />
  if (quiz.error) return <ErrorState message={quiz.error.message} onRetry={quiz.reload} />
  if (!active) {
    return (
      <EmptyState
        title="Quiz not found"
        description="This quiz may have been unpublished by your teacher."
        action={
          <Link to="/quiz">
            <Button>Back to quizzes</Button>
          </Link>
        }
      />
    )
  }

  return (
    <TestRunner
      questions={questions.data ?? []}
      durationSec={active.timeLimitSec || undefined}
      context={context}
      title={active.title}
      onFinished={(attemptId) => navigate(`/quiz/${active.id}/result/${attemptId}`, { replace: true })}
      onExit={() => navigate('/quiz')}
    />
  )
}