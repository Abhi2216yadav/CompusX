import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Flag,
  Send,
  XCircle,
} from 'lucide-react'

import type { RunnerCheckpoint, RunnerQuestion } from '@/hooks/useTestRunner'
import { useTestRunner, type TestContext } from '@/hooks/useTestRunner'
import { Button } from '@/components/ui/Button'
import { Card, SectionCard } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/Modal'
import { Progress } from '@/components/ui/Feedback'
import { cn } from '@/utils/cn'

export interface TestRunnerProps {
  questions: RunnerQuestion[]
  durationSec?: number
  deadline?: number
  context: TestContext | null
  title: string
  showMarkForReview?: boolean
  /** Restores a saved in-flight attempt. */
  initial?: Partial<RunnerCheckpoint>
  /** Called after every answer, mark and navigation so the caller can persist. */
  onCheckpoint?: (state: RunnerCheckpoint) => void
  onFinished: (attemptId: string) => void
  onExit: () => void
}

/**
 * Reusable exam UI shared by quizzes, PYQ practice and mock tests.
 * Auto-submits exactly once when the clock hits zero.
 */
export default function TestRunner({
  questions,
  durationSec,
  deadline,
  context,
  title,
  showMarkForReview = true,
  initial,
  onCheckpoint,
  onFinished,
  onExit,
}: TestRunnerProps) {
  const [confirmSubmit, setConfirmSubmit] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)
  const [autoSubmitting, setAutoSubmitting] = useState(false)

  const runner = useTestRunner({
    questions,
    durationSec,
    deadline,
    context,
    initial,
    onCheckpoint,
    onExpire: () => setAutoSubmitting(true),
  })

  const {
    submit,
    submitting,
    expired,
    answers,
    marked,
    index,
    goTo,
    choose,
    toggleMark,
    preview,
    formatRemaining,
    remainingSeconds,
    isCritical,
  } = runner

  // The countdown sets `autoSubmitting`; submit exactly once, guarded against re-entry.
  useEffect(() => {
    if (!autoSubmitting || !expired || !context || submitting) return
    let cancelled = false
    submit().then((attempt) => {
      if (!cancelled && attempt) onFinished(attempt.id)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmitting, expired, context, submitting])

  if (!context) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="text-center">
          <h1 className="text-lg font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-muted">Preparing your test…</p>
        </Card>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <Card className="text-center">
          <h1 className="text-lg font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-muted">
            No questions are available for this test yet. Ask your teacher to add some.
          </p>
          <Button variant="secondary" className="mt-5" onClick={onExit}>
            Go back
          </Button>
        </Card>
      </div>
    )
  }

  const question = questions[index]
  const answeredCount = Object.keys(answers).length
  const unanswered = questions.length - answeredCount
  const progressPct = (answeredCount / questions.length) * 100
  const isMarked = marked.includes(question.id)

  async function handleSubmit() {
    const attempt = await submit()
    setConfirmSubmit(false)
    if (attempt) onFinished(attempt.id)
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-5">
      {/* Sticky header with the clock */}
      <header className="bg-surface border-border sticky top-0 z-30 mb-4 rounded-2xl border p-3 shadow-sm sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-bold text-ink sm:text-base">{title}</h1>
            <p className="text-[11px] text-muted">
              Question {index + 1} of {questions.length} · {answeredCount} answered
            </p>
          </div>

          {deadline != null && (
            <div
              className={cn(
                'tabular flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold',
                isCritical
                  ? 'bg-danger-soft text-danger'
                  : remainingSeconds < 300
                    ? 'bg-warn-soft text-warn'
                    : 'bg-surface-2 text-ink-2'
              )}
            >
              <span className="text-[10px] font-semibold tracking-wide uppercase opacity-70">Left</span>
              {formatRemaining()}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setConfirmExit(true)}>
              Exit
            </Button>
            <Button size="sm" onClick={() => setConfirmSubmit(true)} icon={<Send className="size-3.5" />}>
              Submit
            </Button>
          </div>
        </div>

        <Progress
          value={progressPct}
          size="sm"
          className="mt-3"
          tone={progressPct === 100 ? 'success' : 'brand'}
        />
      </header>

      {/* Question */}
      <Card className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-brand text-sm font-black text-white">
              {index + 1}
            </span>
            {question.subjectName && (
              <span className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted">
                {question.subjectName}
              </span>
            )}
            <span className="rounded-md bg-surface-2 px-2 py-1 text-[11px] font-semibold text-muted">
              {question.marks} mark{question.marks > 1 ? 's' : ''}
            </span>
          </div>

          {showMarkForReview && (
            <Button
              variant={isMarked ? 'soft' : 'ghost'}
              size="sm"
              onClick={() => toggleMark(question.id)}
              icon={<Flag className={cn('size-3.5', isMarked && 'fill-current')} />}
            >
              {isMarked ? 'Marked' : 'Mark'}
            </Button>
          )}
        </div>

        <p className="mt-4 text-base leading-relaxed font-semibold text-ink">{question.question}</p>

        <div className="mt-5 space-y-2.5">
          {question.options.map((option, i) => {
            const selected = answers[question.id] === i
            return (
              <button
                key={i}
                type="button"
                onClick={() => choose(question.id, i)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition',
                  selected
                    ? 'border-brand bg-brand-soft shadow-sm'
                    : 'border-border bg-surface hover:border-brand/40 hover:bg-surface-2'
                )}
              >
                <span
                  className={cn(
                    'grid size-6 shrink-0 place-items-center rounded-lg border-2 text-[11px] font-bold',
                    selected ? 'border-brand bg-brand text-white' : 'border-border text-muted'
                  )}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                <span className={cn('text-sm', selected ? 'font-semibold text-ink' : 'text-ink-2')}>
                  {option}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            icon={<ArrowLeft className="size-3.5" />}
          >
            Previous
          </Button>
          {index === questions.length - 1 ? (
            <Button onClick={() => setConfirmSubmit(true)} icon={<CheckCircle2 className="size-3.5" />}>
              Review &amp; submit
            </Button>
          ) : (
            <Button onClick={() => goTo(index + 1)} iconRight={<ArrowRight className="size-3.5" />}>
              Next
            </Button>
          )}
        </div>
      </Card>

      {/* Navigator */}
      <SectionCard title="Question navigator" subtitle="Tap a number to jump to that question">
        <div className="flex flex-wrap gap-2">
          {questions.map((q, i) => {
            const answered = answers[q.id] !== undefined
            const markedHere = marked.includes(q.id)
            const isCurrent = i === index
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Question ${i + 1}${answered ? ', answered' : ''}${markedHere ? ', marked for review' : ''}`}
                className={cn(
                  'relative grid size-9 place-items-center rounded-lg border text-xs font-bold transition',
                  isCurrent
                    ? 'border-brand bg-brand text-white'
                    : answered
                      ? 'border-success/40 bg-success-soft text-success'
                      : 'border-border bg-surface-2 text-muted hover:border-brand/40',
                  markedHere && !isCurrent && 'ring-2 ring-warn/60'
                )}
              >
                {i + 1}
                {answered && !isCurrent && (
                  <CheckCircle2 className="absolute -top-1 -right-1 size-3 text-success" aria-hidden />
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-border pt-3 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <Circle className="size-3 fill-muted" aria-hidden /> Unanswered
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3 text-success" aria-hidden /> Answered
          </span>
          <span className="flex items-center gap-1.5">
            <Flag className="size-3 text-warn" aria-hidden /> Marked for review
          </span>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirmSubmit}
        title="Submit your answers?"
        tone="primary"
        confirmLabel="Submit now"
        loading={submitting}
        message={
          <>
            <p>
              You have answered {answeredCount} of {questions.length} questions.
            </p>
            {unanswered > 0 && (
              <p className="mt-2 flex items-start gap-1.5 font-semibold text-warn">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                {unanswered} unanswered {unanswered === 1 ? 'question' : 'questions'} will be marked wrong.
              </p>
            )}
            <p className="mt-2">
              Current score:{' '}
              <span className="tabular font-bold text-ink">
                {preview.score}/{preview.total}
              </span>
            </p>
          </>
        }
        onConfirm={() => void handleSubmit()}
        onCancel={() => setConfirmSubmit(false)}
      />

      <ConfirmDialog
        open={confirmExit}
        title="Leave this test?"
        message="Your answers will be discarded and this attempt will not be recorded."
        confirmLabel="Leave test"
        onConfirm={() => {
          setConfirmExit(false)
          onExit()
        }}
        onCancel={() => setConfirmExit(false)}
      />

      {autoSubmitting && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-overlay/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-card">
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-danger-soft text-danger">
              <XCircle className="size-6" aria-hidden />
            </span>
            <h2 className="text-base font-extrabold text-ink">Time is up</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Your answers were submitted automatically. You answered {answeredCount} of {questions.length}{' '}
              questions.
            </p>
            {submitting && (
              <p className="mt-4 text-xs font-semibold text-brand">Scoring your paper…</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}