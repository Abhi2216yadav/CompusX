/**
 * Shared test-taking engine for quizzes, PYQ practice and mock tests.
 *
 * The single most important guarantee here is the mock-test deadline: it is
 * derived from `startedAt + duration` and stored as an absolute timestamp, so
 * reloading the page or backgrounding the tab can never hand back time.
 *
 * In-flight state (answers, marked questions, current index and per-question
 * timings) can be checkpointed through `onCheckpoint` and handed back through
 * `initial`, which is what makes a mock test survive a refresh mid-paper.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { AttemptKind, UserProfile } from '@/services/types'
import { formatClock, useCountdown } from '@/hooks/useCountdown'
import { grade, submitAttempt, type GradedQuestion } from '@/services/attempts'

export interface RunnerQuestion extends GradedQuestion {
  question: string
  options: string[]
  subjectName?: string
  explanation?: string
}

export interface TestContext {
  student: UserProfile
  kind: AttemptKind
  refId: string
  refTitle: string
  subjectId: string
  subjectName: string
}

/** Everything needed to resume an attempt exactly where it was left. */
export interface RunnerCheckpoint {
  answers: Record<string, number>
  marked: string[]
  currentIndex: number
  startedAt: number
  timePerQuestion: Record<string, number>
}

export interface UseTestRunnerOptions {
  questions: RunnerQuestion[]
  /** Seconds on the clock. Ignored when an explicit deadline is supplied. */
  durationSec?: number
  /** Absolute epoch-ms deadline — required for refresh-safe mock tests. */
  deadline?: number
  /** Populated before the first question is answered. */
  context: TestContext | null
  /** Fires once when the clock reaches zero. */
  onExpire?: () => void
  /** Restores a saved in-flight attempt. */
  initial?: Partial<Omit<RunnerCheckpoint, 'answers' | 'marked' | 'currentIndex'>> &
    Partial<Pick<RunnerCheckpoint, 'answers' | 'marked' | 'currentIndex'>>
  /** Called after every answer, mark and navigation so the caller can persist. */
  onCheckpoint?: (state: RunnerCheckpoint) => void
}

export function useTestRunner({
  questions,
  durationSec,
  deadline,
  context,
  onExpire,
  initial,
  onCheckpoint,
}: UseTestRunnerOptions) {
  const [answers, setAnswers] = useState<Record<string, number>>(() => ({ ...initial?.answers }))
  const [marked, setMarked] = useState<string[]>(() => [...(initial?.marked ?? [])])
  const [index, setIndex] = useState(() => Math.max(0, initial?.currentIndex ?? 0))
  const [submitting, setSubmitting] = useState(false)
  const [expired, setExpired] = useState(false)

  // Timings live in refs so countdown re-renders stay cheap.
  const startedAt = useRef(initial?.startedAt ?? Date.now())
  const visitedAt = useRef(Date.now())
  const timePerQuestion = useRef<Record<string, number>>({ ...(initial?.timePerQuestion ?? {}) })

  const contextRef = useRef(context)
  contextRef.current = context
  const checkpointRef = useRef(onCheckpoint)
  checkpointRef.current = onCheckpoint

  const resolvedDeadline =
    deadline ?? (durationSec ? startedAt.current + durationSec * 1000 : null)

  /** Seconds the paper is worth. `null` when the test is untimed. */
  const totalTimeSec = useMemo(() => {
    if (durationSec) return durationSec
    if (resolvedDeadline) return Math.max(0, Math.round((resolvedDeadline - startedAt.current) / 1000))
    return null
  }, [durationSec, resolvedDeadline])

  const handleExpire = useCallback(() => {
    setExpired(true)
    onExpire?.()
  }, [onExpire])

  const { remainingSeconds, isCritical } = useCountdown(resolvedDeadline, {
    onExpire: handleExpire,
  })
  const formatRemaining = useCallback(() => formatClock(remainingSeconds), [remainingSeconds])

  const emitCheckpoint = useCallback(
    (
      nextAnswers: Record<string, number>,
      nextMarked: string[],
      nextIndex: number,
      timings: Record<string, number>
    ) => {
      checkpointRef.current?.({
        answers: nextAnswers,
        marked: nextMarked,
        currentIndex: nextIndex,
        startedAt: startedAt.current,
        timePerQuestion: timings,
      })
    },
    []
  )

  /** Banks the time spent on the question currently on screen. */
  const bankCurrentQuestionTime = useCallback(() => {
    const now = Date.now()
    const current = questions[index]
    if (current) {
      timePerQuestion.current[current.id] =
        (timePerQuestion.current[current.id] ?? 0) + Math.round((now - visitedAt.current) / 1000)
    }
    visitedAt.current = now
  }, [index, questions])

  const choose = useCallback(
    (questionId: string, optionIndex: number) => {
      const now = Date.now()
      const current = questions[index]
      if (current && current.id === questionId) {
        timePerQuestion.current[questionId] =
          (timePerQuestion.current[questionId] ?? 0) + Math.round((now - visitedAt.current) / 1000)
        visitedAt.current = now
      }
      const nextAnswers = { ...answers, [questionId]: optionIndex }
      const nextMarked = marked.filter((id) => id !== questionId)
      setAnswers(nextAnswers)
      setMarked(nextMarked)
      emitCheckpoint(nextAnswers, nextMarked, index, timePerQuestion.current)
    },
    [answers, emitCheckpoint, index, marked, questions]
  )

  const goTo = useCallback(
    (next: number) => {
      bankCurrentQuestionTime()
      const clamped = Math.max(0, Math.min(next, questions.length - 1))
      setIndex(clamped)
      emitCheckpoint(answers, marked, clamped, timePerQuestion.current)
    },
    [answers, bankCurrentQuestionTime, emitCheckpoint, marked, questions.length]
  )

  const toggleMark = useCallback(
    (questionId: string) => {
      const nextMarked = marked.includes(questionId)
        ? marked.filter((id) => id !== questionId)
        : [...marked, questionId]
      setMarked(nextMarked)
      emitCheckpoint(answers, nextMarked, index, timePerQuestion.current)
    },
    [answers, emitCheckpoint, index, marked]
  )

  const clearAll = useCallback(() => {
    setAnswers({})
    setMarked([])
    setIndex(0)
    startedAt.current = Date.now()
    visitedAt.current = Date.now()
    timePerQuestion.current = {}
    emitCheckpoint({}, [], 0, {})
  }, [emitCheckpoint])

  /** Grades locally so the UI can show a live score before persisting. */
  const preview = useMemo(
    () =>
      grade(
        questions.map((q) => ({ id: q.id, correctIndex: q.correctIndex, marks: q.marks })),
        answers
      ),
    [answers, questions]
  )

  const buildTimeMap = (): Record<string, number> => {
    bankCurrentQuestionTime()
    const map: Record<string, number> = {}
    for (const q of questions) map[q.id] = timePerQuestion.current[q.id] ?? 0
    return map
  }

  const submit = useCallback(async () => {
    const ctx = contextRef.current
    if (!ctx || submitting) return null
    setSubmitting(true)

    try {
      const timings = buildTimeMap()
      const now = Date.now()
      // Elapsed, never remaining: a student who uses all of their time
      // must be credited with the full allowance.
      const timeSpentSec = Math.min(
        totalTimeSec ?? Number.MAX_SAFE_INTEGER,
        Math.max(0, Math.round((now - startedAt.current) / 1000))
      )

      return await submitAttempt({
        student: ctx.student,
        kind: ctx.kind,
        refId: ctx.refId,
        refTitle: ctx.refTitle,
        subjectId: ctx.subjectId,
        subjectName: ctx.subjectName,
        questions,
        answers,
        startedAt: startedAt.current,
        submittedAt: now,
        timeSpentSec,
        timePerQuestion: timings,
        autoSubmitted: expired,
      })
    } finally {
      setSubmitting(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, expired, questions, submitting, totalTimeSec])

  /** Untimed papers still need a live elapsed counter for the result page. */
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  useEffect(() => {
    if (totalTimeSec != null) return
    const tick = () => setElapsedSeconds(Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [totalTimeSec])

  const timeSpentSec =
    totalTimeSec != null
      ? Math.max(0, Math.min(totalTimeSec, totalTimeSec - remainingSeconds))
      : elapsedSeconds

  return {
    answers,
    marked,
    index,
    remainingSeconds,
    formatRemaining,
    isCritical,
    expired,
    submitting,
    preview,
    totalTimeSec,
    timeSpentSec,
    startedAt: startedAt.current,
    choose,
    goTo,
    toggleMark,
    clearAll,
    submit,
  }
}