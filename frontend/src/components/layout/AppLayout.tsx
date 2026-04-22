import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppSidebar } from './AppSidebar';
import { SuperAdminSidebar } from './SuperAdminSidebar';
import { Topbar } from './Topbar';
import { useState } from 'react';

export function AppLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
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

  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:border-r lg:border-border">
        {isAdmin ? <SuperAdminSidebar /> : <AppSidebar />}
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
        {isAdmin ? (
          <SuperAdminSidebar onClose={() => setMobileSidebarOpen(false)} />
        ) : (
          <AppSidebar onClose={() => setMobileSidebarOpen(false)} />
        )}
      </div>

      {/* Main Content – scrollable, with left margin on desktop */}
      <main className="flex-1 flex flex-col overflow-auto lg:ml-64">
        {/* Global Topbar for Desktop & Mobile */}
        <Topbar onMenuClick={() => setMobileSidebarOpen(true)} />

        {/* Page content – yeh scroll hoga */}
        <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}