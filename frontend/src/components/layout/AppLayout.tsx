import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.svg';

export function AppLayout() {
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
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:border-r lg:border-border">
        <AppSidebar />
      </div>

      {/* Mobile Sidebar (slide-in, not fixed) */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 bg-background transform transition-transform duration-300 ease-in-out lg:hidden shadow-2xl
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          w-[90vw] max-w-[380px]`}
      >
        <AppSidebar onClose={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Main Content – scrollable, with left margin on desktop */}
      <main className="flex-1 flex flex-col overflow-auto lg:ml-64">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 lg:hidden h-16 border-b bg-background">
          <div className="flex h-full items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="NotifyNow" className="h-10 w-10 object-contain" />
              <span className="font-bold text-lg tracking-wide">NotifyNow</span>
            </div>

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

        {/* Page content – yeh scroll hoga */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}