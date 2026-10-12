/**
 * One-shot loader for the student dashboard's derived data: the student's
 * `studentMetrics` document plus the live resource counts behind the four
 * learning-module cards.
 *
 * Every count uses the exact same filters as its destination page (Study Hub,
 * Quiz, PYQ, Mock Tests), so a card can never advertise content the student
 * will not find after clicking it. All filters are equality-only and have no
 * orderBy — no composite Firestore index is required.
 */
import { useAsync } from '@/hooks/useCollection'
import { COLLECTIONS } from '@/services/db'
import { db } from '@/services'
import { currentStreakWeeks } from '@/services/ranking'
import type {
  Material,
  MockTest,
  Pyq,
  Quiz,
  StudentMetrics,
  UserProfile,
} from '@/services/types'

export interface DashboardCounts {
  materials: number
  quizzes: number
  pyqs: number
  mockTests: number
}

export interface DashboardStats {
  /** Stored metrics document, or null for a student who has never attempted. */
  metrics: StudentMetrics | null
  /** Display-ready study streak (0 once lapsed). */
  streakWeeks: number
  counts: DashboardCounts
  /** Newest approved materials for the student's class (max 4). */
  recentMaterials: Material[]
}

const EMPTY_STATS: DashboardStats = {
  metrics: null,
  streakWeeks: 0,
  counts: { materials: 0, quizzes: 0, pyqs: 0, mockTests: 0 },
  recentMaterials: [],
}

export function useDashboardData(profile: UserProfile | null | undefined) {
  const schoolId = profile?.schoolId ?? ''
  const classLevel = profile?.classLevel ?? 10
  const studentId = profile?.id ?? ''

  return useAsync<DashboardStats>(
    async () => {
      if (!profile?.id) return EMPTY_STATS
      const [metrics, materials, quizzes, pyqs, mockTests] = await Promise.all([
        db.get<StudentMetrics>(COLLECTIONS.studentMetrics, profile.id),
        db.list<Material>(COLLECTIONS.materials, {
          where: [
            { field: 'schoolId', op: '==', value: profile.schoolId },
            { field: 'classLevel', op: '==', value: profile.classLevel ?? 10 },
            { field: 'isApproved', op: '==', value: true },
          ],
        }),
        db.list<Quiz>(COLLECTIONS.quizzes, {
          where: [
            { field: 'schoolId', op: '==', value: profile.schoolId },
            { field: 'classLevel', op: '==', value: profile.classLevel ?? 10 },
            { field: 'isPublished', op: '==', value: true },
          ],
        }),
        db.list<Pyq>(COLLECTIONS.pyqs, {
          where: [
            { field: 'schoolId', op: '==', value: profile.schoolId },
            { field: 'classLevel', op: '==', value: profile.classLevel ?? 10 },
            { field: 'isActive', op: '==', value: true },
          ],
        }),
        db.list<MockTest>(COLLECTIONS.mockTests, {
          where: [
            { field: 'schoolId', op: '==', value: profile.schoolId },
            { field: 'classLevel', op: '==', value: profile.classLevel ?? 10 },
            { field: 'isPublished', op: '==', value: true },
          ],
        }),
      ])

      return {
        metrics,
        streakWeeks: currentStreakWeeks(metrics),
        counts: {
          materials: materials.length,
          quizzes: quizzes.length,
          pyqs: pyqs.length,
          mockTests: mockTests.length,
        },
        recentMaterials: [...materials]
          .sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
          .slice(0, 4),
      }
    },
    [schoolId, classLevel, studentId]
  )
}
