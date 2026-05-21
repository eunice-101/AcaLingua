export const config = { runtime: 'edge' };

interface PaperTranslateBody {
  text: string;
  sectionType: string;
  field: string;
  tone: string;
  glossary?: Record<string, string>;
  apiKey?: string;
}

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

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body: PaperTranslateBody = await req.json();
    const { text, sectionType, field, tone, glossary, apiKey } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: 'Missing text' }), { status: 400 });
    }

    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API 키가 필요합니다. 설정에서 입력해주세요.' }),
        { status: 401 },
      );
    }

    const systemPrompt = buildSystemPrompt(field || 'general', tone || 'accessible', glossary);
    const sectionInstruction = SECTION_INSTRUCTIONS[sectionType] || SECTION_INSTRUCTIONS.body;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${sectionInstruction}\n\n---\n\n${text}` },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return new Response(
        JSON.stringify({ error: `OpenAI API error ${res.status}: ${errText}` }),
        { status: res.status },
      );
    }

    const data = await res.json();
    const translatedText = data.choices?.[0]?.message?.content?.trim() ?? '';

    return new Response(JSON.stringify({ translatedText }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}
