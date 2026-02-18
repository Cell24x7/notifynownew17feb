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
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, Search, Filter } from 'lucide-react';
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

export default function Reports() {
    const { user } = useAuth();
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchReports();
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

    const handleExport = () => {
        // Simple CSV export for now
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

    return (
        <div className="h-full flex flex-col space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                    <p className="text-muted-foreground">Detailed analytics for your RCS campaigns</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date ? format(date, "PPP") : <span>Start Date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                         <span className="text-muted-foreground">-</span>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-[240px] justify-start text-left font-normal",
                                        !endDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {endDate ? format(endDate, "PPP") : <span>End Date</span>}
                                </Button>
                            </PopoverTrigger>
                             <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={endDate}
                                    onSelect={setEndDate}
                                    initialFocus
                                />
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

            <Card className="flex-1 flex flex-col">
                <CardHeader>
                    <CardTitle>Campaign Performance</CardTitle>
                    <CardDescription>
                        Real-time delivery and read status updates.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Campaign Name</TableHead>
                                <TableHead>Template</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                                <TableHead className="text-right">Sent</TableHead>
                                <TableHead className="text-right">Delivered</TableHead>
                                <TableHead className="text-right">Read</TableHead>
                                <TableHead className="text-right">Failed</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10">Loading reports...</TableCell>
                                </TableRow>
                            ) : filteredReports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-10">No reports found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredReports.map((report) => (
                                    <TableRow key={report.id}>
                                        <TableCell className="font-medium">{report.name}</TableCell>
                                        <TableCell className="font-mono text-xs">{report.template_id}</TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {format(new Date(report.created_at), 'dd MMM yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell className="text-right">{report.recipient_count}</TableCell>
                                        <TableCell className="text-right text-blue-600 font-medium">{report.sent_count}</TableCell>
                                        <TableCell className="text-right text-green-600 font-medium">{report.delivered_count}</TableCell>
                                        <TableCell className="text-right text-purple-600 font-medium">{report.read_count}</TableCell>
                                        <TableCell className="text-right text-red-600 font-medium">{report.failed_count}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
