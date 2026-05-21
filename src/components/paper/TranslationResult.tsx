import { useState } from 'react';
import type { PaperSection, StudyNote } from '@/types';

const TYPE_LABELS: Record<PaperSection['type'], string> = {
  title: 'Title',
  abstract: 'Abstract',
  keywords: 'Keywords',
  heading: 'Heading',
  body: 'Body',
  references: 'References',
  footnote: 'Footnote',
};

const TYPE_COLORS: Record<PaperSection['type'], string> = {
  title: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  abstract: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  keywords: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  heading: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  body: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  references: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  footnote: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
};

interface Props {
  sections: PaperSection[];
  isTranslating: boolean;
  progress: number;
  onRetry: (id: string) => void;
  onCopyAll: () => void;
  onRequestStudy: (id: string) => void;
}

/** 학습 카드 — 번역과 시각적으로 구분 */
function StudyCard({ note, isLoading }: { note?: StudyNote; isLoading?: boolean }) {
  if (isLoading) {
    return (
      <div className="mt-2 p-3 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 border-dashed">
        <div className="flex items-center gap-2 text-xs text-indigo-500">
          <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
            <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          학습 분석 중...
        </div>
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className="mt-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 overflow-hidden">
      {/* 학습 카드 헤더 */}
      <div className="px-3 py-1.5 bg-indigo-100/60 dark:bg-indigo-900/30 border-b border-indigo-200 dark:border-indigo-800">
        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          English Study
        </span>
      </div>

      <div className="px-3 py-2.5 space-y-3">
        {/* 핵심 표현 & 숙어 */}
        {note.phrases.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-indigo-500" />
              핵심 표현 & 숙어
            </h4>
            <div className="space-y-1.5">
              {note.phrases.map((p, i) => (
                <div key={i} className="pl-2.5 border-l-2 border-indigo-300 dark:border-indigo-700">
                  <p className="text-xs">
                    <span className="font-semibold text-indigo-800 dark:text-indigo-200">{p.phrase}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-1.5">— {p.meaning}</span>
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 italic mt-0.5">
                    e.g. {p.example}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 통문장 분석 (청크 분해) */}
        {note.sentenceBreakdown && (
          <div className="space-y-1">
            <h4 className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-indigo-500" />
              통문장 분석
            </h4>
            <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed bg-white/60 dark:bg-gray-800/40 rounded px-2.5 py-2 whitespace-pre-wrap">
              {note.sentenceBreakdown}
            </div>
          </div>
        )}

        {/* 암기 팁 */}
        {note.memorizationTip && (
          <div className="space-y-1">
            <h4 className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-indigo-500" />
              암기 TIP
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-white/60 dark:bg-gray-800/40 rounded px-2.5 py-2">
              {note.memorizationTip}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TranslationResult({ sections, isTranslating, progress, onRetry, onCopyAll, onRequestStudy }: Props) {
  const [viewMode, setViewMode] = useState<'bilingual' | 'english'>('bilingual');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState(false);

  if (sections.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm">입력 탭에서 논문 텍스트를 번역하세요</p>
      </div>
    );
  }

  const handleCopySection = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleExportTxt = () => {
    const text = sections
      .filter((s) => s.status === 'done')
      .map((s) => {
        if (s.type === 'title') return s.translated + '\n';
        if (s.type === 'heading') return '\n' + s.translated + '\n';
        return s.translated;
      })
      .join('\n\n');

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_paper_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStudyToggle = () => {
    const next = !studyMode;
    setStudyMode(next);
    if (next) {
      // 학습 모드 켜면 아직 분석 안 된 섹션 모두 분석 요청
      sections
        .filter((s) => s.status === 'done' && !s.studyNote && s.studyStatus !== 'loading' && s.type !== 'keywords' && s.type !== 'heading')
        .forEach((s) => onRequestStudy(s.id));
    }
  };

  const doneCount = sections.filter((s) => s.status === 'done').length;

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      {isTranslating && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>번역 진행 중...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary dark:bg-accent rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          <button
            onClick={() => setViewMode('bilingual')}
            className={`px-3 py-1 text-[11px] rounded transition-colors ${
              viewMode === 'bilingual'
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm font-medium'
                : 'text-gray-500'
            }`}
          >
            한/영 대조
          </button>
          <button
            onClick={() => setViewMode('english')}
            className={`px-3 py-1 text-[11px] rounded transition-colors ${
              viewMode === 'english'
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm font-medium'
                : 'text-gray-500'
            }`}
          >
            영문만
          </button>
        </div>
        <div className="flex gap-2 items-center">
          {/* 학습 모드 토글 */}
          <button
            onClick={handleStudyToggle}
            disabled={doneCount === 0}
            className={`flex items-center gap-1 px-3 py-1.5 text-[11px] rounded-md transition-colors border ${
              studyMode
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 font-semibold'
                : 'text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            } disabled:opacity-40`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            학습 모드
          </button>
          <button
            onClick={onCopyAll}
            disabled={doneCount === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-primary dark:text-accent border border-primary/30 dark:border-accent/30 rounded-md hover:bg-primary/5 dark:hover:bg-accent/5 disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            전체 복사
          </button>
          <button
            onClick={handleExportTxt}
            disabled={doneCount === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            .txt
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((sec) => (
          <div key={sec.id} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Section Header */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[sec.type]}`}>
                {TYPE_LABELS[sec.type]}
              </span>
              <div className="flex items-center gap-1.5">
                {sec.status === 'translating' && (
                  <svg className="animate-spin w-3.5 h-3.5 text-primary dark:text-accent" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                    <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                {sec.status === 'done' && !sec.studyNote && studyMode && sec.type !== 'keywords' && sec.type !== 'heading' && sec.studyStatus !== 'loading' && (
                  <button
                    onClick={() => onRequestStudy(sec.id)}
                    className="text-[10px] text-indigo-500 hover:text-indigo-600"
                    title="학습 분석"
                  >
                    학습 분석
                  </button>
                )}
                {sec.status === 'done' && (
                  <button
                    onClick={() => handleCopySection(sec.translated, sec.id)}
                    className="text-gray-400 hover:text-primary dark:hover:text-accent"
                    title="복사"
                  >
                    {copiedId === sec.id ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                )}
                {sec.status === 'error' && (
                  <button
                    onClick={() => onRetry(sec.id)}
                    className="text-[10px] text-red-500 hover:text-red-600"
                  >
                    재시도
                  </button>
                )}
              </div>
            </div>

            {/* Section Content */}
            <div className="px-3 py-2.5">
              {viewMode === 'bilingual' && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed whitespace-pre-wrap">
                  {sec.original}
                </div>
              )}

              {sec.status === 'translating' && (
                <div className="flex items-center gap-2 py-2">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-primary dark:bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary dark:bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-primary dark:bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span className="text-xs text-gray-400">번역 중...</span>
                </div>
              )}

              {sec.status === 'done' && (
                <div className={`text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap ${
                  viewMode === 'bilingual' ? 'pt-2 border-t border-gray-100 dark:border-gray-700' : ''
                } ${sec.type === 'title' ? 'font-semibold text-base' : ''}`}>
                  {sec.translated}
                </div>
              )}

              {sec.status === 'error' && (
                <div className="text-xs text-red-500 py-1">{sec.error}</div>
              )}

              {sec.status === 'pending' && (
                <div className="text-xs text-gray-400 py-1">대기 중</div>
              )}

              {/* 학습 카드 — 번역과 시각적으로 구분 */}
              {studyMode && sec.status === 'done' && (
                <StudyCard
                  note={sec.studyNote}
                  isLoading={sec.studyStatus === 'loading'}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
