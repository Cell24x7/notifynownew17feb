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
    message_id: string;
    recipient: string;
    status: string;
    send_time: string;
    delivery_time: string | null;
    read_time: string | null;
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

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rcs_reports_${format(new Date(), 'yyyyMMdd')}.csv`;
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

            <Tabs defaultValue="campaigns" className="flex-1 flex flex-col">
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
                        <CardContent className="p-0 h-[500px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead className="w-[180px]">Last Update</TableHead>
                                        <TableHead>Message ID</TableHead>
                                        <TableHead>Recipient</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Timeline</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingLogs ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-10">Fetching logs...</TableCell></TableRow>
                                    ) : webhookLogs.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-10">No message logs available yet.</TableCell></TableRow>
                                    ) : (
                                        webhookLogs.map((log) => (
                                            <TableRow key={log.id} className="hover:bg-muted/50 transition-colors">
                                                <TableCell className="text-xs font-medium">
                                                    {format(new Date(log.updated_at), 'dd MMM HH:mm:ss')}
                                                </TableCell>
                                                <TableCell className="font-mono text-[10px] text-muted-foreground truncate max-w-[150px]">
                                                    {log.message_id || 'N/A'}
                                                </TableCell>
                                                <TableCell className="font-bold text-xs">
                                                    {log.recipient}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={cn("uppercase text-[10px] font-bold px-2 py-0.5", getStatusColor(log.status))}>
                                                        {log.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1">
                                                                <MessageSquare className="h-3 w-3" />
                                                                View Details
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-[280px] p-3 text-xs">
                                                            <div className="space-y-3">
                                                                <p className="font-bold border-b pb-1">Delivery Timeline</p>
                                                                <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                                    <span className="text-muted-foreground">Sent:</span>
                                                                    <span>{log.send_time ? format(new Date(log.send_time), 'HH:mm:ss') : '-'}</span>
                                                                    
                                                                    <span className="text-muted-foreground">Delivered:</span>
                                                                    <span className={log.delivery_time ? "text-green-600 font-medium" : ""}>
                                                                        {log.delivery_time ? format(new Date(log.delivery_time), 'HH:mm:ss') : 'Pending'}
                                                                    </span>
                                                                    
                                                                    <span className="text-muted-foreground">Read:</span>
                                                                    <span className={log.read_time ? "text-purple-600 font-medium" : ""}>
                                                                        {log.read_time ? format(new Date(log.read_time), 'HH:mm:ss') : 'Unread'}
                                                                    </span>
                                                                </div>
                                                                <div className="pt-2 border-t text-[10px] text-muted-foreground">
                                                                    <p>Campaign ID: {log.campaign_id}</p>
                                                                </div>
                                                            </div>
                                                        </PopoverContent>
                                                    </Popover>
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
