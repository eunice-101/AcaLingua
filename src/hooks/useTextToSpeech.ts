/**
 * TTS 훅 — Web Speech API SpeechSynthesis 래퍼
 * 타겟 언어에 맞는 음성 자동 선택, 설정 반영
 */
import { useCallback, useRef } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { LANGUAGES } from '@/constants';
import type { LanguageCode } from '@/types';

export function useTextToSpeech() {
  const settings = useAppStore((s) => s.settings);
  const outputMode = useAppStore((s) => s.outputMode);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /** 해당 언어에 맞는 음성을 찾아 반환 (로컬 음성 우선) */
  const findVoice = useCallback((langCode: LanguageCode): SpeechSynthesisVoice | null => {
    const voices = speechSynthesis.getVoices();
    const bcp47 = LANGUAGES[langCode].bcp47;
    const langPrefix = bcp47.split('-')[0];

    // 정확한 BCP-47 매칭 (로컬 음성 우선)
    const exactLocal = voices.find((v) => v.lang === bcp47 && v.localService);
    if (exactLocal) return exactLocal;

    const exact = voices.find((v) => v.lang === bcp47);
    if (exact) return exact;

    // 언어 접두사 매칭
    const prefixLocal = voices.find((v) => v.lang.startsWith(langPrefix) && v.localService);
    if (prefixLocal) return prefixLocal;

    return voices.find((v) => v.lang.startsWith(langPrefix)) ?? null;
  }, []);

  /** 텍스트를 음성으로 재생 */
  const speak = useCallback(
    (text: string, langCode: LanguageCode) => {
      // 출력 모드가 screen이면 재생하지 않음
      if (outputMode === 'screen') return;

      // 이전 재생 취소
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.ttsRate;
      utterance.volume = settings.ttsVolume;

      const voice = findVoice(langCode);
      if (voice) utterance.voice = voice;
      utterance.lang = LANGUAGES[langCode].bcp47;

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [outputMode, settings.ttsRate, settings.ttsVolume, findVoice],
  );

  /** 재생 중지 */
  const stop = useCallback(() => {
    speechSynthesis.cancel();
  }, []);

  return { speak, stop };
}
