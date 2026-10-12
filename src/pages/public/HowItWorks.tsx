import { Card, PageHeader } from '@/components/ui/Card'
import { CheckCircle2, GraduationCap, Library, Trophy } from 'lucide-react'

const STEPS = [
  {
    icon: Library,
    title: 'Find your content',
    body: 'Your teachers upload notes, PDFs and revision sheets by subject and chapter in the Study Hub.',
  },
  {
    icon: GraduationCap,
    title: 'Practise with purpose',
    body: 'Do chapter quizzes, board PYQs and timed mock tests. Every answer shows the explanation.',
  },
  {
    icon: Trophy,
    title: 'Track your progress',
    body: 'Watch your subject mastery, weak chapters, consistency and exact rank on the leaderboard.',
  },
]

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader
        title="How CampusX works"
        description="A simple, predictable workflow for students, teachers and administrators."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Card key={step.title} interactive>
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-brand text-white">
                <step.icon className="size-5" aria-hidden />
              </span>
              <div>
                <p className="text-sm font-bold text-muted uppercase">Step {i + 1}</p>
                <h3 className="text-base font-bold text-ink">{step.title}</h3>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted">{step.body}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-bold text-ink">What makes it different</h2>
        <ul className="mt-3 space-y-2">
          {[
            'Mock test timers are absolute — refreshing or switching tabs does not add time.',
            'The leaderboard weights performance and consistency, and never includes attendance.',
            'Materialised snapshots give you your exact rank in under a second.',
            'Role-based permissions mean students can only submit their own work.',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}