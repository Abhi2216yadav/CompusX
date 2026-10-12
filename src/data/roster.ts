/**
 * Demo roster — 120 students across Classes 6–10, sections A and B.
 *
 * The roster is emitted in *descending ability order* and the seeded attempt
 * generator derives real scores from `ability`, so the resulting leaderboard
 * lands naturally: rank 1 is the strongest student and Abhay (the demo login)
 * sits around rank 17 with roughly 86% progress — matching the walkthrough in
 * the product brief.
 */

export interface RosterStudent {
  id: string
  name: string
  email: string
  classId: string
  classLevel: number
  section: string
  rollNo: string
  /** Latent ability 0-100 — used by the seed generator to simulate answers. */
  ability: number
}

const FIRST_NAMES = [
  'Aarav', 'Priya', 'Rahul', 'Sneha', 'Vihaan', 'Ananya', 'Arjun', 'Diya', 'Kabir', 'Ishita',
  'Rohan', 'Meera', 'Aditya', 'Saanvi', 'Karan', 'Navya', 'Ishaan', 'Riya', 'Devansh', 'Aisha',
  'Yash', 'Tanvi', 'Manav', 'Kritika', 'Nikhil', 'Pooja', 'Siddharth', 'Neha', 'Aryan', 'Shreya',
  'Vivaan', 'Divya', 'Harsh', 'Sanya', 'Rudra', 'Anika', 'Om', 'Trisha', 'Lakshya', 'Naina',
  'Dhruv', 'Kavya', 'Advait', 'Myra', 'Reyansh', 'Sara', 'Aadi', 'Tara', 'Vihaan', 'Naina',
  'Krish', 'Ira', 'Atharv', 'Jiya', 'Parth', 'Rhea', 'Aryan', 'Avni', 'Keshav', 'Navya',
  'Daksh', 'Myra', 'Zoya', 'Rehan', 'Siya', 'Tanish', 'Aisha', 'Vedant', 'Nikita', 'Arhaan',
  'Pranav', 'Saanvi', 'Yash', 'Ishani', 'Gaurav', 'Ruhani', 'Nikhil', 'Anaya', 'Rudransh',
  'Palak', 'Aman', 'Shivani', 'Varun', 'Ekta', 'Jay', 'Ritika', 'Madhav', 'Suhani', 'Nishant',
  'Anika', 'Karanveer', 'Bhavya', 'Pranav', 'Avni', 'Samaira', 'Devansh', 'Preeti', 'Kartik',
  'Naina', 'Vihaan', 'Rashi', 'Aditi', 'Manish', 'Prisha', 'Yuvan', 'Lavya', 'Girish', 'Siya',
  'Nikhil', 'Rhea', 'Ahan', 'Tanya', 'Rishi', 'Pooja', 'Samar', 'Ishita', 'Neel', 'Aarohi',
  'Ved', 'Megha', 'Aryaman', 'Simran', 'Tanmay', 'Ira', 'Jatin', 'Nidhi', 'Tarun', 'Aishwarya',
]

const LAST_NAMES = [
  'Sharma', 'Singh', 'Kumar', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Mehta', 'Joshi',
  'Verma', 'Rao', 'Das', 'Bose', 'Chopra', 'Malhotra', 'Kapoor', 'Bhatt', 'Shah', 'Trivedi',
  'Agarwal', 'Banerjee', 'Chatterjee', 'Desai', 'Ghosh', 'Khanna', 'Mishra', 'Naidu', 'Pillai',
  'Rathore', 'Saxena', 'Thakur', 'Vyas', 'Yadav', 'Chauhan', 'Dubey', 'Gill', 'Jain', 'Kaur',
  'Sethi', 'Tiwari', 'Ahluwalia', 'Bhatia', 'Chand', 'Dutta', 'Goel', 'Heer', 'Kulkarni',
]

/** Demo-login students get fixed ids so docs can reference them directly. */
const FEATURED: { id: string; name: string; ability: number }[] = [
  { id: 'u-aarav', name: 'Aarav Sharma', ability: 96 },
  { id: 'u-priya', name: 'Priya Singh', ability: 93 },
  { id: 'u-rahul', name: 'Rahul Kumar', ability: 90 },
  { id: 'u-sneha', name: 'Sneha Patel', ability: 89 },
  { id: 'u-vihaan', name: 'Vihaan Reddy', ability: 88 },
  { id: 'u-ananya', name: 'Ananya Nair', ability: 88 },
  { id: 'u-arjun', name: 'Arjun Mehta', ability: 87.5 },
  { id: 'u-diya', name: 'Diya Joshi', ability: 87 },
  { id: 'u-kabir', name: 'Kabir Verma', ability: 87 },
  { id: 'u-ishita', name: 'Ishita Rao', ability: 86.8 },
  { id: 'u-rohan', name: 'Rohan Das', ability: 86.6 },
  { id: 'u-meera', name: 'Meera Bose', ability: 86.4 },
  { id: 'u-aditya', name: 'Aditya Chopra', ability: 86.2 },
  { id: 'u-saanvi', name: 'Saanvi Malhotra', ability: 86.1 },
  { id: 'u-karan', name: 'Karan Kapoor', ability: 86.0 },
  { id: 'u-navya', name: 'Navya Bhatt', ability: 85.9 },
  { id: 'u-abhay', name: 'Abhay Mishra', ability: 85.8 },
  { id: 'u-ishaan', name: 'Ishaan Shah', ability: 85.4 },
  { id: 'u-riya', name: 'Riya Trivedi', ability: 85.2 },
  { id: 'u-devansh', name: 'Devansh Agarwal', ability: 85.0 },
]

const CLASS_LEVELS = [6, 7, 8, 9, 10]
const SECTIONS = ['A', 'B']
const TOTAL = 120
const PER_CLASS_SECTION = TOTAL / (CLASS_LEVELS.length * SECTIONS.length) // 12

function hash(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function noise(seed: string): number {
  let a = hash(seed)
  return ((a % 1000) / 1000) * 2 - 1 // -1 .. 1
}

/** Assigns a class slot for roster position `i` so each class has 12 students. */
function slotFor(i: number): { classLevel: number; section: string; rollNo: string } {
  const groupIndex = Math.floor(i / PER_CLASS_SECTION)
  const withinGroup = (i % PER_CLASS_SECTION) + 1
  const classLevel = CLASS_LEVELS[Math.floor(groupIndex / SECTIONS.length)]
  const section = SECTIONS[groupIndex % SECTIONS.length]
  return { classLevel, section, rollNo: String(withinGroup).padStart(2, '0') }
}

export function buildRoster(): RosterStudent[] {
  const roster: RosterStudent[] = []

  FEATURED.forEach((f, i) => {
    const slot = slotFor(i)
    roster.push({
      id: f.id,
      name: f.name,
      email: `${f.id.replace(/^u-/, '')}@abcpubschool.edu.in`,
      classId: `cls-${slot.classLevel}-${slot.section}`,
      classLevel: slot.classLevel,
      section: slot.section,
      rollNo: slot.rollNo,
      ability: f.ability,
    })
  })

  let first = 0
  let last = 0
  let index = FEATURED.length

  while (roster.length < TOTAL) {
    const firstName = FIRST_NAMES[first % FIRST_NAMES.length]
    const lastName = LAST_NAMES[last % LAST_NAMES.length]
    first += 1
    if (first % FIRST_NAMES.length === 0) last += 1

    const slot = slotFor(index)
    const ability = 85.4 - (index - FEATURED.length) * 0.55 + noise(`ab-${index}`) * 1.6

    roster.push({
      id: `u-stu-${String(index + 1).padStart(3, '0')}`,
      name: `${firstName} ${lastName}`,
      email: `student${index + 1}@abcpubschool.edu.in`,
      classId: `cls-${slot.classLevel}-${slot.section}`,
      classLevel: slot.classLevel,
      section: slot.section,
      rollNo: slot.rollNo,
      ability: Math.max(18, Math.min(85, ability)),
    })

    index += 1
  }

  return roster
}
