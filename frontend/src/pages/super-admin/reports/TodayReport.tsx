import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, Users, MessageSquare, PhoneIncoming, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface TodayRecord {
    username: string;
    company: string;
    channel: string;
    total: number;
    submitted: number;
    delivered: number;
    failed: number;
}

export default function TodayReport() {
    const [data, setData] = useState<TodayRecord[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const baseUrl = import.meta.env.VITE_RCS_API_URL || '';
            const res = await fetch(`${baseUrl}/api/reports/today-summary`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setData(result.summary);
            } else {
                toast.error(result.message || 'Failed to fetch today summary');
            }
        } catch (error) {
            console.error('Today Report Error:', error);
            toast.error('Network error while fetching today report');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Refresh every minute
        return () => clearInterval(interval);
    }, []);

    const getChannelIcon = (channel: string) => {
        switch (channel.toLowerCase()) {
            case 'whatsapp': return <PhoneIncoming className="w-4 h-4 text-emerald-500" />;
            case 'rcs': return <Zap className="w-4 h-4 text-amber-500" />;
            default: return <MessageSquare className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white shadow-sm border rounded-2xl">
                        <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Today's Live Report</h1>
                        <p className="text-muted-foreground text-sm">Real-time message traffic for {format(new Date(), 'EEEE, MMM dd, yyyy')}</p>
                    </div>
                </div>
                <Button variant="outline" onClick={fetchData} disabled={loading} className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Sync Data
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-md bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-slate-800">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Active Users Today</p>
                        <p className="text-3xl font-bold mt-2">{new Set(data.map(d => d.username)).size}</p>
                        <div className="mt-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-xs text-muted-foreground">Unique users sending traffic</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-gradient-to-br from-white to-emerald-50 dark:from-slate-900 dark:to-slate-800">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Total Messages Sent</p>
                        <p className="text-3xl font-bold mt-2">{data.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()}</p>
                        <div className="mt-4 flex items-center gap-2 text-emerald-600">
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">LIVE</Badge>
                            <span className="text-xs text-muted-foreground">Combined across all channels</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-md bg-gradient-to-br from-white to-amber-50 dark:from-slate-900 dark:to-slate-800">
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-muted-foreground">Average Delivery Rate</p>
                        <p className="text-3xl font-bold mt-2">
                            {data.reduce((acc, curr) => acc + curr.total, 0) > 0 
                                ? ((data.reduce((acc, curr) => acc + curr.delivered, 0) / data.reduce((acc, curr) => acc + curr.total, 0)) * 100).toFixed(1)
                                : 0}%
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-amber-500" />
                            <span className="text-xs text-muted-foreground">Based on current platform response</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-none shadow-lg overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b">
                    <CardTitle>Activity Breakdown</CardTitle>
                    <CardDescription>Live stats of which user is sending what today</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100/50 dark:bg-slate-800/50 border-none">
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest">User/Company</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-center">Channel</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right">Total Base</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right">Submitted</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right text-emerald-600">Delivered</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-right text-red-500">Failed</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        Refreshing live data...
                                    </TableCell>
                                </TableRow>
                            ) : data.length > 0 ? (
                                data.map((item, idx) => (
                                    <TableRow key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors">
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{item.company || 'Direct User'}</span>
                                                <span className="text-[10px] text-muted-foreground">{item.username}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 py-1 px-3 rounded-full w-fit mx-auto">
                                                {getChannelIcon(item.channel)}
                                                <span className="text-[10px] font-black uppercase tracking-tighter">{item.channel}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold">{item.total.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono text-slate-500">{item.submitted.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-emerald-600">{item.delivered.toLocaleString()}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-red-500">{item.failed.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No traffic observed yet today.
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
