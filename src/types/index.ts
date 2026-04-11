/** 지원 언어 코드 (20개) */
export type LanguageCode =
  | 'ko' | 'en' | 'ja' | 'zh' | 'de'
  | 'fr' | 'es' | 'pt' | 'ne' | 'uz'
  | 'ru' | 'it' | 'tr' | 'id' | 'ar'
  | 'hi' | 'vi' | 'th' | 'nl' | 'pl';

/** 언어 정보 */
export interface Language {
  code: LanguageCode;
  name: string;
  flag: string;
  /** BCP-47 음성인식용 코드 */
  bcp47: string;
  /** DeepL API 코드 (없으면 Google 폴백) */
  deeplCode: string | null;
}

/** 통역 모드 */
export type InterpreterMode = 'listen' | 'speak';

/** 출력 모드 */
export type OutputMode = 'screen' | 'audio' | 'both';

/** 글자 크기 단계 */
export type FontSizeLevel = 'small' | 'medium' | 'large' | 'xlarge';

/** 번역 엔진 */
export type TranslationEngine = 'deepl' | 'google' | 'auto';

/** 대화 기록 항목 */
export interface ConversationEntry {
  id: string;
  timestamp: number;
  mode: InterpreterMode;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  originalText: string;
  translatedText: string;
}

/** TTS 음성 성별 */
export type TtsGender = 'any' | 'male' | 'female';

/** 앱 설정 */
export interface AppSettings {
  ttsRate: number;
  ttsVolume: number;
  ttsGender: TtsGender;
  fontSize: FontSizeLevel;
  darkMode: boolean;
  wakeLock: boolean;
  continuousMode: boolean;
  silenceTimeout: number;
  apiKey: string;
  translationEngine: TranslationEngine;
}

/** 번역 요청 */
export interface TranslationRequest {
  text: string;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
}

/** 번역 응답 */
export interface TranslationResponse {
  translatedText: string;
  detectedSourceLang?: string;
}

/** 번역 프로바이더 인터페이스 (전략 패턴) */
export interface TranslationProvider {
  name: string;
  translate(request: TranslationRequest, apiKey?: string): Promise<TranslationResponse>;
  supportsLanguage(lang: LanguageCode): boolean;
}
