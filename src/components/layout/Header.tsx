/**
 * 상단 헤더 — 앱 로고 + 다크모드 토글
 */
import { useAppStore } from '@/stores/useAppStore';

export default function Header() {
  const darkMode = useAppStore((s) => s.settings.darkMode);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-primary dark:bg-primary-dark text-white shadow-md safe-top">
      <h1 className="text-lg font-bold tracking-tight">
        AcaLingua
      </h1>
      <button
        onClick={() => updateSettings({ darkMode: !darkMode })}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label={darkMode ? '라이트 모드' : '다크 모드'}
      >
        {darkMode ? (
          /* 해 아이콘 */
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          /* 달 아이콘 */
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </header>
  );
}
