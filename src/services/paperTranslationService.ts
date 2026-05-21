import type { PaperTranslateRequest, PaperTranslateResponse } from '@/types';
import { MAX_RETRY_COUNT } from '@/constants';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function translatePaperSection(
  req: PaperTranslateRequest,
  apiKey?: string,
): Promise<PaperTranslateResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRY_COUNT; attempt++) {
    try {
      const res = await fetch('/api/paper-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: req.text,
          sectionType: req.sectionType,
          field: req.field,
          tone: req.tone,
          glossary: req.glossary,
          apiKey,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API error ${res.status}: ${body}`);
      }

      const data = await res.json();
      return { translatedText: data.translatedText ?? '' };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRY_COUNT - 1) {
        await sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  throw lastError ?? new Error('Paper translation failed');
}

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
