import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Lock,
  LogOut,
  Play,
  ShieldAlert,
  ShieldCheck,
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
  MCQTest,
  SUBJECT_GROUPS,
  SubjectName,
  TestAttempt,
  getAttemptBreakdown,
} from '../types';
import { TestRunner } from './TestRunner';
import { DeveloperFooter } from './DeveloperFooter';

interface SubjectAccentStyle {
  bar: string;
  border: string;
  label: string;
  button: string;
}

const BLUE_ACCENT: SubjectAccentStyle = {
  bar: 'from-blue-600 to-indigo-600',
  border: 'border-blue-200/80',
  label: 'text-blue-700',
  button: 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800',
};

const TEAL_ACCENT: SubjectAccentStyle = {
  bar: 'from-teal-600 to-emerald-600',
  border: 'border-teal-200/80',
  label: 'text-teal-700',
  button: 'bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800',
};

const EMERALD_ACCENT: SubjectAccentStyle = {
  bar: 'from-emerald-600 to-green-600',
  border: 'border-emerald-200/80',
  label: 'text-emerald-700',
  button: 'bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800',
};

const AMBER_ACCENT: SubjectAccentStyle = {
  bar: 'from-amber-500 to-orange-600',
  border: 'border-amber-200/80',
  label: 'text-amber-700',
  button: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
};

const INDIGO_ACCENT: SubjectAccentStyle = {
  bar: 'from-indigo-600 to-purple-600',
  border: 'border-indigo-200/80',
  label: 'text-indigo-700',
  button: 'bg-gradient-to-r from-indigo-700 to-purple-700 hover:from-indigo-800 hover:to-purple-800',
};

const ROSE_ACCENT: SubjectAccentStyle = {
  bar: 'from-rose-600 to-pink-600',
  border: 'border-rose-200/80',
  label: 'text-rose-700',
  button: 'bg-gradient-to-r from-rose-700 to-pink-700 hover:from-rose-800 hover:to-pink-800',
};

function getSubjectAccent(subject: SubjectName): SubjectAccentStyle {
  if (subject === 'Physics' || subject === 'Computer Science') return BLUE_ACCENT;
  if (subject === 'Chemistry' || subject === 'General Science') return TEAL_ACCENT;
  if (
    subject === 'Biology' ||
    subject === 'Pakistan Studies' ||
    subject === 'Geography' ||
    subject === 'Islamiat' ||
    subject === 'Islamic Studies'
  ) {
    return EMERALD_ACCENT;
  }
  if (subject === 'Math' || subject === 'General Math' || subject === 'Economics') {
    return AMBER_ACCENT;
  }
  if (subject === 'Urdu' || subject === 'Home Economics') {
    return ROSE_ACCENT;
  }
  return INDIGO_ACCENT;
}

function parseTimestampMs(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const ms = new Date(trimmed).getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === 'object') {
    const maybeTs = value as { toDate?: () => Date; seconds?: number };
    if (typeof maybeTs.toDate === 'function') {
      const ms = maybeTs.toDate().getTime();
      return Number.isNaN(ms) ? null : ms;
    }
    if (typeof maybeTs.seconds === 'number') {
      return maybeTs.seconds * 1000;
    }
  }
  return null;
}

function getScheduledStartMs(test: MCQTest): number | null {
  return parseTimestampMs(test.scheduledReleaseAt);
}

function getScheduledEndMs(test: MCQTest): number | null {
  return parseTimestampMs(test.scheduledEndAt);
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
  const [activeTab, setActiveTab] = useState<'tests' | 'previous' | 'results'>('tests');
  const [subjectFilter, setSubjectFilter] = useState<SubjectName | 'All'>('All');

  const [activeTests, setActiveTests] = useState<MCQTest[]>([]);
  const [attempts, setAttempts] = useState<TestAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
        setLoadError(null);
        setLoading(false);
      },
      (error) => {
        setLoading(false);
        setLoadError('Unable to load examinations right now. Please refresh or contact your administrator.');
        try {
          handleFirestoreError(error, OperationType.LIST, 'tests');
        } catch (err) {
          console.error(err);
        }
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
        try {
          handleFirestoreError(error, OperationType.LIST, 'attempts');
        } catch (err) {
          console.error(err);
        }
      },
    );

    return () => {
      unsubTests();
      unsubAttempts();
    };
  }, [userProfile]);

  const studentGrade = userProfile?.grade;

  const attemptsByTestId = useMemo(() => {
    const map = new Map<string, TestAttempt>();
    attempts.forEach((a) => {
      if (!map.has(a.testId)) {
        map.set(a.testId, a);
      }
    });
    return map;
  }, [attempts]);

  const activeTestsById = useMemo(() => {
    const map = new Map<string, MCQTest>();
    activeTests.forEach((t) => map.set(t.id, t));
    return map;
  }, [activeTests]);

  const eligibleClassTests = useMemo(() => {
    const normalizedStudentGrade = studentGrade?.trim();
    return activeTests
      .filter((t) => t.isActive === true && t.createdByRole !== 'student_practice')
      .filter((t) => {
        if (!normalizedStudentGrade || normalizedStudentGrade === 'All') return true;
        const allowed =
          t.allowedGrades && t.allowedGrades.length > 0 ? t.allowedGrades : [t.grade];
        return allowed.some((g) => String(g).trim() === normalizedStudentGrade);
      });
  }, [activeTests, studentGrade]);

  const allPendingToTakeTests = useMemo(() => {
    return eligibleClassTests
      .filter((t) => {
        const endMs = getScheduledEndMs(t);
        return endMs === null || nowMs <= endMs;
      })
      .filter((t) => !attemptsByTestId.has(t.id));
  }, [eligibleClassTests, nowMs, attemptsByTestId]);

  const permittedTests = useMemo(() => {
    return allPendingToTakeTests
      .filter((t) => (subjectFilter === 'All' ? true : t.subject === subjectFilter))
      .sort((a, b) => {
        const aStart = getScheduledStartMs(a) ?? 0;
        const bStart = getScheduledStartMs(b) ?? 0;
        const aLocked = aStart > nowMs;
        const bLocked = bStart > nowMs;
        if (aLocked !== bLocked) return aLocked ? 1 : -1;
        return aStart - bStart;
      });
  }, [allPendingToTakeTests, subjectFilter, nowMs]);

  const upcomingScheduledTests = useMemo(() => {
    return permittedTests
      .filter((t) => {
        const startMs = getScheduledStartMs(t);
        return startMs !== null && startMs > nowMs;
      })
      .sort((a, b) => (getScheduledStartMs(a) ?? 0) - (getScheduledStartMs(b) ?? 0));
  }, [permittedTests, nowMs]);

  const allMissedTests = useMemo(() => {
    return eligibleClassTests
      .filter((t) => {
        const endMs = getScheduledEndMs(t);
        if (endMs === null || nowMs <= endMs) return false;
        return !attemptsByTestId.has(t.id);
      })
      .sort((a, b) => (getScheduledEndMs(b) ?? 0) - (getScheduledEndMs(a) ?? 0));
  }, [eligibleClassTests, nowMs, attemptsByTestId]);

  const totalResultsCount = attempts.length + allMissedTests.length;

  const resultAttendanceRows = useMemo(() => {
    type StudentRow =
      | { kind: 'attempt'; sortMs: number; attempt: TestAttempt }
      | { kind: 'absent'; sortMs: number; test: MCQTest; endMs: number };

    const rows: StudentRow[] = attempts.map((attempt) => ({
      kind: 'attempt',
      sortMs: parseTimestampMs(attempt.submittedAt) ?? 0,
      attempt,
    }));

    allMissedTests.forEach((test) => {
      const endMs = getScheduledEndMs(test) ?? 0;
      rows.push({
        kind: 'absent',
        sortMs: endMs,
        test,
        endMs,
      });
    });

    rows.sort((a, b) => b.sortMs - a.sortMs);
    return rows;
  }, [attempts, allMissedTests]);

  const filteredPreviousRows = useMemo(() => {
    if (subjectFilter === 'All') return resultAttendanceRows;
    return resultAttendanceRows.filter((row) =>
      row.kind === 'attempt'
        ? row.attempt.subject === subjectFilter
        : row.test.subject === subjectFilter,
    );
  }, [resultAttendanceRows, subjectFilter]);

  function handleOpenAttemptReview(attempt: TestAttempt) {
    if (!attempt.resultReleased || attempt.autoCancelled) return;
    const matchedTest = activeTestsById.get(attempt.testId);
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
        <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-teal-500 to-amber-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 md:h-16 flex items-center justify-between gap-4 md:gap-8">
          <div className="font-display text-base sm:text-lg font-bold text-slate-900 whitespace-nowrap shrink-0 inline-flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-xs bg-gradient-to-br from-blue-600 to-indigo-600 shrink-0" />
            <span>MeritExam</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                activeTab === 'tests'
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Upcoming &amp; Open Tests ({allPendingToTakeTests.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('previous')}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                activeTab === 'previous'
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Previous Tests ({totalResultsCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('results')}
              className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                activeTab === 'results'
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              Results &amp; Attendance ({totalResultsCount})
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
        <nav aria-label="Student sections" className="grid grid-cols-3 gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setActiveTab('tests')}
            className={`px-2.5 py-2.5 text-xs font-semibold rounded-lg border text-center whitespace-nowrap truncate cursor-pointer transition-colors tabular-nums ${
              activeTab === 'tests'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            To Take ({allPendingToTakeTests.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('previous')}
            className={`px-2.5 py-2.5 text-xs font-semibold rounded-lg border text-center whitespace-nowrap truncate cursor-pointer transition-colors tabular-nums ${
              activeTab === 'previous'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Previous ({totalResultsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-2.5 py-2.5 text-xs font-semibold rounded-lg border text-center whitespace-nowrap truncate cursor-pointer transition-colors tabular-nums ${
              activeTab === 'results'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Results ({totalResultsCount})
          </button>
        </nav>

        {/* Student Identity & Active Mode Banner */}
        <div className="bg-white border border-blue-200/80 rounded-xl overflow-hidden shadow-xs">
          <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 to-indigo-600" />
          <div className="bg-gradient-to-r from-blue-50/70 via-white to-teal-50/50 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-slate-900">
                {userProfile.fullName}
              </h1>
              <p className="text-sm text-slate-600 mt-1">
                Verified Student · Class <span className="font-semibold text-blue-800">{userProfile.grade}</span> · Roll ID:{' '}
                <span className="font-mono font-semibold text-slate-800">{userProfile.identifier || 'Registered'}</span>
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-xs text-slate-500">Admin Examination Policy</p>
              <p className="text-sm font-semibold text-blue-800 mt-0.5">
                {systemSettings.resultMode === 'instant'
                  ? 'Option 1: Instant Score & Explanation Mode'
                  : 'Option 2: Controlled / Admin Result Release Mode'}
              </p>
            </div>
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
                        {nextTest.grade} · {nextTest.subject} · {nextTest.questionCount} MCQs
                        {(nextTest.shortQuestions?.length ?? 0) > 0
                          ? ` + ${nextTest.shortQuestions!.length} Short`
                          : ''}
                        {(nextTest.longQuestions?.length ?? 0) > 0
                          ? ` + ${nextTest.longQuestions!.length} Long`
                          : ''}{' '}
                        · {nextTest.durationMinutes} min duration
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

            {/* Permitted Upcoming & Open Tests Filter & Grid */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    Tests To Take (Active &amp; Upcoming)
                  </h2>
                  <p className="text-xs text-slate-500">
                    Showing only upcoming and currently open examinations for Class {userProfile.grade}. Completed and expired tests are in Previous Tests.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('previous')}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer tabular-nums transition-colors"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Previous Tests ({totalResultsCount})
                  </button>

                  <select
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value as SubjectName | 'All')}
                    aria-label="Filter by subject"
                    className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg"
                  >
                    <option value="All">All Subjects (Sciences & Arts)</option>
                    {SUBJECT_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.subjects.map((subj) => (
                          <option key={subj} value={subj}>
                            {subj}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-sm text-slate-500">
                  Loading permitted assessments...
                </div>
              ) : loadError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
                  <ShieldAlert className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-red-900">{loadError}</p>
                </div>
              ) : permittedTests.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                  <BookOpen className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      No upcoming or open examinations remaining for Class {userProfile.grade}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Only pending examinations permitted by your teacher or administrator appear here.
                    </p>
                  </div>
                  {totalResultsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('previous')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      View All Previous Tests ({totalResultsCount})
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {permittedTests.map((test) => {
                    const effectiveMode =
                      test.deliveryMode === 'inherit'
                        ? systemSettings.resultMode
                        : test.deliveryMode;
                    const startMs = getScheduledStartMs(test);
                    const endMs = getScheduledEndMs(test);
                    const isScheduledLocked = startMs !== null && startMs > nowMs;
                    const countdown = isScheduledLocked
                      ? formatCountdownParts(startMs - nowMs)
                      : null;
                    const closingCountdown =
                      !isScheduledLocked && endMs !== null && endMs > nowMs
                        ? formatCountdownParts(endMs - nowMs)
                        : null;

                    const subjectAccent = getSubjectAccent(test.subject);

                    return (
                      <div
                        key={test.id}
                        className={`bg-white border ${subjectAccent.border} rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between`}
                      >
                        <div className={`h-1.5 w-full bg-gradient-to-r ${subjectAccent.bar}`} />

                        {/* Prominent Paper Time Window Bar at Top of Card */}
                        <div
                          className={`px-4 py-2.5 border-b text-[11px] space-y-1 ${
                            isScheduledLocked
                              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                              : endMs !== null
                                ? 'bg-blue-50/80 border-blue-200 text-slate-800'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 font-semibold">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarClock className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                              Paper Time ({test.durationMinutes} min)
                            </span>
                            {isScheduledLocked && countdown ? (
                              <span className="text-amber-800 tabular-nums">
                                Starts in {countdown.days > 0 ? `${countdown.days}d ` : ''}
                                {countdown.hours}:{countdown.minutes}:{countdown.seconds}
                              </span>
                            ) : closingCountdown ? (
                              <span className="text-red-700 tabular-nums">
                                Closes in {closingCountdown.days > 0 ? `${closingCountdown.days}d ` : ''}
                                {closingCountdown.hours}:{closingCountdown.minutes}:{closingCountdown.seconds}
                              </span>
                            ) : (
                              <span className="text-emerald-700">Open Now</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-[11px] text-slate-600 tabular-nums">
                            <span>
                              Start:{' '}
                              <strong className="text-slate-900">
                                {startMs !== null ? new Date(startMs).toLocaleString() : 'Open Now'}
                              </strong>
                            </span>
                            {endMs !== null && (
                              <span>
                                Ends:{' '}
                                <strong className="text-slate-900">
                                  {new Date(endMs).toLocaleString()}
                                </strong>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className={`text-xs font-bold uppercase tracking-wide mb-1.5 ${subjectAccent.label}`}>
                              {test.board === 'punjab_ptb' ? 'Punjab Board' : 'Federal NBF'} · {test.grade} · {test.subject} · {test.difficulty}
                            </div>
                            {(test.schoolName || test.examLabel || test.paperDate) && (
                              <p className="text-[11px] font-semibold text-slate-700 mb-1 truncate">
                                {[test.schoolName, test.examLabel, test.paperDate].filter(Boolean).join(' · ')}
                              </p>
                            )}
                            <h3 className="font-display text-base font-bold text-slate-900 leading-snug">
                              {test.title}
                            </h3>
                            {test.topic && (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                                Topic: {test.topic}
                              </p>
                            )}

                            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs text-slate-600 tabular-nums">
                              <span>
                                {test.questionCount} MCQs
                                {(test.shortQuestions?.length ?? 0) > 0
                                  ? ` · ${test.shortQuestions!.length} Short`
                                  : ''}
                                {(test.longQuestions?.length ?? 0) > 0
                                  ? ` · ${test.longQuestions!.length} Long`
                                  : ''}
                              </span>
                              <span>{test.durationMinutes} min</span>
                              <span className="col-span-2 text-slate-500">
                                By {test.createdByName} ·{' '}
                                {effectiveMode === 'instant' ? 'Instant Result' : 'Admin Review'}
                              </span>
                            </div>
                          </div>

                          <div className="mt-5">
                            {(() => {
                              const prevAttempt = attemptsByTestId.get(test.id);
                              if (prevAttempt) {
                                if (prevAttempt.autoCancelled) {
                                  return (
                                    <div className="w-full py-2.5 px-3 bg-red-50 border border-red-200 rounded-lg text-center space-y-1">
                                      <div className="text-xs font-bold text-red-800 inline-flex items-center gap-1.5 justify-center">
                                        <ShieldAlert className="w-3.5 h-3.5" />
                                        <span>Paper Cancelled &amp; Auto-Submitted</span>
                                      </div>
                                      <div className="text-[11px] text-red-700">
                                        Screen Lock was broken · Retake blocked
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div className="w-full py-2.5 px-3 bg-emerald-50 border border-emerald-200 rounded-lg text-center space-y-1">
                                    <div className="text-xs font-semibold text-emerald-800 inline-flex items-center gap-1.5 justify-center">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Paper Already Submitted</span>
                                    </div>
                                    {prevAttempt.resultReleased && (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAttemptReview(prevAttempt)}
                                        className="text-[11px] font-semibold text-blue-700 hover:underline cursor-pointer"
                                      >
                                        View Answer Key
                                      </button>
                                    )}
                                  </div>
                                );
                              }

                              if (isScheduledLocked && countdown && startMs !== null) {
                                return (
                                  <div className="w-full py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-lg text-center space-y-1">
                                    <div className="text-xs font-semibold text-amber-900 inline-flex items-center gap-1.5 justify-center">
                                      <Lock className="w-3.5 h-3.5" />
                                      <span className="tabular-nums">
                                        Starts in {countdown.days > 0 ? `${countdown.days}d ` : ''}
                                        {countdown.hours}h : {countdown.minutes}m : {countdown.seconds}s
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-amber-700">
                                      Unlocks at {new Date(startMs).toLocaleString()}
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewingAttempt(null);
                                    setRunningTest(test);
                                  }}
                                  className={`w-full py-2 px-4 text-sm font-semibold text-white ${subjectAccent.button} rounded-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer`}
                                >
                                  <ShieldCheck className="w-4 h-4" />
                                  <Play className="w-3.5 h-3.5" />
                                  Begin Test (Screen Lock)
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'previous' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  Previous Tests Archive ({filteredPreviousRows.length})
                </h2>
                <p className="text-xs text-slate-500">
                  All previously submitted, auto-cancelled, and missed examinations for Class {userProfile.grade}.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('tests')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer tabular-nums transition-colors"
                >
                  <Play className="w-3.5 h-3.5" />
                  Upcoming &amp; Open ({allPendingToTakeTests.length})
                </button>

                <select
                  value={subjectFilter}
                  onChange={(e) => setSubjectFilter(e.target.value as SubjectName | 'All')}
                  aria-label="Filter previous tests by subject"
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg"
                >
                  <option value="All">All Subjects (Sciences & Arts)</option>
                  {SUBJECT_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.subjects.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>

            {filteredPreviousRows.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    No previous tests recorded yet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Completed, cancelled, and expired tests will appear here automatically.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('tests')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                >
                  Back to Upcoming &amp; Open Tests
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPreviousRows.map((row) => {
                  if (row.kind === 'absent') {
                    const { test, endMs } = row;
                    const totalQs = test.questionCount || test.questions?.length || 0;
                    const totalMarks =
                      Math.round(
                        totalQs *
                          (test.marksPerQuestion ?? 1) *
                          100,
                      ) / 100;
                    return (
                      <div
                        key={`prev_absent_${test.id}`}
                        className="bg-white border border-red-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between"
                      >
                        <div className="h-1.5 w-full bg-gradient-to-r from-red-500 to-rose-600" />
                        <div className="p-5 space-y-2.5 flex-1">
                          <div className="text-xs font-medium text-red-700">
                            {test.board === 'punjab_ptb' ? 'Punjab Board' : 'Federal NBF'} · {test.grade} · {test.subject} · Absent (Missed)
                          </div>
                          <h3 className="font-display text-base font-bold text-slate-900 leading-snug">
                            {test.title}
                          </h3>
                          {endMs > 0 && (
                            <p className="text-xs text-red-700 tabular-nums">
                              Window Closed: <span className="font-semibold">{new Date(endMs).toLocaleString()}</span>
                            </p>
                          )}
                          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600 tabular-nums">
                            <div className="flex items-center justify-between">
                              <span>
                                Score: <strong className="text-red-700">0 / {totalMarks} (0%)</strong>
                              </span>
                              <span>{test.durationMinutes} min</span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                              <div>
                                <span className="text-slate-500 block">Attempted</span>
                                <strong className="text-slate-900">0</strong>
                              </div>
                              <div>
                                <span className="text-emerald-700 block">Correct</span>
                                <strong className="text-emerald-700">0</strong>
                              </div>
                              <div>
                                <span className="text-red-700 block">Wrong</span>
                                <strong className="text-red-700">0</strong>
                              </div>
                              <div>
                                <span className="text-amber-800 block">Left</span>
                                <strong className="text-amber-700">{totalQs}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="px-5 py-3 bg-red-50/80 border-t border-red-100 text-xs font-semibold text-red-800 inline-flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          Not Attempted Before Closing Time
                        </div>
                      </div>
                    );
                  }

                  const { attempt, sortMs } = row;
                  const linkedTest = activeTestsById.get(attempt.testId);
                  const accent = getSubjectAccent(attempt.subject);
                  const breakdown = getAttemptBreakdown(attempt);
                  const scoreText = attempt.resultReleased
                    ? `${attempt.obtainedMarks ?? attempt.score} / ${attempt.totalMarks ?? attempt.totalQuestions} (${attempt.percentage}%)`
                    : 'Held Until Admin Release';

                  return (
                    <div
                      key={`prev_attempt_${attempt.id}`}
                      className={`bg-white border ${attempt.autoCancelled ? 'border-orange-200' : accent.border} rounded-xl overflow-hidden shadow-xs flex flex-col justify-between`}
                    >
                      <div
                        className={`h-1.5 w-full bg-gradient-to-r ${
                          attempt.autoCancelled ? 'from-orange-500 to-red-600' : accent.bar
                        }`}
                      />
                      <div className="p-5 space-y-2.5 flex-1">
                        <div className={`text-xs font-medium ${attempt.autoCancelled ? 'text-orange-700' : accent.label}`}>
                          {attempt.grade} · {attempt.subject} ·{' '}
                          {attempt.autoCancelled ? 'Cancelled (Screen Lock)' : 'Submitted'}
                        </div>
                        <h3 className="font-display text-base font-bold text-slate-900 leading-snug">
                          {attempt.testTitle}
                        </h3>
                        {sortMs > 0 && (
                          <p className="text-xs text-slate-500 tabular-nums">
                            Submitted: {new Date(sortMs).toLocaleString()}
                          </p>
                        )}
                        <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600 tabular-nums">
                          <div className="flex items-center justify-between">
                            <span>
                              Score: <strong className="text-slate-900">{scoreText}</strong>
                            </span>
                            <span>{breakdown.total} Qs</span>
                          </div>
                          {breakdown.total > 0 && (
                            attempt.resultReleased && !attempt.autoCancelled ? (
                              <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-[11px]">
                                <div>
                                  <span className="text-slate-500 block">Attempted</span>
                                  <strong className="text-slate-900">{breakdown.attempted}</strong>
                                </div>
                                <div>
                                  <span className="text-emerald-700 block">Correct</span>
                                  <strong className="text-emerald-700">{breakdown.correct}</strong>
                                </div>
                                <div>
                                  <span className="text-red-700 block">Wrong</span>
                                  <strong className="text-red-700">{breakdown.wrong}</strong>
                                </div>
                                <div>
                                  <span className="text-amber-800 block">Left</span>
                                  <strong className="text-amber-700">{breakdown.skipped}</strong>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                                <span>
                                  Attempted: <strong className="text-slate-900">{breakdown.attempted} / {breakdown.total}</strong>
                                </span>
                                <span>
                                  Left: <strong className="text-amber-700">{breakdown.skipped}</strong>
                                </span>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70">
                        {attempt.autoCancelled ? (
                          <div className="text-xs font-semibold text-orange-800 inline-flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            Auto-Cancelled (Left Screen)
                          </div>
                        ) : attempt.resultReleased && linkedTest ? (
                          <button
                            type="button"
                            onClick={() => handleOpenAttemptReview(attempt)}
                            className="w-full py-2 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            View Answer Key &amp; Score
                          </button>
                        ) : (
                          <div className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            {attempt.resultReleased ? 'Paper Archived · Result Recorded' : 'Pending Admin Result Release'}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Total Class Tests Recorded</p>
                <p className="font-display text-2xl font-bold text-slate-900 tabular-nums mt-1">
                  {totalResultsCount}
                </p>
              </div>
              <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-xs">
                <p className="text-xs font-medium text-emerald-700">Present / Submitted</p>
                <p className="font-display text-2xl font-bold text-emerald-700 tabular-nums mt-1">
                  {attempts.filter((a) => !a.autoCancelled).length}
                </p>
              </div>
              <div className="bg-white border border-red-200 rounded-xl p-4 shadow-xs">
                <p className="text-xs font-medium text-red-700">Absent (Missed)</p>
                <p className="font-display text-2xl font-bold text-red-700 tabular-nums mt-1">
                  {allMissedTests.length}
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="font-display text-lg font-semibold text-slate-900">
                  My Submitted &amp; Missed Assessments
                </h2>
              </div>

              {resultAttendanceRows.length === 0 ? (
                <div className="p-10 text-center">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No tests recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Assessment</th>
                        <th className="py-3 px-4">Class · Subject</th>
                        <th className="py-3 px-4">Attendance</th>
                        <th className="py-3 px-4">Score</th>
                        <th className="py-3 px-4">Question Summary</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {resultAttendanceRows.map((row) => {
                        if (row.kind === 'absent') {
                          const { test, endMs } = row;
                          const totalQs = test.questionCount || test.questions?.length || 0;
                          const totalMarks =
                            Math.round(totalQs * (test.marksPerQuestion ?? 1) * 100) /
                            100;
                          return (
                            <tr key={`absent_${test.id}`} className="bg-red-50/30 hover:bg-red-50/60">
                              <td className="py-3 px-4">
                                <div className="font-medium text-slate-900">{test.title}</div>
                                <div className="text-[11px] text-red-700 tabular-nums mt-0.5">
                                  Closed: {new Date(endMs).toLocaleString()}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-600">
                                {test.grade} · {test.subject}
                              </td>
                              <td className="py-3 px-4">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold bg-red-100 text-red-800 border border-red-200 rounded">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  Absent (Missed)
                                </span>
                              </td>
                              <td className="py-3 px-4 tabular-nums font-semibold text-red-700">
                                0 / {totalMarks} (0%)
                              </td>
                              <td className="py-3 px-4 text-xs tabular-nums text-slate-600">
                                <div>Attempted: <strong className="text-slate-900">0 / {totalQs}</strong></div>
                                <div className="text-[11px] mt-0.5">
                                  <span className="text-emerald-700 font-semibold">0 Correct</span> ·{' '}
                                  <span className="text-red-700 font-semibold">0 Wrong</span> ·{' '}
                                  <span className="text-amber-700 font-semibold">{totalQs} Left</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-xs font-semibold text-red-700">
                                Paper Not Attempted
                              </td>
                              <td className="py-3 px-4 text-right">
                                <span className="text-xs text-red-700 inline-flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Time Expired
                                </span>
                              </td>
                            </tr>
                          );
                        }

                        const { attempt } = row;
                        const breakdown = getAttemptBreakdown(attempt);
                        return (
                          <tr key={attempt.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4 font-medium text-slate-900">
                              {attempt.testTitle}
                            </td>
                            <td className="py-3 px-4 text-slate-600">
                              {attempt.grade} · {attempt.subject}
                            </td>
                            <td className="py-3 px-4">
                              {attempt.autoCancelled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200 rounded">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  Cancelled
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 rounded">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Present
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 tabular-nums font-semibold text-slate-900">
                              {attempt.resultReleased
                                ? `${attempt.obtainedMarks ?? attempt.score} / ${attempt.totalMarks ?? attempt.totalQuestions} (${attempt.percentage}%)`
                                : 'Held Until Release'}
                            </td>
                            <td className="py-3 px-4 text-xs tabular-nums text-slate-600 whitespace-nowrap">
                              {breakdown.total === 0 ? (
                                <span className="text-slate-500">Subjective Paper</span>
                              ) : attempt.resultReleased && !attempt.autoCancelled ? (
                                <>
                                  <div>
                                    Attempted: <strong className="text-slate-900">{breakdown.attempted} / {breakdown.total}</strong>
                                  </div>
                                  <div className="text-[11px] mt-0.5">
                                    <span className="text-emerald-700 font-semibold">{breakdown.correct} Correct</span> ·{' '}
                                    <span className="text-red-700 font-semibold">{breakdown.wrong} Wrong</span> ·{' '}
                                    <span className="text-amber-700 font-semibold">{breakdown.skipped} Left</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    Attempted: <strong className="text-slate-900">{breakdown.attempted} / {breakdown.total}</strong>
                                  </div>
                                  <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                    {breakdown.skipped} Left · {attempt.autoCancelled ? 'Cancelled' : 'Key Held'}
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {attempt.autoCancelled && (
                                <div className="text-xs font-semibold text-red-700 inline-flex items-center gap-1 mr-2">
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  Auto-Cancelled (Left Screen)
                                </div>
                              )}
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
                              {attempt.autoCancelled ? (
                                <span className="text-xs text-red-600 inline-flex items-center gap-1">
                                  <Lock className="w-3 h-3" /> Cancelled
                                </span>
                              ) : attempt.resultReleased ? (
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <DeveloperFooter />
    </div>
  );
}
