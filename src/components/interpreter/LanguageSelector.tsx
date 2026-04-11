/**
 * 언어 선택기 — 소스/타겟 언어 + 스왑 버튼
 */
import { useAppStore } from '@/stores/useAppStore';
import { LANGUAGE_LIST } from '@/constants';
import type { LanguageCode } from '@/types';

export default function LanguageSelector() {
  const sourceLang = useAppStore((s) => s.sourceLang);
  const targetLang = useAppStore((s) => s.targetLang);
  const setSourceLang = useAppStore((s) => s.setSourceLang);
  const setTargetLang = useAppStore((s) => s.setTargetLang);
  const swapLanguages = useAppStore((s) => s.swapLanguages);

  /** sourceLang = 항상 상대 언어, targetLang = 항상 내 언어 */
  const leftLabel = '상대 언어';
  const rightLabel = '내 언어';

  const renderSelect = (
    value: LanguageCode,
    onChange: (lang: LanguageCode) => void,
    label: string,
  ) => (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        aria-label={label}
        className="appearance-none bg-gray-100 dark:bg-gray-800 text-sm font-medium rounded-lg px-3 py-2 pr-7 text-center cursor-pointer border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        {LANGUAGE_LIST.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3">
      {renderSelect(sourceLang, setSourceLang, leftLabel)}

      {/* 스왑 버튼 */}
      <button
        onClick={swapLanguages}
        className="mt-4 p-2 rounded-full bg-accent text-white hover:bg-accent-dark active:scale-95 transition-all shadow-md"
        aria-label="언어 바꾸기"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      </button>

      {renderSelect(targetLang, setTargetLang, rightLabel)}
    </div>
  );
}
