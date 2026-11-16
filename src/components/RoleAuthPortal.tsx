import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Clock,
  GraduationCap,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  GRADES,
  GRADE_LABELS,
  GradeLevel,
  SUBJECTS,
  SubjectName,
  UserRole,
} from '../types';

interface RoleAuthPortalProps {
  portalRole: UserRole;
  initialMode?: 'login' | 'register';
  onBack: () => void;
  onSwitchPortal: (role: UserRole) => void;
}

export function RoleAuthPortal({
  portalRole,
  initialMode = 'login',
  onBack,
  onSwitchPortal,
}: RoleAuthPortalProps) {
  const {
    firebaseUser,
    userProfile,
    profileLoaded,
    isAdmin,
    signInWithGoogle,
    registerRoleAccount,
    ensureBootstrappedAdmin,
    logout,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>(
    portalRole === 'admin' ? 'login' : initialMode,
  );
  const [fullName, setFullName] = useState('');
  const [grade, setGrade] = useState<GradeLevel | 'All'>(
    portalRole === 'teacher' ? 'All' : '9th',
  );
  const [subject, setSubject] = useState<SubjectName | 'All'>('Physics');
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const roleTitle =
    portalRole === 'student'
      ? 'Student Examination Portal'
      : portalRole === 'teacher'
        ? 'Teacher Assessment Portal'
        : 'Administrator Control Portal';

  async function handleLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setBusy(true);
    try {
      const user = await signInWithGoogle();
      if (portalRole === 'admin') {
        const ok = await ensureBootstrappedAdmin(user);
        if (!ok) {
          setErrorMsg(
            'This account does not have Administrator privileges. Sign in with the authorized admin Google account or ask an existing admin to grant access.',
          );
        }
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRegisterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);

    if (portalRole === 'admin') return;

    const cleanName = fullName.trim();
    if (cleanName.length < 2) {
      setErrorMsg('Please enter your full name (at least 2 characters).');
      return;
    }

    setBusy(true);
    try {
      const user = firebaseUser ?? (await signInWithGoogle());
      const account = await registerRoleAccount({
        role: portalRole,
        fullName: cleanName || user.displayName || 'Applicant',
        grade,
        subject,
        identifier: identifier.trim(),
      });
      if (account.status === 'pending') {
        setInfoMsg(
          'Registration submitted. Your account is pending verification by the Administrator.',
        );
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  }

  // Case 1: User is signed in and profile is loading
  if (firebaseUser && !profileLoaded) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full text-center">
          <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-700">Verifying account status...</p>
        </div>
      </div>
    );
  }

  // Case 2: Signed in on Student or Teacher portal, and profile already exists
  if (firebaseUser && userProfile && portalRole !== 'admin') {
    // Mismatched role notice
    if (userProfile.role !== portalRole) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <TopBar onBack={onBack} portalRole={portalRole} onSwitchPortal={onSwitchPortal} />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-lg w-full">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                <h2 className="font-display text-xl font-bold text-slate-900">
                  Account Registered Under Different Role
                </h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-6">
                You are currently signed in as <span className="font-semibold text-slate-900">{userProfile.email}</span>,
                which is registered as a{' '}
                <span className="font-semibold text-slate-900 capitalize">{userProfile.role}</span>{' '}
                account. Each portal maintains separate access.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onSwitchPortal(userProfile.role)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  Open {userProfile.role === 'admin' ? 'Admin' : userProfile.role === 'teacher' ? 'Teacher' : 'Student'} Portal
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out & Use Another Account
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Pending approval gate
    if (userProfile.status === 'pending') {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <TopBar onBack={onBack} portalRole={portalRole} onSwitchPortal={onSwitchPortal} />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-lg w-full">
              <div className="w-11 h-11 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 mb-5">
                <Clock className="w-5 h-5" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Pending Administrator Verification
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Your {userProfile.role} account has been registered and is waiting for approval from
                the administrator. You will gain access to the dashboard automatically as soon as
                permission is granted.
              </p>

              <div className="mt-6 border border-slate-200 rounded-lg divide-y divide-slate-200 text-sm bg-slate-50">
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Applicant Name</span>
                  <span className="font-medium text-slate-900">{userProfile.fullName}</span>
                </div>
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Email</span>
                  <span className="font-medium text-slate-900">{userProfile.email}</span>
                </div>
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Role & Class</span>
                  <span className="font-medium text-slate-900 capitalize">
                    {userProfile.role} · {userProfile.grade} · {userProfile.subject}
                  </span>
                </div>
                <div className="px-4 py-2.5 flex justify-between gap-4">
                  <span className="text-slate-500">Verification Status</span>
                  <span className="font-semibold text-amber-700">Pending Admin Approval</span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Back to Home
                </button>
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Rejected gate
    if (userProfile.status === 'rejected') {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <TopBar onBack={onBack} portalRole={portalRole} onSwitchPortal={onSwitchPortal} />
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-lg w-full">
              <div className="w-11 h-11 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-700 mb-5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h2 className="font-display text-2xl font-bold text-slate-900">
                Account Verification Declined
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                The administrator did not approve this registration ({userProfile.email}). Contact
                your institution administrator if you believe this was an error.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Case 3: Admin portal signed-in non-admin user
  if (firebaseUser && portalRole === 'admin' && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <TopBar onBack={onBack} portalRole={portalRole} onSwitchPortal={onSwitchPortal} />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-lg w-full">
            <div className="w-11 h-11 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-700 mb-5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="font-display text-2xl font-bold text-slate-900">
              Administrator Authorization Required
            </h2>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Signed in as <span className="font-semibold text-slate-900">{firebaseUser.email}</span>.
              This account is not listed in the verified Administrators registry.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {userProfile && (
                <button
                  type="button"
                  onClick={() => onSwitchPortal(userProfile.role)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                >
                  Go to My {userProfile.role} Portal
                </button>
              )}
              <button
                type="button"
                onClick={() => void logout()}
                className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <TopBar onBack={onBack} portalRole={portalRole} onSwitchPortal={onSwitchPortal} />

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                portalRole === 'student'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : portalRole === 'teacher'
                    ? 'bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              {portalRole === 'student' && <GraduationCap className="w-5 h-5" />}
              {portalRole === 'teacher' && <UserCheck className="w-5 h-5" />}
              {portalRole === 'admin' && <ShieldCheck className="w-5 h-5" />}
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-slate-900">{roleTitle}</h1>
              <p className="text-xs text-slate-500">
                {portalRole === 'admin'
                  ? 'Verified administrator authentication'
                  : 'Admin verification is required after registration'}
              </p>
            </div>
          </div>

          {portalRole !== 'admin' && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {portalRole === 'student' ? 'Student Login' : 'Teacher Login'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`py-2 text-sm font-semibold rounded-md transition-colors cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {portalRole === 'student' ? 'Student Register' : 'Teacher Register'}
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
              {infoMsg}
            </div>
          )}

          {firebaseUser && !userProfile && mode === 'login' && portalRole !== 'admin' && (
            <div className="mb-5 p-4 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-900">
              <p className="font-semibold">Complete Your Registration</p>
              <p className="mt-1 text-blue-800">
                Signed in as {firebaseUser.email}. No {portalRole} profile was found yet—switch to
                the Register tab to submit your details for Admin approval.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFullName(firebaseUser.displayName || '');
                  setMode('register');
                }}
                className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-md cursor-pointer"
              >
                Open Registration Form
              </button>
            </div>
          )}

          {mode === 'login' || portalRole === 'admin' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                {portalRole === 'admin'
                  ? 'Sign in with your verified Administrator Google account to manage account approvals, examination modes, and result publication.'
                  : `Sign in with the Google account registered for your ${portalRole} profile.`}
              </p>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {busy ? 'Authenticating...' : `Continue with Google (${portalRole === 'admin' ? 'Admin' : portalRole === 'teacher' ? 'Teacher' : 'Student'} Login)`}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {firebaseUser && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 text-xs text-slate-600">
                  <span>Authenticated Google email: <strong className="text-slate-900">{firebaseUser.email}</strong></span>
                  <button
                    type="button"
                    onClick={() => void logout()}
                    className="text-blue-700 hover:underline font-medium cursor-pointer"
                  >
                    Switch
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={portalRole === 'student' ? 'e.g. Ayesha Khan' : 'e.g. Prof. Tariq Mahmood'}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {portalRole === 'student' ? 'Enrolled Class' : 'Teaching Class Focus'}
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as GradeLevel | 'All')}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {GRADE_LABELS[g]}
                      </option>
                    ))}
                    {portalRole === 'teacher' && <option value="All">All Classes (9th, 10th, 1st A, 2nd Year)</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {portalRole === 'student' ? 'Primary Stream / Subject' : 'Teaching Subject'}
                  </label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as SubjectName | 'All')}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                    <option value="All">All Science & Math Subjects</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {portalRole === 'student' ? 'Roll Number / Student ID' : 'Faculty / Employee ID'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={64}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={portalRole === 'student' ? 'e.g. 9A-204' : 'e.g. FAC-PHYS-12'}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
              >
                {busy
                  ? 'Submitting Registration...'
                  : firebaseUser
                    ? `Submit ${portalRole === 'student' ? 'Student' : 'Teacher'} Registration`
                    : `Register with Google (${portalRole === 'student' ? 'Student' : 'Teacher'})`}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function TopBar({
  onBack,
  portalRole,
  onSwitchPortal,
}: {
  onBack: () => void;
  portalRole: UserRole;
  onSwitchPortal: (role: UserRole) => void;
}) {
  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          MeritExam
        </button>

        <nav className="flex items-center gap-5 text-sm font-medium">
          {(['student', 'teacher', 'admin'] as UserRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => onSwitchPortal(role)}
              className={`capitalize whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 transition-colors ${
                portalRole === role
                  ? 'border-blue-700 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {role}
            </button>
          ))}
        </nav>

        <div className="w-20 hidden sm:block" />
      </div>
    </header>
  );
}
