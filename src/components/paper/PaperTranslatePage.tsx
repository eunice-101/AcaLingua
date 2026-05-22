import { useState, useCallback, useEffect, useRef } from 'react';
import { usePaperStore } from '@/stores/usePaperStore';
import type { AcademicField, AcademicTone, PaperSection } from '@/types';
import {
  splitIntoSections,
  translateWithRetry,
  chunkLongText,
  checkOllamaStatus,
  generateStudyNote,
  createThrottle,
} from '@/services/paperTranslationService';
import { generateId } from '@/utils/uuid';
import ErrorBoundary from '@/components/common/ErrorBoundary';
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
  {
    value: 'accessible',
    label: '명료 학술체',
    desc: '국제학회 발표에 적합한 명확하고 읽기 쉬운 학술 영어',
  },
  {
    value: 'formal',
    label: '격식 학술체',
    desc: '저널 투고에 적합한 격식 있는 전문 학술 영어',
  },
];

type TabView = 'input' | 'result' | 'history';

export default function PaperTranslatePage() {
  const {
    inputText, setInputText,
    fields, toggleField,
    tone, setTone,
    sections, setSections, updateSection, editSectionTranslation, setSectionType,
    glossary,
    isTranslating, setTranslating,
    progress, setProgress,
    error, setError,
    saveToHistory, clearAll,
    ollamaModel, setOllamaModel,
    setAbortController, cancelTranslation,
    setTranslationSpeed, setTranslationStartTime,
    translationSpeed,
  } = usePaperStore();

  const [activeTab, setActiveTab] = useState<TabView>(
    sections.length > 0 ? 'result' : 'input',
  );
  const [showGlossary, setShowGlossary] = useState(false);
  const [ollamaRunning, setOllamaRunning] = useState<boolean | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [eta, setEta] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Ollama 상태 확인
  useEffect(() => {
    checkOllamaStatus().then(({ running, models }) => {
      setOllamaRunning(running);
      setAvailableModels(models);
      if (running && models.length > 0 && !models.includes(ollamaModel)) {
        setOllamaModel(models[0]);
      }
    });
  }, []);

  // Ctrl+Enter 단축키
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isTranslating) {
        e.preventDefault();
        handleTranslate();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isTranslating, inputText, fields, tone, glossary, ollamaModel]);

  /* ─── 컨텍스트 연속 + 쓰로틀 스트리밍 번역 ─── */
  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) {
      setError('번역할 논문 텍스트를 입력해주세요.');
      return;
    }

    const { running } = await checkOllamaStatus();
    if (!running) {
      setError('Ollama가 실행되고 있지 않습니다. 터미널에서 "ollama serve"를 실행해주세요.');
      setOllamaRunning(false);
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setError(null);
    setTranslating(true);
    setProgress(0);
    setTranslationStartTime(Date.now());
    setEta('');

    const rawSections = splitIntoSections(inputText);
    const paperSections: PaperSection[] = rawSections.map((s) => ({
      id: generateId(),
      type: s.type,
      original: s.text,
      translated: '',
      status: 'pending' as const,
    }));

    setSections(paperSections);
    setActiveTab('result');

    const totalChars = paperSections.reduce((sum, s) => sum + s.original.length, 0);
    let translatedChars = 0;
    const startTime = Date.now();

    // 이전 번역 결과 누적 (컨텍스트 연속성)
    const previousTranslations: string[] = [];

    for (let i = 0; i < paperSections.length; i++) {
      if (controller.signal.aborted) break;

      const sec = paperSections[i];
      updateSection(sec.id, { status: 'translating' });

      try {
        const chunks = chunkLongText(sec.original);

        // 쓰로틀 콜백 생성 (50ms 간격)
        const throttle = createThrottle(
          (text: string) => updateSection(sec.id, { translated: text }),
          50,
        );

        if (chunks.length === 1) {
          const result = await translateWithRetry(
            { text: sec.original, sectionType: sec.type, fields, tone, glossary },
            ollamaModel,
            throttle.call,
            controller.signal,
            previousTranslations,
          );
          throttle.flush();
          previousTranslations.push(result.translatedText.slice(0, 300));
        } else {
          let completedText = '';
          for (let c = 0; c < chunks.length; c++) {
            if (controller.signal.aborted) break;
            const prefix = completedText;
            const result = await translateWithRetry(
              { text: chunks[c], sectionType: sec.type, fields, tone, glossary },
              ollamaModel,
              (currentChunkText: string) => {
                throttle.call(prefix + (prefix ? '\n\n' : '') + currentChunkText);
              },
              controller.signal,
              previousTranslations,
            );
            completedText = prefix + (prefix ? '\n\n' : '') + result.translatedText;
          }
          throttle.flush();
          previousTranslations.push(completedText.slice(0, 300));
        }

        updateSection(sec.id, { status: 'done' });
        translatedChars += sec.original.length;

        // 속도 & ETA 계산
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = translatedChars / elapsed;
        setTranslationSpeed(Math.round(speed));
        const remaining = (totalChars - translatedChars) / speed;
        if (remaining > 0 && i < paperSections.length - 1) {
          if (remaining < 60) {
            setEta(`약 ${Math.ceil(remaining)}초 남음`);
          } else {
            setEta(`약 ${Math.ceil(remaining / 60)}분 남음`);
          }
        }
      } catch (err) {
        if (controller.signal.aborted) break;
        const msg = err instanceof Error ? err.message : 'Translation failed';
        updateSection(sec.id, { status: 'error', error: msg });
      }

      setProgress(Math.round(((i + 1) / paperSections.length) * 100));
    }

    setTranslating(false);
    setAbortController(null);
    setEta('');

    if (!controller.signal.aborted) {
      saveToHistory();
    }
  }, [
    inputText, fields, tone, glossary, ollamaModel,
    setError, setTranslating, setProgress, setSections, updateSection,
    saveToHistory, setAbortController, setTranslationSpeed, setTranslationStartTime,
  ]);

  /* ─── 섹션 재시도 (스트리밍) ─── */
  const handleRetrySection = useCallback(
    async (sectionId: string) => {
      const sec = usePaperStore.getState().sections.find((s) => s.id === sectionId);
      if (!sec) return;

      updateSection(sectionId, { status: 'translating', error: undefined, translated: '' });

      const throttle = createThrottle(
        (text: string) => updateSection(sectionId, { translated: text }),
        50,
      );

      try {
        await translateWithRetry(
          { text: sec.original, sectionType: sec.type, fields, tone, glossary },
          ollamaModel,
          throttle.call,
        );
        throttle.flush();
        updateSection(sectionId, { status: 'done' });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Retry failed';
        updateSection(sectionId, { status: 'error', error: msg });
      }
    },
    [fields, tone, glossary, ollamaModel, updateSection],
  );

  const handleCopyAll = useCallback(() => {
    const text = sections
      .filter((s) => s.status === 'done')
      .map((s) => s.translated)
      .join('\n\n');
    navigator.clipboard.writeText(text);
  }, [sections]);

  const handleRequestStudy = useCallback(
    async (sectionId: string) => {
      const sec = usePaperStore.getState().sections.find((s) => s.id === sectionId);
      if (!sec || sec.status !== 'done' || sec.studyStatus === 'loading') return;

      updateSection(sectionId, { studyStatus: 'loading' });

      try {
        const note = await generateStudyNote(sec.translated, sec.original, ollamaModel);
        updateSection(sectionId, { studyNote: note, studyStatus: 'done' });
      } catch {
        updateSection(sectionId, { studyStatus: 'error' });
      }
    },
    [ollamaModel, updateSection],
  );

  const handleRefreshOllama = useCallback(async () => {
    const { running, models } = await checkOllamaStatus();
    setOllamaRunning(running);
    setAvailableModels(models);
  }, []);

  const completedCount = sections.filter((s) => s.status === 'done').length;
  const charCount = inputText.length;

  return (
    <ErrorBoundary>
      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">
            논문 번역
          </h2>
          <div className="flex items-center gap-2">
            {sections.length > 0 && (
              <button
                onClick={() => { clearAll(); setActiveTab('input'); }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* Ollama Status */}
        <div
          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs ${
            ollamaRunning === null
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              : ollamaRunning
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                ollamaRunning === null ? 'bg-gray-400 animate-pulse' : ollamaRunning ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            {ollamaRunning === null && 'Ollama 연결 확인 중...'}
            {ollamaRunning === true && (
              <span>
                Ollama 연결됨 — 모델:
                {availableModels.length > 1 ? (
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    className="ml-1 px-1.5 py-0.5 rounded border border-green-300 dark:border-green-700 bg-transparent font-medium"
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <span className="font-semibold ml-1">{ollamaModel}</span>
                )}
              </span>
            )}
            {ollamaRunning === false && (
              <span>
                Ollama 미연결 — <code className="px-1 py-0.5 bg-red-100 dark:bg-red-900/40 rounded font-mono">ollama serve</code> 실행 필요
              </span>
            )}
          </div>
          <button onClick={handleRefreshOllama} className="hover:opacity-70" title="새로고침">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {([
            { key: 'input' as TabView, label: '입력' },
            { key: 'result' as TabView, label: `결과${completedCount > 0 ? ` (${completedCount})` : ''}` },
            { key: 'history' as TabView, label: '기록' },
          ] as const).map((tab) => (
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
            {/* 학문 분야 — 다중 선택 (토글 칩) */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                학문 분야 <span className="text-gray-400 font-normal">(복수 선택 가능)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {FIELD_OPTIONS.map((opt) => {
                  const isSelected = fields.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleField(opt.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
                        isSelected
                          ? 'bg-primary/10 dark:bg-accent/20 text-primary dark:text-accent border-primary/40 dark:border-accent/40 font-semibold'
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {isSelected && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 inline mr-0.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 번역 톤 */}
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

            <p className="text-[11px] text-gray-400 -mt-2">
              {TONE_OPTIONS.find((t) => t.value === tone)?.desc}
            </p>

            <button
              onClick={() => setShowGlossary(!showGlossary)}
              className="flex items-center gap-1.5 text-xs text-primary dark:text-accent hover:underline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              용어 사전{' '}
              {Object.keys(usePaperStore.getState().glossary).length > 0 &&
                `(${Object.keys(usePaperStore.getState().glossary).length})`}
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 transition-transform ${showGlossary ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showGlossary && <GlossaryEditor />}

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">한국어 논문 텍스트</label>
                <span className="text-[10px] text-gray-400">{charCount.toLocaleString()}자</span>
              </div>
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={'논문 전체 또는 일부를 붙여넣으세요.\n\n제목, 초록, 키워드, 본문, 참고문헌을\n자동으로 구분하여 섹션별로 번역합니다.\n\nCtrl+Enter로 바로 번역 시작'}
                rows={14}
                className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-3 resize-y placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:focus:ring-accent/30"
              />
            </div>

            {/* Translate / Cancel */}
            {isTranslating ? (
              <div className="space-y-2">
                <button
                  onClick={cancelTranslation}
                  className="w-full py-3 rounded-xl text-white font-semibold transition-all bg-red-500 hover:bg-red-600 active:scale-[0.98]"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    번역 취소 ({progress}%)
                  </span>
                </button>
                {eta && (
                  <p className="text-center text-[11px] text-gray-400">
                    {eta} · {translationSpeed} 자/초
                  </p>
                )}
              </div>
            ) : (
              <button
                onClick={handleTranslate}
                disabled={!inputText.trim() || !ollamaRunning}
                className="w-full py-3 rounded-xl text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-primary hover:bg-primary/90 dark:bg-accent dark:hover:bg-accent/90 active:scale-[0.98]"
              >
                학술 영어로 번역하기
              </button>
            )}
          </div>
        )}

        {/* Result Tab */}
        {activeTab === 'result' && (
          <ErrorBoundary>
            {isTranslating && (
              <div className="space-y-2">
                <button
                  onClick={cancelTranslation}
                  className="w-full py-2 rounded-lg text-sm text-red-600 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  번역 취소 ({progress}%)
                </button>
                {eta && (
                  <p className="text-center text-[11px] text-gray-400">
                    {eta} · {translationSpeed} 자/초
                  </p>
                )}
              </div>
            )}
            <TranslationResult
              sections={sections}
              isTranslating={isTranslating}
              progress={progress}
              onRetry={handleRetrySection}
              onCopyAll={handleCopyAll}
              onRequestStudy={handleRequestStudy}
              onEditSection={editSectionTranslation}
              onSetSectionType={setSectionType}
            />
          </ErrorBoundary>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <PaperHistory onSwitchToResult={() => setActiveTab('result')} />
        )}
      </div>
    </ErrorBoundary>
  );
}
