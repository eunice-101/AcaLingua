/**
 * 앱 루트 — 라우팅 + 다크모드 클래스 적용
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import Layout from '@/components/layout/Layout';
import InterpreterPage from '@/components/interpreter/InterpreterPage';
import HistoryPage from '@/components/history/HistoryPage';
import SettingsPage from '@/components/settings/SettingsPage';

export default function App() {
  const darkMode = useAppStore((s) => s.settings.darkMode);

  /* 다크 모드: <html>에 class 토글 */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<InterpreterPage />} />
          <Route path="history" element={<HistoryPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
