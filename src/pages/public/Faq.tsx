import { PageHeader } from '@/components/ui/Card'
import { Accordion } from '@/components/ui/Disclosure'
import { MessageCircleQuestion } from 'lucide-react'

const FAQS = [
  {
    q: 'Does CampusX work without Firebase?',
    a: 'Yes. Without Firebase credentials the app runs in demo mode, storing everything locally in your browser. Every feature — quizzes, mock tests, rankings, attendance — works, and nothing leaves your device.',
  },
  {
    q: 'How does the leaderboard decide ranks?',
    a: 'Scores are weighted: mock tests 32%, quiz average 30%, PYQ accuracy 22%, consistency 10%, plus up to 10% for contributions. Attendance is deliberately excluded so authorised absences never cost a rank.',
  },
  {
    q: 'What happens if I refresh during a mock test?',
    a: 'Nothing. The timer is anchored to an absolute deadline and your answers are checkpointed locally, so refreshing or switching tabs does not reset or extend your time.',
  },
  {
    q: 'Can teachers and administrators see everything?',
    a: 'Admins manage classes, subjects, people, content and rankings. Teachers manage content and attendance for their classes. Students only ever see their own results and the parts of the app intended for them.',
  },
  {
    q: 'Is my data safe?',
    a: 'In production, Firestore security rules enforce role and ownership checks on every read and write. In demo mode data stays local to your browser.',
  },
  {
    q: 'Can a school hide the leaderboard?',
    a: 'Yes. Administrators can switch rankings to private, in which case students see only their own rank and score without anyone else’s name.',
  },
]

export default function Faq() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <PageHeader
        title="Frequently asked questions"
        description="Quick answers about how CampusX works."
      />
      <div className="space-y-2">
        {FAQS.map((item, i) => (
          <Accordion
            key={item.q}
            title={item.q}
            defaultOpen={i === 0}
            badge={<span className="tabular text-xs font-bold text-muted">Q{i + 1}</span>}
          >
            <p className="text-sm leading-relaxed text-muted">{item.a}</p>
          </Accordion>
        ))}
      </div>
      <p className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted">
        <MessageCircleQuestion className="size-4" aria-hidden />
        Still stuck? Ask your class teacher or school admin.
      </p>
    </div>
  )
}