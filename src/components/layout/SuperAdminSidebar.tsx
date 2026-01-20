import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Megaphone, 
  Building2,
  CreditCard,
  Shield,
  Users,
  Link2,
  Wallet,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Crown,
  LogOut
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/super-admin/dashboard' },
  { icon: Building2, label: 'Clients', path: '/super-admin/clients' },
  { icon: CreditCard, label: 'Plans', path: '/super-admin/plans' },
  { icon: Shield, label: 'Roles & Permissions', path: '/super-admin/roles' },
  { icon: Users, label: 'Resellers', path: '/super-admin/resellers' },
  { icon: Link2, label: 'Affiliates', path: '/super-admin/affiliates' },
  { icon: Wallet, label: 'Wallet / Credits', path: '/super-admin/wallet' },
  { icon: ScrollText, label: 'Reports', path: '/super-admin/reports' },
  { icon: Building2, label: 'Vendors', path: '/super-admin/vendors' },
  { icon: CreditCard, label: 'Numbers', path: '/super-admin/numbers' },
  { icon: ScrollText, label: 'System Logs', path: '/super-admin/logs' },
];

export function SuperAdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Cell24x7" className="w-8 h-8 rounded-lg" />
            <div className="flex flex-col">
              <span className="font-bold text-sm">Cell24x7</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Super Admin</span>
            </div>
          </div>
        )}
        {collapsed && (
          <img src="/logo.png" alt="Cell24x7" className="w-8 h-8 rounded-lg" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    collapsed && 'justify-center px-2'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Theme Toggle */}
      <div className="px-2 pb-2">
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!collapsed && (
          <div className="mb-3 px-2">
            <div className="text-xs text-muted-foreground">Logged in as</div>
            <div className="text-sm font-medium truncate">Platform Owner</div>
          </div>
        )}
        <div className="flex gap-2">
          <NavLink to="/dashboard" className="flex-1">
            <Button
              variant="outline"
              size="sm"
              className={cn('w-full', collapsed && 'px-2')}
              title={collapsed ? 'Switch to Client View' : undefined}
            >
              {collapsed ? <Building2 className="w-4 h-4" /> : 'Client View'}
            </Button>
          </NavLink>
          {!collapsed && (
            <Button variant="ghost" size="icon" onClick={logout} title="Logout">
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
