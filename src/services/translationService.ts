/**
 * 번역 서비스 — 전략 패턴으로 DeepL / Google 폴백 처리
 */
import type {
  TranslationProvider,
  TranslationRequest,
  TranslationResponse,
  LanguageCode,
} from '@/types';
import { LANGUAGES, MAX_RETRY_COUNT } from '@/constants';

/* ────────────────────────────────────────────
 * DeepL 번역 프로바이더
 * ──────────────────────────────────────────── */
class DeepLProvider implements TranslationProvider {
  name = 'DeepL';

  supportsLanguage(lang: LanguageCode): boolean {
    return LANGUAGES[lang].deeplCode !== null;
  }

  async translate(req: TranslationRequest, apiKey?: string): Promise<TranslationResponse> {
    const sourceDeepl = LANGUAGES[req.sourceLang].deeplCode;
    const targetDeepl = LANGUAGES[req.targetLang].deeplCode;
    if (!sourceDeepl || !targetDeepl) {
      throw new Error(`DeepL does not support ${req.sourceLang} → ${req.targetLang}`);
    }

    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: req.text,
        source_lang: sourceDeepl,
        target_lang: targetDeepl,
        provider: 'deepl',
        apiKey,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`DeepL API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    return { translatedText: data.translatedText ?? data.text ?? '' };
  }
}

/* ────────────────────────────────────────────
 * Google 번역 폴백 프로바이더
 * ──────────────────────────────────────────── */
class GoogleProvider implements TranslationProvider {
  name = 'Google';

  supportsLanguage(): boolean {
    return true; // Google은 모든 언어 지원
  }

  async translate(req: TranslationRequest): Promise<TranslationResponse> {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: req.text,
        source_lang: req.sourceLang,
        target_lang: req.targetLang,
        provider: 'google',
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Google API error ${res.status}: ${body}`);
    }

    const data = await res.json();
    return { translatedText: data.translatedText ?? '' };
  }
}

/* ────────────────────────────────────────────
 * 번역 서비스 (exponential backoff 재시도)
 * ──────────────────────────────────────────── */
const deepl = new DeepLProvider();
const google = new GoogleProvider();

/** 지정된 밀리초만큼 대기 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 번역 실행 — auto 모드: DeepL 시도 후 미지원/실패 시 Google 폴백
 */
export async function translate(
  req: TranslationRequest,
  engine: 'deepl' | 'google' | 'auto' = 'auto',
  apiKey?: string,
): Promise<TranslationResponse> {
  const providers: TranslationProvider[] = [];

  if (engine === 'deepl') {
    providers.push(deepl);
  } else if (engine === 'google') {
    providers.push(google);
  } else {
    // auto: DeepL 우선, 미지원 언어면 Google
    if (deepl.supportsLanguage(req.sourceLang) && deepl.supportsLanguage(req.targetLang)) {
      providers.push(deepl, google);
    } else {
      providers.push(google);
    }
  }

  let lastError: Error | null = null;

  for (const provider of providers) {
    for (let attempt = 0; attempt < MAX_RETRY_COUNT; attempt++) {
      try {
        return await provider.translate(req, apiKey);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (attempt < MAX_RETRY_COUNT - 1) {
          await sleep(Math.pow(2, attempt) * 500); // exponential backoff
        }
      }
    }
  }

  throw lastError ?? new Error('Translation failed');
}
