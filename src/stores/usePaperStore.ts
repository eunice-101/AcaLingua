import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AcademicTone,
  AcademicField,
  PaperSection,
  PaperTranslationRecord,
} from '@/types';
import { generateId } from '@/utils/uuid';

interface PaperState {
  inputText: string;
  fields: AcademicField[];
  tone: AcademicTone;
  sections: PaperSection[];
  glossary: Record<string, string>;
  isTranslating: boolean;
  progress: number;
  error: string | null;
  history: PaperTranslationRecord[];
  ollamaModel: string;

  /** 번역 취소용 AbortController (비영속) */
  abortController: AbortController | null;
  /** 번역 속도 추적 (chars/sec) */
  translationSpeed: number;
  /** 번역 시작 시각 */
  translationStartTime: number | null;

  setInputText: (text: string) => void;
  setFields: (fields: AcademicField[]) => void;
  toggleField: (field: AcademicField) => void;
  setTone: (tone: AcademicTone) => void;
  setSections: (sections: PaperSection[]) => void;
  updateSection: (id: string, partial: Partial<PaperSection>) => void;
  editSectionTranslation: (id: string, newText: string) => void;
  /** 섹션 타입 수동 변경 */
  setSectionType: (id: string, newType: PaperSection['type']) => void;
  setGlossary: (glossary: Record<string, string>) => void;
  addGlossaryEntry: (ko: string, en: string) => void;
  removeGlossaryEntry: (ko: string) => void;
  setTranslating: (val: boolean) => void;
  setProgress: (val: number) => void;
  setError: (err: string | null) => void;
  saveToHistory: () => void;
  loadFromHistory: (record: PaperTranslationRecord) => void;
  deleteFromHistory: (id: string) => void;
  clearAll: () => void;
  setOllamaModel: (model: string) => void;

  setAbortController: (ctrl: AbortController | null) => void;
  cancelTranslation: () => void;
  setTranslationSpeed: (speed: number) => void;
  setTranslationStartTime: (time: number | null) => void;
}

export const usePaperStore = create<PaperState>()(
  persist(
    (set, get) => ({
      inputText: '',
      fields: ['general'],
      tone: 'accessible',
      sections: [],
      glossary: {},
      isTranslating: false,
      progress: 0,
      error: null,
      history: [],
      ollamaModel: 'gemma3',
      abortController: null,
      translationSpeed: 0,
      translationStartTime: null,

      setInputText: (text) => set({ inputText: text }),
      setFields: (fields) => set({ fields }),
      toggleField: (field) =>
        set((s) => {
          const has = s.fields.includes(field);
          if (has) {
            // 최소 1개는 유지
            if (s.fields.length <= 1) return s;
            return { fields: s.fields.filter((f) => f !== field) };
          }
          return { fields: [...s.fields, field] };
        }),
      setTone: (tone) => set({ tone }),
      setSections: (sections) => set({ sections }),
      updateSection: (id, partial) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, ...partial } : sec,
          ),
        })),

      editSectionTranslation: (id, newText) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, translated: newText } : sec,
          ),
        })),

      setSectionType: (id, newType) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, type: newType } : sec,
          ),
        })),

      setGlossary: (glossary) => set({ glossary }),
      addGlossaryEntry: (ko, en) =>
        set((s) => ({ glossary: { ...s.glossary, [ko]: en } })),
      removeGlossaryEntry: (ko) =>
        set((s) => {
          const next = { ...s.glossary };
          delete next[ko];
          return { glossary: next };
        }),
      setTranslating: (val) => set({ isTranslating: val }),
      setProgress: (val) => set({ progress: val }),
      setError: (err) => set({ error: err }),
      saveToHistory: () => {
        const { sections, fields, tone, glossary } = get();
        if (sections.length === 0) return;
        const titleSection = sections.find((s) => s.type === 'title');
        const record: PaperTranslationRecord = {
          id: generateId(),
          timestamp: Date.now(),
          title: titleSection?.original || sections[0].original.slice(0, 50),
          fields,
          tone,
          sections: [...sections],
          glossary: { ...glossary },
        };
        set((s) => ({ history: [record, ...s.history].slice(0, 50) }));
      },
      loadFromHistory: (record) =>
        set({
          sections: record.sections,
          fields: record.fields,
          tone: record.tone,
          glossary: record.glossary,
          inputText: record.sections.map((s) => s.original).join('\n\n'),
        }),
      deleteFromHistory: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      clearAll: () =>
        set({ inputText: '', sections: [], progress: 0, error: null }),
      setOllamaModel: (model) => set({ ollamaModel: model }),

      setAbortController: (ctrl) => set({ abortController: ctrl }),
      cancelTranslation: () => {
        const { abortController } = get();
        if (abortController) abortController.abort();
        set({
          isTranslating: false,
          abortController: null,
          error: '번역이 취소되었습니다.',
        });
      },
      setTranslationSpeed: (speed) => set({ translationSpeed: speed }),
      setTranslationStartTime: (time) => set({ translationStartTime: time }),
    }),
    {
      name: 'acalingua-paper',
      partialize: (state) => ({
        fields: state.fields,
        tone: state.tone,
        glossary: state.glossary,
        history: state.history,
        ollamaModel: state.ollamaModel,
      }),
    },
  ),
);
