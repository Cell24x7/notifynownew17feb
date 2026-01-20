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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { superAdminDashboardStats } from '@/lib/superAdminMockData';

const statCards = [
  {
    title: 'Total Clients',
    value: superAdminDashboardStats.totalClients.toLocaleString(),
    change: '+12 this month',
    trend: 'up',
    icon: Building2,
  },
  {
    title: 'Active Plans',
    value: superAdminDashboardStats.activePlans,
    change: '3 active plans',
    trend: 'neutral',
    icon: CreditCard,
  },
  {
    title: 'Messages Processed',
    value: (superAdminDashboardStats.totalMessagesProcessed / 1000000).toFixed(2) + 'M',
    change: '+156K today',
    trend: 'up',
    icon: MessageSquare,
  },
  {
    title: 'Credits Today',
    value: superAdminDashboardStats.creditsConsumedToday.toLocaleString(),
    change: `${(superAdminDashboardStats.creditsConsumedMonth / 1000).toFixed(0)}K this month`,
    trend: 'up',
    icon: Zap,
  },
  {
    title: 'Revenue Today',
    value: `$${superAdminDashboardStats.revenueToday.toLocaleString()}`,
    change: `$${(superAdminDashboardStats.revenueMonth / 1000).toFixed(0)}K this month`,
    trend: 'up',
    icon: DollarSign,
  },
];

const pieColors = ['#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa', '#f87171'];

export default function SuperAdminDashboard() {
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
          <span className="font-medium">{superAdminDashboardStats.activeClients} Active Clients</span>
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
                    {stat.trend === 'down' && <TrendingDown className="w-3 h-3 text-destructive" />}
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

      {/* Charts Row */}
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
                <BarChart data={superAdminDashboardStats.weeklyMessages}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `${v/1000}K`} />
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
                    data={superAdminDashboardStats.channelUsage}
                    dataKey="messages"
                    nameKey="channel"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {superAdminDashboardStats.channelUsage.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
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
              <div className="flex-1 space-y-2">
                {superAdminDashboardStats.channelUsage.map((item, index) => (
                  <div key={item.channel} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: pieColors[index] }}
                      />
                      <span>{item.channel}</span>
                    </div>
                    <span className="font-medium">{item.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Growth</CardTitle>
            <CardDescription>New clients over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={superAdminDashboardStats.clientGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clients" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Credits by Plan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credits by Plan</CardTitle>
            <CardDescription>Credit consumption per plan type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={superAdminDashboardStats.creditsByPlan} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" tickFormatter={(v) => `${v/1000000}M`} />
                  <YAxis type="category" dataKey="plan" className="text-xs" width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [value.toLocaleString(), 'Credits']}
                  />
                  <Bar dataKey="credits" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
