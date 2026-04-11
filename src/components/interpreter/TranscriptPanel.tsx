/**
 * 실시간 원문 + 번역 결과 표시 패널 (로딩 스피너 포함)
 */
import { useAppStore } from '@/stores/useAppStore';
import { FONT_SIZE_MAP } from '@/constants';

export default function TranscriptPanel() {
  const transcript = useAppStore((s) => s.transcript);
  const interimTranscript = useAppStore((s) => s.interimTranscript);
  const translation = useAppStore((s) => s.translation);
  const outputMode = useAppStore((s) => s.outputMode);
  const fontSize = useAppStore((s) => s.settings.fontSize);
  const currentMode = useAppStore((s) => s.currentMode);
  const autoDirection = useAppStore((s) => s.autoDirection);
  const isTranslating = useAppStore((s) => s.isTranslating);

  const fontClass = FONT_SIZE_MAP[fontSize] ?? 'text-xl';
  const showText = outputMode === 'screen' || outputMode === 'both';

  // auto 모드에서는 autoDirection에 따라 색상 변경
  const effectiveMode = currentMode === 'auto' ? autoDirection : currentMode;
  const modeColor = effectiveMode === 'listen' ? 'text-listen' : 'text-speak';

  return (
    <div className="flex-1 px-4 py-3 space-y-4 overflow-y-auto">
      {/* auto 모드 방향 표시 */}
      {currentMode === 'auto' && (
        <div className="flex items-center justify-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            autoDirection === 'listen'
              ? 'bg-listen/10 text-listen'
              : 'bg-speak/10 text-speak'
          }`}>
            {autoDirection === 'listen' ? '듣기 중' : '말하기 중'}
          </span>
          <span className="text-[10px] text-gray-400">자동 전환</span>
        </div>
      )}

      {/* 원문 영역 */}
      <div className="space-y-1">
        <span className="text-[10px] uppercase tracking-wider text-gray-400">원문</span>
        <p className={`${fontClass} text-gray-700 dark:text-gray-300 min-h-[2em]`}>
          {transcript}
          {interimTranscript && (
            <span className="text-gray-400 dark:text-gray-500">{interimTranscript}</span>
          )}
          {!transcript && !interimTranscript && (
            <span className="text-gray-300 dark:text-gray-600">마이크 버튼을 눌러 시작하세요</span>
          )}
        </p>
      </div>

      {/* 구분선 */}
      <hr className="border-gray-200 dark:border-gray-700" />

      {/* 번역 영역 */}
      {showText && (
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-wider text-gray-400">번역</span>
          {isTranslating ? (
            <div className="flex items-center gap-2 min-h-[2em]">
              <div className="w-5 h-5 border-2 border-gray-300 border-t-primary dark:border-gray-600 dark:border-t-accent rounded-full animate-spin" />
              <span className="text-sm text-gray-400">번역 중...</span>
            </div>
          ) : (
            <p className={`font-semibold ${modeColor} ${fontClass} min-h-[2em] leading-relaxed`}>
              {translation || (
                <span className="text-gray-300 dark:text-gray-600">번역 결과가 여기에 표시됩니다</span>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
