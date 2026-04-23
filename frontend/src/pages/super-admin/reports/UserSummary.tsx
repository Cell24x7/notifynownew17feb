import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Search, Filter, Calendar as CalendarIcon, MessageSquare, PhoneIncoming, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SummaryRecord {
    user_id: number;
    username: string;
    company: string;
    summary_date: string;
    total_sent: number;
    delivered: number;
    submitted: number;
    failed: number;
    read_count: number;
    billing: string;
}

interface UserSummaryProps {
    channel: 'sms' | 'whatsapp' | 'rcs' | 'all';
}

export default function UserSummary({ channel }: UserSummaryProps) {
    const [data, setData] = useState<SummaryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState(format(new Date().setDate(new Date().getDate() - 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const channelInfo = {
        sms: { title: 'SMS Summary Report', icon: <MessageSquare className="w-5 h-5 text-blue-500" /> },
        whatsapp: { title: 'WhatsApp Summary Report', icon: <PhoneIncoming className="w-5 h-5 text-emerald-500" /> },
        rcs: { title: 'RCS Summary Report', icon: <Zap className="w-5 h-5 text-amber-500" /> },
        all: { title: 'Global Summary Report', icon: <Filter className="w-5 h-5 text-slate-500" /> }
    }[channel];

    const fetchData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const url = `${import.meta.env.VITE_RCS_API_URL}/api/reports/user-summary?channel=${channel}&from=${startDate}&to=${endDate}`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const result = await res.json();
            if (result.success) {
                setData(result.summary);
            } else {
                toast.error(result.message || 'Failed to fetch summary');
            }
        } catch (error) {
            console.error('Fetch Summary Error:', error);
            toast.error('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [channel, startDate, endDate]);

    const filteredData = data.filter(item => 
        item.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.company?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const exportToCSV = () => {
        const headers = ['User ID', 'Username', 'Company', 'Date', 'Billing', 'Total sent', 'Delivered', 'Submitted', 'Failed', 'Read'];
        const csvContent = [
            headers.join(','),
            ...filteredData.map(item => [
                item.user_id,
                item.username,
                item.company,
                format(new Date(item.summary_date), 'yyyy-MM-dd'),
                item.billing,
                item.total_sent,
                item.delivered,
                item.submitted,
                item.failed,
                item.read_count
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${channel}_summary_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white shadow-sm border rounded-2xl">
                        {channelInfo.icon}
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{channelInfo.title}</h1>
                        <p className="text-muted-foreground text-sm">Aggregated performance metrics for {channel.toUpperCase()} campaigns.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 border-b pb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search user or company..." 
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full"
                        />
                        <Input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full"
                        />
                        <Button onClick={fetchData} variant="secondary" className="w-full font-bold">
                            Filter Results
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-100/50 dark:bg-slate-800/50">
                                <TableRow className="border-none">
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider">User ID</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider">Summary Date</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider">Billing</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right">Total Sent</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right">Delivered</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right">Submitted</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right text-red-500">Failed</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase tracking-wider text-right text-emerald-500">Read</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2">
                                                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Loading Report...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredData.length > 0 ? (
                                    filteredData.map((item, idx) => (
                                        <TableRow key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-b-slate-100 dark:border-b-slate-800">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 dark:text-slate-100">{item.company || 'Personal'}</span>
                                                    <span className="text-[10px] text-muted-foreground">{item.username}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-slate-500">
                                                {format(new Date(item.summary_date), 'MMM dd, yyyy')}
                                            </TableCell>
                                            <TableCell>
                                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200">
                                                    {item.billing}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                                                {item.total_sent.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium text-blue-600">
                                                {item.delivered.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-medium text-slate-500">
                                                {item.submitted.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-red-500">
                                                {item.failed.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-emerald-600">
                                                {item.read_count.toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-48 text-center">
                                            <div className="flex flex-col items-center gap-2 opacity-30">
                                                <Filter className="w-12 h-12" />
                                                <span className="text-sm font-bold uppercase tracking-widest">No matching records found</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
