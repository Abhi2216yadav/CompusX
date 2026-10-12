import { Link } from 'react-router-dom'
import {
  BookOpen,
  Download,
  FileText,
  GraduationCap,
  Star,
  Video,
} from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import type { Material, Subject } from '@/services/types'
import { fileSize } from '@/utils/format'
import { relativeTime } from '@/utils/date'

const TYPE_ICON = {
  notes: FileText,
  pdf: FileText,
  important: Star,
  revision: BookOpen,
  pyq: GraduationCap,
  video: Video,
} as const

/** One material as a tappable card — used by the Study Hub and the dashboard. */
export function MaterialRow({ material, subject }: { material: Material; subject?: Subject }) {
  const Icon = TYPE_ICON[material.type] ?? FileText
  return (
    <li>
      <Link
        to={`/study/material/${material.id}`}
        className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand/35 hover:shadow-card"
      >
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: `${subject?.color ?? '#6366f1'}1a`, color: subject?.color ?? '#6366f1' }}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-bold text-ink">{material.title}</p>
            {material.type === 'important' && <Badge tone="gold">Important</Badge>}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {subject?.name ?? 'General'} · {material.fileName} · {fileSize(material.fileSize)}
          </p>
          <p className="mt-1 flex items-center gap-2 text-[10px] text-muted">
            <span>{material.uploadedByName}</span>
            <span>·</span>
            <span>{relativeTime(material.createdAt)}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5">
              <Download className="size-2.5" aria-hidden />
              {material.downloadCount}
            </span>
          </p>
        </div>
      </Link>
    </li>
  )
}
