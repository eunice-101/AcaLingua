/**
 * 녹음 버튼 — 원형 72px, 녹음 중 펄스 애니메이션
 */
interface RecordButtonProps {
  isRecording: boolean;
  onToggle: () => void;
}

export default function RecordButton({ isRecording, onToggle }: RecordButtonProps) {
  return (
    <div className="flex justify-center py-6">
      <button
        onClick={onToggle}
        className={`
          w-[72px] h-[72px] rounded-full flex items-center justify-center
          transition-all duration-200 shadow-lg active:scale-95
          ${isRecording
            ? 'bg-recording animate-pulse_record'
            : 'bg-primary hover:bg-primary-light dark:bg-primary-light dark:hover:bg-primary'
          }
        `}
        aria-label={isRecording ? '녹음 중지' : '녹음 시작'}
      >
        {isRecording ? (
          /* 정지 아이콘 */
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        ) : (
          /* 마이크 아이콘 */
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
    </div>
  );
}
