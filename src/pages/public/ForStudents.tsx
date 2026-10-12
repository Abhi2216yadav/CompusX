import { Link } from 'react-router-dom'
import { Card, PageHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { BookOpen, FileQuestion, GraduationCap, Target, Trophy } from 'lucide-react'

const FEATURES = [
  { icon: BookOpen, title: 'Board PYQs', body: 'Previous-year questions by year, board and chapter — weighted above practice questions.' },
  { icon: FileQuestion, title: 'Chapter quizzes', body: 'Short focused tests with an explanation for every option, not just a score.' },
  { icon: GraduationCap, title: 'Timed mock tests', body: 'Real conditions with a strict deadline that survives refreshes.' },
  { icon: Target, title: 'Weak-chapter detection', body: 'See exactly which chapters to revise next, ranked by accuracy.' },
  { icon: Trophy, title: 'Fair ranking', body: 'Weighted on mock tests, quizzes, PYQs and consistency — never on attendance.' },
]

export default function ForStudents() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader
        title="For students"
        description="Everything you need to prepare, practise and see where you stand."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} interactive>
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
              <f.icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-3 text-base font-bold text-ink">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
          </Card>
        ))}
        <Card className="bg-gradient-to-br from-brand to-accent">
          <h3 className="text-base font-bold text-white">Start today</h3>
          <p className="mt-1.5 text-sm text-white/80">
            Create a free account or jump straight in with a demo student account.
          </p>
          <Link to="/login" className="mt-4 block">
            <Button variant="outline" fullWidth className="border-white/40 bg-white text-brand hover:bg-white/90">
              Sign in
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}