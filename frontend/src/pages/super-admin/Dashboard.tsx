import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Users,
  MessageSquare,
  CreditCard,
  TrendingUp,
  TrendingDown,
  Zap,
  RefreshCw,
  Search,
  Activity,
  Send,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { superAdminApi, SuperAdminStats } from '@/services/superAdminApi';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

const channelColors: Record<string, string> = {
  whatsapp: '#22c55e', // Bright Green
  sms: '#3b82f6',      // Bright Blue
  email: '#f59e0b',    // Amber
  rcs: '#8b5cf6',      // Violet
};

const COLORS_LIST = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#14b8a6'];

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter state for Today's Campaigns table
  const [campaignSearch, setCampaignSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');

  const fetchStats = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setIsRefreshing(true);
    try {
      const data = await superAdminApi.getDashboardStats();
      setStats(data);
      setError('');
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      if (!isSilent) setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    // Auto polling every 15 seconds for live real-time updates
    const interval = setInterval(() => {
      fetchStats(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-xs text-muted-foreground font-medium animate-pulse">Loading Reseller Dashboard & Live Activity...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-4 text-center text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl mx-4 mt-4 border border-red-200">
        <p className="font-semibold text-xs">{error || 'No data available'}</p>
        <button onClick={() => fetchStats()} className="mt-2 text-xs text-primary underline font-medium">Retry Loading</button>
      </div>
    );
  }

  const isReseller = user?.role === 'reseller';

  const statCards = [
    {
      title: 'Customer Accounts',
      value: stats.totalClients.toLocaleString(),
      change: `${stats.activeClients} Active`,
      trend: 'neutral',
      icon: Building2,
      accent: 'border-blue-500/20 bg-blue-500/5'
    },
    {
      title: 'Subscription Plans',
      value: stats.activePlans.toString(),
      change: 'Active Plans',
      trend: 'neutral',
      icon: CreditCard,
      accent: 'border-purple-500/20 bg-purple-500/5'
    },
    {
      title: 'Messages Processed',
      value: (stats.totalMessagesProcessed > 1000000)
        ? (stats.totalMessagesProcessed / 1000000).toFixed(2) + 'M'
        : stats.totalMessagesProcessed.toLocaleString(),
      change: `+${stats.messagesToday.toLocaleString()} today`,
      trend: 'up',
      icon: MessageSquare,
      accent: 'border-emerald-500/20 bg-emerald-500/5'
    },
    {
      title: 'Revenue (Total)',
      value: `\u20B9${stats.revenueTotal.toLocaleString()}`,
      change: `\u20B9${stats.revenueMonth.toLocaleString()} month`,
      trend: 'up',
      icon: CreditCard,
      accent: 'border-amber-500/20 bg-amber-500/5'
    },
    {
      title: 'Credits Consumed',
      value: stats.creditsConsumedMonth.toLocaleString(),
      change: `${stats.creditsConsumedToday.toLocaleString()} today`,
      trend: 'up',
      icon: Zap,
      accent: 'border-rose-500/20 bg-rose-500/5'
    },
  ];

  // Filter Today's Campaigns
  const filteredCampaigns = (stats.recentCampaigns || []).filter(c => {
    const matchesSearch = campaignSearch === '' || 
      (c.name && c.name.toLowerCase().includes(campaignSearch.toLowerCase())) ||
      (c.user_name && c.user_name.toLowerCase().includes(campaignSearch.toLowerCase())) ||
      (c.user_email && c.user_email.toLowerCase().includes(campaignSearch.toLowerCase()));
    
    const matchesChannel = channelFilter === 'all' || (c.channel && c.channel.toLowerCase() === channelFilter.toLowerCase());

    return matchesSearch && matchesChannel;
  });

  return (
    <div className="p-3.5 sm:p-5 space-y-4 max-w-[1600px] mx-auto">
      {/* Header with Live Status & Manual Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
              {isReseller ? 'Reseller Live Dashboard' : 'Platform Control Dashboard'}
            </h1>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live Syncing
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isReseller 
              ? 'Real-time performance metrics, client activities, and campaign progress' 
              : 'Global platform operations and live queue health'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[11px] text-muted-foreground hidden md:inline">
            Updated {format(lastUpdated, 'HH:mm:ss')}
          </span>
          <Button variant="outline" size="sm" onClick={() => fetchStats(false)} disabled={isRefreshing} className="h-8 text-xs px-3 shadow-sm">
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Live
          </Button>
        </div>
      </div>

      {/* Queue Health Overview (Admin only) */}
      {!isReseller && stats.queuePending !== undefined && (
        <Card className="border-primary/20 bg-gradient-to-r from-background via-primary/5 to-background shadow-xs">
          <CardContent className="p-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold">Queue Processing Engine</CardTitle>
                  <CardDescription className="text-[11px]">
                    Status across {stats.activeCampaignsInQueue || 0} active campaigns
                  </CardDescription>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 flex-1 max-w-md">
                <div className="bg-background/80 backdrop-blur-sm border rounded-md p-2 text-center">
                  <span className="block text-[10px] text-muted-foreground font-medium uppercase">Pending</span>
                  <span className="text-base font-bold text-primary">
                    {stats.queuePending.toLocaleString()}
                  </span>
                </div>
                
                <div className="bg-background/80 backdrop-blur-sm border rounded-md p-2 text-center">
                  <span className="block text-[10px] text-muted-foreground font-medium uppercase">Processing</span>
                  <span className="text-base font-bold text-blue-500">
                    {stats.queueProcessing.toLocaleString()}
                  </span>
                </div>

                <div className={`border rounded-md p-2 text-center transition-all ${
                  stats.queueStuck && stats.queueStuck > 0 
                    ? "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse font-bold" 
                    : "bg-background/80 backdrop-blur-sm"
                }`}>
                  <span className="block text-[10px] text-muted-foreground font-medium uppercase text-red-500">Stuck</span>
                  <span className={`text-base font-bold ${stats.queueStuck && stats.queueStuck > 0 ? "text-red-500" : "text-emerald-500"}`}>
                    {(stats.queueStuck || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metric Cards (Compact 5-column grid) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className={`relative overflow-hidden transition-all duration-200 border shadow-2xs ${stat.accent}`}>
            <CardContent className="p-3 sm:p-3.5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{stat.title}</p>
                  <p className="text-xl font-bold tracking-tight text-foreground truncate">{stat.value}</p>
                  <div className="flex items-center gap-1 text-[11px]">
                    {stat.trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-500 shrink-0" />}
                    {stat.trend === 'neutral' && <TrendingDown className="w-3 h-3 text-muted-foreground rotate-0 shrink-0" />}
                    <span className="text-muted-foreground font-medium truncate">{stat.change}</span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row (Compact Height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Message Volume */}
        <Card className="border shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary" /> Weekly Message Traffic
            </CardTitle>
            <CardDescription className="text-[11px]">Daily messages processed across customer accounts</CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="h-[190px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyMessages} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                  <XAxis dataKey="day" className="text-[10px]" tick={{ fontSize: 10 }} />
                  <YAxis className="text-[10px]" tick={{ fontSize: 10 }} tickFormatter={(v) => v >= 1000 ? `${v / 1000}K` : v} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '11px',
                      padding: '6px 10px'
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Messages']}
                  />
                  <Bar dataKey="messages" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card className="border shadow-xs">
          <CardHeader className="p-3.5 pb-1">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-primary" /> Channel Breakdown
            </CardTitle>
            <CardDescription className="text-[11px]">Distribution of message traffic by channel</CardDescription>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="h-[190px] flex items-center">
              <ResponsiveContainer width="45%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.channelUsage}
                    dataKey="messages"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={65}
                    paddingAngle={3}
                  >
                    {stats.channelUsage.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={channelColors[entry.channel.toLowerCase()] || COLORS_LIST[index % COLORS_LIST.length]}
                        strokeWidth={0}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                      fontSize: '11px',
                      padding: '6px 10px'
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Messages']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2 px-2 max-h-[180px] overflow-y-auto">
                {stats.channelUsage.filter(i => i.percentage > 0).length === 0 ? (
                  <div className="text-center text-muted-foreground text-xs py-6">
                    No channel activity recorded today.
                  </div>
                ) : (
                  stats.channelUsage.filter(i => i.percentage > 0).map((item, index) => (
                    <div key={item.channel} className="flex items-center justify-between text-[11px] p-1.5 rounded-md bg-muted/20">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: channelColors[item.channel.toLowerCase()] || COLORS_LIST[index % COLORS_LIST.length] }}
                        />
                        <span className="capitalize font-semibold">{item.channel}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold block">{item.messages.toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground">{item.percentage}%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TODAY'S CAMPAIGNS REPORT SECTION (ACCOUNT-WISE) */}
      <Card className="border shadow-xs">
        <CardHeader className="p-3.5 sm:p-4 pb-2 border-b bg-muted/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Send className="w-4 h-4 text-primary" /> Today's Live Campaigns Report
              </CardTitle>
              <CardDescription className="text-[11px] mt-0.5">
                Real-time tracking of campaigns launched today by your customer accounts
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search user or campaign..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="pl-8 h-8 text-xs bg-background"
                />
              </div>

              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="h-8 w-28 text-xs bg-background">
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="rcs">RCS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="py-2 text-[10px] font-bold uppercase">Customer Account</TableHead>
                <TableHead className="py-2 text-[10px] font-bold uppercase">Campaign Name & Channel</TableHead>
                <TableHead className="py-2 text-[10px] font-bold uppercase text-center">Audience</TableHead>
                <TableHead className="py-2 text-[10px] font-bold uppercase min-w-[180px]">Delivery Progress</TableHead>
                <TableHead className="py-2 text-[10px] font-bold uppercase text-center">Status</TableHead>
                <TableHead className="py-2 text-[10px] font-bold uppercase text-right">Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground text-xs">
                    No active or completed campaigns found for today matching your search filters.
                  </TableCell>
                </TableRow>
              ) : (
                filteredCampaigns.map((c) => {
                  const total = Number(c.audience_count || c.recipient_count || 0);
                  const delivered = Number(c.delivered_count || 0);
                  const failed = Number(c.failed_count || 0);
                  const progress = total > 0 ? Math.min(100, Math.round((delivered / total) * 100)) : 0;

                  return (
                    <TableRow key={c.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="py-2.5 px-3">
                        <div className="font-semibold text-xs text-foreground">{c.user_name || 'Client Account'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{c.user_email || `User ID: ${c.user_id}`}</div>
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <div className="font-semibold text-xs flex items-center gap-1.5">
                          <span className="truncate max-w-[200px]">{c.name || 'Untitled Campaign'}</span>
                          <Badge variant="outline" className="text-[9px] uppercase font-mono px-1 py-0 border-primary/30 text-primary shrink-0">
                            {c.channel || 'SMS'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-center font-bold text-xs font-mono">
                        {total.toLocaleString()}
                      </TableCell>
                      <TableCell className="py-2.5 px-3">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-emerald-600 font-semibold">{delivered.toLocaleString()} Deliv.</span>
                            {failed > 0 && <span className="text-rose-500 font-semibold">{failed.toLocaleString()} Fail</span>}
                            <span className="text-muted-foreground font-mono">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-center">
                        <Badge 
                          variant={c.status === 'completed' ? 'default' : c.status === 'running' || c.status === 'processing' ? 'secondary' : 'outline'}
                          className={`text-[9px] px-2 py-0.5 capitalize font-semibold ${
                            c.status === 'completed' || c.status === 'sent'
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : c.status === 'running' || c.status === 'processing'
                                ? 'bg-blue-600 text-white animate-pulse'
                                : c.status === 'failed'
                                  ? 'bg-red-500 text-white'
                                  : 'text-muted-foreground'
                          }`}
                        >
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2.5 px-3 text-right text-[11px] font-mono text-muted-foreground">
                        {c.created_at ? format(new Date(c.created_at), 'HH:mm:ss') : 'Today'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* TODAY'S ACTIVE CLIENT ACCOUNTS GRID */}
      {stats.todayActiveClients && stats.todayActiveClients.length > 0 && (
        <Card className="border shadow-xs">
          <CardHeader className="p-3.5 sm:p-4 pb-2 border-b bg-muted/10">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Active Customer Accounts Today
            </CardTitle>
            <CardDescription className="text-[11px] mt-0.5">
              Customer accounts generating campaign traffic and credit usage today
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-2 text-[10px] font-bold uppercase">Customer / Company</TableHead>
                  <TableHead className="py-2 text-[10px] font-bold uppercase">Email Address</TableHead>
                  <TableHead className="py-2 text-[10px] font-bold uppercase text-center">Today's Campaigns</TableHead>
                  <TableHead className="py-2 text-[10px] font-bold uppercase text-right">Today's Messages</TableHead>
                  <TableHead className="py-2 text-[10px] font-bold uppercase text-right">Wallet Balance</TableHead>
                  <TableHead className="py-2 text-[10px] font-bold uppercase text-right">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.todayActiveClients.map(u => (
                  <TableRow key={u.id} className="hover:bg-muted/10">
                    <TableCell className="py-2 px-3 font-semibold text-xs">
                      {u.name} {u.company && u.company !== u.name ? `(${u.company})` : ''}
                    </TableCell>
                    <TableCell className="py-2 px-3 text-xs font-mono text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="py-2 px-3 text-center font-semibold text-xs">{u.today_campaigns}</TableCell>
                    <TableCell className="py-2 px-3 text-right font-bold text-xs text-primary font-mono">{u.today_messages.toLocaleString()}</TableCell>
                    <TableCell className="py-2 px-3 text-right font-semibold text-xs text-emerald-600">
                      {Math.floor(u.wallet_balance).toLocaleString()} credits
                    </TableCell>
                    <TableCell className="py-2 px-3 text-right text-[11px] font-mono text-muted-foreground">
                      {u.last_activity ? format(new Date(u.last_activity), 'HH:mm:ss') : 'Active'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
