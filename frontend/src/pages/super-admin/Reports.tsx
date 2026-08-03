import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { format } from 'date-fns';
import { 
    Calendar as CalendarIcon, Download, Search, ChevronLeft, ChevronRight, User, 
    Users, Building, Check, ChevronsUpDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface VoiceLog {
    id: string | number;
    campaign_name: string;
    mobile: string;
    status: string;
    duration: number;
    attempts: number;
    created_at: string;
    user_email?: string;
    company?: string;
}

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
    user_name?: string;
    user_company?: string;
    channel?: string;
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
}

interface HierarchyUser {
    id: string;
    name: string;
    email: string;
    company_name: string;
    role: string;
    rcs_text_price: number;
    rcs_rich_card_price: number;
    rcs_carousel_price: number;
    wa_marketing_price: number;
    wa_utility_price: number;
    wa_authentication_price: number;
    sms_promotional_price: number;
    sms_transactional_price: number;
    sms_service_price: number;
    reseller_id?: number | null;
    actual_reseller_id?: number | null;
}

const ITEMS_PER_PAGE = 20;

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

export default function SuperAdminReports() {
    const { toast } = useToast();
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'today';
    
    const [users, setUsers] = useState<HierarchyUser[]>([]);
    const [selectedUserId, setSelectedUserId] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<HierarchyUser | null>(null);
    const [userType, setUserType] = useState<string>('all');
    const [selectedFilterResellerId, setSelectedFilterResellerId] = useState<string>('all');
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    
    const [reports, setReports] = useState<Report[]>([]);
    const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
    const [voiceLogs, setVoiceLogs] = useState<VoiceLog[]>([]);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState<Date | undefined>(undefined);
    const [endDate, setEndDate] = useState<Date | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(false);

    const getResellerName = (resellerId?: number | null) => {
        if (!resellerId) return null;
        // If a user's reseller_id matches another user's actual_reseller_id or id, return that user's name
        const parent = users.find(u => 
            (u.actual_reseller_id?.toString() === resellerId.toString()) || 
            (u.id.toString() === resellerId.toString())
        );
        return parent ? (parent.company_name || parent.name) : null;
    };

    const getReportTitle = () => {
        switch(activeTab) {
            case 'pull': return 'Pull Report';
            case 'short_url': return 'Short Url Report';
            case 'bulk_detail': return 'Bulk Detail Report';
            case 'api_detail': return 'API Detail Report';
            case 'voice_detail': return 'Voice Details Report';
            case 'rcs_detail': return 'RCS Details Report';
            case 'sms_summary': return 'SMS Summary Report';
            case 'today': return 'Today Report';
            case 'whatsapp_detail': return 'WhatsApp Details Report';
            case 'whatsapp_summary': return 'WhatsApp Summary Report';
            case 'rcs_summary': return 'RCS Summary Report';
            default: return 'Report';
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/clients/all-hierarchy`, {
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
        if (selectedUserId !== 'all') {
            const user = users.find(u => u.id.toString() === selectedUserId);
            setSelectedUser(user || null);
        } else {
            setSelectedUser(null);
        }
    }, [selectedUserId, users]);

    useEffect(() => {
        setCurrentPage(1);
        fetchData(1);
    }, [startDate, endDate, selectedUserId, activeTab, searchQuery]);

    useEffect(() => {
        fetchData(currentPage);
    }, [currentPage]);

    // Background Auto-Refresh
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(() => { fetchData(currentPage, true); }, 10000);
        return () => clearInterval(interval);
    }, [selectedUserId, autoRefresh, activeTab, currentPage, startDate, endDate, searchQuery]);

    const fetchData = async (page: number = 1, silent: boolean = false) => {
        if (!silent) setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            let baseParams = `userId=${selectedUserId}&page=${page}&limit=${ITEMS_PER_PAGE}`;
            if (startDate) baseParams += `&startDate=${startDate.toISOString().split('T')[0]}`;
            if (endDate) baseParams += `&endDate=${endDate.toISOString().split('T')[0]}`;
            if (searchQuery) baseParams += `&search=${encodeURIComponent(searchQuery)}`;

            if (activeTab.includes('summary') || activeTab === 'today') {
                // Fetch Campaign Summary
                let url = `${API_BASE_URL}/api/rcs/reports?${baseParams}`;
                if (activeTab === 'sms_summary') url += '&channel=sms';
                if (activeTab === 'whatsapp_summary') url += '&channel=whatsapp';
                if (activeTab === 'rcs_summary') url += '&channel=rcs';
                if (activeTab === 'today') url += `&startDate=${new Date().toISOString().split('T')[0]}&endDate=${new Date().toISOString().split('T')[0]}`;

                const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await response.json();
                if (data.success) {
                    setReports(data.reports);
                    setTotalItems(data.pagination?.total || 0);
                }
            } else if (activeTab === 'voice_detail') {
                // Fetch Voice Logs
                const response = await fetch(`${API_BASE_URL}/api/reports/voice-logs?${baseParams}`, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await response.json();
                if (data.success) {
                    setVoiceLogs(data.logs);
                    setTotalItems(data.total || 0);
                }
            } else {
                // Fetch Webhook Detailed Logs
                let url = `${API_BASE_URL}/api/webhooks/message-logs?${baseParams}`;
                if (activeTab === 'rcs_detail') url += '&channel=rcs';
                if (activeTab === 'whatsapp_detail') url += '&channel=whatsapp';
                if (activeTab === 'api_detail') url += '&source=api';
                if (activeTab === 'bulk_detail') url += '&source=manual';

                const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
                const data = await res.json();
                if (data.success) {
                    setWebhookLogs(data.data);
                    setTotalItems(data.pagination?.total || 0);
                }
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
            if(!silent) toast({ title: 'Error', description: 'Failed to load report data', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        toast({ title: 'Exporting...', description: 'Your CSV is being generated' });
        let csvContent = "";
        let filename = "";

        if (activeTab.includes('summary') || activeTab === 'today') {
            const headers = ['User', 'Campaign Name', 'Template', 'Channel', 'Date', 'Total', 'Sent', 'Delivered', 'Read', 'Failed'];
            csvContent = [
                headers.join(','),
                ...reports.map(r => `"${r.user_company || r.user_name || ''}","${r.name}","${r.template_id}","${r.channel || 'rcs'}",${format(new Date(r.created_at), 'yyyy-MM-dd HH:mm')},${r.recipient_count},${r.sent_count},${r.delivered_count},${r.read_count},${r.failed_count}`)
            ].join('\n');
            filename = `${activeTab}_${format(new Date(), 'yyyyMMdd')}.csv`;
        } else if (activeTab === 'voice_detail') {
            const headers = ['Date', 'Campaign', 'Mobile', 'Status', 'Duration', 'Attempts'];
            csvContent = [
                headers.join(','),
                ...voiceLogs.map(l => `${format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss')},"${l.campaign_name}",${l.mobile},${l.status},${l.duration},${l.attempts}`)
            ].join('\n');
            filename = `voice_report_${format(new Date(), 'yyyyMMdd')}.csv`;
        } else {
            const headers = ['Id', 'Date', 'Mobile', 'Channel', 'Status', 'Reason', 'Template', 'Campaign'];
            csvContent = [
                headers.join(','),
                ...webhookLogs.map(l => `${l.id},${l.created_at ? format(new Date(l.created_at), 'yyyy-MM-dd HH:mm:ss') : '-'},${l.recipient},${l.channel || l.campaign_channel || 'rcs'},${l.status},"${l.failure_reason || ''}","${l.template_name || ''}","${l.campaign_name || ''}"`)
            ].join('\n');
            filename = `${activeTab}_${format(new Date(), 'yyyyMMdd')}.csv`;
        }

        downloadCsv(csvContent, filename);
    };

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'sent': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'delivered': return 'bg-green-100 text-green-700 border-green-200';
            case 'read': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'failed': return 'bg-red-100 text-red-700 border-red-200';
            case 'answered': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const renderPagination = () => {
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
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(c => c - 1)} disabled={currentPage === 1} className="h-8 px-2">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <Badge variant="outline" className="h-8 px-3 font-bold bg-white">
                        Page {currentPage} of {totalPages}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(c => c + 1)} disabled={currentPage === totalPages} className="h-8 px-2">
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden">
            {/* Header Section */}
            <div className="bg-white border-b px-8 py-5 shadow-sm shrink-0 z-10">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">
                            {getReportTitle()}
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">View and analyze your system data</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 mr-2">
                            <input
                                type="checkbox"
                                id="super-auto-refresh-toggle"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-200 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                            />
                            <Label htmlFor="super-auto-refresh-toggle" className="text-xs font-bold cursor-pointer select-none text-muted-foreground">
                                Auto-refresh (10s)
                            </Label>
                        </div>
                        <Button variant="default" size="sm" onClick={handleExport} className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Download className="h-4 w-4" /> Export CSV
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-8 overflow-y-auto">
                {/* Filters & Pricing Row */}
                <div className="flex flex-col xl:flex-row gap-6 mb-6">
                    {/* Date Filters Card */}
                    <Card className="flex-1 shadow-sm border-slate-200">
                        <CardHeader className="pb-3 px-6 bg-slate-50/50 rounded-t-xl border-b">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Search className="w-4 h-4 text-blue-500" /> Report Filters
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-6 pt-5 pb-5">
                            <div className="flex flex-wrap gap-4 w-full items-start">
                                {/* User Type */}
                                <div className="flex-1 min-w-[140px]">
                                    <Label className="text-xs text-slate-500 font-bold mb-1 block uppercase">User Type</Label>
                                    <Select value={userType} onValueChange={(val) => { setUserType(val); setSelectedUserId('all'); setSelectedFilterResellerId('all'); }}>
                                        <SelectTrigger className="w-full bg-white border-slate-200">
                                            <SelectValue placeholder="Select Type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Users</SelectItem>
                                            <SelectItem value="reseller">Reseller</SelectItem>
                                            <SelectItem value="user">User / Client</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Reseller Filter (Only show when 'reseller' is selected) */}
                                {userType === 'reseller' && (
                                    <div className="flex-1 min-w-[160px]">
                                        <Label className="text-xs text-slate-500 font-bold mb-1 block uppercase">Select Reseller</Label>
                                        <Select value={selectedFilterResellerId} onValueChange={(val) => { setSelectedFilterResellerId(val); setSelectedUserId('all'); }}>
                                            <SelectTrigger className="w-full bg-white border-slate-200">
                                                <SelectValue placeholder="Choose a Reseller..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">-- Select Reseller --</SelectItem>
                                                {users.filter(u => u.role === 'reseller').map(reseller => (
                                                    <SelectItem key={`filter-${reseller.id}`} value={(reseller.actual_reseller_id || reseller.id).toString()}>
                                                        {reseller.company_name || reseller.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* User Name */}
                                <div className="flex-[2] min-w-[240px]">
                                    <Label className="text-xs text-slate-500 font-bold mb-1 block uppercase">User Name</Label>
                                    <Popover open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                aria-expanded={userDropdownOpen}
                                                className="w-full justify-between bg-white border-slate-200 font-normal"
                                            >
                                                <div className="flex items-center gap-2 truncate">
                                                    <User className="h-4 w-4 text-slate-500 shrink-0" />
                                                    <span className="truncate">
                                                        {selectedUserId === 'all' 
                                                            ? '-- ALL SYSTEM USERS --' 
                                                            : selectedUser 
                                                                ? `${selectedUser.company_name || selectedUser.name} (${selectedUser.email})`
                                                                : 'Select User/Reseller'}
                                                    </span>
                                                </div>
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[450px] p-0" align="start">
                                            <Command>
                                                <CommandInput placeholder="Search users by name, email, or company..." />
                                                <CommandList>
                                                    <CommandEmpty>No user found.</CommandEmpty>
                                                    <CommandGroup>
                                                        <CommandItem
                                                            value="all"
                                                            onSelect={() => {
                                                                setSelectedUserId('all');
                                                                setUserDropdownOpen(false);
                                                            }}
                                                            className="font-bold text-blue-600"
                                                        >
                                                            <Check className={cn("mr-2 h-4 w-4", selectedUserId === 'all' ? "opacity-100" : "opacity-0")} />
                                                            -- ALL SYSTEM USERS --
                                                        </CommandItem>
                                                    </CommandGroup>
                                                    {userType === 'all' && (
                                                        <CommandGroup heading="Resellers">
                                                            {users.filter(u => u.role === 'reseller').map(user => (
                                                                <CommandItem
                                                                    key={user.id}
                                                                    value={`${user.company_name} ${user.name} ${user.email} ${user.id}`}
                                                                    onSelect={() => {
                                                                        setSelectedUserId(user.id.toString());
                                                                        setUserDropdownOpen(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", selectedUserId === user.id.toString() ? "opacity-100" : "opacity-0")} />
                                                                    {user.company_name || user.name} <span className="text-muted-foreground ml-1 text-xs">({user.email})</span>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    )}
                                                    {userType === 'reseller' && selectedFilterResellerId !== 'all' && (
                                                        <CommandGroup heading="Reseller Account">
                                                            {users.filter(u => (u.actual_reseller_id?.toString() === selectedFilterResellerId) || (u.id.toString() === selectedFilterResellerId)).filter(u => u.role === 'reseller').map(user => (
                                                                <CommandItem
                                                                    key={user.id}
                                                                    value={`${user.company_name} ${user.name} ${user.email} ${user.id}`}
                                                                    onSelect={() => {
                                                                        setSelectedUserId(user.id.toString());
                                                                        setUserDropdownOpen(false);
                                                                    }}
                                                                    className="flex items-start py-2"
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4 mt-1", selectedUserId === user.id.toString() ? "opacity-100" : "opacity-0")} />
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="font-medium text-slate-800">
                                                                            {user.company_name || user.name} <span className="text-muted-foreground ml-1 text-xs font-normal">({user.email})</span>
                                                                        </span>
                                                                        <span className="text-[10px] text-purple-600 font-bold uppercase tracking-wider">
                                                                            Main Reseller Account
                                                                        </span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    )}
                                                    <CommandGroup heading="Clients / Users">
                                                        {users.filter(u => u.role !== 'reseller' && u.role !== 'superadmin')
                                                            .filter(u => {
                                                                if (userType === 'all') return true;
                                                                if (userType === 'user') {
                                                                    const p = users.find(x => x.id.toString() === u.reseller_id?.toString());
                                                                    return !p || p.role === 'admin' || p.role === 'superadmin';
                                                                }
                                                                if (userType === 'reseller') {
                                                                    if (selectedFilterResellerId === 'all') return false; // Force selecting a reseller first
                                                                    return u.reseller_id?.toString() === selectedFilterResellerId;
                                                                }
                                                                return true;
                                                            })
                                                            .map(user => {
                                                            const parentName = getResellerName(user.reseller_id);
                                                            return (
                                                                <CommandItem
                                                                    key={user.id}
                                                                    value={`${user.company_name} ${user.name} ${user.email} ${user.id} ${parentName || ''}`}
                                                                    onSelect={() => {
                                                                        setSelectedUserId(user.id.toString());
                                                                        setUserDropdownOpen(false);
                                                                    }}
                                                                    className="flex items-start py-2"
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4 mt-1", selectedUserId === user.id.toString() ? "opacity-100" : "opacity-0")} />
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <span className="font-medium text-slate-800">
                                                                            {user.company_name || user.name} <span className="text-muted-foreground ml-1 text-xs font-normal">({user.email})</span>
                                                                        </span>
                                                                        {parentName ? (
                                                                            <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">
                                                                                via Reseller: {parentName}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                                                                                Direct Admin User
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </CommandItem>
                                                            );
                                                        })}
                                                        {userType === 'reseller' && selectedFilterResellerId !== 'all' && users.filter(u => u.reseller_id?.toString() === selectedFilterResellerId && u.role !== 'reseller' && u.role !== 'superadmin').length === 0 && (
                                                            <div className="p-4 text-center text-sm text-slate-500">
                                                                No clients found for this reseller.
                                                            </div>
                                                        )}
                                                        {userType === 'reseller' && selectedFilterResellerId === 'all' && (
                                                            <div className="p-4 text-center text-sm text-slate-500">
                                                                Please select a Reseller from the dropdown above to view its clients.
                                                            </div>
                                                        )}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* From Date */}
                                <div className="flex-1 min-w-[140px]">
                                    <Label className="text-xs text-slate-500 font-bold mb-1 block uppercase">From Date</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-white border-slate-200", !startDate && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                                <span className="truncate">{startDate ? format(startDate, "PPP") : "Start Date"}</span>
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                {/* To Date */}
                                <div className="flex-1 min-w-[140px]">
                                    <Label className="text-xs text-slate-500 font-bold mb-1 block uppercase">To Date</Label>
                                    <div className="flex gap-2">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal bg-white border-slate-200", !endDate && "text-muted-foreground")}>
                                                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                                                    <span className="truncate">{endDate ? format(endDate, "PPP") : "End Date"}</span>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                                            </PopoverContent>
                                        </Popover>
                                        {(startDate || endDate) && (
                                            <Button variant="ghost" onClick={() => { setStartDate(undefined); setEndDate(undefined); }} className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-10 px-2 shrink-0">
                                                Clear
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Search */}
                                <div className="w-full mt-1">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                                        <Input
                                            placeholder="Search recipient, campaign..."
                                            className="pl-9 h-10 bg-white border-slate-200 w-full"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pricing Information Card */}
                    {selectedUser && (
                        <Card className="xl:w-[450px] shrink-0 shadow-sm border-blue-100 bg-blue-50/30 overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <CardHeader className="pb-2 px-6 pt-4">
                                <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        {selectedUser.role === 'reseller' ? <Building className="w-4 h-4 text-blue-600" /> : <Users className="w-4 h-4 text-blue-600" />}
                                        Billing Rates: {selectedUser.company_name || selectedUser.name}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider bg-blue-100 text-blue-700">
                                        {selectedUser.role}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="px-6 pb-4">
                                <div className="grid grid-cols-3 gap-y-3 gap-x-4 text-sm">
                                    <div><span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">WA Mktg</span><span className="font-mono font-semibold text-slate-800">₹{selectedUser.wa_marketing_price || 0}</span></div>
                                    <div><span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">WA Utility</span><span className="font-mono font-semibold text-slate-800">₹{selectedUser.wa_utility_price || 0}</span></div>
                                    <div><span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">WA Auth</span><span className="font-mono font-semibold text-slate-800">₹{selectedUser.wa_authentication_price || 0}</span></div>
                                    
                                    <div><span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">RCS Text</span><span className="font-mono font-semibold text-slate-800">₹{selectedUser.rcs_text_price || 0}</span></div>
                                    <div><span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">RCS Media</span><span className="font-mono font-semibold text-slate-800">₹{selectedUser.rcs_rich_card_price || 0}</span></div>
                                    <div><span className="text-slate-500 text-[10px] uppercase font-bold block mb-0.5">SMS Promo</span><span className="font-mono font-semibold text-slate-800">₹{selectedUser.sms_promotional_price || 0}</span></div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Data Table */}
                <Card className="shadow-sm border-slate-200">
                    <div className="p-0 overflow-auto rounded-xl">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                {activeTab.includes('summary') || activeTab === 'today' ? (
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-700">User</TableHead>
                                        <TableHead className="font-bold text-slate-700">Campaign Name</TableHead>
                                        <TableHead className="font-bold text-slate-700">Channel</TableHead>
                                        <TableHead className="font-bold text-slate-700">Template</TableHead>
                                        <TableHead className="font-bold text-slate-700">Date</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700">Total</TableHead>
                                        <TableHead className="text-right font-bold text-blue-600">Sent</TableHead>
                                        <TableHead className="text-right font-bold text-green-600">Delivered</TableHead>
                                        <TableHead className="text-right font-bold text-purple-600">Read</TableHead>
                                        <TableHead className="text-right font-bold text-red-600">Failed</TableHead>
                                    </TableRow>
                                ) : activeTab === 'voice_detail' ? (
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-700">Time</TableHead>
                                        <TableHead className="font-bold text-slate-700">Campaign</TableHead>
                                        <TableHead className="font-bold text-slate-700">Mobile</TableHead>
                                        <TableHead className="font-bold text-slate-700">Status</TableHead>
                                        <TableHead className="font-bold text-slate-700">Duration</TableHead>
                                        <TableHead className="font-bold text-slate-700">Attempts</TableHead>
                                    </TableRow>
                                ) : (
                                    <TableRow>
                                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase">Id</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase">Date/Time</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase">Mobile</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase">Channel</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase">Template</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase">Campaign</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase">Status</TableHead>
                                        <TableHead className="font-bold text-slate-700 text-[11px] uppercase">Reason</TableHead>
                                    </TableRow>
                                )}
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-20 text-slate-500">Loading data...</TableCell></TableRow>
                                ) : totalItems === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="text-center py-20 text-slate-500">No records found for the selected filters.</TableCell></TableRow>
                                ) : activeTab.includes('summary') || activeTab === 'today' ? (
                                    reports.map((report) => (
                                        <TableRow key={report.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-medium text-xs text-slate-700">
                                                {report.user_company || report.user_name || '-'}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm text-slate-800">{report.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 border-none font-black uppercase", 
                                                    (report.channel || 'rcs').toLowerCase() === 'sms' ? "bg-amber-100 text-amber-700" : 
                                                    (report.channel || 'rcs').toLowerCase() === 'whatsapp' ? "bg-emerald-100 text-emerald-700" : 
                                                    "bg-blue-100 text-blue-700")}>
                                                    {report.channel || 'rcs'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-[11px] text-slate-500">{report.template_id}</TableCell>
                                            <TableCell className="text-slate-500 text-xs">
                                                {format(new Date(report.created_at), 'dd MMM yyyy')}<br/>
                                                <span className="text-[10px]">{format(new Date(report.created_at), 'HH:mm:ss')}</span>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-700">{report.recipient_count}</TableCell>
                                            <TableCell className="text-right font-semibold text-blue-600">{report.sent_count}</TableCell>
                                            <TableCell className="text-right font-semibold text-green-600">{report.delivered_count}</TableCell>
                                            <TableCell className="text-right font-semibold text-purple-600">{report.read_count}</TableCell>
                                            <TableCell className="text-right font-semibold text-red-600">{report.failed_count}</TableCell>
                                        </TableRow>
                                    ))
                                ) : activeTab === 'voice_detail' ? (
                                    voiceLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-slate-50/50">
                                            <TableCell className="text-xs text-slate-600">
                                                {format(new Date(log.created_at), 'dd MMM yy HH:mm:ss')}
                                            </TableCell>
                                            <TableCell className="font-medium text-sm text-slate-800">{log.campaign_name}</TableCell>
                                            <TableCell className="font-mono text-xs text-slate-600">{log.mobile}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(log.status)}>
                                                    {log.status.toUpperCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono font-bold text-slate-700">{log.duration}s</TableCell>
                                            <TableCell className="text-slate-600 font-semibold">{log.attempts}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    webhookLogs.map((log) => (
                                        <TableRow key={log.id} className="hover:bg-slate-50/50">
                                            <TableCell className="text-[11px] font-mono text-slate-500">
                                                {log.id}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600">
                                                {log.created_at ? format(new Date(log.created_at), 'dd MMM yy HH:mm:ss') : '-'}
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-slate-700">
                                                {log.recipient?.replace(/^\+/, '')}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("text-[9px] px-1.5 h-5 border-none font-black uppercase", 
                                                    (log.channel || log.campaign_channel || 'rcs').toLowerCase() === 'sms' ? "bg-amber-100 text-amber-700" : 
                                                    (log.channel || log.campaign_channel || 'rcs').toLowerCase() === 'whatsapp' ? "bg-emerald-100 text-emerald-700" : 
                                                    "bg-blue-100 text-blue-700")}>
                                                    {log.channel || log.campaign_channel || 'rcs'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 truncate max-w-[150px]" title={log.template_name}>
                                                {log.template_name || '-'}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-800 font-medium truncate max-w-[150px]" title={log.campaign_name}>
                                                {log.campaign_name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("uppercase text-[9px] font-bold px-1.5 py-0.5", getStatusColor(log.status))}>
                                                    {log.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-red-500 truncate max-w-[200px]" title={log.failure_reason || ''}>
                                                {log.failure_reason || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        {renderPagination()}
                    </div>
                </Card>
            </div>
        </div>
    );
}
