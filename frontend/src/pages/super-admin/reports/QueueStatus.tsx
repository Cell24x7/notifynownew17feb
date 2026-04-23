import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Activity, RefreshCw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Queue {
    name: string;
    count: number;
}

export default function QueueStatus() {
    const [queues, setQueues] = useState<Queue[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_RCS_API_URL}/api/reports/queue-status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setQueues(data.queues);
                setLastUpdated(new Date());
            } else {
                toast.error(data.message || 'Failed to fetch queue status');
            }
        } catch (error) {
            console.error('Queue Status Error:', error);
            toast.error('Network error while fetching queue status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000); // Auto-refresh every 30s
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">System Queue Status</h1>
                    <p className="text-muted-foreground">Real-time monitoring of campaign processing queues.</p>
                </div>
                <Button variant="outline" onClick={fetchStatus} disabled={loading} className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {queues.map((q) => (
                    <Card key={q.name} className="overflow-hidden border-none shadow-md bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium text-muted-foreground">{q.name}</p>
                                    <p className="text-3xl font-bold tracking-tighter">{q.count.toLocaleString()}</p>
                                </div>
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                                    <Layers className="w-6 h-6 text-emerald-600" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-none">
                                    Active
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">Last updated: {lastUpdated.toLocaleTimeString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="shadow-lg border-none">
                <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Queue Breakdown</CardTitle>
                            <CardDescription>Detailed message distribution across all channels</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                            <TableRow>
                                <TableHead className="w-[300px]">QUEUE NAME</TableHead>
                                <TableHead>STATUS</TableHead>
                                <TableHead className="text-right">COUNT</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {queues.map((q) => (
                                <TableRow key={q.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                    <TableCell className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                        {q.name}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full animate-pulse ${q.count > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                            <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                                                {q.count > 0 ? 'Processing' : 'Idle'}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono font-bold text-lg text-emerald-600">
                                        {q.count}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {queues.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
                                        No active queues found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
