import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  Gauge,
  GraduationCap,
  Handshake,
  HeartHandshake,
  Library,
  ListChecks,
  Megaphone,
  MessageCircleQuestion,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { WEIGHTS } from '@/services/ranking'

const FEATURES: { icon: LucideIcon; title: string; body: string; tone: string }[] = [
  {
    icon: Library,
    title: 'Study Hub',
    body: 'Chapter-wise notes, PDFs and revision sheets uploaded by your teachers — organised by subject and class.',
    tone: 'bg-brand-soft text-brand',
  },
  {
    icon: ListChecks,
    title: 'Homework & assignments',
    body: 'Every deadline in one feed, with due-date reminders so nothing slips through on a Monday morning.',
    tone: 'bg-info-soft text-info',
  },
  {
    icon: FileQuestion,
    title: 'Chapter quizzes',
    body: 'Short topic-wise quizzes with instant scoring and a written explanation for every option.',
    tone: 'bg-accent-soft text-accent',
  },
  {
    icon: BookOpen,
    title: 'Board PYQ practice',
    body: 'Previous-year board questions weighted above practice ones, filtered by year, board and chapter.',
    tone: 'bg-warn-soft text-warn',
  },
  {
    icon: GraduationCap,
    title: 'Timed mock tests',
    body: 'Full-length papers under a strict timer. Reload the page or switch tabs — your remaining time is unchanged.',
    tone: 'bg-success-soft text-success',
  },
  {
    icon: Trophy,
    title: 'Live leaderboard',
    body: 'Weekly, monthly and all-time boards by class, section and subject, with your exact rank at all times.',
    tone: 'bg-warn-soft text-gold',
  },
]

const FOR_WHO = [
  {
    icon: GraduationCap,
    role: 'Students',
    points: [
      'Chapter-wise practice with explanations',
      'Timed mock tests that never reset on refresh',
      'Subject mastery and weak-chapter detection',
      'A fair leaderboard — attendance is never scored',
    ],
  },
  {
    icon: HeartHandshake,
    role: 'Teachers',
    points: [
      'Upload material once, available to every section',
      'Create questions, PYQs, quizzes and mock papers',
      'Mark attendance for the whole class in one pass',
      'Moderate student contributions and peer answers',
    ],
  },
  {
    icon: ShieldCheck,
    role: 'Administrators',
    points: [
      'Manage classes, subjects, teachers and students',
      'Publish notices, events and circulars school-wide',
      'Recalculate rankings and export reports',
      'Control whether rankings are public school-wide',
    ],
  },
]

/** `WEIGHTS` are the absolute scoring weights, so scale them to percentages. */
const RANK_WEIGHTS = [
  { label: 'Mock tests', pct: pctOf(WEIGHTS.mock), icon: GraduationCap },
  { label: 'Quiz average', pct: pctOf(WEIGHTS.quiz), icon: FileQuestion },
  { label: 'PYQ accuracy', pct: pctOf(WEIGHTS.pyq), icon: BookOpen },
  { label: 'Consistency', pct: pctOf(WEIGHTS.consistency), icon: Gauge },
  { label: 'Contributions', pct: pctOf(WEIGHTS.contribution), icon: HeartHandshake },
]

function pctOf(weight: number): number {
  return Math.round(weight * 100)
}

const STATS = [
  { value: '6–12', label: 'Class levels' },
  { value: '120', label: 'Students per demo school' },
  { value: '100', label: 'Practice questions' },
  { value: '0', label: 'Weight on attendance' },
]

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/8 via-transparent to-accent/8" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
                <Sparkles className="size-3" aria-hidden />
                One platform for study, practice and ranking
              </span>

              <h1 className="mt-5 text-4xl leading-[1.08] font-black tracking-tight text-ink sm:text-5xl lg:text-6xl">
                Prepare properly.
                <br />
                <span className="bg-gradient-to-r from-brand to-accent bg-clip-text text-transparent">
                  Practise honestly.
                </span>
                <br />
                Rank fairly.
              </h1>

              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
                CampusX gives every student their own study material, board-question practice, timed mock tests and
                a transparent leaderboard — while teachers and administrators manage content, attendance and
                communication from the same place.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/register">
                  <Button size="lg" icon={<GraduationCap className="size-4" />}>
                    Get started free
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="outline" size="lg" icon={<ArrowRight className="size-4" />}>
                    See how it works
                  </Button>
                </Link>
              </div>

              <p className="mt-4 text-xs text-muted">
                No credit card. Works in demo mode instantly — no Firebase setup required.
              </p>

              <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {STATS.map((stat) => (
                  <div key={stat.label} className="border-l-2 border-brand/30 pl-3">
                    <dt className="tabular text-2xl font-black text-ink">{stat.value}</dt>
                    <dd className="text-[11px] leading-tight text-muted">{stat.label}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <HeroVisual />
          </div>
        </div>
      </section>

      {/* Ranking explainer */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-soft px-3 py-1 text-xs font-bold text-gold">
                <Trophy className="size-3" aria-hidden />
                Feature spotlight
              </span>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-ink sm:text-4xl">
                A leaderboard you can actually trust
              </h2>
              <p className="mt-4 leading-relaxed text-muted">
                Most school leaderboards reward attendance and one lucky attempt. CampusX ranks on what actually
                predicts board performance, and it shows its working.
              </p>

              <ul className="mt-6 space-y-3">
                {RANK_WEIGHTS.map((w) => (
                  <li key={w.label} className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                      <w.icon className="size-4" aria-hidden />
                    </span>
                    <span className="w-32 shrink-0 text-sm font-semibold text-ink">{w.label}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-border">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-brand to-accent"
                        style={{ width: `${w.pct}%` }}
                      />
                    </span>
                    <span className="tabular w-10 shrink-0 text-right text-sm font-bold text-ink">
                      {w.pct}%
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 flex items-start gap-2 rounded-xl border border-success/25 bg-success-soft px-3.5 py-3 text-sm font-medium text-ink-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span>
                  <span className="font-bold text-success">Attendance is not scored.</span> Authorised absences
                  never cost a student a rank.
                </span>
              </p>

              <Link to="/leaderboard" className="mt-5 inline-block">
                <Button variant="secondary" icon={<Trophy className="size-4" />}>
                  Preview the board
                </Button>
              </Link>
            </div>

            <LeaderboardMock />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="max-w-2xl">
            <span className="text-xs font-bold tracking-widest text-brand uppercase">Everything included</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink sm:text-4xl">
              Built for the whole school day
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Not a thin quiz app. A complete workspace for content, practice, assessment and communication.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <article
                key={f.title}
                className="group rounded-2xl border border-border bg-surface p-5 transition hover:border-brand/30 hover:shadow-card"
              >
                <span className={`grid size-11 place-items-center rounded-xl ${f.tone}`}>
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="border-b border-border bg-surface-2">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-center text-3xl font-black tracking-tight text-ink sm:text-4xl">
            One platform, three roles
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-relaxed text-muted">
            Everyone sees exactly the tools their role needs — nothing more.
          </p>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {FOR_WHO.map((group) => (
              <div key={group.role} className="rounded-2xl border border-border bg-surface p-6">
                <span className="grid size-11 place-items-center rounded-xl bg-brand text-white">
                  <group.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{group.role}</h3>
                <ul className="mt-4 space-y-2.5">
                  {group.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-muted">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  to={group.role === 'Teachers' ? '/for-teachers' : group.role === 'Students' ? '/for-students' : '/how-it-works'}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-brand hover:underline"
                >
                  Learn more <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section>
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: RefreshCw, title: 'Refresh-safe timers', body: 'Mock test deadlines are absolute, so a reload never buys extra time.' },
              { icon: ShieldCheck, title: 'Role-based access', body: 'Rules and routes both enforce who can read and write what.' },
              { icon: Zap, title: 'Instant results', body: 'Scoring, metrics and rank refresh the moment you submit.' },
              { icon: Megaphone, title: 'Whole-school reach', body: 'Notices and events target classes, sections or everyone.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-surface p-5">
                <item.icon className="size-5 text-brand" aria-hidden />
                <h3 className="mt-3 text-sm font-bold text-ink">{item.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand to-accent">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center">
          <Users className="mx-auto size-9 text-white/80" aria-hidden />
          <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
            Ready to see your real progress?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/80">
            Create an account in under a minute, or sign in with a demo account to explore the student, teacher and
            admin experience right away.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register">
              <Button size="lg" variant="outline" className="border-white/40 bg-white text-brand hover:bg-white/90">
                Create an account
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="lg"
                variant="ghost"
                className="text-white hover:bg-white/15"
                icon={<ArrowRight className="size-4" />}
              >
                Try a demo account
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

/* ── Hero visual: mock leaderboard + timer ──────────────────────────────── */

const MOCK_ROWS = [
  { rank: 1, name: 'Aarav Mehta', cls: '10-A', score: 94.2, tone: 'bg-gold' },
  { rank: 2, name: 'Ishita Rao', cls: '10-A', score: 91.8, tone: 'bg-muted' },
  { rank: 3, name: 'Rohan Verma', cls: '9-B', score: 89.4, tone: 'bg-amber-600' },
  { rank: 4, name: 'Kabir Singh', cls: '10-B', score: 87.1, tone: 'bg-border' },
  { rank: 5, name: 'Ananya Das', cls: '9-A', score: 85.9, tone: 'bg-border' },
]

function HeroVisual() {
  return (
    <div className="relative">
      {/* Timer card */}
      <div className="absolute -top-6 -left-4 z-10 w-52 rounded-2xl border border-border bg-surface p-4 shadow-card sm:-left-8">
        <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted uppercase">
          <CalendarClock className="size-3" aria-hidden />
          Mock test
        </p>
        <p className="tabular mt-2 text-2xl font-black text-ink">38:24</p>
        <p className="mt-1 text-[11px] text-muted">Survives refresh &amp; tab switch</p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border">
          <span className="block h-full w-[62%] rounded-full bg-brand" />
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-surface p-5 shadow-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-gold" aria-hidden />
            <p className="text-sm font-bold text-ink">Top Students</p>
          </div>
          <span className="rounded-md bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">Weekly</span>
        </div>

        <ul className="mt-4 space-y-1.5">
          {MOCK_ROWS.map((row) => (
            <li
              key={row.rank}
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${row.rank === 4 ? 'bg-brand-soft' : ''}`}
            >
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-lg text-[11px] font-black text-white ${row.tone}`}
              >
                {row.rank}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold text-ink">
                  {row.name}
                  {row.rank === 4 && <span className="ml-1 text-brand">(you)</span>}
                </span>
                <span className="block text-[10px] text-muted">Class {row.cls}</span>
              </span>
              <span className="tabular text-xs font-extrabold text-brand">{row.score.toFixed(1)}%</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2.5">
          <Target className="size-3.5 shrink-0 text-brand" aria-hidden />
          <p className="text-[11px] leading-tight text-muted">
            <span className="font-bold text-ink-2">6.1 points</span> to overtake rank #3
          </p>
        </div>
      </div>

      {/* Progress card */}
      <div className="absolute -right-3 -bottom-6 w-48 rounded-2xl border border-border bg-surface p-4 shadow-card sm:-right-8">
        <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-muted uppercase">
          <BarChart3 className="size-3" aria-hidden />
          Subject mastery
        </p>
        <ul className="mt-2.5 space-y-2">
          {[
            ['Mathematics', 86, 'bg-brand'],
            ['Science', 72, 'bg-success'],
            ['English', 64, 'bg-warn'],
          ].map(([name, value, color]) => (
            <li key={name as string}>
              <div className="flex justify-between text-[10px]">
                <span className="truncate font-semibold text-ink-2">{name}</span>
                <span className="tabular font-bold text-muted">{value}%</span>
              </div>
              <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-border">
                <span className={`block h-full rounded-full ${color}`} style={{ width: `${value}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function LeaderboardMock() {
  return (
    <div className="relative rounded-3xl border border-border bg-bg p-6 shadow-card">
      <div className="flex items-center gap-2">
        <Trophy className="size-4 text-gold" aria-hidden />
        <p className="text-sm font-bold text-ink">Leaderboard — this week</p>
      </div>

      <ol className="mt-5 space-y-4">
        {MOCK_ROWS.map((row, i) => (
          <li key={row.rank} className="flex items-center gap-3">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-xl text-sm font-black text-white ${row.tone}`}
            >
              {row.rank}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-bold text-ink">{row.name}</span>
                <span className="tabular shrink-0 text-sm font-extrabold text-brand">
                  {row.score.toFixed(1)}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-brand to-accent"
                  style={{ width: `${row.score}%` }}
                />
              </div>
            </div>
            {i === 0 && <span className="shrink-0 text-lg">🏆</span>}
          </li>
        ))}
      </ol>

      <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5">
        {[
          { icon: ClipboardCheck, label: 'Every submit updates rank' },
          { icon: Handshake, label: 'Contributions count' },
          { icon: MessageCircleQuestion, label: 'Peer help rewarded' },
          { icon: Bell, label: 'Deadline reminders' },
        ].map((item) => (
          <p key={item.label} className="flex items-center gap-2 text-xs font-semibold text-muted">
            <item.icon className="size-3.5 shrink-0 text-brand" aria-hidden />
            {item.label}
          </p>
        ))}
      </div>
    </div>
  )
}