import { useState } from 'react';
import { usePaperStore } from '@/stores/usePaperStore';

export default function GlossaryEditor() {
  const { glossary, addGlossaryEntry, removeGlossaryEntry } = usePaperStore();
  const [ko, setKo] = useState('');
  const [en, setEn] = useState('');

  const handleAdd = () => {
    if (!ko.trim() || !en.trim()) return;
    addGlossaryEntry(ko.trim(), en.trim());
    setKo('');
    setEn('');
  };

  const entries = Object.entries(glossary);

  return (
    <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <p className="text-[11px] text-gray-400">
        반복 사용되는 전문 용어를 등록하면 번역 시 일관되게 적용됩니다.
      </p>

      {/* Add Entry */}
      <div className="flex gap-2">
        <input
          type="text"
          value={ko}
          onChange={(e) => setKo(e.target.value)}
          placeholder="한국어 용어"
          className="flex-1 text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 placeholder:text-gray-400"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <span className="text-gray-400 self-center text-xs">→</span>
        <input
          type="text"
          value={en}
          onChange={(e) => setEn(e.target.value)}
          placeholder="English term"
          className="flex-1 text-xs rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1.5 placeholder:text-gray-400"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={!ko.trim() || !en.trim()}
          className="px-3 py-1.5 text-xs bg-primary dark:bg-accent text-white rounded-md disabled:opacity-40"
        >
          추가
        </button>
      </div>

      {/* Entries List */}
      {entries.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-2 px-2 py-1 bg-white dark:bg-gray-700 rounded text-xs">
              <span className="text-gray-700 dark:text-gray-300 truncate">
                {k} <span className="text-gray-400">→</span> {v}
              </span>
              <button
                onClick={() => removeGlossaryEntry(k)}
                className="text-gray-400 hover:text-red-500 shrink-0"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
