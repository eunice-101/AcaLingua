/**
 * 통역 메인 페이지 — 핵심 기능 통합
 * 레이스컨디션 방지: handleFinalResult에서 최신 스토어 상태를 직접 읽음
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

  /** 컴포넌트 마운트 여부 추적 (unmount 후 상태 업데이트 방지) */
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /**
   * 음성인식 final 결과 → 번역 → TTS
   * 스테일 클로저 방지: 콜백 내부에서 getState()로 최신 상태를 읽음
   */
  const handleFinalResult = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // 최신 스토어 상태 직접 읽기 (스테일 클로저 방지)
      const state = useAppStore.getState();
      const mode = state.currentMode;
      const from = mode === 'listen' ? state.sourceLang : state.targetLang;
      const to = mode === 'listen' ? state.targetLang : state.sourceLang;

      try {
        const result = await translate(
          { text, sourceLang: from, targetLang: to },
          state.settings.translationEngine,
          state.settings.apiKey || undefined,
        );

        // unmount 후에는 상태 업데이트 건너뛰기
        if (!mountedRef.current) return;

        const translatedText = result.translatedText || '';
        useAppStore.getState().setTranslation(translatedText);

        // TTS 재생 (번역된 언어로)
        if (translatedText) speak(translatedText, to);

        // 대화 기록 추가
        const entry: ConversationEntry = {
          id: generateId(),
          timestamp: Date.now(),
          mode,
          sourceLang: from,
          targetLang: to,
          originalText: text,
          translatedText,
        };
        useAppStore.getState().addConversation(entry);
      } catch (err) {
        if (!mountedRef.current) return;
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
      // 모드가 바뀌었고 녹음 중이면 녹음 중지
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
