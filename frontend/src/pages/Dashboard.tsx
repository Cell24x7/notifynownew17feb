import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Zap,
  Send,
  TrendingUp,
  ArrowUpRight,
  TrendingDown,
  Clock,
  CheckCircle,
  Activity,
  BarChart3,
  Wallet,
  Calendar,
  Layers,
  Search,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  LogOut,
  Moon,
  Sun,
  UserCircle,
  ChevronDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { ChannelIcon, channelConfig } from '@/components/ui/channel-icon';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: '#25D366',
  sms: '#3B82F6',
  rcs: '#8B5CF6',
};

export default function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  const enabledChannels = Array.isArray(user?.channels_enabled)
    ? user.channels_enabled.map(ch => ch.toLowerCase())
    : typeof user?.channels_enabled === 'string'
      ? (user.channels_enabled as string).split(',').map(ch => ch.trim().toLowerCase())
      : ['whatsapp', 'sms', 'rcs'];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`${API_BASE_URL}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    refreshUser();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 animate-pulse">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        <p className="text-muted-foreground font-medium">Initializing Analytics...</p>
      </div>
    );
  }

  const pieData = Object.entries(stats.channelDistribution)
    .filter(([channel]) => enabledChannels.includes(channel.toLowerCase()))
    .map(([channel, value]) => ({
      name: channelConfig[channel as keyof typeof channelConfig]?.label || channel,
      value: value as number,
      channel: channel as keyof typeof channelConfig,
    }));

  const today = stats.today || { messages: 0, delivered: 0, failed: 0, campaigns: 0 };
  const recentCampaigns = stats.recentCampaigns || [];

  return (
    <div className="p-4 md:p-8 space-y-8 bg-zinc-50/50 min-h-screen animate-fade-in overflow-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-2">
        <div className="space-y-1">
          <Badge variant="outline" className="mb-2 px-3 py-0.5 rounded-full border-slate-200 bg-slate-100/50 text-slate-600 text-[10px] uppercase tracking-wider font-semibold">
            Real-time Activity
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 flex items-center gap-3">
            Analytics Overview
            <Activity className="h-5 w-5 text-primary animate-pulse" />
          </h1>
          <p className="text-slate-500 text-sm font-medium max-w-lg">
            Monitor communication performance and credit consumption with live metrics.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-100">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Balance</p>
              <p className="text-lg font-bold text-slate-800 font-mono">₹{Number(user?.wallet_balance || 0).toFixed(2)}</p>
            </div>
            <button className="ml-2 p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all border border-slate-200">
              <Zap className="h-4 w-4 fill-amber-500 text-amber-500" />
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:bg-slate-50 transition-all active:scale-95 group">
                <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20">
                  {user?.profile_image ? (
                    <img src={user.profile_image} className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.charAt(0).toUpperCase() || <UserCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="hidden sm:block pr-1">
                  <p className="text-xs font-bold text-slate-800 leading-tight">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{user?.role || 'Client'}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-data-[state=open]:rotate-180 transition-transform" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-2 rounded-2xl" align="end" sideOffset={12}>
              <DropdownMenuLabel className="font-normal p-3">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem className="p-3 rounded-xl cursor-pointer" onClick={() => setTheme(isDark ? 'light' : 'dark')}>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-slate-100 rounded-lg">
                    {isDark ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem className="p-3 rounded-xl cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-600" onClick={logout}>
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-rose-50 rounded-lg">
                    <LogOut className="h-4 w-4 text-rose-600" />
                  </div>
                  <span className="text-sm font-bold uppercase tracking-wider">Logout Session</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Today's Pulse Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {[
          { label: "Today's Volume", value: today.messages, icon: Send, color: "indigo", unit: "msgs" },
          { label: "Successfully Delivered", value: today.delivered, icon: ShieldCheck, color: "emerald", unit: "msgs" },
          { label: "Recently Failed", value: today.failed, icon: AlertCircle, color: "rose", unit: "msgs" },
          { label: "Active Campaigns", value: today.campaigns, icon: Zap, color: "amber", unit: "live" },
        ].map((item, i) => (
          <Card key={i} className={cn(
            "relative group overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-500",
            `bg-${item.color}-600/5`
          )}>
            <div className={cn("absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-150 p-2", `bg-${item.color}-600`)} />
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-xl shadow-inner", `bg-${item.color}-100`)}>
                  <item.icon className={cn("h-5 w-5", `text-${item.color}-600`)} />
                </div>
                <div className="text-[10px] font-bold py-0.5 px-2 bg-white rounded-full border border-slate-100 text-slate-500 shadow-sm uppercase tracking-tighter">
                  Today
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <h3 className="text-3xl font-bold text-slate-800">{item.value.toLocaleString()}</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.unit}</span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-tight">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        {/* Main Growth Chart */}
        <Card className="xl:col-span-2 shadow-sm border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-800">Communication Output</CardTitle>
                <CardDescription className="text-slate-400 font-medium text-xs">Message volume trends over the last 7 days</CardDescription>
              </div>
              <Tabs defaultValue="weekly" className="w-[180px]">
                <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl">
                  <TabsTrigger value="weekly" className="text-[10px] rounded-lg">Weekly</TabsTrigger>
                  <TabsTrigger value="daily" className="text-[10px] rounded-lg">Daily</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="px-4 md:px-8 pb-8">
            <div className="h-[320px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.weeklyChats}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={4}
                    fillOpacity={1}
                    fill="url(#colorCount)"
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Distribution Circle */}
        <Card className="shadow-sm border border-slate-100 bg-white rounded-3xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-900">
            <Layers className="h-16 w-16" />
          </div>
          <CardHeader className="p-8">
            <CardTitle className="text-xl font-bold text-slate-800">Channel Mix</CardTitle>
            <CardDescription className="text-slate-400 font-medium text-xs italic">Most preferred ways to reach your audience</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 flex flex-col items-center text-slate-800">
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={8}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <p className="text-3xl font-bold text-slate-800">{stats.campaignsSent}</p>
                <p className="text-[8px] uppercase font-bold text-slate-400 tracking-[0.2em]">Total Flows</p>
              </div>
            </div>
            <div className="w-full mt-6 space-y-4">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 transition-colors">{item.name}</span>
                  </div>
                  <span className="text-xs font-bold bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg tabular-nums border border-slate-100">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid of Micro Charts & Details */}
      <Tabs value={selectedChannel} onValueChange={setSelectedChannel} className="w-full">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <h3 className="text-xl font-bold text-slate-800">Per-Channel Analytics</h3>
          <TabsList className="bg-slate-200/50 p-1 rounded-2xl h-11 border border-slate-200">
            <TabsTrigger value="all" className="px-4 py-2 rounded-xl text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-md">All Platforms</TabsTrigger>
            {enabledChannels.map(ch => (
              <TabsTrigger key={ch} value={ch} className="px-4 py-2 rounded-xl text-xs font-bold capitalize data-[state=active]:bg-white data-[state=active]:shadow-md tabular-nums">{ch}</TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="all" className="mt-0 space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enabledChannels.map((key) => {
              const data = stats.channelStats[key] || { totalMessages: 0, delivered: 0, read: 0, failed: 0, deliveryRate: "0", totalEngagement: 0 };
              const color = CHANNEL_COLORS[key] || "#6366f1";

              return (
                <Card key={key} className="group border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden bg-white">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:shadow-md transition-all">
                          <ChannelIcon channel={key as any} size="md" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 capitalize text-lg">{key}</p>
                          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live Statistics</p>
                        </div>
                      </div>
                      <ArrowUpRight className="h-5 w-5 text-slate-300 group-hover:text-primary transition-colors" />
                    </div>

                    <div className="grid grid-cols-2 gap-y-6 gap-x-4 mb-8 text-slate-800">
                      <div>
                        <p className="text-2xl font-bold tabular-nums">{data.totalMessages.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Volume</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-emerald-600 tabular-nums">{data.delivered.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Success</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] font-bold text-slate-600 uppercase">Reach Integrity</span>
                        <span className="text-sm font-bold text-slate-800 tabular-nums">{data.deliveryRate}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(0,0,0,0.1)]"
                          style={{
                            width: `${data.deliveryRate}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Miniature Trend Line Placeholder */}
                  <div className="h-16 w-full opacity-30 mt-2 px-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.weeklyChats}>
                        <Area type="step" dataKey="count" stroke={color} fill={color} strokeWidth={1} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
        {/* Per-channel detailed view (optional, existing tabs content can be refined similarly) */}
      </Tabs>

      {/* Recent Campaign Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        <Card className="lg:col-span-2 shadow-sm border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="p-8 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <Clock className="h-5 w-5 text-slate-600" />
                </div>
                <CardTitle className="text-xl font-bold text-slate-800">Recent Campaigns</CardTitle>
              </div>
              <button className="flex items-center gap-2 text-xs font-bold text-primary group">
                View Logs <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </CardHeader>
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="px-8 h-12 text-[10px] uppercase font-bold tracking-widest text-slate-400">Campaign Name</TableHead>
                <TableHead className="h-12 text-[10px] uppercase font-bold tracking-widest text-slate-400">Platform</TableHead>
                <TableHead className="h-12 text-[10px] uppercase font-bold tracking-widest text-slate-400">Reach</TableHead>
                <TableHead className="h-12 text-[10px] uppercase font-bold tracking-widest text-slate-400">Success Rate</TableHead>
                <TableHead className="h-12 text-[10px] uppercase font-bold tracking-widest text-slate-400 text-right pr-8">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentCampaigns.map((camp: any) => (
                <TableRow key={camp.id} className="group hover:bg-slate-50/50 transition-colors border-slate-50 cursor-pointer">
                  <TableCell className="px-8 py-4">
                    <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">{camp.name}</p>
                    <p className="text-[10px] text-slate-400 tabular-nums uppercase">{format(new Date(camp.created_at), 'dd MMM | hh:mm a')}</p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={camp.channel} size="sm" />
                      <span className="capitalize text-xs font-semibold text-slate-600">{camp.channel}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-bold text-slate-700 tabular-nums text-xs">
                    {camp.audience_count}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${camp.deliveryRate}%` }} />
                      </div>
                      <span className="text-[10px] font-black text-slate-900">{camp.deliveryRate}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Badge className={cn(
                      "px-3 py-1 rounded-lg text-[10px] font-bold border-none",
                      camp.status === 'completed' ? "bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-100/50" :
                        camp.status === 'running' ? "bg-blue-100 text-blue-700 animate-pulse" :
                          "bg-slate-100 text-slate-500"
                    )}>
                      {camp.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentCampaigns.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center text-slate-400 font-medium italic">
                    No recent campaigns found. Start your first journey today!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        <Card className="shadow-sm border-none bg-white rounded-3xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-xl font-bold text-slate-800">Weekly Pulse</CardTitle>
            <CardDescription className="text-slate-400 font-medium text-xs">Daily message volume (last 7 days)</CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 flex flex-col items-center">
            <div className="w-full flex justify-between items-end gap-2 h-40 mt-4">
              {stats.weeklyChats.map((d: any, i: number) => {
                const max = Math.max(...stats.weeklyChats.map((w: any) => w.count)) || 1;
                const height = (d.count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <Tooltip content={d.count}>
                      <div
                        className="w-full bg-slate-100 group-hover:bg-primary transition-all duration-500 rounded-lg relative"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                          {d.count}
                        </div>
                      </div>
                    </Tooltip>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{d.day}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 w-full p-6 bg-slate-50 rounded-2xl space-y-4">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">Performance Increase</p>
                  <p className="text-[10px] text-slate-500 font-medium">Your output is up 12% from last week.</p>
                </div>
              </div>
              <Progress value={75} className="h-1.5 bg-white" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
