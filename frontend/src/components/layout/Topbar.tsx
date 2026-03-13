import { Wallet, Zap, UserCircle, ChevronDown, Sun, Moon, LogOut, Menu } from 'lucide-react';
import logo from '@/assets/logo.svg';
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
import { cn } from '@/lib/utils';

interface TopbarProps {
    onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
    const { user, logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <div className="flex items-center justify-between w-full h-16 px-4 md:px-8 bg-white dark:bg-zinc-950 border-b border-slate-100 dark:border-zinc-800 sticky top-0 z-20">
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={onMenuClick}>
                    <Menu className="h-5 w-5" />
                </Button>
                <img src={logo} alt="Logo" className="h-8 md:hidden" />
            </div>
            <div className="flex-1 hidden md:block">
                {/* Can add search or breadcrumbs here if needed */}
            </div>

            <div className="flex items-center gap-2 md:gap-4 ml-auto">
                {/* Wallet Balance - Polished clean look */}
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 px-4 py-2 rounded-2xl border border-slate-100 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                        <Wallet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest leading-none mb-0.5">Balance</p>
                        <p className="text-lg font-black text-slate-800 dark:text-zinc-100 leading-tight">₹{Number(user?.wallet_balance || 0).toFixed(2)}</p>
                    </div>
                    <button className="ml-2 p-1.5 bg-slate-50 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all border border-slate-100 dark:border-zinc-700 hidden xs:flex">
                        <Zap className="h-4 w-4 fill-amber-500 text-amber-500" />
                    </button>
                </div>

                {/* User Profile Dropdown - Polished clean look */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-2.5 bg-white dark:bg-zinc-950 px-3 py-1.5 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all active:scale-95 group">
                            <div className="h-9 w-9 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 font-bold overflow-hidden border border-emerald-100 dark:border-emerald-500/20 shrink-0">
                                {user?.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-lg font-black">{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                                )}
                            </div>
                            <div className="hidden sm:block pr-1 select-none">
                                <p className="text-[13px] font-black text-slate-800 dark:text-zinc-100 leading-tight">{user?.name || 'User'}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-none">{user?.role || 'Client'}</p>
                            </div>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 p-2 rounded-2xl" align="end" sideOffset={8}>
                        <DropdownMenuLabel className="font-normal p-3">
                            <div className="flex flex-col gap-0.5">
                                <p className="text-sm font-bold text-slate-800 dark:text-zinc-100">{user?.name}</p>
                                <p className="text-xs text-slate-500">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-zinc-800" />
                        <DropdownMenuItem className="p-3 rounded-xl cursor-pointer" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
                            <div className="flex items-center gap-3 w-full">
                                <div className="p-1.5 bg-slate-100 dark:bg-zinc-800 rounded-lg">
                                    {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-zinc-300">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100 dark:bg-zinc-800" />
                        <DropdownMenuItem className="p-3 rounded-xl cursor-pointer text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30 focus:text-rose-600" onClick={logout}>
                            <div className="flex items-center gap-3 w-full">
                                <div className="p-1.5 bg-rose-50 dark:bg-rose-900/10 rounded-lg">
                                    <LogOut className="h-4 w-4 text-rose-600" />
                                </div>
                                <span className="text-sm font-bold uppercase tracking-wider">Logout Session</span>
                            </div>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
