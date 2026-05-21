/**
 * 논문 번역 서비스 v2 — Ollama 로컬 LLM (API 키 불필요)
 * 스트리밍 번역 · 긴 본문 청크 분할 · 개선된 섹션 감지
 */
import type { PaperTranslateRequest, PaperTranslateResponse, StudyNote } from '@/types';
import { MAX_RETRY_COUNT } from '@/constants';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ────────────────────────────────────────────
 * 상수
 * ──────────────────────────────────────────── */

/** 청크 분할 기준 글자 수 (gemma3 컨텍스트 안전 범위) */
const MAX_CHARS_PER_CHUNK = 1500;

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
  title:
    'This is a paper title. Translate the COMPLETE title accurately into English, following academic title conventions. Do not shorten, summarize, or omit any part of the original. Do not add a period.',
  abstract:
    'This is an abstract. Maintain the standard abstract structure (background, purpose, methods, results, conclusion). Use present tense for established facts and past tense for methods/results.',
  keywords:
    'These are keywords. Translate each keyword using the most widely accepted English terminology in the field. Separate with commas.',
  heading:
    'This is a section heading. Keep it concise and follow standard academic paper heading conventions.',
  body:
    'This is body text from an academic paper. Translate the COMPLETE text without omitting or summarizing any part. Maintain paragraph structure, logical flow, and academic argumentation style.',
  references:
    'These are bibliographic references. Translate Korean titles in brackets [like this] after the original. Keep author names in their original romanization. Preserve citation formatting exactly.',
  footnote:
    'This is a footnote. Translate the content while preserving any reference numbers or markers.',
  caption:
    'This is a figure or table caption. Translate accurately, preserving any numbering (e.g., "Figure 1", "Table 2"). Keep it concise.',
};

function buildSystemPrompt(
  field: string,
  tone: string,
  glossary?: Record<string, string>,
): string {
  const fieldLabel = FIELD_LABELS[field] || 'general academia';
  const toneGuide =
    tone === 'formal'
      ? 'Use formal academic register with discipline-specific terminology. Employ complex sentence structures where appropriate for precision.'
      : 'Use clear, professional academic English that is accessible to an international audience. Prefer straightforward sentence structures. Avoid unnecessarily complex jargon when a simpler term conveys the same meaning precisely.';

  let glossaryGuide = '';
  if (glossary && Object.keys(glossary).length > 0) {
    const entries = Object.entries(glossary)
      .map(([k, v]) => `"${k}" → "${v}"`)
      .join('\n');
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
 * 스트리밍 번역 (실시간 토큰 출력)
 * ──────────────────────────────────────────── */

export async function translatePaperSectionStreaming(
  req: PaperTranslateRequest,
  model: string = 'gemma3',
  onToken: (fullTextSoFar: string) => void,
  signal?: AbortSignal,
): Promise<PaperTranslateResponse> {
  const systemPrompt = buildSystemPrompt(req.field, req.tone, req.glossary);
  const sectionInstruction =
    SECTION_INSTRUCTIONS[req.sectionType] || SECTION_INSTRUCTIONS.body;
  const userMessage = `${sectionInstruction}\n\n---\n\n${req.text}`;

  const res = await fetch('/ollama/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      options: { temperature: 0.3, num_predict: 4096 },
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split('\n')) {
      if (!line.trim()) continue;
      try {
        const json = JSON.parse(line);
        const token = json.message?.content || '';
        if (token) {
          fullText += token;
          onToken(fullText);
        }
      } catch {
        /* skip malformed NDJSON lines */
      }
    }
  }

  const trimmed = fullText.trim();
  if (!trimmed) throw new Error('Ollama returned empty response');
  return { translatedText: trimmed };
}

/* ────────────────────────────────────────────
 * 스트리밍 + 재시도
 * ──────────────────────────────────────────── */

export async function translateWithRetry(
  req: PaperTranslateRequest,
  model: string = 'gemma3',
  onToken: (fullTextSoFar: string) => void,
  signal?: AbortSignal,
): Promise<PaperTranslateResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRY_COUNT; attempt++) {
    try {
      return await translatePaperSectionStreaming(req, model, onToken, signal);
    } catch (err) {
      // 사용자가 취소한 경우 즉시 throw
      if (signal?.aborted) throw err;
      lastError = err instanceof Error ? err : new Error(String(err));
      onToken(''); // 디스플레이 리셋
      if (attempt < MAX_RETRY_COUNT - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw lastError ?? new Error('Paper translation failed');
}

/* ────────────────────────────────────────────
 * 긴 본문 청크 분할
 * ──────────────────────────────────────────── */

export function chunkLongText(
  text: string,
  maxChars: number = MAX_CHARS_PER_CHUNK,
): string[] {
  if (text.length <= maxChars) return [text];

  // 1차: 문단 단위 분할 (단일 줄바꿈)
  const paragraphs = text.split(/\n/).filter((p) => p.trim());
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length + 1 > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current += (current ? '\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  // 2차: 여전히 긴 청크는 문장 단위 분할
  const finalChunks: string[] = [];
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      finalChunks.push(chunk);
    } else {
      const sentences = chunk.split(
        /(?<=[.!?]\s)|(?<=[다요음됨함임][.!?]?\s)/,
      );
      let cur = '';
      for (const sent of sentences) {
        if (cur.length + sent.length > maxChars && cur.length > 0) {
          finalChunks.push(cur.trim());
          cur = sent;
        } else {
          cur += sent;
        }
      }
      if (cur.trim()) finalChunks.push(cur.trim());
    }
  }

  return finalChunks.length > 0 ? finalChunks : [text];
}

/* ────────────────────────────────────────────
 * 비스트리밍 번역 (호환용)
 * ──────────────────────────────────────────── */

export async function translatePaperSection(
  req: PaperTranslateRequest,
  model: string = 'gemma3',
): Promise<PaperTranslateResponse> {
  return await translateWithRetry(
    req,
    model,
    () => { /* no-op for non-streaming */ },
  );
}

/* ────────────────────────────────────────────
 * 학습 도우미 — 번역 결과 분석
 * ──────────────────────────────────────────── */

const STUDY_SYSTEM_PROMPT = `You are an English study assistant for Korean academics. Analyze the given English academic sentence and return a JSON object with EXACTLY this structure:

{
  "phrases": [
    {
      "phrase": "key phrase or idiom in English",
      "meaning": "한국어로 의미 설명",
      "example": "Another example sentence using this phrase"
    }
  ],
  "sentenceBreakdown": "문장을 청크 단위로 나누어 한국어 해석과 함께 설명. 예: 'This study examines(본 연구는 고찰한다) / the concept of X(X의 개념을) / in the context of Y(Y의 맥락에서)'",
  "memorizationTip": "통문장 암기를 위한 한국어 팁. 핵심 구조를 파악하고 청크별로 외우는 방법 안내."
}

RULES:
- Extract 2-4 key academic phrases or idioms from the text
- The sentenceBreakdown must show the sentence split into meaningful chunks with Korean translations inline
- The memorizationTip should give a practical memorization strategy in Korean
- All Korean text must be natural and helpful
- Return ONLY valid JSON, no other text`;

export async function generateStudyNote(
  translatedText: string,
  originalText: string,
  model: string = 'gemma3',
): Promise<StudyNote> {
  const res = await fetch('/ollama/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: STUDY_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Original Korean:\n${originalText}\n\nEnglish translation:\n${translatedText}`,
        },
      ],
      stream: false,
      format: 'json',
      options: { temperature: 0.4, num_predict: 2048 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Study note generation failed: ${res.status}`);
  }

  const data = await res.json();
  const content = data.message?.content?.trim() ?? '';

  try {
    const parsed = JSON.parse(content);
    return {
      phrases: Array.isArray(parsed.phrases) ? parsed.phrases.slice(0, 4) : [],
      sentenceBreakdown: parsed.sentenceBreakdown || '',
      memorizationTip: parsed.memorizationTip || '',
    };
  } catch {
    return {
      phrases: [],
      sentenceBreakdown: content,
      memorizationTip: '',
    };
  }
}

/* ────────────────────────────────────────────
 * Ollama 연결 상태 확인
 * ──────────────────────────────────────────── */

export async function checkOllamaStatus(): Promise<{
  running: boolean;
  models: string[];
}> {
  try {
    const res = await fetch('/ollama/api/tags');
    if (!res.ok) return { running: false, models: [] };
    const data = await res.json();
    const models = (data.models ?? []).map(
      (m: { name: string }) => m.name.split(':')[0],
    );
    return { running: true, models };
  } catch {
    return { running: false, models: [] };
  }
}

/* ────────────────────────────────────────────
 * 섹션 분리기 v2 — 개선된 감지
 * ──────────────────────────────────────────── */

export type SectionType =
  | 'title'
  | 'abstract'
  | 'keywords'
  | 'heading'
  | 'body'
  | 'references'
  | 'footnote'
  | 'caption';

const SECTION_SPLITTER = /\n{2,}/;

/** 한국어 문장형 종결어미 패턴 */
const KO_SENTENCE_END = /[다요음됨함임]\s*[.!?]?\s*$/;
const PERIOD_END = /\.\s*$/;

/** 그림/표 캡션 패턴 */
const CAPTION_PATTERN =
  /^(그림|표|Figure|Table|Fig\.|Tab\.)\s*[\d.:]/i;

/** 번호 매긴 제목 패턴 */
const NUMBERED_HEADING =
  /^[\dIVXⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+[.\s)]\s*/;

/** 한글 제목 키워드 패턴 */
const KO_HEADING_KEYWORDS =
  /^(서론|결론|본론|논의|방법론?|이론적\s*배경|연구\s*방법|연구\s*결과|선행\s*연구|문헌\s*고찰|분석\s*결과|요약\s*및\s*결론|결론\s*및\s*제언)/;

export function splitIntoSections(
  text: string,
): { type: SectionType; text: string }[] {
  const blocks = text.split(SECTION_SPLITTER).filter((l) => l.trim());
  const sections: { type: SectionType; text: string }[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i].trim();
    if (!block) continue;

    // ─── 그림/표 캡션 ───
    if (CAPTION_PATTERN.test(block)) {
      sections.push({ type: 'caption', text: block });
      continue;
    }

    // ─── 첫 번째 블록: 제목 vs 본문 판별 ───
    if (i === 0 && block.length < 200 && !block.includes('\n')) {
      const isSentence =
        KO_SENTENCE_END.test(block) || PERIOD_END.test(block);
      sections.push({ type: isSentence ? 'body' : 'title', text: block });
      continue;
    }

    // ─── 초록 ───
    if (
      /^(초록|abstract|요약)/i.test(block) ||
      (i === 1 && /^(본\s*연구|이\s*논문|본\s*고)/u.test(block))
    ) {
      sections.push({
        type: 'abstract',
        text: block.replace(/^(초록|abstract|요약)[:\s]*/i, ''),
      });
      continue;
    }

    // ─── 키워드 ───
    if (/^(키워드|핵심어|주제어|keywords?)[:\s]/i.test(block)) {
      sections.push({
        type: 'keywords',
        text: block.replace(/^(키워드|핵심어|주제어|keywords?)[:\s]*/i, ''),
      });
      continue;
    }

    // ─── 참고문헌 ───
    if (/^(참고\s*문헌|references?|bibliography)/i.test(block)) {
      sections.push({ type: 'references', text: block });
      continue;
    }

    // ─── 각주 ───
    if (/^(각주|footnote|주\)?\s*\d)/i.test(block)) {
      sections.push({ type: 'footnote', text: block });
      continue;
    }

    // ─── 제목/소제목 판별 (개선) ───
    if (
      block.length < 100 &&
      !PERIOD_END.test(block) &&
      !block.endsWith('다.') &&
      !block.endsWith('다')
    ) {
      const isNumbered = NUMBERED_HEADING.test(block);
      const isKoHeading = KO_HEADING_KEYWORDS.test(block);
      const isShort = block.length < 50;

      if (isNumbered || isKoHeading || isShort) {
        sections.push({ type: 'heading', text: block });
        continue;
      }
    }

    // ─── 본문: 긴 블록은 문단 단위로 분리 ───
    if (block.length > MAX_CHARS_PER_CHUNK && block.includes('\n')) {
      const subParagraphs = block
        .split(/\n/)
        .filter((p) => p.trim());
      for (const para of subParagraphs) {
        sections.push({ type: 'body', text: para.trim() });
      }
      continue;
    }

    sections.push({ type: 'body', text: block });
  }

  return sections;
}

/* ────────────────────────────────────────────
 * DOCX 내보내기
 * ──────────────────────────────────────────── */

import type { PaperSection } from '@/types';

export async function exportToDocx(
  sections: PaperSection[],
  filename?: string,
): Promise<void> {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    BorderStyle,
  } = await import('docx');

  const doneSections = sections.filter((s) => s.status === 'done');
  if (doneSections.length === 0) return;

  const children: InstanceType<typeof Paragraph>[] = [];

  for (const sec of doneSections) {
    switch (sec.type) {
      case 'title':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sec.translated,
                bold: true,
                size: 32, // 16pt
                font: 'Times New Roman',
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
          }),
        );
        break;

      case 'abstract':
        children.push(
          new Paragraph({
            text: 'Abstract',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: sec.translated,
                size: 22, // 11pt
                font: 'Times New Roman',
                italics: true,
              }),
            ],
            spacing: { after: 300 },
          }),
        );
        break;

      case 'keywords':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Keywords: ',
                bold: true,
                size: 22,
                font: 'Times New Roman',
              }),
              new TextRun({
                text: sec.translated,
                size: 22,
                font: 'Times New Roman',
                italics: true,
              }),
            ],
            spacing: { after: 400 },
            border: {
              bottom: {
                color: 'CCCCCC',
                space: 8,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          }),
        );
        break;

      case 'heading':
        children.push(
          new Paragraph({
            text: sec.translated,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          }),
        );
        break;

      case 'caption':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sec.translated,
                size: 20, // 10pt
                font: 'Times New Roman',
                italics: true,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 200 },
          }),
        );
        break;

      case 'references':
        children.push(
          new Paragraph({
            text: 'References',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600, after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: sec.translated,
                size: 20,
                font: 'Times New Roman',
              }),
            ],
            spacing: { after: 100 },
          }),
        );
        break;

      case 'footnote':
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sec.translated,
                size: 18, // 9pt
                font: 'Times New Roman',
                color: '666666',
              }),
            ],
            spacing: { before: 100, after: 100 },
          }),
        );
        break;

      default:
        // body
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: sec.translated,
                size: 24, // 12pt
                font: 'Times New Roman',
              }),
            ],
            spacing: { after: 200, line: 360 }, // 1.5 줄간격
          }),
        );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,   // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    filename ||
    `translated_paper_${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}

/* ────────────────────────────────────────────
 * 학습 노트 내보내기 (텍스트)
 * ──────────────────────────────────────────── */

export function exportStudyNotes(sections: PaperSection[]): void {
  const lines: string[] = ['=== ENGLISH STUDY NOTES ===\n'];

  sections
    .filter((s) => s.studyNote && s.status === 'done')
    .forEach((sec, idx) => {
      const note = sec.studyNote!;
      lines.push(`--- Section ${idx + 1} (${sec.type}) ---`);
      lines.push(`Original: ${sec.original.slice(0, 80)}...`);
      lines.push(`Translation: ${sec.translated.slice(0, 80)}...\n`);

      if (note.phrases.length > 0) {
        lines.push('[Key Phrases & Idioms]');
        note.phrases.forEach((p) => {
          lines.push(`  * ${p.phrase} — ${p.meaning}`);
          lines.push(`    e.g. ${p.example}`);
        });
        lines.push('');
      }

      if (note.sentenceBreakdown) {
        lines.push('[Sentence Breakdown]');
        lines.push(`  ${note.sentenceBreakdown}\n`);
      }

      if (note.memorizationTip) {
        lines.push('[Memorization Tip]');
        lines.push(`  ${note.memorizationTip}\n`);
      }

      lines.push('');
    });

  const blob = new Blob([lines.join('\n')], {
    type: 'text/plain;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `study_notes_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
