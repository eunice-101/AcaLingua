/**
 * 대화 기록 페이지 — 타임스탬프 + 원문/번역문, 내보내기
 */
import { useAppStore } from '@/stores/useAppStore';
import { LANGUAGES } from '@/constants';
import { exportCSV, exportTXT } from '@/utils/exportHistory';

export default function HistoryPage() {
  const history = useAppStore((s) => s.conversationHistory);
  const clearHistory = useAppStore((s) => s.clearHistory);

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="px-4 py-4 space-y-4">
      {/* 헤더 + 내보내기 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">대화 기록</h2>
        <div className="flex gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={() => exportCSV(history)}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-medium hover:bg-primary/20 transition-colors"
              >
                CSV
              </button>
              <button
                onClick={() => exportTXT(history)}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-light font-medium hover:bg-primary/20 transition-colors"
              >
                TXT
              </button>
              <button
                onClick={clearHistory}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-500 dark:bg-red-900/20 dark:text-red-400 font-medium hover:bg-red-100 transition-colors"
              >
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {/* 기록 목록 */}
      {history.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">아직 대화 기록이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...history].reverse().map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl p-3 border ${
                entry.mode === 'listen'
                  ? 'border-listen/20 bg-listen/5 dark:bg-listen/10'
                  : 'border-speak/20 bg-speak/5 dark:bg-speak/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-semibold uppercase tracking-wider ${
                  entry.mode === 'listen' ? 'text-listen' : 'text-speak'
                }`}>
                  {entry.mode === 'listen' ? '듣기' : '말하기'}
                </span>
                <span className="text-[10px] text-gray-400">
                  {LANGUAGES[entry.sourceLang].flag} → {LANGUAGES[entry.targetLang].flag} · {formatTime(entry.timestamp)}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{entry.originalText}</p>
              <p className={`text-sm font-medium ${
                entry.mode === 'listen' ? 'text-listen' : 'text-speak'
              }`}>
                {entry.translatedText}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
