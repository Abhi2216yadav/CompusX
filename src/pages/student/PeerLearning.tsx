import { useMemo, useState } from 'react'
import { CheckCircle2, HandHelping, Plus, Search, TrendingUp, ThumbsUp } from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { db } from '@/services'
import { COLLECTIONS } from '@/services/db'
import { awardContribution } from '@/services/contribution'
import type { PeerQuestion } from '@/services/types'
import { useCollection } from '@/hooks/useCollection'
import { useSchoolData, subjectOptions } from '@/hooks/useSchoolData'
import { useDebounced } from '@/hooks/useUi'
import { PageHeader, SectionCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Disclosure'
import { Avatar } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { makeId } from '@/utils/id'
import { relativeTime } from '@/utils/date'

const CATEGORIES: PeerQuestion['category'][] = [
  'Mathematics',
  'Science',
  'English',
  'Computer',
  'General',
]

export default function PeerLearning() {
  const { profile, school } = useAuth()
  const { subjects } = useSchoolData(profile?.schoolId)

  const [tab, setTab] = useState<'open' | 'resolved' | 'mine'>('open')
  const [category, setCategory] = useState('all')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({})
  const debounced = useDebounced(query)

  const questions = useCollection<PeerQuestion>(
    COLLECTIONS.studentQuestions,
    {
      where: [{ field: 'schoolId', op: '==', value: profile?.schoolId ?? '' }],
      orderBy: [{ field: 'createdAt', dir: 'desc' }],
    },
    [profile?.schoolId]
  )

  const peerLearningEnabled = school?.peerLearningEnabled ?? true
  const studentId = profile?.id ?? ''

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase()
    return questions.data
      .filter((item) => {
        if (tab === 'resolved' && !item.isResolved) return false
        if (tab === 'open' && item.isResolved) return false
        if (tab === 'mine' && item.authorId !== studentId) return false
        if (category !== 'all' && item.category !== category) return false
        if (!q) return true
        return (
          item.title.toLowerCase().includes(q) ||
          item.body.toLowerCase().includes(q) ||
          item.answers.some((a) => a.body.toLowerCase().includes(q))
        )
      })
      .sort((a, b) => {
        if (a.isResolved !== b.isResolved) return a.isResolved ? 1 : -1
        return b.upvotes.length - a.upvotes.length
      })
  }, [questions.data, tab, category, debounced, studentId])

  const openCount = questions.data.filter((q) => !q.isResolved).length
  const resolvedCount = questions.data.length - openCount

  async function toggleUpvote(question: PeerQuestion) {
    const upvoted = question.upvotes.includes(studentId)
    const next = upvoted
      ? question.upvotes.filter((id) => id !== studentId)
      : [...question.upvotes, studentId]
    await db.update(COLLECTIONS.studentQuestions, question.id, { upvotes: next })
  }

  async function postAnswer(question: PeerQuestion) {
    if (!profile) return
    const body = (answerDraft[question.id] ?? '').trim()
    if (!body) return
    const next = [
      ...question.answers,
      {
        id: makeId('ans'),
        body,
        authorId: studentId,
        authorName: profile.name,
        isAccepted: false,
        upvotes: [],
        isRemoved: false,
        createdAt: Date.now(),
      },
    ]
    await db.update(COLLECTIONS.studentQuestions, question.id, { answers: next })
    setAnswerDraft((d) => ({ ...d, [question.id]: '' }))
  }

  async function acceptAnswer(question: PeerQuestion, answerId: string) {
    if (!profile) return
    const answers = question.answers.map((a) => ({ ...a, isAccepted: a.id === answerId }))
    await db.update(COLLECTIONS.studentQuestions, question.id, { answers, isResolved: true })

    // Accepting an answer is the one contribution source awarded by a student.
    const chosen = answers.find((a) => a.id === answerId)
    if (chosen && chosen.authorId !== studentId) {
      await awardContribution({
        schoolId: profile.schoolId,
        studentId: chosen.authorId,
        studentName: chosen.authorName,
        kind: 'peerHelp',
        description: `Answered "${question.title}"`,
        refId: question.id,
        approvedBy: studentId,
      })
    }
  }

  if (!peerLearningEnabled) {
    return (
      <div className="mx-auto w-full max-w-4xl">
        <PageHeader title="Peer learning" />
        <EmptyState
          title="Peer learning is switched off"
          description="Your school admin has disabled the peer question board. Please check back later."
          icon={<HandHelping className="size-6" />}
        />
      </div>
    )
  }

  if (questions.loading) return <LoadingState label="Loading questions…" rows={4} />

  return (
    <div className="mx-auto w-full max-w-5xl">
      <PageHeader
        title="Peer learning"
        description="Ask a question or help a classmate. Answering others earns contribution points, which are 10% of your leaderboard score."
        action={
          <Button size="sm" icon={<Plus className="size-4" />} onClick={() => setAsking(true)}>
            Ask a question
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions…"
            aria-label="Search questions"
            className="h-9 pl-9"
          />
        </div>
        <Select
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={[{ value: 'all', label: 'All categories' }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
          className="h-9 w-auto min-w-36 text-xs font-semibold"
        />
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          items={[
            { value: 'open', label: 'Open', count: openCount },
            { value: 'resolved', label: 'Resolved', count: resolvedCount },
            { value: 'mine', label: 'My questions' },
          ]}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No questions here"
          description="Be the first to ask. Clear titles get faster answers."
          icon={<HandHelping className="size-6" />}
          action={
            <Button size="sm" onClick={() => setAsking(true)}>
              Ask a question
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const isOpen = expanded === item.id
            const upvoted = item.upvotes.includes(studentId)
            const visibleAnswers = item.answers.filter((a) => !a.isRemoved)
            return (
              <li key={item.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{item.category}</Badge>
                  {item.isResolved ? (
                    <Badge tone="success" icon={<CheckCircle2 className="size-3" />}>
                      Resolved
                    </Badge>
                  ) : (
                    <Badge tone="warn">Open</Badge>
                  )}
                  <span className="text-xs text-muted">
                    Class {item.classLevel} · {relativeTime(item.createdAt)}
                  </span>
                </div>

                <h3 className="mt-2 text-sm font-bold text-ink">{item.title}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed text-ink-2 ${isOpen ? '' : 'line-clamp-3'}`}>
                  {item.body}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void toggleUpvote(item)}
                    aria-pressed={upvoted}
                    className={
                      upvoted
                        ? 'inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-2.5 py-1.5 text-xs font-bold text-brand'
                        : 'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:bg-surface-2'
                    }
                  >
                    <ThumbsUp className="size-3.5" aria-hidden />
                    {item.upvotes.length}
                  </button>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                    <TrendingUp className="size-3.5" aria-hidden />
                    {visibleAnswers.length} answer{visibleAnswers.length === 1 ? '' : 's'}
                  </span>
                  <span className="text-xs text-muted">Asked by {item.authorName}</span>
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                    className="ml-auto text-xs font-bold text-brand hover:underline"
                  >
                    {isOpen ? 'Collapse' : 'View answers'}
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    {visibleAnswers.length === 0 ? (
                      <p className="text-sm text-muted">No answers yet. Be the first to help.</p>
                    ) : (
                      visibleAnswers.map((answer) => (
                        <div
                          key={answer.id}
                          className={
                            answer.isAccepted
                              ? 'rounded-xl border border-success/30 bg-success-soft p-3'
                              : 'rounded-xl border border-border bg-surface-2 p-3'
                          }
                        >
                          <div className="flex items-center gap-2">
                            <Avatar name={answer.authorName} size={24} />
                            <span className="text-xs font-semibold text-ink">{answer.authorName}</span>
                            <span className="text-[11px] text-muted">{relativeTime(answer.createdAt)}</span>
                            {answer.isAccepted && (
                              <Badge tone="success" className="ml-auto">
                                Accepted
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-2">{answer.body}</p>

                          {item.authorId === studentId && !item.isResolved && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2.5"
                              onClick={() => void acceptAnswer(item, answer.id)}
                            >
                              Mark as accepted
                            </Button>
                          )}
                        </div>
                      ))
                    )}

                    {!item.isResolved && (
                      <div className="space-y-2">
                        <Textarea
                          rows={3}
                          value={answerDraft[item.id] ?? ''}
                          onChange={(e) => setAnswerDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                          placeholder="Write a clear, step-by-step answer…"
                          aria-label="Your answer"
                        />
                        <Button size="sm" onClick={() => void postAnswer(item)}>
                          Post answer
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <SectionCard title="House rules" className="mt-5" icon={<HandHelping className="size-4" />}>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-2">
          <li>Keep questions academic and specific to your syllabus.</li>
          <li>Never post another student&apos;s personal details or exam papers you were not given.</li>
          <li>Teachers can remove an answer that is not helpful or not respectful.</li>
          <li>Every accepted answer awards the helper 12 contribution points.</li>
        </ul>
      </SectionCard>

      <AskQuestionModal
        open={asking}
        onClose={() => setAsking(false)}
        subjectOptions={subjectOptions(subjects)}
        onDone={() => setAsking(false)}
      />
    </div>
  )
}

/* ── Ask modal ───────────────────────────────────────────────────────────── */

function AskQuestionModal({
  open,
  onClose,
  subjectOptions: subjectOpts,
  onDone,
}: {
  open: boolean
  onClose: () => void
  subjectOptions: { value: string; label: string }[]
  onDone: () => void
}) {
  const { profile } = useAuth()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<PeerQuestion['category']>('Mathematics')
  const [subjectId, setSubjectId] = useState('all')
  const [busy, setBusy] = useState(false)

  async function submit() {
    if (!profile || !title.trim() || !body.trim()) return
    setBusy(true)
    try {
      const record: PeerQuestion = {
        id: makeId('pq'),
        schoolId: profile.schoolId,
        category,
        subjectId: subjectId === 'all' ? undefined : subjectId,
        title: title.trim(),
        body: body.trim(),
        authorId: profile.id,
        authorName: profile.name,
        classLevel: profile.classLevel ?? 10,
        isResolved: false,
        answers: [],
        upvotes: [],
        reports: [],
        createdAt: Date.now(),
      }
      await db.create(COLLECTIONS.studentQuestions, record, record.id)
      setTitle('')
      setBody('')
      onDone()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ask a question"
      description="A clear title and the exact step you are stuck on get the fastest answers."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy} disabled={!title.trim() || !body.trim()}>
            Post question
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <Input
          label="Title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Why does a transversal create alternate angles?"
          maxLength={110}
        />
        <Textarea
          label="Question"
          required
          rows={5}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Explain what you have tried so far."
        />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as PeerQuestion['category'])}
          options={CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <Select
          label="Subject (optional)"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          options={subjectOpts}
        />
      </div>
    </Modal>
  )
}