import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Clock, GraduationCap, Play } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import { findSessionByStudent } from '@/services/attempts'
import type { MockTest } from '@/services/types'
import { useAsync } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions } from '@/hooks/useSchoolData'
import { PageHeader, SectionCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Input'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { formatDateTime } from '@/utils/date'
import { cn } from '@/utils/cn'

export default function MockTestList() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { subjects, subjectById } = useSchoolData(profile?.schoolId)
  const [subjectId, setSubjectId] = useState('all')

  const loader = useAsync<MockTest[]>(async () => {
    if (!profile) return []
    const rows = await db.list<MockTest>(COLLECTIONS.mockTests, {
      where: [
        { field: 'schoolId', op: '==', value: profile.schoolId },
        { field: 'classLevel', op: '==', value: profile.classLevel ?? 10 },
        { field: 'isPublished', op: '==', value: true },
      ],
    })
    return rows.sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
  }, [profile?.schoolId, profile?.classLevel])

  /**
   * Unfinished attempt for any mock test → resume instead of restarting.
   * Deliberately not memoised: it reads localStorage, so memoising would hide a
   * session that was written moments ago. The scan is a handful of keys.
   */
  const resumable = (() => {
    if (!profile) return null
    const session = findSessionByStudent(profile.id)
    return session && session.questions.length > 0 ? session : null
  })()

  const attempts = useAsync(async () => {
    if (!profile) return []
    return db.list<{ refId: string; percentage: number; submittedAt: unknown; id: string }>(
      COLLECTIONS.testAttempts,
      {
        where: [
          { field: 'schoolId', op: '==', value: profile.schoolId },
          { field: 'studentId', op: '==', value: profile.id },
          { field: 'kind', op: '==', value: 'mock' },
        ],
        orderBy: [{ field: 'submittedAt', dir: 'desc' }],
        limit: 60,
      }
    )
  }, [profile?.id])

  if (loader.loading) return <LoadingState label="Loading mock tests…" rows={5} />
  if (loader.error) return <ErrorState message={loader.error.message} onRetry={loader.reload} />

  const tests = (loader.data ?? []).filter((t) => subjectId === 'all' || t.subjectId === subjectId)
  const bestByTest = new Map<string, number>()
  for (const a of attempts.data ?? []) {
    const prev = bestByTest.get(a.refId)
    if (prev === undefined || a.percentage > prev) bestByTest.set(a.refId, a.percentage)
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Mock Tests"
        description="Full-length papers under exam conditions. Your timer is fixed once you start."
      />

      {resumable && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3">
          <div>
            <p className="text-sm font-bold text-ink">You have a test in progress</p>
            <p className="text-xs text-muted">
              "{resumable.title}" — started {formatDateTime(resumable.startedAt)}. Resuming keeps your original
              deadline.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate(`/tests/${resumable.mockTestId}/run`, { replace: true })}
            icon={<ArrowRight className="size-3.5" />}
          >
            Resume
          </Button>
        </div>
      )}

      <div className="mb-4 w-full sm:w-64">
        <Select
          label="Subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          options={subjectOptions(subjects)}
        />
      </div>

      {tests.length === 0 ? (
        <EmptyState
          icon={<GraduationCap className="size-6" />}
          title="No mock tests available"
          description="Your teacher has not published a mock test for this subject yet."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tests.map((test) => {
            const best = bestByTest.get(test.id)
            const questionCount = test.pyqCount + test.practiceCount
            const done = best !== undefined
            return (
              <article
                key={test.id}
                className={cn(
                  'rounded-2xl border bg-surface p-5 shadow-sm transition hover:border-brand/30',
                  done ? 'border-success/25' : 'border-border'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-ink">{test.title}</h3>
                    <p className="mt-0.5 text-xs text-muted">
                      {subjectById.get(test.subjectId)?.name ?? 'General'} · Class {test.classLevel}
                    </p>
                  </div>
                  {done && (
                    <Badge tone="success" icon={<CheckCircle2 className="size-3" />}>
                      {best.toFixed(0)}%
                    </Badge>
                  )}
                </div>

                {test.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted">{test.description}</p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" aria-hidden />
                    {test.durationMin} minutes
                  </span>
                  <span>{questionCount} questions</span>
                  <span>{test.totalMarks} marks</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <Link to={`/tests/${test.id}`} className="flex-1">
                    <Button fullWidth size="sm" icon={<Play className="size-3.5" />}>
                      {done ? 'View / retake' : 'Start test'}
                    </Button>
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <SectionCard className="mt-5" title="How CampusX keeps your timer honest">
        <ul className="space-y-2 text-sm text-muted">
          <li>
            <span className="font-semibold text-ink-2">Absolute deadline.</span> Your end time is calculated once
            and stored, so reloading the page cannot buy extra minutes.
          </li>
          <li>
            <span className="font-semibold text-ink-2">Answers are checkpointed.</span> Your choices and marked
            questions survive a refresh or an accidental tab close.
          </li>
          <li>
            <span className="font-semibold text-ink-2">Auto-submit.</span> When the clock hits zero your paper is
            submitted automatically with whatever you have answered.
          </li>
        </ul>
      </SectionCard>
    </div>
  )
}