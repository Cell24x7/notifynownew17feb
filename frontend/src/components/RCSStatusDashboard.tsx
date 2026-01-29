import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  MessageSquare,
  Users,
  Zap,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react';

interface StatusUpdate {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  progress: number;
  timestamp: string;
}

interface MetricData {
  name: string;
  value: number;
}

interface ChartData {
  name: string;
  value: number;
}

const statusUpdates: StatusUpdate[] = [
  {
    id: 'STATUS001',
    title: 'Onboarding Application Submitted',
    description: 'Your RCS onboarding application has been submitted successfully',
    status: 'completed',
    progress: 100,
    timestamp: '2026-01-26 14:00'
  },
  {
    id: 'STATUS002',
    title: 'Documents Under Review',
    description: 'Admin team is reviewing your submitted documents',
    status: 'in-progress',
    progress: 65,
    timestamp: '2026-01-26 12:30'
  },
  {
    id: 'STATUS003',
    title: 'Business Verification',
    description: 'Pending verification with regulatory authorities',
    status: 'in-progress',
    progress: 40,
    timestamp: '2026-01-25 10:15'
  },
  {
    id: 'STATUS004',
    title: 'RCS Agent Provisioning',
    description: 'Will start after approval',
    status: 'pending',
    progress: 0,
    timestamp: '2026-01-25 00:00'
  },
  {
    id: 'STATUS005',
    title: 'Template Approval',
    description: 'Create and submit your RCS message templates',
    status: 'pending',
    progress: 0,
    timestamp: '2026-01-25 00:00'
  }
];

const messageStats: MetricData[] = [
  { name: 'Sent', value: 12450 },
  { name: 'Delivered', value: 12230 },
  { name: 'Failed', value: 220 },
  { name: 'Pending', value: 100 }
];

const dailyMetrics: ChartData[] = [
  { name: 'Jan 21', value: 1200 },
  { name: 'Jan 22', value: 1900 },
  { name: 'Jan 23', value: 1500 },
  { name: 'Jan 24', value: 2100 },
  { name: 'Jan 25', value: 2400 },
  { name: 'Jan 26', value: 1800 }
];

const channelDistribution: ChartData[] = [
  { name: 'RCS', value: 65 },
  { name: 'SMS', value: 25 },
  { name: 'WhatsApp', value: 10 }
];

const categoryPerformance: ChartData[] = [
  { name: 'OTP', value: 2800 },
  { name: 'Transactional', value: 4200 },
  { name: 'Promotional', value: 3100 },
  { name: 'Alert', value: 1350 }
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

export default function RCSStatusDashboard() {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Calculate overall progress
  const overallProgress =
    (statusUpdates.reduce((sum, update) => sum + update.progress, 0) /
      statusUpdates.length);

  // Calculate delivery metrics
  const totalMessages = messageStats.reduce((sum, m) => sum + m.value, 0);
  const deliveredMessages = messageStats.find(m => m.name === 'Delivered')?.value || 0;
  const deliveryRate = Math.round((deliveredMessages / totalMessages) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">📊 RCS Status Dashboard</h1>
          <p className="text-gray-600">Track your onboarding progress and message analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto-refresh
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['24h', '7d', '30d'] as const).map(range => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            onClick={() => setTimeRange(range)}
            size="sm"
          >
            {range === '24h' ? '24 Hours' : range === '7d' ? '7 Days' : '30 Days'}
          </Button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                <p className="text-3xl font-bold">{Math.round(overallProgress)}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-500" />
            </div>
            <Progress value={overallProgress} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Messages Sent</p>
                <p className="text-3xl font-bold">{(totalMessages / 1000).toFixed(1)}K</p>
              </div>
              <MessageSquare className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Last {timeRange}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Delivery Rate</p>
                <p className="text-3xl font-bold">{deliveryRate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Delivered: {deliveredMessages.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">API Status</p>
                <p className="text-3xl font-bold">99.9%</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Uptime</p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding Progress Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Progress</CardTitle>
          <CardDescription>Track your RCS onboarding journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {statusUpdates.map((update, index) => (
              <div key={update.id} className="relative pb-6">
                {/* Timeline line */}
                {index < statusUpdates.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-12 bg-gray-200" />
                )}

                <div className="flex gap-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 mt-1">
                    {update.status === 'completed' ? (
                      <CheckCircle className="w-6 h-6 text-green-500 bg-white" />
                    ) : update.status === 'in-progress' ? (
                      <Clock className="w-6 h-6 text-blue-500 bg-white" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-gray-400 bg-white" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold">{update.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{update.description}</p>
                      </div>
                      <Badge
                        variant={
                          update.status === 'completed'
                            ? 'default'
                            : update.status === 'in-progress'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {update.status === 'completed'
                          ? '✓ Complete'
                          : update.status === 'in-progress'
                            ? '⏳ In Progress'
                            : '⏸ Pending'}
                      </Badge>
                    </div>
                    {update.progress > 0 && (
                      <>
                        <Progress value={update.progress} className="h-1.5 mb-1" />
                        <p className="text-xs text-gray-500">{update.progress}% complete</p>
                      </>
                    )}
                    <p className="text-xs text-gray-400 mt-2">{update.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Daily Messages Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Messages</CardTitle>
            <CardDescription>Message volume over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Message Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Message Status</CardTitle>
            <CardDescription>Current message distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {messageStats.map(stat => (
                <div key={stat.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{stat.name}</span>
                    <span className="text-gray-600">{stat.value.toLocaleString()}</span>
                  </div>
                  <Progress value={(stat.value / totalMessages) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Channel Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Distribution</CardTitle>
            <CardDescription>Messages by channel</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={channelDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name} ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {channelDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Category Performance</CardTitle>
            <CardDescription>Messages by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alert Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
          <CardDescription>Important system notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-sm">2026-01-26 14:30</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50">
                      Info
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">Documents submitted for review</TableCell>
                  <TableCell>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm">2026-01-25 10:15</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-yellow-50">
                      Warning
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">Business verification in progress</TableCell>
                  <TableCell>
                    <Clock className="w-4 h-4 text-yellow-500" />
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="text-sm">2026-01-20 08:00</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50">
                      Success
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">Onboarding application accepted</TableCell>
                  <TableCell>
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Support Card */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold mb-1">Need Help?</h3>
              <p className="text-sm text-gray-700">
                Check our documentation or contact support for assistance with RCS onboarding and integration.
              </p>
            </div>
            <Button variant="default" size="sm">
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
