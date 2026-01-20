import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { dashboardStats, agentAnalytics, channelAnalytics, satisfactionTrends, botVsHumanResolution } from '@/lib/mockData';
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

const statCards = [
  {
    title: 'Total Conversations',
    value: dashboardStats.totalConversations.toLocaleString(),
    change: '+12.5%',
    trend: 'up',
    icon: MessageSquare,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    title: 'Active Chats',
    value: dashboardStats.activeChats.toLocaleString(),
    change: '+8.2%',
    trend: 'up',
    icon: Users,
    color: 'text-secondary',
    bg: 'bg-secondary/10',
  },
  {
    title: 'Automations Triggered',
    value: dashboardStats.automationsTriggered.toLocaleString(),
    change: '+23.1%',
    trend: 'up',
    icon: Zap,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    title: 'Campaigns Sent',
    value: dashboardStats.campaignsSent.toLocaleString(),
    change: '-2.4%',
    trend: 'down',
    icon: Send,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
];

const pieColors = ['#4ADE80', '#6366F1', '#EC4899', '#3B82F6', '#8B5CF6', '#F59E0B', '#14B8A6'];
const channelColors: Record<string, string> = {
  whatsapp: '#25D366',
  sms: '#3B82F6',
  instagram: '#E4405F',
  facebook: '#1877F2',
  rcs: '#8B5CF6',
  email: '#F59E0B',
  voicebot: '#14B8A6',
};

export default function Dashboard() {
  const [selectedChannel, setSelectedChannel] = useState<string>('all');

  const pieData = Object.entries(dashboardStats.channelDistribution).map(([channel, value]) => ({
    name: channelConfig[channel as keyof typeof channelConfig]?.label || channel,
    value,
    channel: channel as keyof typeof channelConfig,
  }));

  // Calculate totals across all channels
  const totalMessages = Object.values(channelAnalytics).reduce((acc, ch) => acc + ch.totalMessages, 0);
  const totalDelivered = Object.values(channelAnalytics).reduce((acc, ch) => acc + ch.delivered, 0);
  const totalBotHandled = Object.values(channelAnalytics).reduce((acc, ch) => acc + ch.botHandled, 0);
  const totalHumanHandled = Object.values(channelAnalytics).reduce((acc, ch) => acc + ch.humanHandled, 0);
  const avgSatisfaction = (Object.values(channelAnalytics).reduce((acc, ch) => acc + ch.satisfaction, 0) / Object.keys(channelAnalytics).length).toFixed(1);

  const channels = [
    { key: 'whatsapp', icon: 'whatsapp' },
    { key: 'sms', icon: 'sms' },
    { key: 'instagram', icon: 'instagram' },
    { key: 'facebook', icon: 'facebook' },
    { key: 'rcs', icon: 'rcs' },
    { key: 'email', icon: 'email' },
    { key: 'voicebot', icon: 'voicebot' },
  ];

  const getChannelData = () => {
    if (selectedChannel === 'all') return null;
    return channelAnalytics[selectedChannel as keyof typeof channelAnalytics];
  };

  const selectedChannelData = getChannelData();

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in overflow-auto">
      {/* Header */}
      <div className="flex flex-col gap-1 md:gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground text-sm md:text-base">Comprehensive insights across all your communication channels.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="card-elevated animate-slide-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-success' : 'text-destructive'
                }`}>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                  {stat.change}
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
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1 md:gap-2 text-primary mb-1 md:mb-2">
                      <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm font-medium">Total Messages</span>
                    </div>
                    <p className="text-lg md:text-2xl font-bold">{totalMessages.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1 md:gap-2 text-success mb-1 md:mb-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm font-medium">Delivered</span>
                    </div>
                    <p className="text-lg md:text-2xl font-bold">{((totalDelivered / totalMessages) * 100).toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1 md:gap-2 text-blue-500 mb-1 md:mb-2">
                      <Bot className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm font-medium">Bot Handled</span>
                    </div>
                    <p className="text-lg md:text-2xl font-bold">{totalBotHandled.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1 md:gap-2 text-purple-500 mb-1 md:mb-2">
                      <UserCheck className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm font-medium">Human Handled</span>
                    </div>
                    <p className="text-lg md:text-2xl font-bold">{totalHumanHandled.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 col-span-2 lg:col-span-1">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-1 md:gap-2 text-yellow-600 mb-1 md:mb-2">
                      <Star className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="text-xs md:text-sm font-medium">Avg Satisfaction</span>
                    </div>
                    <p className="text-lg md:text-2xl font-bold">{avgSatisfaction}/5</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Satisfaction Trends */}
                <Card>
                  <CardHeader className="px-4 md:px-6 py-3 md:py-4">
                    <CardTitle className="text-sm md:text-base">Customer Satisfaction Trends</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 md:px-6">
                    <div className="h-[200px] md:h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={satisfactionTrends}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                          <YAxis domain={[3.5, 5]} stroke="hsl(var(--muted-foreground))" />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="whatsapp" stroke="#25D366" strokeWidth={2} dot={false} name="WhatsApp" />
                          <Line type="monotone" dataKey="sms" stroke="#3B82F6" strokeWidth={2} dot={false} name="SMS" />
                          <Line type="monotone" dataKey="instagram" stroke="#E4405F" strokeWidth={2} dot={false} name="Instagram" />
                          <Line type="monotone" dataKey="facebook" stroke="#1877F2" strokeWidth={2} dot={false} name="Messenger" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Bot vs Human Resolution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Bot vs Human Resolution by Channel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={botVsHumanResolution} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
                          <YAxis dataKey="channel" type="category" stroke="hsl(var(--muted-foreground))" width={80} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                            formatter={(value: number) => [`${value}%`]}
                          />
                          <Legend />
                          <Bar dataKey="bot" stackId="a" fill="#6366F1" name="Bot Handled" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="human" stackId="a" fill="#EC4899" name="Human Handled" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Channel Performance Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Object.entries(channelAnalytics).map(([key, data]) => (
                  <Card 
                    key={key} 
                    className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                    onClick={() => setSelectedChannel(key)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          {key === 'email' ? (
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${channelColors[key]}20` }}>
                              <Mail className="h-5 w-5" style={{ color: channelColors[key] }} />
                            </div>
                          ) : key === 'voicebot' ? (
                            <div className="p-2 rounded-lg" style={{ backgroundColor: `${channelColors[key]}20` }}>
                              <Headphones className="h-5 w-5" style={{ color: channelColors[key] }} />
                            </div>
                          ) : (
                            <ChannelIcon channel={key as any} size="md" />
                          )}
                          <span className="font-semibold">{data.name}</span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1 fill-yellow-400 text-yellow-400" />
                          {data.satisfaction}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Messages</span>
                          <span className="font-medium">{data.totalMessages.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Delivery Rate</span>
                          <span className="font-medium text-success">
                            {((data.delivered / data.totalMessages) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Avg Response</span>
                          <span className="font-medium">{data.avgResponseTime}</span>
                        </div>
                        <div className="pt-2">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Bot: {data.botHandled}</span>
                            <span>Human: {data.humanHandled}</span>
                          </div>
                          <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                            <div 
                              className="bg-primary transition-all"
                              style={{ width: `${(data.botHandled / (data.botHandled + data.humanHandled)) * 100}%` }}
                            />
                            <div 
                              className="bg-pink-500"
                              style={{ width: `${(data.humanHandled / (data.botHandled + data.humanHandled)) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Individual Channel Views */}
            {channels.map((ch) => (
              <TabsContent key={ch.key} value={ch.key} className="space-y-6">
                {channelAnalytics[ch.key as keyof typeof channelAnalytics] && (
                  <>
                    {/* Channel Header Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                      <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Total Messages</p>
                          <p className="text-xl font-bold">
                            {channelAnalytics[ch.key as keyof typeof channelAnalytics].totalMessages.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-success/10 to-success/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Delivered</p>
                          <p className="text-xl font-bold text-success">
                            {((channelAnalytics[ch.key as keyof typeof channelAnalytics].delivered / 
                              channelAnalytics[ch.key as keyof typeof channelAnalytics].totalMessages) * 100).toFixed(1)}%
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Responded</p>
                          <p className="text-xl font-bold">
                            {channelAnalytics[ch.key as keyof typeof channelAnalytics].responded.toLocaleString()}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Satisfaction</p>
                          <p className="text-xl font-bold flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            {channelAnalytics[ch.key as keyof typeof channelAnalytics].satisfaction}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Avg Response Time</p>
                          <p className="text-xl font-bold">
                            {channelAnalytics[ch.key as keyof typeof channelAnalytics].avgResponseTime}
                          </p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-to-br from-pink-500/10 to-pink-500/5">
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Bot vs Human</p>
                          <p className="text-xl font-bold">
                            {Math.round((channelAnalytics[ch.key as keyof typeof channelAnalytics].botHandled / 
                              (channelAnalytics[ch.key as keyof typeof channelAnalytics].botHandled + 
                               channelAnalytics[ch.key as keyof typeof channelAnalytics].humanHandled)) * 100)}%
                            <span className="text-xs text-muted-foreground ml-1">bot</span>
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Weekly Trend */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Weekly Message Trend</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={channelAnalytics[ch.key as keyof typeof channelAnalytics].weeklyTrend}>
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
                                <Legend />
                                <Area 
                                  type="monotone" 
                                  dataKey="sent" 
                                  stroke={channelColors[ch.key]} 
                                  fill={`${channelColors[ch.key]}40`}
                                  name="Sent"
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey="received" 
                                  stroke="#EC4899" 
                                  fill="#EC489940"
                                  name="Received"
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Hourly Activity */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Hourly Activity Pattern</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={channelAnalytics[ch.key as keyof typeof channelAnalytics].hourlyActivity.filter((_, i) => i % 2 === 0)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" />
                                <YAxis stroke="hsl(var(--muted-foreground))" />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    border: '1px solid hsl(var(--border))',
                                    borderRadius: '8px',
                                  }}
                                  formatter={(value: number) => [value, 'Messages']}
                                />
                                <Bar 
                                  dataKey="count" 
                                  fill={channelColors[ch.key]} 
                                  radius={[4, 4, 0, 0]}
                                />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Top Intents */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Top Customer Intents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {channelAnalytics[ch.key as keyof typeof channelAnalytics].topIntents.map((intent, idx) => (
                            <div key={intent.intent} className="p-4 rounded-lg bg-muted/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{intent.intent}</span>
                                <Badge variant="secondary">{intent.percentage}%</Badge>
                              </div>
                              <p className="text-2xl font-bold" style={{ color: pieColors[idx % pieColors.length] }}>
                                {intent.count.toLocaleString()}
                              </p>
                              <Progress 
                                value={intent.percentage} 
                                className="h-1.5 mt-2"
                              />
                            </div>
                          ))}
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
                <BarChart data={dashboardStats.weeklyChats}>
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
                <p className="text-2xl font-bold text-primary">{dashboardStats.openChats}</p>
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
                <p className="text-2xl font-bold">{dashboardStats.closedChats.toLocaleString()}</p>
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

      {/* Agent Analytics Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Agent Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Assigned
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Closed
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Open</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Star className="h-3 w-3" />
                      Rating
                    </div>
                  </TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      First Response
                    </div>
                  </TableHead>
                  <TableHead className="text-center">Avg Response</TableHead>
                  <TableHead className="text-center">Avg Closing</TableHead>
                  <TableHead className="text-center">Resolution Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agentAnalytics.map((agent) => (
                  <TableRow key={agent.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">{agent.avatar}</span>
                          </div>
                          <span className={cn(
                            "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                            agent.status === 'online' && 'bg-green-500',
                            agent.status === 'busy' && 'bg-yellow-500',
                            agent.status === 'offline' && 'bg-gray-400',
                          )} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{agent.name}</p>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs capitalize",
                              agent.status === 'online' && 'bg-green-500/10 text-green-600',
                              agent.status === 'busy' && 'bg-yellow-500/10 text-yellow-600',
                              agent.status === 'offline' && 'bg-gray-500/10 text-gray-600',
                            )}
                          >
                            {agent.status}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">{agent.assigned}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-success font-medium">{agent.closed}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-medium",
                        agent.open > 20 ? 'text-destructive' : agent.open > 10 ? 'text-warning' : 'text-muted-foreground'
                      )}>
                        {agent.open}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{agent.rating}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "text-sm",
                        agent.firstResponseTime.includes('s') && !agent.firstResponseTime.includes('m') 
                          ? 'text-success font-medium' 
                          : 'text-muted-foreground'
                      )}>
                        {agent.firstResponseTime}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {agent.avgResponseTime}
                    </TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {agent.avgClosingTime}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={agent.resolutionRate} 
                          className="h-2 w-16"
                        />
                        <span className={cn(
                          "text-sm font-medium min-w-[40px]",
                          agent.resolutionRate >= 95 ? 'text-success' : 
                          agent.resolutionRate >= 90 ? 'text-primary' : 'text-warning'
                        )}>
                          {agent.resolutionRate}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}