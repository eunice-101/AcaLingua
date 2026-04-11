/**
 * 실시간 원문 + 번역 결과 표시 패널
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

  const fontClass = FONT_SIZE_MAP[fontSize] ?? 'text-xl';
  const showText = outputMode === 'screen' || outputMode === 'both';
  const modeColor = currentMode === 'listen' ? 'text-listen' : 'text-speak';

  return (
    <div className="flex-1 px-4 py-3 space-y-4 overflow-y-auto">
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
          <p className={`font-semibold ${modeColor} ${fontClass} min-h-[2em] leading-relaxed`}>
            {translation || (
              <span className="text-gray-300 dark:text-gray-600">번역 결과가 여기에 표시됩니다</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
