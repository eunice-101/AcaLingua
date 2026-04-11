import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  InterpreterMode,
  OutputMode,
  LanguageCode,
  ConversationEntry,
  AppSettings,
} from '@/types';
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/constants';

/** 앱 전역 상태 인터페이스 */
interface AppState {
  /* ── 통역 상태 ── */
  currentMode: InterpreterMode;
  outputMode: OutputMode;
  sourceLang: LanguageCode;
  targetLang: LanguageCode;
  isRecording: boolean;
  transcript: string;        // 실시간 원문
  interimTranscript: string; // interim 결과
  translation: string;       // 번역 결과

  /* ── 대화 기록 ── */
  conversationHistory: ConversationEntry[];

  /* ── 설정 ── */
  settings: AppSettings;

  /* ── 에러 ── */
  error: string | null;

  /* ── 액션 ── */
  setMode: (mode: InterpreterMode) => void;
  setOutputMode: (mode: OutputMode) => void;
  setSourceLang: (lang: LanguageCode) => void;
  setTargetLang: (lang: LanguageCode) => void;
  swapLanguages: () => void;
  setRecording: (val: boolean) => void;
  setTranscript: (text: string) => void;
  setInterimTranscript: (text: string) => void;
  setTranslation: (text: string) => void;
  addConversation: (entry: ConversationEntry) => void;
  clearHistory: () => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  setError: (err: string | null) => void;
}

/** Zustand 전역 스토어 — 설정과 대화 기록은 localStorage에 영속 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      /* 초기값 */
      currentMode: 'listen',
      outputMode: 'both',
      sourceLang: 'en',
      targetLang: 'ko',
      isRecording: false,
      transcript: '',
      interimTranscript: '',
      translation: '',
      conversationHistory: [],
      settings: { ...DEFAULT_SETTINGS },
      error: null,

      /* 액션 */
      setMode: (mode) => set({ currentMode: mode, transcript: '', interimTranscript: '', translation: '' }),
      setOutputMode: (mode) => set({ outputMode: mode }),
      setSourceLang: (lang) => set({ sourceLang: lang }),
      setTargetLang: (lang) => set({ targetLang: lang }),
      swapLanguages: () =>
        set((s) => ({ sourceLang: s.targetLang, targetLang: s.sourceLang })),
      setRecording: (val) => set({ isRecording: val }),
      setTranscript: (text) => set({ transcript: text }),
      setInterimTranscript: (text) => set({ interimTranscript: text }),
      setTranslation: (text) => set({ translation: text }),
      addConversation: (entry) =>
        set((s) => ({ conversationHistory: [...s.conversationHistory, entry] })),
      clearHistory: () => set({ conversationHistory: [] }),
      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),
      setError: (err) => set({ error: err }),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      /* 영속 대상: 설정, 대화기록, 언어 선택 */
      partialize: (state) => ({
        settings: state.settings,
        conversationHistory: state.conversationHistory,
        currentMode: state.currentMode,
        sourceLang: state.sourceLang,
        targetLang: state.targetLang,
        outputMode: state.outputMode,
      }),
    },
  ),
);
