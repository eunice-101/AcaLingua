/**
 * 논문 번역 서비스 — Ollama 로컬 LLM 직접 호출 (API 키 불필요)
 */
import type { PaperTranslateRequest, PaperTranslateResponse } from '@/types';
import { MAX_RETRY_COUNT } from '@/constants';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ────────────────────────────────────────────
 * 학술 번역 시스템 프롬프트 빌더
 * ──────────────────────────────────────────── */

const FIELD_LABELS: Record<string, string> = {
  general: 'general academia',
  theology: 'theology and religious studies',
  humanities: 'humanities',
  'social-science': 'social sciences',
  'natural-science': 'natural sciences',
  engineering: 'engineering and technology',
  medical: 'medical and health sciences',
  law: 'law and legal studies',
  education: 'education',
  arts: 'arts and culture',
};

const SECTION_INSTRUCTIONS: Record<string, string> = {
  title: 'This is a paper title. Translate it concisely and impactfully, following academic title conventions. Do not add a period.',
  abstract: 'This is an abstract. Maintain the standard abstract structure (background, purpose, methods, results, conclusion). Use present tense for established facts and past tense for methods/results.',
  keywords: 'These are keywords. Translate each keyword using the most widely accepted English terminology in the field. Separate with commas.',
  heading: 'This is a section heading. Keep it concise and follow standard academic paper heading conventions.',
  body: 'This is body text from an academic paper. Maintain paragraph structure, logical flow, and academic argumentation style.',
  references: 'These are bibliographic references. Translate Korean titles in brackets [like this] after the original. Keep author names in their original romanization. Preserve citation formatting exactly.',
  footnote: 'This is a footnote. Translate the content while preserving any reference numbers or markers.',
};

function buildSystemPrompt(field: string, tone: string, glossary?: Record<string, string>): string {
  const fieldLabel = FIELD_LABELS[field] || 'general academia';
  const toneGuide = tone === 'formal'
    ? 'Use formal academic register with discipline-specific terminology. Employ complex sentence structures where appropriate for precision.'
    : 'Use clear, professional academic English that is accessible to an international audience. Prefer straightforward sentence structures. Avoid unnecessarily complex jargon when a simpler term conveys the same meaning precisely.';

  let glossaryGuide = '';
  if (glossary && Object.keys(glossary).length > 0) {
    const entries = Object.entries(glossary).map(([k, v]) => `"${k}" → "${v}"`).join('\n');
    glossaryGuide = `\n\nYou MUST use the following terminology consistently:\n${entries}`;
  }

  return `You are an expert academic translator specializing in ${fieldLabel}. Translate Korean academic text into English for presentation at international conferences.

TRANSLATION PRINCIPLES:
1. ${toneGuide}
2. Preserve the author's argumentative structure and logical flow exactly.
3. Use discipline-appropriate terminology consistently throughout.
4. Maintain hedging language where the original uses it (e.g., "~로 보인다" → "appears to" not "is").
5. Convert Korean citation styles to standard international formats.
6. Keep proper nouns, names of Korean institutions, and Korean-specific concepts with appropriate romanization and brief English explanation when first introduced.
7. Do NOT add information not present in the original.
8. Do NOT omit any content from the original.
9. Ensure subject-verb agreement, article usage, and preposition choices are natural for academic English.
10. For theological/humanities papers: preserve nuance in conceptual terms; transliterate key Korean/Asian concepts when no exact English equivalent exists, with the English approximation in parentheses.${glossaryGuide}

OUTPUT: Return ONLY the translated English text. Do not include explanations, notes, or the original Korean text.`;
}

/* ────────────────────────────────────────────
 * Ollama 로컬 호출
 * ──────────────────────────────────────────── */

export async function translatePaperSection(
  req: PaperTranslateRequest,
  model: string = 'gemma3',
): Promise<PaperTranslateResponse> {
  let lastError: Error | null = null;

  const systemPrompt = buildSystemPrompt(req.field, req.tone, req.glossary);
  const sectionInstruction = SECTION_INSTRUCTIONS[req.sectionType] || SECTION_INSTRUCTIONS.body;
  const userMessage = `${sectionInstruction}\n\n---\n\n${req.text}`;

  for (let attempt = 0; attempt < MAX_RETRY_COUNT; attempt++) {
    try {
      const res = await fetch('/ollama/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 4096,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Ollama error ${res.status}: ${body}`);
      }

      const data = await res.json();
      const translatedText = data.message?.content?.trim() ?? '';

      if (!translatedText) {
        throw new Error('Ollama returned empty response');
      }

      return { translatedText };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRY_COUNT - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw lastError ?? new Error('Paper translation failed');
}

/* ────────────────────────────────────────────
 * Ollama 연결 상태 확인
 * ──────────────────────────────────────────── */

export async function checkOllamaStatus(): Promise<{ running: boolean; models: string[] }> {
  try {
    const res = await fetch('/ollama/api/tags');
    if (!res.ok) return { running: false, models: [] };
    const data = await res.json();
    const models = (data.models ?? []).map((m: { name: string }) => m.name.split(':')[0]);
    return { running: true, models };
  } catch {
    return { running: false, models: [] };
  }
}

/* ────────────────────────────────────────────
 * 섹션 분리기
 * ──────────────────────────────────────────── */

const SECTION_SPLITTER = /\n{2,}/;

export function splitIntoSections(text: string): { type: 'title' | 'abstract' | 'keywords' | 'heading' | 'body' | 'references' | 'footnote'; text: string }[] {
  const lines = text.split(SECTION_SPLITTER).filter((l) => l.trim());
  const sections: { type: 'title' | 'abstract' | 'keywords' | 'heading' | 'body' | 'references' | 'footnote'; text: string }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (i === 0 && line.length < 200 && !line.includes('\n')) {
      sections.push({ type: 'title', text: line });
      continue;
    }

    if (/^(초록|abstract|요약)/i.test(line) || (i === 1 && /^(본\s*연구|이\s*논문|본\s*고)/u.test(line))) {
      sections.push({ type: 'abstract', text: line.replace(/^(초록|abstract|요약)[:\s]*/i, '') });
      continue;
    }

    if (/^(키워드|핵심어|주제어|keywords?)[:\s]/i.test(line)) {
      sections.push({ type: 'keywords', text: line.replace(/^(키워드|핵심어|주제어|keywords?)[:\s]*/i, '') });
      continue;
    }

    if (/^(참고\s*문헌|references?|bibliography)/i.test(line)) {
      sections.push({ type: 'references', text: line });
      continue;
    }

    if (/^(각주|footnote|주\)?\s*\d)/i.test(line)) {
      sections.push({ type: 'footnote', text: line });
      continue;
    }

    if (line.length < 100 && !line.endsWith('.') && !line.endsWith('다.') && !line.endsWith('다')) {
      const isNumberedHeading = /^[\dIVXⅠⅡⅢⅣⅤⅥ]+[.\s)]\s*/.test(line);
      const isShortLine = line.length < 50;
      if (isNumberedHeading || isShortLine) {
        sections.push({ type: 'heading', text: line });
        continue;
      }
    }

    sections.push({ type: 'body', text: line });
  }

  return sections;
}
