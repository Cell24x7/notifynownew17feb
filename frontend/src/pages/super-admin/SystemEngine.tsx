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
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { API_BASE_URL } from '@/config/api';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';

export default function SystemEngine() {
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/queue-manager/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
        // Add to history for chart
        setHistory(prev => {
          const newHistory = [...prev, {
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            waiting: data.counts.waiting,
            active: data.counts.active
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
    const interval = setInterval(fetchStats, 5000); // 5s refresh for performance balance
    return () => clearInterval(interval);
  }, []);

  const handleControl = async (action: 'pause' | 'resume') => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/queue-manager/control`, {
        method: 'POST',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      });
      const data = await response.json();
      
      if (data.success) {
        toast({ title: 'Engine Status', description: `Engine ${action === 'pause' ? 'Paused' : 'Resumed'}` });
        setIsPaused(action === 'pause');
        fetchStats();
      }
    } catch (error: any) {
      toast({ title: 'Control failed', description: 'Failed to update engine state', variant: 'destructive' });
    }
  };

  if (!stats) return <div className="p-8">Loading Engine...</div>;

  const target = 10000000;
  const progress = Math.min((stats.counts.completed / target) * 100, 100);

  return (
    <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-950/50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Rocket className="w-8 h-8 text-primary animate-pulse" />
            1Cr+ Messaging Engine
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              Waiting in Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 tracking-tight">{stats.counts.waiting.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Messages pending</p>
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
            <div className="text-3xl font-bold text-amber-600 tracking-tight">{stats.counts.active.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Current batch load</p>
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
            <div className="text-3xl font-bold text-emerald-600 tracking-tight">{stats.counts.completed.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Lifetime success</p>
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
            <div className="text-3xl font-bold text-red-600 tracking-tight">{stats.counts.failed.toLocaleString()}</div>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wider font-semibold">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Traffic Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-yellow-500" />
              Engine Load (Live Feed)
            </CardTitle>
            <CardDescription className="text-xs italic">Live message flow across the 1Cr engine clusters.</CardDescription>
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
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fontSize: 9}} />
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
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-base font-bold">Recent Status</CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-tighter">Last 5 processed messages</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {stats.feed.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full shadow-[0_0_8px]",
                      job.status === 'success' ? "bg-emerald-500 shadow-emerald-500/50" : "bg-red-500 shadow-red-500/50"
                    )} />
                    <div>
                      <div className="text-xs font-bold leading-none">{job.mobile || 'Unknown'}</div>
                      <div className="text-[10px] text-muted-foreground mt-1 italic">{job.time}</div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest",
                    job.status === 'success' ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  )}>
                    {job.status}
                  </div>
                </div>
              ))}
              {stats.feed.length === 0 && (
                <div className="text-center py-16 text-muted-foreground text-sm italic">
                  Engine is idling... <br />No new traffic.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-center text-[10px] text-muted-foreground font-medium uppercase tracking-widest py-4 border-t border-border mt-8">
        HIGH-THROUGHPUT MESSAGING ENGINE . POWERED BY REDIS + BULLMQ . v2.5 STABLE
      </div>
    </div>
  );
}
