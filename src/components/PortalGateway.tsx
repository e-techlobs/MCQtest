import React, { useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { GRADES, GRADE_LABELS, SUBJECTS, UserRole } from '../types';

interface PortalGatewayProps {
  onSelectPortal: (role: UserRole, initialMode?: 'login' | 'register') => void;
}

export function PortalGateway({ onSelectPortal }: PortalGatewayProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            MeritExam
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#portals" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Portals
            </a>
            <a href="#curriculum" className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0">
              Curriculum
            </a>
            <button
              type="button"
              onClick={() => onSelectPortal('student', 'login')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Student Login
            </button>
            <button
              type="button"
              onClick={() => onSelectPortal('teacher', 'login')}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Teacher Login
            </button>
          </nav>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => onSelectPortal('admin', 'login')}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Admin Portal
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-blue-700 mb-3">
                9th Grade · 10th Grade · 1st A (1st Year) · 2nd Year
              </p>
              <h1
                className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12] mb-5"
                style={{ textWrap: 'balance' }}
              >
                Subject-driven MCQ examinations with verified academic governance
              </h1>
              <p className="text-base text-slate-600 leading-relaxed max-w-xl mb-8">
                Select a class level (9th, 10th, 1st A, or 2nd Year) and subject—Physics,
                Chemistry, Biology, or Mathematics—to generate and conduct structured
                multiple-choice assessments. Every student and teacher account is reviewed by an
                administrator before access is granted.
              </p>

              <div className="flex flex-wrap items-center gap-3 mb-8">
                <button
                  type="button"
                  onClick={() => onSelectPortal('student', 'register')}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Student Registration
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectPortal('teacher', 'register')}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Teacher Registration
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <span>Separate Role Portals</span>
                <span aria-hidden="true">·</span>
                <span>Admin Account Verification</span>
                <span aria-hidden="true">·</span>
                <span>Instant or Controlled Result Modes</span>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="h-full min-h-[300px] lg:min-h-[400px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {!imageError ? (
                  <img
                    src="/src/assets/images/hero_academic_sciences_1794803308241.jpg"
                    alt="Scientific and mathematical measurement instruments for Physics, Chemistry, Biology, and Mathematics"
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600">
                    <BookOpen className="w-12 h-12 text-blue-700 mb-3" />
                    <p className="font-display font-semibold text-slate-800">
                      Physics · Chemistry · Biology · Mathematics
                    </p>
                    <p className="text-sm text-slate-500 mt-1">
                      9th Grade · 1st A · 2nd Year Assessment Platform
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Separate Role Portals */}
        <section id="portals" className="border-t border-slate-200 bg-white py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-2xl mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Separate Role Access Portals
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Students, teachers, and administrators authenticate through dedicated portals. New
                student and teacher accounts remain pending until approved by the administrator.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Student Portal Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mb-4">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Student Portal
                  </h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Register with your class level (9th, 10th, 1st A, or 2nd Year) and roll number.
                    Once approved by the admin, sit timed MCQ tests and view released scorecards.
                  </p>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-200 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectPortal('student', 'login')}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Student Login
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPortal('student', 'register')}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              </div>

              {/* Teacher Portal Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-800 mb-4">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Teacher Portal
                  </h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Specify a class level and subject to build MCQ papers for 9th, 10th, 1st A, and
                    2nd Year, review every question, publish tests, and track submissions.
                  </p>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-200 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectPortal('teacher', 'login')}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Teacher Login
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectPortal('teacher', 'register')}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Register
                  </button>
                </div>
              </div>

              {/* Admin Portal Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mb-4">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    Administrator Portal
                  </h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    Verify and approve pending student and teacher accounts, select between Instant
                    or Controlled Review modes, and oversee result publication.
                  </p>
                </div>
                <div className="mt-6 pt-5 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => onSelectPortal('admin', 'login')}
                    className="w-full px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Administrator Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Curriculum & Mode Governance Section */}
        <section id="curriculum" className="border-t border-slate-200 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-7">
                <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight mb-3">
                  Supported Classes & Science Subjects
                </h2>
                <p className="text-sm text-slate-600 mb-6">
                  Tests only require choosing the class level and subject. Questions, four options,
                  and verified explanations are structured automatically.
                </p>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="py-3 px-4">Class Level</th>
                        <th className="py-3 px-4">Subjects Covered</th>
                        <th className="py-3 px-4">Format</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {GRADES.map((grade) => (
                        <tr key={grade} className="hover:bg-slate-50/80">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {GRADE_LABELS[grade]}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">
                            {SUBJECTS.join(' · ')}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 tabular-nums">
                            4-Option MCQ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="lg:col-span-5">
                <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight mb-3">
                  Admin-Selected Examination Modes
                </h2>
                <p className="text-sm text-slate-600 mb-6">
                  The administrator selects how tests and results operate across the institution.
                </p>

                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
                      <span>Option 1: Instant Mode</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      Students receive immediate automated grading, pass/fail status, and detailed
                      answer explanations right upon submitting their test.
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Option 2: Controlled / Admin Review Mode</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                      Submissions are held in a secure review queue. Scores and answer keys remain
                      hidden until the administrator explicitly releases results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>MeritExam Academic Examination Portal</span>
          <span>9th · 10th · 1st A · 2nd Year — Physics, Chemistry, Biology & Math</span>
        </div>
      </footer>
    </div>
  );
}
