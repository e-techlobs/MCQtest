export type GradeLevel = '9th' | '10th' | '1st A' | '2nd Year';
export type SubjectName = 'Physics' | 'Chemistry' | 'Biology' | 'Math';
export type UserRole = 'student' | 'teacher' | 'admin';
export type AccountStatus = 'pending' | 'approved' | 'rejected';
export type ResultMode = 'instant' | 'admin_review';
export type TestAccessMode = 'instant_open' | 'scheduled_window';
export type DifficultyTier = 'Standard' | 'Conceptual' | 'Board Exam';
export type TestDeliveryOverride = 'inherit' | 'instant' | 'admin_review';

export const GRADES: GradeLevel[] = ['9th', '10th', '1st A', '2nd Year'];
export const SUBJECTS: SubjectName[] = ['Physics', 'Chemistry', 'Biology', 'Math'];
export const DIFFICULTIES: DifficultyTier[] = ['Standard', 'Conceptual', 'Board Exam'];

export const CURRICULUM_BOARD_LABEL = 'Federal Board (FBISE) · National Book Foundation (NBF)';

export const GRADE_LABELS: Record<GradeLevel, string> = {
  '9th': '9th Class (SSC-I · NBF / FBISE)',
  '10th': '10th Class (SSC-II · NBF / FBISE)',
  '1st A': '1st A / 11th (HSSC-I · NBF / FBISE)',
  '2nd Year': '2nd Year / 12th (HSSC-II · NBF / FBISE)',
};

// Official National Book Foundation (NBF) / Federal Board (FBISE) Curriculum Chapters
export const SYLLABUS_CHAPTERS: Record<GradeLevel, Record<SubjectName, string[]>> = {
  '9th': {
    Physics: [
      'Physical Quantities and Measurement',
      'Kinematics',
      'Dynamics',
      'Turning Effect of Forces',
      'Forces and Matter',
      'Work, Energy and Power',
      'Properties of Matter & Thermal Properties',
      'Magnetism',
      'Nature of Science and Physics',
    ],
    Chemistry: [
      'Nature of Science in Chemistry',
      'Matter',
      'Atomic Structure',
      'Periodic Table and Periodicity of Properties',
      'Chemical Bonding',
      'Stoichiometry',
      'Electrochemistry',
      'Energetics',
      'Chemical Equilibrium',
      'Acids, Bases and Salts',
      'Environmental Chemistry - Air',
      'Environmental Chemistry - Water',
      'Organic Chemistry',
      'Hydrocarbons',
      'Biochemistry',
      'Empirical Data Collection and Analysis',
      'Separation Techniques',
      'Qualitative Analysis',
      'Chromatography',
    ],
    Biology: [
      'The Science of Biology',
      'Biodiversity',
      'The Cell',
      'The Cell Cycle',
      'Tissues, Organs and Organ Systems',
      'Molecular Biology',
      'Metabolism',
      'Plant Physiology',
      'Plant Reproduction',
      'Evolution',
    ],
    Math: [
      'Real Numbers',
      'Logarithms',
      'Sets and Functions',
      'Factorization and Algebraic Manipulation',
      'Linear Equations and Inequalities',
      'Trigonometry and Bearing',
      'Coordinate Geometry',
      'Geometry of Straight Lines',
      'Geometry and Polygons',
      'Practical Geometry',
      'Basic Statistics',
    ],
  },
  '10th': {
    Physics: [
      'Heat Capacity and Modes of Heat Transfer',
      'Thermal Expansion and Change of State',
      'Waves and Simple Harmonic Motion',
      'Sound',
      'Geometrical Optics',
      'Electrostatics',
      'Current Electricity',
      'Electromagnetism',
      'Basic Electronics & ICT',
      'Atomic and Nuclear Physics',
    ],
    Chemistry: [
      'History of Chemistry & Matter',
      'Stoichiometry',
      'Electrochemistry',
      'Reaction Kinetics',
      'Chemical Equilibrium',
      'Acids, Bases and Salts',
      'Nitrogen, Sulphur and Metals',
      'Organic Chemistry',
      'Hydrocarbons',
      'Hydroxy & Carboxylic Compounds',
      'Polymers & Biochemistry',
      'Environmental Chemistry (Atmosphere & Water)',
      'Chemical Industries',
    ],
    Biology: [
      'Digestive System',
      'Circulatory System',
      'Respiratory System',
      'Urinary System & Homeostasis',
      'Nervous System & Coordination',
      'Support and Movement',
      'Reproduction',
      'Inheritance & Genetics',
      'Biotechnology',
      'Man and His Environment',
      'Pharmacology & Diseases',
    ],
    Math: [
      'Complex Numbers',
      'Quadratic Equations',
      'Matrices and Determinants',
      'Linear and Quadratic Inequalities',
      'Algebraic Functions',
      'Functions and Graphs',
      'Vectors in Plane',
      'Application of Trigonometry',
      'Chords and Arcs of a Circle',
      'Tangent and Angles of a Circle',
      'Practical Geometry of Circles',
      'Basic Statistics',
    ],
  },
  '1st A': {
    Physics: [
      'Measurements and Vectors',
      'Motion and Force',
      'Work and Energy',
      'Rotational and Circular Motion',
      'Fluid Dynamics',
      'Oscillations',
      'Waves and Physical Optics',
      'Thermodynamics',
    ],
    Chemistry: [
      'Introduction to Chemistry & Stoichiometry',
      'Atomic Structure',
      'Chemical Bonding',
      'States and Phases of Matter (Gases, Liquids, Solids)',
      'Chemical Energetics (Thermochemistry)',
      'Chemical Kinetics',
      'Chemical Equilibrium',
      'Solutions and Colloids',
      'Electrochemistry',
      'Periodic Classification & Inorganic Trends',
      'Organic Chemistry & Hydrocarbons',
    ],
    Biology: [
      'Biodiversity and Classification',
      'Bacteria and Viruses (Acellular Life)',
      'Cells and Subcellular Organelles',
      'Biological Molecules (Biomolecules)',
      'Enzymes',
      'Bioenergetics',
      'Prokaryotes and Protists / Fungi',
      'Plant Physiology & Diversity Among Plants',
      'Human Digestive System (Nutrition)',
      'Human Respiratory System',
      'Human Circulatory System',
      'Human Skeletal and Muscular Systems',
    ],
    Math: [
      'Complex Numbers',
      'Matrices and Determinants',
      'Vectors',
      'Sequences and Series',
      'Quadratic Equations & Polynomials',
      'Permutation, Combination and Probability',
      'Mathematical Induction and Binomial Theorem',
      'Fundamentals of Trigonometry',
      'Trigonometric Identities & Graphs',
      'Application of Trigonometry',
      'Inverse Trigonometric Functions & Equations',
    ],
  },
  '2nd Year': {
    Physics: [
      'Electrostatics',
      'Current Electricity',
      'Electromagnetism',
      'Electromagnetic Induction',
      'Alternating Current',
      'Physics of Solids',
      'Electronics',
      'Dawn of Modern Physics',
      'Atomic Spectra',
      'Nuclear Physics',
    ],
    Chemistry: [
      'Periodic Trends & Advanced Inorganic Chemistry',
      'Transition Elements & Coordination Compounds',
      'Fundamental Principles of Organic Chemistry',
      'Aliphatic and Aromatic Hydrocarbons',
      'Alkyl Halides',
      'Alcohols, Phenols and Ethers',
      'Aldehydes and Ketones',
      'Carboxylic Acids and Derivatives',
      'Polymer Chemistry & Biochemistry',
      'Reaction Kinetics & Electrochemistry (Advanced)',
      'Environmental, Industrial & Analytical Chemistry',
    ],
    Biology: [
      'Respiration',
      'Homeostasis',
      'Support and Movement',
      'Nervous Coordination',
      'Chemical Coordination & Behavior',
      'Reproduction',
      'Development and Aging',
      'Inheritance (Genetics)',
      'Chromosome and DNA',
      'Evolution',
      'Man and His Environment (Ecology)',
      'Biotechnology & Human Welfare',
    ],
    Math: [
      'Functions and Graphs',
      'Limit, Continuity and Derivative',
      'Integration',
      'Differential Equations',
      'Kinematics of Motion in a Straight Line',
      'Analytical Geometry (Straight Line and Circles)',
      'Conic Sections (Parabola, Ellipse, Hyperbola)',
      'Inverse Trigonometric Functions & Graphs',
      'Vectors in Space',
      'Numerical Methods',
    ],
  },
};

export const VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
export const MAX_TITLE_LENGTH = 160;
export const MAX_NAME_LENGTH = 120;
export const MAX_TOPIC_LENGTH = 160;
export const MAX_IDENTIFIER_LENGTH = 64;

export interface MCQQuestion {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  topicTag: string;
}

export interface UserAccount {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: AccountStatus;
  grade: GradeLevel | 'All';
  subject: SubjectName | 'All';
  identifier: string;
  approvedBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SystemSettings {
  resultMode: ResultMode;
  testAccessMode: TestAccessMode;
  allowStudentInstantPractice: boolean;
  defaultTimeLimitMinutes: number;
  passingPercentage: number;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface MCQTest {
  id: string;
  title: string;
  grade: GradeLevel;
  subject: SubjectName;
  topic: string;
  difficulty: DifficultyTier;
  durationMinutes: number;
  questionCount: number;
  marksPerQuestion?: number;
  questions: MCQQuestion[];
  deliveryMode: TestDeliveryOverride;
  isActive: boolean;
  scheduledReleaseAt: string;
  createdBy: string;
  createdByName: string;
  createdByRole: 'teacher' | 'admin' | 'student_practice';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TestAttempt {
  id: string;
  testId: string;
  testTitle: string;
  testCreatorId: string;
  grade: GradeLevel;
  subject: SubjectName;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  answers: number[];
  score: number;
  totalQuestions: number;
  marksPerQuestion?: number;
  obtainedMarks?: number;
  totalMarks?: number;
  percentage: number;
  deliveryModeUsed: ResultMode;
  resultReleased: boolean;
  status: 'submitted' | 'reviewed';
  releasedBy: string;
  submittedAt?: unknown;
  updatedAt?: unknown;
}
