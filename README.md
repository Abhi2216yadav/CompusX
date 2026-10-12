# CampusX

A school-platform web app for students, teachers and administrators — study
content, quizzes, PYQ practice, timed mock tests, attendance, peer learning,
clubs, and a leaderboard that ranks on predicted board performance rather than
attendance.

Built with React 19, TypeScript, Vite, Tailwind CSS 4 and Firebase 12. It runs
with **zero configuration** in demo mode and switches to Cloud Firestore as soon
as Firebase environment variables are present.

---

## Quick start

```bash
npm install
npm run dev
```

Open the printed URL. No Firebase project is required — the app boots into
**demo mode** and seeds a full school into `localStorage`.

### Demo accounts

| Role    | Email                          | Password    | Lands on            |
| ------- | ------------------------------ | ----------- | ------------------- |
| Student | `abhay@abcpubschool.edu.in`    | `student123` | Student dashboard   |
| Teacher | `meera@abcpubschool.edu.in`    | `teacher123` | Teacher dashboard   |
| Admin   | `admin@abcpubschool.edu.in`    | `admin123`   | Admin dashboard     |

`Settings → Reset demo data` (admin only) re-seeds the store.

### Scripts

| Script            | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `npm run dev`     | Vite dev server with HMR                             |
| `npm run build`   | `tsc -b` typecheck, then production build to `dist/` |
| `npm run lint`    | Oxlint over the whole project                        |
| `npm run preview` | Serve the production build locally                  |
| `npm run smoke`   | Build and run the service-layer smoke test           |
| `npm run seed:dry` | Preview the Firestore seed (counts only, no writes) |
| `npm run seed`     | Seed Cloud Firestore + create Firebase Auth users    |

---

## Demo mode vs Firestore

`src/services/index.ts` picks a backend at boot:

```
Firebase env vars present  ->  firestoreBackend   (Cloud Firestore + Storage)
Firebase env vars missing   ->  demoBackend       (localStorage, deterministic seed)
```

Both implement the same `Db` interface (`src/services/db.ts`), so no feature
code knows which one is live. To connect a real project:

1. Copy `.env.example` → `.env.local`.
2. Fill in the six `VITE_FIREBASE_*` values from
   *Firebase Console → Project settings → Your apps → SDK setup*.
3. Enable **Authentication → Email/Password** and **Google**.
4. Deploy the rules and indexes:

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

`isDemoMode` and `demoMode` are exported from `src/services` if you need to show
a demo badge in the UI.

---

## Architecture

```
src/
  components/
    crud/CrudShell.tsx        Create/edit modal + delete confirm used by every
                              teacher and admin content page
    content/                  TaskManager, NoticeManager, TaskBoard
    layout/                   AppShell, Sidebar, Topbar, UserMenu, GlobalSearch
    test/                     TestRunner, AttemptResult, QuestionCard
    ui/                       Button, Input, Modal, DataTable, Feedback, …
  context/                    AuthContext, ThemeContext, NotificationContext
  hooks/                      useCollection, useAsync, useCountdown,
                              useTestRunner, useSchoolData
  pages/
    public/ auth/             Marketing and authentication
    student/ teacher/ admin/  Role-scoped screens
    leaderboard/ shared/      Cross-role screens
  services/
    db.ts                     The data-access contract
    types.ts                  Domain model — one interface per collection
    firestoreBackend.ts       Cloud Firestore implementation
    demoBackend.ts            localStorage implementation + seed data
    attempts.ts               Grading, submission, metrics, mock sessions
    ranking.ts                Scoring formula and reputation levels
    leaderboard.ts            Snapshots, personal rank, progress detail
    attendance.ts             Batched marking, monthly summaries
    contribution.ts           Contribution points and moderation
```

### Two backends, one contract

Every read goes through `db.list` / `db.subscribe` and every write through
`db.create` / `db.set` / `db.update` / `db.remove` / `db.writeBatch`. The
Firestore backend sends the full `where` + `orderBy` to the server and, if a
composite index is missing, transparently falls back to a single-filter fetch
plus in-memory filtering so the app degrades instead of hard-failing.

### Single-school-first tenancy

Every school-scoped document carries a `schoolId`. Adding a second school means
creating school/class/subject documents and filtering by `schoolId` — no schema
migration.

---

## Ranking model

The leaderboard is deliberately *not* attendance-based. Attendance is excluded
on purpose: it measures presence, not performance.

| Signal              | Weight |
| ------------------- | ------ |
| Mock test average   | 32%    |
| Quiz average        | 30%    |
| PYQ accuracy        | 22%    |
| Consistency         | 10%    |
| Contributions       | 10%    |

**Consistency** (0–100) rewards volume, score stability and recency from a
rolling window of the last 20 attempt percentages. **Contributions** are capped
at 10% so helpful participation is encouraged without turning the board into a
popularity contest.

`studentMetrics/{studentId}` is written incrementally on every attempt and
contribution, so the leaderboard never scans `testAttempts`. Snapshots
(`leaderboardSnapshots/{scopeId}`) are pre-ranked per filter combination and
carry a compact `rankIndex` for every ranked student so "my rank" stays exact
without materialising the whole school.

Reputation levels: **Beginner → Contributor → Helper → Star Student**.

---

## Test engine

`src/hooks/useTestRunner.ts` is shared by quizzes, PYQ practice and mock tests.

- **Refresh-safe deadlines.** The clock is an absolute `startedAt + duration`
  timestamp, never a decrementing counter, so refreshing the page, backgrounding
  the tab or sleeping the laptop cannot hand back time.
- **Checkpointing.** Answers, marked-for-review questions, the current index and
  per-question timings are written to the session after every interaction, so a
  crash or refresh resumes the paper exactly where it was.
- **Elapsed, not remaining.** `timeSpentSec` is measured from `startedAt`, so a
  student who uses their full allowance is credited the full time.
- **One-time auto-submit.** Expiry triggers exactly one submission, guarded
  against re-entry.
- **Local grading.** `preview` grades in memory so the UI can show a live score
  before persisting.

In-flight state lives in `localStorage` under `campusx.mockSession.*`. On a
Firestore deployment this is the natural place to move to a `mockTestSessions`
collection; the contract would not change.

---

## Roles and access

| Capability                       | Student | Teacher | Admin |
| -------------------------------- | ------- | ------- | ----- |
| Attempt quizzes / PYQs / mocks    | ✓       |         |       |
| Submit questions and resources    | ✓       |         |       |
| Upvote / answer peer questions    | ✓       |         |       |
| Create questions, quizzes, mocks |         | ✓       |       |
| Set homework and assignments      |         | ✓       | ✓     |
| Publish notices and events        |         | ✓       | ✓     |
| Mark attendance                   |         | ✓       |       |
| Moderate peer questions           |         | ✓       | ✓     |
| Manage classes, subjects, users   |         |         | ✓     |
| Recompute leaderboard snapshots   |         |         | ✓     |
| School-wide reports and settings  |         |         | ✓     |

Route guards live in `src/App.tsx` (`RequireAuth` with a `roles` prop), and
`firestore.rules` enforces the same matrix server-side. Client guards are for
UX only — the rules file is the security boundary.

---

## Seeding Cloud Firestore

To populate a real Firebase project with the **identical** demo school (20 students + 3 teachers + 1 admin, 50 quiz questions, 50 PYQs, 5 mock tests, etc.):

1. Create a Service Account in [Firebase Console → Project settings → Service accounts](https://console.firebase.google.com/) and download the JSON.
2. Set `GOOGLE_APPLICATION_CREDENTIALS` to its path, or paste the JSON into `FIREBASE_SERVICE_ACCOUNT`.
3. Run the seed:

```bash
npm run seed:dry   # preview counts
npm run seed       # create Auth users + write all collections
```

Flags:
- `--reset` — wipe CampusX collections before seeding
- `--skip-auth` — write documents only (if Auth users already exist)

The seed script uses `buildSeed()` from `src/data/seed.ts`, so local demo mode and Firestore stay in sync. All seeded students share the password `student123`.

---

## Required Firestore indexes

`firestore.indexes.json` contains every composite index the app needs. If you
add a query with a new `where` + `orderBy` combination, add the matching index
there and redeploy. Firestore will also print the exact index it wants when a
query fails — paste that definition into the file.

---

## Security

- `firestore.rules` authorises by role from the caller's own `users/{uid}`
  document; clients cannot read or write another user's profile.
- Students cannot write their own metrics, contributions approval, leaderboard
  snapshots or attendance.
- New sign-ups can only create a `student` profile (self-promotion to
  teacher/admin is rejected); staff accounts are created by an admin.
- The class list is readable by any signed-in user so a brand-new account can
  complete onboarding, but it contains only class names — never student data.
- Storage rules restrict uploads to the signed-in user's own school path.
- No secret ever reaches the browser: only the Firebase web config is
  `VITE_`-prefixed, and it is safe to ship — authorisation comes from the rules
  file, not from hiding keys.

### Known security limitation

CampusX grades papers **on the client** (`src/services/attempts.ts`). A quiz or
PYQ runner therefore has to read `correctIndex` to score answers, so a determined
student can read the answer key out of devtools or the network tab. The rules
limit this to students of the same school and stop them editing the question
bank, but that is **not** an anti-cheat boundary.

To close it properly:

1. Add a callable Cloud Function that accepts `{ attemptId, answers }` and returns
   the graded result, so `correctIndex` never reaches the browser.
2. Tighten `match /questions` and `match /pyqs` in `firestore.rules` to
   `allow read: if isStaff() && sameSchool(resource.data.schoolId)`.
3. Make `submitAttempt` prefer the function and fall back to client grading only
   in demo mode.

This is deliberately not done yet because it adds a server-side runtime that the
rest of the project does not have.

### Firebase deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,hosting
```

`firebase.json` also registers Hosting rewrites (SPA fallback) and long-lived
immutable caching for hashed assets. Set your project id in `.firebaserc` — see
`.firebaserc.example`.

---

## Testing

`scripts/smoke.ts` exercises the service layer end to end against the demo
backend — seeding, sign-in for all three roles, grading, attempt submission,
metrics, contributions, leaderboard snapshots and ranking, attendance
aggregation, and mock-session checkpointing.

```bash
npm run smoke
```

`scripts/dom-shim.mjs` supplies the `localStorage` and `window` shims the
browser-only service layer needs when it runs under node.

---

## Accessibility and responsiveness

- Every icon-only control has an `aria-label`; tables, dialogs and the countdown
  expose the right roles and live regions.
- Data tables collapse into a stacked label/value list on narrow viewports, so
  admin tables stay usable on a phone without a separate mobile implementation.
- Light and dark themes are driven by semantic tokens (`--cx-brand`,
  `--cx-surface-2`, …), never hard-coded colours.
- Motion respects `prefers-reduced-motion`.

---

## Project status

- Typecheck (`tsc -b`), lint (`oxlint`) and production build all pass clean.
- The service layer is covered by `scripts/smoke.ts` (see "Testing").
- Demo mode is fully functional end to end across all three roles.
- Outstanding: client-side grading exposes answer keys to students — see
  "Known security limitation".