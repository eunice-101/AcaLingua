/**
 * 통역 메인 페이지 — 핵심 기능 통합
 * 레이스컨디션 방지: handleFinalResult에서 최신 스토어 상태를 직접 읽음
 * auto 모드: 번역 완료 후 방향 자동 전환 (Q&A 교대)
 */
import { useCallback, useRef, useEffect } from 'react';
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
import { generateId } from '@/utils/uuid';
import type { ConversationEntry } from '@/types';

export default function InterpreterPage() {
  const currentMode = useAppStore((s) => s.currentMode);
  const isRecording = useAppStore((s) => s.isRecording);

  const { speak } = useTextToSpeech();
  useWakeLock();

  /** 컴포넌트 마운트 여부 추적 */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /**
   * 음성인식 final 결과 → 번역 → TTS → (auto 모드 시) 방향 전환
   */
  const handleFinalResult = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const state = useAppStore.getState();
      const mode = state.currentMode;
      const effectiveDir = mode === 'auto' ? state.autoDirection : mode;
      const from = effectiveDir === 'listen' ? state.sourceLang : state.targetLang;
      const to = effectiveDir === 'listen' ? state.targetLang : state.sourceLang;

      // 번역 중 표시
      useAppStore.getState().setTranslating(true);

      try {
        const result = await translate(
          { text, sourceLang: from, targetLang: to },
          state.settings.translationEngine,
          state.settings.apiKey || undefined,
        );

        if (!mountedRef.current) return;

        const translatedText = result.translatedText || '';
        useAppStore.getState().setTranslation(translatedText);
        useAppStore.getState().setTranslating(false);

        // TTS 재생
        if (translatedText) speak(translatedText, to);

        // 대화 기록 추가
        const entry: ConversationEntry = {
          id: generateId(),
          timestamp: Date.now(),
          mode: effectiveDir,
          sourceLang: from,
          targetLang: to,
          originalText: text,
          translatedText,
        };
        useAppStore.getState().addConversation(entry);

        // auto 모드: 번역 완료 후 방향 전환
        if (mode === 'auto') {
          // TTS가 끝난 후 방향 전환하도록 약간의 딜레이
          // (speak 함수는 비동기지만 speechSynthesis는 완료 콜백이 불안정하므로 타이머 사용)
          const estimatedTTSMs = Math.max(translatedText.length * 80, 1500);
          setTimeout(() => {
            if (!mountedRef.current) return;
            const latest = useAppStore.getState();
            // 아직 auto 모드이고 녹음 중이면 방향 전환
            if (latest.currentMode === 'auto') {
              latest.toggleAutoDirection();
            }
          }, estimatedTTSMs);
        }
      } catch (err) {
        if (!mountedRef.current) return;
        useAppStore.getState().setTranslating(false);
        const msg = err instanceof Error ? err.message : '번역 실패';
        useAppStore.getState().setError(msg);
      }
    },
    [speak],
  );

  const { toggle } = useSpeechRecognition({ onFinalResult: handleFinalResult });

  /** 모드 전환 시 녹음 중이면 자동 중지 */
  const prevModeRef = useRef(currentMode);
  useEffect(() => {
    if (prevModeRef.current !== currentMode && isRecording) {
      toggle();
    }
    prevModeRef.current = currentMode;
  }, [currentMode, isRecording, toggle]);

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
