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
        if (user?.role === 'admin' || user?.role === 'superadmin') {
            fetchUsers();
        }
    }, [user]);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setUsers(data.users);
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
        }
    }, [detailedPage, apiPage, targetUserId]);

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


    useEffect(() => {
        if (activeTab === 'summary') fetchReports(summaryPage);
        if (activeTab === 'detailed') fetchWebhookLogs(detailedPage, 'detailed');
        if (activeTab === 'api') fetchWebhookLogs(apiPage, 'api');
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

    const handleExport = () => {
        if (activeTab === 'summary') {
            const headers = ['Campaign Name', 'Template', 'Date', 'Total', 'Sent', 'Delivered', 'Read', 'Failed'];
            const csvContent = [
                headers.join(','),
                ...reports.map(r => [
                    `"${r.name}"`,
                    `"${r.template_id}"`,
                    format(new Date(r.created_at), 'yyyy-MM-dd HH:mm'),
                    r.recipient_count,
                    r.sent_count,
                    r.delivered_count,
                    r.read_count,
                    r.failed_count
                ].join(','))
            ].join('\n');

            downloadCsv(csvContent, `rcs_summary_${format(new Date(), 'yyyyMMdd')}.csv`);
        } else if (activeTab === 'detailed' || activeTab === 'api') {
            const headers = ['Id', 'Rtime', 'Mobile', 'sendTime', 'DelTime', 'ReadTime', 'Template', 'Campaign', 'Status', 'Reason'];
            const csvContent = [
                headers.join(','),
                ...webhookLogs.map(l => [
                    l.id,
                    l.created_at ? format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss') : '-',
                    l.recipient,
                    l.send_time ? format(new Date(l.send_time), 'HH:mm:ss') : '-',
                    l.delivery_time ? format(new Date(l.delivery_time), 'HH:mm:ss') : '-',
                    l.read_time ? format(new Date(l.read_time), 'HH:mm:ss') : '-',
                    `"${l.template_name || ''}"`,
                    `"${l.campaign_name || ''}"`,
                    l.status,
                    `"${l.failure_reason || ''}"`
                ].join(','))
            ].join('\n');

            downloadCsv(csvContent, `delivery_summary_${format(new Date(), 'yyyyMMdd')}.csv`);
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
        <div className="h-full flex flex-col space-y-6 p-8 bg-slate-50/30">
            <div className="flex items-center justify-between">
                <div className="mb-6 px-1">
                <h1 className="text-2xl font-semibold text-slate-800 tracking-tight">Campaign Analytics</h1>
                <p className="text-sm text-slate-500 mt-1">Real-time performance and delivery intelligence</p>
            </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="bg-white border-slate-200">
                      Refresh Data
                    </Button>
                    <Button variant="default" size="sm" onClick={handleExport} className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-md">
                        <Download className="h-4 w-4" />
                        Export Data
                    </Button>
                </div>
            </div>

            {/* Top Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <Card className="rounded-xl border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2 bg-blue-50 rounded-lg"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
                     <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Total Volume</p>
                        <h3 className="text-xl font-black text-slate-900">{summaryTotal.toLocaleString()}</h3>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-xl border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
                     <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Delivered</p>
                        <h3 className="text-xl font-black text-slate-900">
                           {reports.reduce((acc, r) => acc + (r.delivered_count || 0), 0).toLocaleString()}
                        </h3>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-xl border-slate-200 shadow-sm border-l-4 border-l-rose-500">
                  <CardContent className="p-4 flex items-center gap-4">
                     <div className="p-2 bg-rose-50 rounded-lg"><XCircle className="h-5 w-5 text-rose-600" /></div>
                     <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase">Failed</p>
                        <h3 className="text-xl font-black text-slate-900">
                           {reports.reduce((acc, r) => acc + (r.failed_count || 0), 0).toLocaleString()}
                        </h3>
                     </div>
                  </CardContent>
               </Card>
               <Card className="rounded-xl border-slate-200 shadow-sm bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
                  <CardContent className="p-4 flex items-center gap-4 h-full">
                     <div className="p-2 bg-white/10 rounded-lg"><Search className="h-5 w-5 text-white" /></div>
                     <div>
                        <p className="text-[11px] font-bold text-indigo-100 uppercase">Search Active</p>
                        <h3 className="text-xl font-black">{searchQuery ? 'Filtered' : 'All Data'}</h3>
                     </div>
                  </CardContent>
               </Card>
            </div>

            <Card className="rounded-xl border-slate-200 shadow-sm bg-white overflow-hidden">
                <CardHeader className="py-2.5 px-6 border-b bg-slate-50/50">
                    <CardTitle className="text-[11px] font-black text-slate-400 uppercase flex items-center gap-2">
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
                                        "w-[180px] h-9 justify-start text-left font-semibold text-xs border-slate-200 bg-slate-50/30",
                                        !startDate && "text-slate-400"
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
                                        "w-[180px] h-9 justify-start text-left font-semibold text-xs border-slate-200 bg-slate-50/30",
                                        !endDate && "text-slate-400"
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
                            <SelectTrigger className="w-[150px] h-9 text-xs font-semibold border-slate-200 bg-slate-50/30">
                                <SelectValue placeholder="All Channels" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Channels</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="rcs">RCS</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 max-w-sm relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            placeholder="Search mobile, campaign..."
                            className="pl-9 h-9 text-xs font-semibold border-slate-200 bg-slate-50/30 placeholder:text-slate-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                        <div className="flex items-center gap-2 ml-auto">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase">View As:</Label>
                            <Select value={targetUserId} onValueChange={setTargetUserId}>
                                <SelectTrigger className="w-[180px] h-9 text-xs font-semibold border-slate-200 bg-white shadow-sm">
                                    <SelectValue placeholder="All Users" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Users (Admin)</SelectItem>
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
                <TabsList className="bg-slate-100 p-1 rounded-xl w-fit h-11 mb-2 border border-slate-200/50">
                    <TabsTrigger value="summary" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 font-bold text-xs uppercase tracking-wider">Summary Report</TabsTrigger>
                    <TabsTrigger value="detailed" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 font-bold text-xs uppercase tracking-wider">Detailed Reports</TabsTrigger>
                    <TabsTrigger value="api" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-6 font-bold text-xs uppercase tracking-wider">API Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="flex-1 flex flex-col space-y-4 pt-4">

                    <Card className="flex-1 overflow-hidden border-2 border-slate-200 shadow-md rounded-xl">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-100 border-b-2 border-slate-200">
                                    <TableRow className="hover:bg-transparent h-12">
                                            <TableHead className="py-4 px-6 text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">Campaign Name</TableHead>
                                            <TableHead className="py-4 px-4 text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">Channel</TableHead>
                                            <TableHead className="py-4 px-4 text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">Template</TableHead>
                                            <TableHead className="py-4 px-4 text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">Date</TableHead>
                                            <TableHead className="py-4 px-3 text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100">Total</TableHead>
                                            <TableHead className="py-4 px-3 text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100 text-indigo-600">Sent</TableHead>
                                            <TableHead className="py-4 px-3 text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100 text-emerald-600">Deliv.</TableHead>
                                            <TableHead className="py-4 px-3 text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100 text-purple-600">Read</TableHead>
                                            <TableHead className="py-4 px-3 text-center text-[11px] uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-100 text-rose-600">Failed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={9} className="text-center py-10">Loading reports...</TableCell></TableRow>
                                    ) : filteredReports.length === 0 ? (
                                        <TableRow><TableCell colSpan={9} className="text-center py-10 text-slate-400 font-medium">No reports found.</TableCell></TableRow>
                                    ) : (
                                        filteredReports.map((camp: any) => (
                                            <TableRow key={camp.id} className="hover:bg-slate-50/80 transition-colors border-b border-slate-200">
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <p className="font-semibold text-slate-900 text-[13px]">{camp.name || 'Untitled'}</p>
                                                            <span className="text-[10px] text-slate-400 font-medium">{camp.source === 'api' ? 'API' : 'Manual'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 rounded uppercase font-semibold border-none", 
                                                            camp.channel === 'whatsapp' ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>
                                                            {camp.channel || 'RCS'}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-4 px-4 text-center text-[11px] text-slate-500 font-medium">{camp.template_name}</td>
                                                    <td className="py-4 px-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[11px] font-semibold text-slate-900">{format(new Date(camp.created_at), 'dd MMM yy')}</span>
                                                            <span className="text-[10px] text-slate-400">{format(new Date(camp.created_at), 'HH:mm')}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-3 text-center font-semibold text-slate-900 text-xs">{camp.total_recipient?.toLocaleString()}</td>
                                                    <td className="py-4 px-3 text-center font-semibold text-indigo-600 text-xs">{camp.sent_count?.toLocaleString()}</td>
                                                    <td className="py-4 px-3 text-center font-semibold text-emerald-600 text-xs">{camp.delivered_count?.toLocaleString()}</td>
                                                    <td className="py-4 px-3 text-center font-semibold text-purple-600 text-xs">{camp.read_count?.toLocaleString()}</td>
                                                    <td className="py-4 px-3 text-center font-semibold text-rose-600 text-xs">{camp.failed_count?.toLocaleString()}</td>
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
                    <TabsContent value={activeTab} className="flex-1 mt-4">
                        <Card className="border-none shadow-sm h-full">
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
                            <CardContent className="p-0 overflow-auto">
                                <Table className="border-2 border-slate-200">
                                    <TableHeader className="sticky top-0 bg-slate-100 z-10 shadow-sm">
                                        <TableRow className="bg-slate-100/80 hover:bg-slate-100 h-10">
                                            <TableHead className="w-[60px] font-semibold text-slate-700 border-r border-b border-slate-300 px-3 text-[10px] uppercase tracking-wider">Id</TableHead>
                                            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-center border-r border-b border-slate-300">Rtime</TableHead>
                                            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-center border-r border-b border-slate-300">Mobile</TableHead>
                                            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-center border-r border-b border-slate-300">SendTime</TableHead>
                                            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-center border-r border-b border-slate-300">DelTime</TableHead>
                                            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-center border-r border-b border-slate-300">ReadTime</TableHead>
                                            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-center border-r border-b border-slate-300">Template</TableHead>
                                            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-center border-r border-b border-slate-300">Campaign</TableHead>
                                            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-center border-r border-b border-slate-300">Status</TableHead>
                                            <TableHead className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider py-3 text-center border-b border-slate-300">Reason</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loadingLogs ? (
                                            <TableRow><TableCell colSpan={10} className="text-center py-10">Fetching logs...</TableCell></TableRow>
                                        ) : webhookLogs.length === 0 ? (
                                            <TableRow><TableCell colSpan={10} className="text-center py-10">No message logs available yet.</TableCell></TableRow>
                                        ) : (
                                            webhookLogs.map((log) => (
                                                <TableRow key={log.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200 h-12">
                                                    <TableCell className="text-[10px] font-medium text-slate-500 border-r border-slate-200 px-3">
                                                        {log.id}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-slate-200 text-center px-3 font-medium text-slate-600">
                                                        {log.created_at ? format(new Date(log.created_at), 'dd MMM HH:mm:ss') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-[11px] border-r border-slate-200 text-center px-3 font-medium text-slate-900">
                                                        {log.recipient?.replace(/^\+/, '')}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-slate-200 text-center px-3 font-medium text-slate-600">
                                                        {log.send_time ? format(new Date(log.send_time), 'HH:mm:ss') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-slate-200 text-center text-emerald-600 font-medium px-3">
                                                        {log.delivery_time ? format(new Date(log.delivery_time), 'HH:mm:ss') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-slate-200 text-center text-purple-600 font-medium px-3">
                                                        {log.read_time ? format(new Date(log.read_time), 'HH:mm:ss') : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] border-r border-slate-200 text-center truncate max-w-[130px] px-3 font-medium text-slate-600" title={log.template_name}>
                                                        {log.template_name || 'N/A'}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] text-slate-600 font-medium px-3 text-center border-r border-slate-200">{log.campaign_name || '-'}</TableCell>
                                                    <TableCell className="text-center border-r border-slate-200 px-2">
                                                        <Badge variant="outline" className={cn("text-[8px] px-1.5 h-4 border-none font-semibold uppercase", getStatusColor(log.status))}>
                                                            {log.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-[10px] text-rose-500 font-semibold px-3 leading-tight min-w-[150px]">
                                                        {log.failure_reason || '-'}
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
            </Tabs>
        </div>
    );
}
