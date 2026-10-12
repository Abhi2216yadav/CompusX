/**
 * Contribution & reputation.
 * Points are the *only* non-academic input to the ranking score and they are
 * deliberately capped at 10% of the total — see `ranking.ts` for the formula.
 * The goal is to encourage helpful participation, not to create a contest.
 */
import type { Contribution, ContributionKind, StudentMetrics, UserProfile } from '@/services/types'
import { COLLECTIONS } from '@/services/db'
import { db } from './index'
import { CONTRIBUTION_POINTS, applyContributionToMetrics, newMetricsDoc } from './ranking'
import { makeId } from '@/utils/id'

export interface AwardInput {
  schoolId: string
  studentId: string
  studentName: string
  kind: ContributionKind
  description: string
  refId?: string
  points?: number
  approvedBy?: string
}

export async function awardContribution(input: AwardInput): Promise<Contribution> {
  const contribution: Contribution = {
    id: makeId('con'),
    schoolId: input.schoolId,
    studentId: input.studentId,
    studentName: input.studentName,
    kind: input.kind,
    points: input.points ?? CONTRIBUTION_POINTS[input.kind],
    description: input.description,
    refId: input.refId,
    approvedBy: input.approvedBy,
    createdAt: Date.now(),
  }
  await db.create(COLLECTIONS.contributions, contribution, contribution.id)

  const existing = await db.get<StudentMetrics>(COLLECTIONS.studentMetrics, input.studentId)
  const base =
    existing ??
    newMetricsDoc({
      id: input.studentId,
      schoolId: input.schoolId,
      studentId: input.studentId,
      studentName: input.studentName,
      classId: '',
      classLevel: 0,
      classLabel: '—',
      section: '',
      rollNo: '—',
      academicYear: '2026-27',
    })
  const next = applyContributionToMetrics(base, contribution)
  await db.set(COLLECTIONS.studentMetrics, input.studentId, next as unknown as Record<string, unknown>)
  return contribution
}

export async function revokeContribution(contributionId: string, studentId: string): Promise<void> {
  await db.remove(COLLECTIONS.contributions, contributionId)
  const { rebuildMetricsFromScratch } = await import('./leaderboard')
  const metrics = await db.get<StudentMetrics>(COLLECTIONS.studentMetrics, studentId)
  await rebuildMetricsFromScratch(metrics?.schoolId ?? '')
}

/* ── Moderation ─────────────────────────────────────────────────────────── */

export async function moderateMaterial(
  materialId: string,
  approve: boolean
): Promise<void> {
  await db.update(COLLECTIONS.materials, materialId, { isApproved: approve })
}

export async function moderateQuestion(
  questionId: string,
  approve: boolean
): Promise<void> {
  await db.update(COLLECTIONS.studentQuestions, questionId, { isRemoved: !approve })
}

export async function reportContent(params: {
  collection: 'studentQuestions' | 'lostFound' | 'materials'
  id: string
  reporter: UserProfile
  reason: string
}): Promise<void> {
  const doc = await db.get<Record<string, unknown>>(COLLECTIONS[params.collection], params.id)
  if (!doc) return
  const reports = Array.isArray(doc.reports) ? (doc.reports as unknown[]) : []
  reports.push({
    userId: params.reporter.id,
    reason: params.reason,
    createdAt: Date.now(),
  })
  await db.update(COLLECTIONS[params.collection], params.id, { reports })
}

export { CONTRIBUTION_POINTS }
