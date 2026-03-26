import { Wallet, Zap, ChevronDown, Sun, Moon, LogOut, Menu, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logo from '@/assets/logo-full.png';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from 'next-themes';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TopbarProps {
    onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className="flex items-center justify-between w-full h-16 px-4 md:px-8 bg-white dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 sticky top-0 z-20">
            {/* Mobile: menu + logo */}
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
                    <Menu className="h-5 w-5" />
                </Button>
                <img src={logo} alt="Logo" className="h-8 md:hidden" />
            </div>

            <div className="flex-1 hidden md:block" />

            <div className="flex items-center gap-3 ml-auto">
                {/* Wallet Balance */}
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
        </div>
    );
}
