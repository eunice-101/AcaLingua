/**
 * 설정 페이지 — TTS, 글자 크기, 다크모드, 화면 꺼짐 방지, 연속 인식, API 키
 */
import { useAppStore } from '@/stores/useAppStore';
import type { FontSizeLevel, TranslationEngine } from '@/types';

/** 슬라이더 설정 항목 */
function SliderSetting({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <span className="text-gray-400 text-xs">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary dark:accent-accent"
      />
    </div>
  );
}

/** 토글 설정 항목 */
function ToggleSetting({ label, desc, value, onChange }: {
  label: string; desc?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-700 dark:text-gray-300">{label}</p>
        {desc && <p className="text-[11px] text-gray-400">{desc}</p>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
          value ? 'bg-primary dark:bg-accent' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          value ? 'translate-x-5' : ''
        }`} />
      </button>
    </div>
  );
}

const fontSizeOptions: { value: FontSizeLevel; label: string }[] = [
  { value: 'small', label: '소' },
  { value: 'medium', label: '중' },
  { value: 'large', label: '대' },
  { value: 'xlarge', label: '특대' },
];

const engineOptions: { value: TranslationEngine; label: string }[] = [
  { value: 'auto', label: '자동 (DeepL + Google 폴백)' },
  { value: 'deepl', label: 'DeepL만' },
  { value: 'google', label: 'Google만' },
];

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <div className="px-4 py-4 space-y-6 max-w-lg mx-auto">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">설정</h2>

      {/* TTS */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">음성 출력 (TTS)</h3>
        <SliderSetting
          label="읽기 속도" value={settings.ttsRate}
          min={0.5} max={2} step={0.1}
          onChange={(v) => updateSettings({ ttsRate: v })}
          display={`${settings.ttsRate.toFixed(1)}x`}
        />
        <SliderSetting
          label="음량" value={settings.ttsVolume}
          min={0} max={1} step={0.1}
          onChange={(v) => updateSettings({ ttsVolume: v })}
          display={`${Math.round(settings.ttsVolume * 100)}%`}
        />
      </section>

      {/* 화면 */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">화면</h3>
        <div className="space-y-1">
          <span className="text-sm text-gray-700 dark:text-gray-300">글자 크기</span>
          <div className="flex gap-2">
            {fontSizeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ fontSize: opt.value })}
                className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                  settings.fontSize === opt.value
                    ? 'border-primary bg-primary/10 text-primary dark:border-accent dark:bg-accent/10 dark:text-accent font-semibold'
                    : 'border-gray-200 dark:border-gray-700 text-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <ToggleSetting
          label="다크 모드" value={settings.darkMode}
          onChange={(v) => updateSettings({ darkMode: v })}
        />
      </section>

      {/* 인식 */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">음성 인식</h3>
        <ToggleSetting
          label="연속 인식" desc="발화 종료 후 자동으로 다시 인식 시작"
          value={settings.continuousMode}
          onChange={(v) => updateSettings({ continuousMode: v })}
        />
        <ToggleSetting
          label="화면 꺼짐 방지" desc="통역 중 화면이 꺼지지 않도록 유지"
          value={settings.wakeLock}
          onChange={(v) => updateSettings({ wakeLock: v })}
        />
      </section>

      {/* 번역 엔진 */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">번역 엔진</h3>
        <select
          value={settings.translationEngine}
          onChange={(e) => updateSettings({ translationEngine: e.target.value as TranslationEngine })}
          className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2"
        >
          {engineOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <div className="space-y-1">
          <span className="text-sm text-gray-700 dark:text-gray-300">DeepL API 키</span>
          <input
            type="password"
            value={settings.apiKey}
            onChange={(e) => updateSettings({ apiKey: e.target.value })}
            placeholder="DeepL API 키를 입력하세요"
            className="w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 placeholder:text-gray-400"
          />
          <p className="text-[10px] text-gray-400">api-free.deepl.com에서 무료 키를 발급받을 수 있습니다</p>
        </div>
      </section>
    </div>
  );
}
