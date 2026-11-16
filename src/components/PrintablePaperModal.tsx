import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { CURRICULUM_BOARD_LABEL, GradeLevel, GRADE_LABELS, MCQQuestion, SubjectName } from '../types';

interface PrintablePaperModalProps {
  title: string;
  grade: GradeLevel;
  subject: SubjectName;
  topic?: string;
  durationMinutes: number;
  marksPerQuestion?: number;
  questions: MCQQuestion[];
  onClose: () => void;
}

export function PrintablePaperModal({
  title,
  grade,
  subject,
  topic,
  durationMinutes,
  marksPerQuestion = 1,
  questions,
  onClose,
}: PrintablePaperModalProps) {
  const [includeAnswerKey, setIncludeAnswerKey] = useState(false);
  const totalMarks = Math.round(questions.length * marksPerQuestion * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex flex-col overflow-y-auto print-only-sheet">
      {/* Toolbar (hidden in print) */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="font-display font-semibold text-slate-900">
            Paper Print Preview
          </h2>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={includeAnswerKey}
              onChange={(e) => setIncludeAnswerKey(e.target.checked)}
              className="w-4 h-4 accent-blue-700"
            />
            Include Answer Key Sheet
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg inline-flex items-center gap-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print / Save as PDF
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
            aria-label="Close print preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Printable Paper Sheet */}
      <div className="max-w-4xl w-full mx-auto my-6 bg-white border border-slate-200 p-8 sm:p-10 print:border-none print:my-0 print:p-4">
        <div className="border-b-2 border-slate-900 pb-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            {CURRICULUM_BOARD_LABEL}
          </p>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900">
              {title}
            </h1>
            <span className="text-xs font-mono text-slate-600 tabular-nums">
              Total Marks: {totalMarks} ({marksPerQuestion} per MCQ) · Time: {durationMinutes} Minutes
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
            <span>Class: <strong>{GRADE_LABELS[grade]}</strong></span>
            <span>·</span>
            <span>Subject: <strong>{subject}</strong></span>
            {topic && (
              <>
                <span>·</span>
                <span>Syllabus: <strong>{topic}</strong></span>
              </>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-6 text-xs text-slate-600 pt-3 border-t border-slate-200">
            <div>Student Name: ______________________________________</div>
            <div>Roll No.: _____________________ Date: ____________</div>
          </div>
        </div>

        <p className="text-xs font-semibold text-slate-700 mb-5">
          Instructions: Choose the single best option (A, B, C, or D) for each multiple-choice question.
        </p>

        <ol className="space-y-5">
          {questions.map((q, idx) => (
            <li key={idx} className="break-inside-avoid">
              <p className="text-sm font-medium text-slate-900 leading-snug mb-2">
                <span className="font-mono font-semibold mr-2 tabular-nums">Q{idx + 1}.</span>
                {q.prompt}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pl-7 text-sm text-slate-800">
                {q.options.map((opt, optIdx) => {
                  const letter = String.fromCharCode(65 + optIdx);
                  return (
                    <div key={optIdx}>
                      <span className="font-mono font-semibold mr-1.5">({letter})</span>
                      {opt}
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>

        {includeAnswerKey && (
          <div className="mt-10 pt-6 border-t-2 border-slate-900 break-before-page">
            <h2 className="font-display text-lg font-bold text-slate-900 mb-4">
              Answer Key — {title}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
              {questions.map((q, idx) => (
                <div key={idx} className="p-2 border border-slate-200 rounded">
                  Q{idx + 1}: <strong>{String.fromCharCode(65 + q.correctIndex)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
