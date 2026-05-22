import { usePaperStore } from '@/stores/usePaperStore';

const FIELD_LABELS: Record<string, string> = {
  general: '일반',
  theology: '신학',
  humanities: '인문',
  'social-science': '사회',
  'natural-science': '자연',
  engineering: '공학',
  medical: '의학',
  law: '법학',
  education: '교육',
  arts: '예술',
};

interface Props {
  onSwitchToResult: () => void;
}

export default function PaperHistory({ onSwitchToResult }: Props) {
  const { history, loadFromHistory, deleteFromHistory } = usePaperStore();

  if (history.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm">번역 기록이 없습니다</p>
      </div>
    );
  }

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-2">
      {history.map((record) => {
        const doneCount = record.sections.filter((s) => s.status === 'done').length;
        return (
          <div
            key={record.id}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                  {record.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-gray-400">{formatDate(record.timestamp)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">
                    {(record.fields ?? ['general']).map((f: string) => FIELD_LABELS[f] || f).join(', ')}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {doneCount}/{record.sections.length} 섹션
                  </span>
                </div>
              </div>
              <button
                onClick={() => deleteFromHistory(record.id)}
                className="text-gray-400 hover:text-red-500 shrink-0 p-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <button
              onClick={() => {
                loadFromHistory(record);
                onSwitchToResult();
              }}
              className="w-full py-1.5 text-xs text-primary dark:text-accent border border-primary/20 dark:border-accent/20 rounded-md hover:bg-primary/5 dark:hover:bg-accent/5"
            >
              불러오기
            </button>
          </div>
        );
      })}
    </div>
  );
}
