import { Link } from 'react-router-dom'
import { Card, PageHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ClipboardCheck, FileQuestion, Library, Megaphone, ShieldCheck } from 'lucide-react'

const FEATURES = [
  { icon: Library, title: 'Publish material', body: 'Upload notes and PDFs once — every section of that class gets them instantly.' },
  { icon: FileQuestion, title: 'Build question banks', body: 'Create questions, PYQs, quizzes and full mock papers with explanations.' },
  { icon: ClipboardCheck, title: 'Mark attendance fast', body: 'Mark a whole class present/absent in a single pass with monthly history.' },
  { icon: Megaphone, title: 'Reach the right students', body: 'Post notices and homework to specific classes and sections.' },
  { icon: ShieldCheck, title: 'Moderate contributions', body: 'Approve student notes and answer student questions in the peer queue.' },
]

export default function ForTeachers() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <PageHeader
        title="For teachers"
        description="Spend less time on admin and more time on teaching."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} interactive>
            <span className="grid size-10 place-items-center rounded-xl bg-info-soft text-info">
              <f.icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-3 text-base font-bold text-ink">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
          </Card>
        ))}
        <Card className="bg-gradient-to-br from-info to-brand">
          <h3 className="text-base font-bold text-white">Explore the teacher view</h3>
          <p className="mt-1.5 text-sm text-white/80">
            Sign in with the demo teacher account to see the full content and attendance workflow.
          </p>
          <Link to="/login" className="mt-4 block">
            <Button variant="outline" fullWidth className="border-white/40 bg-white text-info hover:bg-white/90">
              Sign in
            </Button>
          </Link>
        </Card>
      </div>
    </div>
  )
}