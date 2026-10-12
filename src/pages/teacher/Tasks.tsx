import TaskManager from '@/components/content/TaskManager'
import type { TaskKind } from '@/services/types'

/**
 * The router mounts this page for both `/teacher/homework` and
 * `/teacher/assignments`, passing the task kind it should manage.
 */
export default function TeacherTasks({ kind = 'homework' }: { kind?: TaskKind }) {
  return (
    <div className="mx-auto w-full max-w-6xl">
      <TaskManager kind={kind} />
    </div>
  )
}