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
  Crown,
  Wallet,
  Plus,
  Users,
  Globe,
  Radio,
  Mail,
  Lock,
  Bell,
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
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ProfileDropdownProps {
  user: { name?: string; email?: string } | null;
  collapsed: boolean;
  logout: () => void;
}

function ProfileDropdown({ user, collapsed, logout }: ProfileDropdownProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={cn(
          'w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors',
          collapsed && 'justify-center'
        )}>
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-medium text-primary">
              {user?.name?.charAt(0).toUpperCase() || 'D'}
            </span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{user?.name || 'demo'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || 'demo@pingchannel...'}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        side="top" 
        align="start" 
        className="w-56 bg-popover border border-border shadow-lg z-50"
      >
        <DropdownMenuItem asChild>
          <NavLink to="/settings?tab=language" className="flex items-center gap-3 cursor-pointer">
            <Globe className="h-4 w-4" />
            <span>Language</span>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/settings?tab=channels" className="flex items-center gap-3 cursor-pointer">
            <Radio className="h-4 w-4" />
            <span>Channel</span>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/settings?tab=security" className="flex items-center gap-3 cursor-pointer">
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" />
              <Lock className="h-3 w-3" />
            </div>
            <span>Email & Password</span>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/settings?tab=notifications" className="flex items-center gap-3 cursor-pointer">
            <Bell className="h-4 w-4" />
            <span>Notification Settings</span>
          </NavLink>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="flex items-center justify-between cursor-pointer"
          onSelect={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-3">
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span>Dark Mode</span>
          </div>
          <Switch 
            checked={isDark} 
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            className="data-[state=checked]:bg-primary"
          />
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="flex items-center gap-3 cursor-pointer text-destructive focus:text-destructive"
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: MessageSquare, label: 'Chats', path: '/chats' },
  { icon: Users, label: 'Contacts', path: '/contacts' },
  { icon: Send, label: 'Campaigns', path: '/campaigns' },
  { icon: Zap, label: 'Automations', path: '/automations' },
  { icon: Puzzle, label: 'Integrations', path: '/integrations' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout, user } = useAuth();
  const walletBalance = 550; // This would come from a context/API in production

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
            <span className="font-bold text-lg">Cell24x7</span>
          </div>
        )}
        {collapsed && (
          <img src="/logo.png" alt="Cell24x7" className="w-8 h-8 rounded-lg" />
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Wallet Balance */}
      <div className="px-3 py-3 border-b border-border">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-between border-dashed border-primary/50 hover:bg-primary/10',
                collapsed && 'justify-center px-2'
              )}
            >
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                {!collapsed && <span className="text-sm font-medium">₹{walletBalance}</span>}
              </div>
              {!collapsed && <Plus className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Balance</span>
                <span className="text-lg font-bold text-primary">₹{walletBalance}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                ≈ {Math.floor(walletBalance * 20)} WhatsApp messages remaining
              </p>
              <div className="pt-2 border-t">
                <NavLink to="/settings?tab=wallet">
                  <Button className="w-full gradient-primary" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Recharge Wallet
                  </Button>
                </NavLink>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5 flex-shrink-0')} />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>


      {/* Super Admin Link */}
      {/* <div className="px-2 pb-2">
        <NavLink to="/super-admin/dashboard">
          <Button
            variant="outline"
            className={cn(
              'w-full justify-start gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/10',
              collapsed && 'justify-center px-2'
            )}
          >
            <Crown className="h-4 w-4" />
            {!collapsed && <span className="text-sm">Super Admin</span>}
          </Button>
        </NavLink>
      </div> */}

      {/* User section with dropdown */}
      <div className="p-4 border-t border-border">
        <ProfileDropdown user={user} collapsed={collapsed} logout={logout} />
      </div>
    </aside>
  );
}
