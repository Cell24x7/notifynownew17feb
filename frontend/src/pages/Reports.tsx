import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, Search, ChevronLeft, ChevronRight, BarChart3, CheckCircle, XCircle, TrendingUp, ListFilter, MessageCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';

interface Report {
    id: string;
    name: string;
    template_id: string;
    recipient_count: number;
    sent_count: number;
    delivered_count: number;
    read_count: number;
    failed_count: number;
    created_at: string;
    channel?: string;
    template_name?: string;
}

interface WebhookLog {
    id: number;
    campaign_id: string;
    campaign_name: string;
    message_id: string;
    recipient: string;
    status: string;
    send_time: string;
    delivery_time: string | null;
    read_time: string | null;
    template_name: string;
    failure_reason: string | null;
    created_at: string;
    updated_at: string;
    channel?: string;
    campaign_channel?: string;
    message_content?: string;
}

interface EngagementReport {
    type: string;
    msisdn: string;
    interaction: string;
    campaign_name: string;
    timestamp: string;
}

const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export default function Reports() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [reports, setReports] = useState<Report[]>([]);
    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
    const [summaryPage, setSummaryPage] = useState(1);
    const [summaryTotal, setSummaryTotal] = useState(0);
    const [detailedPage, setDetailedPage] = useState(1);
    const [detailedTotal, setDetailedTotal] = useState(0);
    const ITEMS_PER_PAGE = 20;

    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [targetUserId, setTargetUserId] = useState('all');
    const [users, setUsers] = useState<any[]>([]);
    const [apiPage, setApiPage] = useState(1);
    const [apiTotal, setApiTotal] = useState(0);
    const [engagementReports, setEngagementReports] = useState<EngagementReport[]>([]);
    const [engagementPage, setEngagementPage] = useState(1);
    const [engagementTotal, setEngagementTotal] = useState(0);
    const [loadingEngagement, setLoadingEngagement] = useState(false);
    const [summaryStats, setSummaryStats] = useState<any>(null);
    
    const activeTab = searchParams.get('tab') || 'summary';
    const setActiveTab = (tab: string) => setSearchParams({ tab });

    useEffect(() => {
        setSummaryPage(1);
        fetchReports(1);
    }, [startDate, endDate, statusFilter, channelFilter]);

    useEffect(() => {
        setDetailedPage(1);
        if (activeTab === 'detailed' || activeTab === 'api') fetchWebhookLogs(1, activeTab);
    }, [startDate, endDate, channelFilter, searchQuery, targetUserId]);

    useEffect(() => {
        if (activeTab === 'summary') fetchReports(summaryPage);
    }, [summaryPage]);

    useEffect(() => {
        if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'reseller') fetchUsers();
    }, [user]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/clients`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (data.success) setUsers(data.clients || data.users || []);
        } catch (error) { console.error('Failed to fetch users', error); }
    };

    const fetchReports = async (page: number = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/rcs/reports?page=${page}&limit=${ITEMS_PER_PAGE}&source=${activeTab === 'api' ? 'api' : 'manual'}&`;
            if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
            if (statusFilter !== 'all') url += `status=${statusFilter}&`;
            if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
            if (targetUserId !== 'all') url += `userId=${targetUserId}&`;
            if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

            const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (data.success) {
                setReports(data.reports);
                setSummaryTotal(data.pagination?.total || 0);
            }
        } finally { setLoading(false); }
    };

    const fetchWebhookLogs = async (page: number = 1, currentTab: string = activeTab) => {
        setLoadingLogs(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/webhooks/message-logs?page=${page}&limit=${ITEMS_PER_PAGE}&source=${currentTab === 'api' ? 'api' : 'manual'}&`;
            if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
            if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
            if (targetUserId !== 'all') url += `userId=${targetUserId}&`;
            if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setWebhookLogs(data.data);
                if (currentTab === 'api') setApiTotal(data.pagination?.total || 0);
                else setDetailedTotal(data.pagination?.total || 0);
            }
        } finally { setLoadingLogs(false); }
    };

    const fetchSummaryStats = async () => {
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/reports/summary?`;
            if (startDate) url += `from=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `to=${endDate.toISOString().split('T')[0]}&`;
            if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
            if (targetUserId !== 'all') url += `userId=${targetUserId}&`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setSummaryStats(data.summary);
        } catch (error) { console.error('Error fetching summary stats:', error); }
    };

    const fetchEngagementReports = async (page: number = 1) => {
        setLoadingEngagement(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/reports/engagement?page=${page}&limit=${ITEMS_PER_PAGE}&`;
            if (startDate) url += `from=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `to=${endDate.toISOString().split('T')[0]}&`;
            if (targetUserId !== 'all') url += `userId=${targetUserId}&`;
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setEngagementReports(data.reports);
                setEngagementTotal(data.reports.length);
            }
        } finally { setLoadingEngagement(false); }
    };

    useEffect(() => {
        if (activeTab === 'summary') { fetchReports(summaryPage); fetchSummaryStats(); }
        if (activeTab === 'detailed') fetchWebhookLogs(detailedPage, 'detailed');
        if (activeTab === 'api') fetchWebhookLogs(apiPage, 'api');
        if (activeTab === 'engagement') fetchEngagementReports(engagementPage);
    }, [activeTab, startDate, endDate, searchQuery, targetUserId]);

    const handleRefresh = () => {
        if (activeTab === 'summary') { fetchReports(summaryPage); fetchSummaryStats(); }
        else if (activeTab === 'engagement') fetchEngagementReports(engagementPage);
        else fetchWebhookLogs(activeTab === 'api' ? apiPage : detailedPage, activeTab);
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            let url = '';
            if (activeTab === 'summary') url = `${API_BASE_URL}/api/rcs/reports?export=true&source=manual&`;
            else url = `${API_BASE_URL}/api/webhooks/message-logs?export=true&source=${activeTab === 'api' ? 'api' : 'manual'}&`;

            if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
            if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
            if (targetUserId !== 'all') url += `userId=${targetUserId}&`;
            if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                const results = activeTab === 'summary' ? data.reports : data.data;
                const headers = activeTab === 'summary' 
                    ? ['Campaign Name', 'Channel', 'Template', 'Date', 'Total', 'Sent', 'Delivered', 'Read', 'Failed']
                    : ['Id', 'Rtime', 'Mobile', 'Channel', 'Send', 'Deliv', 'Read', 'Template', 'Message', 'Reason', 'Status'];
                
                const rows = results.map((r: any) => activeTab === 'summary' ? [
                    `"${r.name}"`, `"${r.channel}"`, `"${r.template_name}"`, r.created_at, r.recipient_count, r.sent_count, r.delivered_count, r.read_count, r.failed_count
                ] : [
                    r.id, r.created_at, r.recipient, `"${r.channel || r.campaign_channel || 'rcs'}"`, r.send_time, r.delivery_time, r.read_time, `"${r.template_name}"`, `"${r.message_content?.replace(/"/g, '""')}"`, `"${r.failure_reason}"`, r.status
                ]);

                const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                downloadCsv(csvContent, `${activeTab}_report.csv`);
            }
        } finally { setLoading(false); }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'sent': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'delivered': return 'bg-green-50 text-green-700 border-green-200';
            case 'read': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'failed': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const getChannelStyles = (channel: string = '') => {
        const c = channel.toLowerCase();
        if (c === 'whatsapp') return 'bg-emerald-600 text-white shadow-emerald-200';
        if (c === 'rcs') return 'bg-indigo-600 text-white shadow-indigo-200';
        if (c === 'sms') return 'bg-amber-600 text-white shadow-amber-200';
        return 'bg-slate-600 text-white shadow-slate-200';
    };

    const renderPagination = (currentPage: number, totalItems: number, onPageChange: (page: number) => void) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;
        return (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/5">
                <div className="text-[11px] text-muted-foreground font-medium uppercase tracking-tight">
                    Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} entries
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-8 font-bold border-slate-200">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                    </Button>
                    <Badge variant="secondary" className="h-8 px-3 font-bold bg-white border text-primary">Page {currentPage} of {totalPages}</Badge>
                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 font-bold border-slate-200">
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col space-y-6 p-4 md:p-8 bg-slate-50/20">
            {/* Main Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" /> Reports Dashboard
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Unified delivery and engagement intelligence portal</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="font-bold bg-white border-slate-200">Refresh</Button>
                    <Button variant="default" size="sm" onClick={handleExport} className="gap-2 font-bold shadow-md">
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Volume', value: summaryTotal, icon: TrendingUp, color: 'blue' },
                    { label: 'Delivered', value: reports.reduce((acc, r) => acc + (r.delivered_count || 0), 0), icon: CheckCircle, color: 'emerald' },
                    { label: 'Failed', value: reports.reduce((acc, r) => acc + (r.failed_count || 0), 0), icon: XCircle, color: 'rose' },
                    { label: 'Conversations', value: summaryStats?.byResponse?.find((r: any) => r.label === 'whatsapp')?.count || 0, icon: MessageCircle, color: 'indigo' }
                ].map((s, i) => (
                    <Card key={i} className={`border-none shadow-sm ring-1 ring-slate-200 border-l-4 border-l-${s.color}-500 bg-white`}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={`p-2 bg-${s.color}-500/10 rounded-lg`}><s.icon className={`h-5 w-5 text-${s.color}-600`} /></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                                <h3 className="text-xl font-bold text-slate-800 tracking-tight">{s.value.toLocaleString()}</h3>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Comprehensive Filter Bar */}
            <Card className="border-none shadow-sm ring-1 ring-slate-200 bg-white">
                <CardContent className="flex flex-wrap items-center gap-4 py-4 px-6">
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[150px] h-9 text-xs font-semibold bg-slate-50 border-slate-200", !startDate && "text-slate-400")}>
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                    {startDate ? format(startDate, "dd MMM yyyy") : "From Date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus /></PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[150px] h-9 text-xs font-semibold bg-slate-50 border-slate-200", !endDate && "text-slate-400")}>
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                                    {endDate ? format(endDate, "dd MMM yyyy") : "To Date"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus /></PopoverContent>
                        </Popover>
                    </div>
                    <Select value={channelFilter} onValueChange={setChannelFilter}>
                        <SelectTrigger className="w-[130px] h-9 text-xs font-semibold bg-slate-50 border-slate-200"><SelectValue placeholder="Channel" /></SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                            <SelectItem value="all">All Channels</SelectItem>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="rcs">RCS</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex-1 max-w-sm relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input placeholder="Search logs..." className="pl-9 h-9 text-xs font-medium bg-slate-50 border-slate-200" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'reseller') && (
                        <Select value={targetUserId} onValueChange={setTargetUserId}>
                            <SelectTrigger className="w-[180px] h-9 text-xs font-semibold bg-white border-primary/30 ring-1 ring-primary/10 shadow-sm"><SelectValue placeholder="User Filtration" /></SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 shadow-2xl">
                                <SelectItem value="all" className="font-bold text-primary italic">SYSTEM OVERVIEW</SelectItem>
                                {users.map(u => <SelectItem key={u.id} value={u.id.toString()} className="font-medium">{u.company || u.username}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            {/* Smart Tabs Section */}
            <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="flex-1 space-y-4">
                <div className="sticky top-0 z-40 bg-slate-50/20 backdrop-blur-md pb-2">
                    <TabsList className="bg-slate-200/60 p-1 rounded-xl h-12 border border-slate-200 w-fit shadow-inner">
                        {['summary', 'detailed', 'engagement', 'api'].map(t => (
                            <TabsTrigger key={t} value={t} className="px-6 font-bold text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg rounded-lg transition-all duration-300">
                                {t === 'detailed' ? 'Detailed Reports' : t === 'summary' ? 'Summary Report' : t === 'engagement' ? 'Click Reports' : 'API Logs'}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>

                {/* Summary View Content */}
                <TabsContent value="summary" className="m-0 outline-none">
                    <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 bg-white overflow-hidden">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 border-b">
                                    <TableRow>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-6 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Campaign Name</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 text-center text-[11px] font-bold text-slate-500 uppercase">Channel</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 text-center text-[11px] font-bold text-slate-500 uppercase">Template</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 text-center text-[11px] font-bold text-slate-500 uppercase">Date</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 text-center text-[11px] font-bold text-slate-800 uppercase">Total</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 text-center text-[11px] font-bold text-indigo-600 uppercase">Sent</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 text-center text-[11px] font-bold text-emerald-600 uppercase">Deliv</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 text-center text-[11px] font-bold text-purple-600 uppercase">Read</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 text-center text-[11px] font-bold text-rose-600 uppercase">Failed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? <TableRow><TableCell colSpan={9} className="text-center py-24 text-xs font-bold text-slate-400 animate-pulse">SYNCHRONIZING ANALYTICS...</TableCell></TableRow> :
                                     reports.map((r: any) => (
                                        <TableRow key={r.id} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors h-14">
                                            <TableCell className="py-4 px-6 font-semibold text-slate-700 text-xs">{r.name || 'Auto-Campaign'}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge className={cn("text-[9px] uppercase font-black px-2.5 py-0.5 rounded-full shadow-sm", getChannelStyles(r.channel))}>
                                                    {r.channel || 'RCS'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-center text-[11px] font-bold text-slate-400">{r.template_name || '-'}</TableCell>
                                            <TableCell className="text-center text-[11px] font-bold text-slate-600">{format(new Date(r.created_at), 'dd MMM yy')}</TableCell>
                                            <TableCell className="text-center font-bold text-xs text-slate-900 leading-none">{(r.recipient_count || r.total_recipient || 0).toLocaleString()}</TableCell>
                                            <TableCell className="text-center font-bold text-indigo-600 text-xs leading-none">{r.sent_count?.toLocaleString()}</TableCell>
                                            <TableCell className="text-center font-bold text-emerald-600 text-xs leading-none">{r.delivered_count?.toLocaleString()}</TableCell>
                                            <TableCell className="text-center font-bold text-purple-600 text-xs leading-none">{r.read_count?.toLocaleString()}</TableCell>
                                            <TableCell className="text-center font-bold text-rose-600 text-xs leading-none">{r.failed_count?.toLocaleString()}</TableCell>
                                        </TableRow>
                                     ))}
                                </TableBody>
                            </Table>
                        </div>
                        {renderPagination(summaryPage, summaryTotal, setSummaryPage)}
                    </Card>
                </TabsContent>

                {/* Detailed Logs Content */}
                {(activeTab === 'detailed' || activeTab === 'api') && (
                    <TabsContent value={activeTab} className="m-0 outline-none">
                        <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 bg-white overflow-hidden">
                          <CardContent className="p-0">
                            <div className="overflow-x-auto max-h-[75vh]">
                                <Table>
                                    <TableHeader className="bg-slate-50 border-b">
                                        <TableRow>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 font-bold text-slate-800 border-r py-5 px-6 text-[11px] uppercase shadow-sm">ID</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 text-center border-r shadow-sm">RTime</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 text-center border-r shadow-sm">Mobile</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 text-center border-r shadow-sm">Channel</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 text-center border-r shadow-sm">Send</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-emerald-600 uppercase tracking-widest py-4 text-center border-r shadow-sm">Deliv</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-purple-600 uppercase tracking-widest py-4 text-center border-r shadow-sm">Read</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 text-center border-r shadow-sm w-[150px]">Template</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 text-left pl-8 shadow-sm min-w-[380px]">Message Content</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-slate-500 uppercase tracking-widest py-4 text-center border-r shadow-sm">Status</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-bold text-rose-500 uppercase tracking-widest py-4 text-center shadow-sm min-w-[160px]">Reason</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingLogs ? <TableRow><TableCell colSpan={11} className="text-center py-28 text-xs font-black text-slate-300 tracking-widest">PULLING LIVE STREAM...</TableCell></TableRow> :
                                         webhookLogs.map((l) => (
                                            <TableRow key={l.id} className="hover:bg-slate-50/60 border-b border-slate-100 transition-all duration-200">
                                                <TableCell className="text-[10px] font-black text-slate-400 border-r px-6 py-4">{l.id}</TableCell>
                                                <TableCell className="text-center text-[10px] font-bold text-slate-500 border-r">
                                                    <div className="flex flex-col font-black">{format(new Date(l.created_at), 'dd MMM')}<span className="text-[9px] opacity-60 font-medium">{format(new Date(l.created_at), 'HH:mm')}</span></div>
                                                </TableCell>
                                                <TableCell className="text-center text-[11px] font-black text-slate-800 border-r">{l.recipient?.replace(/^\+/, '')}</TableCell>
                                                <TableCell className="text-center border-r">
                                                    <Badge className={cn("text-[8px] font-black uppercase px-2 py-0 h-4 border-none rounded-full", getChannelStyles(l.channel || l.campaign_channel))}>
                                                        {l.channel || 'rcs'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center text-[10px] font-bold text-slate-500 border-r">{l.send_time ? format(new Date(l.send_time), 'HH:mm') : '-'}</TableCell>
                                                <TableCell className="text-center text-[10px] font-black text-emerald-600 border-r">{l.delivery_time ? format(new Date(l.delivery_time), 'HH:mm') : '-'}</TableCell>
                                                <TableCell className="text-center text-[10px] font-black text-purple-600 border-r">{l.read_time ? format(new Date(l.read_time), 'HH:mm') : '-'}</TableCell>
                                                <TableCell className="text-center text-[10px] font-bold text-slate-400 border-r truncate max-w-[140px] px-3">{l.template_name || '-'}</TableCell>
                                                <TableCell className="py-4 pl-8 text-[11px] text-slate-600 font-medium leading-relaxed max-w-[400px]">
                                                    <div className="line-clamp-2 hover:line-clamp-none transition-all cursor-text">{l.message_content || '-'}</div>
                                                </TableCell>
                                                <TableCell className="text-center border-r">
                                                    <Badge variant="outline" className={cn("text-[8px] font-black border-none rounded-md px-1.5 h-5 uppercase shadow-sm", getStatusColor(l.status))}>{l.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-center text-[10px] font-black text-rose-500 px-5 italic opacity-80">
                                                    <div className="line-clamp-1 hover:line-clamp-none transition-all cursor-default">{l.failure_reason || '-'}</div>
                                                </TableCell>
                                            </TableRow>
                                         ))}
                                    </TableBody>
                                </Table>
                            </div>
                            {renderPagination(activeTab === 'api' ? apiPage : detailedPage, activeTab === 'api' ? apiTotal : detailedTotal, activeTab === 'api' ? setApiPage : setDetailedPage)}
                          </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Engagement Tab Content */}
                <TabsContent value="engagement" className="m-0 outline-none">
                    <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 bg-white overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50 border-b">
                                <TableRow>
                                    <TableHead className="sticky top-0 bg-slate-50 z-20 py-5 px-8 text-[10px] font-bold uppercase text-slate-500 tracking-widest">Type</TableHead>
                                    <TableHead className="sticky top-0 bg-slate-50 z-20 py-5 px-6 text-[10px] font-bold uppercase text-slate-500 text-center tracking-widest">Mobile</TableHead>
                                    <TableHead className="sticky top-0 bg-slate-50 z-20 py-5 px-6 text-[10px] font-bold uppercase text-slate-500 text-center tracking-widest">Campaign</TableHead>
                                    <TableHead className="sticky top-0 bg-slate-50 z-20 py-5 px-6 text-[10px] font-bold uppercase text-slate-500 tracking-widest">URL / Destination</TableHead>
                                    <TableHead className="sticky top-0 bg-slate-50 z-20 py-5 px-8 text-[10px] font-bold uppercase text-slate-500 text-right tracking-widest">Time</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingEngagement ? <TableRow><TableCell colSpan={5} className="text-center py-28 text-xs font-bold text-slate-300">ANALYZING CLICKSTREAMS...</TableCell></TableRow> :
                                 engagementReports.map((e, idx) => (
                                    <TableRow key={idx} className="hover:bg-slate-50/60 border-b border-slate-100 transition-colors h-14">
                                        <TableCell className="py-4 px-8"><Badge className="bg-blue-600 text-white border-none rounded px-2.5 font-black text-[8px] uppercase shadow-sm tracking-tighter">{e.type}</Badge></TableCell>
                                        <TableCell className="text-center font-black text-[11px] text-slate-800 tracking-tight">{e.msisdn?.replace(/^\+/, '')}</TableCell>
                                        <TableCell className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{e.campaign_name}</TableCell>
                                        <TableCell className="text-[11px] font-bold text-slate-600 truncate max-w-[350px] px-3">{e.interaction}</TableCell>
                                        <TableCell className="text-right text-[10px] font-black text-slate-500 italic px-8">{format(new Date(e.timestamp), 'dd MMM HH:mm')}</TableCell>
                                    </TableRow>
                                 ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
