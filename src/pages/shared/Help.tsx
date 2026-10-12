import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Flame,
  GraduationCap,
  HelpCircle,
  Keyboard,
  LifeBuoy,
  Moon,
  Palette,
  ShieldCheck,
  Trophy,
} from 'lucide-react'

import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { PageHeader, SectionCard } from '@/components/ui/Card'
import { Accordion, Tabs } from '@/components/ui/Disclosure'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

interface Article {
  id: string
  title: string
  body: string
  roles: ('student' | 'teacher' | 'admin')[]
}

const ARTICLES: Article[] = [
  {
    id: 'getting-started',
    title: 'Getting started with CampusX',
    body: 'After you sign in you land on your dashboard. Students see today’s homework, notices, upcoming events and their leaderboard position. Teachers see classes to teach and papers awaiting moderation. Admins manage classes, subjects and school-wide settings. Every page is reachable from the sidebar, or from the search box in the top bar.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'materials',
    title: 'Finding and downloading study material',
    body: 'Open Study from the sidebar to browse subjects, chapters and materials. Use the type filter to narrow down notes, revision sheets, important questions or PYQ compilations. Every download counter helps your teacher see which resources students actually use, and materials contribute to your leaderboard points.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'homework',
    title: 'Submitting homework and assignments',
    body: 'Homework and assignment cards show the subject, marks and a deadline countdown. Open the task to read the instructions, then press Mark complete. Completed tasks show a green tick, and overdue tasks are highlighted in red. Teachers see a live completion count for each task they set.',
    roles: ['student', 'teacher'],
  },
  {
    id: 'mock-tests',
    title: 'Taking a mock test without losing progress',
    body: 'Mock tests are timed. The moment you press Start, CampusX stores an absolute deadline, so refreshing the page, switching tabs or closing the browser cannot hand back extra time. Your answers, marked-for-review questions and current position are saved continuously — reopen Tests and choose Resume to continue exactly where you stopped. If the timer runs out the test is submitted automatically and graded the same way as a manual submission.',
    roles: ['student'],
  },
  {
    id: 'quiz-vs-mock',
    title: 'The difference between quizzes, PYQs and mock tests',
    body: 'A quiz is a short fixed set of questions from your teacher, usually untimed or lightly timed. PYQ practice pulls previous-year board papers and gives instant explanations. A mock test mixes board PYQs with practice questions under real exam conditions. All three count toward your accuracy, but a mock test carries the most weight in the leaderboard.',
    roles: ['student'],
  },
  {
    id: 'leaderboard',
    title: 'How the leaderboard score works',
    body: 'Your total is a weighted mix: mock tests 32%, quizzes 30%, previous-year questions 22%, study consistency 10% and contributions to the school community 10%. Attendance is deliberately excluded so that missing a class never damages a student’s rank. Rankings can be viewed weekly, monthly or overall, and filtered by class, section and subject.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'contributions',
    title: 'Earning contribution points',
    body: 'CampusX rewards helping the school, not just collecting marks. You earn points for sharing study material, answering a classmate’s question on the peer-learning board, and reporting content accurately. Contributions are 10% of your leaderboard score, so a student who helps others can outrank a student who only scores well in exams.',
    roles: ['student'],
  },
  {
    id: 'peer-learning',
    title: 'Asking and answering questions',
    body: 'The peer board is for academic questions. Post a clear title and the exact part of the syllabus you are stuck on. Answers can be upvoted, and the asker can mark one as accepted. Teachers and admins can remove an answer that is not helpful. Everything you post is visible to teachers, so keep it academic.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'attendance',
    title: 'Checking your attendance',
    body: 'The Attendance page shows your overall percentage plus a month-by-month breakdown and your most recent class days. Attendance is recorded by your teacher and is kept separate from your leaderboard score, so it never affects your rank. If you believe a day was marked wrongly, ask your class teacher to re-mark it.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'notifications',
    title: 'Managing notifications',
    body: 'The bell icon in the top bar shows unread notifications for homework, new notices, events and deadline reminders. Open one to jump straight to the related page, or use Mark all read to clear the badge. Notifications are scoped to you — you never see another class’s messages.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'dark-mode',
    title: 'Dark mode and appearance',
    body: 'Use the sun/moon button in the top bar to switch between light and dark themes. CampusX remembers your choice on this device. Both themes use the same semantic colours, so charts, badges and status pills stay readable.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'shortcuts',
    title: 'Keyboard shortcuts',
    body: 'Press / to jump to the search box from anywhere. On a test, use the number keys or the question navigator to jump between questions, M marks a question for review, and Enter moves to the next question. Press Escape to close any dialog.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'create-material',
    title: 'Uploading material as a teacher',
    body: 'Go to Materials and press Add. Pick the subject, class and chapter, then choose a material type. Materials you upload are visible to students of that class immediately. Materials contributed by students are held for moderation until you approve them from the question queue.',
    roles: ['teacher', 'admin'],
  },
  {
    id: 'moderate',
    title: 'Moderating student contributions',
    body: 'Teachers and admins have a moderation queue for student-submitted materials and peer questions. Approving a contribution awards the student contribution points; rejecting it removes it from students. This keeps shared content trustworthy and is one of the easiest ways for staff to support the leaderboard.',
    roles: ['teacher', 'admin'],
  },
  {
    id: 'mark-attendance',
    title: 'Marking attendance for a class',
    body: 'Open Attendance, choose the class and the date, then set each student to present, absent, late or excused and save once. The save is a single batched write, so marking 60 students is one operation. Re-marking the same date replaces the earlier statuses instead of counting twice.',
    roles: ['teacher', 'admin'],
  },
  {
    id: 'manage-classes',
    title: 'Managing classes, subjects and staff',
    body: 'Admins create classes (for example Class 10-A), assign subjects and control which class levels teach each subject. Teachers can be assigned to subjects and classes from the Teachers page. These records drive what students see, so changes take effect immediately for the whole school.',
    roles: ['admin'],
  },
  {
    id: 'leaderboard-settings',
    title: 'Leaderboard privacy and snapshots',
    body: 'Admins control whether the leaderboard is public. With public mode off, students still see their own rank but other students’ names are hidden. Snapshots are materialised so rankings stay stable while a test is running; you can rebuild them from the leaderboard admin page after changing weights.',
    roles: ['admin'],
  },
  {
    id: 'demo-mode',
    title: 'Running CampusX without Firebase',
    body: 'If no Firebase configuration is present, CampusX runs in demo mode with a full local school: 120 students, materials, tasks, notices, events, questions, PYQs, mock tests, attendance and leaderboard snapshots. Everything is stored in your browser only. Sign in with the demo student, teacher or admin account to explore each role.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'privacy',
    title: 'Privacy and safety',
    body: 'CampusX only shows data for your own school. Teachers can see the classes they teach; students see their own results, attendance and rank. Firestore security rules are provided with the project and must be deployed before you use real student data. Never commit Firebase credentials or `.env` files to a public repository.',
    roles: ['student', 'teacher', 'admin'],
  },
  {
    id: 'bug',
    title: 'Reporting a problem',
    body: 'If something looks wrong, note the page you were on, what you clicked, and what you expected to happen, then tell your class teacher or the school admin. Screenshots help a lot. Demo-mode data lives only in your browser, so clearing site data resets the demo school to its seeded state.',
    roles: ['student', 'teacher', 'admin'],
  },
]

const SHORTCUTS = [
  { keys: ['/'], label: 'Focus global search' },
  { keys: ['M'], label: 'Mark question for review (in a test)' },
  { keys: ['1', '…', '9'], label: 'Jump to a question number' },
  { keys: ['Enter'], label: 'Next question' },
  { keys: ['Esc'], label: 'Close a dialog or sheet' },
]

export default function Help() {
  const { profile } = useAuth()
  const { theme, setTheme } = useTheme()
  const [tab, setTab] = useState<'guides' | 'shortcuts' | 'contact'>('guides')
  const [query, setQuery] = useState('')

  const role = profile?.role ?? 'student'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ARTICLES.filter((a) => a.roles.includes(role)).filter(
      (a) => !q || a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
    )
  }, [query, role])

  return (
    <div className="mx-auto w-full max-w-4xl">
      <PageHeader
        title="Help & guides"
        description="Everything you need to use CampusX, written for your role."
        action={
          <Button
            variant="secondary"
            size="sm"
            icon={theme === 'dark' ? <Palette className="size-4" /> : <Moon className="size-4" />}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </Button>
        }
      />

      <div className="mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles…"
          aria-label="Search help articles"
          className="max-w-sm"
        />
      </div>

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          items={[
            { value: 'guides', label: 'Guides', icon: <BookOpen className="size-4" />, count: filtered.length },
            { value: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="size-4" /> },
            { value: 'contact', label: 'Report a problem', icon: <LifeBuoy className="size-4" /> },
          ]}
        />
      </div>

      {tab === 'guides' && (
        <SectionCard flush>
          <div className="space-y-2 p-3">
            {filtered.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <HelpCircle className="mx-auto size-6 text-muted" aria-hidden />
                <p className="mt-2 text-sm font-semibold text-ink">No matching article</p>
                <p className="mt-1 text-xs text-muted">Try a shorter search term.</p>
              </div>
            ) : (
              filtered.map((a) => (
                <Accordion key={a.id} title={a.title} subtitle={`${a.body.split(/\s+/).length} words`}>
                  <p className="leading-relaxed">{a.body}</p>
                </Accordion>
              ))
            )}
          </div>
        </SectionCard>
      )}

      {tab === 'shortcuts' && (
        <SectionCard title="Keyboard shortcuts" icon={<Keyboard className="size-4" />}>
          <ul className="divide-y divide-border">
            {SHORTCUTS.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-4 py-2.5">
                <span className="text-sm text-ink-2">{s.label}</span>
                <span className="flex shrink-0 gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className={cn(
                        'rounded-md border border-border bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-semibold text-ink'
                      )}
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {tab === 'contact' && (
        <div className="space-y-4">
          <SectionCard title="Who to contact" icon={<LifeBuoy className="size-4" />}>
            <ul className="space-y-3 text-sm text-ink-2">
              <li className="flex gap-3">
                <GraduationCap className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>
                  <strong className="text-ink">Marks, ranks and materials</strong> — your class teacher. They can see your
                  quiz attempts and re-mark attendance.
                </span>
              </li>
              <li className="flex gap-3">
                <Trophy className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
                <span>
                  <strong className="text-ink">Leaderboard settings</strong> — the school admin. See{' '}
                  <Link to="/leaderboard" className="font-semibold text-brand hover:underline">
                    the leaderboard
                  </Link>{' '}
                  for your current standing.
                </span>
              </li>
              <li className="flex gap-3">
                <Bell className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
                <span>
                  <strong className="text-ink">Missed notifications</strong> — check{' '}
                  <Link to="/notifications" className="font-semibold text-brand hover:underline">
                    your notifications
                  </Link>
                  , then ask your teacher to resend.
                </span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                <span>
                  <strong className="text-ink">Privacy or safety concern</strong> — report it from the peer board or
                  lost &amp; found page; both are moderated by staff.
                </span>
              </li>
              <li className="flex gap-3">
                <Flame className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
                <span>
                  <strong className="text-ink">A technical problem</strong> — send the page URL, what you clicked, and what
                  you expected to happen.
                </span>
              </li>
            </ul>
          </SectionCard>

          <SectionCard title="Before you report" icon={<Badge tone="info" size="sm" />}>
            <p className="text-sm leading-relaxed text-ink-2">
              In demo mode all data lives only in this browser, so a bug report cannot include your data. Clearing site
              data restores the seeded demo school. Never include passwords or personal information in a report.
            </p>
          </SectionCard>
        </div>
      )}
    </div>
  )
}