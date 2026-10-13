/**
 * CampusX demo seed — ABC Public School.
 *
 * Everything is generated deterministically from fixed seeds so the demo looks
 * identical on every machine and the leaderboard is genuinely derived from the
 * seeded attempts (via the same `ranking` code path the live app uses).
 *
 * All documents are clearly flagged `isDemo: true` / titled "Demo".
 */
import type {
  AttendanceRecord,
  Chapter,
  ClassRoom,
  Club,
  Contribution,
  LostFoundPost,
  Material,
  MaterialType,
  MockTest,
  Notice,
  NoticeCategory,
  NoticePriority,
  PeerQuestion,
  Pyq,
  Question,
  Quiz,
  School,
  SchoolEvent,
  Subject,
  Task,
  TestAttempt,
  UserProfile,
} from '@/services/types'
import { CHAPTER_META, QUIZ_QUESTIONS, PYQ_QUESTIONS, SUBJECT_META } from './questionBank'
import { buildRoster, type RosterStudent } from './roster'
import {
  buildSnapshot,
  periodKeyFor,
  replayAttempts,
  RANKING,
  type MetricsSeed,
} from '@/services/ranking'
import { COLLECTIONS } from '@/services/db'
import { monthKey, weekKey } from '@/utils/date'
import { stableId } from '@/utils/id'

const SCHOOL_ID = 'school-abc'
const ACADEMIC_YEAR = '2026-27'
const TEACHER_ID = 'u-teacher'
const TEACHER_NAME = 'Meera Iyer'
const ADMIN_ID = 'u-admin'
const ADMIN_NAME = 'Rajesh Kumar'

export const DEMO_ACCOUNTS = {
  student: { email: 'abhay@abcpubschool.edu.in', password: 'student123', name: 'Abhay Mishra' },
  teacher: { email: 'meera@abcpubschool.edu.in', password: 'teacher123', name: TEACHER_NAME },
  admin: { email: 'admin@abcpubschool.edu.in', password: 'admin123', name: ADMIN_NAME },
}

/* ── Deterministic randomness ───────────────────────────────────────────── */

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: string) {
  let a = hashSeed(seed)
  return () => {
    a += 0x6d2b79f5
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length) % xs.length]
const between = (r: () => number, min: number, max: number) => min + r() * (max - min)
const intBetween = (r: () => number, min: number, max: number) => Math.floor(between(r, min, max + 1))
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

const DAY = 86_400_000
const NOW = Date.now()

/* ── Static building blocks ─────────────────────────────────────────────── */

const CLASS_LEVELS = [6, 7, 8, 9, 10]
const SECTIONS = ['A', 'B']

const CHAPTER_NAMES: Record<string, string[]> = {
  'sub-math': ['Knowing Our Numbers', 'Playing with Numbers', 'Whole Numbers', 'Basic Geometrical Ideas', 'Understanding Elementary Shapes', 'Integers', 'Fractions', 'Decimals', 'Data Handling', 'Mensuration', 'Algebra', 'Ratio and Proportion', 'Lines and Angles', 'Triangles', 'Quadrilaterals', 'Circles', 'Constructions', 'Symmetry', 'Visualising Solid Shapes'],
  'sub-sci': ['Food: Where Does It Come From', 'Components of Food', 'Fibres and Fabrics', 'Sorting Materials into Groups', 'Separation of Substances', 'Changes Around Us', 'Living Organisms and Their Surroundings', 'Motion and Measurement of Distances', 'Method of Measurement in Science', 'Light: Reflection and Refraction', 'Human Eye and Colourful World', 'Electricity and Circuits', 'Magnetic Effects of Electric Current', 'Chemical Reactions and Equations', 'Acids, Bases and Salts', 'Periodic Classification of Elements', 'Carbon and its Compounds', 'Life Processes', 'Control and Coordination', 'How do Organisms Reproduce?', 'Heredity'],
  'sub-eng': ['A Happy Child', 'Three Questions', 'A Letter to God', 'From the Diary of Anne Frank', 'Glory of India', 'Mijbil the Otter', 'The Fun with Fiction', 'Poems', 'The Third Level', 'A Triumph of Surgery', 'The Thief\u2019s Story', 'The Midnight Visitor', 'My Childhood', 'Footprints without Feet', 'The Making of a Scientist', 'The Necklace', 'Bholi', 'The Book That Saved the Earth'],
  'sub-com': ['Introduction to Computers', 'Computer Hardware', 'Computer Software', 'Using the Keyboard', 'Word Processing', 'Introduction to Internet', 'Emailing', 'Web Browsers', 'Spreadsheets', 'Introduction to HTML', 'Cyber Safety', 'Python Programming'],
  'sub-soc': ['The Rise of Nationalism in Europe', 'Nationalism in India', 'The Making of a Global World', 'The Age of Industrialisation', 'Print Culture and the Modern World', 'Resources and Development', 'Forest and Wildlife Resources', 'Water Resources', 'Agriculture', 'Minerals and Energy Resources', 'Power Sharing', 'Federalism', 'Gender, Religion and Caste', 'Democracy and Diversity', 'Markets Around Us', 'Development', 'Sectors of the Indian Economy', 'Globalisation and the Indian Economy', 'Political Parties', 'Outcomes of Democracy'],
}

const CHAPTER_SUMMARIES: Record<string, string> = {
  math: 'Key ideas, worked examples and board-style questions.',
  sci: 'Concepts explained with diagrams and exam-focused detail.',
  eng: 'Extract-based questions, vocabulary and writing skills.',
  com: 'Practical hands-on tasks with step-by-step guidance.',
  soc: 'Timeline, key terms and frequently asked questions.',
}

const MATERIAL_TITLES: [string, MaterialType][] = [
  ['Complete Notes — Real Numbers', 'notes'],
  ['Formula Sheet — Coordinate Geometry', 'revision'],
  ['Important Questions — Quadratic Equations', 'important'],
  ['Practice Worksheet — Trigonometry', 'pdf'],
  ['Chapter Summary — Triangles', 'notes'],
  ['Solved PYQ Set — Statistics (2020–2025)', 'pyq'],
  ['Quick Revision — Polynomials', 'revision'],
  ['Numerical Practice — Mensuration', 'pdf'],
  ['Mind Map — Pair of Linear Equations', 'notes'],
  ['Important Questions — Chemical Reactions', 'important'],
  ['Lab Activity Guide — Acids, Bases and Salts', 'pdf'],
  ['Quick Revision — Periodic Classification', 'revision'],
  ['Diagram Sheet — Light: Reflection and Refraction', 'pdf'],
  ['Practice Problems — Electricity', 'important'],
  ['Chapter Notes — Control and Coordination', 'notes'],
  ['Extract Comprehension — A Letter to God', 'pdf'],
  ['Grammar Workbook — Tenses and Modals', 'pdf'],
  ['Vocabulary List — Supplementary Reader', 'revision'],
  ['HTML Cheat Sheet — Tags and Attributes', 'revision'],
  ['Python Practice Problems — Loops', 'important'],
  ['Question Bank — Heredity and Evolution', 'important'],
  ['Solved PYQ Set — Light and Electricity (2021–2025)', 'pyq'],
  ['Numerical Practice — Surface Area and Volume', 'pdf'],
  ['Case Study — Why Leaves Change Colour', 'notes'],
  ['Formula Sheet — Chemical Equations and Reactions', 'revision'],
  ['Assertion–Reason Practice — Biology', 'important'],
  ['Comprehension Practice — Supplementary Reader', 'pdf'],
  ['Worksheet — Data Handling with Spreadsheets', 'revision'],
  ['Problem Solving with Python — Strings and Lists', 'important'],
  ['Worksheet — Resources and Development', 'pdf'],
  ['Map Reading — Passes of the Western Ghats', 'notes'],
  ['Mind Map — Freedom Struggle Timeline', 'revision'],
  ['Exam Strategy — How to Attempt a 3-Mark Question', 'video'],
]

const HOMEWORK_TITLES: [string, string, string][] = [
  ['Exercise 3.1 — Questions 1 to 8', 'ch-math-quad', 'Solve the given quadratic equations and verify your answers.'],
  ['Spelling Dictation — Lesson 4', 'ch-eng-grammar', 'Learn the word list and write each word five times in your notebook.'],
  ['Diagram Lab — Convex and Concave Mirrors', 'ch-sci-light', 'Draw ray diagrams for four situations and label them correctly.'],
  ['HTML Practice — Build a Bio Page', 'ch-com-html', 'Create a personal web page using headings, paragraphs and one image.'],
  ['Map Work — Major Rivers of India', 'ch-soc-geo', 'Mark five rivers and two dams on the outline map of India.'],
  ['Worksheet — Similarity Criteria', 'ch-math-tri', 'Prove the given triangles are similar using the appropriate criterion.'],
  ['Read and Summarise — The Thief\u2019s Story', 'ch-eng-reader', 'Write a 150-word summary and list five new words with meanings.'],
  ['Chemical Equations — Balancing Practice', 'ch-sci-chem', 'Balance the ten given equations and state the reaction type for each.'],
  ['Python Loop Exercises', 'ch-com-python', 'Write programs for the five loop problems given in class.'],
  ['Timeline Activity — Nationalism in India', 'ch-soc-hist', 'Create a timeline of five major movements with dates and one-line notes.'],
  ['Statistics Data Collection', 'ch-math-stat', 'Collect the heights of 30 classmates and calculate mean, median and mode.'],
  ['Letter Writing — Formal Letter', 'ch-eng-letter', 'Write a formal letter to the Principal requesting a leave of absence.'],
]

const ASSIGNMENT_TITLES: [string, string, string][] = [
  ['Case Study Project — Garbage In, Garbage Out', 'ch-soc-geo', 'Investigate waste management in your locality and submit a 500-word report with a diagram.'],
  ['Investigatory Project — Water Quality Testing', 'ch-sci-acid', 'Test the pH of three water samples at home and document your observations.'],
  ['Practical File — Chemical Reactions', 'ch-sci-chem', 'Perform four reactions at home, record observations and write balanced equations.'],
  ['Data Handling Project — Class Survey', 'ch-math-stat', 'Survey your class on one topic and present a bar graph with conclusions.'],
  ['Creative Writing Portfolio', 'ch-eng-fiction', 'Write two original pieces of 250 words each in different genres.'],
  ['Web Page Portfolio', 'ch-com-html', 'Build a three-page website on a topic of your choice with working navigation.'],
  ['Historical Profile Presentation', 'ch-soc-hist', 'Prepare a 10-slide presentation on one leader of the freedom struggle.'],
  ['Mathematical Reasoning Workbook', 'ch-math-linear', 'Complete all exercises on linear equations and submit your workings.'],
]

const NOTICE_SEED: [string, string, NoticeCategory, NoticePriority, number][] = [
  ['Unit Test I — Timetable Released', 'The first unit test for Classes 6 to 10 begins next Monday. The detailed date-wise timetable is available on the notice board and in your Study Hub. Revise Chapters 1 to 4 of each subject.', 'exam', 'important', 1],
  ['Independence Day Holiday', 'The school will remain closed on 15 August 2026. Regular classes resume the following working day.', 'holiday', 'normal', 2],
  ['Science Exhibition — Register Now', 'The annual Science Exhibition is on 22 August in the main hall. Teams of three may register with their science teacher before 10 August. This activity contributes towards your participation points.', 'competition', 'important', 3],
  ['Library Week Circular', 'The library will host a reading competition and an open-shelf day from 18 to 22 August. Students who submit a book review receive participation credit.', 'circular', 'normal', 4],
  ['Fee Payment Deadline', 'The second-term fee deadline is 25 August 2026. Parents may pay online or at the school office during working hours.', 'deadline', 'important', 5],
  ['Inter-House Athletics Meet', 'Athletics trials for the inter-house meet will be held during the last week of August. Report to the ground in sportswear.', 'class', 'normal', 6],
  ['Annual Health Check-up', 'A free health check-up camp will be conducted in the school infirmary on 28 August. Students should carry their health records.', 'circular', 'normal', 7],
  ['Coding Club Recruitment', 'The Coding Club is recruiting members for Classes 8 to 10. No prior experience is required. Apply through your club page on CampusX.', 'competition', 'normal', 8],
  ['Parent–Teacher Meeting Schedule', 'PTM for Classes 6 to 8 is scheduled for 30 August and Classes 9 to 10 for 31 August. Slots are bookable through the school office.', 'circular', 'important', 9],
  ['Revised Bus Routes — Urgent', 'Due to roadworks on the east route, buses 4 and 7 will temporarily pick up from the main gate from 1 September. Timings are unchanged.', 'circular', 'urgent', 0],
  ['Unit Test II Syllabus Published', 'The Unit Test II syllabus for all subjects is now available in your Study Hub. It covers the chapters listed for the second half of the term.', 'exam', 'important', 10],
  ['Sports Meet Trials — Final List', 'The final list of athletes selected for the inter-house meet has been put up outside the Physical Education department. Report to the ground by 6:30 AM.', 'class', 'normal', 11],
  ['Library Fine Waiver Day', 'Outstanding library fines up to ₹100 will be waived if a book review of 200 words is submitted before 5 September.', 'circular', 'normal', 12],
  ['Annual Day Theme Announced', 'This year\'s Annual Day theme is "Knowledge Across Cultures". Script and prop deadlines for the Cultural Committee are 12 September.', 'competition', 'important', 13],
  ['Winter Uniform From 5 October', 'Students must be in full winter uniform from 5 October. The school will hold a second-hand uniform sale on 26 September in the main hall.', 'circular', 'normal', 14],
]

const EVENT_SEED: [string, string, SchoolEvent['category'], string, string, number][] = [
  ['Independence Day Ceremony', 'Flag hoisting, march past and cultural performances by the students of Classes 6 to 10.', 'cultural', 'Main Ground', 'Culture Department', 14],
  ['Annual Science Exhibition', 'Working models and posters on themes from Physics, Chemistry and Biology.', 'science', 'Exhibition Hall', 'Science Department', 21],
  ['Inter-House Debate Competition', 'Inter-school debate on "Education for All" with teams of two speakers.', 'competition', 'Seminar Hall', 'English Department', 26],
  ['Coding Workshop — Intro to Python', 'A hands-on beginner workshop covering variables, loops and functions.', 'technology', 'Computer Lab 2', 'Coding Club', 11],
  ['Inter-House Athletics Meet', 'Track and field events for junior and senior categories.', 'sports', 'Main Ground', 'Physical Education Dept.', 29],
  ['Cyber Safety Awareness Session', 'An interactive session on passwords, privacy and safe browsing.', 'technology', 'Assembly Hall', 'Computer Department', 7],
  ['Literary Fest — "Echoes"', 'Poetry recitation, essay writing and story-telling competitions.', 'cultural', 'Auditorium', 'Literary Club', 18],
  ['Hockey Team Selection Trials', 'Selection trials for the school hockey team.', 'sports', 'Hockey Ground', 'Physical Education Dept.', 24],
  ['Entrepreneurship Workshop', 'A workshop on turning an idea into a small business plan.', 'workshop', 'Seminar Hall', 'Commerce Club', 15],
  ['Mathematics Challenge Week', 'A week of quizzes, puzzles and a final inter-class mathematics tournament.', 'quiz', 'Computer Lab 1', 'Mathematics Department', 12],
]

const CLUB_SEED: [string, string, string, string][] = [
  ['Science Club', 'Hands-on experiments, research projects and participation in the annual science exhibition.', 'Atom', '#0f9d58'],
  ['Coding Club', 'Python, web development and problem solving. Weekly beginner and advanced sessions.', 'Code2', '#ea580c'],
  ['Sports Club', 'Training in athletics, football, basketball and hockey, with inter-house and inter-school fixtures.', 'Trophy', '#0369a1'],
  ['Art Club', 'Drawing, painting, craft and poster design for school exhibitions.', 'Palette', '#9333ea'],
  ['Literary Club', 'Debates, poetry, storytelling and the annual literary festival.', 'BookOpen', '#db2777'],
]

const LOST_FOUND_SEED: [LostFoundPost['type'], string, string, string, number][] = [
  ['lost', 'Blue water bottle', 'Steel bottle with a sticker of a cartoon car. Left it on the study table after lunch.', 'Library, 2nd floor', 1],
  ['found', 'House keys on a red tag', 'Found near the basketball court. Kept with the peon at the gate.', 'Main gate', 1],
  ['lost', 'Science calculator', 'Casio scientific calculator in a transparent pouch with my name written on tape.', 'Lab 3', 2],
  ['found', 'Black umbrella', 'Left on a bench after the rain. Has a wooden handle.', 'Canteen', 3],
  ['lost', 'Football size 4', 'Nivia ball, slightly worn, kept in a cloth bag.', 'Ground, west side', 4],
  ['found', 'Earphones with a case', 'White earphones inside a grey case. Charging cable also inside.', 'Bus no. 6', 5],
  ['lost', 'Geometry box', 'Standard 3D geometry box with a loose lid latch.', 'Class 9-A', 6],
  ['found', 'ID card', 'Found near the library entrance. Please collect with an identity check.', 'Library entrance', 7],
]

const PEER_SEED: [PeerQuestion['category'], string, string, number, number][] = [
  ['Mathematics', 'How do I understand quadratic equations with no real roots?', 'I keep getting a negative discriminant in the textbook. Can someone show what that actually means geometrically, and how should I answer it in the exam?', 4, 2],
  ['Science', 'Newton\u2019s third law — what is the reaction force exactly?', 'When I push the wall, the wall pushes back. But the wall is not a living thing. What produces that reaction force?', 4, 3],
  ['Computer', 'Why does Python complain about indentation?', 'My code looks correct but I keep getting IndentationError. I am using spaces in some lines and tabs in others. How does Python decide?', 4, 1],
  ['English', 'How do I identify the speaker in a poem?', 'In "The Lake Isle" I cannot tell whether the poet is speaking to himself or describing someone else. Is there a technique?', 4, 2],
  ['Mathematics', 'When should I use the substitution method instead of elimination?', 'My teacher showed both for linear equations. When is one clearly better than the other?', 4, 0],
  ['Science', 'Difference between a strong acid and a concentrated acid', 'Everyone says strong acid means concentrated. My teacher said they are different. Can someone explain?', 4, 1],
]

/* ── Builder ────────────────────────────────────────────────────────────── */

export function buildSeed(): Record<string, unknown[]> {
  const school: School = {
    id: SCHOOL_ID,
    name: 'ABC Public School',
    code: 'ABCPS',
    address: '12 Nehru Marg, Model Town',
    city: 'Delhi',
    email: 'office@abcpubschool.edu.in',
    phone: '+91 11 4000 1200',
    currentAcademicYear: ACADEMIC_YEAR,
    leaderboardPublic: true,
    peerLearningEnabled: true,
    createdAt: NOW - 400 * DAY,
  }

  const classes: ClassRoom[] = []
  for (const level of CLASS_LEVELS) {
    for (const section of SECTIONS) {
      classes.push({
        id: `cls-${level}-${section}`,
        schoolId: SCHOOL_ID,
        name: `Class ${level}`,
        classLevel: level,
        section,
        academicYear: ACADEMIC_YEAR,
        homeroomTeacherId: TEACHER_ID,
        studentCount: 12,
        createdAt: NOW - 400 * DAY,
      })
    }
  }

  const subjects: Subject[] = SUBJECT_META.map((s) => ({
    id: s.id,
    schoolId: SCHOOL_ID,
    name: s.name,
    code: s.code,
    color: s.color,
    classLevels: [...CLASS_LEVELS],
    description: CHAPTER_SUMMARIES[s.id.replace('sub-', '')] ?? 'Core subject.',
    createdAt: NOW - 400 * DAY,
  }))

  // Chapter 1 = the authored demo chapter; the rest mirror the textbook order.
  const chapters: Chapter[] = CHAPTER_META.map((c, i) => ({
    id: c.id,
    schoolId: SCHOOL_ID,
    subjectId: c.subjectId,
    classLevel: c.classLevel,
    name: c.name,
    order: i + 1,
    summary: c.summary,
    createdAt: NOW - 400 * DAY,
  }))
  for (const subject of subjects) {
    const names = CHAPTER_NAMES[subject.id] ?? []
    names.forEach((name, i) => {
      chapters.push({
        id: `ch-${subject.id}-${i + 1}`,
        schoolId: SCHOOL_ID,
        subjectId: subject.id,
        classLevel: 10,
        name,
        order: i + 1,
        summary: CHAPTER_SUMMARIES[subject.id.replace('sub-', '')],
        createdAt: NOW - 400 * DAY,
      })
    })
  }

  const roster = buildRoster()
  const students: UserProfile[] = roster.map((s) => ({
    id: s.id,
    schoolId: SCHOOL_ID,
    role: 'student',
    name: s.name,
    email: s.email,
    photoUrl: undefined,
    academicYear: ACADEMIC_YEAR,
    classId: s.classId,
    classLevel: s.classLevel,
    section: s.section,
    rollNo: s.rollNo,
    isActive: true,
    isDemo: true,
    createdAt: NOW - 200 * DAY,
    updatedAt: NOW - Math.floor(between(rng(s.id), 0, 6)) * DAY,
  }))

  const teachers: UserProfile[] = [
    {
      id: TEACHER_ID,
      schoolId: SCHOOL_ID,
      role: 'teacher',
      name: TEACHER_NAME,
      email: DEMO_ACCOUNTS.teacher.email,
      academicYear: ACADEMIC_YEAR,
      teacherId: 'TCH-2026-0001',
      subjects: ['sub-math', 'sub-sci'],
      classIds: ['cls-9-A', 'cls-9-B', 'cls-10-A', 'cls-10-B'],
      designation: 'Senior Mathematics Teacher',
      qualification: 'M.Sc. Mathematics, B.Ed.',
      joiningDate: '2021-06-01',
      phone: '+91 98765 43210',
      bio: 'Teaches Classes 9 and 10. Runs the Mathematics Challenge Week.',
      isActive: true,
      isDemo: true,
      createdAt: NOW - 400 * DAY,
      updatedAt: NOW - 2 * DAY,
    },
    {
      id: 'u-anita',
      schoolId: SCHOOL_ID,
      role: 'teacher',
      name: 'Anita Desai',
      email: 'anita@abcpubschool.edu.in',
      academicYear: ACADEMIC_YEAR,
      teacherId: 'TCH-2026-0002',
      subjects: ['sub-eng', 'sub-soc'],
      classIds: ['cls-10-A', 'cls-10-B'],
      designation: 'English & Social Science Teacher',
      qualification: 'M.A. English, B.Ed.',
      joiningDate: '2019-04-10',
      isActive: true,
      isDemo: true,
      createdAt: NOW - 400 * DAY,
      updatedAt: NOW - 5 * DAY,
    },
    {
      id: 'u-vikram',
      schoolId: SCHOOL_ID,
      role: 'teacher',
      name: 'Vikram Shetty',
      email: 'vikram@abcpubschool.edu.in',
      academicYear: ACADEMIC_YEAR,
      teacherId: 'TCH-2026-0003',
      subjects: ['sub-com'],
      classIds: ['cls-9-A', 'cls-9-B', 'cls-10-A', 'cls-10-B'],
      designation: 'Computer Science Teacher',
      qualification: 'B.Tech., B.Ed.',
      joiningDate: '2022-07-15',
      isActive: true,
      isDemo: true,
      createdAt: NOW - 380 * DAY,
      updatedAt: NOW - 4 * DAY,
    },
  ]

  const admin: UserProfile = {
    id: ADMIN_ID,
    schoolId: SCHOOL_ID,
    role: 'admin',
    name: ADMIN_NAME,
    email: DEMO_ACCOUNTS.admin.email,
    academicYear: ACADEMIC_YEAR,
    designation: 'Principal',
    isActive: true,
    isDemo: true,
    createdAt: NOW - 500 * DAY,
    updatedAt: NOW,
  }

  const users = [admin, ...teachers, ...students]

  /* ── Questions, PYQs, quizzes, mock tests ─────────────────────────────── */

  const { questions, pyqs } = buildSeedQuestions(QUIZ_QUESTIONS, PYQ_QUESTIONS)

  const quizzes: Quiz[] = [
    {
      id: 'quiz-math-quad', schoolId: SCHOOL_ID, title: 'Quadratic Equations — Quick Check',
      description: 'Ten questions covering standard form, factorisation and the discriminant.',
      subjectId: 'sub-math', chapterId: 'ch-math-quad', classLevel: 10, academicYear: ACADEMIC_YEAR,
      difficulty: 'mixed', questionCount: 10, questionIds: questions.filter((q) => q.chapterId === 'ch-math-quad').map((q) => q.id),
      timeLimitSec: 600, marksPerQuestion: 1, isPublished: true, allowRetry: true,
      createdBy: TEACHER_ID, createdByName: TEACHER_NAME, createdAt: NOW - 30 * DAY,
    },
    {
      id: 'quiz-sci-chem', schoolId: SCHOOL_ID, title: 'Chemical Reactions — Chapter Quiz',
      description: 'Balancing, types of reactions and everyday examples.',
      subjectId: 'sub-sci', chapterId: 'ch-sci-chem', classLevel: 10, academicYear: ACADEMIC_YEAR,
      difficulty: 'mixed', questionCount: 10, questionIds: questions.filter((q) => q.chapterId === 'ch-sci-chem').map((q) => q.id),
      timeLimitSec: 600, marksPerQuestion: 1, isPublished: true, allowRetry: true,
      createdBy: TEACHER_ID, createdByName: TEACHER_NAME, createdAt: NOW - 25 * DAY,
    },
    {
      id: 'quiz-eng-grammar', schoolId: SCHOOL_ID, title: 'Grammar Skills — Tenses & Modals',
      description: 'Ten questions on verb forms, modals and voice.',
      subjectId: 'sub-eng', chapterId: 'ch-eng-grammar', classLevel: 10, academicYear: ACADEMIC_YEAR,
      difficulty: 'medium', questionCount: 10, questionIds: questions.filter((q) => q.chapterId === 'ch-eng-grammar').map((q) => q.id),
      timeLimitSec: 720, marksPerQuestion: 1, isPublished: true, allowRetry: true,
      createdBy: 'u-anita', createdByName: 'Anita Desai', createdAt: NOW - 20 * DAY,
    },
    {
      id: 'quiz-com-python', schoolId: SCHOOL_ID, title: 'Python Loops — Practice Quiz',
      description: 'range(), for and while loops.',
      subjectId: 'sub-com', chapterId: 'ch-com-python', classLevel: 10, academicYear: ACADEMIC_YEAR,
      difficulty: 'easy', questionCount: 10, questionIds: questions.filter((q) => q.chapterId === 'ch-com-python').map((q) => q.id),
      timeLimitSec: 600, marksPerQuestion: 1, isPublished: true, allowRetry: true,
      createdBy: 'u-vikram', createdByName: 'Vikram Shetty', createdAt: NOW - 15 * DAY,
    },
    {
      id: 'quiz-sci-light', schoolId: SCHOOL_ID, title: 'Light — Reflection & Refraction',
      description: 'Mirror formula, lens formula and power of a lens.',
      subjectId: 'sub-sci', chapterId: 'ch-sci-light', classLevel: 10, academicYear: ACADEMIC_YEAR,
      difficulty: 'medium', questionCount: 8, questionIds: questions.filter((q) => q.chapterId === 'ch-sci-light').map((q) => q.id),
      timeLimitSec: 480, marksPerQuestion: 1, isPublished: true, allowRetry: true,
      createdBy: TEACHER_ID, createdByName: TEACHER_NAME, createdAt: NOW - 9 * DAY,
    },
  ]

  const mockTests: MockTest[] = [
    {
      id: 'mock-math-full', schoolId: SCHOOL_ID,
      title: 'CBSE Class 10 Mathematics — Full Syllabus Mock',
      description: 'A full-length paper mixing board PYQs with fresh practice questions.',
      instructions: [
        'The test is 30 questions for 30 marks in 30 minutes.',
        'Every question carries equal marks; there is no negative marking.',
        'You may mark questions for review and revisit them before submitting.',
        'The paper auto-submits when the timer reaches zero.',
        'Keep this tab open — your progress is saved if the page reloads.',
      ],
      subjectId: 'sub-math', classLevel: 10, academicYear: ACADEMIC_YEAR,
      pyqCount: 18, practiceCount: 12, totalMarks: 30, durationMin: 30,
      isPublished: true, allowRetry: true,
      createdBy: TEACHER_ID, createdByName: TEACHER_NAME, createdAt: NOW - 12 * DAY,
    },
    {
      id: 'mock-sci-full', schoolId: SCHOOL_ID,
      title: 'Class 10 Science Mock Test 1',
      description: 'Chemistry, Physics and Biology in one paper.',
      instructions: [
        '25 questions, 25 marks, 25 minutes.',
        'No negative marking.',
        'The paper submits automatically at zero.',
      ],
      subjectId: 'sub-sci', classLevel: 10, academicYear: ACADEMIC_YEAR,
      pyqCount: 16, practiceCount: 9, totalMarks: 25, durationMin: 25,
      isPublished: true, allowRetry: true,
      createdBy: TEACHER_ID, createdByName: TEACHER_NAME, createdAt: NOW - 8 * DAY,
    },
    {
      id: 'mock-eng-full', schoolId: SCHOOL_ID,
      title: 'Class 10 English Language Mock',
      description: 'Grammar, comprehension and writing skills.',
      instructions: [
        '20 questions, 20 marks, 20 minutes.',
        'No negative marking.',
        'The paper submits automatically at zero.',
      ],
      subjectId: 'sub-eng', classLevel: 10, academicYear: ACADEMIC_YEAR,
      pyqCount: 12, practiceCount: 8, totalMarks: 20, durationMin: 20,
      isPublished: true, allowRetry: true,
      createdBy: 'u-anita', createdByName: 'Anita Desai', createdAt: NOW - 5 * DAY,
    },
    {
      id: 'mock-soc-full', schoolId: SCHOOL_ID,
      title: 'Class 10 Social Science Mock',
      description: 'History, Geography, Civics and Economics in one paper.',
      instructions: [
        '20 questions, 20 marks, 20 minutes.',
        'No negative marking.',
        'Mark questions for review and submit before the timer ends.',
        'The paper auto-submits at zero.',
      ],
      subjectId: 'sub-soc', classLevel: 10, academicYear: ACADEMIC_YEAR,
      pyqCount: 13, practiceCount: 7, totalMarks: 20, durationMin: 20,
      isPublished: true, allowRetry: true,
      createdBy: 'u-anita', createdByName: 'Anita Desai', createdAt: NOW - 3 * DAY,
    },
    {
      id: 'mock-com-full', schoolId: SCHOOL_ID,
      title: 'Class 10 Computer Science Mock',
      description: 'Python, HTML, networking and cyber safety.',
      instructions: [
        '15 questions, 15 marks, 15 minutes.',
        'No negative marking.',
        'The paper auto-submits at zero.',
      ],
      subjectId: 'sub-com', classLevel: 10, academicYear: ACADEMIC_YEAR,
      pyqCount: 9, practiceCount: 6, totalMarks: 15, durationMin: 15,
      isPublished: true, allowRetry: true,
      createdBy: 'u-vikram', createdByName: 'Vikram Shetty', createdAt: NOW - 2 * DAY,
    },
  ]

  /* ── Attempts, contributions, metrics, snapshots ──────────────────────── */

  const { attempts, contributions } = buildActivity(roster, questions, pyqs, quizzes, mockTests)
  const metrics = roster.map((s) =>
    replayAttempts(
      {
        id: s.id,
        schoolId: SCHOOL_ID,
        studentId: s.id,
        studentName: s.name,
        classId: s.classId,
        classLevel: s.classLevel,
        classLabel: `${s.classLevel}-${s.section}`,
        section: s.section,
        rollNo: s.rollNo,
        academicYear: ACADEMIC_YEAR,
      } satisfies MetricsSeed,
      attempts.filter((a) => a.studentId === s.id),
      contributions.filter((c) => c.studentId === s.id)
    )
  )

  const entries = metrics.map((m) => ({
    rank: 0,
    studentId: m.studentId,
    studentName: m.studentName,
    photoUrl: m.photoUrl,
    classLabel: m.classLabel,
    classLevel: m.classLevel,
    section: m.section,
    overallScore: m.periods.all.overallScore,
    progressPercentage: m.periods.all.progressPercentage,
    quizAverage: m.periods.all.quizAverage,
    pyqAccuracy: m.periods.all.pyqAccuracy,
    mockTestAverage: m.periods.all.mockTestAverage,
    testsAttempted: m.periods.all.testsAttempted,
    questionsAttempted: m.periods.all.questionsAttempted,
    questionsCorrect: m.periods.all.questionsCorrect,
    consistency: m.periods.all.consistency,
    contributionPoints: m.periods.all.contributionPoints,
    activityPoints: m.periods.all.activityPoints,
    band: 'steady' as const,
  }))

  const snapshots = [buildSnapshot({
    id: stableId(SCHOOL_ID, ACADEMIC_YEAR, 'overall', 'all', 'all', 'all'),
    schoolId: SCHOOL_ID,
    filters: { period: 'overall', academicYear: ACADEMIC_YEAR, classId: 'all', section: 'all', subjectId: 'all' },
    entries,
    generatedBy: 'system',
    generation: 1,
  })]

  /* ── Remaining content ────────────────────────────────────────────────── */

  const materials: Material[] = MATERIAL_TITLES.map(([title, type], i) => {
    const r = rng(`mat-${i}`)
    const subject = SUBJECT_META[i % SUBJECT_META.length]
    const authoredChapter = CHAPTER_META.filter((c) => c.subjectId === subject.id)
    const chapter = authoredChapter[i % authoredChapter.length]
    const byStudent = i % 7 === 3
    const author = byStudent ? students[(i * 11) % students.length] : teachers[i % teachers.length]
    return {
      id: `mat-${i + 1}`,
      schoolId: SCHOOL_ID,
      subjectId: subject.id,
      chapterId: chapter.id,
      classLevel: 10,
      academicYear: ACADEMIC_YEAR,
      title,
      description: `${type === 'pdf' ? 'Downloadable PDF' : 'Curated notes'} covering ${chapter.name}. Demo resource for the ${subject.name} course.`,
      type,
      fileUrl: `#demo/${type}/${slug(title)}.${type === 'video' ? 'mp4' : 'pdf'}`,
      fileName: `${slug(title)}.pdf`,
      fileSize: intBetween(r, 180_000, 4_200_000),
      uploadedBy: author.id,
      uploadedByName: author.name,
      isStudentContribution: byStudent,
      isApproved: true,
      downloadCount: intBetween(r, 3, 180),
      tags: [chapter.name.toLowerCase().replace(/\s+/g, '-'), subject.code.toLowerCase(), 'demo'],
      createdAt: NOW - intBetween(r, 2, 90) * DAY,
    }
  })

  const homework: Task[] = HOMEWORK_TITLES.map(([title, chapterId, description], i) => {
    const chapter = chapters.find((c) => c.id === chapterId)!
    const teacher = teachers.find((t) => t.subjects?.includes(chapter.subjectId)) ?? teachers[0]
    const dueOffset = i < 6 ? intBetween(rng(`hw-${i}`), -3, 5) : intBetween(rng(`hw-${i}`), 6, 14)
    return {
      id: `hw-${i + 1}`,
      schoolId: SCHOOL_ID,
      kind: 'homework',
      subjectId: chapter.subjectId,
      classLevel: 10,
      academicYear: ACADEMIC_YEAR,
      title,
      description,
      teacherId: teacher.id,
      teacherName: teacher.name,
      assignedAt: NOW - intBetween(rng(`hw-a-${i}`), 1, 5) * DAY,
      dueAt: NOW + dueOffset * DAY,
      maxMarks: 10,
      completedBy: i < 6 ? students.slice(0, intBetween(rng(`hw-c-${i}`), 3, 11)).map((s) => s.id) : [],
      createdAt: NOW - intBetween(rng(`hw-c2-${i}`), 1, 5) * DAY,
    }
  })

  const assignments: Task[] = ASSIGNMENT_TITLES.map(([title, chapterId, description], i) => {
    const chapter = chapters.find((c) => c.id === chapterId)!
    const teacher = teachers.find((t) => t.subjects?.includes(chapter.subjectId)) ?? teachers[0]
    return {
      id: `as-${i + 1}`,
      schoolId: SCHOOL_ID,
      kind: 'assignment',
      subjectId: chapter.subjectId,
      classLevel: 10,
      academicYear: ACADEMIC_YEAR,
      title,
      description,
      teacherId: teacher.id,
      teacherName: teacher.name,
      assignedAt: NOW - intBetween(rng(`as-${i}`), 2, 12) * DAY,
      dueAt: NOW + intBetween(rng(`as-${i}`), 3, 21) * DAY,
      maxMarks: 25,
      completedBy: students.slice(0, intBetween(rng(`as-c-${i}`), 1, 6)).map((s) => s.id),
      createdAt: NOW - intBetween(rng(`as-${i}`), 2, 12) * DAY,
    }
  })

  const notices: Notice[] = NOTICE_SEED.map(([title, body, category, priority, dayOffset], i) => ({
    id: `notice-${i + 1}`,
    schoolId: SCHOOL_ID,
    title,
    body,
    category,
    priority,
    authorId: i % 3 === 0 ? ADMIN_ID : teachers[i % teachers.length].id,
    authorName: i % 3 === 0 ? ADMIN_NAME : teachers[i % teachers.length].name,
    targetClassLevels: priority === 'urgent' ? [10] : [],
    targetSections: [],
    pinned: priority === 'urgent' || i === 0,
    publishAt: NOW - dayOffset * DAY,
    createdAt: NOW - dayOffset * DAY,
  }))

  const events: SchoolEvent[] = EVENT_SEED.map(([name, description, category, venue, organiser, dayOffset], i) => {
    const r = rng(`ev-${i}`)
    const starts = NOW + dayOffset * DAY
    return {
      id: `event-${i + 1}`,
      schoolId: SCHOOL_ID,
      name,
      description,
      category,
      startsAt: starts,
      endsAt: starts + intBetween(r, 2, 5) * 3_600_000,
      venue,
      organiserId: teachers[i % teachers.length].id,
      organiserName: organiser,
      registrationDeadline: starts - 2 * DAY,
      classLevels: [10],
      capacity: intBetween(r, 30, 120),
      attendeeIds: students.slice(0, intBetween(r, 4, 16)).map((s) => s.id),
      createdAt: NOW - intBetween(r, 3, 30) * DAY,
    }
  })

  const clubs: Club[] = CLUB_SEED.map(([name, description, icon, color], i) => ({
    id: `club-${i + 1}`,
    schoolId: SCHOOL_ID,
    name,
    description,
    icon,
    color,
    coordinatorId: teachers[i % teachers.length].id,
    coordinatorName: teachers[i % teachers.length].name,
    memberIds: students.filter((_, idx) => (idx + i) % 9 === 0).map((s) => s.id),
    announcements: [
      {
        id: `ann-${i}-1`,
        body: `Practice session this week in the activity room. Bring your notebooks and any project work in progress.`,
        authorName: teachers[i % teachers.length].name,
        createdAt: NOW - intBetween(rng(`cl-${i}`), 1, 6) * DAY,
      },
    ],
    activities: [
      'Weekly practice sessions',
      'Annual school competition',
      'Peer mentoring circle',
    ],
    gallery: [],
    createdAt: NOW - 200 * DAY,
  }))

  const lostFound: LostFoundPost[] = LOST_FOUND_SEED.map(([type, itemName, description, location, dayOffset], i) => {
    const poster = students[(i * 13) % students.length]
    return {
      id: `lf-${i + 1}`,
      schoolId: SCHOOL_ID,
      type,
      itemName,
      description,
      location,
      lostDate: type === 'lost' ? new Date(NOW - dayOffset * DAY).toISOString().slice(0, 10) : undefined,
      contactName: poster.name,
      contactMethod: `${poster.email} · Class ${poster.classLevel}-${poster.section}`,
      postedBy: poster.id,
      postedByName: poster.name,
      classLevel: poster.classLevel!,
      status: i === 7 ? 'resolved' : 'open',
      moderatedBy: TEACHER_ID,
      moderatedAt: NOW - dayOffset * DAY,
      createdAt: NOW - dayOffset * DAY,
    }
  })

  const studentQuestions: PeerQuestion[] = PEER_SEED.map(([category, title, body, upvotes, answerCount], i) => {
    const author = students[(i * 17 + 4) % students.length]
    const answerAuthors = [students[(i * 5 + 9) % students.length], teachers[i % teachers.length]]
    return {
      id: `pq-${i + 1}`,
      schoolId: SCHOOL_ID,
      category,
      title,
      body,
      authorId: author.id,
      authorName: author.name,
      classLevel: author.classLevel!,
      isResolved: i % 2 === 0,
      upvotes: students.slice(0, upvotes).map((s) => s.id),
      answers: Array.from({ length: answerCount }, (_, j) => {
        const ansAuthor = answerAuthors[j % answerAuthors.length]
        return {
          id: `pq-${i + 1}-a-${j}`,
          body:
            j === 0
              ? 'Start with the definition in the chapter, then work one full example slowly. Write the formula on a sticky note next to your desk — most confusion clears up after two solved examples.'
              : 'A good way to remember it: the concept is introduced in the textbook chapter, summarised in the revision notes in the Study Hub, and checked in the chapter quiz. Do all three in order.',
          authorId: ansAuthor.id,
          authorName: ansAuthor.name,
          isAccepted: i % 2 === 0 && j === 0,
          upvotes: students.slice(0, Math.max(0, upvotes - j * 2)).map((s) => s.id),
          isRemoved: false,
          createdAt: NOW - (dayAgo(3 + i + j)) * DAY,
        }
      }),
      reports: [],
      createdAt: NOW - dayAgo(2 + i) * DAY,
    }
  })

  const attendance = roster.map((s) => buildAttendance(s, SCHOOL_ID))

  const notifications = buildNotifications(students, teachers, SCHOOL_ID, attendance)

  return {
    [COLLECTIONS.schools]: [school],
    [COLLECTIONS.classes]: classes,
    [COLLECTIONS.subjects]: subjects,
    [COLLECTIONS.chapters]: chapters,
    [COLLECTIONS.users]: users,
    [COLLECTIONS.questions]: questions,
    [COLLECTIONS.pyqs]: pyqs,
    [COLLECTIONS.quizzes]: quizzes,
    [COLLECTIONS.mockTests]: mockTests,
    [COLLECTIONS.materials]: materials,
    [COLLECTIONS.homework]: homework,
    [COLLECTIONS.assignments]: assignments,
    [COLLECTIONS.notices]: notices,
    [COLLECTIONS.events]: events,
    [COLLECTIONS.clubs]: clubs,
    [COLLECTIONS.lostFound]: lostFound,
    [COLLECTIONS.studentQuestions]: studentQuestions,
    [COLLECTIONS.testAttempts]: attempts,
    [COLLECTIONS.contributions]: contributions,
    [COLLECTIONS.studentMetrics]: metrics,
    [COLLECTIONS.leaderboardSnapshots]: snapshots,
    [COLLECTIONS.attendance]: attendance,
    [COLLECTIONS.notifications]: notifications,
  }
}

/* ── Activity generator ─────────────────────────────────────────────────── */

function dayAgo(days: number): number {
  return NOW - days * DAY
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildSeedQuestions(quizQB: typeof QUIZ_QUESTIONS, pyqQB: typeof PYQ_QUESTIONS) {
  const questions: Question[] = quizQB.map((q, i) => ({
    id: `q-${i + 1}`,
    schoolId: SCHOOL_ID,
    subjectId: q.s,
    chapterId: q.c,
    classLevel: 10,
    academicYear: ACADEMIC_YEAR,
    question: q.q,
    options: q.o,
    correctIndex: q.a,
    explanation: q.e,
    marks: q.m ?? 1,
    type: q.t,
    difficulty: q.d,
    tags: ['demo'],
    createdBy: TEACHER_ID,
    createdByName: TEACHER_NAME,
    isActive: true,
    createdAt: NOW - (60 - i) * DAY,
  }))

  const pyqs: Pyq[] = pyqQB.map((q, i) => ({
    id: `pyq-${i + 1}`,
    schoolId: SCHOOL_ID,
    subjectId: q.s,
    chapterId: q.c,
    classLevel: 10,
    question: q.q,
    options: q.o,
    correctIndex: q.a,
    explanation: q.e,
    marks: q.m ?? 1,
    examName: q.ex ?? 'Board Exam',
    board: q.b,
    year: q.y ?? 2024,
    type: q.t,
    difficulty: q.d,
    tags: ['demo', String(q.y ?? 2024)],
    createdBy: TEACHER_ID,
    isActive: true,
    createdAt: NOW - (60 - i) * DAY,
  }))

  return { questions, pyqs }
}

function buildActivity(
  roster: RosterStudent[],
  questions: Question[],
  pyqs: Pyq[],
  quizzes: Quiz[],
  mockTests: MockTest[]
): { attempts: TestAttempt[]; contributions: Contribution[] } {
  const attempts: TestAttempt[] = []
  const contributions: Contribution[] = []
  const subjectName: Record<string, string> = Object.fromEntries(
    SUBJECT_META.map((s) => [s.id, s.name])
  )

  for (const student of roster) {
    const r = rng(`act-${student.id}`)
    const ability = clamp(student.ability, 12, 98)

    // Quiz attempts: 3-6 over the last 60 days, at least one this week.
    const quizCount = intBetween(r, 3, 6)
    for (let i = 0; i < quizCount; i += 1) {
      const quiz = pick(r, quizzes)
      const pool = questions.filter(
        (q) => q.subjectId === quiz.subjectId && (quiz.questionIds.length === 0 || quiz.questionIds.includes(q.id))
      )
      if (pool.length === 0) continue
      const size = Math.min(quiz.questionCount, pool.length)
      void shuffle(r, pool).slice(0, size)
      const daysAgo = i === 0 ? intBetween(r, 0, 3) : intBetween(r, 4, 58)
      attempts.push(
        makeAttempt({
          r, student, kind: 'quiz', refId: quiz.id, refTitle: quiz.title,
          subjectId: quiz.subjectId, subjectName: subjectName[quiz.subjectId],
          chapterId: quiz.chapterId, size, ability,
          at: dayAgo(daysAgo), marksPerQuestion: quiz.marksPerQuestion,
        })
      )
    }

    // PYQ practice: 2-5 sessions.
    const pyqCount = intBetween(r, 2, 5)
    for (let i = 0; i < pyqCount; i += 1) {
      const pool = pyqs.filter((q) => q.subjectId === pick(r, ['sub-math', 'sub-sci', 'sub-eng', 'sub-soc']))
      if (pool.length === 0) continue
      const size = intBetween(r, 10, 20)
      const selected = shuffle(r, pool).slice(0, Math.min(size, pool.length))
      const daysAgo = intBetween(r, 1, 62)
      attempts.push(
        makeAttempt({
          r, student, kind: 'pyq', refId: 'pyq-practice',
          refTitle: 'PYQ Practice Session',
          subjectId: selected[0].subjectId, subjectName: subjectName[selected[0].subjectId],
          chapterId: selected[0].chapterId, size: selected.length, ability,
          at: dayAgo(daysAgo), marksPerQuestion: 1,
        })
      )
    }

    // Mock tests: 1-3, the most recent one within the last week.
    const mockCount = intBetween(r, 1, 3)
    for (let i = 0; i < mockCount; i += 1) {
      const mock = pick(r, mockTests)
      const daysAgo = i === 0 ? intBetween(r, 1, 6) : intBetween(r, 8, 55)
      const subjectPools = questions.filter((q) => q.subjectId === mock.subjectId)
      const total = 30
      const pyqPool = pyqs.filter((q) => q.subjectId === mock.subjectId)
      const selected = [
        ...shuffle(r, pyqPool).slice(0, Math.min(mock.pyqCount, pyqPool.length)),
        ...shuffle(r, subjectPools).slice(0, Math.min(mock.practiceCount, subjectPools.length)),
      ]
      attempts.push(
        makeAttempt({
          r, student, kind: 'mock', refId: mock.id, refTitle: mock.title,
          subjectId: mock.subjectId, subjectName: subjectName[mock.subjectId],
          chapterId: selected[0]?.chapterId, size: Math.max(1, Math.min(total, selected.length)),
          ability, at: dayAgo(daysAgo), marksPerQuestion: 1,
        })
      )
    }

    // Contributions — mostly practice, a few genuine contributions.
    const contributionCount = intBetween(r, 0, 6)
    for (let i = 0; i < contributionCount; i += 1) {
      const kinds = ['quiz', 'pyq', 'mock', 'event', 'peerHelp', 'material', 'club'] as const
      const kind = pick(r, kinds)
      const points = {
        material: 25, peerHelp: 12, quiz: 4, pyq: 3, mock: 8, event: 20, club: 10,
      }[kind]
      contributions.push({
        id: `con-${student.id}-${i}`,
        schoolId: SCHOOL_ID,
        studentId: student.id,
        studentName: student.name,
        kind,
        points,
        description:
          kind === 'material'
            ? 'Uploaded an approved revision handout'
            : kind === 'peerHelp'
              ? 'Answer accepted by a classmate'
              : kind === 'event'
                ? 'Participated in a school event'
                : kind === 'club'
                  ? 'Attended club activities'
                  : 'Consistent practice recorded',
        approvedBy: TEACHER_ID,
        createdAt: dayAgo(intBetween(r, 0, 60)),
      })
    }
  }

  return { attempts, contributions }
}

function shuffle<T>(r: () => number, xs: T[]): T[] {
  const copy = [...xs]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function makeAttempt(params: {
  r: () => number
  student: RosterStudent
  kind: TestAttempt['kind']
  refId: string
  refTitle: string
  subjectId: string
  subjectName: string
  chapterId?: string
  size: number
  ability: number
  at: number
  marksPerQuestion: number
}): TestAttempt {
  const { r, student, kind, at } = params
  const size = params.size
  // Ability maps to per-question correctness with a small personal bias.
  const bias = between(r, -0.05, 0.05)
  const answers: Record<string, number> = {}
  const results: TestAttempt['results'] = []
  let correct = 0

  for (let i = 0; i < size; i += 1) {
    const qid = `${kind}-${student.id}-${at}-${i}`
    const isCorrect = r() < clamp(params.ability / 100 + bias, 0.05, 0.99)
    if (isCorrect) correct += 1
    const correctIndex = isCorrect ? 0 : 1
    answers[qid] = isCorrect ? correctIndex : 1
    results.push({
      questionId: qid,
      chosen: isCorrect ? 0 : 1,
      correct: correctIndex,
      isCorrect,
      timeSpentSec: intBetween(r, 8, 55),
    })
  }

  const wrong = size - correct
  const timeSpent = Math.round(size * between(r, 22, 48))

  return {
    id: `att-${student.id}-${kind}-${at}`,
    schoolId: SCHOOL_ID,
    studentId: student.id,
    studentName: student.name,
    classId: student.classId,
    classLevel: student.classLevel,
    section: student.section,
    academicYear: ACADEMIC_YEAR,
    kind,
    refId: params.refId,
    refTitle: params.refTitle,
    subjectId: params.subjectId,
    subjectName: params.subjectName,
    chapterId: params.chapterId,
    period: at >= dayAgo(7) ? weekKey(at) : at >= dayAgo(31) ? monthKey(at) : `w${Math.floor(at / (7 * DAY))}`,
    startedAt: at - timeSpent * 1000,
    submittedAt: at,
    timeSpentSec: timeSpent,
    answers,
    results,
    totalQuestions: size,
    correctCount: correct,
    wrongCount: wrong,
    unattemptedCount: 0,
    totalMarks: size * params.marksPerQuestion,
    scoredMarks: correct * params.marksPerQuestion,
    percentage: Math.round((correct / size) * 1000) / 10,
    autoSubmitted: false,
  }
}

function buildAttendance(
  student: RosterStudent,
  schoolId: string
): AttendanceRecord {
  const r = rng(`att-${student.id}`)
  // Attendance correlates with ability but stays independent of ranking.
  const attendPct = clamp(between(r, 0.72, 0.99), 0, 1)
  const monthly: AttendanceRecord['monthly'] = {}
  const recent: AttendanceRecord['recent'] = []
  let total = 0
  let present = 0
  let absent = 0
  let late = 0
  let excused = 0

  for (let monthsBack = 2; monthsBack >= 0; monthsBack -= 1) {
    const base = new Date(NOW)
    base.setMonth(base.getMonth() - monthsBack, 1)
    const key = monthKey(base)
    const days = monthsBack === 0 ? 14 : 20
    const bucket = { total: 0, present: 0, absent: 0, late: 0, excused: 0 }
    for (let d = 1; d <= days; d += 1) {
      const date = new Date(base.getFullYear(), base.getMonth(), d)
      if (date.getDay() === 0 || date.getDay() === 6) continue
      if (date.getTime() > NOW) break
      const roll = r()
      let status: AttendanceRecord['recent'][number]['status'] = 'present'
      if (roll > attendPct + 0.06) status = 'absent'
      else if (roll > attendPct) status = 'late'
      else if (roll > attendPct - 0.012) status = 'excused'
      bucket.total += 1
      bucket[status] += 1
      total += 1
      present += status === 'present' ? 1 : 0
      absent += status === 'absent' ? 1 : 0
      late += status === 'late' ? 1 : 0
      excused += status === 'excused' ? 1 : 0
      if (monthsBack === 0) {
        recent.push({ date: date.toISOString().slice(0, 10), status })
      }
    }
    monthly[key] = bucket
  }

  return {
    id: student.id,
    schoolId,
    studentId: student.id,
    classId: student.classId,
    classLevel: student.classLevel,
    section: student.section,
    monthly,
    recent: recent.slice(-25),
    totalClasses: total,
    present,
    absent,
    late,
    excused,
    percentage: total ? Math.round(((present + late) / total) * 1000) / 10 : 0,
    updatedAt: NOW - intBetween(r, 0, 2) * DAY,
  }
}

function buildNotifications(
  students: UserProfile[],
  teachers: UserProfile[],
  schoolId: string,
  attendance: AttendanceRecord[]
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const demoStudent = students.find((s) => s.id === 'u-abhay') ?? students[0]

  const push = (
    audience: 'user' | 'role',
    role: string | undefined,
    userId: string | undefined,
    type: string,
    title: string,
    body: string,
    link: string,
    dayOffset: number
  ) => {
    out.push({
      id: `ntf-${out.length + 1}`,
      audience,
      role,
      userId,
      schoolId,
      type,
      title,
      body,
      link,
      readBy: dayOffset > 1 ? [userId ?? 'u-abhay'] : [],
      createdAt: dayAgo(dayOffset),
    })
  }

  push('user', undefined, demoStudent.id, 'homework', 'New homework: Quadratic Equations',
    'Meera Iyer posted Exercise 3.1 — due in 2 days.', '/homework', 0)
  push('user', undefined, demoStudent.id, 'testResult', 'Your mock test result is ready',
    'You scored 86% in the Class 10 Mathematics mock. Review the questions you missed.', '/results', 1)
  push('user', undefined, demoStudent.id, 'material', 'New study material: Trigonometry',
    'Meera Iyer uploaded "Formula Sheet — Coordinate Geometry".', '/study', 1)
  push('user', undefined, demoStudent.id, 'deadline', 'Assignment due tomorrow',
    '"Map Work — Major Rivers of India" is due tomorrow.', '/assignments', 1)
  push('user', undefined, demoStudent.id, 'notice', 'Revised Bus Routes — Urgent',
    'Buses 4 and 7 will temporarily pick up from the main gate.', '/notices', 2)
  push('user', undefined, demoStudent.id, 'event', 'Science Exhibition — register now',
    'Teams of three may register before 10 August.', '/events', 3)
  push('role', 'student', undefined, 'notice', 'Unit Test I — Timetable Released',
    'The first unit test for Classes 6 to 10 begins next Monday.', '/notices', 2)
  push('role', 'teacher', undefined, 'system', '5 student questions need moderation',
    'Review the peer learning queue for your subject.', '/teacher/questions', 1)
  push('role', 'admin', undefined, 'system', 'Attendance updated for 10-A',
    'Attendance for the current month has been marked.', '/admin/attendance', 1)

  void teachers
  void attendance
  return out
}

export const SEED_META = {
  SCHOOL_ID,
  ACADEMIC_YEAR,
  TEACHER_ID,
  TEACHER_NAME,
  ADMIN_ID,
  ADMIN_NAME,
  SNAPSHOT_SIZE: RANKING.snapshotSize,
  PERIOD_KEY: periodKeyFor('overall'),
}
