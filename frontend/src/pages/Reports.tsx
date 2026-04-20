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
    source?: string;
    total_recipient?: number;
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
    
    // Read from URL
    const activeTab = searchParams.get('tab') || 'summary';
    const setActiveTab = (tab: string) => {
        setSearchParams({ tab });
    };
    
    const [autoRefresh] = useState(true);

    useEffect(() => {
        setSummaryPage(1);
        fetchReports(1);
    }, [startDate, endDate, statusFilter, channelFilter]);

    useEffect(() => {
        setDetailedPage(1);
        if (activeTab === 'detailed' || activeTab === 'api') {
            fetchWebhookLogs(1, activeTab);
        }
    }, [startDate, endDate, channelFilter]);

    useEffect(() => {
        if (activeTab === 'summary') {
            fetchReports(summaryPage);
        }
    }, [summaryPage]);

    useEffect(() => {
        if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'reseller') {
            fetchUsers();
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setUsers(data.clients || data.users || []);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    useEffect(() => {
        if (activeTab === 'detailed') {
            fetchWebhookLogs(detailedPage, 'detailed');
        } else if (activeTab === 'api') {
            fetchWebhookLogs(apiPage, 'api');
        } else if (activeTab === 'engagement') {
            fetchEngagementReports(engagementPage);
        }
    }, [detailedPage, apiPage, engagementPage, targetUserId]);

    const fetchReports = async (page: number = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/rcs/reports?page=${page}&limit=${ITEMS_PER_PAGE}&`;

            if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
            if (statusFilter !== 'all') url += `status=${statusFilter}&`;
            if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
            if (targetUserId !== 'all') url += `userId=${targetUserId}&`;

            if (activeTab === 'summary' || activeTab === 'detailed') url += `source=manual&`;
            if (activeTab === 'api') url += `source=api&`;

            if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();
            if (data.success) {
                setReports(data.reports);
                setSummaryTotal(data.pagination?.total || 0);
            }
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWebhookLogs = async (page: number = 1, currentTab: string = activeTab) => {
        setLoadingLogs(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/webhooks/message-logs?page=${page}&limit=${ITEMS_PER_PAGE}&`;
            if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
            if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
            if (targetUserId !== 'all') url += `userId=${targetUserId}&`;

            if (currentTab === 'api') {
                url += `source=api&`;
            } else {
                url += `source=manual&`;
            }

            if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setWebhookLogs(data.data);
                if (currentTab === 'api') {
                    setApiTotal(data.pagination?.total || 0);
                } else {
                    setDetailedTotal(data.pagination?.total || 0);
                }
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoadingLogs(false);
        }
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
            if (data.success) {
                setSummaryStats(data.summary);
            }
        } catch (error) {
            console.error('Error fetching summary stats:', error);
        }
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
        } catch (error) {
            console.error('Error fetching engagement:', error);
        } finally {
            setLoadingEngagement(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'summary') {
            fetchReports(summaryPage);
            fetchSummaryStats();
        }
        if (activeTab === 'detailed') fetchWebhookLogs(detailedPage, 'detailed');
        if (activeTab === 'api') fetchWebhookLogs(apiPage, 'api');
        if (activeTab === 'engagement') fetchEngagementReports(engagementPage);
    }, [activeTab, startDate, endDate, searchQuery, targetUserId]);

    const handleRefresh = () => {
        if (activeTab === 'summary') fetchReports(summaryPage);
        if (activeTab === 'detailed') fetchWebhookLogs(detailedPage, 'detailed');
        if (activeTab === 'api') fetchWebhookLogs(apiPage, 'api');
        if (activeTab === 'engagement') fetchEngagementReports(engagementPage);
    };

    const handleExport = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('authToken');
            let exportData: any[] = [];
            let fileName = '';
            let headers: string[] = [];
            let rows: any[] = [];

            if (activeTab === 'summary') {
                let url = `${API_BASE_URL}/api/rcs/reports?export=true&`;
                if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
                if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
                if (statusFilter !== 'all') url += `status=${statusFilter}&`;
                if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
                if (targetUserId !== 'all') url += `userId=${targetUserId}&`;
                url += `source=manual&`;
                if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.success) {
                    exportData = data.reports;
                    fileName = `rcs_summary_${format(new Date(), 'yyyyMMdd')}.csv`;
                    headers = ['Campaign Name', 'Channel', 'Template', 'Date', 'Total', 'Sent', 'Delivered', 'Read', 'Failed'];
                    rows = exportData.map(r => [
                        `"${r.name}"`,
                        `"${r.channel || 'RCS'}"`,
                        `"${r.template_id}"`,
                        format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
                        r.recipient_count || r.total_recipient || 0,
                        r.sent_count,
                        r.delivered_count,
                        r.read_count,
                        r.failed_count
                    ]);
                }
            } else if (activeTab === 'detailed' || activeTab === 'api') {
                let url = `${API_BASE_URL}/api/webhooks/message-logs?export=true&`;
                if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
                if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
                if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
                if (targetUserId !== 'all') url += `userId=${targetUserId}&`;
                url += `source=${activeTab === 'api' ? 'api' : 'manual'}&`;
                if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.success) {
                    exportData = data.data;
                    fileName = `${activeTab}_report_${format(new Date(), 'yyyyMMdd')}.csv`;
                    headers = ['Id', 'Rtime', 'Mobile', 'sendTime', 'DelTime', 'ReadTime', 'Template', 'Message', 'Campaign', 'Status', 'Reason'];
                    rows = exportData.map(l => [
                        l.id,
                        l.created_at ? format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss') : '-',
                        l.recipient,
                        l.send_time ? format(new Date(l.send_time), 'HH:mm:ss') : '-',
                        l.delivery_time ? format(new Date(l.delivery_time), 'HH:mm:ss') : '-',
                        l.read_time ? format(new Date(l.read_time), 'HH:mm:ss') : '-',
                        `"${l.template_name || ''}"`,
                        `"${(l.message_content || '').replace(/"/g, '""')}"`,
                        `"${l.campaign_name || ''}"`,
                        l.status,
                        `"${l.failure_reason || ''}"`
                    ]);
                }
            }

            if (rows.length > 0) {
                const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                downloadCsv(csvContent, fileName);
            }
        } catch (err) {
            console.error('Export failed', err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'sent': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'delivered': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'read': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'failed': return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'replied': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            default: return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const renderPagination = (currentPage: number, totalItems: number, onPageChange: (page: number) => void) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;

        return (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="h-8 px-2 font-bold shadow-sm">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Badge variant="secondary" className="h-8 px-3 font-black bg-white border shadow-sm">
                        Page {currentPage} of {totalPages}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="h-8 px-2 font-bold shadow-sm">
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col space-y-6 p-4 md:p-8 bg-slate-50/50">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="px-1">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" /> Campaign Performance
                    </h1>
                    <p className="text-sm text-slate-500 font-medium">Real-time message intelligence and delivery tracking</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9 px-4 font-bold shadow-sm bg-white">
                        Refresh
                    </Button>
                    <Button variant="default" size="sm" onClick={handleExport} className="h-9 gap-2 shadow-md font-bold">
                        <Download className="h-4 w-4" /> Export Data
                    </Button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 border-l-4 border-l-blue-500 bg-white">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2.5 bg-blue-500/10 rounded-xl"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Volume</p>
                        <h3 className="text-xl font-black text-slate-800">{summaryTotal.toLocaleString()}</h3>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 border-l-4 border-l-emerald-500 bg-white">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2.5 bg-emerald-500/10 rounded-xl"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivered</p>
                        <h3 className="text-xl font-black text-slate-800">
                           {reports.reduce((acc, r) => acc + (r.delivered_count || 0), 0).toLocaleString()}
                        </h3>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 border-l-4 border-l-rose-500 bg-white">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2.5 bg-rose-500/10 rounded-xl"><XCircle className="h-5 w-5 text-rose-600" /></div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Failed</p>
                        <h3 className="text-xl font-black text-slate-800">
                           {reports.reduce((acc, r) => acc + (r.failed_count || 0), 0).toLocaleString()}
                        </h3>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 border-l-4 border-l-indigo-500 bg-white">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2.5 bg-indigo-500/10 rounded-xl"><MessageCircle className="h-5 w-5 text-indigo-600" /></div>
                     <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Replies</p>
                        <h3 className="text-xl font-black text-slate-800">
                           {summaryStats?.byResponse?.find((r: any) => r.label === 'whatsapp')?.count || 0}
                        </h3>
                     </div>
                  </CardContent>
               </Card>
            </div>

            {/* Filter Suite */}
            <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 bg-white overflow-visible">
                <CardContent className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[160px] h-9 justify-start text-left font-bold text-xs bg-slate-50 border-slate-200 shadow-none", !startDate && "text-slate-400")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "dd MMM yyyy") : <span>From</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className={cn("w-[160px] h-9 justify-start text-left font-bold text-xs bg-slate-50 border-slate-200 shadow-none", !endDate && "text-slate-400")}>
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "dd MMM yyyy") : <span>To</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Select value={channelFilter} onValueChange={setChannelFilter}>
                        <SelectTrigger className="w-[140px] h-9 text-xs font-bold bg-slate-50 border-slate-200 shadow-none">
                            <SelectValue placeholder="Channels" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200 drop-shadow-2xl">
                            <SelectItem value="all" className="font-bold">All Channels</SelectItem>
                            <SelectItem value="whatsapp" className="font-bold text-emerald-600">WhatsApp</SelectItem>
                            <SelectItem value="rcs" className="font-bold text-blue-600">RCS</SelectItem>
                            <SelectItem value="sms" className="font-bold text-amber-600">SMS</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="flex-1 max-w-sm relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search mobile or campaign..."
                            className="pl-9 h-9 text-xs font-bold bg-slate-50 border-slate-200 placeholder:text-slate-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'reseller') && (
                        <div className="flex items-center gap-2 ml-auto">
                            <Label className="text-[10px] font-black text-slate-400 uppercase">View As:</Label>
                            <Select value={targetUserId} onValueChange={setTargetUserId}>
                                <SelectTrigger className="w-[180px] h-9 text-xs font-bold border-slate-200 bg-white ring-1 ring-primary/10">
                                    <SelectValue placeholder="All Users" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200">
                                    <SelectItem value="all" className="font-black italic">GLOBAL ADMIN VIEW</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id.toString()} className="font-medium text-xs">
                                            {u.company || u.username || u.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Reports Tabs Section */}
            <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="flex-1 space-y-4">
                <TabsList className="bg-slate-200/50 p-1 rounded-xl w-fit h-11 border border-slate-200 shadow-sm">
                    <TabsTrigger value="summary" className="px-6 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-300">Summary Report</TabsTrigger>
                    <TabsTrigger value="detailed" className="px-6 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-300">Detailed Reports</TabsTrigger>
                    <TabsTrigger value="engagement" className="px-6 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-300">Click Reports</TabsTrigger>
                    <TabsTrigger value="api" className="px-6 font-black text-[10px] uppercase tracking-tighter data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg transition-all duration-300">API Logs</TabsTrigger>
                </TabsList>

                {/* Summary Tab Content */}
                <TabsContent value="summary" className="m-0">
                    <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 bg-white overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto max-h-[75vh] overflow-y-auto relative">
                                <Table className="border-collapse">
                                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                                        <TableRow className="h-12">
                                            <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-6 text-[11px] uppercase font-black text-slate-500 tracking-wider w-[250px]">Campaign Name</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-4 text-center text-[11px] uppercase font-black text-slate-500 tracking-wider">Channel</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-4 text-center text-[11px] uppercase font-black text-slate-500 tracking-wider">Template</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-4 text-center text-[11px] uppercase font-black text-slate-500 tracking-wider">Date</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-3 text-center text-[11px] uppercase font-black text-slate-800 tracking-wider">Total</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-3 text-center text-[11px] uppercase font-black text-indigo-600 tracking-wider">Sent</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-3 text-center text-[11px] uppercase font-black text-emerald-600 tracking-wider">Deliv.</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-3 text-center text-[11px] uppercase font-black text-purple-600 tracking-wider">Read</TableHead>
                                            <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-3 text-center text-[11px] uppercase font-black text-rose-600 tracking-wider">Failed</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={9} className="text-center py-20 font-black text-slate-300 tracking-widest text-xs">ANALYZING BIG DATA...</TableCell></TableRow>
                                        ) : reports.length === 0 ? (
                                            <TableRow><TableCell colSpan={9} className="text-center py-20 font-black text-slate-300 uppercase tracking-widest text-xs">No analytics meta-data found</TableCell></TableRow>
                                        ) : (
                                            reports.map((camp: any) => (
                                                <TableRow key={camp.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                                                    <TableCell className="py-4 px-6">
                                                        <div className="flex flex-col gap-0.5">
                                                            <p className="font-bold text-slate-800 text-[13px]">{camp.name || 'Untitled'}</p>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{camp.source || 'Manual'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4 px-4 text-center">
                                                        <Badge variant="outline" className={cn("text-[9px] px-2 py-0 h-5 border-none font-black uppercase rounded-lg", 
                                                            camp.channel === 'whatsapp' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>
                                                            {camp.channel || 'RCS'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="py-4 px-4 text-center text-[11px] text-slate-500 font-bold truncate max-w-[150px]">{camp.template_name || camp.template_id}</TableCell>
                                                    <TableCell className="py-4 px-4 text-center font-bold text-slate-700 text-[11px]">
                                                        {format(new Date(camp.created_at), 'dd MMM yy')}
                                                    </TableCell>
                                                    <TableCell className="py-4 px-3 text-center font-black text-slate-800 text-xs">{(camp.recipient_count || camp.total_recipient || 0).toLocaleString()}</TableCell>
                                                    <TableCell className="py-4 px-3 text-center font-black text-indigo-600 text-xs">{camp.sent_count?.toLocaleString()}</TableCell>
                                                    <TableCell className="py-4 px-3 text-center font-black text-emerald-600 text-xs">{camp.delivered_count?.toLocaleString()}</TableCell>
                                                    <TableCell className="py-4 px-3 text-center font-black text-purple-600 text-xs">{camp.read_count?.toLocaleString()}</TableCell>
                                                    <TableCell className="py-4 px-3 text-center font-black text-rose-600 text-xs">{camp.failed_count?.toLocaleString()}</TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                            {renderPagination(summaryPage, summaryTotal, setSummaryPage)}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Detailed & API Content */}
                {(activeTab === 'detailed' || activeTab === 'api') && (
                    <TabsContent value={activeTab} className="m-0">
                        <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 bg-white overflow-hidden">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto max-h-[75vh] relative overflow-y-auto">
                                    <Table className="border-collapse">
                                        <TableHeader className="bg-slate-50 border-b border-slate-200">
                                            <TableRow className="h-12">
                                                <TableHead className="sticky top-0 bg-slate-50 z-30 w-[60px] font-black text-slate-800 border-r border-slate-100 px-3 text-[10px] uppercase shadow-sm">Id</TableHead>
                                                <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-black text-slate-500 uppercase tracking-widest py-3 text-center border-r border-slate-100 shadow-sm">Rtime</TableHead>
                                                <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-black text-slate-500 uppercase tracking-widest py-3 text-center border-r border-slate-100 shadow-sm">Mobile</TableHead>
                                                <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-black text-slate-500 uppercase tracking-widest py-3 text-center border-r border-slate-100 shadow-sm">Status</TableHead>
                                                <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-black text-slate-500 uppercase tracking-widest py-3 text-center border-r border-slate-100 shadow-sm">Send</TableHead>
                                                <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-black text-emerald-600 uppercase tracking-widest py-3 text-center border-r border-slate-100 shadow-sm">Deliv</TableHead>
                                                <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-black text-purple-600 uppercase tracking-widest py-3 text-center border-r border-slate-100 shadow-sm">Read</TableHead>
                                                <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-black text-slate-500 uppercase tracking-widest py-3 text-center border-r border-slate-100 shadow-sm">Template</TableHead>
                                                <TableHead className="sticky top-0 bg-slate-50 z-30 text-[10px] font-black text-slate-500 uppercase tracking-widest py-3 text-left pl-6 shadow-sm min-w-[300px]">Message Content</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {loadingLogs ? (
                                                <TableRow><TableCell colSpan={9} className="text-center py-20 font-black text-slate-300 tracking-widest text-xs">FETCHING LOGS...</TableCell></TableRow>
                                            ) : (
                                                webhookLogs.map((log) => (
                                                    <TableRow key={log.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 min-h-[60px]">
                                                        <TableCell className="text-[10px] font-black text-slate-400 border-r border-slate-100 px-3 py-4">{log.id}</TableCell>
                                                        <TableCell className="text-[10px] border-r border-slate-100 text-center px-3 font-bold text-slate-500">
                                                            {log.created_at ? format(new Date(log.created_at), 'dd MMM HH:mm') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-[11px] border-r border-slate-100 text-center px-3 font-black text-slate-800">
                                                            {log.recipient?.replace(/^\+/, '')}
                                                        </TableCell>
                                                        <TableCell className="text-center border-r border-slate-100 px-2">
                                                            <Badge variant="outline" className={cn("text-[9px] px-2 h-5 border-none font-black uppercase rounded-lg", getStatusColor(log.status))}>
                                                                {log.status}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell className="text-[10px] border-r border-slate-100 text-center px-2 font-bold text-slate-500">
                                                            {log.send_time ? format(new Date(log.send_time), 'HH:mm') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-[10px] border-r border-slate-100 text-center text-emerald-600 font-black px-2">
                                                            {log.delivery_time ? format(new Date(log.delivery_time), 'HH:mm') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-[10px] border-r border-slate-100 text-center text-purple-600 font-black px-2">
                                                            {log.read_time ? format(new Date(log.read_time), 'HH:mm') : '-'}
                                                        </TableCell>
                                                        <TableCell className="text-[10px] border-r border-slate-100 text-center px-3 font-bold text-slate-400 truncate max-w-[100px]" title={log.template_name}>
                                                            {log.template_name || '-'}
                                                        </TableCell>
                                                        <TableCell className="text-[11px] text-slate-600 font-medium py-3 pl-6 leading-relaxed max-w-[400px]">
                                                            <div className="line-clamp-3 hover:line-clamp-none transition-all duration-300">
                                                                {log.message_content || '-'}
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                                {renderPagination(activeTab === 'api' ? apiPage : detailedPage, activeTab === 'api' ? apiTotal : detailedTotal, activeTab === 'api' ? setApiPage : setDetailedPage)}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Engagement Tab */}
                <TabsContent value="engagement" className="m-0">
                    <Card className="rounded-xl border-none shadow-sm ring-1 ring-slate-200 bg-white overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto max-h-[75vh] overflow-y-auto relative">
                                <Table className="border-collapse">
                                <TableHeader className="bg-slate-50 border-b border-slate-200">
                                    <TableRow className="h-12">
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Type</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-6 text-[10px] font-black uppercase text-slate-500 text-center tracking-widest">Mobile</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-6 text-[10px] font-black uppercase text-slate-500 text-center tracking-widest">Campaign</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-6 text-[10px] font-black uppercase text-slate-500 tracking-widest">Details</TableHead>
                                        <TableHead className="sticky top-0 bg-slate-50 z-20 py-4 px-6 text-[10px] font-black uppercase text-slate-500 text-right tracking-widest">Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingEngagement ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-20 font-black text-slate-300 tracking-widest text-xs">ANALYZING CLICKS...</TableCell></TableRow>
                                    ) : (
                                        engagementReports.map((e, idx) => (
                                            <TableRow key={idx} className="hover:bg-slate-50/50 border-b border-slate-100 transition-colors">
                                                <TableCell className="py-4 px-6">
                                                    <Badge className={cn("text-[8px] font-black border-none uppercase shadow-none ring-1 px-2 rounded-lg", 
                                                        e.type === 'URL CLICKED' ? "bg-blue-50 text-blue-600 ring-blue-100" : "bg-emerald-50 text-emerald-600 ring-emerald-100")}>
                                                        {e.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-black text-[11px] text-slate-800 tracking-tight">{e.msisdn?.replace(/^\+/, '')}</TableCell>
                                                <TableCell className="text-center text-[10px] font-black text-slate-400 uppercase">{e.campaign_name}</TableCell>
                                                <TableCell className="text-[11px] font-bold text-slate-600 max-w-[250px] truncate">{e.interaction}</TableCell>
                                                <TableCell className="text-right text-[10px] font-black text-slate-500 italic">
                                                    {format(new Date(e.timestamp), 'dd MMM HH:mm')}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
