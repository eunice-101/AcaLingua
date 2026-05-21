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
export type InterpreterMode = 'listen' | 'speak' | 'auto';

/** 자동 모드 내부 방향 (listen/speak 교대) */
export type AutoDirection = 'listen' | 'speak';

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
  mode: AutoDirection;  // 실제 번역 방향 (listen 또는 speak)
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

/** 논문 번역 학술 톤 */
export type AcademicTone = 'formal' | 'accessible';

/** 논문 번역 학문 분야 */
export type AcademicField =
  | 'general'
  | 'theology'
  | 'humanities'
  | 'social-science'
  | 'natural-science'
  | 'engineering'
  | 'medical'
  | 'law'
  | 'education'
  | 'arts';

/** 논문 번역 섹션 */
export interface PaperSection {
  id: string;
  type: 'title' | 'abstract' | 'keywords' | 'heading' | 'body' | 'references' | 'footnote';
  original: string;
  translated: string;
  status: 'pending' | 'translating' | 'done' | 'error';
  error?: string;
}

/** 논문 번역 요청 */
export interface PaperTranslateRequest {
  text: string;
  sectionType: PaperSection['type'];
  field: AcademicField;
  tone: AcademicTone;
  glossary?: Record<string, string>;
}

/** 논문 번역 응답 */
export interface PaperTranslateResponse {
  translatedText: string;
  suggestions?: string[];
}

/** 논문 번역 히스토리 */
export interface PaperTranslationRecord {
  id: string;
  timestamp: number;
  title: string;
  field: AcademicField;
  tone: AcademicTone;
  sections: PaperSection[];
  glossary: Record<string, string>;
}
