import NoticeManager from '@/components/content/NoticeManager'
import TaskManager from '@/components/content/TaskManager'

export default function AdminNotices({ section }: { section?: 'homework' | 'assignments' | 'notices' }) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      {section === 'homework' ? (
        <TaskManager kind="homework" scope="school" />
      ) : section === 'assignments' ? (
        <TaskManager kind="assignment" scope="school" />
      ) : (
        <NoticeManager scope="school" />
      )}
    </div>
  )
}