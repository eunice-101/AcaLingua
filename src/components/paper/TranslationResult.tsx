import { useState, useRef, useEffect, memo } from 'react';
import type { PaperSection, StudyNote } from '@/types';
import {
  exportToDocx,
  exportStudyNotes,
  calcQualityMetrics,
} from '@/services/paperTranslationService';

/* ────────────────────────────────────────────
 * 상수
 * ──────────────────────────────────────────── */

const TYPE_LABELS: Record<PaperSection['type'], string> = {
  title: 'Title',
  abstract: 'Abstract',
  keywords: 'Keywords',
  heading: 'Heading',
  body: 'Body',
  references: 'References',
  footnote: 'Footnote',
  caption: 'Caption',
};

const TYPE_COLORS: Record<PaperSection['type'], string> = {
  title: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  abstract:
    'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  keywords:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  heading:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  body: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  references:
    'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  footnote:
    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  caption:
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
};

const ALL_SECTION_TYPES: PaperSection['type'][] = [
  'title', 'abstract', 'keywords', 'heading', 'body',
  'references', 'footnote', 'caption',
];

/* ────────────────────────────────────────────
 * Props
 * ──────────────────────────────────────────── */

interface Props {
  sections: PaperSection[];
  isTranslating: boolean;
  progress: number;
  onRetry: (id: string) => void;
  onCopyAll: () => void;
  onRequestStudy: (id: string) => void;
  onEditSection: (id: string, newText: string) => void;
  onSetSectionType: (id: string, newType: PaperSection['type']) => void;
}

/* ────────────────────────────────────────────
 * 편집 가능한 번역 텍스트
 * ──────────────────────────────────────────── */

function EditableTranslation({
  text, sectionId, isTitle, onSave,
}: {
  text: string;
  sectionId: string;
  isTitle: boolean;
  onSave: (id: string, newText: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(text); }, [text]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editing]);

  if (editing) {
    return (
      <div className="space-y-1.5">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setDraft(text); setEditing(false); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              onSave(sectionId, draft);
              setEditing(false);
            }
          }}
          className="w-full text-sm leading-relaxed bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
        <div className="flex gap-1.5 justify-end">
          <span className="text-[9px] text-gray-400 self-center mr-auto">
            Ctrl+Enter 저장 · Esc 취소
          </span>
          <button
            onClick={() => { setDraft(text); setEditing(false); }}
            className="px-2.5 py-1 text-[11px] text-gray-500 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            취소
          </button>
          <button
            onClick={() => { onSave(sectionId, draft); setEditing(false); }}
            className="px-2.5 py-1 text-[11px] text-white bg-blue-500 rounded hover:bg-blue-600"
          >
            저장
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative cursor-pointer text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap ${
        isTitle ? 'font-semibold text-base' : ''
      }`}
      onClick={() => setEditing(true)}
      title="클릭하여 편집"
    >
      {text}
      <span className="absolute -right-1 -top-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────
 * 학습 카드 (React.memo)
 * ──────────────────────────────────────────── */

const StudyCard = memo(function StudyCard({
  note, isLoading,
}: {
  note?: StudyNote;
  isLoading?: boolean;
}) {
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
      <div className="px-3 py-1.5 bg-indigo-100/60 dark:bg-indigo-900/30 border-b border-indigo-200 dark:border-indigo-800">
        <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          English Study
        </span>
      </div>
      <div className="px-3 py-2.5 space-y-3">
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
});

/* ────────────────────────────────────────────
 * 학습 종합 패널
 * ──────────────────────────────────────────── */

function StudySummaryPanel({ sections }: { sections: PaperSection[] }) {
  const [flashcardIdx, setFlashcardIdx] = useState(0);
  const [showMeaning, setShowMeaning] = useState(false);

  const allPhrases = sections
    .filter((s) => s.studyNote)
    .flatMap((s) => s.studyNote!.phrases);

  if (allPhrases.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        학습 모드를 켜면 핵심 표현이 여기에 모아집니다
      </div>
    );
  }

  const current = allPhrases[flashcardIdx];

  return (
    <div className="space-y-4">
      <div className="border border-indigo-200 dark:border-indigo-800 rounded-xl overflow-hidden">
        <div className="px-3 py-1.5 bg-indigo-100/60 dark:bg-indigo-900/30 border-b border-indigo-200 dark:border-indigo-800 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
            Flashcard
          </span>
          <span className="text-[10px] text-indigo-400">
            {flashcardIdx + 1} / {allPhrases.length}
          </span>
        </div>
        <div
          className="p-6 text-center cursor-pointer min-h-[120px] flex flex-col items-center justify-center bg-indigo-50/30 dark:bg-indigo-950/20"
          onClick={() => setShowMeaning(!showMeaning)}
        >
          <p className="text-lg font-semibold text-indigo-800 dark:text-indigo-200">
            {current.phrase}
          </p>
          {showMeaning ? (
            <div className="mt-3 space-y-1">
              <p className="text-sm text-gray-600 dark:text-gray-400">{current.meaning}</p>
              <p className="text-xs text-gray-400 italic">e.g. {current.example}</p>
            </div>
          ) : (
            <p className="text-xs text-indigo-400 mt-3">탭하여 뜻 보기</p>
          )}
        </div>
        <div className="flex border-t border-indigo-200 dark:border-indigo-800">
          <button
            onClick={() => { setFlashcardIdx((flashcardIdx - 1 + allPhrases.length) % allPhrases.length); setShowMeaning(false); }}
            className="flex-1 py-2 text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border-r border-indigo-200 dark:border-indigo-800"
          >
            이전
          </button>
          <button
            onClick={() => { setFlashcardIdx((flashcardIdx + 1) % allPhrases.length); setShowMeaning(false); }}
            className="flex-1 py-2 text-xs text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
          >
            다음
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          전체 핵심 표현 ({allPhrases.length}개)
        </h4>
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {allPhrases.map((p, i) => (
            <div
              key={i}
              className={`px-2.5 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                i === flashcardIdx
                  ? 'bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-300 dark:border-indigo-700'
                  : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
              onClick={() => { setFlashcardIdx(i); setShowMeaning(false); }}
            >
              <span className="font-medium text-indigo-700 dark:text-indigo-300">{p.phrase}</span>
              <span className="text-gray-400 ml-1.5">— {p.meaning}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
 * 품질 메트릭 뱃지
 * ──────────────────────────────────────────── */

const QualityBadge = memo(function QualityBadge({
  original, translated,
}: {
  original: string;
  translated: string;
}) {
  if (!translated) return null;
  const m = calcQualityMetrics(original, translated);
  const color =
    m.grade === 'good'
      ? 'text-green-500'
      : m.grade === 'warning'
        ? 'text-amber-500'
        : 'text-red-500';

  return (
    <span
      className={`text-[9px] ${color} tabular-nums`}
      title={`원문 ${m.originalChars}자 → 번역 ${m.translatedChars}자 (${m.translatedWords}단어) · 비율 ${m.lengthRatio.toFixed(1)}x`}
    >
      {m.translatedWords}w · {m.lengthRatio.toFixed(1)}x
    </span>
  );
});

/* ────────────────────────────────────────────
 * 섹션 카드 (React.memo)
 * ──────────────────────────────────────────── */

const SectionCard = memo(function SectionCard({
  sec,
  viewMode,
  studyMode,
  copiedId,
  onCopy,
  onRetry,
  onRequestStudy,
  onEditSection,
  onSetSectionType,
}: {
  sec: PaperSection;
  viewMode: 'bilingual' | 'english';
  studyMode: boolean;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onRetry: (id: string) => void;
  onRequestStudy: (id: string) => void;
  onEditSection: (id: string, newText: string) => void;
  onSetSectionType: (id: string, newType: PaperSection['type']) => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // 번역 중인 섹션으로 자동 스크롤
  useEffect(() => {
    if (sec.status === 'translating' && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [sec.status]);

  return (
    <div ref={cardRef} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-1.5">
          {/* 섹션 타입 드롭다운 (수동 변경) */}
          <select
            value={sec.type}
            onChange={(e) =>
              onSetSectionType(sec.id, e.target.value as PaperSection['type'])
            }
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border-0 cursor-pointer appearance-none bg-transparent ${TYPE_COLORS[sec.type]}`}
            style={{ paddingRight: '0.5rem' }}
            title="섹션 타입 변경"
          >
            {ALL_SECTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </select>

          {/* 품질 메트릭 */}
          {sec.status === 'done' && (
            <QualityBadge original={sec.original} translated={sec.translated} />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {sec.status === 'translating' && (
            <svg className="animate-spin w-3.5 h-3.5 text-primary dark:text-accent" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
              <path fill="currentColor" className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {sec.status === 'done' && !sec.studyNote && studyMode &&
            sec.type !== 'keywords' && sec.type !== 'heading' && sec.type !== 'caption' &&
            sec.studyStatus !== 'loading' && (
              <button onClick={() => onRequestStudy(sec.id)} className="text-[10px] text-indigo-500 hover:text-indigo-600">
                학습 분석
              </button>
            )}
          {sec.status === 'done' && (
            <button
              onClick={() => onCopy(sec.translated, sec.id)}
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
            <button onClick={() => onRetry(sec.id)} className="text-[10px] text-red-500 hover:text-red-600">
              재시도
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-3 py-2.5">
        {viewMode === 'bilingual' && (
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 leading-relaxed whitespace-pre-wrap">
            {sec.original}
          </div>
        )}

        {sec.status === 'translating' && (
          <div className={viewMode === 'bilingual' ? 'pt-2 border-t border-gray-100 dark:border-gray-700' : ''}>
            {sec.translated ? (
              <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                {sec.translated}
                <span className="inline-block w-1.5 h-4 bg-primary dark:bg-accent animate-pulse ml-0.5 align-text-bottom rounded-sm" />
              </div>
            ) : (
              <div className="flex items-center gap-2 py-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary dark:bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary dark:bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-primary dark:bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs text-gray-400">번역 중...</span>
              </div>
            )}
          </div>
        )}

        {sec.status === 'done' && (
          <div className={viewMode === 'bilingual' ? 'pt-2 border-t border-gray-100 dark:border-gray-700' : ''}>
            <EditableTranslation
              text={sec.translated}
              sectionId={sec.id}
              isTitle={sec.type === 'title'}
              onSave={onEditSection}
            />
          </div>
        )}

        {sec.status === 'error' && <div className="text-xs text-red-500 py-1">{sec.error}</div>}
        {sec.status === 'pending' && <div className="text-xs text-gray-400 py-1">대기 중</div>}

        {studyMode && sec.status === 'done' && (
          <StudyCard note={sec.studyNote} isLoading={sec.studyStatus === 'loading'} />
        )}
      </div>
    </div>
  );
});

/* ────────────────────────────────────────────
 * 메인 컴포넌트
 * ──────────────────────────────────────────── */

export default function TranslationResult({
  sections, isTranslating, progress,
  onRetry, onCopyAll, onRequestStudy, onEditSection, onSetSectionType,
}: Props) {
  const [viewMode, setViewMode] = useState<'bilingual' | 'english'>('bilingual');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [studyMode, setStudyMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [bilingualDocx, setBilingualDocx] = useState(false);

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

  const handleExportDocx = async () => {
    setExportingDocx(true);
    try {
      await exportToDocx(sections, bilingualDocx);
    } catch (err) {
      console.error('DOCX export failed:', err);
    }
    setExportingDocx(false);
  };

  const handleStudyToggle = () => {
    const next = !studyMode;
    setStudyMode(next);
    if (next) {
      sections
        .filter((s) =>
          s.status === 'done' && !s.studyNote && s.studyStatus !== 'loading' &&
          s.type !== 'keywords' && s.type !== 'heading' && s.type !== 'caption',
        )
        .forEach((s) => onRequestStudy(s.id));
    }
  };

  const doneCount = sections.filter((s) => s.status === 'done').length;
  const hasStudyNotes = sections.some((s) => s.studyNote);

  // 전체 품질 요약
  const totalOriginal = sections.filter((s) => s.status === 'done').reduce((sum, s) => sum + s.original.length, 0);
  const totalTranslated = sections.filter((s) => s.status === 'done').reduce((sum, s) => sum + s.translated.length, 0);
  const totalWords = sections.filter((s) => s.status === 'done').reduce((sum, s) => sum + s.translated.split(/\s+/).filter(Boolean).length, 0);

  return (
    <div className="space-y-3">
      {/* Progress */}
      {isTranslating && (
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-500">
            <span>스트리밍 번역 중...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-primary dark:bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* 전체 통계 */}
      {doneCount > 0 && !isTranslating && (
        <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-[10px] text-gray-400">
          <span>원문 {totalOriginal.toLocaleString()}자</span>
          <span>→</span>
          <span>번역 {totalTranslated.toLocaleString()}자 · {totalWords.toLocaleString()}단어</span>
          <span>· {doneCount}/{sections.length} 섹션</span>
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
            한/영
          </button>
          <button
            onClick={() => setViewMode('english')}
            className={`px-3 py-1 text-[11px] rounded transition-colors ${
              viewMode === 'english'
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm font-medium'
                : 'text-gray-500'
            }`}
          >
            영문
          </button>
        </div>

        <div className="flex gap-1.5 items-center flex-wrap">
          <button
            onClick={handleStudyToggle}
            disabled={doneCount === 0}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-md transition-colors border ${
              studyMode
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-700 font-semibold'
                : 'text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            } disabled:opacity-40`}
          >
            학습
          </button>

          {studyMode && hasStudyNotes && (
            <>
              <button
                onClick={() => setShowSummary(!showSummary)}
                className={`px-2.5 py-1.5 text-[11px] rounded-md transition-colors border ${
                  showSummary
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-400 dark:border-indigo-600 font-semibold'
                    : 'text-indigo-500 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50'
                }`}
              >
                종합
              </button>
              <button
                onClick={() => exportStudyNotes(sections)}
                className="px-2.5 py-1.5 text-[11px] text-indigo-500 border border-indigo-200 dark:border-indigo-800 rounded-md hover:bg-indigo-50"
                title="학습 노트 내보내기"
              >
                학습.txt
              </button>
            </>
          )}

          <button
            onClick={onCopyAll}
            disabled={doneCount === 0}
            className="px-2.5 py-1.5 text-[11px] text-primary dark:text-accent border border-primary/30 dark:border-accent/30 rounded-md hover:bg-primary/5 disabled:opacity-40"
          >
            복사
          </button>
          <button
            onClick={handleExportTxt}
            disabled={doneCount === 0}
            className="px-2.5 py-1.5 text-[11px] text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-40"
          >
            .txt
          </button>

          {/* DOCX 내보내기 (이중언어 토글 포함) */}
          <div className="flex items-center">
            <button
              onClick={handleExportDocx}
              disabled={doneCount === 0 || exportingDocx}
              className="px-2.5 py-1.5 text-[11px] text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-l-md hover:bg-blue-50 disabled:opacity-40"
            >
              {exportingDocx ? '...' : '.docx'}
            </button>
            <button
              onClick={() => setBilingualDocx(!bilingualDocx)}
              disabled={doneCount === 0}
              className={`px-1.5 py-1.5 text-[9px] border border-l-0 rounded-r-md transition-colors disabled:opacity-40 ${
                bilingualDocx
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700 font-semibold'
                  : 'text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50'
              }`}
              title={bilingualDocx ? '이중언어 DOCX (한/영)' : '영문만 DOCX'}
            >
              {bilingualDocx ? '한/영' : '영'}
            </button>
          </div>
        </div>
      </div>

      {/* 학습 종합 */}
      {studyMode && showSummary && <StudySummaryPanel sections={sections} />}

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((sec) => (
          <SectionCard
            key={sec.id}
            sec={sec}
            viewMode={viewMode}
            studyMode={studyMode}
            copiedId={copiedId}
            onCopy={handleCopySection}
            onRetry={onRetry}
            onRequestStudy={onRequestStudy}
            onEditSection={onEditSection}
            onSetSectionType={onSetSectionType}
          />
        ))}
      </div>
    </div>
  );
}
