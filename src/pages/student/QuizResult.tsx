import { useParams } from 'react-router-dom'
import AttemptResult from '@/components/test/AttemptResult'
import { useAsync } from '@/hooks/useCollection'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'

export default function QuizResult() {
  const { attemptId = '', quizId = '' } = useParams()

  const quiz = useAsync(() => db.get<{ allowRetry: boolean }>(COLLECTIONS.quizzes, quizId), [quizId])

  return (
    <AttemptResult
      attemptId={attemptId}
      kind="quiz"
      backTo="/quiz"
      retryTo={`/quiz/${quizId}`}
      allowRetry={quiz.data?.allowRetry ?? true}
    />
  )
}