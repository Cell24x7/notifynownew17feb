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
  LifeBuoy,
  Smartphone,
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
import { useBranding } from '@/contexts/BrandingContext';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logonotify.jpeg';

interface AppSidebarProps {
  onClose?: () => void;
}

export function AppSidebar({ onClose }: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [reportsOpen, setReportsOpen] = useState(location.pathname.startsWith('/reports'));
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { settings } = useBranding();

  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const isDark = theme === 'dark';

  const fetchOpenTicketsCount = async () => {
    if (user?.role === 'superadmin' || user?.role === 'admin' || user?.role === 'staff') {
      try {
        const response = await api.get('/support/admin/tickets');
        if (response.data.success) {
          const openCount = response.data.tickets.filter((t: any) => t.status === 'open').length;
          setOpenTicketsCount(openCount);
        }
      } catch (err) {
        // Silent fail for background check
      }
    }
  };

  useEffect(() => {
    fetchOpenTicketsCount();
    const interval = setInterval(fetchOpenTicketsCount, 30000); // Check every 30 secs
    return () => clearInterval(interval);
  }, [user?.id]);



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
    { icon: Smartphone, label: 'Channels', path: '/channels', show: Boolean(Number(user?.is_proero_enabled)) || user?.impersonatedBy === 'superadmin' || localStorage.getItem('impersonating') === 'true' },
    { icon: Globe, label: 'Social Media', path: '/social-media', show: Boolean(Number(user?.is_smm_enabled)) || user?.impersonatedBy === 'superadmin' || localStorage.getItem('impersonating') === 'true' },
    { icon: Users, label: 'Contacts', path: '/contacts', show: hasPermission('Contacts - View') },
    { icon: Package, label: 'DLT Templates', path: '/dlt-templates', show: hasPermission('DLT Templates - View') },
    { icon: Zap, label: 'Automations', path: '/automations', show: hasPermission('Automations - View') },
    { icon: Bot, label: 'Chatflows', path: '/chatflows', show: hasPermission('Chatflows - View') },
    { icon: Puzzle, label: 'Integrations', path: '/integrations', show: hasPermission('Integrations - View') },
    { icon: Users, label: 'Manage Users', path: '/reseller/users', show: hasPermission('Reseller Users - View') },
    { icon: Globe, label: 'Whitelabel & Payments', path: '/reseller/branding', show: hasPermission('Reseller Branding - View') },
    { icon: ShoppingCart, label: 'Marketplace', path: '/marketplace', show: hasPermission('Marketplace - View') },
    { icon: Wallet, label: 'Wallet', path: '/wallet', show: hasPermission('Wallet - View') },
    { 
      icon: Terminal, 
      label: 'API Hub', 
      path: '/api-docs', 
      show: Number(user?.is_api_allowed) === 1 || 
            user?.role === 'superadmin' || 
            user?.role === 'admin' || 
            user?.role === 'reseller' || 
            user?.impersonatedBy === 'superadmin'
    },
    { icon: LifeBuoy, label: 'Support', path: '/support', show: true },
    { icon: Settings, label: 'Settings', path: '/settings', show: hasPermission('Settings - View') },
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
      <div className={cn(
        "flex items-center justify-between px-4 border-b bg-background/80",
        collapsed ? "h-16" : "h-[13rem]"
      )}>
        <div className="flex items-center gap-2.5">
          {collapsed ? (
            <img
              src={settings?.logo_url || logo}
              alt={settings?.brand_name || "NotifyNow"}
              className="w-16 h-16 rounded-lg object-contain"
            />
          ) : (
            <img
              src={settings?.logo_url || logo}
              alt={settings?.brand_name || "NotifyNow"}
              className="h-[13rem] w-64 object-contain"
            />
          )}
        </div>
        <Button variant="ghost" size="icon" className="hidden lg:flex" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </Button>
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
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-md font-bold'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
                  )}
                >
                  <div className="flex items-center gap-3">
                    {item.icon && <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-slate-400")} />}
                    <span className="tracking-tight">{item.label}</span>
                  </div>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", reportsOpen && "rotate-180")} />
                </button>
                {reportsOpen && (
                  <div className="pl-11 space-y-1 mt-1 animate-in slide-in-from-top-2 duration-300">
                    {item.subItems.map((sub: any) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        className={({ isActive: subIsActive }) => cn(
                          'block py-2 text-[13px] rounded-md transition-all',
                          (location.pathname + location.search === sub.path)
                            ? 'text-primary font-extrabold translate-x-1'
                            : 'text-slate-400 hover:text-slate-900 font-medium hover:translate-x-1'
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
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
              )}
            >
              {item.icon && <item.icon className={cn("h-5 w-5 flex-shrink-0 transition-transform group-hover:scale-110", isActive ? "text-primary-foreground" : "text-slate-400")} />}
              <span className="flex-1 tracking-tight">{item.label}</span>
              {item.label === 'Support' && openTicketsCount > 0 && (
                <span className="flex items-center justify-center bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full animate-bounce shadow-lg">
                  {openTicketsCount}
                </span>
              )}

            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t bg-slate-50/50">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            v1.2.0
          </p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-medium text-slate-500">System Live</span>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 justify-center"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout Session</span>
        </Button>
      </div>
    </aside>
  );
}