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
  ChevronDown,
  LogOut,
  Wallet,
  Plus,
  Users,
  Package,
  CreditCard,
  Moon,
  Sun,
  UserCircle,
  BarChart3,
  ShoppingCart,
  FileText,
  Globe,
  Bot,
  ListFilter,
  Mail,
  Terminal
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
import { useBranding } from '@/contexts/BrandingContext';

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [reportsOpen, setReportsOpen] = useState(location.pathname.startsWith('/reports'));
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings } = useBranding();

  const isDark = theme === 'dark';


  // Permissions check
  // Default to true if no permissions found to avoid locking out users during transition
  const hasPermission = (featureName: string) => {
    // Platform admins always have full access
    if (user?.role === 'superadmin' || user?.role === 'admin') return true;

    if (!user?.permissions || !Array.isArray(user.permissions)) {
       return false;
    }

    const target = featureName.toLowerCase().trim();

    return user.permissions.some((p: any) => {
      const rawFeature = (typeof p === 'string' ? p : p?.feature || '').toLowerCase().trim();
      
      // 1. Direct match
      if (rawFeature === target) return true;

      // 2. Base name match (ignoring ' - view', ' - manage', etc.)
      const baseRaw = rawFeature.split(' - ')[0].trim();
      const baseTarget = target.split(' - ')[0].trim();
      if (baseRaw === baseTarget) return true;

      // 3. Singular/Plural support & Fuzzy matching
      // Normalize by removing 's' at the end and spaces/dashes
      const normalize = (s: string) => s.replace(/s\b/g, '').replace(/[\s-]/g, '');
      if (normalize(baseRaw) === normalize(baseTarget)) return true;

      return false;
    });
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', show: hasPermission('Dashboard - View') },
    { icon: CreditCard, label: 'Plans', path: '/user-plans', show: hasPermission('User Plans - View') },
    { icon: FileText, label: 'Templates', path: '/templates', show: hasPermission('Template - View') },
    { icon: Send, label: 'Campaigns', path: '/campaigns', show: hasPermission('Campaigns - View') },
    { 
      icon: BarChart3, 
      label: 'Reports', 
      path: '/reports', 
      show: hasPermission('Reports - View'),
      subItems: [
        { label: 'Summary Report', path: '/reports?tab=summary' },
        { label: 'Detailed Report', path: '/reports?tab=detailed' },
        { label: 'API Report', path: '/reports?tab=api' }
      ]
    },
    { icon: MessageSquare, label: 'Chats', path: '/chats', show: hasPermission('Chat - View') },
    { icon: Users, label: 'Contacts', path: '/contacts', show: hasPermission('Contacts - View') },
    { icon: Package, label: 'DLT Templates', path: '/dlt-templates', show: hasPermission('DLT Templates - View') },
    { icon: Zap, label: 'Automations', path: '/automations', show: hasPermission('Automations - View') },
    { icon: Bot, label: 'Chatflows', path: '/chatflows', show: hasPermission('Chatflows - View') },
    { icon: Puzzle, label: 'Integrations', path: '/integrations', show: hasPermission('Integrations - View') },
    { icon: Users, label: 'Manage Users', path: '/reseller/users', show: hasPermission('Reseller Users - View') },
    { icon: Globe, label: 'White-labeling', path: '/reseller/branding', show: hasPermission('Reseller Branding - View') },
    { icon: ShoppingCart, label: 'Marketplace', path: '/marketplace', show: hasPermission('Marketplace - View') },
    { icon: Wallet, label: 'Wallet', path: '/wallet', show: hasPermission('Wallet - View') },
    { icon: Settings, label: 'Settings', path: '/settings', show: hasPermission('Settings - View') },
    { icon: Terminal, label: 'API Hub', path: '/api-docs', show: !!user?.is_api_allowed },
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
            src={settings?.logo_url || "/logo-full.png"}
            alt={settings?.brand_name || "NotifyNow"}
            className="w-8 h-8 rounded-lg object-contain"
          />
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight leading-none">{settings?.brand_name || "NotifyNow"}</span>
            {user?.role === 'reseller' && !settings?.brand_name && (
               <span className="text-[10px] text-muted-foreground uppercase font-semibold mt-1">
                 Reseller Platform
               </span>
            )}
            {user?.role && user.role !== 'user' && user.role !== 'reseller' && (
               <span className="text-[10px] text-primary uppercase font-bold mt-1">
                 {user.role} Panel
               </span>
            )}
          </div>
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

      {/* Navigation – text hamesha dikhega mobile pe */}
      <nav className="flex-1 px-2 py-5 space-y-1 overflow-y-auto" onClick={onClose}>
        {navItems.filter(item => item.show).map((item: any) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`) ||
            (item.subItems && item.subItems.some((si: any) => location.pathname + location.search === si.path));

          if (item.subItems) {
            return (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => setReportsOpen(!reportsOpen)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
                    <span>{item.label}</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", reportsOpen && "rotate-180")} />
                </button>
                {reportsOpen && (
                  <div className="pl-11 space-y-1 mt-1">
                    {item.subItems.map((sub: any) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={({ isActive: subIsActive }) => cn(
                          'block py-2 text-[13px] font-medium rounded-md transition-all',
                          (location.pathname + location.search === sub.path)
                            ? 'text-primary font-bold'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

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
              {item.icon && <item.icon className="h-5 w-5 flex-shrink-0" />}
              <span>{item.label}</span> {/* ← text hamesha dikhega */}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer - Minimized */}
      <div className="p-4 border-t bg-slate-50/50 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
          v1.2.0
        </p>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-medium text-slate-500">System Live</span>
        </div>
      </div>
    </aside>
  );
}