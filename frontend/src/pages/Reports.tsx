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

export default function Reports() {
    const { user } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('campaigns');

    useEffect(() => {
        fetchReports();
        fetchWebhookLogs();
    }, [date, endDate, statusFilter]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/rcs/reports?`;
            
            if (date) url += `startDate=${date.toISOString().split('T')[0]}&`;
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
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/webhooks/message-logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setWebhookLogs(data.data);
            }
        } catch (error) {
            console.error('Failed to fetch webhook logs', error);
        } finally {
            setLoadingLogs(false);
        }
    };

    const handleExport = () => {
        if (activeTab === 'campaigns') {
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
        } else {
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

            downloadCsv(csvContent, `detailed_logs_${format(new Date(), 'yyyyMMdd')}.csv`);
        }
    };

    const downloadCsv = (content: string, fileName: string) => {
        const blob = new Blob([content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        window.URL.revokeObjectURL(url);
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
                    <p className="text-muted-foreground">Monitor campaign performance and detailed delivery events</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { fetchReports(); fetchWebhookLogs(); }}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", (loading || loadingLogs) && "animate-spin")} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="campaigns" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="campaigns">Campaign Performance</TabsTrigger>
                    <TabsTrigger value="detailed">Detailed Delivery Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="campaigns" className="flex-1 flex flex-col space-y-4 pt-4">
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
                                                !date && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date ? format(date, "PPP") : <span>Start Date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
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

                <TabsContent value="detailed" className="flex-1 flex flex-col pt-4">
                    <Card className="flex-1 overflow-hidden">
                        <CardHeader className="pb-3 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg text-primary">Consolidated Delivery Logs</CardTitle>
                                    <CardDescription>Live status updates for every recipient</CardDescription>
                                </div>
                                <Badge variant="outline" className="font-mono">
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
