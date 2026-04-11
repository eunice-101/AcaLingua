/**
 * 듣기/말하기/자동 모드 토글 — 세그먼트 컨트롤
 */
import { useAppStore } from '@/stores/useAppStore';
import type { InterpreterMode } from '@/types';

export default function ModeToggle() {
  const currentMode = useAppStore((s) => s.currentMode);
  const autoDirection = useAppStore((s) => s.autoDirection);
  const setMode = useAppStore((s) => s.setMode);

  const modes: { value: InterpreterMode; label: string; desc: string }[] = [
    { value: 'listen', label: '듣기', desc: '상대방 → 나' },
    { value: 'speak', label: '말하기', desc: '나 → 상대방' },
    { value: 'auto', label: '자동', desc: 'Q&A 교대' },
  ];

  const getButtonStyle = (value: InterpreterMode, isActive: boolean) => {
    if (!isActive) return 'text-gray-500 dark:text-gray-400';
    switch (value) {
      case 'listen': return 'bg-listen/10 text-listen font-semibold shadow-sm';
      case 'speak': return 'bg-speak/10 text-speak font-semibold shadow-sm';
      case 'auto': return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-semibold shadow-sm';
    }
  };

  return (
    <div className="flex justify-center px-4 pt-3">
      <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-full max-w-sm">
        {modes.map((m) => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            aria-label={`${m.label} 모드: ${m.desc}`}
            className={`flex-1 py-2 rounded-lg text-center transition-all ${getButtonStyle(m.value, currentMode === m.value)}`}
          >
            <div className="text-sm font-medium">{m.label}</div>
            <div className="text-[10px] opacity-70">
              {m.value === 'auto' && currentMode === 'auto'
                ? autoDirection === 'listen' ? '듣는 중...' : '말하는 중...'
                : m.desc}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
