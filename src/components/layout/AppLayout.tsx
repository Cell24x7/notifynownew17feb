import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ✅ VERY IMPORTANT: IMPORT LOGO FROM SRC/ASSETS
import logo from '@/assets/logo.png';

export function AppLayout() {
  const { isAuthenticated } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AppSidebar />
      </div>

      {/* Mobile Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-background transform transition-transform duration-300 lg:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AppSidebar onClose={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-auto">
        {/* 🔥 MOBILE HEADER STRIP */}
        <header className="sticky top-0 z-30 lg:hidden h-16 border-b bg-background">
          <div className="flex h-full items-center justify-between px-4">
            {/* LEFT: LOGO + NAME */}
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="Cell24x7"
                className="h-10 w-10 object-contain"
              />
              <span className="font-bold text-lg tracking-wide">
                Cell24x7
              </span>
            </div>

            {/* RIGHT: BIG TOGGLE */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileSidebarOpen(true)}
              className="h-11 w-11"
            >
              <Menu className="h-7 w-7" />
            </Button>
          </div>
        </header>

        <Outlet />
      </main>
    </div>
  );
}
