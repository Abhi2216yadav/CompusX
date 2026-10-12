/**
 * Single source of truth for navigation. Sidebar, bottom nav, breadcrumbs and
 * the global search command palette all read from here.
 */
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Compass,
  FileQuestion,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutDashboard,
  Library,
  Medal,
  Megaphone,
  MessageCircleQuestion,
  Package,
  PenLine,
  Settings,
  Sparkles,
  Trophy,
  UserCog,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Role } from '@/services/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Shown in the mobile bottom bar (max 5). */
  mobile?: boolean
  end?: boolean
  badge?: 'new' | 'count'
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const STUDENT_NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: Home, mobile: true, end: true },
      { to: '/notices', label: 'Notices', icon: Megaphone },
      { to: '/events', label: 'Events', icon: CalendarDays },
    ],
  },
  {
    label: 'Learn',
    items: [
      { to: '/study', label: 'Study Hub', icon: Library, mobile: true },
      { to: '/homework', label: 'Homework', icon: ClipboardList },
      { to: '/assignments', label: 'Assignments', icon: PenLine },
    ],
  },
  {
    label: 'Practice',
    items: [
      { to: '/quiz', label: 'Quizzes', icon: FileQuestion, mobile: true },
      { to: '/pyq', label: 'PYQ Practice', icon: BookOpen },
      { to: '/tests', label: 'Mock Tests', icon: GraduationCap, mobile: true },
      { to: '/results', label: 'My Results', icon: BarChart3 },
    ],
  },
  {
    label: 'School',
    items: [
      { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
      { to: '/attendance', label: 'Attendance', icon: ClipboardList },
      { to: '/lost-found', label: 'Lost & Found', icon: Compass },
      { to: '/peer', label: 'Peer Learning', icon: MessageCircleQuestion },
      { to: '/clubs', label: 'Clubs', icon: Sparkles },
    ],
  },
]

export const TEACHER_NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/teacher/students', label: 'Students', icon: Users },
      { to: '/teacher/questions-queue', label: 'Student Questions', icon: MessageCircleQuestion },
    ],
  },
  {
    label: 'Content',
    items: [
      { to: '/teacher/materials', label: 'Study Materials', icon: Library },
      { to: '/teacher/homework', label: 'Homework', icon: ClipboardList },
      { to: '/teacher/assignments', label: 'Assignments', icon: PenLine },
      { to: '/teacher/notices', label: 'Notices', icon: Megaphone },
      { to: '/teacher/events', label: 'Events', icon: CalendarDays },
    ],
  },
  {
    label: 'Assess',
    items: [
      { to: '/teacher/questions', label: 'Questions', icon: FileQuestion },
      { to: '/teacher/pyqs', label: 'PYQs', icon: BookOpen },
      { to: '/teacher/quizzes', label: 'Quizzes', icon: GraduationCap },
      { to: '/teacher/mock-tests', label: 'Mock Tests', icon: PenLine },
      { to: '/teacher/attendance', label: 'Attendance', icon: ClipboardList },
    ],
  },
]

export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
      { to: '/admin/leaderboard', label: 'Leaderboard', icon: Trophy },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admin/students', label: 'Students', icon: Users },
      { to: '/admin/teachers', label: 'Teachers', icon: UserCog },
      { to: '/admin/classes', label: 'Classes', icon: GraduationCap },
      { to: '/admin/subjects', label: 'Subjects', icon: Library },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/admin/materials', label: 'Materials', icon: Package },
      { to: '/admin/homework', label: 'Homework', icon: ClipboardList },
      { to: '/admin/assignments', label: 'Assignments', icon: PenLine },
      { to: '/admin/notices', label: 'Notices', icon: Megaphone },
      { to: '/admin/events', label: 'Events', icon: CalendarDays },
      { to: '/admin/clubs', label: 'Clubs', icon: Sparkles },
      { to: '/admin/quizzes', label: 'Quizzes', icon: FileQuestion },
      { to: '/admin/mock-tests', label: 'Mock Tests', icon: GraduationCap },
      { to: '/admin/attendance', label: 'Attendance', icon: ClipboardList },
    ],
  },
  {
    label: 'Platform',
    items: [{ to: '/admin/settings', label: 'Settings', icon: Settings }],
  },
]

export function navForRole(role: Role | null): NavGroup[] {
  if (role === 'teacher') return TEACHER_NAV
  if (role === 'admin') return ADMIN_NAV
  return STUDENT_NAV
}

/** Fixed mobile bottom bar — Home, Study, Quiz, Tests, Profile. */
export const MOBILE_TABS: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: Home, mobile: true, end: true },
  { to: '/study', label: 'Study', icon: Library, mobile: true },
  { to: '/quiz', label: 'Quiz', icon: FileQuestion, mobile: true },
  { to: '/tests', label: 'Tests', icon: GraduationCap, mobile: true },
  { to: '/profile', label: 'Profile', icon: Users, mobile: true },
]

export const HELP_LINKS = [
  { to: '/help', label: 'Help & FAQ', icon: HelpCircle },
  { to: '/leaderboard', label: 'How ranking works', icon: Medal },
]
