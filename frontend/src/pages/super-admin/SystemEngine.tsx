import { useState, useEffect } from 'react';
import { 
  Rocket, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Pause, 
  Play, 
  RefreshCcw,
  Zap,
  Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function SystemEngine() {
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const fetchStats = async () => {
    try {
      const response = await api.get('/queue-manager/status');
      if (response.data.success) {
        setStats(response.data);
        // Add to history for chart
        setHistory(prev => {
          const newHistory = [...prev, {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            waiting: response.data.counts.waiting,
            active: response.data.counts.active
          }].slice(-20); // Keep last 20 points
          return newHistory;
        });
      }
    } catch (error) {
      console.error('Failed to fetch engine stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 2000); // Fast refresh for "Proper" visibility
    return () => clearInterval(interval);
  }, []);

  const handleControl = async (action: 'pause' | 'resume') => {
    try {
      const response = await api.post('/queue-manager/control', { action });
      if (response.data.success) {
        toast.success(`Engine ${action === 'pause' ? 'Paused' : 'Resumed'}`);
        setIsPaused(action === 'pause');
        fetchStats();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Control failed');
    }
  };

  if (!stats) return <div className="p-8">Loading Engine...</div>;

  const target = 10000000;
  const progress = Math.min((stats.counts.completed / target) * 100, 100);

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Rocket className="w-8 h-8 text-primary animate-pulse" />
            1Cr+ Messaging Engine
          </h1>
          <p className="text-muted-foreground mt-1">
            Real-time monitoring of the high-performance BullMQ & Redis infrastructure.
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={isPaused ? "default" : "outline"}
            onClick={() => handleControl(isPaused ? 'resume' : 'pause')}
            className="gap-2"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {isPaused ? "Resume Engine" : "Pause Engine"}
          </Button>
          <Button variant="outline" size="icon" onClick={fetchStats}>
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Target Progress */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-primary font-bold">
              <Target className="w-5 h-5" />
              1 Crore Traffic Goal
            </div>
            <div className="text-sm font-medium">
              {stats.counts.completed.toLocaleString()} / {target.toLocaleString()}
            </div>
          </div>
          <Progress value={progress} className="h-3" />
          <p className="text-[10px] text-muted-foreground mt-2 text-right">
            Scale Capacity: Unlimited (Redis Cluster Ready)
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Waiting in Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.counts.waiting.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Messages pending</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              Active Processing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">{stats.counts.active.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Current batch load</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Total Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{stats.counts.completed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime success</p>
          </CardContent>
        </Card>

        <Card className="bg-red-500/10 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Failed / Dead
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.counts.failed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Traffic Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              Engine Load (Live)
            </CardTitle>
            <CardDescription>Live message flow across the 1Cr engine clusters.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="colorWaiting" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                  <YAxis hide />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="waiting" 
                    stroke="#3b82f6" 
                    fillOpacity={1} 
                    fill="url(#colorWaiting)" 
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="active" 
                    stroke="#f59e0b" 
                    fill="transparent"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Live Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Real-time Feed</CardTitle>
            <CardDescription>Last 5 processed messages</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {stats.feed.map((job: any) => (
              <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    job.status === 'success' ? "bg-emerald-500" : "bg-red-500"
                  )} />
                  <div>
                    <div className="text-sm font-medium">{job.mobile || 'Unknown'}</div>
                    <div className="text-[10px] text-muted-foreground">{job.time}</div>
                  </div>
                </div>
                <div className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase",
                  job.status === 'success' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                )}>
                  {job.status}
                </div>
              </div>
            ))}
            {stats.feed.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm italic">
                Engine is idling... No new traffic.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-[11px] text-muted-foreground">
        Proprietary messaging engine infrastructure by Antigravity AI. 
        <br />
        Current Version: v2.4 (High Throughput Optimized)
      </div>
    </div>
  );
}
