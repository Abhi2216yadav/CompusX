import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from 'react-hot-toast'
import { ErrorState, LoadingState } from '@/components/ui/Feedback'
import type { Role } from '@/services/types'

/* ── Public ─────────────────────────────────────────────────────────────── */
const Landing = lazy(() => import('@/pages/public/Landing'))
const HowItWorks = lazy(() => import('@/pages/public/HowItWorks'))
const ForStudents = lazy(() => import('@/pages/public/ForStudents'))
const ForTeachers = lazy(() => import('@/pages/public/ForTeachers'))
const Faq = lazy(() => import('@/pages/public/Faq'))
const PublicLayout = lazy(() => import('@/layouts/PublicLayout'))

/* ── Auth ───────────────────────────────────────────────────────────────── */
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const Onboarding = lazy(() => import('@/pages/auth/Onboarding'))

/* ── Student ────────────────────────────────────────────────────────────── */
const StudentDashboard = lazy(() => import('@/pages/student/Dashboard'))
const StudyHub = lazy(() => import('@/pages/student/StudyHub'))
const SubjectPage = lazy(() => import('@/pages/student/SubjectPage'))
const MaterialPage = lazy(() => import('@/pages/student/MaterialPage'))
const HomeworkPage = lazy(() => import('@/pages/student/HomeworkPage'))
const AssignmentPage = lazy(() => import('@/pages/student/AssignmentPage'))
const NoticesPage = lazy(() => import('@/pages/student/NoticesPage'))
const EventsPage = lazy(() => import('@/pages/student/EventsPage'))
const QuizList = lazy(() => import('@/pages/student/QuizList'))
const QuizRunner = lazy(() => import('@/pages/student/QuizRunner'))
const QuizResult = lazy(() => import('@/pages/student/QuizResult'))
const PyqPractice = lazy(() => import('@/pages/student/PyqPractice'))
const PyqResult = lazy(() => import('@/pages/student/PyqResult'))
const MockTestList = lazy(() => import('@/pages/student/MockTestList'))
const MockTestIntro = lazy(() => import('@/pages/student/MockTestIntro'))
const MockTestRunner = lazy(() => import('@/pages/student/MockTestRunner'))
const MockTestResult = lazy(() => import('@/pages/student/MockTestResult'))
const Analytics = lazy(() => import('@/pages/student/Analytics'))
const Attendance = lazy(() => import('@/pages/student/Attendance'))
const LostFound = lazy(() => import('@/pages/student/LostFound'))
const PeerLearning = lazy(() => import('@/pages/student/PeerLearning'))
const Clubs = lazy(() => import('@/pages/student/Clubs'))
const Profile = lazy(() => import('@/pages/student/Profile'))
const NotificationsPage = lazy(() => import('@/pages/student/NotificationsPage'))
const HelpPage = lazy(() => import('@/pages/shared/Help'))

/* ── Leaderboard (feature 33) ───────────────────────────────────────────── */
const Leaderboard = lazy(() => import('@/pages/leaderboard/Leaderboard'))
const StudentProgress = lazy(() => import('@/pages/leaderboard/StudentProgress'))
const MyProgress = lazy(() => import('@/pages/leaderboard/MyProgress'))
const AdminLeaderboard = lazy(() => import('@/pages/admin/LeaderboardAdmin'))

/* ── Teacher ────────────────────────────────────────────────────────────── */
const TeacherDashboard = lazy(() => import('@/pages/teacher/Dashboard'))
const TeacherStudents = lazy(() => import('@/pages/teacher/Students'))
const TeacherMaterials = lazy(() => import('@/pages/teacher/Materials'))
const TeacherHomework = lazy(() => import('@/pages/teacher/Tasks'))
const TeacherNotices = lazy(() => import('@/pages/teacher/Notices'))
const TeacherEvents = lazy(() => import('@/pages/teacher/Events'))
const TeacherQuestions = lazy(() => import('@/pages/teacher/Questions'))
const TeacherPyqs = lazy(() => import('@/pages/teacher/Pyqs'))
const TeacherQuizzes = lazy(() => import('@/pages/teacher/Quizzes'))
const TeacherMockTests = lazy(() => import('@/pages/teacher/MockTests'))
const TeacherAttendance = lazy(() => import('@/pages/teacher/Attendance'))
const TeacherQuestionQueue = lazy(() => import('@/pages/teacher/QuestionQueue'))

/* ── Admin ──────────────────────────────────────────────────────────────── */
const AdminDashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminStudents = lazy(() => import('@/pages/admin/Students'))
const AdminTeachers = lazy(() => import('@/pages/admin/Teachers'))
const AdminClasses = lazy(() => import('@/pages/admin/Classes'))
const AdminSubjects = lazy(() => import('@/pages/admin/Subjects'))
const AdminMaterials = lazy(() => import('@/pages/admin/Materials'))
const AdminNotices = lazy(() => import('@/pages/admin/Notices'))
const AdminEvents = lazy(() => import('@/pages/admin/Events'))
const AdminClubs = lazy(() => import('@/pages/admin/Clubs'))
const AdminSettings = lazy(() => import('@/pages/admin/Settings'))
const AdminReports = lazy(() => import('@/pages/admin/Reports'))
const AdminAttendance = lazy(() => import('@/pages/admin/Attendance'))
const NotFound = lazy(() => import('@/pages/shared/NotFound'))

/* ── Guards ─────────────────────────────────────────────────────────────── */

function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 grid size-12 animate-pulse place-items-center rounded-2xl bg-brand text-lg font-black text-white">
          CX
        </div>
        <LoadingState label="Loading CampusX" rows={3} />
      </div>
    </div>
  )
}

function RequireAuth({ children, roles }: { children: ReactNode; roles?: Role[] }) {
  const { authUser, profile, loading, needsOnboarding } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />
  if (!authUser) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (needsOnboarding) return <Navigate to="/welcome" replace />
  if (roles && profile && !roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'teacher' ? '/teacher' : '/dashboard'} replace />
  }
  return <>{children}</>
}

function RequireGuest({ children }: { children: ReactNode }) {
  const { authUser, profile, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (authUser && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : profile.role === 'teacher' ? '/teacher' : '/dashboard'} replace />
  }
  return <>{children}</>
}

function ErrorBoundaryFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <ErrorState
        title="This page failed to load"
        message={error.message}
        onRetry={reset}
      />
    </div>
  )
}

/**
 * Root cause guard for the "blank white page after login" reports: a render
 * error or a failed lazy chunk load used to unmount the entire React tree with
 * nothing on screen. This boundary keeps a visible fallback (with retry) at the
 * app level and inside the student/teacher/admin shell.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error | null } {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[CampusX] page crashed', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  render() {
    if (this.state.error) return <ErrorBoundaryFallback error={this.state.error} reset={this.reset} />
    return this.props.children
  }
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <AppShell>
        <ErrorBoundary>
          <Suspense fallback={<LoadingState rows={5} />}>{children}</Suspense>
        </ErrorBoundary>
      </AppShell>
    </NotificationProvider>
  )
}

/* ── App ────────────────────────────────────────────────────────────────── */

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3200,
            style: {
              background: 'var(--cx-surface)',
              color: 'var(--cx-ink)',
              border: '1px solid var(--cx-border)',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: '600',
            },
            success: { iconTheme: { primary: 'var(--cx-success)', secondary: 'var(--cx-surface)' } },
            error: {
              iconTheme: { primary: 'var(--cx-danger)', secondary: 'var(--cx-surface)' },
              duration: 5000,
            },
          }}
        />

        <ErrorBoundary>
          <Routes>
          {/* Public marketing site */}
          <Route
            element={
              <Suspense fallback={<FullPageLoader />}>
                <PublicLayout />
              </Suspense>
            }
          >
            <Route index element={<Landing />} />
            <Route path="how-it-works" element={<HowItWorks />} />
            <Route path="for-students" element={<ForStudents />} />
            <Route path="for-teachers" element={<ForTeachers />} />
            <Route path="faq" element={<Faq />} />
          </Route>

          {/* Auth */}
          <Route
            path="/login"
            element={
              <RequireGuest>
                <Suspense fallback={<FullPageLoader />}>
                  <Login />
                </Suspense>
              </RequireGuest>
            }
          />
          <Route
            path="/register"
            element={
              <RequireGuest>
                <Suspense fallback={<FullPageLoader />}>
                  <Register />
                </Suspense>
              </RequireGuest>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <RequireGuest>
                <Suspense fallback={<FullPageLoader />}>
                  <ForgotPassword />
                </Suspense>
              </RequireGuest>
            }
          />
          <Route
            path="/welcome"
            element={
              <Suspense fallback={<FullPageLoader />}>
                <Onboarding />
              </Suspense>
            }
          />

          {/* Student */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth roles={['student']}>
                <Shell><StudentDashboard /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/study"
            element={
              <RequireAuth>
                <Shell><StudyHub /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/study/subject/:subjectId"
            element={
              <RequireAuth>
                <Shell><SubjectPage /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/study/material/:materialId"
            element={
              <RequireAuth>
                <Shell><MaterialPage /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/homework"
            element={
              <RequireAuth roles={['student']}>
                <Shell><HomeworkPage /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/assignments"
            element={
              <RequireAuth roles={['student']}>
                <Shell><AssignmentPage /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/notices"
            element={
              <RequireAuth>
                <Shell><NoticesPage /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/events"
            element={
              <RequireAuth>
                <Shell><EventsPage /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/quiz"
            element={
              <RequireAuth roles={['student']}>
                <Shell><QuizList /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/quiz/:quizId"
            element={
              <RequireAuth roles={['student']}>
                <Shell><QuizRunner /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/quiz/:quizId/result/:attemptId"
            element={
              <RequireAuth roles={['student']}>
                <Shell><QuizResult /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/pyq"
            element={
              <RequireAuth roles={['student']}>
                <Shell><PyqPractice /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/pyq/result/:attemptId"
            element={
              <RequireAuth roles={['student']}>
                <Shell><PyqResult /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/tests"
            element={
              <RequireAuth roles={['student']}>
                <Shell><MockTestList /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/tests/:testId"
            element={
              <RequireAuth roles={['student']}>
                <Shell><MockTestIntro /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/tests/:testId/run"
            element={
              <RequireAuth roles={['student']}>
                <Shell>
                  <Suspense fallback={<FullPageLoader />}>
                    <MockTestRunner />
                  </Suspense>
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/tests/:testId/result/:attemptId"
            element={
              <RequireAuth roles={['student']}>
                <Shell><MockTestResult /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/results"
            element={
              <RequireAuth roles={['student']}>
                <Shell><Analytics /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/attendance"
            element={
              <RequireAuth roles={['student']}>
                <Shell><Attendance /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/lost-found"
            element={
              <RequireAuth roles={['student']}>
                <Shell><LostFound /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/peer"
            element={
              <RequireAuth roles={['student']}>
                <Shell><PeerLearning /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/clubs"
            element={
              <RequireAuth roles={['student']}>
                <Shell><Clubs /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <Shell><Profile /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuth>
                <Shell><NotificationsPage /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/help"
            element={
              <RequireAuth>
                <Shell><HelpPage /></Shell>
              </RequireAuth>
            }
          />

          {/* Leaderboard (feature 33) */}
          <Route
            path="/leaderboard"
            element={
              <RequireAuth roles={['student', 'teacher', 'admin']}>
                <Shell><Leaderboard /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/leaderboard/student/:studentId"
            element={
              <RequireAuth roles={['student', 'teacher', 'admin']}>
                <Shell><StudentProgress /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/leaderboard/me"
            element={
              <RequireAuth roles={['student']}>
                <Shell><MyProgress /></Shell>
              </RequireAuth>
            }
          />

          {/* Teacher */}
          <Route
            path="/teacher"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherDashboard /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/students"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherStudents /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/materials"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherMaterials /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/homework"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherHomework kind="homework" /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/assignments"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherHomework kind="assignment" /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/notices"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherNotices /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/events"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherEvents /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/questions"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherQuestions /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/pyqs"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherPyqs /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/quizzes"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherQuizzes /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/mock-tests"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherMockTests /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/attendance"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherAttendance /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/teacher/questions-queue"
            element={
              <RequireAuth roles={['teacher', 'admin']}>
                <Shell><TeacherQuestionQueue /></Shell>
              </RequireAuth>
            }
          />

          {/* Admin */}
          <Route
            path="/admin"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminDashboard /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/students"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminStudents /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminTeachers /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/classes"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminClasses /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/subjects"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminSubjects /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/materials"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminMaterials /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/homework"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminNotices section="homework" /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/assignments"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminNotices section="assignments" /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/notices"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminNotices section="notices" /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/events"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminEvents /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/clubs"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminClubs /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/quizzes"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><TeacherQuizzes /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/mock-tests"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><TeacherMockTests /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/attendance"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminAttendance /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/leaderboard"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminLeaderboard /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminReports /></Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <RequireAuth roles={['admin']}>
                <Shell><AdminSettings /></Shell>
              </RequireAuth>
            }
          />

          <Route
            path="*"
            element={
              <Suspense fallback={<FullPageLoader />}>
                <NotFound />
              </Suspense>
            }
          />
        </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </ThemeProvider>
  )
}

export { ErrorBoundaryFallback }
