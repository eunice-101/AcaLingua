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
  field: AcademicField;
  tone: AcademicTone;
  sections: PaperSection[];
  glossary: Record<string, string>;
  isTranslating: boolean;
  progress: number;
  error: string | null;
  history: PaperTranslationRecord[];
  ollamaModel: string;

  setInputText: (text: string) => void;
  setField: (field: AcademicField) => void;
  setTone: (tone: AcademicTone) => void;
  setSections: (sections: PaperSection[]) => void;
  updateSection: (id: string, partial: Partial<PaperSection>) => void;
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
}

export const usePaperStore = create<PaperState>()(
  persist(
    (set, get) => ({
      inputText: '',
      field: 'general',
      tone: 'accessible',
      sections: [],
      glossary: {},
      isTranslating: false,
      progress: 0,
      error: null,
      history: [],
      ollamaModel: 'gemma3',

      setInputText: (text) => set({ inputText: text }),
      setField: (field) => set({ field }),
      setTone: (tone) => set({ tone }),
      setSections: (sections) => set({ sections }),
      updateSection: (id, partial) =>
        set((s) => ({
          sections: s.sections.map((sec) =>
            sec.id === id ? { ...sec, ...partial } : sec,
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
        const { sections, field, tone, glossary } = get();
        if (sections.length === 0) return;
        const titleSection = sections.find((s) => s.type === 'title');
        const record: PaperTranslationRecord = {
          id: generateId(),
          timestamp: Date.now(),
          title: titleSection?.original || sections[0].original.slice(0, 50),
          field,
          tone,
          sections: [...sections],
          glossary: { ...glossary },
        };
        set((s) => ({ history: [record, ...s.history].slice(0, 50) }));
      },
      loadFromHistory: (record) =>
        set({
          sections: record.sections,
          field: record.field,
          tone: record.tone,
          glossary: record.glossary,
          inputText: record.sections.map((s) => s.original).join('\n\n'),
        }),
      deleteFromHistory: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      clearAll: () =>
        set({ inputText: '', sections: [], progress: 0, error: null }),
      setOllamaModel: (model) => set({ ollamaModel: model }),
    }),
    {
      name: 'acalingua-paper',
      partialize: (state) => ({
        field: state.field,
        tone: state.tone,
        glossary: state.glossary,
        history: state.history,
        ollamaModel: state.ollamaModel,
      }),
    },
  ),
);
