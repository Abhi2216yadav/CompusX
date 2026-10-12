import { useCallback, useMemo } from 'react'
import toast from 'react-hot-toast'
import type {
  Chapter,
  ClassRoom,
  Material,
  MockTest,
  Notice,
  Pyq,
  Question,
  Quiz,
  SchoolEvent,
  Subject,
  Task,
  UserProfile,
  Club,
  LostFoundPost,
  PeerQuestion,
} from '@/services/types'
import { COLLECTIONS, type CollectionName } from '@/services/db'
import { db } from '@/services'
import { useAsync, useCollection } from '@/hooks/useCollection'

/** Lookup tables for the current school, loaded once and shared by pages. */
export function useSchoolData(schoolId: string | undefined) {
  const subjects = useCollection<Subject>(COLLECTIONS.subjects, { where: [{ field: 'schoolId', op: '==', value: schoolId ?? '' }] }, [schoolId])
  const classes = useCollection<ClassRoom>(COLLECTIONS.classes, { where: [{ field: 'schoolId', op: '==', value: schoolId ?? '' }] }, [schoolId])
  const chapters = useCollection<Chapter>(COLLECTIONS.chapters, { where: [{ field: 'schoolId', op: '==', value: schoolId ?? '' }] }, [schoolId])

  const subjectById = useMemo(
    () => new Map(subjects.data.map((s) => [s.id, s])),
    [subjects.data]
  )
  const chapterById = useMemo(
    () => new Map(chapters.data.map((c) => [c.id, c])),
    [chapters.data]
  )
  const classById = useMemo(() => new Map(classes.data.map((c) => [c.id, c])), [classes.data])

  return {
    subjects: subjects.data,
    classes: classes.data,
    chapters: chapters.data,
    subjectById,
    chapterById,
    classById,
    loading: subjects.loading || classes.loading || chapters.loading,
  }
}

/** Sorted unique sections for a class. */
export function sectionsFor(classes: ClassRoom[], classId: string | 'all'): string[] {
  return [...new Set(classes.filter((c) => classId === 'all' || c.id === classId).map((c) => c.section))].sort()
}

export function classOptions(classes: ClassRoom[]) {
  return [
    { value: 'all', label: 'All classes' },
    ...classes.map((c) => ({ value: c.id, label: `Class ${c.classLevel}-${c.section}` })),
  ]
}

export function subjectOptions(subjects: Subject[], includeAll = true) {
  return [
    ...(includeAll ? [{ value: 'all', label: 'All subjects' }] : []),
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
  ]
}

/* ── Generic CRUD helpers ───────────────────────────────────────────────── */

export interface SaveResult<T> {
  id: string
  data: T
}

/**
 * Create-or-update with toast feedback. Every admin/teacher form uses this so
 * error handling and messaging stay consistent across the app.
 */
export function useSaver() {
  const save = useCallback(
    async <T extends { id?: string }>(
      collection: CollectionName,
      data: T,
      opts?: { id?: string; success?: string; onDone?: (id: string) => void }
    ): Promise<string | null> => {
      try {
        const id = opts?.id ?? data.id ?? (await db.create<T>(collection, data))
        if (opts?.id) await db.set(collection, opts.id, data as Record<string, unknown>)
        toast.success(opts?.success ?? 'Saved successfully')
        opts?.onDone?.(id)
        return id
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not save. Please try again.')
        return null
      }
    },
    []
  )

  const remove = useCallback(
    async (collection: CollectionName, id: string, label = 'Item') => {
      try {
        await db.remove(collection, id)
        toast.success(`${label} deleted`)
        return true
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Could not delete.')
        return false
      }
    },
    []
  )

  return { save, remove }
}

/** Publishes a notification to a class or the whole school. */
export function useNotifier() {
  return useCallback(
    async (params: {
      schoolId: string
      role?: 'student' | 'teacher' | 'admin'
      userIds?: string[]
      type: 'homework' | 'assignment' | 'notice' | 'material' | 'event' | 'deadline'
      title: string
      body: string
      link?: string
    }) => {
      const { notify } = await import('@/services/notifications')
      try {
        await notify(params)
      } catch (error) {
        console.warn('[CampusX] notification failed', error)
      }
    },
    []
  )
}

/* ── Composite loaders used by several pages ────────────────────────────── */

export function useStudentRoster(schoolId: string | undefined, classId?: string | 'all') {
  const where = [
    { field: 'schoolId', op: '==' as const, value: schoolId ?? '' },
    { field: 'role', op: '==' as const, value: 'student' },
  ]
  if (classId && classId !== 'all') {
    where.push({ field: 'classId', op: '==', value: classId })
  }
  return useCollection<UserProfile>(COLLECTIONS.users, { where, orderBy: [{ field: 'name' }] }, [schoolId, classId])
}

export function useContentLists(schoolId: string | undefined) {
  const where = [{ field: 'schoolId', op: '==' as const, value: schoolId ?? '' }]
  const materials = useCollection<Material>(COLLECTIONS.materials, { where }, [schoolId])
  const homework = useCollection<Task>(COLLECTIONS.homework, { where }, [schoolId])
  const assignments = useCollection<Task>(COLLECTIONS.assignments, { where }, [schoolId])
  const notices = useCollection<Notice>(COLLECTIONS.notices, { where, orderBy: [{ field: 'createdAt', dir: 'desc' }] }, [schoolId])
  const events = useCollection<SchoolEvent>(COLLECTIONS.events, { where }, [schoolId])
  const quizzes = useCollection<Quiz>(COLLECTIONS.quizzes, { where }, [schoolId])
  const mockTests = useCollection<MockTest>(COLLECTIONS.mockTests, { where }, [schoolId])
  const questions = useCollection<Question>(COLLECTIONS.questions, { where }, [schoolId])
  const pyqs = useCollection<Pyq>(COLLECTIONS.pyqs, { where }, [schoolId])
  const clubs = useCollection<Club>(COLLECTIONS.clubs, { where }, [schoolId])
  const lostFound = useCollection<LostFoundPost>(COLLECTIONS.lostFound, { where }, [schoolId])
  const peerQuestions = useCollection<PeerQuestion>(COLLECTIONS.studentQuestions, { where }, [schoolId])

  const byNewest = <T extends { createdAt: unknown }>(rows: T[]) =>
    [...rows].sort((a, b) => Number(b.createdAt ?? 0) - Number(a.createdAt ?? 0))

  return {
    materials: byNewest(materials.data),
    homework: byNewest(homework.data),
    assignments: byNewest(assignments.data),
    notices: notices.data,
    events: [...events.data].sort((a, b) => Number(a.startsAt) - Number(b.startsAt)),
    quizzes: byNewest(quizzes.data),
    mockTests: byNewest(mockTests.data),
    questions: byNewest(questions.data),
    pyqs: byNewest(pyqs.data),
    clubs: clubs.data,
    lostFound: byNewest(lostFound.data),
    peerQuestions: byNewest(peerQuestions.data),
    collections: { materials, homework, assignments, notices, events, quizzes, mockTests, questions, pyqs, clubs, lostFound, peerQuestions },
  }
}

/** Convenience wrapper for one-shot async loaders that need the school id. */
export function useLoader<T>(fn: () => Promise<T>, deps: unknown[]) {
  return useAsync(fn, deps)
}
