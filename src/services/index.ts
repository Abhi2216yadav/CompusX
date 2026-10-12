/**
 * CampusX service entry point.
 * Picks the Firestore backend when Firebase env vars exist, otherwise the
 * local demo store. Everything above this line is backend-agnostic.
 */
import { isFirebaseConfigured } from '@/firebase/config'
import { demoBackend } from './demoBackend'
import { firestoreBackend } from '@/firebase/firestoreBackend'
import type { Db } from './db'

export const db: Db = isFirebaseConfigured ? firestoreBackend : demoBackend

export const isDemoMode = !isFirebaseConfigured

export * from './db'
export { DEMO_ACCOUNTS } from '@/data/seed'
export { resetDemoData } from './demoBackend'
export * from './leaderboard'
export * from './attempts'
export * from './contribution'
export * from './notifications'
export * from './search'
export * from './attendance'
export * from './ranking'
