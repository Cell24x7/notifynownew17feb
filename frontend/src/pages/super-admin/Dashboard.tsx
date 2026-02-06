import { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  MessageSquare, 
  CreditCard, 
  TrendingUp, 
  TrendingDown,
  Zap,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { superAdminApi, SuperAdminStats } from '@/services/superAdminApi';

const channelColors: Record<string, string> = {
  whatsapp: '#22c55e', // Bright Green
  sms: '#3b82f6',      // Bright Blue
  email: '#f59e0b',    // Amber
  rcs: '#8b5cf6',      // Violet
  instagram: '#ec4899', // Pink
  facebook: '#1d4ed8',  // Dark Blue
};

const COLORS_LIST = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#1d4ed8', '#06b6d4', '#14b8a6'];

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await superAdminApi.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 text-center text-red-500 bg-red-50 rounded-lg mx-6 mt-6">
        <p>{error || 'No data available'}</p>
        <button onClick={fetchStats} className="mt-2 text-primary hover:underline">Retry</button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Clients',
      value: stats.totalClients.toLocaleString(),
      change: `${stats.activeClients} Active`,
      trend: 'neutral',
      icon: Building2,
    },
    {
      title: 'Active Plans',
      value: stats.activePlans.toString(),
      change: 'All time',
      trend: 'neutral',
      icon: CreditCard,
    },
    {
      title: 'Messages Processed',
      value: (stats.totalMessagesProcessed > 1000000) 
        ? (stats.totalMessagesProcessed / 1000000).toFixed(2) + 'M' 
        : stats.totalMessagesProcessed.toLocaleString(),
      change: `+${stats.messagesToday.toLocaleString()} today`,
      trend: 'up',
      icon: MessageSquare,
    },
    {
      title: 'Revenue (Total)',
      value: `$${stats.revenueTotal.toLocaleString()}`,
      change: `$${stats.revenueMonth.toLocaleString()} this month`,
      trend: 'up',
      icon: DollarSign,
    },
    {
      title: 'Credits Consumed',
      value: stats.creditsConsumedMonth.toLocaleString(),
      change: `${stats.creditsConsumedToday.toLocaleString()} today`,
      trend: 'up',
      icon: Zap,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Dashboard</h1>
          <p className="text-muted-foreground">Global metrics across all clients</p>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg">
          <Users className="w-4 h-4" />
          <span className="font-medium">{stats.activeClients} Active Clients</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <div className="flex items-center gap-1 text-xs">
                    {stat.trend === 'up' && <TrendingUp className="w-3 h-3 text-primary" />}
                    {stat.trend === 'neutral' && <TrendingDown className="w-3 h-3 text-muted-foreground rotate-0" />}
                    <span className="text-muted-foreground">{stat.change}</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Messages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly Message Volume</CardTitle>
            <CardDescription>Messages processed per day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyMessages}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => v >= 1000 ? `${v/1000}K` : v} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Channel Distribution</CardTitle>
            <CardDescription>Message volume by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.channelUsage}
                    dataKey="messages"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
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
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Messages']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3 max-h-[250px] overflow-y-auto px-4">
                {stats.channelUsage.filter(i => i.percentage > 0).length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm">
                      <p>No activity yet.</p>
                      <p className="text-xs mt-1">Start sending campaigns to see stats.</p>
                    </div>
                ) : (
                    stats.channelUsage.filter(i => i.percentage > 0).map((item, index) => (
                  <div key={item.channel} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full ring-2 ring-background ring-offset-1" 
                        style={{ backgroundColor: channelColors[item.channel.toLowerCase()] || COLORS_LIST[index % COLORS_LIST.length] }}
                      />
                      <span className="capitalize font-medium">{item.channel}</span>
                    </div>
                    <span className="font-bold">{item.percentage}%</span>
                  </div>
                )))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Clients by Plan</CardTitle>
            <CardDescription>Distribution of subscription plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] flex items-center">
              <ResponsiveContainer width="50%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.planDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {stats.planDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={channelColors[entry.name.toLowerCase()] || COLORS_LIST[index % COLORS_LIST.length]} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px' }}
                    formatter={(value: number) => [value, 'Clients']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                 {stats.planDistribution.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: channelColors[item.name.toLowerCase()] || COLORS_LIST[index % COLORS_LIST.length] }} />
                        <span>{item.name}</span>
                      </div>
                      <span className="font-bold">{item.value}</span>
                    </div>
                 ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Wallet Balances */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wallet Leaderboard</CardTitle>
            <CardDescription>Top users by available credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px] flex flex-col justify-center space-y-4">
              {stats.topClients.length === 0 ? (
                <p className="text-center text-muted-foreground">No users found</p>
              ) : (
                stats.topClients.map((client, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-none">{client.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="font-bold text-sm">{client.balance.toLocaleString()}</span>
                       <span className="text-xs text-muted-foreground ml-1">credits</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
