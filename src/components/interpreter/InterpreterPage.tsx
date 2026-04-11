/**
 * 통역 메인 페이지 — 핵심 기능 통합
 */
import { useCallback } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { translate } from '@/services/translationService';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useWakeLock } from '@/hooks/useWakeLock';
import ModeToggle from './ModeToggle';
import LanguageSelector from './LanguageSelector';
import OutputModeSelector from './OutputModeSelector';
import RecordButton from './RecordButton';
import TranscriptPanel from './TranscriptPanel';
import type { ConversationEntry } from '@/types';

export default function InterpreterPage() {
  const currentMode = useAppStore((s) => s.currentMode);
  const sourceLang = useAppStore((s) => s.sourceLang);
  const targetLang = useAppStore((s) => s.targetLang);
  const settings = useAppStore((s) => s.settings);
  const setTranslation = useAppStore((s) => s.setTranslation);
  const addConversation = useAppStore((s) => s.addConversation);
  const setError = useAppStore((s) => s.setError);

  const { speak } = useTextToSpeech();
  useWakeLock();

  /**
   * 모드별 실제 번역 방향 결정
   * - 듣기 모드: 상대가 외국어(sourceLang)로 말함 → 내 언어(targetLang)로 번역
   * - 말하기 모드: 내가 내 언어(targetLang)로 말함 → 상대 언어(sourceLang)로 번역
   */
  const translateFrom = currentMode === 'listen' ? sourceLang : targetLang;
  const translateTo = currentMode === 'listen' ? targetLang : sourceLang;
  const ttsLang = translateTo; // 번역된 언어로 TTS 재생

  /** 음성인식 final 결과 → 번역 → TTS */
  const handleFinalResult = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      try {
        const result = await translate(
          { text, sourceLang: translateFrom, targetLang: translateTo },
          settings.translationEngine,
          settings.apiKey || undefined,
        );

        setTranslation(result.translatedText);

        // TTS 재생 (번역된 언어로)
        speak(result.translatedText, ttsLang);

        // 대화 기록 추가
        const entry: ConversationEntry = {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          mode: currentMode,
          sourceLang: translateFrom,
          targetLang: translateTo,
          originalText: text,
          translatedText: result.translatedText,
        };
        addConversation(entry);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '번역 실패';
        setError(msg);
      }
    },
    [translateFrom, translateTo, ttsLang, settings, currentMode, setTranslation, addConversation, setError, speak],
  );

  const { toggle, isRecording } = useSpeechRecognition({ onFinalResult: handleFinalResult });

  return (
    <div className="flex flex-col h-full">
      <ModeToggle />
      <LanguageSelector />
      <OutputModeSelector />
      <TranscriptPanel />
      <RecordButton isRecording={isRecording} onToggle={toggle} />
    </div>
  );
}
