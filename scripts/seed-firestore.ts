/**
 * Seeds a real Firebase project with the CampusX demo school.
 *
 *   npm run seed:firestore -- --dry-run     # print what would be written
 *   npm run seed:firestore                  # write documents + create accounts
 *   npm run seed:firestore -- --reset       # wipe CampusX collections first
 *
 * Credentials come from Application Default Credentials or the environment:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
 *   FIREBASE_PROJECT_ID=your-project-id        (optional, read from the key)
 *
 * The document set is *the same* `buildSeed()` output the local demo backend
 * uses, so the Firestore app and demo mode render identical data. Nothing is
 * duplicated here.
 *
 * Every seeded `users` document is also created as a real Firebase Auth
 * account under the same uid, because the security rules authorise on
 * `users/{request.auth.uid}`. Passwords are per role and printed at the end.
 */
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { readFileSync } from 'node:fs'

import { buildSeed, DEMO_ACCOUNTS, SEED_META } from '@/data/seed'
import { COLLECTIONS } from '@/services/db'

/* ── CLI ────────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2)
const DRY_RUN = argv.includes('--dry-run')
const RESET = argv.includes('--reset')
const SKIP_AUTH = argv.includes('--skip-auth')
const BATCH_SIZE = 400

const ROLE_PASSWORDS: Record<string, string> = {
  student: 'student123',
  teacher: 'teacher123',
  admin: 'admin123',
}

/* ── Firebase bootstrap ─────────────────────────────────────────────────── */

function initAdmin(): { app: App; db: Firestore } {
  if (getApps().length) {
    const app = getApps()[0]
    return { app, db: getFirestore(app) }
  }

  // Inline JSON in FIREBASE_SERVICE_ACCOUNT wins, then ADC, then the file path.
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT
  const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const projectId = process.env.FIREBASE_PROJECT_ID

  if (inline) {
    const parsed = JSON.parse(inline) as {
      project_id: string
      client_email: string
      private_key: string
    }
    const app = initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key.replace(/\\n/g, '\n'),
      }),
      projectId: projectId ?? parsed.project_id,
    })
    return { app, db: getFirestore(app) }
  }

  if (!keyFile) {
    console.error(
      '\n  No credentials found. Set one of:\n' +
        '    GOOGLE_APPLICATION_CREDENTIALS=C:\\path\\to\\service-account.json\n' +
        '    FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}\n' +
        '  or sign in with `gcloud auth application-default login`.\n'
    )
    process.exit(1)
  }

  const key = JSON.parse(readFileSync(keyFile, 'utf8')) as {
    project_id: string
    client_email: string
    private_key: string
  }
  const app = initializeApp({
    credential: cert({
      projectId: key.project_id,
      clientEmail: key.client_email,
      privateKey: key.private_key.replace(/\\n/g, '\n'),
    }),
    projectId: projectId ?? key.project_id,
  })
  return { app, db: getFirestore(app) }
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

type Doc = Record<string, unknown> & { id?: string }

/**
 * Firestore rejects `undefined` at any depth, while the domain model uses it to
 * mean "not set" (e.g. `photoUrl: undefined`). Drop those keys, and reject
 * anything that cannot be serialised rather than writing a broken document.
 */
function clean(value: unknown, path = 'doc'): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Expected a plain object at "${path}", got ${Array.isArray(value) ? 'array' : typeof value}`)
  }
  const out: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (val === undefined) continue
    if (Array.isArray(val)) {
      out[key] = val.map((v, i) => (v !== null && typeof v === 'object' && !Array.isArray(v) ? clean(v, `${path}.${key}[${i}]`) : v))
    } else if (val !== null && typeof val === 'object') {
      out[key] = clean(val, `${path}.${key}`)
    } else {
      out[key] = val
    }
  }
  return out
}

/** Splits into Firestore-sized chunks (hard limit is 500 writes per batch). */
function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

function bar(count: number, width = 28): string {
  const filled = Math.min(width, Math.round((count / Math.max(1, count)) * width))
  return '#'.repeat(filled)
}

/* ── Seed ───────────────────────────────────────────────────────────────── */

const seed = buildSeed() as Record<string, Doc[]>

/** Every seeded user, so accounts can be created under the same uid. */
const users = (seed[COLLECTIONS.users] ?? []).filter((u) => typeof u.id === 'string')

const summary: { col: string; count: number }[] = []
for (const col of Object.values(COLLECTIONS)) {
  summary.push({ col, count: seed[col]?.length ?? 0 })
}

const totalDocs = summary.reduce((n, s) => n + s.count, 0)
const roleCounts = users.reduce<Record<string, number>>((acc, u) => {
  const role = String(u.role ?? 'unknown')
  acc[role] = (acc[role] ?? 0) + 1
  return acc
}, {})

console.log(`\nCampusX seed — ${SEED_META.SCHOOL_ID} · academic year ${SEED_META.ACADEMIC_YEAR}`)
console.log(`  ${totalDocs} documents · ${users.length} auth accounts ` +
  `(${roleCounts.student ?? 0} student, ${roleCounts.teacher ?? 0} teacher, ${roleCounts.admin ?? 0} admin)`)
console.log('')
for (const { col, count } of summary) {
  console.log(`  ${col.padEnd(22)} ${String(count).padStart(5)}  ${bar(count)}`)
}

// Documents without an id cannot be addressed; fail loudly rather than
// silently writing them under a random key.
const missingIds: string[] = []
for (const col of Object.keys(seed)) {
  for (const d of seed[col]) {
    if (typeof d.id !== 'string' || !d.id) missingIds.push(`${col}/${JSON.stringify(d).slice(0, 60)}`)
  }
}
if (missingIds.length) {
  console.error(`\n  ${missingIds.length} document(s) have no "id" and cannot be written:`)
  for (const m of missingIds.slice(0, 10)) console.error(`    ${m}`)
  process.exit(1)
}

if (DRY_RUN) {
  console.log('\n  --dry-run: nothing was written.\n')
  process.exit(0)
}

const { app, db } = initAdmin()
console.log(`\n  Connected to project "${app.options.projectId}".`)

/* ── 1. Auth accounts ───────────────────────────────────────────────────── */

if (!SKIP_AUTH) {
  const auth = getAuth(app)
  let created = 0
  let updated = 0

  for (const user of users) {
    const uid = String(user.id)
    const email = String(user.email ?? '')
    const displayName = String(user.name ?? email)
    const password = ROLE_PASSWORDS[String(user.role)] ?? 'campusx123'
    if (!email) continue

    try {
      await auth.createUser({ uid, email, password, displayName, emailVerified: true, disabled: false })
      created += 1
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === 'auth/uid-already-exists' || code === 'auth/email-already-exists') {
        // Re-running the seed must not break sign-in, so the password and name
        // are reset to the documented demo values.
        await auth.updateUser(uid, { password, displayName, emailVerified: true, disabled: false })
        updated += 1
      } else {
        console.error(`  ! auth failed for ${email}: ${(error as Error).message}`)
      }
    }
    if ((created + updated) % 25 === 0) process.stdout.write(`  auth ${created + updated}/${users.length}\r`)
  }
  console.log(`  Auth accounts: ${created} created, ${updated} updated.`)
} else {
  console.log('  Auth accounts: skipped (--skip-auth).')
}

/* ── 2. Optional wipe ───────────────────────────────────────────────────── */

if (RESET) {
  for (const col of Object.values(COLLECTIONS)) {
    const snap = await db.collection(col).select().get()
    for (const group of chunk(snap.docs, BATCH_SIZE)) {
      const batch = db.batch()
      for (const d of group) batch.delete(d.ref)
      await batch.commit()
    }
    if (snap.size) console.log(`  cleared ${col} (${snap.size})`)
  }
}

/* ── 3. Documents ───────────────────────────────────────────────────────── */

for (const col of Object.values(COLLECTIONS)) {
  const docs = seed[col] ?? []
  if (!docs.length) continue

  const groups = chunk(docs, BATCH_SIZE)
  for (let i = 0; i < groups.length; i += 1) {
    const batch = db.batch()
    for (const doc of groups[i]) {
      const { id, ...rest } = doc
      batch.set(db.collection(col).doc(String(id)), clean(rest, `${col}/${id}`))
    }
    await batch.commit()
    if (groups.length > 1) process.stdout.write(`  ${col} batch ${i + 1}/${groups.length}\r`)
  }
  console.log(`  ${col.padEnd(22)} ${String(docs.length).padStart(5)} written`)
}

/* ── 4. Sign-in summary ─────────────────────────────────────────────────── */

console.log('\n  Sign in at the app with:')
console.log(`    student  ${DEMO_ACCOUNTS.student.email.padEnd(30)} ${ROLE_PASSWORDS.student}`)
console.log(`    teacher  ${DEMO_ACCOUNTS.teacher.email.padEnd(30)} ${ROLE_PASSWORDS.teacher}`)
console.log(`    admin    ${DEMO_ACCOUNTS.admin.email.padEnd(30)} ${ROLE_PASSWORDS.admin}`)
console.log(`    (all ${roleCounts.student ?? 0} seeded students use "${ROLE_PASSWORDS.student}".)\n`)

await app.delete()
process.exit(0)
