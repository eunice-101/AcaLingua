/**
 * 대화 기록 내보내기 유틸리티 — CSV / TXT
 */
import type { ConversationEntry } from '@/types';
import { LANGUAGES } from '@/constants';

/** 파일 다운로드 헬퍼 */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 타임스탬프를 읽기 쉬운 문자열로 변환 */
function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

/** CSV 내보내기 */
export function exportCSV(entries: ConversationEntry[]) {
  const BOM = '\uFEFF';
  const header = 'timestamp,mode,sourceLang,targetLang,originalText,translatedText\n';
  const rows = entries.map((e) => {
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    return [
      formatTime(e.timestamp),
      e.mode,
      e.sourceLang,
      e.targetLang,
      escape(e.originalText),
      escape(e.translatedText),
    ].join(',');
  });
  const csv = BOM + header + rows.join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `acalingua_${Date.now()}.csv`);
}

/** TXT 내보내기 */
export function exportTXT(entries: ConversationEntry[]) {
  const lines = entries.map((e) => {
    const time = formatTime(e.timestamp);
    const modeLabel = e.mode === 'listen' ? '듣기' : '말하기';
    const src = LANGUAGES[e.sourceLang].name;
    const tgt = LANGUAGES[e.targetLang].name;
    return `[${time}] (${modeLabel}: ${src} → ${tgt})\n원문: ${e.originalText}\n번역: ${e.translatedText}\n`;
  });
  const txt = `AcaLingua 대화 기록\n${'='.repeat(40)}\n\n${lines.join('\n')}`;
  downloadBlob(new Blob([txt], { type: 'text/plain;charset=utf-8' }), `acalingua_${Date.now()}.txt`);
}
