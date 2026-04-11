/**
 * 음성 인식 훅 — Web Speech API (SpeechRecognition) 래퍼
 * continuous + interimResults 모드로 실시간 음성인식 제공
 */
import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { LANGUAGES } from '@/constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Web Speech API 지원 여부 */
export function isSpeechRecognitionSupported(): boolean {
  return !!(
    (window as unknown as Record<string, unknown>).SpeechRecognition ||
    (window as unknown as Record<string, unknown>).webkitSpeechRecognition
  );
}

interface UseSpeechRecognitionOptions {
  /** final 결과가 확정되었을 때 호출 */
  onFinalResult: (text: string) => void;
}

export function useSpeechRecognition({ onFinalResult }: UseSpeechRecognitionOptions) {
  const recognitionRef = useRef<any>(null);
  const isRecording = useAppStore((s) => s.isRecording);
  const setRecording = useAppStore((s) => s.setRecording);
  const setTranscript = useAppStore((s) => s.setTranscript);
  const setInterimTranscript = useAppStore((s) => s.setInterimTranscript);
  const settings = useAppStore((s) => s.settings);

  /** 현재 입력 언어 (모드에 따라 다름) */
  const currentMode = useAppStore((s) => s.currentMode);
  const sourceLang = useAppStore((s) => s.sourceLang);
  const targetLang = useAppStore((s) => s.targetLang);
  const inputLang = currentMode === 'listen' ? sourceLang : targetLang;

  /** 인식 시작 */
  const start = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      useAppStore.getState().setError('이 브라우저는 음성인식을 지원하지 않습니다. Chrome, Edge, Safari를 사용해주세요.');
      return;
    }

    const SpeechRecognition =
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
      (window as unknown as Record<string, unknown>).webkitSpeechRecognition;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new (SpeechRecognition as any)();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGES[inputLang].bcp47;

    recognition.onresult = (event: { results: SpeechRecognitionResultList }) => {
      let interim = '';
      let final = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result || result.length === 0) continue; // 빈 결과 건너뛰기
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);
      if (final) {
        setTranscript(final);
        onFinalResult(final);
      }
    };

    recognition.onerror = (event: { error: string }) => {
      if (event.error === 'not-allowed') {
        useAppStore.getState().setError('마이크 사용 권한이 필요합니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
      } else if (event.error !== 'aborted') {
        useAppStore.getState().setError(`음성인식 오류: ${event.error}`);
      }
      setRecording(false);
    };

    recognition.onend = () => {
      // 연속 인식 모드이고 아직 녹음 중이면 자동 재시작
      if (useAppStore.getState().isRecording && useAppStore.getState().settings.continuousMode) {
        try {
          recognition.start();
        } catch {
          setRecording(false);
        }
      } else {
        setRecording(false);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setRecording(true);
    setTranscript('');
    setInterimTranscript('');
  }, [inputLang, onFinalResult, setRecording, setTranscript, setInterimTranscript, settings.continuousMode]);

  /** 인식 중지 */
  const stop = useCallback(() => {
    if (recognitionRef.current) {
      setRecording(false); // onend에서 재시작 방지를 위해 먼저 설정
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, [setRecording]);

  /** 토글 */
  const toggle = useCallback(() => {
    if (isRecording) {
      stop();
    } else {
      start();
    }
  }, [isRecording, start, stop]);

  /** 컴포넌트 언마운트 시 정리 */
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

  return { start, stop, toggle, isRecording, isSupported: isSpeechRecognitionSupported() };
}
