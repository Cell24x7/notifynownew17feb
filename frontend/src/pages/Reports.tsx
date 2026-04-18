import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, Search, ChevronLeft, ChevronRight, BarChart3, CheckCircle, XCircle, TrendingUp, ListFilter } from 'lucide-react';
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
    source?: string;
}

interface WebhookLog {
    id: number;
    recipient: string;
    status: string;
    created_at: string;
    send_time: string;
    delivery_time: string | null;
    read_time: string | null;
    template_name: string;
    message_content?: string;
    campaign_name: string;
    failure_reason: string | null;
    channel?: string;
    campaign_channel?: string;
}

interface EngagementReport {
    type: string;
    msisdn: string;
    interaction: string;
    campaign_name: string;
    timestamp: string;
}

const ITEMS_PER_PAGE = 20;

export default function Reports() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [reports, setReports] = useState<Report[]>([]);
    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
    const [apiLogs, setApiLogs] = useState<WebhookLog[]>([]);
    const [engagementReports, setEngagementReports] = useState<EngagementReport[]>([]);
    
    const [summaryTotal, setSummaryTotal] = useState(0);
    const [detailedTotal, setDetailedTotal] = useState(0);
    const [apiTotal, setApiTotal] = useState(0);
    const [engagementTotal, setEngagementTotal] = useState(0);

    const [summaryPage, setSummaryPage] = useState(1);
    const [detailedPage, setDetailedPage] = useState(1);
    const [apiPage, setApiPage] = useState(1);
    const [engagementPage, setEngagementPage] = useState(1);

    const [loading, setLoading] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [loadingApi, setLoadingApi] = useState(false);
    const [loadingEngagement, setLoadingEngagement] = useState(false);

    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [targetUserId, setTargetUserId] = useState('all');
    const [users, setUsers] = useState<any[]>([]);

    const activeTab = searchParams.get('tab') || 'summary';
    const setActiveTab = (tab: string) => setSearchParams({ tab });

    useEffect(() => {
        if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'reseller') {
            fetchUsers();
        }
    }, [user]);

    useEffect(() => {
        if (activeTab === 'summary') fetchReports(summaryPage);
        if (activeTab === 'detailed') fetchWebhookLogs(detailedPage);
        if (activeTab === 'api') fetchApiLogs(apiPage);
        if (activeTab === 'engagement') fetchEngagementReports(engagementPage);
    }, [activeTab, summaryPage, detailedPage, apiPage, engagementPage, startDate, endDate, statusFilter, channelFilter, searchQuery, targetUserId]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE_URL}/api/clients`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setUsers(data.clients || data.users || []);
        } catch (e) { console.error(e); }
    };

    const fetchReports = async (page: number) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let query = `page=${page}&limit=${ITEMS_PER_PAGE}&source=manual&`;
            if (startDate) query += `startDate=${startDate}&`;
            if (endDate) query += `endDate=${endDate}&`;
            if (statusFilter !== 'all') query += `status=${statusFilter}&`;
            if (channelFilter !== 'all') query += `channel=${channelFilter}&`;
            if (targetUserId !== 'all') query += `userId=${targetUserId}&`;
            if (searchQuery) query += `search=${encodeURIComponent(searchQuery)}&`;

            const res = await fetch(`${API_BASE_URL}/api/rcs/reports?${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setReports(data.reports);
                setSummaryTotal(data.pagination?.total || 0);
            }
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    const fetchWebhookLogs = async (page: number) => {
        setLoadingLogs(true);
        try {
            const token = localStorage.getItem('authToken');
            let query = `page=${page}&limit=${ITEMS_PER_PAGE}&source=manual&`;
            if (startDate) query += `startDate=${startDate}&`;
            if (endDate) query += `endDate=${endDate}&`;
            if (channelFilter !== 'all') query += `channel=${channelFilter}&`;
            if (targetUserId !== 'all') query += `userId=${targetUserId}&`;
            if (searchQuery) query += `search=${encodeURIComponent(searchQuery)}&`;

            const res = await fetch(`${API_BASE_URL}/api/webhooks/message-logs?${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setWebhookLogs(data.data);
                setDetailedTotal(data.pagination?.total || 0);
            }
        } catch (e) { console.error(e); } finally { setLoadingLogs(false); }
    };

    const fetchApiLogs = async (page: number) => {
        setLoadingApi(true);
        try {
            const token = localStorage.getItem('authToken');
            let query = `page=${page}&limit=${ITEMS_PER_PAGE}&source=api&`;
            if (startDate) query += `startDate=${startDate}&`;
            if (endDate) query += `endDate=${endDate}&`;
            if (targetUserId !== 'all') query += `userId=${targetUserId}&`;
            if (searchQuery) query += `search=${encodeURIComponent(searchQuery)}&`;

            const res = await fetch(`${API_BASE_URL}/api/webhooks/message-logs?${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setApiLogs(data.data);
                setApiTotal(data.pagination?.total || 0);
            }
        } catch (e) { console.error(e); } finally { setLoadingApi(false); }
    };

    const fetchEngagementReports = async (page: number) => {
        setLoadingEngagement(true);
        try {
            const token = localStorage.getItem('authToken');
            let query = `page=${page}&limit=${ITEMS_PER_PAGE}&`;
            if (startDate) query += `from=${startDate}&`;
            if (endDate) query += `to=${endDate}&`;
            if (targetUserId !== 'all') query += `userId=${targetUserId}&`;

            const res = await fetch(`${API_BASE_URL}/api/reports/engagement?${query}`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setEngagementReports(data.reports);
                setEngagementTotal(data.reports.length); 
            }
        } catch (e) { console.error(e); } finally { setLoadingEngagement(false); }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
            case 'read': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'failed': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const renderPagination = (currentPage: number, totalItems: number, onPageChange: (page: number) => void) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;
        return (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
                <div className="text-xs text-muted-foreground">Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems}</div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                    <Badge variant="outline" className="h-8">Page {currentPage} of {totalPages}</Badge>
                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col space-y-6 p-4 md:p-8 bg-background overflow-auto">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h1>
                    <p className="text-sm text-muted-foreground">Performance monitoring and engagement metrics</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => fetchReports(summaryPage)}><BarChart3 className="h-4 w-4 mr-2" /> Refresh</Button>
                    <Button variant="default" size="sm"><Download className="h-4 w-4 mr-2" /> Export</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-500" /></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Volume</p><h3 className="text-xl font-bold">{summaryTotal.toLocaleString()}</h3></div>
               </CardContent></Card>
               <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Delivered</p><h3 className="text-xl font-bold">{reports.reduce((a,b)=>a+(b.delivered_count||0),0).toLocaleString()}</h3></div>
               </CardContent></Card>
               <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg"><Search className="h-5 w-5 text-purple-500" /></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Read</p><h3 className="text-xl font-bold">{reports.reduce((a,b)=>a+(b.read_count||0),0).toLocaleString()}</h3></div>
               </CardContent></Card>
               <Card><CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 bg-rose-500/10 rounded-lg"><XCircle className="h-5 w-5 text-rose-500" /></div>
                  <div><p className="text-[10px] uppercase font-bold text-muted-foreground">Failed</p><h3 className="text-xl font-bold">{reports.reduce((a,b)=>a+(b.failed_count||0),0).toLocaleString()}</h3></div>
               </CardContent></Card>
            </div>

            <Card className="border-border shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} className="w-[150px] h-9 text-xs" />
                        <Input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} className="w-[150px] h-9 text-xs" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="delivered">Delivered</SelectItem><SelectItem value="read">Read</SelectItem><SelectItem value="failed">Failed</SelectItem></SelectContent>
                    </Select>
                    <Select value={channelFilter} onValueChange={setChannelFilter}>
                        <SelectTrigger className="w-[130px] h-9 text-xs"><SelectValue placeholder="Channel" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">All Channels</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="rcs">RCS</SelectItem><SelectItem value="sms">SMS</SelectItem></SelectContent>
                    </Select>
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Search..." value={searchQuery} onChange={(e)=>setSearchQuery(e.target.value)} className="pl-9 h-9 text-xs" />
                    </div>
                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'reseller') && (
                        <Select value={targetUserId} onValueChange={setTargetUserId}>
                            <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="View As User" /></SelectTrigger>
                            <SelectContent><SelectItem value="all">All Users</SelectItem>{users.map(u=>(<SelectItem key={u.id} value={u.id.toString()}>{u.username || u.email}</SelectItem>))}</SelectContent>
                        </Select>
                    )}
                </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
                <TabsList className="bg-muted p-1 h-11 border">
                    <TabsTrigger value="summary" className="px-6 font-bold text-xs uppercase">Summary</TabsTrigger>
                    <TabsTrigger value="detailed" className="px-6 font-bold text-xs uppercase">Detailed</TabsTrigger>
                    <TabsTrigger value="engagement" className="px-6 font-bold text-xs uppercase">Clicks</TabsTrigger>
                    <TabsTrigger value="api" className="px-6 font-bold text-xs uppercase">API Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-4"><Card className="overflow-hidden"><CardContent className="p-0">
                    <Table><TableHeader className="bg-muted/50"><TableRow>
                        <TableHead className="py-4 px-6 text-[10px] uppercase font-bold">Campaign</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Channel</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Date</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Volume</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold text-indigo-500">Sent</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold text-emerald-500">Deliv.</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold text-purple-500">Read</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold text-rose-500">Failed</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{loading ? <TableRow><TableCell colSpan={8} className="text-center py-10">Loading...</TableCell></TableRow> : reports.map(r=>(
                        <TableRow key={r.id} className="border-b transition-colors hover:bg-muted/50">
                            <TableCell className="py-4 px-6"><div className="font-bold text-sm tracking-tight">{r.name}</div><div className="text-[10px] text-muted-foreground uppercase">{r.source||'manual'}</div></TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className={cn("text-[9px] border-none font-bold", r.channel==='whatsapp'?'bg-emerald-50 text-emerald-700':'bg-blue-50 text-blue-700')}>{r.channel||'RCS'}</Badge></TableCell>
                            <TableCell className="text-center text-xs font-medium text-muted-foreground">{r.created_at ? format(new Date(r.created_at), 'dd MMM HH:mm') : '-'}</TableCell>
                            <TableCell className="text-center font-bold text-sm">{(r.recipient_count||0).toLocaleString()}</TableCell>
                            <TableCell className="text-center font-bold text-indigo-500">{(r.sent_count||0).toLocaleString()}</TableCell>
                            <TableCell className="text-center font-bold text-emerald-500">{(r.delivered_count||0).toLocaleString()}</TableCell>
                            <TableCell className="text-center font-bold text-purple-500">{(r.read_count||0).toLocaleString()}</TableCell>
                            <TableCell className="text-center font-bold text-rose-500">{(r.failed_count||0).toLocaleString()}</TableCell>
                        </TableRow>
                    ))}</TableBody></Table>
                    {renderPagination(summaryPage, summaryTotal, setSummaryPage)}
                </CardContent></Card></TabsContent>

                <TabsContent value="detailed" className="mt-4"><Card className="overflow-hidden"><CardContent className="p-0">
                    <Table><TableHeader className="bg-muted/50"><TableRow>
                        <TableHead className="py-3 px-4 text-[10px] uppercase font-bold">Time</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Mobile</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Channel</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Campaign</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Status</TableHead>
                        <TableHead className="py-3 px-4 text-[10px] uppercase font-bold text-right">Reason</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{loadingLogs ? <TableRow><TableCell colSpan={6} className="text-center py-10">Fetching...</TableCell></TableRow> : webhookLogs.map(l=>(
                        <TableRow key={l.id} className="border-b hover:bg-muted/50">
                            <TableCell className="py-3 px-4 text-xs font-medium text-muted-foreground">{l.created_at ? format(new Date(l.created_at), 'dd MMM HH:mm') : '-'}</TableCell>
                            <TableCell className="text-center font-bold text-xs">{l.recipient}</TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="text-[10px] font-bold border-none bg-muted/30 uppercase">{l.channel||l.campaign_channel||'rcs'}</Badge></TableCell>
                            <TableCell className="text-center text-[11px] font-semibold text-muted-foreground max-w-[150px] truncate">{l.campaign_name}</TableCell>
                            <TableCell className="text-center"><Badge className={cn("text-[9px] font-bold border-none", getStatusColor(l.status))}>{l.status}</Badge></TableCell>
                            <TableCell className="py-3 px-4 text-right text-[10px] font-medium text-rose-500">{l.failure_reason||'-'}</TableCell>
                        </TableRow>
                    ))}</TableBody></Table>
                    {renderPagination(detailedPage, detailedTotal, setDetailedPage)}
                </CardContent></Card></TabsContent>

                <TabsContent value="engagement" className="mt-4"><Card className="overflow-hidden"><CardContent className="p-0">
                    <Table><TableHeader className="bg-muted/50"><TableRow>
                        <TableHead className="py-4 px-6 text-[10px] uppercase font-bold">Interaction</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Mobile</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Campaign</TableHead>
                        <TableHead className="text-[10px] uppercase font-bold">Details</TableHead>
                        <TableHead className="py-4 px-6 text-right text-[10px] uppercase font-bold">Time</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{loadingEngagement ? <TableRow><TableCell colSpan={5} className="text-center py-10">Fetching...</TableCell></TableRow> : engagementReports.map((e,i)=>(
                        <TableRow key={i} className="border-b hover:bg-muted/50">
                            <TableCell className="py-4 px-6"><Badge className={cn("text-[9px] font-bold border-none uppercase", e.type==='URL CLICKED'?'bg-blue-100 text-blue-700':'bg-emerald-100 text-emerald-700')}>{e.type}</Badge></TableCell>
                            <TableCell className="text-center font-bold text-xs">{e.msisdn}</TableCell>
                            <TableCell className="text-center text-[11px] font-semibold uppercase text-muted-foreground">{e.campaign_name}</TableCell>
                            <TableCell className="text-xs font-medium text-foreground max-w-[250px] truncate" title={e.interaction}>{e.interaction}</TableCell>
                            <TableCell className="py-4 px-6 text-right text-xs text-muted-foreground font-medium">{e.timestamp ? format(new Date(e.timestamp), 'dd MMM HH:mm') : '-'}</TableCell>
                        </TableRow>
                    ))}</TableBody></Table>
                    {renderPagination(engagementPage, engagementTotal, setEngagementPage)}
                </CardContent></Card></TabsContent>

                <TabsContent value="api" className="mt-4"><Card className="overflow-hidden"><CardContent className="p-0">
                    <Table><TableHeader className="bg-muted/50"><TableRow>
                        <TableHead className="py-3 px-4 text-[10px] uppercase font-bold text-left">Request Time</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Mobile</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Template</TableHead>
                        <TableHead className="text-center text-[10px] uppercase font-bold">Status</TableHead>
                        <TableHead className="py-3 px-4 text-right text-[10px] uppercase font-bold">Campaign</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{loadingApi ? <TableRow><TableCell colSpan={5} className="text-center py-10">Fetching...</TableCell></TableRow> : apiLogs.map(l=>(
                        <TableRow key={l.id} className="border-b hover:bg-muted/50">
                            <TableCell className="py-3 px-4 text-xs font-medium text-muted-foreground">{l.created_at ? format(new Date(l.created_at), 'dd MMM HH:mm') : '-'}</TableCell>
                            <TableCell className="text-center font-bold text-xs">{l.recipient}</TableCell>
                            <TableCell className="text-center text-xs font-semibold text-muted-foreground">{l.template_name}</TableCell>
                            <TableCell className="text-center"><Badge className={cn("text-[10px] font-bold border-none uppercase", getStatusColor(l.status))}>{l.status}</Badge></TableCell>
                            <TableCell className="py-3 px-4 text-right text-[10px] font-bold text-foreground truncate max-w-[120px]">{l.campaign_name}</TableCell>
                        </TableRow>
                    ))}</TableBody></Table>
                    {renderPagination(apiPage, apiTotal, setApiPage)}
                </CardContent></Card></TabsContent>
            </Tabs>
        </div>
    );
}
