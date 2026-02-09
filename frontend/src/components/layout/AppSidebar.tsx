import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  Package,
  Moon,
  Sun,
  ChevronDown,
  UserCircle,
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
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { theme, setTheme } = useTheme();

  const isDark = theme === 'dark';

  // Real wallet balance from auth context
  const walletBalance = user?.credits_available ?? 0;

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: MessageSquare, label: 'Chats', path: '/chats' },
    { icon: Users, label: 'Contacts', path: '/contacts' },
    { icon: Send, label: 'Campaigns', path: '/campaigns' },
    { icon: Zap, label: 'Automations', path: '/automations' },
    { icon: Puzzle, label: 'Integrations', path: '/integrations' },
    { icon: Package, label: 'User Plans', path: '/user-plans' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  // Mobile pe collapse mat karo – text dikhega
  useEffect(() => {
    const handleResize = () => {
      // Desktop pe hi collapse allow karo
      if (window.innerWidth >= 1024) {
        setCollapsed(false); // ya tumhari default state
      } else {
        setCollapsed(false); // mobile pe hamesha full text + icon
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-300',
        'w-full',                    // mobile pe poora width le
        'lg:w-64 lg:border-r',       // desktop pe fixed width
        collapsed && 'lg:w-16 lg:border-r-0'  // sirf desktop collapse
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b bg-background/80">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.svg"
            alt="NotifyNow"
            className="w-8 h-8 rounded-lg object-contain"
          />
          <span className="font-bold text-xl tracking-tight">NotifyNow</span>
        </div>

        {/* <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button> */}
      </div>

      {/* Wallet – real balance */}
      <div className="px-3 py-4 border-b">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between border-dashed border-primary/40 hover:border-primary/70"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="h-5 w-5 text-primary flex-shrink-0" />
                <span className="font-medium">₹{walletBalance.toLocaleString()}</span>
              </div>
              <Plus className="h-4 w-4 opacity-80" />
            </Button>
          </PopoverTrigger>

          <PopoverContent side="right" className="w-72 p-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Available Credits</p>
              <p className="text-2xl font-bold">₹{walletBalance.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                Campaigns aur messages ke liye available
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Navigation – text hamesha dikhega mobile pe */}
      <nav className="flex-1 px-2 py-5 space-y-1 overflow-y-auto" onClick={onClose}>
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span> {/* ← text hamesha dikhega */}
            </NavLink>
          );
        })}
      </nav>

      {/* Profile Dropdown */}
      <div className="p-4 border-t bg-background/80">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'w-full flex items-center gap-3 p-2 rounded-xl transition-all',
                'hover:bg-accent/70 active:bg-accent/90'
              )}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary flex-shrink-0">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>

              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold truncate">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {user?.email || '—'}
                </p>
              </div>

              <ChevronDown className="h-4 w-4 opacity-70 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent className="w-64" align="end" sideOffset={8}>
            <DropdownMenuItem
              className="gap-2 py-2.5 cursor-pointer"
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              className="gap-2 py-2.5 text-destructive focus:bg-destructive/10 cursor-pointer"
              onClick={logout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}