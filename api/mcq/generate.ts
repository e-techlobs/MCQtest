import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI, Type } from '@google/genai';

const VALID_GRADES = ['9th', '10th', '1st A', '2nd Year'] as const;
const VALID_SUBJECTS = ['Physics', 'Chemistry', 'Biology', 'Math'] as const;
const VALID_DIFFICULTIES = ['Standard', 'Conceptual', 'Board Exam'] as const;

type GradeOption = (typeof VALID_GRADES)[number];
type SubjectOption = (typeof VALID_SUBJECTS)[number];
type DifficultyOption = (typeof VALID_DIFFICULTIES)[number];

interface GeneratedQuestion {
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  topicTag: string;
}

interface ApiRequest extends IncomingMessage {
  body?: unknown;
}

interface ApiResponse extends ServerResponse {
  status: (code: number) => ApiResponse;
  json: (body: unknown) => void;
}

async function readJsonBody(req: ApiRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const body = await readJsonBody(req);
    const grade = body.grade as GradeOption;
    const subject = body.subject as SubjectOption;
    const difficulty = (VALID_DIFFICULTIES.includes(body.difficulty as DifficultyOption)
      ? body.difficulty
      : 'Standard') as DifficultyOption;
    const rawTopic = typeof body.topic === 'string' ? body.topic.trim().slice(0, 140) : '';
    const rawCount = Number(body.questionCount);
    const questionCount = Number.isInteger(rawCount)
      ? Math.min(Math.max(rawCount, 1), 30)
      : 10;

    if (!VALID_GRADES.includes(grade)) {
      res.status(400).json({ error: 'Invalid grade. Choose 9th, 10th, 1st A, or 2nd Year.' });
      return;
    }
    if (!VALID_SUBJECTS.includes(subject)) {
      res.status(400).json({ error: 'Invalid subject. Choose Physics, Chemistry, Biology, or Math.' });
      return;
    }

    const ai = new GoogleGenAI({ apiKey });

    const gradeCurriculumLabel =
      grade === '9th'
        ? '9th Class (SSC-I — Federal Board FBISE / National Book Foundation NBF)'
        : grade === '10th'
          ? '10th Class (SSC-II — Federal Board FBISE / National Book Foundation NBF)'
          : grade === '1st A'
            ? '1st Year / 1st A (HSSC-I — Federal Board FBISE / National Book Foundation NBF)'
            : '2nd Year (HSSC-II — Federal Board FBISE / National Book Foundation NBF)';

    const topicClause = rawTopic
      ? `Focus specifically on the National Book Foundation (NBF) / FBISE chapter or topic: "${rawTopic}".`
      : `Cover core, high-yield SLO-based chapters from the official National Book Foundation (NBF) textbook for ${gradeCurriculumLabel} ${subject}.`;

    const prompt = [
      `Generate exactly ${questionCount} rigorous, SLO-based multiple-choice questions (MCQs) strictly aligned with the Federal Board of Intermediate and Secondary Education (FBISE) and National Book Foundation (NBF) textbook curriculum:`,
      `- Examination Board & Textbook: Federal Board (FBISE) — National Book Foundation (NBF)`,
      `- Academic Level: ${gradeCurriculumLabel}`,
      `- Subject: ${subject}`,
      `- Difficulty Tier: ${difficulty}`,
      `- Syllabus Focus: ${topicClause}`,
      '',
      'Rules:',
      '1. Align terminology, formulas, units, definitions, and numerical values strictly with the National Book Foundation (NBF) / FBISE textbook for this class and subject.',
      '2. Every question must have exactly 4 distinct options (A, B, C, D) without prefixing letters like "A)" inside the option text.',
      '3. correctIndex must be an integer 0, 1, 2, or 3 corresponding to the single undeniably accurate option.',
      '4. explanation must concisely explain why the correct option is right (1-2 clear sentences).',
      '5. topicTag must name the specific NBF chapter or concept.',
      '6. Avoid ambiguous "All of the above" or "None of the above" options unless strictly appropriate; ensure academic clarity.',
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a senior Federal Board (FBISE, Islamabad) paper setter specializing in National Book Foundation (NBF) SLO-based textbooks for 9th (SSC-I), 10th (SSC-II), 1st Year / 1st A (HSSC-I), and 2nd Year (HSSC-II) Science and Mathematics. Return strictly valid JSON matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTitle: {
              type: Type.STRING,
              description: 'Concise descriptive assessment title (max 100 characters).',
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  prompt: {
                    type: Type.STRING,
                    description: 'The question stem.',
                  },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: 'Exactly 4 answer choices.',
                  },
                  correctIndex: {
                    type: Type.INTEGER,
                    description: 'Zero-based index (0 to 3) of the correct option.',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Brief academic explanation for the correct answer.',
                  },
                  topicTag: {
                    type: Type.STRING,
                    description: 'Chapter or topic name.',
                  },
                },
                required: ['prompt', 'options', 'correctIndex', 'explanation', 'topicTag'],
              },
            },
          },
          required: ['suggestedTitle', 'questions'],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'Model returned an empty response.' });
      return;
    }

    const parsed = JSON.parse(rawText) as {
      suggestedTitle?: string;
      questions?: Array<{
        prompt?: string;
        options?: string[];
        correctIndex?: number;
        explanation?: string;
        topicTag?: string;
      }>;
    };

    const sanitizedQuestions: GeneratedQuestion[] = (parsed.questions ?? [])
      .slice(0, questionCount)
      .filter((q) => typeof q.prompt === 'string' && Array.isArray(q.options) && q.options.length >= 4)
      .map((q) => {
        const opts = q.options!.slice(0, 4).map((opt) => String(opt).trim().slice(0, 300)) as [
          string,
          string,
          string,
          string,
        ];
        const idx = Number.isInteger(q.correctIndex) && q.correctIndex! >= 0 && q.correctIndex! <= 3
          ? q.correctIndex!
          : 0;
        return {
          prompt: String(q.prompt).trim().slice(0, 800),
          options: opts,
          correctIndex: idx,
          explanation: String(q.explanation ?? 'Verified curriculum answer.').trim().slice(0, 600),
          topicTag: String(q.topicTag ?? subject).trim().slice(0, 80),
        };
      });

    if (sanitizedQuestions.length === 0) {
      res.status(502).json({ error: 'Failed to generate valid MCQ items. Please try again.' });
      return;
    }

    const fallbackTitle = rawTopic
      ? `${grade} ${subject} — ${rawTopic}`
      : `${grade} ${subject} (${difficulty})`;

    res.status(200).json({
      title: (parsed.suggestedTitle || fallbackTitle).trim().slice(0, 140),
      questions: sanitizedQuestions,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate MCQs.';
    console.error('MCQ generation error:', err);
    res.status(500).json({ error: message });
  }
}
