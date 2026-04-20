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
    
    const [autoRefresh] = useState(true); // Mandatory auto-refresh

    useEffect(() => {
        setSummaryPage(1); // Reset page on filter change
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

            // If in summary, only show manual campaigns. If in API tab, show API campaigns.
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
                setEngagementTotal(data.reports.length); // Assuming limit for now
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

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (autoRefresh) {
            interval = setInterval(() => {
                handleRefresh();
            }, 30000); // Refresh every 30 seconds
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [autoRefresh, activeTab, summaryPage, detailedPage]);

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

    const handleRefresh = () => {
        if (activeTab === 'summary') fetchReports(summaryPage);
        if (activeTab === 'detailed') fetchWebhookLogs(detailedPage, 'detailed');
        if (activeTab === 'api') fetchWebhookLogs(apiPage, 'api');
    };

    const filteredReports = reports;

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
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                    Showing <span className="font-medium">{((currentPage - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="h-8 px-2"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <div className="flex items-center gap-1">
                        <Badge variant="outline" className="h-8 px-3 font-bold bg-white">
                            Page {currentPage} of {totalPages}
                        </Badge>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="h-8 px-2"
                    >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col space-y-6 p-4 md:p-8 bg-background">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="px-1">
                    <h1 className="text-2xl font-semibold text-foreground tracking-tight">Campaign Analytics</h1>
                    <p className="text-sm text-muted-foreground mt-1">Real-time performance and delivery intelligence</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="h-9 px-4">
                      Refresh Data
                    </Button>
                    <Button variant="default" size="sm" onClick={handleExport} className="h-9 gap-2 shadow-md">
                        <Download className="h-4 w-4" />
                        Export Data
                    </Button>
                </div>
            </div>

            {/* Top Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <Card className="rounded-xl border-border/50 shadow-sm border-l-4 border-l-blue-500 bg-card">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2 bg-blue-500/10 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-500" /></div>
                     <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase">Total Volume</p>
                        <h3 className="text-xl font-black text-foreground">{summaryTotal.toLocaleString()}</h3>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-xl border-border/50 shadow-sm border-l-4 border-l-emerald-500 bg-card">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2 bg-emerald-500/10 rounded-lg"><CheckCircle className="h-5 w-5 text-emerald-500" /></div>
                     <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase">Delivered</p>
                        <h3 className="text-xl font-black text-foreground">
                           {reports.reduce((acc, r) => acc + (r.delivered_count || 0), 0).toLocaleString()}
                        </h3>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-xl border-border/50 shadow-sm border-l-4 border-l-rose-500 bg-card">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2 bg-rose-500/10 rounded-lg"><XCircle className="h-5 w-5 text-rose-500" /></div>
                     <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase">Failed</p>
                        <h3 className="text-xl font-black text-foreground">
                           {reports.reduce((acc, r) => acc + (r.failed_count || 0), 0).toLocaleString()}
                        </h3>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-xl border-border/50 shadow-sm border-l-4 border-l-indigo-500 bg-card">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2 bg-indigo-500/10 rounded-lg"><MessageCircle className="h-5 w-5 text-indigo-500" /></div>
                     <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase">WhatsApp Replies</p>
                        <h3 className="text-xl font-black text-foreground">
                           {summaryStats?.byResponse?.find((r: any) => r.label === 'whatsapp')?.count || 0}
                        </h3>
                     </div>
                  </CardContent>
               </Card>
            </div>

            <Card className="rounded-xl border-border shadow-sm bg-card overflow-hidden">
                <CardHeader className="py-2.5 px-6 border-b bg-muted/30">
                    <CardTitle className="text-[11px] font-black text-muted-foreground uppercase flex items-center gap-2">
                      <ListFilter className="h-3 w-3" /> Search & Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[180px] h-9 justify-start text-left font-semibold text-xs bg-muted/20 border-border",
                                        !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "dd MMM yyyy") : <span>Start Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[180px] h-9 justify-start text-left font-semibold text-xs bg-muted/20 border-border",
                                        !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "dd MMM yyyy") : <span>End Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        {(startDate || endDate) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
                                className="text-rose-500 font-bold text-[10px] h-8 px-2 hover:bg-rose-50"
                            >
                                Reset
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={channelFilter} onValueChange={setChannelFilter}>
                            <SelectTrigger className="w-[150px] h-9 text-xs font-semibold bg-muted/20 border-border">
                                <SelectValue placeholder="All Channels" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="all">All Channels</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="rcs">RCS</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 max-w-sm relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Search mobile, campaign..."
                            className="pl-9 h-9 text-xs font-semibold bg-muted/20 border-border placeholder:text-muted-foreground/40"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'reseller') && (
                        <div className="flex items-center gap-2 ml-auto">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase">View As:</Label>
                            <Select value={targetUserId} onValueChange={setTargetUserId}>
                                <SelectTrigger className="w-[180px] h-9 text-xs font-semibold border-border bg-muted/10 shadow-sm">
                                    <SelectValue placeholder={user?.role === 'reseller' ? 'All My Clients' : 'All Users'} />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border text-foreground">
                                    <SelectItem value="all">{user?.role === 'reseller' ? 'All My Clients' : 'All Users (Admin)'}</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={u.id.toString()}>
                                            {u.company || u.username || u.email}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col pt-2">
                <TabsList className="bg-muted p-1 rounded-xl w-fit h-11 mb-2 border border-border/50">
                    <TabsTrigger value="summary" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-6 font-bold text-xs uppercase tracking-wider">Summary Report</TabsTrigger>
                    <TabsTrigger value="detailed" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-6 font-bold text-xs uppercase tracking-wider">Detailed Reports</TabsTrigger>
                    <TabsTrigger value="engagement" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-6 font-bold text-xs uppercase tracking-wider">Click Reports</TabsTrigger>
                    <TabsTrigger value="api" className="data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm rounded-lg px-6 font-bold text-xs uppercase tracking-wider">API Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="flex-1 flex flex-col space-y-4 pt-4 overflow-hidden">
                    <Card className="flex-1 border border-border shadow-md rounded-xl bg-card overflow-hidden flex flex-col">
                        <CardContent className="p-0 flex-1 overflow-auto">
                            <Table>
                                <TableHeader className="bg-muted/50 border-b border-border">
                                    <TableRow className="hover:bg-transparent h-12">
                                            <TableHead className="sticky top-0 bg-white z-[100] py-4 px-6 text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Campaign Name</TableHead>
                                            <TableHead className="sticky top-0 bg-white z-[100] py-4 px-4 text-center text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Channel</TableHead>
                                            <TableHead className="sticky top-0 bg-white z-[100] py-4 px-4 text-center text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Template</TableHead>
                                            <TableHead className="sticky top-0 bg-white z-[100] py-4 px-4 text-center text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Date</TableHead>
                                            <TableHead className="sticky top-0 bg-white z-[100] py-4 px-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground font-semibold border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Total</TableHead>
                                            <TableHead className="sticky top-0 bg-white z-[100] py-4 px-3 text-center text-[11px] uppercase tracking-wider text-indigo-400 font-semibold border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Sent</TableHead>
                                            <TableHead className="sticky top-0 bg-white z-[100] py-4 px-3 text-center text-[11px] uppercase tracking-wider text-emerald-400 font-semibold border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Deliv.</TableHead>
                                            <TableHead className="sticky top-0 bg-white z-[100] py-4 px-3 text-center text-[11px] uppercase tracking-wider text-purple-400 font-semibold border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Read</TableHead>
                                            <TableHead className="sticky top-0 bg-white z-[100] py-4 px-3 text-center text-[11px] uppercase tracking-wider text-rose-400 font-semibold border-b border-border shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">Failed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={9} className="text-center py-10">Loading reports...</TableCell></TableRow>
                                    ) : filteredReports.length === 0 ? (
                                        <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-400 font-medium">No reports found.</TableCell></TableRow>
                                    ) : (
                                        filteredReports.map((camp: any) => (
                                            <TableRow key={camp.id} className="hover:bg-muted/50 transition-colors border-b border-border">
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <p className="font-semibold text-foreground text-[13px]">{camp.name || 'Untitled'}</p>
                                                            <span className="text-[10px] text-muted-foreground font-medium">{camp.source === 'api' ? 'API' : 'Manual'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 rounded uppercase font-semibold border-none", 
                                                            camp.channel === 'whatsapp' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>
                                                            {camp.channel || 'RCS'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-4 text-center text-[11px] text-muted-foreground font-medium">{camp.template_name}</td>
                                                    <td className="py-4 px-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[11px] font-semibold text-foreground">{format(new Date(camp.created_at), 'dd MMM yy')}</span>
                                                            <span className="text-[10px] text-muted-foreground">{format(new Date(camp.created_at), 'HH:mm')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-3 text-center font-bold text-foreground text-xs">{(camp.recipient_count || camp.total_recipient || 0).toLocaleString()}</td>
                                                    <td className="py-4 px-3 text-center font-semibold text-indigo-400 text-xs">{camp.sent_count?.toLocaleString()}</td>
                                                    <td className="py-4 px-3 text-center font-semibold text-emerald-400 text-xs">{camp.delivered_count?.toLocaleString()}</td>
                                                    <td className="py-4 px-3 text-center font-semibold text-purple-400 text-xs">{camp.read_count?.toLocaleString()}</td>
                                                    <td className="py-4 px-3 text-center font-semibold text-rose-400 text-xs">{camp.failed_count?.toLocaleString()}</td>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {renderPagination(summaryPage, summaryTotal, setSummaryPage)}
                        </CardContent>
                    </Card>
                </TabsContent>


                {(activeTab === 'detailed' || activeTab === 'api') && (
                    <TabsContent value={activeTab} className="flex-1 mt-4 overflow-hidden">
                        <Card className="border-none shadow-sm flex flex-col h-[calc(100vh-280px)] overflow-hidden bg-card">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <div className="space-y-1">
                                    <CardTitle className="text-xl font-bold">{activeTab === 'api' ? 'API Delivery Logs' : 'Detailed Delivery Reports'}</CardTitle>
                                    <CardDescription>{activeTab === 'api' ? 'Logs for campaigns triggered via API' : 'Consolidated status for every recipient'}</CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-mono text-blue-600 bg-blue-50 border-blue-100 uppercase">
                                        Total Messages: {webhookLogs.length}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0 flex-1 overflow-auto">
                                <Table className="border border-border">
                                        <TableHeader className="sticky top-0 bg-white z-[999] shadow-md">
                                            <TableRow className="bg-white hover:bg-white h-12">
                                                <TableHead className="sticky top-0 bg-white z-[999] w-[60px] font-semibold text-foreground border-r border-b border-border px-3 text-[10px] uppercase tracking-wider">Id</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">Rtime</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">Mobile</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">Channel</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">SendTime</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">DelTime</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">ReadTime</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">Template</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">Message</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">Campaign</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-r border-b border-border">Status</TableHead>
                                                <TableHead className="sticky top-0 bg-white z-[999] text-[11px] font-semibold text-muted-foreground uppercase tracking-wider py-3 text-center border-b border-border">Reason</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                    <TableBody>
                                        {loadingLogs ? (
                                            <TableRow><TableCell colSpan={11} className="text-center py-10">Fetching logs...</TableCell></TableRow>
                                        ) : webhookLogs.length === 0 ? (
                                            <TableRow><TableCell colSpan={10} className="text-center py-10">No message logs available yet.</TableCell></TableRow>
                                        ) : (
                                            webhookLogs.map((log) => (
                                                <TableRow key={log.id} className="hover:bg-muted/50 transition-colors border-b border-border">
                                                    <TableCell className="text-[10px] font-medium text-muted-foreground border-r border-border px-3 py-2">
                                                        {log.id}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-border text-center px-3 py-2 font-medium text-muted-foreground">
                                                        {log.created_at ? format(new Date(log.created_at), 'dd MMM HH:mm') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-[11px] border-r border-border text-center px-3 py-2 font-bold text-foreground">
                                                        {log.recipient?.replace(/^\+/, '')}
                                                    </TableCell>
                                                    <TableCell className="text-center border-r border-border px-2 py-2">
                                                        <Badge variant="outline" className={cn("text-[8px] px-1.5 h-4 border-none font-black uppercase", 
                                                            (log.channel || log.campaign_channel || 'rcs').toLowerCase() === 'sms' ? "bg-amber-50 text-amber-700" : 
                                                            (log.channel || log.campaign_channel || 'rcs').toLowerCase() === 'whatsapp' ? "bg-emerald-50 text-emerald-700" : 
                                                            "bg-blue-50 text-blue-700")}>
                                                            {log.channel || log.campaign_channel || 'rcs'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-border text-center px-3 py-2 font-medium text-muted-foreground">
                                                        {log.send_time ? format(new Date(log.send_time), 'HH:mm') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-border text-center text-emerald-400 font-bold px-3 py-2">
                                                        {log.delivery_time ? format(new Date(log.delivery_time), 'HH:mm') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-border text-center text-purple-400 font-bold px-3 py-2">
                                                        {log.read_time ? format(new Date(log.read_time), 'HH:mm') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-border text-center truncate max-w-[100px] px-3 py-2 font-medium text-muted-foreground" title={log.template_name}>
                                                        {log.template_name || 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-border text-left px-3 py-2 font-medium text-foreground min-w-[200px] max-w-[300px]">
                                                        <div className="whitespace-pre-wrap break-words line-clamp-3 hover:line-clamp-none transition-all duration-200">
                                                            {log.message_content || '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] text-muted-foreground font-semibold px-3 py-2 text-center border-r border-border max-w-[120px]">
                                                        <div className="line-clamp-2 leading-tight" title={log.campaign_name}>
                                                            {log.campaign_name || '-'}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center border-r border-border px-2 py-2">
                                                        <Badge variant="outline" className={cn("text-[8px] px-1.5 h-4 border-none font-black uppercase", getStatusColor(log.status))}>
                                                            {log.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] px-3 py-2 leading-tight max-w-[180px] min-w-[120px]">
                                                        {log.failure_reason && log.failure_reason.startsWith('Failover from') ? (
                                                            <div className={cn(
                                                                "flex items-center gap-1 px-1.5 py-0.5 rounded border border-emerald-200/50 w-fit font-semibold",
                                                                log.failure_reason.toUpperCase().includes('WHATSAPP') || log.failure_reason.toUpperCase().includes('WA')
                                                                    ? "text-green-600 bg-green-50 border-green-200/50"
                                                                    : "text-emerald-600 bg-emerald-50 border-emerald-200/50"
                                                            )} title={log.failure_reason}>
                                                                ⚡ {log.failure_reason.split(':')[0].replace('Failover from ', '')} Fallback
                                                            </div>
                                                        ) : (
                                                            <div className="text-rose-500 font-bold line-clamp-3 hover:line-clamp-none transition-all duration-300 cursor-help" title={log.failure_reason}>
                                                                {log.failure_reason || '-'}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                                {renderPagination(activeTab === 'api' ? apiPage : detailedPage, activeTab === 'api' ? apiTotal : detailedTotal, activeTab === 'api' ? setApiPage : setDetailedPage)}
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                <TabsContent value="engagement" className="flex-1 mt-4 overflow-hidden">
                    <Card className="border border-border shadow-md rounded-xl bg-card flex flex-col h-[calc(100vh-280px)] overflow-hidden">
                        <CardHeader className="py-4 px-6 border-b bg-muted/30 shrink-0">
                            <CardTitle className="text-lg font-bold">User Engagement & Click Reports</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white z-50 shadow-[0_1px_0_0_rgba(0,0,0,0.1)]">
                                    <TableRow className="bg-white hover:bg-white h-12">
                                        <TableHead className="sticky top-0 bg-white z-50 py-4 px-6 text-[11px] uppercase font-semibold">Type</TableHead>
                                        <TableHead className="sticky top-0 bg-white z-50 py-4 px-6 text-[11px] uppercase font-semibold text-center">Mobile</TableHead>
                                        <TableHead className="sticky top-0 bg-white z-50 py-4 px-6 text-[11px] uppercase font-semibold text-center">Campaign</TableHead>
                                        <TableHead className="sticky top-0 bg-white z-50 py-4 px-6 text-[11px] uppercase font-semibold">Interaction Details</TableHead>
                                        <TableHead className="sticky top-0 bg-white z-50 py-4 px-6 text-[11px] uppercase font-semibold text-right">Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingEngagement ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-10">Fetching click logs...</TableCell></TableRow>
                                    ) : engagementReports.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-10">No clicks tracked yet.</TableCell></TableRow>
                                    ) : (
                                        engagementReports.map((e, idx) => (
                                            <TableRow key={idx} className="hover:bg-muted/30 border-b transition-colors group">
                                                <TableCell className="py-4 px-6">
                                                    <Badge className={cn("text-[8px] font-black border-none uppercase shadow-sm tracking-widest px-2", e.type === 'URL CLICKED' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700")}>
                                                        {e.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-center font-medium text-xs tracking-tight text-foreground">{e.msisdn?.replace(/^\+/, '')}</TableCell>
                                                <TableCell className="text-center text-[10px] font-bold text-muted-foreground uppercase opacity-70 group-hover:opacity-100 truncate max-w-[120px]">{e.campaign_name}</TableCell>
                                                <TableCell className="text-[11px] font-medium text-foreground max-w-[250px]">
                                                    <div className="line-clamp-2 leading-tight font-semibold text-muted-foreground group-hover:text-foreground transition-colors" title={e.interaction}>
                                                        {e.interaction || '-'}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-4 px-6 text-right text-[10px] font-bold text-muted-foreground uppercase">{e.timestamp ? format(new Date(e.timestamp), 'dd MMM, HH:mm') : '-'}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {renderPagination(engagementPage, engagementTotal, setEngagementPage)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
