/**
 * Global search across CampusX content.
 * Collections are queried in parallel and merged into one ranked result list.
 * In Firestore mode this is a set of `where schoolId ==` queries; each can be
 * promoted to Algolia/Typesense later by replacing this module only.
 */
import type {
  Chapter,
  Material,
  Notice,
  Pyq,
  Question,
  Quiz,
  SchoolEvent,
  Subject,
  Task,
} from '@/services/types'
import { COLLECTIONS } from '@/services/db'
import { db } from './index'

export type SearchKind =
  | 'material'
  | 'subject'
  | 'chapter'
  | 'task'
  | 'question'
  | 'pyq'
  | 'quiz'
  | 'notice'
  | 'event'

export interface SearchFilters {
  classLevel?: number | 'all'
  subjectId?: string | 'all'
  year?: number | 'all'
  kinds?: SearchKind[] | 'all'
}

export interface SearchHit {
  id: string
  kind: SearchKind
  title: string
  snippet: string
  href: string
  meta: string
  score: number
}

export interface SearchResponse {
  hits: SearchHit[]
  total: number
  tookMs: number
}

const KIND_LABEL: Record<SearchKind, string> = {
  material: 'Study Material',
  subject: 'Subject',
  chapter: 'Chapter',
  task: 'Homework',
  question: 'Practice Question',
  pyq: 'PYQ',
  quiz: 'Quiz',
  notice: 'Notice',
  event: 'Event',
}

export const SEARCH_KIND_LABEL = KIND_LABEL

function scoreMatch(haystack: string, needle: string): number {
  const h = haystack.toLowerCase()
  const n = needle.toLowerCase()
  const index = h.indexOf(n)
  if (index < 0) return 0
  if (index === 0) return 100
  if (h.startsWith(n)) return 80
  const wordStart = index === 0 || h[index - 1] === ' '
  return wordStart ? 60 : 40
}

function snippet(text: string, needle: string, length = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  const index = clean.toLowerCase().indexOf(needle.toLowerCase())
  if (index < 0) return clean.slice(0, length)
  const start = Math.max(0, index - 40)
  return `${start > 0 ? '…' : ''}${clean.slice(start, start + length)}…`
}

export async function globalSearch(
  schoolId: string,
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResponse> {
  const started = performance.now()
  const needle = query.trim()
  if (needle.length < 2) return { hits: [], total: 0, tookMs: 0 }

  const kinds: SearchKind[] =
    filters.kinds && filters.kinds !== 'all' ? filters.kinds : (Object.keys(KIND_LABEL) as SearchKind[])
  const school = { field: 'schoolId', op: '==' as const, value: schoolId }

  const jobs: Record<string, Promise<unknown[]>> = {
    materials: db.list<Material>(COLLECTIONS.materials, { where: [school] }),
    subjects: db.list<Subject>(COLLECTIONS.subjects, { where: [school] }),
    chapters: db.list<Chapter>(COLLECTIONS.chapters, { where: [school] }),
    homework: db.list<Task>(COLLECTIONS.homework, { where: [school] }),
    assignments: db.list<Task>(COLLECTIONS.assignments, { where: [school] }),
    questions: db.list<Question>(COLLECTIONS.questions, { where: [school] }),
    pyqs: db.list<Pyq>(COLLECTIONS.pyqs, { where: [school] }),
    quizzes: db.list<Quiz>(COLLECTIONS.quizzes, { where: [school] }),
    notices: db.list<Notice>(COLLECTIONS.notices, { where: [school] }),
    events: db.list<SchoolEvent>(COLLECTIONS.events, { where: [school] }),
  }

  const resolved = await Promise.all(Object.values(jobs))
  const [materials, subjects, chapters, homework, assignments, questions, pyqs, quizzes, notices, events] =
    resolved as [Material[], Subject[], Chapter[], Task[], Task[], Question[], Pyq[], Quiz[], Notice[], SchoolEvent[]]

  const hits: SearchHit[] = []
  const push = (hit: SearchHit | null) => {
    if (hit && hit.score > 0) hits.push(hit)
  }

  const classOk = (level?: number) => filters.classLevel === undefined || filters.classLevel === 'all' || level === filters.classLevel
  const subjectOk = (id?: string) => filters.subjectId === undefined || filters.subjectId === 'all' || id === filters.subjectId
  const yearOk = (y?: number) => filters.year === undefined || filters.year === 'all' || y === filters.year

  if (kinds.includes('material')) {
    for (const m of materials) {
      if (!classOk(m.classLevel) || !subjectOk(m.subjectId)) continue
      push({
        id: m.id,
        kind: 'material',
        title: m.title,
        snippet: snippet(m.description ?? m.title, needle),
        href: `/study/material/${m.id}`,
        meta: m.type.toUpperCase(),
        score: scoreMatch(`${m.title} ${m.description ?? ''} ${m.tags.join(' ')}`, needle),
      })
    }
  }

  if (kinds.includes('subject')) {
    for (const s of subjects) {
      if (!classOk(s.classLevels.includes(10) ? 10 : undefined)) continue
      push({
        id: s.id,
        kind: 'subject',
        title: s.name,
        snippet: snippet(s.description ?? s.code, needle),
        href: `/study/subject/${s.id}`,
        meta: s.code,
        score: scoreMatch(`${s.name} ${s.code} ${s.description ?? ''}`, needle),
      })
    }
  }

  if (kinds.includes('chapter')) {
    for (const c of chapters) {
      if (!classOk(c.classLevel) || !subjectOk(c.subjectId)) continue
      push({
        id: c.id,
        kind: 'chapter',
        title: c.name,
        snippet: snippet(c.summary ?? '', needle),
        href: `/study/subject/${c.subjectId}`,
        meta: 'Chapter',
        score: scoreMatch(`${c.name} ${c.summary ?? ''}`, needle),
      })
    }
  }

  if (kinds.includes('task')) {
    for (const t of [...homework, ...assignments]) {
      if (!classOk(t.classLevel) || !subjectOk(t.subjectId)) continue
      push({
        id: t.id,
        kind: 'task',
        title: t.title,
        snippet: snippet(t.description, needle),
        href: t.kind === 'homework' ? '/homework' : '/assignments',
        meta: t.kind === 'homework' ? 'Homework' : 'Assignment',
        score: scoreMatch(`${t.title} ${t.description}`, needle),
      })
    }
  }

  if (kinds.includes('question')) {
    for (const q of questions) {
      if (!classOk(q.classLevel) || !subjectOk(q.subjectId)) continue
      push({
        id: q.id,
        kind: 'question',
        title: q.question,
        snippet: q.options[q.correctIndex] ?? '',
        href: '/quiz',
        meta: q.difficulty,
        score: scoreMatch(`${q.question} ${q.options.join(' ')}`, needle),
      })
    }
  }

  if (kinds.includes('pyq')) {
    for (const p of pyqs) {
      if (!classOk(p.classLevel) || !subjectOk(p.subjectId) || !yearOk(p.year)) continue
      push({
        id: p.id,
        kind: 'pyq',
        title: p.question,
        snippet: `${p.examName} · ${p.year}`,
        href: '/pyq',
        meta: String(p.year),
        score: scoreMatch(`${p.question} ${p.options.join(' ')} ${p.examName}`, needle),
      })
    }
  }

  if (kinds.includes('quiz')) {
    for (const q of quizzes) {
      if (!classOk(q.classLevel) || !subjectOk(q.subjectId)) continue
      push({
        id: q.id,
        kind: 'quiz',
        title: q.title,
        snippet: q.description ?? '',
        href: '/quiz',
        meta: 'Quiz',
        score: scoreMatch(`${q.title} ${q.description ?? ''}`, needle),
      })
    }
  }

  if (kinds.includes('notice')) {
    for (const n of notices) {
      push({
        id: n.id,
        kind: 'notice',
        title: n.title,
        snippet: snippet(n.body, needle),
        href: '/notices',
        meta: n.priority,
        score: scoreMatch(`${n.title} ${n.body}`, needle),
      })
    }
  }

  if (kinds.includes('event')) {
    for (const e of events) {
      push({
        id: e.id,
        kind: 'event',
        title: e.name,
        snippet: snippet(e.description, needle),
        href: '/events',
        meta: e.category,
        score: scoreMatch(`${e.name} ${e.description} ${e.venue}`, needle),
      })
    }
  }

  hits.sort((a, b) => b.score - a.score)

  return { hits, total: hits.length, tookMs: Math.round(performance.now() - started) }
}
