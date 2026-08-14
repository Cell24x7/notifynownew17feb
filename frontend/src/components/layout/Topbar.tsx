import { Wallet, Zap, ChevronDown, Sun, Moon, LogOut, Menu, User, Users } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import defaultLogo from '@/assets/veloxaio.png';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useClient } from '@/contexts/ClientContext';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface TopbarProps {
    onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const { user, logout } = useAuth();
  const { settings, isPaymentDisabled } = useBranding();
    const { selectedClientId, setSelectedClientId } = useClient();
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';
    const [clients, setClients] = useState<any[]>([]);
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        if (isAdmin) {
            const fetchClients = async () => {
                try {
                    const token = localStorage.getItem('authToken');
                    const res = await axios.get(`${API_BASE_URL}/api/clients`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.data.success) {
                        setClients(res.data.clients || []);
                    }
                } catch (err) {
                    console.error('Failed to fetch clients for topbar selector', err);
                }
            };
            fetchClients();
        }
    }, [isAdmin]);

    return (
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 transition-colors">
            {/* Mobile Menu Button & Brand */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onMenuClick}
                    className="lg:hidden h-9 w-9 rounded-xl border border-slate-100 dark:border-zinc-800 text-slate-600 dark:text-zinc-400"
                >
                    <Menu className="h-5 w-5" />
                </Button>

                {/* Reseller Branding or Default Brand Name */}
                <div className="flex items-center gap-2.5">
                    {settings?.logo_url ? (
                        <img src={settings.logo_url} alt={settings.brand_name} className="h-8 w-auto object-contain max-w-[140px]" />
                    ) : (
                        <img src={defaultLogo} alt="Logo" className="h-8 w-auto object-contain max-w-[140px]" />
                    )}
                    {!settings?.logo_url && (
                        <span className="font-black text-slate-800 dark:text-zinc-100 text-base tracking-tight hidden sm:inline-block">
                            {settings?.brand_name || 'NOTIFY'}
                        </span>
                    )}
                </div>

                {/* Admin Client Selector */}
                {isAdmin && (
                    <div className="hidden md:flex items-center ml-4 pl-4 border-l border-slate-100 dark:border-zinc-800">
                        <Select value={selectedClientId || 'all'} onValueChange={(val) => setSelectedClientId(val === 'all' ? null : val)}>
                            <SelectTrigger className="w-[180px] h-8 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800">
                                <SelectValue placeholder="All Clients" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Global View (All Clients)</SelectItem>
                                {clients.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-3 ml-auto">
                {/* Wallet Balance or Credits Display */}
                {(() => {
                    const anyUser = user as any;
                    const isBoltzman = isPaymentDisabled || 
                        Number(anyUser?.id) === 10 || 
                        Number(anyUser?.actual_reseller_id) === 10 || 
                        Number(anyUser?.reseller_id) === 10 || 
                        Number(anyUser?.parent_reseller_id) === 10 ||
                        Number(anyUser?.id) === 56 || 
                        Number(anyUser?.actual_reseller_id) === 56 || 
                        Number(anyUser?.reseller_id) === 56 || 
                        Number(anyUser?.parent_reseller_id) === 56 ||
                        Boolean(anyUser?.is_advanced_reseller_suite) ||
                        Boolean(settings?.brand_name?.toLowerCase().includes('boltzm')) ||
                        Boolean(anyUser?.email?.toLowerCase().includes('boltzm')) ||
                        Boolean(anyUser?.username?.toLowerCase().includes('boltzm'));

                    if (isBoltzman) {
                        return (
                            <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-indigo-100 dark:border-zinc-800 shadow-sm transition-all">
                                <div className="p-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                                    <Wallet className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest leading-none mb-0.5">AVAILABLE CREDITS</p>
                                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400 leading-tight">
                                        {(user?.role === 'admin' || user?.role === 'superadmin') 
                                            ? 'Unlimited' 
                                            : `${Math.floor(Number(user?.wallet_balance || user?.credits_available || 0))}`}
                                    </p>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
                            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                                <Wallet className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest leading-none mb-0.5">Balance</p>
                                <p className="text-sm font-black text-slate-800 dark:text-zinc-100 leading-tight">
                                    {(user?.role === 'admin' || user?.role === 'superadmin') 
                                        ? 'Unlimited' 
                                        : `₹${Number(user?.wallet_balance || 0).toFixed(2)}`}
                                </p>
                            </div>
                            <button className="ml-1 p-1 bg-slate-50 dark:bg-zinc-800 rounded-lg border border-slate-100 dark:border-zinc-700 hidden sm:flex">
                                <Zap className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                            </button>
                        </div>
                    );
                })()}

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all active:scale-95 group select-none">
                            {/* Avatar */}
                            <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-700 font-black overflow-hidden border border-emerald-200 dark:border-emerald-500/20 shrink-0 text-base">
                                {user?.profile_picture ? (
                                    <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            {/* Name + role */}
                            <div className="hidden sm:block pr-1">
                                <p className="text-[13px] font-bold text-slate-800 dark:text-zinc-100 leading-tight">{user?.name || 'User'}</p>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide leading-none">{user?.role || 'user'}</p>
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
                        </div>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-72 p-2 rounded-2xl shadow-xl border border-slate-100" align="end" sideOffset={8}>
                        {/* Header: Avatar + name + email */}
                        <DropdownMenuLabel className="font-normal p-3 pb-2">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-700 font-black text-xl border border-emerald-100 shrink-0 overflow-hidden">
                                    {user?.profile_picture ? (
                                        <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        user?.name?.charAt(0).toUpperCase() || 'U'
                                    )}
                                </div>
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-zinc-100 truncate">{user?.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5 w-fit">{user?.role || 'user'}</span>
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-zinc-800 my-1" />

                        {/* My Profile */}
                        <DropdownMenuItem asChild className="p-0 rounded-xl overflow-hidden focus:bg-transparent">
                            <NavLink
                                to="/settings?tab=profile"
                                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                            >
                                <div className="p-1.5 bg-emerald-50 dark:bg-zinc-800 rounded-lg">
                                    <User className="h-4 w-4 text-emerald-600" />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">My Profile</span>
                            </NavLink>
                        </DropdownMenuItem>

                        {/* Theme Toggle */}
                        <DropdownMenuItem
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer"
                            onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        >
                            <div className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                                {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
                            </div>
                            <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                                {isDark ? 'Light Mode' : 'Dark Mode'}
                            </span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-zinc-800 my-1" />

                        {/* Logout */}
                        <DropdownMenuItem
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 focus:text-rose-600"
                            onClick={logout}
                        >
                            <div className="p-1.5 bg-rose-50 dark:bg-rose-900/10 rounded-lg">
                                <LogOut className="h-4 w-4 text-rose-600" />
                            </div>
                            <span className="text-sm font-medium">Logout Session</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
