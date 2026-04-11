/**
 * Vercel Edge Function — 번역 API 프록시
 * DeepL / Google 번역 API 키를 서버 측에서 안전하게 관리
 */

export const config = { runtime: 'edge' };

interface TranslateBody {
  text: string;
  source_lang: string;
  target_lang: string;
  provider: 'deepl' | 'google';
  apiKey?: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body: TranslateBody = await req.json();
    const { text, source_lang, target_lang, provider, apiKey } = body;

    if (!text || !target_lang) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    if (provider === 'deepl') {
      return await handleDeepL(text, source_lang, target_lang, apiKey);
    } else {
      return await handleGoogle(text, source_lang, target_lang);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
}

/** DeepL API 호출 */
async function handleDeepL(
  text: string,
  sourceLang: string,
  targetLang: string,
  clientApiKey?: string,
): Promise<Response> {
  // 클라이언트 키 또는 환경변수 키 사용
  const apiKey = clientApiKey || process.env.DEEPL_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'DeepL API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.' }),
      { status: 401 },
    );
  }

  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: [text],
      source_lang: sourceLang,
      target_lang: targetLang,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return new Response(
      JSON.stringify({ error: `DeepL error ${res.status}: ${errText}` }),
      { status: res.status },
    );
  }

  const data = await res.json();
  const translatedText = data.translations?.[0]?.text ?? '';
  return new Response(JSON.stringify({ translatedText }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Google 번역 (무료 엔드포인트) 호출 */
async function handleGoogle(
  text: string,
  sourceLang: string,
  targetLang: string,
): Promise<Response> {
  const params = new URLSearchParams({
    client: 'gtx',
    sl: sourceLang,
    tl: targetLang,
    dt: 't',
    q: text,
  });

  const res = await fetch(
    `https://translate.googleapis.com/translate_a/single?${params.toString()}`,
  );

  if (!res.ok) {
    return new Response(
      JSON.stringify({ error: `Google Translate error ${res.status}` }),
      { status: res.status },
    );
  }

  const data = await res.json();
  // Google 응답 형식: [[["translated","original",...],...]...]
  const translatedText = Array.isArray(data?.[0])
    ? data[0].map((seg: string[]) => seg[0]).join('')
    : '';

  return new Response(JSON.stringify({ translatedText }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
