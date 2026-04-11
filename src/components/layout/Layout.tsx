/**
 * 루트 레이아웃 — Header + 콘텐츠 영역 + BottomNav
 */
import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import ErrorBanner from './ErrorBanner';
import InstallBanner from './InstallBanner';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Header />
      <ErrorBanner />
      <InstallBanner />
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
