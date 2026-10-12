import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { db } from '@/services'
import { COLLECTIONS } from '@/services/db'
import type { Task, TaskKind } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions } from '@/hooks/useSchoolData'
import { useDebounced } from '@/hooks/useUi'
import { PageHeader, StatTile } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { Tabs } from '@/components/ui/Disclosure'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { deadlineLabel, toMillis } from '@/utils/date'

/** A task is due soon when the deadline is within the next 48 hours. */
const SOON_MS = 48 * 60 * 60 * 1000

function taskState(task: Task, studentId: string) {
  const done = (task.completedBy ?? []).includes(studentId)
  const overdue = !done && toMillis(task.dueAt) < Date.now()
  const soon = !done && toMillis(task.dueAt) - Date.now() <= SOON_MS
  return { done, overdue, soon }
}

/**
 * Student homework/assignment board. Both pages share this component because
 * the only difference is the collection and a couple of labels.
 */
export default function TaskBoard({ kind }: { kind: TaskKind }) {
  const { profile } = useAuth()
  const { subjects, subjectById } = useSchoolData(profile?.schoolId)
  const collection = kind === 'homework' ? COLLECTIONS.homework : COLLECTIONS.assignments

  const [tab, setTab] = useState<'open' | 'done' | 'all'>('open')
  const [subjectId, setSubjectId] = useState('all')
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query)
  const [busyId, setBusyId] = useState<string | null>(null)

  const tasks = useCollection<Task>(
    collection,
    {
      where: [
        { field: 'schoolId', op: '==', value: profile?.schoolId ?? '' },
        { field: 'classLevel', op: '==', value: profile?.classLevel ?? 10 },
        { field: 'academicYear', op: '==', value: profile?.academicYear ?? '2026-27' },
      ],
    },
    [profile?.schoolId, profile?.classLevel, profile?.academicYear]
  )

  const studentId = profile?.id ?? ''

  const counts = useMemo(() => {
    let open = 0
    let done = 0
    let overdue = 0
    for (const t of tasks.data) {
      const s = taskState(t, studentId)
      if (s.done) done += 1
      else {
        open += 1
        if (s.overdue) overdue += 1
      }
    }
    return { open, done, overdue }
  }, [tasks.data, studentId])

  const visible = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return tasks.data
      .filter((t) => {
        const s = taskState(t, studentId)
        if (tab === 'open' && s.done) return false
        if (tab === 'done' && !s.done) return false
        if (subjectId !== 'all' && t.subjectId !== subjectId) return false
        if (!q) return true
        return (
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.teacherName.toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        const ad = taskState(a, studentId)
        const bd = taskState(b, studentId)
        if (ad.done !== bd.done) return ad.done ? 1 : -1
        return toMillis(a.dueAt) - toMillis(b.dueAt)
      })
  }, [tasks.data, tab, subjectId, debounced, studentId])

  async function toggleComplete(task: Task) {
    const current = taskState(task, studentId)
    const next = current.done
      ? (task.completedBy ?? []).filter((id) => id !== studentId)
      : [...(task.completedBy ?? []), studentId]
    setBusyId(task.id)
    try {
      await db.update(collection, task.id, { completedBy: next })
    } catch (error) {
      console.error(error)
    } finally {
      setBusyId(null)
    }
  }

  const title = kind === 'homework' ? 'Homework' : 'Assignments'
  const description =
    kind === 'homework'
      ? 'Daily work set by your teachers. Mark a task complete once you have finished it.'
      : 'Longer project and unit work your teachers set. Mark a task complete when you have submitted it.'

  if (tasks.loading) return <LoadingState label={`Loading ${title.toLowerCase()}…`} rows={4} />

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader title={title} description={description} />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <StatTile label="Open" value={counts.open} tone="brand" icon={<BookOpenCheck className="size-4" />} />
        <StatTile label="Completed" value={counts.done} tone="success" icon={<CheckCircle2 className="size-4" />} />
        <StatTile
          label="Overdue"
          value={counts.overdue}
          tone={counts.overdue > 0 ? 'danger' : 'info'}
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <Select
            label="Subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            options={subjectOptions(subjects)}
          />
        </div>
        <div className="flex-1" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tasks…"
          aria-label="Search tasks"
          className="cx-input h-9 w-full text-sm sm:w-52"
        />
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          items={[
            { value: 'open', label: 'Open', count: counts.open },
            { value: 'done', label: 'Completed', count: counts.done },
            { value: 'all', label: 'All', count: tasks.data.length },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={tab === 'done' ? 'Nothing completed yet' : 'No tasks here'}
          description={
            tab === 'done'
              ? 'Tasks you mark complete will appear in this list.'
              : 'Your teachers have not set any tasks for this filter yet.'
          }
        />
      ) : (
        <ul className="space-y-3">
          {visible.map((task) => {
            const state = taskState(task, studentId)
            return (
              <li
                key={task.id}
                className={cnCard(state.overdue && !state.done)}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    disabled={busyId === task.id}
                    aria-label={state.done ? `Mark "${task.title}" as not complete` : `Mark "${task.title}" as complete`}
                    onClick={() => void toggleComplete(task)}
                    className="mt-0.5 shrink-0 text-brand disabled:opacity-50"
                  >
                    {state.done ? (
                      <CheckCircle2 className="size-6 text-success" aria-hidden />
                    ) : (
                      <Circle className={cnRing(state.overdue)} aria-hidden />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className={cnTitle(state.done)}>{task.title}</h3>
                      <Badge tone="neutral">{subjectById.get(task.subjectId)?.name ?? 'General'}</Badge>
                      {state.overdue && <Badge tone="danger">Overdue</Badge>}
                      {!state.done && state.soon && <Badge tone="warn">Due soon</Badge>}
                    </div>

                    <p className={cnDesc(state.done)}>{task.description}</p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="size-3.5" aria-hidden />
                        {deadlineLabel(task.dueAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <FileText className="size-3.5" aria-hidden />
                        {task.maxMarks} marks
                      </span>
                      <span>Set by {task.teacherName}</span>
                    </div>

                    {task.attachmentUrl && (
                      <a
                        href={task.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                      >
                        <ExternalLink className="size-3.5" aria-hidden />
                        {task.attachmentName ?? 'Open attachment'}
                      </a>
                    )}
                  </div>

                  <Button
                    size="sm"
                    variant={state.done ? 'ghost' : 'primary'}
                    loading={busyId === task.id}
                    onClick={() => void toggleComplete(task)}
                    className="hidden shrink-0 sm:inline-flex"
                  >
                    {state.done ? 'Done' : 'Mark complete'}
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/* Small class helpers kept local so the card stays readable. */
function cnCard(alert: boolean): string {
  return [
    'rounded-2xl border bg-surface p-4 shadow-sm transition',
    alert ? 'border-danger/40 bg-danger-soft/30' : 'border-border',
  ].join(' ')
}

function cnRing(overdue: boolean): string {
  return ['size-6', overdue ? 'text-danger' : 'text-muted/50'].join(' ')
}

function cnTitle(done: boolean): string {
  return ['text-sm font-bold', done ? 'text-muted line-through' : 'text-ink'].join(' ')
}

function cnDesc(done: boolean): string {
  return ['mt-1.5 text-sm leading-relaxed', done ? 'text-muted' : 'text-ink-2'].join(' ')
}
