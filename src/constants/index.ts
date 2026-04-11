import type { Language, LanguageCode, AppSettings } from '@/types';

/** 지원 언어 목록 (20개) */
export const LANGUAGES: Record<LanguageCode, Language> = {
  ko: { code: 'ko', name: '한국어', flag: '🇰🇷', bcp47: 'ko-KR', deeplCode: 'KO' },
  en: { code: 'en', name: 'English', flag: '🇺🇸', bcp47: 'en-US', deeplCode: 'EN' },
  ja: { code: 'ja', name: '日本語', flag: '🇯🇵', bcp47: 'ja-JP', deeplCode: 'JA' },
  zh: { code: 'zh', name: '中文', flag: '🇨🇳', bcp47: 'zh-CN', deeplCode: 'ZH' },
  de: { code: 'de', name: 'Deutsch', flag: '🇩🇪', bcp47: 'de-DE', deeplCode: 'DE' },
  fr: { code: 'fr', name: 'Français', flag: '🇫🇷', bcp47: 'fr-FR', deeplCode: 'FR' },
  es: { code: 'es', name: 'Español', flag: '🇪🇸', bcp47: 'es-ES', deeplCode: 'ES' },
  pt: { code: 'pt', name: 'Português', flag: '🇧🇷', bcp47: 'pt-BR', deeplCode: 'PT-BR' },
  ru: { code: 'ru', name: 'Русский', flag: '🇷🇺', bcp47: 'ru-RU', deeplCode: 'RU' },
  it: { code: 'it', name: 'Italiano', flag: '🇮🇹', bcp47: 'it-IT', deeplCode: 'IT' },
  nl: { code: 'nl', name: 'Nederlands', flag: '🇳🇱', bcp47: 'nl-NL', deeplCode: 'NL' },
  pl: { code: 'pl', name: 'Polski', flag: '🇵🇱', bcp47: 'pl-PL', deeplCode: 'PL' },
  tr: { code: 'tr', name: 'Türkçe', flag: '🇹🇷', bcp47: 'tr-TR', deeplCode: 'TR' },
  id: { code: 'id', name: 'Indonesia', flag: '🇮🇩', bcp47: 'id-ID', deeplCode: 'ID' },
  ar: { code: 'ar', name: 'العربية', flag: '🇸🇦', bcp47: 'ar-SA', deeplCode: 'AR' },
  hi: { code: 'hi', name: 'हिन्दी', flag: '🇮🇳', bcp47: 'hi-IN', deeplCode: null },
  vi: { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳', bcp47: 'vi-VN', deeplCode: null },
  th: { code: 'th', name: 'ไทย', flag: '🇹🇭', bcp47: 'th-TH', deeplCode: null },
  ne: { code: 'ne', name: 'नेपाली', flag: '🇳🇵', bcp47: 'ne-NP', deeplCode: null },
  uz: { code: 'uz', name: 'Oʻzbek', flag: '🇺🇿', bcp47: 'uz-UZ', deeplCode: null },
};

/** 언어 목록 배열 */
export const LANGUAGE_LIST: Language[] = Object.values(LANGUAGES);

/** 기본 설정 */
export const DEFAULT_SETTINGS: AppSettings = {
  ttsRate: 1.0,
  ttsVolume: 1.0,
  ttsGender: 'any',
  fontSize: 'medium',
  darkMode: false,
  wakeLock: true,
  continuousMode: true,
  silenceTimeout: 2000,
  apiKey: '',
  translationEngine: 'auto',
};

/** 글자 크기 매핑 (Tailwind 클래스) */
export const FONT_SIZE_MAP: Record<string, string> = {
  small: 'text-base',
  medium: 'text-xl',
  large: 'text-2xl',
  xlarge: 'text-3xl',
};

/** 번역 API 최대 재시도 횟수 */
export const MAX_RETRY_COUNT = 3;

/** 로컬 스토리지 키 */
export const STORAGE_KEYS = {
  SETTINGS: 'acalingua-settings',
  HISTORY: 'acalingua-history',
} as const;
