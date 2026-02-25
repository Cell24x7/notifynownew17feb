import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, Search, RefreshCw, MessageSquare } from 'lucide-react';
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
}

interface RawWebhookLog {
    id: number;
    message_id_envelope: string;
    recipient: string;
    status: string;
    event_type: string;
    created_at: string;
    raw_payload: string;
}

export default function Reports() {
    const { user } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
    const [rawLogs, setRawLogs] = useState<RawWebhookLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [loadingRaw, setLoadingRaw] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('performance');

    useEffect(() => {
        fetchReports();
        fetchWebhookLogs();
    }, [startDate, endDate, statusFilter]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/rcs/reports?`;
            
            if (startDate) url += `startDate=${startDate.toISOString().split('T')[0]}&`;
            if (endDate) url += `endDate=${endDate.toISOString().split('T')[0]}&`;
            if (statusFilter !== 'all') url += `status=${statusFilter}&`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const data = await response.json();
            if (data.success) {
                setReports(data.reports);
            }
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchWebhookLogs = async () => {
        setLoadingLogs(true);
        try {
            const res = await fetch('/api/webhooks/message-logs');
            const data = await res.json();
            if (data.success) {
                setWebhookLogs(data.data);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const fetchRawLogs = async () => {
        setLoadingRaw(true);
        try {
            const res = await fetch('/api/webhooks/logs');
            const data = await res.json();
            if (data.success) {
                setRawLogs(data.data);
            }
        } catch (error) {
            console.error('Error fetching raw logs:', error);
        } finally {
            setLoadingRaw(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'detailed') fetchRawLogs();
        if (activeTab === 'consolidated') fetchWebhookLogs();
    }, [activeTab]);

    const handleExport = () => {
        if (activeTab === 'performance') {
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
            const headers = ['Id', 'Received At', 'Recipient', 'Message ID', 'Event', 'Status'];
            const csvContent = [
                headers.join(','),
                ...rawLogs.map(l => [
                    l.id,
                    l.created_at ? format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss') : '-',
                    l.recipient || 'N/A',
                    `"${l.message_id_envelope || ''}"`,
                    l.event_type || 'Update',
                    l.status
                ].join(','))
            ].join('\n');

            downloadCsv(csvContent, `detailed_webhooks_${format(new Date(), 'yyyyMMdd')}.csv`);
        } else if (activeTab === 'consolidated') {
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
        fetchReports();
        if (activeTab === 'detailed') fetchRawLogs();
        if (activeTab === 'consolidated') fetchWebhookLogs();
    };

    const filteredReports = reports.filter(r => 
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.template_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
            case 'read': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'failed': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reports & Logs</h1>
                    <p className="text-muted-foreground">Monitor campaign performance and delivery logs</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
                        <RefreshCw className={cn("h-4 w-4", (loading || loadingLogs || loadingRaw) && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button variant="default" size="sm" onClick={handleExport} className="gap-2 bg-blue-600 hover:bg-blue-700">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="performance" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-[600px] grid-cols-3">
                    <TabsTrigger value="performance">Campaign Performance</TabsTrigger>
                    <TabsTrigger value="detailed">Detailed Webhook Logs</TabsTrigger>
                    <TabsTrigger value="consolidated">Consolidated Delivery Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="flex-1 flex flex-col space-y-4 pt-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Filters</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
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
                            </div>

                            <div className="flex-1 max-w-sm relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search campaigns..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex-1 overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Campaign Name</TableHead>
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
                                        <TableRow><TableCell colSpan={8} className="text-center py-10">Loading reports...</TableCell></TableRow>
                                    ) : filteredReports.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="text-center py-10">No reports found.</TableCell></TableRow>
                                    ) : (
                                        filteredReports.map((report) => (
                                            <TableRow key={report.id}>
                                                <TableCell className="font-medium">{report.name}</TableCell>
                                                <TableCell className="font-mono text-[10px]">{report.template_id}</TableCell>
                                                <TableCell className="text-muted-foreground leading-tight">
                                                    {format(new Date(report.created_at), 'dd MMM yy')}<br/>
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
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="detailed" className="flex-1 mt-4">
                    <Card className="border-none shadow-sm h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold">Detailed Webhook Logs</CardTitle>
                                <CardDescription>Raw events received from providers</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-blue-600 bg-blue-50 border-blue-100 uppercase">
                                    Total Events: {rawLogs.length}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 h-[600px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm border-b-2">
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-[60px] font-bold text-black border-r">Id</TableHead>
                                        <TableHead className="w-[150px] font-bold text-black border-r">Received At</TableHead>
                                        <TableHead className="w-[150px] font-bold text-black border-r">Recipient</TableHead>
                                        <TableHead className="font-bold text-black border-r">Message ID</TableHead>
                                        <TableHead className="w-[120px] font-bold text-black border-r">Event</TableHead>
                                        <TableHead className="w-[100px] font-bold text-black">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingRaw ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-10">Fetching raw logs...</TableCell></TableRow>
                                    ) : rawLogs.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-10">No webhook events available.</TableCell></TableRow>
                                    ) : (
                                        rawLogs.map((log) => (
                                            <TableRow key={log.id} className="hover:bg-muted/50 transition-colors border-b">
                                                <TableCell className="text-[11px] font-mono border-r">{log.id}</TableCell>
                                                <TableCell className="text-[11px] border-r">
                                                    {format(new Date(log.created_at), 'dd MMM HH:mm:ss')}
                                                </TableCell>
                                                <TableCell className="text-[11px] font-bold border-r">
                                                    {log.recipient || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-[11px] font-mono border-r truncate max-w-[200px]" title={log.message_id_envelope}>
                                                    {log.message_id_envelope || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-[11px] border-r italic text-muted-foreground uppercase">
                                                    {log.event_type || 'Update'}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn("uppercase text-[9px] font-bold px-1.5 py-0", getStatusColor(log.status))}>
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="consolidated" className="flex-1 mt-4">
                    <Card className="border-none shadow-sm h-full">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <CardTitle className="text-xl font-bold">Consolidated Delivery Summary</CardTitle>
                                <CardDescription>Consolidated status for every recipient</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="font-mono text-blue-600 bg-blue-50 border-blue-100 uppercase">
                                    Total Messages: {webhookLogs.length}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 h-[600px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm border-b-2">
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-[60px] font-bold text-black border-r">Id</TableHead>
                                        <TableHead className="w-[140px] font-bold text-black border-r text-center">Rtime</TableHead>
                                        <TableHead className="w-[120px] font-bold text-black border-r text-center">Mobile</TableHead>
                                        <TableHead className="w-[100px] font-bold text-black border-r text-center">sendTime</TableHead>
                                        <TableHead className="w-[100px] font-bold text-black border-r text-center">DelTime</TableHead>
                                        <TableHead className="w-[100px] font-bold text-black border-r text-center">ReadTime</TableHead>
                                        <TableHead className="w-[130px] font-bold text-black border-r text-center">Template</TableHead>
                                        <TableHead className="w-[130px] font-bold text-black border-r text-center">Campaign</TableHead>
                                        <TableHead className="w-[100px] font-bold text-black border-r text-center">Status</TableHead>
                                        <TableHead className="w-[150px] font-bold text-black text-center">reason</TableHead>
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
                                                <TableCell className="text-[11px] font-mono border-r">
                                                    {log.id}
                                                </TableCell>
                                                <TableCell className="text-[11px] border-r text-center">
                                                    {log.created_at ? format(new Date(log.created_at), 'dd MMM HH:mm:ss') : '-'}
                                                </TableCell>
                                                <TableCell className="text-[11px] font-bold border-r text-center">
                                                    {log.recipient}
                                                </TableCell>
                                                <TableCell className="text-[11px] border-r text-center">
                                                    {log.send_time ? format(new Date(log.send_time), 'HH:mm:ss') : '-'}
                                                </TableCell>
                                                <TableCell className="text-[11px] border-r text-center text-green-600 font-medium">
                                                    {log.delivery_time ? format(new Date(log.delivery_time), 'HH:mm:ss') : '-'}
                                                </TableCell>
                                                <TableCell className="text-[11px] border-r text-center text-purple-600 font-medium">
                                                    {log.read_time ? format(new Date(log.read_time), 'HH:mm:ss') : '-'}
                                                </TableCell>
                                                <TableCell className="text-[10px] border-r text-center truncate max-w-[130px]" title={log.template_name}>
                                                    {log.template_name || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-[10px] border-r text-center truncate max-w-[130px]" title={log.campaign_name}>
                                                    {log.campaign_name || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-center border-r">
                                                    <Badge variant="outline" className={cn("uppercase text-[9px] font-bold px-1.5 py-0", getStatusColor(log.status))}>
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-[10px] text-red-500 text-center truncate max-w-[150px]" title={log.failure_reason || ''}>
                                                    {log.failure_reason || '-'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
