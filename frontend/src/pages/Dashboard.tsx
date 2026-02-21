import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Zap,
  Send,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Clock,
  CheckCircle,
  Bot,
  UserCheck,
  Activity,
  BarChart3,
  Phone,
  Mail,
  Headphones,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { cn } from '@/lib/utils';



const pieColors = ['#4ADE80', '#6366F1', '#EC4899', '#3B82F6', '#8B5CF6', '#F59E0B', '#14B8A6'];
const channelColors: Record<string, string> = {
  whatsapp: '#25D366',
  sms: '#3B82F6',
  rcs: '#8B5CF6',
};

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const enabledChannels = (user?.channels_enabled || []).map(ch => ch.toLowerCase());
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    refreshUser(); // Sync balance with DB
  }, []);

  if (loading || !stats) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  // Use stats from backend
  const pieData = Object.entries(stats.channelDistribution)
    .filter(([channel]) => enabledChannels.includes(channel.toLowerCase()))
    .map(([channel, value]) => ({
      name: channelConfig[channel as keyof typeof channelConfig]?.label || channel,
      value: value as number,
      channel: channel as keyof typeof channelConfig,
    }));

  // Helper calculations based on stats
  const totalConversations = stats.totalConversations;
  const campaignsSent = stats.campaignsSent;
  const weeklyChats = stats.weeklyChats;
  
  const channels = enabledChannels.map(id => ({ key: id, icon: id }));

  // Process per-channel stats from backend
  const channelStats = stats.channelStats || {};

  // Map stat cards - Keeping only 100% real data points
  const realStatCards = [
    {
      title: 'Total Conversations',
      value: totalConversations.toLocaleString(),
      change: '', // Removing mock changes
      trend: 'up',
      icon: MessageSquare,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: 'Campaigns Sent',
      value: campaignsSent.toLocaleString(),
      change: '',
      trend: 'up',
      icon: Send,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      title: 'Available Credits',
      value: `₹${(user?.wallet_balance || 0).toLocaleString()}`,
      change: '',
      trend: 'up',
      icon: Wallet,
      color: 'text-emerald-600',
      bg: 'bg-emerald-500/10',
    }
  ];

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in overflow-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 md:gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground text-sm md:text-base">Comprehensive insights across all your communication channels.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {realStatCards.map((stat) => (
          <Card key={stat.title} className="card-elevated animate-slide-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm text-success`}>
                  <Activity className="h-4 w-4" />
                  Real Time
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel Selector Tabs */}
      <Card className="card-elevated">
        <CardHeader className="pb-3 px-4 md:px-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            Channel Analytics
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 md:px-6">
          <Tabs value={selectedChannel} onValueChange={setSelectedChannel} className="w-full">
            <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 pb-2">
              <TabsList className="inline-flex w-auto min-w-full md:min-w-0 mb-4 md:mb-6 h-auto gap-1">
                <TabsTrigger value="all" className="flex items-center gap-1 md:gap-2 py-2 px-2 md:px-3 text-xs md:text-sm">
                  <Activity className="h-3 w-3 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">All</span>
                </TabsTrigger>
                {channels.map((ch) => (
                  <TabsTrigger key={ch.key} value={ch.key} className="flex items-center gap-1 md:gap-2 py-2 px-2 md:px-3 text-xs md:text-sm">
                    {ch.key === 'email' ? (
                      <Mail className="h-3 w-3 md:h-4 md:w-4" />
                    ) : ch.key === 'voicebot' ? (
                      <Headphones className="h-3 w-3 md:h-4 md:w-4" />
                    ) : (
                      <ChannelIcon channel={ch.icon as any} size="sm" />
                    )}
                    <span className="hidden sm:inline capitalize">{ch.key === 'facebook' ? 'Messenger' : ch.key === 'voicebot' ? 'Voice' : ch.key}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* All Channels Overview */}
            <TabsContent value="all" className="space-y-4 md:space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm font-medium">Total Conversations</span>
                    </div>
                    <p className="text-2xl font-bold">{totalConversations.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-secondary/10 to-secondary/5 border-secondary/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-secondary mb-2">
                      <Send className="h-4 w-4" />
                      <span className="text-sm font-medium">Campaigns Sent</span>
                    </div>
                    <p className="text-2xl font-bold">{campaignsSent.toLocaleString()}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Satisfaction Trends - Hiding as requested for "real" data */}
                {/* 
                <Card>
                  ...
                </Card> 
                */}

                {/* Bot vs Human Resolution - Hiding as requested for "real" data */}
                {/* 
                <Card>
                  ...
                </Card> 
                */}
              </div>

              {/* Channel Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-6">
                {enabledChannels.map((key) => {
                  const data = channelStats[key] || {
                    totalMessages: 0,
                    delivered: 0,
                    read: 0,
                    failed: 0,
                    deliveryRate: "0",
                    readRate: "0"
                  };
                  return (
                    <Card 
                      key={key} 
                      className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                      onClick={() => setSelectedChannel(key)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <ChannelIcon channel={key as any} size="md" />
                            <span className="font-semibold capitalize">{key}</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Volume</span>
                            <span className="font-medium">{data.totalMessages.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Delivered</span>
                            <span className="font-medium text-success">{data.delivered.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Failed</span>
                            <span className="font-medium text-destructive">{data.failed.toLocaleString()}</span>
                          </div>
                          <div className="pt-2">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span>Delivery Rate: {data.deliveryRate}%</span>
                            </div>
                            <Progress value={parseFloat(data.deliveryRate)} className="h-1.5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* Individual Channel Views */}
            {channels.map((ch) => (
              <TabsContent key={ch.key} value={ch.key} className="space-y-6">
                {channelStats[ch.key] && (
                  <>
                    {/* Channel Header Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Total Volume</p>
                          <p className="text-xl font-bold">
                            {channelStats[ch.key].totalMessages.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-success/10 to-success/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Delivered</p>
                          <p className="text-xl font-bold text-success">
                            {channelStats[ch.key].delivered.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Read Count</p>
                          <p className="text-xl font-bold text-blue-600">
                            {channelStats[ch.key].read.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Failed</p>
                          <p className="text-xl font-bold text-destructive">
                            {channelStats[ch.key].failed.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Delivery Rate</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xl font-bold">{channelStats[ch.key].deliveryRate}%</p>
                            <Progress value={parseFloat(channelStats[ch.key].deliveryRate)} className="h-1.5 flex-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Chart - Real weekly trend for this channel is not available yet, but we have global weekly chats */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                           <Activity className="h-4 w-4 text-primary" />
                           Activity Trend
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[280px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={weeklyChats}>
                              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                              <YAxis stroke="hsl(var(--muted-foreground))" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="count" 
                                stroke={channelColors[ch.key] || '#6366F1'} 
                                fill={`${channelColors[ch.key] || '#6366F1'}40`}
                                name="Volume"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chats Chart */}
        <Card className="card-elevated lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Weekly Chat Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyChats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Channel Distribution */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Share']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ChannelIcon channel={item.channel} size="sm" />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: pieColors[index] }}>
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Chats</p>
                <p className="text-2xl font-bold text-primary">{stats.openChats}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Closed Chats</p>
                <p className="text-2xl font-bold">{stats.closedChats.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Response Rate</p>
                <p className="text-2xl font-bold text-success">94.2%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Analytics Table - Hiding as requested for "real" data */}
      {/* 
      <Card className="card-elevated">
        ...
      </Card> 
      */}
    </div>
  );
}