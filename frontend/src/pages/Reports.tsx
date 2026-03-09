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
import { Calendar as CalendarIcon, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState('summary');
    const [autoRefresh] = useState(true); // Mandatory auto-refresh

    useEffect(() => {
        setSummaryPage(1); // Reset page on filter change
        fetchReports(1);
    }, [startDate, endDate, statusFilter, channelFilter]);

    useEffect(() => {
        setDetailedPage(1);
        fetchWebhookLogs(1);
    }, [startDate, endDate, channelFilter]);

    useEffect(() => {
        fetchReports(summaryPage);
    }, [summaryPage]);

    useEffect(() => {
        fetchWebhookLogs(detailedPage);
    }, [detailedPage]);

    const fetchReports = async (page: number = 1) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/rcs/reports?page=${page}&limit=${ITEMS_PER_PAGE}&`;

            if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
            if (statusFilter !== 'all') url += `status=${statusFilter}&`;
            if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
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

    const fetchWebhookLogs = async (page: number = 1) => {
        setLoadingLogs(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/webhooks/message-logs?page=${page}&limit=${ITEMS_PER_PAGE}&`;
            if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
            if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
            if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setWebhookLogs(data.data);
                setDetailedTotal(data.pagination?.total || 0);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    };


    useEffect(() => {
        if (activeTab === 'summary') fetchReports(summaryPage);
        if (activeTab === 'detailed') fetchWebhookLogs(detailedPage);
    }, [activeTab, startDate, endDate, searchQuery]);

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
        } else if (activeTab === 'detailed') {
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
        if (activeTab === 'detailed') fetchWebhookLogs(detailedPage);
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
        <div className="h-full flex flex-col space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">MIS Log Analytics</h1>
                    <p className="text-muted-foreground">Monitor campaign performance and delivery logs</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="default" size="sm" onClick={handleExport} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader className="pb-3 px-6">
                    <CardTitle className="text-sm font-medium">Filters</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4 px-6 pb-4">
                    <div className="flex items-center gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[200px] justify-start text-left font-normal",
                                        !startDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <span className="text-muted-foreground">-</span>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[200px] justify-start text-left font-normal",
                                        !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "PPP") : <span>End Date</span>}
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
                                className="text-xs h-8"
                            >
                                Clear Dates
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Select value={channelFilter} onValueChange={setChannelFilter}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="All Channels" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Channels</SelectItem>
                                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                                <SelectItem value="RCS">RCS</SelectItem>
                                <SelectItem value="sms">SMS</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex-1 max-w-sm relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search recipient, campaign, template..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>

            <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="summary">Summary Report</TabsTrigger>
                    <TabsTrigger value="detailed">Detailed Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="flex-1 flex flex-col space-y-4 pt-4">

                    <Card className="flex-1 overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Campaign Name</TableHead>
                                        <TableHead>Channel</TableHead>
                                        <TableHead>Template</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                        <TableHead className="text-right text-blue-600">Sent</TableHead>
                                        <TableHead className="text-right text-green-600">Deliv.</TableHead>
                                        <TableHead className="text-right text-purple-600">Read</TableHead>
                                        <TableHead className="text-right text-red-600">Failed</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={9} className="text-center py-10">Loading reports...</TableCell></TableRow>
                                    ) : filteredReports.length === 0 ? (
                                        <TableRow><TableCell colSpan={9} className="text-center py-10">No reports found.</TableCell></TableRow>
                                    ) : (
                                        filteredReports.map((report: any) => (
                                            <TableRow key={report.id}>
                                                <TableCell className="font-medium">{report.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="uppercase font-bold text-[10px] tracking-wider">{report.channel || 'RCS'}</Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-[10px]">{report.template_id}</TableCell>
                                                <TableCell className="text-muted-foreground leading-tight">
                                                    {format(new Date(report.created_at), 'dd MMM yy')}<br />
                                                    <span className="text-[10px]">{format(new Date(report.created_at), 'HH:mm')}</span>
                                                </TableCell>
                                                <TableCell className="text-right font-semibold">{report.recipient_count}</TableCell>
                                                <TableCell className="text-right text-blue-600">{report.sent_count}</TableCell>
                                                <TableCell className="text-right text-green-600">{report.delivered_count}</TableCell>
                                                <TableCell className="text-right text-purple-600">{report.read_count}</TableCell>
                                                <TableCell className="text-right text-red-600">{report.failed_count}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {renderPagination(summaryPage, summaryTotal, setSummaryPage)}
                        </CardContent>
                    </Card>
                </TabsContent>


                <TabsContent value="detailed" className="flex-1 mt-4">
                    <Card className="border-none shadow-sm h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold">Detailed Delivery Reports</CardTitle>
                                <CardDescription>Consolidated status for every recipient</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-blue-600 bg-blue-50 border-blue-100 uppercase">
                                    Total Messages: {webhookLogs.length}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm border-b-2">
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-[50px] font-bold text-black border-r px-2 text-[10px]">Id</TableHead>
                                        <TableHead className="w-[110px] font-bold text-black border-r text-center px-2 text-[10px]">Rtime</TableHead>
                                        <TableHead className="w-[100px] font-bold text-black border-r text-center px-2 text-[10px]">Mobile</TableHead>
                                        <TableHead className="w-[80px] font-bold text-black border-r text-center px-2 text-[10px]">sendTime</TableHead>
                                        <TableHead className="w-[80px] font-bold text-black border-r text-center px-2 text-[10px]">DelTime</TableHead>
                                        <TableHead className="w-[80px] font-bold text-black border-r text-center px-2 text-[10px]">ReadTime</TableHead>
                                        <TableHead className="w-[110px] font-bold text-black border-r text-center px-2 text-[10px]">Template</TableHead>
                                        <TableHead className="w-[110px] font-bold text-black border-r text-center px-2 text-[10px]">Campaign</TableHead>
                                        <TableHead className="w-[80px] font-bold text-black border-r text-center px-2 text-[10px]">Status</TableHead>
                                        <TableHead className="font-bold text-black text-center px-2 text-[10px]">reason</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingLogs ? (
                                        <TableRow><TableCell colSpan={10} className="text-center py-10">Fetching logs...</TableCell></TableRow>
                                    ) : webhookLogs.length === 0 ? (
                                        <TableRow><TableCell colSpan={10} className="text-center py-10">No message logs available yet.</TableCell></TableRow>
                                    ) : (
                                        webhookLogs.map((log) => (
                                            <TableRow key={log.id} className="hover:bg-muted/50 transition-colors border-b">
                                                <TableCell className="text-[10px] font-mono border-r px-2">
                                                    {log.id}
                                                </TableCell>
                                                <TableCell className="text-[10px] border-r text-center px-2">
                                                    {log.created_at ? format(new Date(log.created_at), 'dd MMM HH:mm:ss') : '-'}
                                                </TableCell>
                                                <TableCell className="text-[10px] border-r text-center px-2">
                                                    {log.recipient?.replace(/^\+/, '')}
                                                </TableCell>
                                                <TableCell className="text-[10px] border-r text-center px-2">
                                                    {log.send_time ? format(new Date(log.send_time), 'HH:mm:ss') : '-'}
                                                </TableCell>
                                                <TableCell className="text-[10px] border-r text-center text-green-600 font-medium px-2">
                                                    {log.delivery_time ? format(new Date(log.delivery_time), 'HH:mm:ss') : '-'}
                                                </TableCell>
                                                <TableCell className="text-[10px] border-r text-center text-purple-600 font-medium px-2">
                                                    {log.read_time ? format(new Date(log.read_time), 'HH:mm:ss') : '-'}
                                                </TableCell>
                                                <TableCell className="text-[10px] border-r text-center truncate max-w-[110px] px-2" title={log.template_name}>
                                                    {log.template_name || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-[10px] border-r text-center truncate max-w-[110px] px-2" title={log.campaign_name}>
                                                    <div className="flex flex-col items-center">
                                                        <span>{log.campaign_name || 'N/A'}</span>
                                                        <Badge variant="outline" className="uppercase font-bold text-[8px] tracking-wider mt-1">{log.channel || 'RCS'}</Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center border-r px-1">
                                                    <Badge variant="outline" className={cn("uppercase text-[8px] font-bold px-1 py-0", getStatusColor(log.status))}>
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-[10px] text-red-500 text-center truncate max-w-[120px] px-2" title={log.failure_reason || ''}>
                                                    {log.failure_reason || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {renderPagination(detailedPage, detailedTotal, setDetailedPage)}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
