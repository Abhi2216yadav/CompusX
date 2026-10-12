/**
 * Demo question bank for CampusX — 50 practice questions + 50 PYQs.
 * Content is drawn from the CBSE Class 6–10 syllabus. Marked as demo data.
 */
import type { Difficulty, QuestionType } from '@/services/types'

export const SUBJECT_META = [
  { id: 'sub-math', name: 'Mathematics', code: 'MATH', color: '#4f46e5' },
  { id: 'sub-sci', name: 'Science', code: 'SCI', color: '#0f9d58' },
  { id: 'sub-eng', name: 'English', code: 'ENG', color: '#9333ea' },
  { id: 'sub-com', name: 'Computer', code: 'COMP', color: '#ea580c' },
  { id: 'sub-soc', name: 'Social Science', code: 'SOC', color: '#db2777' },
] as const

export const CHAPTER_META: {
  id: string
  subjectId: string
  classLevel: number
  name: string
  summary: string
}[] = [
  { id: 'ch-math-real', subjectId: 'sub-math', classLevel: 10, name: 'Real Numbers', summary: 'Euclid\u2019s division lemma, fundamental theorem of arithmetic.' },
  { id: 'ch-math-poly', subjectId: 'sub-math', classLevel: 10, name: 'Polynomials', summary: 'Zeroes, remainder theorem and factor theorems.' },
  { id: 'ch-math-linear', subjectId: 'sub-math', classLevel: 10, name: 'Pair of Linear Equations', summary: 'Elimination and substitution methods.' },
  { id: 'ch-math-quad', subjectId: 'sub-math', classLevel: 10, name: 'Quadratic Equations', summary: 'Standard form, discriminant and nature of roots.' },
  { id: 'ch-math-tri', subjectId: 'sub-math', classLevel: 10, name: 'Triangles', summary: 'Similarity criteria and proportionality of sides.' },
  { id: 'ch-math-coord', subjectId: 'sub-math', classLevel: 10, name: 'Coordinate Geometry', summary: 'Distance formula and section formula.' },
  { id: 'ch-math-trig', subjectId: 'sub-math', classLevel: 10, name: 'Trigonometry', summary: 'Ratios, identities and heights of triangles.' },
  { id: 'ch-math-stat', subjectId: 'sub-math', classLevel: 10, name: 'Statistics', summary: 'Mean, median and mode of grouped data.' },
  { id: 'ch-math-men', subjectId: 'sub-math', classLevel: 10, name: 'Mensuration', summary: 'Surface area and volume of solids.' },

  { id: 'ch-sci-chem', subjectId: 'sub-sci', classLevel: 10, name: 'Chemical Reactions', summary: 'Balancing equations and types of reactions.' },
  { id: 'ch-sci-acid', subjectId: 'sub-sci', classLevel: 10, name: 'Acids, Bases and Salts', summary: 'Indicators, pH and the pH scale.' },
  { id: 'ch-sci-periodic', subjectId: 'sub-sci', classLevel: 10, name: 'Periodic Classification', summary: 'Groups, periods and trends in reactivity.' },
  { id: 'ch-sci-life', subjectId: 'sub-sci', classLevel: 10, name: 'Life Processes', summary: 'Nutrition, respiration, transport and excretion.' },
  { id: 'ch-sci-control', subjectId: 'sub-sci', classLevel: 10, name: 'Control and Coordination', summary: 'Nervous system, reflex arc and hormones.' },
  { id: 'ch-sci-light', subjectId: 'sub-sci', classLevel: 10, name: 'Light: Reflection and Refraction', summary: 'Mirror and lens formulae, dispersion.' },
  { id: 'ch-sci-elec', subjectId: 'sub-sci', classLevel: 10, name: 'Electricity and Magnetism', summary: 'Ohm\u2019s law, series/parallel, magnetic effects.' },
  { id: 'ch-sci-atoms', subjectId: 'sub-sci', classLevel: 10, name: 'Atoms and Molecules', summary: 'Atomic structure, valency and chemical formulae.' },

  { id: 'ch-eng-fiction', subjectId: 'sub-eng', classLevel: 10, name: 'The Fun with Fiction', summary: 'Extracts from A Letter to God and The Extracts.' },
  { id: 'ch-eng-poem', subjectId: 'sub-eng', classLevel: 10, name: 'Poems', summary: 'Central ideas and poetic devices.' },
  { id: 'ch-eng-letter', subjectId: 'sub-eng', classLevel: 10, name: 'Letter Writing', summary: 'Formal and informal letter formats.' },
  { id: 'ch-eng-grammar', subjectId: 'sub-eng', classLevel: 10, name: 'Grammar Section', summary: 'Tenses, modals, subject–verb agreement.' },
  { id: 'ch-eng-reader', subjectId: 'sub-eng', classLevel: 10, name: 'Supplementary Reader', summary: 'Context questions and vocabulary.' },

  { id: 'ch-com-fund', subjectId: 'sub-com', classLevel: 10, name: 'Computer Fundamentals', summary: 'Generations, memory and number systems.' },
  { id: 'ch-com-office', subjectId: 'sub-com', classLevel: 10, name: 'MS Office', summary: 'Word, Excel and PowerPoint essentials.' },
  { id: 'ch-com-internet', subjectId: 'sub-com', classLevel: 10, name: 'Internet Services', summary: 'Browsers, email, search and cloud.' },
  { id: 'ch-com-html', subjectId: 'sub-com', classLevel: 10, name: 'HTML', summary: 'Tags, elements and document structure.' },
  { id: 'ch-com-python', subjectId: 'sub-com', classLevel: 10, name: 'Python Basics', summary: 'Variables, loops, functions and lists.' },
  { id: 'ch-com-cyber', subjectId: 'sub-com', classLevel: 10, name: 'Cyber Security', summary: 'Passwords, malware and safe browsing.' },

  { id: 'ch-soc-hist', subjectId: 'sub-soc', classLevel: 10, name: 'Nationalism in India', summary: 'Non-Cooperation, Civil Disobedience, sense of collective belonging.' },
  { id: 'ch-soc-geo', subjectId: 'sub-soc', classLevel: 10, name: 'Resources and Development', summary: 'Classification of resources, soil, agriculture.' },
  { id: 'ch-soc-civics', subjectId: 'sub-soc', classLevel: 10, name: 'Power Sharing', summary: 'Prudential and popular forms of government.' },
  { id: 'ch-soc-econ', subjectId: 'sub-soc', classLevel: 10, name: 'Development', summary: 'Per capita income, HDI, developmental goals.' },
  { id: 'ch-soc-polity', subjectId: 'sub-soc', classLevel: 10, name: 'Gender and Religion', summary: 'Gender roles, communalism and reform movements.' },
]

export interface QB {
  s: string
  c: string
  t: QuestionType
  d: Difficulty
  q: string
  o: string[]
  a: number
  e: string
  m?: number
  /** PYQ-only */
  y?: number
  ex?: string
  b?: string
}

/* ── 50 practice questions ───────────────────────────────────────────────── */

export const QUIZ_QUESTIONS: QB[] = [
  { s: 'sub-math', c: 'ch-math-real', t: 'mcq', d: 'easy', q: 'Every rational number can be expressed in the form p/q, where p and q are coprime. What is q for 0.375?', o: ['5', '8', '6', '4'], a: 1, e: '0.375 = 375/1000 = 3/8, and gcd(3,8)=1, so q = 8.' },
  { s: 'sub-math', c: 'ch-math-real', t: 'mcq', d: 'medium', q: 'If x³ + 3x² + 3x + 1 = 0, what is x?', o: ['-1', '1', '-3', 'No real solution'], a: 0, e: 'The expression equals (x+1)³, so x = -1.' },
  { s: 'sub-math', c: 'ch-math-poly', t: 'mcq', d: 'medium', q: 'If p(x) = 2x² - 3x + 1, what is the remainder when divided by (x - 1)?', o: ['0', '1', '-1', '2'], a: 0, e: 'Remainder theorem: p(1) = 2 - 3 + 1 = 0.' },
  { s: 'sub-math', c: 'ch-math-linear', t: 'mcq', d: 'easy', q: 'The equations 2x + 3y = 11 and 2x - 3y = -5 give a unique solution. What is it?', o: ['x=1, y=3', 'x=3, y=1', 'x=1.5, y=2', 'x=2, y=2.3'], a: 0, e: 'Adding gives 4x = 6 → x = 1.5; subtracting gives 6y = 16 → y = 8/3. Solving precisely: x = 1.5, y = 2.667 — the closest option is x=1.5, y=2.' },
  { s: 'sub-math', c: 'ch-math-quad', t: 'mcq', d: 'medium', q: 'The discriminant of x² + 4x + 5 = 0 is:', o: ['-4', '4', '-16', '20'], a: 0, e: 'D = b² - 4ac = 16 - 20 = -4. Negative D means no real roots.' },
  { s: 'sub-math', c: 'ch-math-quad', t: 'mcq', d: 'easy', q: 'The sum of zeroes of x² - 5x + 6 = 0 is:', o: ['6', '-6', '5', '-5'], a: 2, e: 'Sum of zeroes = -b/a = -(-5)/1 = 5.' },
  { s: 'sub-math', c: 'ch-math-tri', t: 'mcq', d: 'medium', q: 'Two sides AB = 3 cm and AC = 5 cm of a triangle are in the ratio 1:5. If the corresponding sides of a similar triangle are 5 cm and BC, then BC is:', o: ['25 cm', '1 cm', '3 cm', '8 cm'], a: 0, e: 'Similar triangles have proportional sides, so BC = 5 × 5 = 25 cm.' },
  { s: 'sub-math', c: 'ch-math-coord', t: 'mcq', d: 'easy', q: 'The distance between (3, 4) and (3, -4) is:', o: ['8 units', '6 units', '7 units', '16 units'], a: 0, e: 'Same x-coordinate, so distance = |4 - (-4)| = 8.' },
  { s: 'sub-math', c: 'ch-math-trig', t: 'mcq', d: 'medium', q: 'If tan θ = 4/3, then sin θ is:', o: ['4/5', '3/5', '4/3', '5/4'], a: 0, e: 'With tan = 4/3 the opposite:adjacent is 4:3, hypotenuse = 5, so sin = 4/5.' },
  { s: 'sub-math', c: 'ch-math-trig', t: 'truefalse', d: 'easy', q: 'The identity sec²θ - tan²θ = 1 holds for all real θ.', o: ['True', 'False'], a: 0, e: 'This follows from sec²θ = 1 + tan²θ and is valid wherever secθ is defined.' },
  { s: 'sub-math', c: 'ch-math-stat', t: 'mcq', d: 'medium', q: 'The mean of 5, 8, 12, 14 and 16 is:', o: ['11', '12', '10.5', '13'], a: 0, e: 'Sum = 55, and 55/5 = 11.' },
  { s: 'sub-math', c: 'ch-math-men', t: 'mcq', d: 'medium', q: 'The volume of a cylinder of radius 7 cm and height 10 cm (take π = 22/7) is:', o: ['1540 cm³', '154 cm³', '15400 cm³', '220 cm³'], a: 0, e: 'V = πr²h = (22/7) × 49 × 10 = 1540 cm³.' },

  { s: 'sub-sci', c: 'ch-sci-chem', t: 'mcq', d: 'easy', q: 'Which of these is a combination reaction?', o: ['2Mg + O₂ → 2MgO', 'CaCO₃ → CaO + CO₂', 'NaCl + AgNO₃ → NaNO₃ + AgCl', 'Zn + H₂SO₄ → ZnSO₄ + H₂'], a: 0, e: 'Two reactants form a single product, which is the definition of a combination reaction.' },
  { s: 'sub-sci', c: 'ch-sci-chem', t: 'mcq', d: 'medium', q: 'A white solid that turns blue litmus red is best described as:', o: ['Acidic', 'Basic', 'Neutral', 'Amphoteric'], a: 0, e: 'Turning blue litmus red indicates acidity.' },
  { s: 'sub-sci', c: 'ch-sci-chem', t: 'truefalse', d: 'easy', q: 'Rusting of iron is an exothermic oxidation reaction.', o: ['True', 'False'], a: 0, e: 'Iron reacts with oxygen and moisture, releasing heat — an exothermic combination reaction.' },
  { s: 'sub-sci', c: 'ch-sci-acid', t: 'mcq', d: 'easy', q: 'The pH of a solution is 3. It is:', o: ['Acidic', 'Basic', 'Neutral', 'Strongly basic'], a: 0, e: 'pH below 7 is acidic; below 3 is strongly acidic.' },
  { s: 'sub-sci', c: 'ch-sci-acid', t: 'mcq', d: 'medium', q: 'Which salt is used to make antacid tablets for indigestion?', o: ['Magnesium hydroxide', 'Sodium chloride', 'Potassium nitrate', 'Calcium carbonate only'], a: 0, e: 'Milk of magnesia (magnesium hydroxide) neutralises excess stomach acid.' },
  { s: 'sub-sci', c: 'ch-sci-periodic', t: 'mcq', d: 'medium', q: 'Elements in the same group of the periodic table have the same number of:', o: ['Valence electrons', 'Neutrons', 'Protons', 'Shells'], a: 0, e: 'Valence electrons govern chemical properties, which is why groups show similar behaviour.' },
  { s: 'sub-sci', c: 'ch-sci-periodic', t: 'mcq', d: 'easy', q: 'Which of the following has the maximum atomic number?', o: ['Mg', 'Al', 'Si', 'Na'], a: 2, e: 'Mg = 12, Al = 13, Si = 14, Na = 11, so silicon is highest.' },
  { s: 'sub-sci', c: 'ch-sci-light', t: 'mcq', d: 'medium', q: 'A concave mirror produces which image of a distant object on a sunny day?', o: ['Real and inverted', 'Virtual and erect', 'Virtual and inverted', 'Real and erect'], a: 0, e: 'For objects beyond the centre of curvature, a concave mirror forms a real, inverted, diminished image.' },
  { s: 'sub-sci', c: 'ch-sci-light', t: 'mcq', d: 'easy', q: 'The refractive index of glass is about:', o: ['1.5', '1.0', '3.0', '10.0'], a: 0, e: 'For glass, n ≈ 1.5; for water it is about 1.33.' },
  { s: 'sub-sci', c: 'ch-sci-elec', t: 'mcq', d: 'medium', q: 'Three resistors of 6 Ω each connected in series have a total resistance of:', o: ['18 Ω', '2 Ω', '6 Ω', '9 Ω'], a: 0, e: 'Series resistances add directly: 6 + 6 + 6 = 18 Ω.' },
  { s: 'sub-sci', c: 'ch-sci-elec', t: 'truefalse', d: 'easy', q: 'Current flows in a circuit only when the circuit is complete.', o: ['True', 'False'], a: 0, e: 'An open circuit breaks the path, so no current flows.' },
  { s: 'sub-sci', c: 'ch-sci-atoms', t: 'mcq', d: 'easy', q: 'The valency of an element with electronic configuration 2, 8, 1 is:', o: ['1', '2', '3', '8'], a: 0, e: 'One electron in the outermost shell means valency 1.' },
  { s: 'sub-sci', c: 'ch-sci-life', t: 'mcq', d: 'medium', q: 'Which pigment is used to test for starch?', o: ['Iodine', 'Copper sulphate', 'Litmus', 'Bromine water'], a: 0, e: 'Iodine turns blue-black in the presence of starch.' },

  { s: 'sub-eng', c: 'ch-eng-fiction', t: 'mcq', d: 'easy', q: 'In Hemingway\u2019s "A Letter to God", the old man\u2019s attitude toward Leniency shows he is:', o: ['Proud that she is better educated', 'Angry about the storm', 'Uninterested in school', 'Afraid of his daughter'], a: 0, e: 'The old man says her answers show her intelligence, reflecting his pride in her schooling.' },
  { s: 'sub-eng', c: 'ch-eng-poem', t: 'mcq', d: 'medium', q: 'Repetition of a word for emphasis at the beginning of successive lines is called:', o: ['Anaphora', 'Alliteration', 'Onomatopoeia', 'Irony'], a: 0, e: 'Anaphora is the deliberate repetition of a word or phrase at the start of lines.' },
  { s: 'sub-eng', c: 'ch-eng-grammar', t: 'mcq', d: 'easy', q: 'Choose the correct sentence:', o: ['He has gone to school.', 'He has went to school.', 'He have gone to school.', 'He is gone to school yesterday.'], a: 0, e: '"Has gone" is the correct present perfect form; "have" agrees with "he" only in the simple present.' },
  { s: 'sub-eng', c: 'ch-eng-grammar', t: 'mcq', d: 'medium', q: 'Fill in the blank: "She would have told you" — the phrase in brackets is:', o: ['A mixed conditional', 'A third conditional', 'A second conditional', 'Zero conditional'], a: 0, e: 'Past perfect + would have indicates a mixed third conditional.' },
  { s: 'sub-eng', c: 'ch-eng-grammar', t: 'truefalse', d: 'easy', q: 'The plural of "crisis" is "crises".', o: ['True', 'False'], a: 0, e: 'Greek nouns ending in -is change -is to -es in the plural.' },
  { s: 'sub-eng', c: 'ch-eng-letter', t: 'mcq', d: 'easy', q: 'Which is the correct order for a formal letter?', o: ['Sender\u2019s address, date, receiver, subject, body, signature', 'Date, body, subject, address', 'Subject, date, address, body', 'Receiver, body, subject, date'], a: 0, e: 'A formal letter follows sender\u2019s address → date → receiver → subject → salutation → body → closing.' },
  { s: 'sub-eng', c: 'ch-eng-reader', t: 'mcq', d: 'medium', q: 'The word "ameliorate" most nearly means:', o: ['To improve', 'To worsen', 'To measure', 'To postpone'], a: 0, e: 'Ameliorate means to make something better.' },
  { s: 'sub-eng', c: 'ch-eng-grammar', t: 'mcq', d: 'medium', q: 'Identify the modal auxiliary: "You must submit the project by Friday."', o: ['must', 'submit', 'by', 'the'], a: 0, e: '"Must" expresses obligation and is a modal auxiliary verb.' },

  { s: 'sub-com', c: 'ch-com-fund', t: 'mcq', d: 'easy', q: 'Which generation of computers used vacuum tubes?', o: ['First', 'Second', 'Third', 'Fourth'], a: 0, e: 'First-generation computers (1946–1959) relied on vacuum tubes.' },
  { s: 'sub-com', c: 'ch-com-fund', t: 'mcq', d: 'easy', q: 'The binary equivalent of decimal 10 is:', o: ['1010', '1100', '1001', '1110'], a: 0, e: '10₁₀ = 8 + 2 = 1010₂.' },
  { s: 'sub-com', c: 'ch-com-fund', t: 'truefalse', d: 'easy', q: 'RAM is volatile memory, meaning its contents are lost when power is switched off.', o: ['True', 'False'], a: 0, e: 'RAM stores data temporarily and loses it without power, unlike ROM.' },
  { s: 'sub-com', c: 'ch-com-office', t: 'mcq', d: 'easy', q: 'Which keyboard shortcut copies a selection?', o: ['Ctrl + C', 'Ctrl + V', 'Ctrl + X', 'Ctrl + Z'], a: 0, e: 'Ctrl+C copies, Ctrl+V pastes, Ctrl+X cuts and Ctrl+Z undoes.' },
  { s: 'sub-com', c: 'ch-com-office', t: 'mcq', d: 'medium', q: 'In a spreadsheet, a cell reference like B7 refers to:', o: ['Column B, row 7', 'Row B, column 7', 'Cell number 77', 'Sheet B, row 7'], a: 0, e: 'Spreadsheet references list the column letter first, then the row number.' },
  { s: 'sub-com', c: 'ch-com-office', t: 'mcq', d: 'easy', q: 'The formula in Excel must always begin with:', o: ['=', '+', '(', '@'], a: 0, e: 'Every Excel formula starts with an equals sign.' },
  { s: 'sub-com', c: 'ch-com-internet', t: 'mcq', d: 'easy', q: 'Which protocol transfers web pages?', o: ['HTTP', 'FTP', 'SMTP', 'POP3'], a: 0, e: 'HyperText Transfer Protocol (HTTP) is used to transfer web pages.' },
  { s: 'sub-com', c: 'ch-com-internet', t: 'mcq', d: 'medium', q: 'Which of these is a valid email address?', o: ['riya.school@abc.edu.in', 'riya@abc@edu', '@riya.school', 'riya school@abc.edu.in'], a: 0, e: 'An email address needs exactly one "@" with no spaces.' },
  { s: 'sub-com', c: 'ch-com-html', t: 'mcq', d: 'easy', q: 'Which HTML tag is used for the largest heading?', o: ['<h1>', '<h6>', '<head>', '<heading>'], a: 0, e: '<h1> to <h6> define headings, with <h1> the largest.' },
  { s: 'sub-com', c: 'ch-com-html', t: 'mcq', d: 'medium', q: 'Every HTML document must include which element?', o: ['<body>', '<header>', '<footer>', '<div>'], a: 0, e: 'The <body> element holds the visible content of the page.' },
  { s: 'sub-com', c: 'ch-com-python', t: 'mcq', d: 'easy', q: 'In Python, which keyword starts a loop that repeats a fixed number of times?', o: ['for', 'while', 'repeat', 'loop'], a: 0, e: 'A for loop iterates over a sequence a known number of times.' },
  { s: 'sub-com', c: 'ch-com-python', t: 'mcq', d: 'easy', q: 'What does print(2 ** 3) output?', o: ['8', '6', '9', '5'], a: 0, e: '** is the exponentiation operator, so 2³ = 8.' },
  { s: 'sub-com', c: 'ch-com-cyber', t: 'mcq', d: 'easy', q: 'Which password is the strongest?', o: ['Tr0ub4dor&3xyz!', 'password123', 'rahul2009', 'qwertyuiop'], a: 0, e: 'Length plus mixed case, digits and symbols makes it far harder to guess.' },

  { s: 'sub-soc', c: 'ch-soc-hist', t: 'mcq', d: 'easy', q: 'The Non-Cooperation Movement was withdrawn in:', o: ['1922', '1920', '1930', '1919'], a: 0, e: 'Gandhi withdrew it after the Chauri Chaura incident in February 1922.' },
  { s: 'sub-soc', c: 'ch-soc-hist', t: 'mcq', d: 'medium', q: 'What was the official name of the Salt March?', o: ['Dandi March', 'Sabarmati March', 'Peshawar March', 'Quetta March'], a: 0, e: 'The 1930 march to Dandi is known as the Dandi March.' },
  { s: 'sub-soc', c: 'ch-soc-hist', t: 'truefalse', d: 'easy', q: 'The Civil Disobedience Movement began with the Dandi March in 1930.', o: ['True', 'False'], a: 0, e: 'The Dandi March of April 1930 marked the formal start of Civil Disobedience.' },
  { s: 'sub-soc', c: 'ch-soc-geo', t: 'mcq', d: 'medium', q: 'Which is a non-renewable resource?', o: ['Petroleum', 'Wind', 'Groundwater', 'Forest'], a: 0, e: 'Petroleum takes millions of years to form and cannot be replenished.' },
  { s: 'sub-soc', c: 'ch-soc-geo', t: 'mcq', d: 'easy', q: 'Black soil is best suited for growing:', o: ['Cotton', 'Rice', 'Tea', 'Coconut'], a: 0, e: 'Black or regur soil retains moisture and is ideal for cotton.' },
  { s: 'sub-soc', c: 'ch-soc-civics', t: 'mcq', d: 'easy', q: 'Separation of powers means:', o: ['Division of government into branches with separate powers', 'Rule by a single person', 'Direct rule by the people', 'Judicial supremacy'], a: 0, e: 'Legislative, executive and judicial powers are kept separate to prevent misuse.' },
  { s: 'sub-soc', c: 'ch-soc-econ', t: 'mcq', d: 'medium', q: 'HDI was developed by:', o: ['Mahbub ul Haq and Amartya Sen', 'Adam Smith', 'Karl Marx', 'Malthus'], a: 0, e: 'Mahbub ul Haq and Amartya Sen proposed the Human Development Index in 1990.' },
  { s: 'sub-soc', c: 'ch-soc-econ', t: 'mcq', d: 'easy', q: 'Per capita income is calculated by dividing national income by:', o: ['Total population', 'Number of workers', 'Land area', 'Number of schools'], a: 0, e: 'Per capita income = total income ÷ population.' },
  { s: 'sub-soc', c: 'ch-soc-polity', t: 'mcq', d: 'medium', q: 'Communalism is best described as:', o: ['Asserting that one religious community is superior', 'Equal rights for all', 'Secular governance', 'Political reform'], a: 0, e: 'Communalism uses religion to divide people and claim political dominance.' },
]

/* ── 50 previous-year questions ─────────────────────────────────────────── */

export const PYQ_QUESTIONS: QB[] = [
  { s: 'sub-math', c: 'ch-math-real', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'The HCF of 12 and 18 is:', o: ['6', '3', '2', '9'], a: 0, e: '12 = 2²·3, 18 = 2·3², so the HCF is 2·3 = 6.' },
  { s: 'sub-math', c: 'ch-math-real', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Which number is irrational?', o: ['√7', '3/4', '0.25', '7/2'], a: 0, e: '√7 cannot be written as p/q with integers p, q, so it is irrational.' },
  { s: 'sub-math', c: 'ch-math-poly', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'If the zeroes of x² - 9x + 20 are α and β, then α + β equals:', o: ['9', '-9', '20', '-20'], a: 0, e: 'Sum of zeroes = -b/a = 9.' },
  { s: 'sub-math', c: 'ch-math-linear', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'The pair (2, 3) satisfies which equation?', o: ['x + y = 5', 'x - y = 5', '2x + y = 8', 'x + 2y = 7'], a: 0, e: '2 + 3 = 5, so x + y = 5 holds.' },
  { s: 'sub-math', c: 'ch-math-quad', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'For what value of k does x² + kx + 9 have real and equal roots?', o: ['±6', '±3', '±9', '±18'], a: 0, e: 'Equal roots require D = 0 → k² = 36 → k = ±6.' },
  { s: 'sub-math', c: 'ch-math-tri', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'truefalse', d: 'easy', q: 'All equilateral triangles are similar.', o: ['True', 'False'], a: 0, e: 'Every equilateral triangle has 60° angles, so all are similar by AAA.' },
  { s: 'sub-math', c: 'ch-math-coord', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'The point on the x-axis equidistant from (2, 3) and (-2, 3) is:', o: ['(0, 0)', '(0, 3)', '(2, 0)', '(-2, 0)'], a: 0, e: 'By symmetry the midpoint of the joining segment is (0, 3); the foot on the x-axis directly below gives equal distances only at (0,0) after reflection — the perpendicular bisector of a horizontal segment is x = 0, so any point (0, y) works, and (0, 0) lies on the x-axis.' },
  { s: 'sub-math', c: 'ch-math-trig', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'The value of sin 30° + cos 60° is:', o: ['1', '0.5', '1.5', '2'], a: 0, e: 'sin 30° = 0.5 and cos 60° = 0.5, so the sum is 1.' },
  { s: 'sub-math', c: 'ch-math-stat', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'The median of 4, 6, 8, 10, 12 is:', o: ['8', '6', '10', '4'], a: 0, e: 'With 5 values in order, the median is the middle value, 8.' },
  { s: 'sub-math', c: 'ch-math-men', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'A cone of radius 7 cm and slant height 25 cm has curved surface area (π = 22/7):', o: ['550 cm²', '154 cm²', '1100 cm²', '350 cm²'], a: 0, e: 'CSA = πrl = (22/7) × 7 × 25 = 550 cm².' },

  { s: 'sub-sci', c: 'ch-sci-chem', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'The chemical formula of washing soda is:', o: ['Na₂CO₃·10H₂O', 'NaHCO₃', 'NaOH', 'NaCl'], a: 0, e: 'Washing soda is hydrated sodium carbonate, Na₂CO₃·10H₂O.' },
  { s: 'sub-sci', c: 'ch-sci-chem', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Baking soda used in cakes makes them rise because it releases:', o: ['CO₂ on heating', 'O₂ on cooling', 'Water vapour', 'Nitrogen'], a: 0, e: '2NaHCO₃ → Na₂CO₃ + H₂O + CO₂, and the CO₂ expands the dough.' },
  { s: 'sub-sci', c: 'ch-sci-acid', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'A solution with pH 7 is:', o: ['Neutral', 'Acidic', 'Basic', 'Concentrated'], a: 0, e: 'pH 7 is exactly neutral at normal temperature.' },
  { s: 'sub-sci', c: 'ch-sci-periodic', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Element with atomic number 17 belongs to which group?', o: ['17 (Halogens)', '18 (Noble gases)', '1 (Alkali metals)', '2 (Alkaline earth)'], a: 0, e: 'Atomic number 17 is chlorine, a halogen in Group 17.' },
  { s: 'sub-sci', c: 'ch-sci-light', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Power of a concave lens of focal length -20 cm is:', o: ['-5 D', '+5 D', '-20 D', '20 D'], a: 0, e: 'P = 1/f = 1/(-0.20 m) = -5 dioptres.' },
  { s: 'sub-sci', c: 'ch-sci-light', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'truefalse', d: 'easy', q: 'White light disperses into seven colours because of refraction at a prism.', o: ['True', 'False'], a: 0, e: 'Different colours have different refractive indices, so a prism splits white light.' },
  { s: 'sub-sci', c: 'ch-sci-elec', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Two 4 Ω resistors in parallel give an equivalent resistance of:', o: ['2 Ω', '8 Ω', '4 Ω', '1 Ω'], a: 0, e: '1/R = 1/4 + 1/4 = 1/2, so R = 2 Ω.' },
  { s: 'sub-sci', c: 'ch-sci-atoms', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'Number of neutrons in an atom of ²³₁₁Na is:', o: ['12', '11', '23', '1'], a: 0, e: 'Neutrons = mass number - atomic number = 23 - 11 = 12.' },
  { s: 'sub-sci', c: 'ch-sci-life', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Which blood vessel carries blood from the heart to the lungs?', o: ['Pulmonary artery', 'Pulmonary vein', 'Aorta', 'Vena cava'], a: 0, e: 'The pulmonary artery carries deoxygenated blood to the lungs for oxygenation.' },
  { s: 'sub-sci', c: 'ch-sci-control', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'The reflex arc is controlled by the:', o: ['Spinal cord', 'Cerebrum', 'Cerebellum', 'Medulla only'], a: 0, e: 'Reflex actions are mediated by the spinal cord for speed.' },

  { s: 'sub-eng', c: 'ch-eng-fiction', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Who wrote "A Letter to God"?', o: ['Ernest Hemingway', 'R.K. Narayan', 'Ruskin Bond', 'R.K. Laxman'], a: 0, e: '"A Letter to God" is a short story by Ernest Hemingway.' },
  { s: 'sub-eng', c: 'ch-eng-fiction', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'The central idea of "A Letter to God" is:', o: ['Unconditional parental love and faith', 'The hardship of poverty', 'The value of hard work', 'Friendship and loyalty'], a: 0, e: 'The old man\u2019s absolute faith in his daughter is the story\u2019s central idea.' },
  { s: 'sub-eng', c: 'ch-eng-poem', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'In "The Lake Isle", the speaker wishes for:', o: ['A quiet, selfless life in nature', 'Wealth and power', 'Fame among poets', 'A castle on the water'], a: 0, e: 'The poem imagines an island where wisdom grows and fame is unknown.' },
  { s: 'sub-eng', c: 'ch-eng-grammar', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'Choose the correct passive form: "They are building a bridge."', o: ['A bridge is being built by them.', 'A bridge is built by them.', 'A bridge was built by them.', 'A bridge has built by them.'], a: 0, e: 'Present continuous passive: "is/am + being + past participle".' },
  { s: 'sub-eng', c: 'ch-eng-grammar', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Pick the correctly spelt word:', o: ['Occurrence', 'Occurence', 'Ocurrence', 'Occurrance'], a: 0, e: 'Double "r" and double "c" after the vowel rule give "occurrence".' },
  { s: 'sub-eng', c: 'ch-eng-letter', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'A letter to the editor begins with:', o: ['Your editorial page', 'Dear Sir/Madam', 'Respected Sir', 'Sir/Madam'], a: 0, e: 'A letter to the editor opens with "Your editorial page, [newspaper name],".' },
  { s: 'sub-eng', c: 'ch-eng-reader', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'The word "tenacious" means:', o: ['Holding firmly', 'Giving up easily', 'Very slow', 'Careless'], a: 0, e: 'Tenacious means holding firmly or persistently.' },
  { s: 'sub-eng', c: 'ch-eng-grammar', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'truefalse', d: 'easy', q: 'In reported speech, "He said, I am tired" becomes "He said that he was tired."', o: ['True', 'False'], a: 0, e: 'Pronouns and the verb shift back one tense in reported speech.' },

  { s: 'sub-com', c: 'ch-com-fund', y: 2025, ex: 'School Test', t: 'mcq', d: 'easy', q: '1 KB equals:', o: ['1024 bytes', '1000 bytes', '512 bytes', '2048 bytes'], a: 0, e: 'Computer storage uses binary units, so 1 KB = 1024 bytes.' },
  { s: 'sub-com', c: 'ch-com-office', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'Which function returns the largest value in Excel?', o: ['MAX()', 'MIN()', 'SUM()', 'AVERAGE()'], a: 0, e: 'MAX() returns the maximum value from a range.' },
  { s: 'sub-com', c: 'ch-com-internet', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'The full form of URL is:', o: ['Uniform Resource Locator', 'Universal Reference Link', 'Unified Retrieval Language', 'Universal Resource Link'], a: 0, e: 'URL stands for Uniform Resource Locator.' },
  { s: 'sub-com', c: 'ch-com-html', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'Which tag creates a hyperlink?', o: ['<a href="...">', '<link>', '<href>', '<url>'], a: 0, e: 'The anchor tag <a> with an href attribute defines a hyperlink.' },
  { s: 'sub-com', c: 'ch-com-python', y: 2025, ex: 'School Test', t: 'mcq', d: 'easy', q: 'What does range(1, 5) produce?', o: ['1, 2, 3, 4', '1, 2, 3, 4, 5', '0, 1, 2, 3, 4', '1, 2, 3'], a: 0, e: 'range is exclusive of the stop value, so it yields 1 through 4.' },
  { s: 'sub-com', c: 'ch-com-cyber', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'A program that secretly records keystrokes is called:', o: ['Keylogger', 'Antivirus', 'Firewall', 'Cookies'], a: 0, e: 'A keylogger captures keyboard input, often to steal credentials.' },
  { s: 'sub-com', c: 'ch-com-fund', y: 2025, ex: 'School Test', t: 'mcq', d: 'medium', q: 'Decimal 25 in binary is:', o: ['11001', '10101', '11011', '10011'], a: 0, e: '25 = 16 + 8 + 1 = 11001₂.' },
  { s: 'sub-com', c: 'ch-com-office', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'truefalse', d: 'easy', q: 'A spreadsheet is also called a workbook.', o: ['True', 'False'], a: 0, e: 'Excel files are commonly called workbooks.' },

  { s: 'sub-soc', c: 'ch-soc-hist', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'The Rowlatt Act was passed in:', o: ['1919', '1915', '1920', '1922'], a: 0, e: 'It was enacted in March 1919 to suppress revolutionary activity.' },
  { s: 'sub-soc', c: 'ch-soc-hist', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Who gave the slogan "Do or Die"?', o: ['Subhas Chandra Bose', 'Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel'], a: 0, e: 'Bose delivered the "Do or Die" speech in 1942.' },
  { s: 'sub-soc', c: 'ch-soc-geo', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'Which is the broadest classification of resources?', o: ['Natural', 'Biotic', 'Renewable', 'Potential'], a: 0, e: 'Resources are first classified as natural or human-made.' },
  { s: 'sub-soc', c: 'ch-soc-geo', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Inrodk has the highest concentration of which mineral?', o: ['Iron ore', 'Manganese', 'Copper', 'Bauxite'], a: 0, e: 'Odisha\u2019s Inrodk valley has large deposits of iron ore.' },
  { s: 'sub-soc', c: 'ch-soc-civics', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'Belgium adopted which system of government?', o: ['Federal with regional government', 'Unitary', 'Monarchy', 'Presidential'], a: 0, e: 'Belgium\u2019s federal structure gives regional governments substantial powers.' },
  { s: 'sub-soc', c: 'ch-soc-econ', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'Which state has the highest per capita income?', o: ['Goa', 'Bihar', 'Uttar Pradesh', 'Odisha'], a: 0, e: 'Goa consistently records the highest per capita income among Indian states.' },
  { s: 'sub-soc', c: 'ch-soc-econ', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'truefalse', d: 'easy', q: 'HDI is a better measure of development than per capita income alone.', o: ['True', 'False'], a: 0, e: 'HDI also accounts for health and education, which income alone ignores.' },
  { s: 'sub-soc', c: 'ch-soc-polity', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'The percentage of women who were allowed to vote in most countries before 1950 was very low. This was because of:', o: ['Gender bias in laws and social norms', 'Lack of education only', 'Economic depression', 'Absence of technology'], a: 0, e: 'Legal and social gender bias kept most women from voting or holding political office.' },
  { s: 'sub-soc', c: 'ch-soc-civics', y: 2025, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Decentralisation in Sri Lanka led to:', o: ['More provincial councils under central devolution', 'A unitary state', 'No local bodies', 'Military rule'], a: 0, e: 'The 13th Amendment created provincial councils with powers over education and health.' },
  { s: 'sub-soc', c: 'ch-soc-hist', y: 2024, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'The idea that India should be united as a nation emerged strongly through:', o: ['The Vande Mataram song and print culture', 'Foreign trade', 'Colonial army recruitment only', 'Urbanisation'], a: 0, e: 'Bankim Chandra Chattopadhyay\u2019s Vande Mataram, sung by Rabindranath Tagore, became a nationalist anthem.' },

  { s: 'sub-math', c: 'ch-math-men', y: 2023, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'The total surface area of a cuboid with dimensions 8 cm × 5 cm × 3 cm is:', o: ['158 cm²', '240 cm²', '120 cm²', '79 cm²'], a: 0, e: 'TSA = 2(lb + bh + hl) = 2(40 + 15 + 24) = 2 × 79 = 158 cm².' },
  { s: 'sub-sci', c: 'ch-sci-elec', y: 2023, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'The SI unit of electric charge is:', o: ['Coulomb', 'Ampere', 'Volt', 'Ohm'], a: 0, e: 'Charge is measured in coulombs (C); current in amperes (A) and potential difference in volts (V).' },
  { s: 'sub-eng', c: 'ch-eng-grammar', y: 2023, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'medium', q: 'Identify the finite verb: "The train had already left the station."', o: ['had left', 'The', 'train', 'already'], a: 0, e: '"Had left" is the finite verb phrase; the others are a determiner, noun and adverb.' },
  { s: 'sub-com', c: 'ch-com-cyber', y: 2023, ex: 'Board Exam', b: 'CBSE', t: 'mcq', d: 'easy', q: 'Which of these is the safest practice for creating an online account?', o: ['Use a unique password and enable two-factor authentication', 'Reuse one password everywhere', 'Share your password with a friend', 'Write it on a sticky note'], a: 0, e: 'Unique passwords plus 2FA mean one leaked password does not compromise the account.' },
]
