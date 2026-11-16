import React, { useState } from 'react';
import { Check, Plus, Printer, RefreshCw, Trash2 } from 'lucide-react';
import {
  CURRICULUM_BOARD_LABEL,
  DIFFICULTIES,
  DifficultyTier,
  GRADES,
  GRADE_LABELS,
  GradeLevel,
  MCQQuestion,
  SUBJECTS,
  SYLLABUS_CHAPTERS,
  SubjectName,
  SystemSettings,
  TestDeliveryOverride,
} from '../types';
import { generateMCQsFromServer, publishMCQTest } from '../services/mcqService';
import { PrintablePaperModal } from './PrintablePaperModal';

interface TestGeneratorPanelProps {
  creatorUid: string;
  creatorName: string;
  creatorRole: 'teacher' | 'admin';
  defaultSubject?: SubjectName | 'All';
  defaultGrade?: GradeLevel | 'All';
  systemSettings: SystemSettings;
  onPublished?: () => void;
}

export function TestGeneratorPanel({
  creatorUid,
  creatorName,
  creatorRole,
  defaultSubject,
  defaultGrade,
  systemSettings,
  onPublished,
}: TestGeneratorPanelProps) {
  const initialGrade: GradeLevel =
    defaultGrade && defaultGrade !== 'All' ? defaultGrade : '9th';
  const initialSubject: SubjectName =
    defaultSubject && defaultSubject !== 'All' ? defaultSubject : 'Physics';

  const [grade, setGrade] = useState<GradeLevel>(initialGrade);
  const [subject, setSubject] = useState<SubjectName>(initialSubject);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyTier>('Standard');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [marksPerQuestion, setMarksPerQuestion] = useState<number>(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(
    systemSettings.defaultTimeLimitMinutes || 15,
  );
  const [title, setTitle] = useState('');
  const [deliveryMode, setDeliveryMode] = useState<TestDeliveryOverride>('inherit');
  const [scheduledReleaseAt, setScheduledReleaseAt] = useState('');
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const chaptersForSelection = SYLLABUS_CHAPTERS[grade][subject];

  async function handleGenerate() {
    setErrorMsg(null);
    setSuccessMsg(null);
    setGenerating(true);
    try {
      const res = await generateMCQsFromServer({
        grade,
        subject,
        topic: topic.trim(),
        difficulty,
        questionCount,
      });
      setTitle(res.title);
      setQuestions(res.questions);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to generate MCQs.');
    } finally {
      setGenerating(false);
    }
  }

  function handleUpdateQuestion(idx: number, patch: Partial<MCQQuestion>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, ...patch } : q)),
    );
  }

  function handleUpdateOption(qIdx: number, optIdx: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIdx) return q;
        const nextOpts = [...q.options] as [string, string, string, string];
        nextOpts[optIdx] = value;
        return { ...q, options: nextOpts };
      }),
    );
  }

  function handleAddManualQuestion() {
    if (questions.length >= 50) return;
    setQuestions((prev) => [
      ...prev,
      {
        prompt: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
        topicTag: topic.trim() || subject,
      },
    ]);
    if (!title.trim()) {
      setTitle(`${grade} ${subject} Paper`);
    }
  }

  function handleRemoveQuestion(idx: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (questions.length === 0) {
      setErrorMsg('Generate or add at least one MCQ before publishing.');
      return;
    }

    const incomplete = questions.some(
      (q) => !q.prompt.trim() || q.options.some((opt) => !opt.trim()),
    );
    if (incomplete) {
      setErrorMsg('Every MCQ must have a question stem and four non-empty options.');
      return;
    }

    let scheduledIso = '';
    if (scheduledReleaseAt.trim()) {
      const parsedStart = new Date(scheduledReleaseAt);
      if (Number.isNaN(parsedStart.getTime())) {
        setErrorMsg('Please select a valid Start Date & Time or clear it to start immediately.');
        return;
      }
      scheduledIso = parsedStart.toISOString();
    }

    setPublishing(true);
    try {
      await publishMCQTest({
        title: title.trim() || `${grade} ${subject} Assessment`,
        grade,
        subject,
        topic: topic.trim(),
        difficulty,
        durationMinutes,
        marksPerQuestion,
        questions,
        deliveryMode: creatorRole === 'admin' ? deliveryMode : 'inherit',
        isActive: true,
        scheduledReleaseAt: scheduledIso,
        createdBy: creatorUid,
        createdByName: creatorName,
        createdByRole: creatorRole,
      });
      setSuccessMsg(
        scheduledIso
          ? `Published "${title.trim() || `${grade} ${subject}`}" (${questions.length} MCQs) — Scheduled to start ${new Date(scheduledIso).toLocaleString()}.`
          : `Published "${title.trim() || `${grade} ${subject}`}" (${questions.length} MCQs) — Active immediately.`,
      );
      setQuestions([]);
      setTitle('');
      setTopic('');
      setScheduledReleaseAt('');
      onPublished?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to publish test.');
    } finally {
      setPublishing(false);
    }
  }

  const effectiveModeLabel =
    (creatorRole === 'admin' && deliveryMode !== 'inherit'
      ? deliveryMode
      : systemSettings.resultMode) === 'instant'
      ? 'Instant Result & Explanation'
      : 'Admin Controlled Result Release';

  return (
    <div className="space-y-6">
      {/* Configuration Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              MCQ Paper & Assessment Builder
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {CURRICULUM_BOARD_LABEL} · Select class, subject, NBF chapter, marks, duration, and test start time.
            </p>
          </div>
          <div className="text-xs text-slate-600 tabular-nums">
            Active Policy: <span className="font-semibold text-slate-900">{effectiveModeLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Class / Grade
            </label>
            <select
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value as GradeLevel);
                setTopic('');
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {GRADES.map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABELS[g]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value as SubjectName);
                setTopic('');
              }}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
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
              Difficulty Tier
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as DifficultyTier)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Number of MCQs (1–30)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={questionCount}
              onChange={(e) => setQuestionCount(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 tabular-nums"
            />
          </div>
        </div>

        {/* Syllabus Chapter Selector */}
        <div className="mb-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="text-xs font-semibold text-slate-700">
              NBF / FBISE {grade} {subject} Chapters (Click a unit to target it, or leave Full Book)
            </label>
            {topic && (
              <button
                type="button"
                onClick={() => setTopic('')}
                className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
              >
                Reset to Full Syllabus
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {chaptersForSelection.map((ch, idx) => {
              const selected = topic === ch;
              return (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setTopic(selected ? '' : ch)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-blue-700 border-blue-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  Ch {idx + 1}: {ch}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Custom Chapter or Topic Focus
            </label>
            <input
              type="text"
              maxLength={140}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={`Full ${grade} ${subject} syllabus or type any topic...`}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Marks per MCQ
            </label>
            <select
              value={marksPerQuestion}
              onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 tabular-nums"
            >
              <option value={0.5}>0.5 Marks / MCQ</option>
              <option value={1}>1 Mark / MCQ</option>
              <option value={1.5}>1.5 Marks / MCQ</option>
              <option value={2}>2 Marks / MCQ</option>
              <option value={3}>3 Marks / MCQ</option>
              <option value={5}>5 Marks / MCQ</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Time Limit (Minutes) · Total: {Math.round(questionCount * marksPerQuestion * 100) / 100} Marks
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value) || 15)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 tabular-nums"
            />
          </div>
        </div>

        {/* Test Start Time & Admin Delivery Override */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 pt-4 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Test Start Date & Time (Countdown for Students)
              </label>
              {scheduledReleaseAt && (
                <button
                  type="button"
                  onClick={() => setScheduledReleaseAt('')}
                  className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  Clear (Start Now)
                </button>
              )}
            </div>
            <input
              type="datetime-local"
              value={scheduledReleaseAt}
              onChange={(e) => setScheduledReleaseAt(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <p className="text-xs text-slate-500 mt-1">
              {scheduledReleaseAt
                ? `Students will see a live countdown timer until ${new Date(scheduledReleaseAt).toLocaleString()}.`
                : 'Leave blank to let verified students begin immediately after publishing.'}
            </p>
          </div>

          {creatorRole === 'admin' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Result Release Mode (Admin Control)
              </label>
              <select
                value={deliveryMode}
                onChange={(e) => setDeliveryMode(e.target.value as TestDeliveryOverride)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="inherit">
                  Follow Global Admin Setting ({systemSettings.resultMode === 'instant' ? 'Option 1: Instant' : 'Option 2: Admin Review'})
                </option>
                <option value="instant">Option 1: Force Instant Result</option>
                <option value="admin_review">Option 2: Force Admin Controlled Release</option>
              </select>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={generating}
            onClick={() => void handleGenerate()}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-60 rounded-lg transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? `Generating ${questionCount} ${subject} MCQs...` : `Generate ${grade} ${subject} Paper`}
          </button>

          <button
            type="button"
            onClick={handleAddManualQuestion}
            className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Question Manually
          </button>
        </div>
      </div>

      {/* Generated Question Review & Publish Form */}
      {questions.length > 0 && (
        <form onSubmit={handlePublish} className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Paper / Assessment Title
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Print / Export Paper
              </button>

              <button
                type="submit"
                disabled={publishing}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {publishing ? 'Publishing...' : `Publish Test (${questions.length} MCQs)`}
              </button>
            </div>
          </div>

          <div className="space-y-5">
            {questions.map((q, qIdx) => (
              <div
                key={qIdx}
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-600 tabular-nums">
                    <span className="font-semibold text-slate-900">Question {qIdx + 1}</span>
                    <span aria-hidden="true">·</span>
                    <span>{q.topicTag || subject}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="text-xs text-red-600 hover:text-red-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove
                  </button>
                </div>

                <textarea
                  rows={2}
                  required
                  value={q.prompt}
                  onChange={(e) => handleUpdateQuestion(qIdx, { prompt: e.target.value })}
                  placeholder="Enter question stem..."
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isCorrect = q.correctIndex === optIdx;
                    return (
                      <div
                        key={optIdx}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                          isCorrect
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-white border-slate-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct-${qIdx}`}
                          checked={isCorrect}
                          onChange={() => handleUpdateQuestion(qIdx, { correctIndex: optIdx })}
                          title={`Mark option ${letter} as correct`}
                          className="accent-emerald-700 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-semibold text-slate-500">
                          {letter}.
                        </span>
                        <input
                          type="text"
                          required
                          value={opt}
                          onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Option ${letter}`}
                          className="flex-1 text-sm bg-transparent focus:outline-none text-slate-900"
                        />
                      </div>
                    );
                  })}
                </div>

                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => handleUpdateQuestion(qIdx, { explanation: e.target.value })}
                  placeholder="Explanation shown when results are released..."
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700"
                />
              </div>
            ))}
          </div>
        </form>
      )}

      {showPrintModal && questions.length > 0 && (
        <PrintablePaperModal
          title={title.trim() || `${grade} ${subject} Paper`}
          grade={grade}
          subject={subject}
          topic={topic.trim()}
          durationMinutes={durationMinutes}
          marksPerQuestion={marksPerQuestion}
          questions={questions}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
