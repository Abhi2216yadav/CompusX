import { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, MessageSquareWarning, RotateCcw, ShieldOff } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import type { PeerQuestion } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSaver } from '@/hooks/useSchoolData'
import { moderateQuestion } from '@/services/contribution'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { LoadingState } from '@/components/ui/Feedback'
import { relativeTime } from '@/utils/date'
import { truncate } from '@/utils/format'

type QueueFilter = 'all' | 'open' | 'resolved' | 'reported'

const FILTERS: { value: QueueFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'reported', label: 'Reported' },
]

export default function TeacherQuestionQueue() {
  const { profile } = useAuth()
  const schoolId = profile?.schoolId ?? ''
  const { save } = useSaver()

  const [filter, setFilter] = useState<QueueFilter>('all')
  const [moderating, setModerating] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Record<string, boolean>>({})

  const queue = useCollection<PeerQuestion>(
    COLLECTIONS.studentQuestions,
    {
      where: [{ field: 'schoolId', op: '==', value: schoolId }],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [schoolId]
  )

  const rows = useMemo(() => {
    switch (filter) {
      case 'open':
        return queue.data.filter((q) => !q.isResolved)
      case 'resolved':
        return queue.data.filter((q) => q.isResolved)
      case 'reported':
        return queue.data.filter((q) => (q.reports?.length ?? 0) > 0)
      default:
        return queue.data
    }
  }, [queue.data, filter])

  const open = queue.data.filter((q) => !q.isResolved).length
  const unresolvedReports = queue.data.filter((q) => (q.reports?.length ?? 0) > 0).length

  async function handleRemove(q: PeerQuestion) {
    setModerating(q.id)
    try {
      await moderateQuestion(q.id, false)
      setRemoved((current) => ({ ...current, [q.id]: true }))
      toast.success('Question removed from peer learning')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove the question.')
    } finally {
      setModerating(null)
    }
  }

  const columns: Column<PeerQuestion>[] = [
    {
      key: 'title',
      header: 'Question',
      cell: (q) => {
        const accepted = (q.answers ?? []).find((a) => a.isAccepted)
        return (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
              {removed[q.id] && <ShieldOff className="size-3.5 shrink-0 text-danger" aria-hidden />}
              {truncate(q.title, 80)}
            </p>
            {accepted && (
              <p className="mt-0.5 flex items-start gap-1 text-[11px] text-success">
                <CheckCircle2 className="mt-px size-3 shrink-0" aria-hidden />
                <span className="line-clamp-1">{truncate(accepted.body, 90)}</span>
              </p>
            )}
            <Badge tone="neutral" className="mt-1">
              {q.category}
            </Badge>
          </div>
        )
      },
    },
    {
      key: 'author',
      header: 'Author',
      hideBelow: 'sm',
      cell: (q) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink-2">{q.authorName}</p>
          <p className="text-[11px] text-muted">{relativeTime(q.createdAt)}</p>
        </div>
      ),
    },
    {
      key: 'class',
      header: 'Class',
      hideBelow: 'lg',
      cell: (q) => `Class ${q.classLevel}`,
    },
    {
      key: 'answers',
      header: 'Answers',
      align: 'right',
      hideBelow: 'sm',
      cell: (q) => <span className="tabular">{(q.answers ?? []).filter((a) => !a.isRemoved).length}</span>,
    },
    {
      key: 'upvotes',
      header: 'Upvotes',
      align: 'right',
      hideBelow: 'lg',
      cell: (q) => <span className="tabular">{(q.upvotes ?? []).length}</span>,
    },
    {
      key: 'reports',
      header: 'Reports',
      align: 'right',
      hideBelow: 'sm',
      cell: (q) => {
        const count = (q.reports ?? []).length
        return count > 0 ? (
          <Badge tone="danger" icon={<MessageSquareWarning className="size-3" />}>
            {count}
          </Badge>
        ) : (
          <span className="tabular text-muted">0</span>
        )
      },
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      hideBelow: 'sm',
      cell: (q) => (
        <Badge tone={q.isResolved ? 'success' : 'neutral'}>{q.isResolved ? 'Resolved' : 'Open'}</Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (q) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant={q.isResolved ? 'ghost' : 'success'}
            onClick={() =>
              void save(
                COLLECTIONS.studentQuestions,
                { ...q, isResolved: !q.isResolved },
                { id: q.id, success: q.isResolved ? 'Reopened' : 'Marked resolved' }
              )
            }
          >
            {q.isResolved ? 'Reopen' : 'Resolve'}
          </Button>
          {(q.reports?.length ?? 0) > 0 && !removed[q.id] && (
            <Button
              size="sm"
              variant="danger"
              loading={moderating === q.id}
              onClick={() => void handleRemove(q)}
            >
              Remove
            </Button>
          )}
          {removed[q.id] && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setRemoved((current) => ({ ...current, [q.id]: false }))}
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Undo
            </Button>
          )}
        </div>
      ),
    },
  ]

  if (queue.loading) return <LoadingState label="Loading moderation queue…" rows={6} />

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        title="Question Queue"
        description="Peer questions your students asked. Resolve answered threads and remove anything reported."
      />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Open questions" value={queue.data.length} />
        <StatTile label="Unresolved" value={open} tone={open > 0 ? 'warn' : 'success'} />
        <StatTile
          label="Reported"
          value={unresolvedReports}
          tone={unresolvedReports > 0 ? 'danger' : 'info'}
        />
      </div>

      <div className="mb-4">
        <Select
          aria-label="Filter the moderation queue"
          value={filter}
          onChange={(e) => setFilter(e.target.value as QueueFilter)}
          options={FILTERS.map((f) => ({ value: f.value, label: f.label }))}
          className="h-9 w-auto min-w-32 text-xs font-semibold"
        />
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(q) => q.id}
        empty={{
          title: filter === 'all' ? 'Nothing in the queue' : `No ${filter} questions`,
          description:
            filter === 'all'
              ? 'Student questions show up here the moment someone asks one.'
              : 'Try a different filter to see the rest of the queue.',
        }}
      />
    </div>
  )
}
