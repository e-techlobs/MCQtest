import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  OperationType,
  db,
  generateSafeId,
  handleFirestoreError,
} from '../lib/firebase';
import {
  AccountStatus,
  DifficultyTier,
  GradeLevel,
  MAX_NAME_LENGTH,
  MAX_TITLE_LENGTH,
  MAX_TOPIC_LENGTH,
  MCQQuestion,
  MCQTest,
  ResultMode,
  SubjectName,
  SystemSettings,
  TestAttempt,
  TestDeliveryOverride,
  UserRole,
} from '../types';

export interface GenerateMCQRequest {
  grade: GradeLevel;
  subject: SubjectName;
  topic?: string;
  difficulty: DifficultyTier;
  questionCount: number;
}

export interface GenerateMCQResponse {
  title: string;
  questions: MCQQuestion[];
}

export async function generateMCQsFromServer(
  req: GenerateMCQRequest,
): Promise<GenerateMCQResponse> {
  const response = await fetch('/api/mcq/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const data = (await response.json()) as GenerateMCQResponse & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate MCQs from server.');
  }
  return {
    title: data.title,
    questions: data.questions,
  };
}

export async function publishMCQTest(input: {
  title: string;
  grade: GradeLevel;
  subject: SubjectName;
  topic: string;
  difficulty: DifficultyTier;
  durationMinutes: number;
  marksPerQuestion?: number;
  questions: MCQQuestion[];
  deliveryMode: TestDeliveryOverride;
  isActive: boolean;
  scheduledReleaseAt: string;
  createdBy: string;
  createdByName: string;
  createdByRole: 'teacher' | 'admin' | 'student_practice';
}): Promise<MCQTest> {
  const id = generateSafeId('test');
  const cleanQuestions = input.questions.slice(0, 50);
  const cleanMarks = Number(input.marksPerQuestion);
  const marksPerQuestion =
    Number.isFinite(cleanMarks) && cleanMarks >= 0.25 && cleanMarks <= 10
      ? Math.round(cleanMarks * 100) / 100
      : 1;
  const testDoc: MCQTest = {
    id,
    title: input.title.trim().slice(0, MAX_TITLE_LENGTH) || `${input.grade} ${input.subject} Assessment`,
    grade: input.grade,
    subject: input.subject,
    topic: input.topic.trim().slice(0, MAX_TOPIC_LENGTH),
    difficulty: input.difficulty,
    durationMinutes: Math.min(Math.max(Math.round(input.durationMinutes), 1), 180),
    questionCount: cleanQuestions.length,
    marksPerQuestion,
    questions: cleanQuestions,
    deliveryMode: input.deliveryMode,
    isActive: input.isActive,
    scheduledReleaseAt: input.scheduledReleaseAt.trim().slice(0, 64),
    createdBy: input.createdBy,
    createdByName: input.createdByName.trim().slice(0, MAX_NAME_LENGTH) || 'Faculty',
    createdByRole: input.createdByRole,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'tests', id), testDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `tests/${id}`);
  }
  return testDoc;
}

export async function toggleTestActiveStatus(testId: string, isActive: boolean): Promise<void> {
  try {
    await updateDoc(doc(db, 'tests', testId), {
      isActive,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tests/${testId}`);
  }
}

export async function updateTestDeliveryOverride(
  testId: string,
  deliveryMode: TestDeliveryOverride,
): Promise<void> {
  try {
    await updateDoc(doc(db, 'tests', testId), {
      deliveryMode,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tests/${testId}`);
  }
}

export async function deleteMCQTest(testId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tests', testId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tests/${testId}`);
  }
}

export async function submitTestAttempt(input: {
  test: MCQTest;
  studentId: string;
  studentName: string;
  studentIdentifier: string;
  answers: number[];
  globalSettings: SystemSettings;
}): Promise<TestAttempt> {
  const id = generateSafeId('attempt');
  const totalQuestions = input.test.questions.length;
  let score = 0;
  input.test.questions.forEach((q, idx) => {
    if (input.answers[idx] === q.correctIndex) {
      score += 1;
    }
  });
  const marksPerQuestion = input.test.marksPerQuestion ?? 1;
  const obtainedMarks = Math.round(score * marksPerQuestion * 100) / 100;
  const totalMarks = Math.round(totalQuestions * marksPerQuestion * 100) / 100;
  const percentage = Math.round((score / totalQuestions) * 1000) / 10;

  const effectiveMode: ResultMode =
    input.test.deliveryMode === 'inherit'
      ? input.globalSettings.resultMode
      : input.test.deliveryMode;

  const isInstant = effectiveMode === 'instant';

  const attemptDoc: TestAttempt = {
    id,
    testId: input.test.id,
    testTitle: input.test.title.slice(0, MAX_TITLE_LENGTH),
    testCreatorId: input.test.createdBy,
    grade: input.test.grade,
    subject: input.test.subject,
    studentId: input.studentId,
    studentName: input.studentName.trim().slice(0, MAX_NAME_LENGTH) || 'Student',
    studentIdentifier: input.studentIdentifier.trim().slice(0, 64),
    answers: input.answers.slice(0, totalQuestions),
    score,
    totalQuestions,
    marksPerQuestion,
    obtainedMarks,
    totalMarks,
    percentage,
    deliveryModeUsed: effectiveMode,
    resultReleased: isInstant,
    status: isInstant ? 'reviewed' : 'submitted',
    releasedBy: isInstant ? 'system_instant' : '',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'attempts', id), attemptDoc);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `attempts/${id}`);
  }
  return attemptDoc;
}

export async function releaseAttemptResult(attemptId: string, adminOrTeacherUid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'attempts', attemptId), {
      resultReleased: true,
      status: 'reviewed',
      releasedBy: adminOrTeacherUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `attempts/${attemptId}`);
  }
}

export async function updateAccountApproval(input: {
  uid: string;
  email: string;
  status: AccountStatus;
  role?: UserRole;
  adminUid: string;
}): Promise<void> {
  const payload: Record<string, unknown> = {
    status: input.status,
    approvedBy: input.adminUid,
    updatedAt: serverTimestamp(),
  };
  if (input.role) {
    payload.role = input.role;
  }

  try {
    await updateDoc(doc(db, 'users', input.uid), payload);
    if (input.role === 'admin' && input.status === 'approved') {
      await setDoc(doc(db, 'admins', input.uid), {
        uid: input.uid,
        email: input.email,
        grantedBy: input.adminUid,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${input.uid}`);
  }
}

export async function saveSystemSettings(
  settings: Omit<SystemSettings, 'updatedAt' | 'updatedBy'>,
  adminUid: string,
): Promise<void> {
  try {
    await setDoc(doc(db, 'systemSettings', 'global'), {
      ...settings,
      defaultTimeLimitMinutes: Math.min(Math.max(Math.round(settings.defaultTimeLimitMinutes), 1), 180),
      passingPercentage: Math.min(Math.max(Math.round(settings.passingPercentage), 1), 100),
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'systemSettings/global');
  }
}

export { collection };
