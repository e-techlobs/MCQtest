import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  LogOut,
  Play,
  RefreshCw,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { OperationType, db, handleFirestoreError } from '../lib/firebase';
import {
  generateMCQsFromServer,
  publishMCQTest,
} from '../services/mcqService';
import {
  CURRICULUM_BOARD_LABEL,
  GRADES,
  GradeLevel,
  MCQTest,
  SUBJECTS,
  SubjectName,
  TestAttempt,
} from '../types';
import { TestRunner } from './TestRunner';

function getScheduledStartMs(test: MCQTest): number | null {
  if (!test.scheduledReleaseAt) return null;
  const ms = new Date(test.scheduledReleaseAt).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function formatCountdownParts(diffMs: number) {
  const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    days,
    hours: pad(hours),
    minutes: pad(minutes),
    seconds: pad(seconds),
    totalHours: pad(days * 24 + hours),
  };
}

export function StudentDashboard() {
  const { userProfile, systemSettings, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'tests' | 'results'>('tests');
  const [gradeFilter, setGradeFilter] = useState<GradeLevel | 'All'>(
    userProfile?.grade && userProfile.grade !== 'All' ? userProfile.grade : 'All',
  );
  const [subjectFilter, setSubjectFilter] = useState<SubjectName | 'All'>('All');

  const [activeTests, setActiveTests] = useState<MCQTest[]>([]);
  const [practiceTests, setPracticeTests] = useState<MCQTest[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  // Instant Subject Practice Launcher state
  const [practiceGrade, setPracticeGrade] = useState<GradeLevel>(
    userProfile?.grade && userProfile.grade !== 'All' ? userProfile.grade : '9th',
  );
  const [practiceSubject, setPracticeSubject] = useState<SubjectName>('Physics');
  const [practiceCount, setPracticeCount] = useState<number>(10);
  const [launchingPractice, setLaunchingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  // Active Test Runner state
  const [runningTest, setRunningTest] = useState<MCQTest | null>(null);
  const [reviewingAttempt, setReviewingAttempt] = useState<TestAttempt | null>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!userProfile) return;

    const testsQuery = query(
      collection(db, 'tests'),
      where('isActive', '==', true),
    );
    const unsubTests = onSnapshot(
      testsQuery,
      (snap) => {
        setActiveTests(snap.docs.map((d) => d.data() as MCQTest));
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'tests');
      },
    );

    const practiceQuery = query(
      collection(db, 'tests'),
      where('createdBy', '==', userProfile.uid),
    );
    const unsubPractice = onSnapshot(
      practiceQuery,
      (snap) => {
        setPracticeTests(snap.docs.map((d) => d.data() as MCQTest));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `tests?createdBy=${userProfile.uid}`);
      },
    );

    const attemptsQuery = query(
      collection(db, 'attempts'),
      where('studentId', '==', userProfile.uid),
    );
    const unsubAttempts = onSnapshot(
      attemptsQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as TestAttempt);
        list.sort((a, b) => {
          const aSec = (a.submittedAt as { seconds?: number } | undefined)?.seconds ?? 0;
          const bSec = (b.submittedAt as { seconds?: number } | undefined)?.seconds ?? 0;
          return bSec - aSec;
        });
        setAttempts(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'attempts');
      },
    );

    return () => {
      unsubTests();
      unsubPractice();
      unsubAttempts();
    };
  }, [userProfile]);

  const tests = useMemo(() => {
    const map = new Map<string, MCQTest>();
    activeTests.forEach((t) => map.set(t.id, t));
    practiceTests.forEach((t) => map.set(t.id, t));
    return Array.from(map.values());
  }, [activeTests, practiceTests]);

  const activeOfficialTests = useMemo(() => {
    return activeTests
      .filter((t) => (gradeFilter === 'All' ? true : t.grade === gradeFilter))
      .filter((t) => (subjectFilter === 'All' ? true : t.subject === subjectFilter));
  }, [activeTests, gradeFilter, subjectFilter]);

  const upcomingScheduledTests = useMemo(() => {
    return activeOfficialTests
      .filter((t) => {
        const startMs = getScheduledStartMs(t);
        return startMs !== null && startMs > nowMs;
      })
      .sort((a, b) => (getScheduledStartMs(a) ?? 0) - (getScheduledStartMs(b) ?? 0));
  }, [activeOfficialTests, nowMs]);

  async function handleStartInstantPractice() {
    if (!userProfile) return;
    setPracticeError(null);
    setLaunchingPractice(true);
    try {
      const generated = await generateMCQsFromServer({
        grade: practiceGrade,
        subject: practiceSubject,
        difficulty: 'Standard',
        questionCount: practiceCount,
      });

      const createdTest = await publishMCQTest({
        title: generated.title,
        grade: practiceGrade,
        subject: practiceSubject,
        topic: 'Instant Subject Assessment',
        difficulty: 'Standard',
        durationMinutes: systemSettings.defaultTimeLimitMinutes || 15,
        questions: generated.questions,
        deliveryMode: 'inherit',
        isActive: false,
        scheduledReleaseAt: '',
        createdBy: userProfile.uid,
        createdByName: userProfile.fullName,
        createdByRole: 'student_practice',
      });

      setRunningTest(createdTest);
    } catch (err) {
      setPracticeError(err instanceof Error ? err.message : 'Unable to start instant test.');
    } finally {
      setLaunchingPractice(false);
    }
  }

  function handleOpenAttemptReview(attempt: TestAttempt) {
    if (!attempt.resultReleased) return;
    const matchedTest = tests.find((t) => t.id === attempt.testId);
    if (!matchedTest) return;
    setReviewingAttempt(attempt);
    setRunningTest(matchedTest);
  }

  if (!userProfile) return null;

  if (runningTest) {
    return (
      <TestRunner
        test={runningTest}
        studentProfile={userProfile}
        systemSettings={systemSettings}
        existingAttempt={reviewingAttempt}
        onExit={() => {
          setRunningTest(null);
          setReviewingAttempt(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          <div className="font-display text-base sm:text-lg font-bold text-slate-900 whitespace-nowrap shrink-0">
            MeritExam
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'tests'
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              MCQ Tests
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'results'
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              My Results ({attempts.length})
            </button>
          </nav>

          <button
            type="button"
            onClick={() => void logout()}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6 flex-1">
        <nav aria-label="Student sections" className="grid grid-cols-2 gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`px-3 py-2.5 text-xs font-semibold rounded-lg border text-center whitespace-nowrap truncate cursor-pointer transition-colors ${
              activeTab === 'tests'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            MCQ Tests
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-3 py-2.5 text-xs font-semibold rounded-lg border text-center whitespace-nowrap truncate cursor-pointer transition-colors ${
              activeTab === 'results'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            My Results ({attempts.length})
          </button>
        </nav>

        {/* Student Identity & Active Mode Banner */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {userProfile.fullName}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Verified Student · Class {userProfile.grade} · Roll ID:{' '}
              <span className="font-mono">{userProfile.identifier || 'Registered'}</span>
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-xs text-slate-500">Admin Examination Policy</p>
            <p className="text-sm font-semibold text-slate-900 mt-0.5">
              {systemSettings.resultMode === 'instant'
                ? 'Option 1: Instant Score & Explanation Mode'
                : 'Option 2: Controlled / Admin Result Release Mode'}
            </p>
          </div>
        </div>

        {activeTab === 'tests' && (
          <div className="space-y-6">
            {/* Big Prominent Upcoming Scheduled Test Countdown Banner */}
            {upcomingScheduledTests.length > 0 && (() => {
              const nextTest = upcomingScheduledTests[0];
              const startMs = getScheduledStartMs(nextTest) ?? nowMs;
              const diffMs = Math.max(0, startMs - nowMs);
              const parts = formatCountdownParts(diffMs);

              return (
                <section
                  aria-label="Upcoming Test Countdown"
                  className="bg-slate-900 text-white rounded-xl p-5 sm:p-7 border border-slate-800"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                      <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>Upcoming Scheduled Examination · Starting Soon</span>
                      </div>
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-snug">
                        {nextTest.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-300">
                        {nextTest.grade} · {nextTest.subject} · {nextTest.questionCount} MCQs (
                        {Math.round(nextTest.questionCount * (nextTest.marksPerQuestion ?? 1) * 100) / 100} Marks) ·{' '}
                        {nextTest.durationMinutes} min duration
                      </p>
                      <p className="text-xs text-slate-400">
                        Scheduled Start Time: <span className="text-white font-medium">{new Date(startMs).toLocaleString()}</span>
                      </p>
                    </div>

                    <div className="shrink-0">
                      <p className="text-xs font-medium text-slate-400 mb-2 lg:text-right">
                        Time Remaining Until Test Starts
                      </p>
                      <div className="grid grid-cols-3 sm:flex items-center gap-2.5 sm:gap-3">
                        {parts.days > 0 && (
                          <div className="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-center min-w-[72px]">
                            <div className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-white">
                              {String(parts.days).padStart(2, '0')}
                            </div>
                            <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">
                              Days
                            </div>
                          </div>
                        )}
                        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-center min-w-[76px]">
                          <div className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-white">
                            {parts.days > 0 ? parts.hours : parts.totalHours}
                          </div>
                          <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">
                            Hours
                          </div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-center min-w-[76px]">
                          <div className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-white">
                            {parts.minutes}
                          </div>
                          <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">
                            Minutes
                          </div>
                        </div>
                        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3.5 py-2.5 text-center min-w-[76px]">
                          <div className="font-display text-2xl sm:text-3xl font-bold tabular-nums text-amber-300">
                            {parts.seconds}
                          </div>
                          <div className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">
                            Seconds
                          </div>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-2 lg:text-right">
                        The Begin Test button unlocks automatically at 00:00:00.
                      </p>
                    </div>
                  </div>

                  {upcomingScheduledTests.length > 1 && (
                    <div className="mt-5 pt-4 border-t border-slate-800 flex flex-wrap gap-3 text-xs text-slate-300">
                      <span className="text-slate-400 font-semibold">Also Scheduled:</span>
                      {upcomingScheduledTests.slice(1).map((extra) => {
                        const extraMs = getScheduledStartMs(extra) ?? nowMs;
                        const extraParts = formatCountdownParts(extraMs - nowMs);
                        return (
                          <span key={extra.id} className="bg-slate-800 px-2.5 py-1 rounded-md tabular-nums">
                            {extra.title} ({extra.grade} {extra.subject}) — {extraParts.totalHours}h {extraParts.minutes}m {extraParts.seconds}s
                          </span>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })()}

            {/* Instant Subject MCQ Launcher (when allowed by Admin) */}
            {systemSettings.allowStudentInstantPractice && (
              <div className="bg-white border border-slate-200 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-slate-900">
                      Instant Subject MCQ Test
                    </h2>
                    <p className="text-xs text-slate-500">
                      {CURRICULUM_BOARD_LABEL} · Choose your class and subject to launch a fresh examination immediately.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Class
                    </label>
                    <select
                      value={practiceGrade}
                      onChange={(e) => setPracticeGrade(e.target.value as GradeLevel)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      {GRADES.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Subject
                    </label>
                    <select
                      value={practiceSubject}
                      onChange={(e) => setPracticeSubject(e.target.value as SubjectName)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Questions
                    </label>
                    <select
                      value={practiceCount}
                      onChange={(e) => setPracticeCount(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg tabular-nums"
                    >
                      {[5, 10, 15, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} MCQs
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    disabled={launchingPractice}
                    onClick={() => void handleStartInstantPractice()}
                    className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer h-[38px]"
                  >
                    {launchingPractice ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Preparing MCQs...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Start Subject Test
                      </>
                    )}
                  </button>
                </div>

                {practiceError && (
                  <p className="mt-3 text-sm text-red-700">{practiceError}</p>
                )}
              </div>
            )}

            {/* Published Tests Filter & Grid */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Published Class Assessments
                </h2>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value as GradeLevel | 'All')}
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="All">All Classes</option>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
                    {(['All', ...SUBJECTS] as const).map((subj) => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => setSubjectFilter(subj)}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                          subjectFilter === subj
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                  Loading published assessments...
                </div>
              ) : activeOfficialTests.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-slate-800">
                    No published faculty tests match this filter yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {systemSettings.allowStudentInstantPractice
                      ? 'Use the Instant Subject MCQ Test launcher above or switch class/subject filters.'
                      : 'Wait for your teacher or administrator to publish an assessment.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {activeOfficialTests.map((test) => {
                    const effectiveMode =
                      test.deliveryMode === 'inherit'
                        ? systemSettings.resultMode
                        : test.deliveryMode;
                    const startMs = getScheduledStartMs(test);
                    const isScheduledLocked = startMs !== null && startMs > nowMs;
                    const countdown = isScheduledLocked
                      ? formatCountdownParts(startMs - nowMs)
                      : null;

                    return (
                      <div
                        key={test.id}
                        className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-xs text-slate-500 mb-1.5">
                            {test.grade} · {test.subject} · {test.difficulty}
                          </div>
                          <h3 className="font-display text-base font-semibold text-slate-900 leading-snug">
                            {test.title}
                          </h3>
                          {test.topic && (
                            <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                              Topic: {test.topic}
                            </p>
                          )}

                          <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600 tabular-nums">
                            <span>
                              {test.questionCount} MCQs · {Math.round(test.questionCount * (test.marksPerQuestion ?? 1) * 100) / 100} Marks
                            </span>
                            <span>{test.durationMinutes} min</span>
                            <span className="col-span-2 text-slate-500">
                              By {test.createdByName} ·{' '}
                              {effectiveMode === 'instant' ? 'Instant Result' : 'Admin Review'}
                            </span>
                          </div>
                        </div>

                        <div className="mt-5">
                          {isScheduledLocked && countdown && startMs !== null ? (
                            <div className="w-full py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-lg text-center space-y-1">
                              <div className="text-xs font-semibold text-amber-900 inline-flex items-center gap-1.5 justify-center">
                                <Lock className="w-3.5 h-3.5" />
                                <span className="tabular-nums">
                                  Starts in {countdown.days > 0 ? `${countdown.days}d ` : ''}
                                  {countdown.hours}h : {countdown.minutes}m : {countdown.seconds}s
                                </span>
                              </div>
                              <div className="text-[11px] text-amber-700">
                                {new Date(startMs).toLocaleString()}
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setReviewingAttempt(null);
                                setRunningTest(test);
                              }}
                              className="w-full py-2 px-4 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Play className="w-4 h-4" />
                              Begin Test
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                My Submitted Assessments
              </h2>
            </div>

            {attempts.length === 0 ? (
              <div className="p-10 text-center">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600">No tests submitted yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Assessment</th>
                      <th className="py-3 px-4">Class · Subject</th>
                      <th className="py-3 px-4">Score</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {attempt.testTitle}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {attempt.grade} · {attempt.subject}
                        </td>
                        <td className="py-3 px-4 tabular-nums font-semibold text-slate-900">
                          {attempt.resultReleased
                            ? `${attempt.obtainedMarks ?? attempt.score} / ${attempt.totalMarks ?? attempt.totalQuestions} (${attempt.percentage}%)`
                            : 'Held Until Release'}
                        </td>
                        <td className="py-3 px-4">
                          {attempt.resultReleased ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Released
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                              <Clock className="w-3.5 h-3.5" />
                              Pending Admin Release
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {attempt.resultReleased ? (
                            <button
                              type="button"
                              onClick={() => handleOpenAttemptReview(attempt)}
                              className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                            >
                              View Answer Key
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 inline-flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
