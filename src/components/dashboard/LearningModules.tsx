import { ArrowRight, BookOpen, ClipboardCheck, GraduationCap, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'

import { MaterialRow } from '@/components/student/MaterialRow'
import { Badge } from '@/components/ui/Badge'
import { SectionCard } from '@/components/ui/Card'
import { ErrorState, Skeleton } from '@/components/ui/Feedback'
import type { DashboardCounts } from '@/hooks/useDashboardData'
import type { Material, Subject } from '@/services/types'
import { pluralize } from '@/utils/format'
import { cn } from '@/utils/cn'

interface ModuleCard {
  key: keyof DashboardCounts
  title: string
  description: string
  cta: string
  to: string
  icon: typeof BookOpen
  tone: string
  one: string
  many: string
}

const MODULES: ModuleCard[] = [
  {
    key: 'materials',
    title: 'Notes',
    description: 'Subject-wise notes, PDFs and revision material for your class.',
    cta: 'Open Study Hub',
    to: '/study',
    icon: BookOpen,
    tone: 'bg-brand-soft text-brand',
    one: 'resource',
    many: 'resources',
  },
  {
    key: 'quizzes',
    title: 'MCQ Practice',
    description: 'Topic-wise MCQs with instant scoring after you submit.',
    cta: 'Start practising',
    to: '/quiz',
    icon: ClipboardCheck,
    tone: 'bg-info-soft text-info',
    one: 'quiz',
    many: 'quizzes',
  },
  {
    key: 'pyqs',
    title: 'PYQs',
    description: 'Previous-year board questions with full solutions.',
    cta: 'Practise PYQs',
    to: '/pyq',
    icon: GraduationCap,
    tone: 'bg-warn-soft text-gold',
    one: 'question',
    many: 'questions',
  },
  {
    key: 'mockTests',
    title: 'Mock Tests',
    description: 'Timed papers under real exam conditions, with a score report.',
    cta: 'Browse tests',
    to: '/tests',
    icon: Timer,
    tone: 'bg-success-soft text-success',
    one: 'test',
    many: 'tests',
  },
]

export function LearningModules({
  counts,
  recentMaterials,
  subjectById,
  loading,
  error,
  onRetry,
}: {
  counts: DashboardCounts
  recentMaterials: Material[]
  subjectById: Map<string, Subject>
  loading: boolean
  error: Error | null
  onRetry: () => void
}) {
  return (
    <SectionCard
      title="Learning modules"
      subtitle="Everything you study with — pick up where you left off"
      icon={<BookOpen className="size-4" />}
      action={
        <Link to="/study" className="text-xs font-bold text-brand hover:underline">
          Open Study Hub
        </Link>
      }
    >
      {error ? (
        <ErrorState title="Could not load your modules" message={error.message} onRetry={onRetry} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MODULES.map((mod) => {
            const Icon = mod.icon
            const count = counts[mod.key]
            return (
              <Link
                key={mod.key}
                to={mod.to}
                className="group flex flex-col rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand/35 hover:shadow-card"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className={cn('grid size-11 place-items-center rounded-xl', mod.tone)}>
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <Badge tone="neutral">
                    {loading ? 'Loading…' : pluralize(count, mod.one, mod.many)}
                  </Badge>
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink">{mod.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{mod.description}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand">
                  {mod.cta}
                  <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {!error && recentMaterials.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">Recently added</p>
            <Link to="/study" className="text-xs font-bold text-brand hover:underline">
              Browse all notes
            </Link>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {recentMaterials.map((material) => (
              <MaterialRow
                key={material.id}
                material={material}
                subject={subjectById.get(material.subjectId)}
              />
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  )
}

/** Skeleton used while the dashboard's counts are still loading. */
export function LearningModulesSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-36 rounded-2xl" />
      ))}
    </div>
  )
}
