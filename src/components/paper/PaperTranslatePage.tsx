import { useState, useCallback } from 'react';
import { usePaperStore } from '@/stores/usePaperStore';
import type { AcademicField, AcademicTone, PaperSection } from '@/types';
import { splitIntoSections, translatePaperSection } from '@/services/paperTranslationService';
import { generateId } from '@/utils/uuid';
import GlossaryEditor from './GlossaryEditor';
import TranslationResult from './TranslationResult';
import PaperHistory from './PaperHistory';

const FIELD_OPTIONS: { value: AcademicField; label: string }[] = [
  { value: 'general', label: '일반 학술' },
  { value: 'theology', label: '신학' },
  { value: 'humanities', label: '인문학' },
  { value: 'social-science', label: '사회과학' },
  { value: 'natural-science', label: '자연과학' },
  { value: 'engineering', label: '공학' },
  { value: 'medical', label: '의학' },
  { value: 'law', label: '법학' },
  { value: 'education', label: '교육학' },
  { value: 'arts', label: '예술' },
];

const TONE_OPTIONS: { value: AcademicTone; label: string; desc: string }[] = [
  { value: 'accessible', label: '명료 학술체', desc: '국제학회 발표에 적합한 명확하고 읽기 쉬운 학술 영어' },
  { value: 'formal', label: '격식 학술체', desc: '저널 투고에 적합한 격식 있는 전문 학술 영어' },
];

type TabView = 'input' | 'result' | 'history';

export default function PaperTranslatePage() {
  const {
    inputText, setInputText,
    field, setField,
    tone, setTone,
    sections, setSections, updateSection,
    glossary,
    isTranslating, setTranslating,
    progress, setProgress,
    error, setError,
    saveToHistory, clearAll,
    openaiApiKey,
  } = usePaperStore();

  const [activeTab, setActiveTab] = useState<TabView>(sections.length > 0 ? 'result' : 'input');
  const [showGlossary, setShowGlossary] = useState(false);

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) {
      setError('번역할 논문 텍스트를 입력해주세요.');
      return;
    }

    if (!openaiApiKey) {
      setError('설정에서 OpenAI API 키를 입력해주세요.');
      return;
    }

    setError(null);
    setTranslating(true);
    setProgress(0);

    const rawSections = splitIntoSections(inputText);
    const paperSections: PaperSection[] = rawSections.map((s) => ({
      id: generateId(),
      type: s.type,
      original: s.text,
      translated: '',
      status: 'pending',
    }));

    setSections(paperSections);
    setActiveTab('result');

    for (let i = 0; i < paperSections.length; i++) {
      const sec = paperSections[i];
      updateSection(sec.id, { status: 'translating' });

      try {
        const result = await translatePaperSection(
          { text: sec.original, sectionType: sec.type, field, tone, glossary },
          openaiApiKey,
        );
        updateSection(sec.id, {
          translated: result.translatedText,
          status: 'done',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Translation failed';
        updateSection(sec.id, { status: 'error', error: msg });
      }

      setProgress(Math.round(((i + 1) / paperSections.length) * 100));
    }

    setTranslating(false);
    saveToHistory();
  }, [inputText, field, tone, glossary, openaiApiKey, setError, setTranslating, setProgress, setSections, updateSection, saveToHistory, setActiveTab]);

  const handleRetrySection = useCallback(async (sectionId: string) => {
    const sec = usePaperStore.getState().sections.find((s) => s.id === sectionId);
    if (!sec) return;

    updateSection(sectionId, { status: 'translating', error: undefined });

    try {
      const result = await translatePaperSection(
        { text: sec.original, sectionType: sec.type, field, tone, glossary },
        openaiApiKey,
      );
      updateSection(sectionId, { translated: result.translatedText, status: 'done' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Retry failed';
      updateSection(sectionId, { status: 'error', error: msg });
    }
  }, [field, tone, glossary, openaiApiKey, updateSection]);

  const handleCopyAll = useCallback(() => {
    const text = sections
      .filter((s) => s.status === 'done')
      .map((s) => s.translated)
      .join('\n\n');
    navigator.clipboard.writeText(text);
  }, [sections]);

  const completedCount = sections.filter((s) => s.status === 'done').length;
  const charCount = inputText.length;

  return (
    <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">논문 번역</h2>
        {sections.length > 0 && (
          <button
            onClick={() => { clearAll(); setActiveTab('input'); }}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {([
          { key: 'input' as TabView, label: '입력' },
          { key: 'result' as TabView, label: `결과${completedCount > 0 ? ` (${completedCount})` : ''}` },
          { key: 'history' as TabView, label: '기록' },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 text-sm rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-primary dark:text-accent font-semibold shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Input Tab */}
      {activeTab === 'input' && (
        <div className="space-y-4">
          {/* Field & Tone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">학문 분야</label>
              <select
                value={field}
                onChange={(e) => setField(e.target.value as AcademicField)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
              >
                {FIELD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">번역 톤</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as AcademicTone)}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
              >
                {TONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tone Description */}
          <p className="text-[11px] text-gray-400 -mt-2">
            {TONE_OPTIONS.find((t) => t.value === tone)?.desc}
          </p>

          {/* Glossary Toggle */}
          <button
            onClick={() => setShowGlossary(!showGlossary)}
            className="flex items-center gap-1.5 text-xs text-primary dark:text-accent hover:underline"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            용어 사전 {Object.keys(usePaperStore.getState().glossary).length > 0 && `(${Object.keys(usePaperStore.getState().glossary).length})`}
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 transition-transform ${showGlossary ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showGlossary && <GlossaryEditor />}

          {/* Text Input */}
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">한국어 논문 텍스트</label>
              <span className="text-[10px] text-gray-400">{charCount.toLocaleString()}자</span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={"논문 전체 또는 일부를 붙여넣으세요.\n\n제목, 초록, 키워드, 본문, 참고문헌을\n자동으로 구분하여 섹션별로 번역합니다."}
              rows={14}
              className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-3 resize-y placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-accent/30"
            />
          </div>

          {/* Translate Button */}
          <button
            onClick={handleTranslate}
            disabled={isTranslating || !inputText.trim()}
            className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 dark:bg-accent dark:hover:bg-accent/90 active:scale-[0.98]"
          >
            {isTranslating ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                  <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                번역 중... {progress}%
              </span>
            ) : (
              '학술 영어로 번역하기'
            )}
          </button>
        </div>
      )}

      {/* Result Tab */}
      {activeTab === 'result' && (
        <TranslationResult
          sections={sections}
          isTranslating={isTranslating}
          progress={progress}
          onRetry={handleRetrySection}
          onCopyAll={handleCopyAll}
        />
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <PaperHistory onSwitchToResult={() => setActiveTab('result')} />
      )}
    </div>
  );
}
