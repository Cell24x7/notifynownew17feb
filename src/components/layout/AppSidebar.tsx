import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Send,
  Zap,
  Settings,
  Puzzle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Wallet,
  Plus,
  Users,
  Package,          // ← Plans ke liye add kiya
  CreditCard,       // ← optional, lekin achha lagta hai
  Moon,
  Sun,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const walletBalance = 550;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: MessageSquare, label: 'Chats', path: '/chats' },
    { icon: Users, label: 'Contacts', path: '/contacts' },
    { icon: Send, label: 'Campaigns', path: '/campaigns' },
    { icon: Zap, label: 'Automations', path: '/automations' },
    { icon: Puzzle, label: 'Integrations', path: '/integrations' },
    { icon: Package, label: 'Plans', path: '/userplans' },   // ← yeh wala add kar diya
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-8 h-8 rounded-lg" alt="Cell24x7" />
            <span className="font-bold text-lg">Cell24x7</span>
          </div>
        ) : (
          <img src="/logo.png" className="w-8 h-8 rounded-lg" alt="Logo" />
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </Button>
      </div>

      {/* Wallet */}
      <div className="px-3 py-3 border-b">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-between border-dashed border-primary/50',
                collapsed && 'justify-center'
              )}
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                {!collapsed && <span>₹{walletBalance}</span>}
              </div>
              {!collapsed && <Plus className="h-4 w-4" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <p className="text-sm font-medium">Wallet Balance</p>
            <p className="text-lg font-bold">₹{walletBalance}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Messages, campaigns aur API ke liye use hota hai
            </p>
          </PopoverContent>
        </Popover>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1" onClick={onClose}>
        {navItems.map((item) => {
          const active =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile */}
      <div className="p-4 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 hover:bg-accent/50 p-2 rounded-lg transition-colors">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-medium">
                {user?.name?.charAt(0) || 'U'}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || 'user@example.com'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </>
              )}
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuItem onClick={() => setTheme(isDark ? 'light' : 'dark')}>
              {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
              Theme Toggle
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}