/**
 * TTS 훅 — Web Speech API SpeechSynthesis 래퍼
 * - 브라우저 피처 감지 (CRASH #4 수정)
 * - getVoices() 비동기 로드 대응 (CRASH #2 수정)
 * - 남녀 목소리 선택 지원
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { LANGUAGES } from '@/constants';
import type { LanguageCode } from '@/types';

/** speechSynthesis 지원 여부 */
const isTTSSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

/** 음성 이름에서 성별 추측 (휴리스틱) */
function guessGender(voice: SpeechSynthesisVoice): 'male' | 'female' | 'unknown' {
  const name = voice.name.toLowerCase();
  // 남성 키워드
  if (/\b(male|man|homme|mann|hombre|남|男)\b/.test(name)) return 'male';
  if (/\b(david|mark|james|daniel|thomas|george|zira|yusuf)\b/.test(name)) return 'male';
  // 여성 키워드
  if (/\b(female|woman|femme|frau|mujer|여|女)\b/.test(name)) return 'female';
  if (/\b(samantha|victoria|karen|fiona|alice|anna|yuna|sunhi|kyoko|mei-jia)\b/.test(name)) return 'female';
  return 'unknown';
}

export function useTextToSpeech() {
  const settings = useAppStore((s) => s.settings);
  const outputMode = useAppStore((s) => s.outputMode);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  /** 음성 목록 비동기 로드 (getVoices 레이스컨디션 해결) */
  useEffect(() => {
    if (!isTTSSupported) return;

    const loadVoices = () => {
      const available = speechSynthesis.getVoices();
      if (available.length > 0) setVoices(available);
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  /** 해당 언어 + 성별에 맞는 음성을 찾아 반환 */
  const findVoice = useCallback(
    (langCode: LanguageCode): SpeechSynthesisVoice | null => {
      if (voices.length === 0) return null;

      const bcp47 = LANGUAGES[langCode].bcp47;
      const langPrefix = bcp47.split('-')[0];
      const genderPref = settings.ttsGender;

      // 언어 매칭 후보 필터
      const exactMatches = voices.filter((v) => v.lang === bcp47);
      const prefixMatches = voices.filter((v) => v.lang.startsWith(langPrefix));
      const candidates = exactMatches.length > 0 ? exactMatches : prefixMatches;

      if (candidates.length === 0) return null;

      // 성별 선호 적용
      if (genderPref !== 'any') {
        const genderMatch = candidates.find(
          (v) => guessGender(v) === genderPref && v.localService,
        );
        if (genderMatch) return genderMatch;

        const genderMatchRemote = candidates.find(
          (v) => guessGender(v) === genderPref,
        );
        if (genderMatchRemote) return genderMatchRemote;
      }

      // 로컬 음성 우선
      const local = candidates.find((v) => v.localService);
      return local ?? candidates[0];
    },
    [voices, settings.ttsGender],
  );

  /** 텍스트를 음성으로 재생 */
  const speak = useCallback(
    (text: string, langCode: LanguageCode) => {
      if (!isTTSSupported) return;
      if (outputMode === 'screen') return;
      if (!text) return;

      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = settings.ttsRate;
      utterance.volume = settings.ttsVolume;
      utterance.lang = LANGUAGES[langCode].bcp47;

      const voice = findVoice(langCode);
      if (voice) utterance.voice = voice;

      utteranceRef.current = utterance;
      speechSynthesis.speak(utterance);
    },
    [outputMode, settings.ttsRate, settings.ttsVolume, findVoice],
  );

  /** 재생 중지 */
  const stop = useCallback(() => {
    if (isTTSSupported) speechSynthesis.cancel();
  }, []);

  return { speak, stop, voices };
}
