import { useParams } from 'react-router-dom'
import AttemptResult from '@/components/test/AttemptResult'
import { useAsync } from '@/hooks/useCollection'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'

export default function MockTestResult() {
  const { attemptId = '', testId = '' } = useParams()

  const test = useAsync(() => db.get<{ allowRetry: boolean }>(COLLECTIONS.mockTests, testId), [testId])

  return (
    <AttemptResult
      attemptId={attemptId}
      kind="mock"
      backTo="/tests"
      retryTo={`/tests/${testId}`}
      allowRetry={test.data?.allowRetry ?? false}
    />
  )
}