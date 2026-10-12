import { useParams } from 'react-router-dom'
import AttemptResult from '@/components/test/AttemptResult'

export default function PyqResult() {
  const { attemptId = '' } = useParams()

  return (
    <AttemptResult attemptId={attemptId} kind="pyq" backTo="/pyq" retryTo="/pyq" />
  )
}
