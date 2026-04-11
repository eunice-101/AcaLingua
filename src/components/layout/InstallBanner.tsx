/**
 * PWA 설치 안내 배너 — Android: 직접 설치, iOS: 가이드 표시
 */
import { useState } from 'react';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export default function InstallBanner() {
  const { canInstall, install, showIOSGuide, isInstalled } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  if (dismissed || isInstalled || (!canInstall && !showIOSGuide)) return null;

  return (
    <>
      <div className="mx-4 mt-2 p-3 bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">홈 화면에 추가</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">앱처럼 바로 실행할 수 있습니다</p>
        </div>
        {canInstall ? (
          <button
            onClick={install}
            className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
          >
            설치
          </button>
        ) : showIOSGuide ? (
          <button
            onClick={() => setShowGuide(true)}
            className="px-3 py-1.5 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
          >
            방법
          </button>
        ) : null}
        <button onClick={() => setDismissed(true)} className="text-gray-400 hover:text-gray-600" aria-label="닫기">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* iOS 설치 가이드 모달 */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowGuide(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-center text-gray-800 dark:text-gray-200">홈 화면에 추가하기</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">1</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">하단의 <strong>공유 버튼</strong> (네모에서 화살표)을 탭하세요</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">2</span>
                <p className="text-sm text-gray-600 dark:text-gray-400"><strong>홈 화면에 추가</strong>를 선택하세요</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm">3</span>
                <p className="text-sm text-gray-600 dark:text-gray-400">오른쪽 상단의 <strong>추가</strong>를 탭하세요</p>
              </div>
            </div>
            <button
              onClick={() => setShowGuide(false)}
              className="w-full py-3 bg-primary text-white font-semibold rounded-xl"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </>
  );
}
