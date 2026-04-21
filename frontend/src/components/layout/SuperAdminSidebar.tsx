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
  LogOut,
  FileText,
  MessageSquareMore,
  MessageCircle,
  Send,
  ChevronDown,
  Rocket,
  Zap,
  LifeBuoy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useBranding } from '@/contexts/BrandingContext';

// ✅ VERY IMPORTANT: IMPORT LOGO FROM SRC/ASSETS
import logo from '@/assets/logo-full.png';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/super-admin/dashboard', permission: 'Dashboard - View' },
  { icon: CreditCard, label: 'Plans', path: '/super-admin/plans', permission: 'Plans - View' },
  { icon: Building2, label: 'Clients', path: '/super-admin/clients', permission: 'Clients - View' },
  { 
    icon: ScrollText, 
    label: 'Reports', 
    path: '/super-admin/reports', 
    permission: 'Reports - View',
    subItems: [
      { label: 'Summary Report', path: '/super-admin/reports?tab=summary' },
      { label: 'Detailed Report', path: '/super-admin/reports?tab=detailed' },
      { label: 'API Report', path: '/super-admin/reports?tab=api' }
    ]
  },
  
  // User Features added for Resellers / Business Owners
  { icon: FileText, label: 'Templates', path: '/templates', permission: 'Template - View' },
  { icon: Send, label: 'Campaigns', path: '/campaigns', permission: 'Campaigns - View' },
  { icon: MessageCircle, label: 'Chats', path: '/chats', permission: 'Chat - View' },
  { icon: Users, label: 'Contacts', path: '/contacts', permission: 'Contacts - View' },
  { icon: Rocket, label: 'Automations', path: '/automations', permission: 'Automations - View' },

  { icon: Users, label: 'Resellers', path: '/super-admin/resellers', permission: 'Resellers - View' },
  { icon: Link2, label: 'Affiliates', path: '/super-admin/affiliates', permission: 'Affiliates - View' },
  { icon: Wallet, label: 'Wallet / Credits', path: '/super-admin/wallet', permission: 'Wallet - View' },
  { icon: FileText, label: 'Usage Ledger', path: '/super-admin/ledger', permission: 'Usage Ledger - View' },
  { icon: Rocket, label: 'System Engine', path: '/super-admin/engine', permission: 'System Engine - View' },
  { icon: Zap, label: 'Development Efficiency', path: '/super-admin/dev-progress', permission: 'System Engine - View' },
  { icon: Shield, label: 'Roles & Permissions', path: '/super-admin/roles', permission: 'Roles - View' },
  { icon: Building2, label: 'Vendors', path: '/super-admin/vendors', permission: 'Vendors - View' },
  { icon: MessageSquareMore, label: 'RCS Configs', path: '/super-admin/rcs-configs', permission: 'RCS Configs - View' },
  { icon: MessageCircle, label: 'WhatsApp Configs', path: '/super-admin/whatsapp-configs', permission: 'WhatsApp Configs - View' },
  { icon: Send, label: 'SMS Gateways', path: '/super-admin/sms-gateways', permission: 'SMS Gateways - View' },
  { icon: CreditCard, label: 'Numbers', path: '/super-admin/numbers', permission: 'Numbers - View' },
  { icon: ScrollText, label: 'System Logs', path: '/super-admin/logs', permission: 'System Logs - View' },
  { icon: LifeBuoy, label: 'Support Tickets', path: '/super-admin/support', permission: 'Dashboard - View' },
];

interface SuperAdminSidebarProps {
  onClose?: () => void;
}

export function SuperAdminSidebar({ onClose }: SuperAdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const [reportsOpen, setReportsOpen] = useState(location.pathname.startsWith('/super-admin/reports'));
  const { logout, user } = useAuth();
  const { settings } = useBranding();

  const hasPermission = (feature: string) => {
    // Platform admins always have full access
    if (user?.role === 'admin' || user?.role === 'superadmin') return true;
    
    // Safety check: ensure permissions is an array
    if (!user?.permissions || !Array.isArray(user.permissions)) return false;

    const target = feature.toLowerCase().trim();

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
            <img src={settings?.logo_url || logo} alt={settings?.brand_name || "NotifyNow"} className="w-8 h-8 rounded-lg object-contain" />
            <div className="flex flex-col">
              <span className="font-bold text-sm leading-tight">{settings?.brand_name || "NotifyNow"}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
                {user?.role === 'admin' || user?.role === 'superadmin' ? 'Super Admin' : 'Business Owner'}
              </span>
            </div>
          </div>
        )}
        {collapsed && (
          <img src={settings?.logo_url || logo} alt={settings?.brand_name || "NotifyNow"} className="w-8 h-8 rounded-lg object-contain" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto" onClick={onClose}>
        <ul className="space-y-1 px-2">
          {menuItems.map((item: any) => {
            if (!hasPermission(item.permission)) return null;

            const isActive = location.pathname === item.path || (item.subItems && item.subItems.some((si: any) => location.pathname + location.search === si.path));
            
            if (item.subItems && !collapsed) {
              return (
                <li key={item.label}>
                  <button
                    onClick={() => setReportsOpen(!reportsOpen)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", reportsOpen && "rotate-180")} />
                  </button>
                  {reportsOpen && (
                    <ul className="pl-11 mt-1 space-y-1">
                      {item.subItems.map((sub: any) => (
                        <li key={sub.path}>
                          <NavLink
                            to={sub.path}
                            className={() => cn(
                              'block py-2 text-[13px] font-medium transition-colors rounded-lg px-2',
                              (location.pathname + location.search === sub.path)
                                ? 'text-primary font-bold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                            )}
                          >
                            {sub.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            }

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
            <div className="text-sm font-medium truncate">{user?.name || 'Owner'}</div>
          </div>
        )}

        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={logout}
          className={cn(
            "w-full flex items-center gap-2 text-red-500 hover:text-red-600 hover:bg-red-50",
            collapsed && "justify-center"
          )}
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>

    </aside>
  );
}
