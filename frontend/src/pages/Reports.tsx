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
    const [engagementReports, setEngagementReports] = useState<EngagementReport[]>([]);
    
    const [summaryTotal, setSummaryTotal] = useState(0);
    const [detailedTotal, setDetailedTotal] = useState(0);
    
    const [summaryPage, setSummaryPage] = useState(1);
    const [detailedPage, setDetailedPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [activeTab, setActiveTabTab] = useState(searchParams.get('tab') || 'summary');

    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [channelFilter, setChannelFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [targetUserId, setTargetUserId] = useState('all');
    const [users, setUsers] = useState<any[]>([]);

    useEffect(() => {
        if (activeTab === 'summary') fetchReports(summaryPage);
        if (activeTab === 'detailed') fetchWebhookLogs(detailedPage);
        if (activeTab === 'engagement') fetchEngagementReports();
    }, [activeTab, summaryPage, detailedPage, startDate, endDate, statusFilter, channelFilter, searchQuery, targetUserId]);

    const fetchReports = async (page: number) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let url = `${API_BASE_URL}/api/rcs/reports?page=${page}&limit=${ITEMS_PER_PAGE}&source=manual&`;
            if (startDate) url += `startDate=${startDate}&`;
            if (endDate) url += `endDate=${endDate}&`;
            if (channelFilter !== 'all') url += `channel=${channelFilter}&`;
            if (targetUserId !== 'all') url += `userId=${targetUserId}&`;
            if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
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
            let url = `${API_BASE_URL}/api/webhooks/message-logs?page=${page}&limit=${ITEMS_PER_PAGE}&source=manual&`;
            if (startDate) url += `startDate=${startDate}&`;
            if (endDate) url += `endDate=${endDate}&`;
            if (targetUserId !== 'all') url += `userId=${targetUserId}&`;
            if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setWebhookLogs(data.data);
                setDetailedTotal(data.pagination?.total || 0);
            }
        } catch (e) { console.error(e); } finally { setLoadingLogs(false); }
    };

    const fetchEngagementReports = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const res = await fetch(`${API_BASE_URL}/api/reports/engagement`, { headers: { 'Authorization': `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setEngagementReports(data.reports);
        } catch (e) { console.error(e); }
    };

    const renderPagination = (currentPage: number, totalItems: number, onPageChange: (page: number) => void) => {
        const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
        if (totalPages <= 1) return null;
        return (
            <div className="flex items-center justify-between p-4 border-t bg-muted/10">
                <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Prev</Button>
                <div className="text-xs font-bold">Page {currentPage} of {totalPages}</div>
                <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next</Button>
            </div>
        );
    };

    return (
        <div className="h-full space-y-6 p-8 bg-background overflow-auto">
            <h1 className="text-2xl font-bold">Analytics Reports</h1>
            
            <Tabs value={activeTab} onValueChange={setActiveTabTab} className="w-full">
                <TabsList className="bg-muted mb-4">
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="detailed">Detailed</TabsTrigger>
                    <TabsTrigger value="engagement">Click Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="summary">
                    <Card><CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Campaign</TableHead>
                                <TableHead className="text-center">Sent</TableHead>
                                <TableHead className="text-center">Delivered</TableHead>
                                <TableHead className="text-center">Read</TableHead>
                                <TableHead className="text-center">Failed</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>{reports.map(r=>(
                                <TableRow key={r.id}>
                                    <TableCell className="font-bold">{r.name}</TableCell>
                                    <TableCell className="text-center">{r.sent_count}</TableCell>
                                    <TableCell className="text-center text-emerald-600 font-bold">{r.delivered_count}</TableCell>
                                    <TableCell className="text-center text-purple-600 font-bold">{r.read_count}</TableCell>
                                    <TableCell className="text-center text-rose-600 font-bold">{r.failed_count}</TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                        {renderPagination(summaryPage, summaryTotal, setSummaryPage)}
                    </CardContent></Card>
                </TabsContent>

                <TabsContent value="detailed">
                    <Card><CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Campaign</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>{webhookLogs.map(l=>(
                                <TableRow key={l.id}>
                                    <TableCell className="text-xs">{l.created_at ? format(new Date(l.created_at), 'dd MMM HH:mm') : '-'}</TableCell>
                                    <TableCell className="font-bold">{l.recipient}</TableCell>
                                    <TableCell><Badge variant="outline" className="uppercase font-bold">{l.status}</Badge></TableCell>
                                    <TableCell className="text-xs max-w-[150px] truncate">{l.campaign_name}</TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                        {renderPagination(detailedPage, detailedTotal, setDetailedPage)}
                    </CardContent></Card>
                </TabsContent>

                <TabsContent value="engagement">
                    <Card><CardContent className="p-0">
                        <Table>
                            <TableHeader><TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Mobile</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead className="text-right">Time</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>{engagementReports.map((e,i)=>(
                                <TableRow key={i}>
                                    <TableCell><Badge className="uppercase font-extrabold">{e.type}</Badge></TableCell>
                                    <TableCell className="font-bold">{e.msisdn}</TableCell>
                                    <TableCell className="text-xs truncate max-w-[300px]">{e.interaction}</TableCell>
                                    <TableCell className="text-right text-xs">{e.timestamp ? format(new Date(e.timestamp), 'dd MMM HH:mm') : '-'}</TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                    </CardContent></Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
