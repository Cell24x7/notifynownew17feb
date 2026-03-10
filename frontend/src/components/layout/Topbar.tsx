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
                {/* Wallet Balance */}
                <div className="flex items-center gap-2 md:gap-3 bg-slate-50 dark:bg-zinc-900 px-3 py-1.5 md:px-4 md:py-2 rounded-2xl border border-slate-100 dark:border-zinc-800">
                    <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg hidden sm:block">
                        <Wallet className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                    </div>
                    <div>
                        <p className="text-[8px] md:text-[9px] uppercase font-bold text-slate-400 tracking-wider leading-none">Balance</p>
                        <p className="text-sm md:text-lg font-bold text-slate-800 dark:text-zinc-100 font-mono leading-tight">₹{Number(user?.wallet_balance || 0).toFixed(2)}</p>
                    </div>
                    <button className="ml-1 md:ml-2 p-1.5 bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-700 transition-all border border-slate-200 dark:border-zinc-700 shadow-sm hidden xs:flex">
                        <Zap className="h-3 w-3 md:h-4 md:w-4 fill-amber-500 text-amber-500" />
                    </button>
                </div>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <div className="flex items-center gap-2 bg-white dark:bg-zinc-950 px-2 py-1.5 md:px-3 md:py-2 rounded-2xl shadow-sm border border-slate-100 dark:border-zinc-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900 transition-all active:scale-95 group">
                            <div className="h-8 w-8 md:h-9 md:w-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20 shrink-0">
                                {user?.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    user?.name?.charAt(0).toUpperCase() || <UserCircle className="h-5 w-5" />
                                )}
                            </div>
                            <div className="hidden sm:block pr-1 select-none">
                                <p className="text-xs font-bold text-slate-800 dark:text-zinc-100 leading-tight">{user?.name || 'User'}</p>
                                <p className="text-[10px] text-slate-400 font-medium leading-none">{user?.role || 'Client'}</p>
                            </div>
                            <ChevronDown className="h-3 w-3 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
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
