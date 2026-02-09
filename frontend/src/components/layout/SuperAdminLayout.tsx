import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ✅ VERY IMPORTANT: IMPORT LOGO FROM SRC/ASSETS
import logo from '@/assets/logo.svg';

export function SuperAdminLayout() {
  const { isAuthenticated, isLoading } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="flex min-h-screen w-full bg-background overflow-hidden">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:border-r lg:border-border">
        <SuperAdminSidebar />
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
        <SuperAdminSidebar onClose={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main Content – offset by sidebar width on desktop */}
      <main className="flex-1 flex flex-col overflow-auto lg:ml-64">
        {/* 🔥 MOBILE HEADER STRIP */}
        <header className="sticky top-0 z-30 lg:hidden h-16 border-b bg-background">
          <div className="flex h-full items-center justify-between px-4">
            {/* LEFT: LOGO + NAME */}
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="NotifyNow"
                className="h-10 w-10 object-contain"
              />
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-wide">
                  NotifyNow
                </span>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Super Admin</span>
              </div>
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

        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
