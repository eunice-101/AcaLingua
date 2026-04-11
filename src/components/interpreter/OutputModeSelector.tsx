/**
 * 출력 모드 선택 — iOS 스타일 세그먼트 컨트롤
 */
import { useAppStore } from '@/stores/useAppStore';
import type { OutputMode } from '@/types';

const modes: { value: OutputMode; label: string; icon: string }[] = [
  { value: 'screen', label: '화면', icon: '📄' },
  { value: 'both', label: '화면+소리', icon: '📄🔊' },
  { value: 'audio', label: '소리', icon: '🔊' },
];

export default function OutputModeSelector() {
  const outputMode = useAppStore((s) => s.outputMode);
  const setOutputMode = useAppStore((s) => s.setOutputMode);

  return (
    <div className="flex justify-center px-4">
      <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-0.5">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setOutputMode(m.value)}
            aria-label={`출력 모드: ${m.label}`}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              outputMode === m.value
                ? 'bg-white dark:bg-gray-700 text-primary dark:text-accent shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
