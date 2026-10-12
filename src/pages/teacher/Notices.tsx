import NoticeManager from '@/components/content/NoticeManager'

export default function TeacherNotices() {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <NoticeManager scope="mine" />
    </div>
  )
}