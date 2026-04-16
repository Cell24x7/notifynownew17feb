'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Download, Search, FileText, TrendingUp, CreditCard, Users as UsersIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '@/config/api';
import { useToast } from '@/hooks/use-toast';

interface LedgerEntry {
    id: number;
    name: string;
    email: string;
    company: string;
    wallet_balance: number;
    reseller_name: string | null;
    total_spent: number;
    total_added: number;
    last_activity: string | null;
    account_created: string;
    sms_bulk: number;
    sms_api: number;
    wa_bulk: number;
    wa_api: number;
    rcs_bulk: number;
    rcs_api: number;
}

interface Reseller {
    id: number;
    name: string;
}

interface UserRecord {
    id: number;
    name: string;
    email: string;
    company: string;
    reseller_id: number | null;
}

export default function UsageLedger() {
    const { toast } = useToast();
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [resellers, setResellers] = useState<Reseller[]>([]);
    const [allUsers, setAllUsers] = useState<UserRecord[]>([]);
    
    const [filterTarget, setFilterTarget] = useState<'all' | 'reseller' | 'user'>('all');
    const [selectedEntityId, setSelectedEntityId] = useState<string>('all');
    
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [searchQuery, setSearchQuery] = useState('');
    
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    const months = [
        { label: 'January', value: 1 }, { label: 'February', value: 2 }, { label: 'March', value: 3 },
        { label: 'April', value: 4 }, { label: 'May', value: 5 }, { label: 'June', value: 6 },
        { label: 'July', value: 7 }, { label: 'August', value: 8 }, { label: 'September', value: 9 },
        { label: 'October', value: 10 }, { label: 'November', value: 11 }, { label: 'December', value: 12 }
    ];

    const years = [2024, 2025, 2026];

    useEffect(() => {
        fetchResellers();
        fetchAllUsers();
    }, []);

    useEffect(() => {
        fetchLedger();
    }, [month, year, filterTarget, selectedEntityId, page]);

    const fetchResellers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/resellers`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) setResellers(data.resellers);
        } catch (error) {
            console.error('Failed to fetch resellers', error);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const token = localStorage.getItem('authToken');
            const response = await fetch(`${API_BASE_URL}/api/clients`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) setAllUsers(data.clients);
        } catch (error) {
            console.error('Failed to fetch clients', error);
        }
    };

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            
            let url = `${API_BASE_URL}/api/dashboard/usage-ledger?month=${month}&year=${year}&page=${page}&limit=10`;
            if (filterTarget !== 'all' && selectedEntityId !== 'all') {
                url += `&entityId=${selectedEntityId}&entityType=${filterTarget}`;
            }
            if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setLedger(data.ledger);
                setTotalPages(data.pagination.totalPages);
                setTotalRecords(data.pagination.total);
            }
        } catch (error) {
            console.error('Failed to fetch ledger', error);
            toast({ title: 'Error', description: 'Failed to load ledger', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const totalSpentInView = ledger.reduce((sum, item) => sum + item.total_spent, 0);

    const handleExport = () => {
        const headers = [
            'ID', 'Organization', 'Email', 'Reseller', 'Onboarded', 
            'SMS Bulk', 'SMS API', 
            'WA Bulk', 'WA API', 
            'RCS Bulk', 'RCS API', 
            'Total Spent', 'Recharged', 'Closing Balance'
        ];
        const csv = ledger.map(i => [
            i.id, 
            i.company || 'Personal', 
            i.email, 
            i.reseller_name || 'Direct', 
            i.account_created ? format(new Date(i.account_created), 'yyyy-MM-dd') : 'N/A',
            i.sms_bulk, i.sms_api,
            i.wa_bulk, i.wa_api,
            i.rcs_bulk, i.rcs_api,
            i.total_spent, 
            i.total_added,
            i.wallet_balance
        ].join(',')).join('\n');
        const blob = new Blob([[headers.join(','), csv].join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `api_vs_bulk_audit_${month}_${year}.csv`;
        a.click();
    };

    return (
        <div className="p-6 space-y-6 bg-slate-50/50 min-h-screen">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Financial Usage Ledger</h1>
                    <p className="text-sm text-slate-500 mt-1">Monitor and audit platform consumption across all channels</p>
                </div>
                <div className="flex items-center gap-3">
                     <Button variant="outline" onClick={handleExport} className="gap-2 h-10 border-blue-200 text-blue-600 hover:bg-blue-50 bg-white">
                        <Download className="w-4 h-4" /> Export Audit Report
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Spent (Page)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">₹{totalSpentInView.toLocaleString()}</div>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Records</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{totalRecords}</div>
                    </CardContent>
                </Card>

                <Card className="border shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Month</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{months.find(m => m.value === month)?.label}</div>
                    </CardContent>
                </Card>
                
                <Card className="border shadow-sm border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Year</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{year}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Section */}
            <Card className="border shadow-sm border-slate-200 overflow-hidden">
                <div className="p-4 border-b bg-slate-50/50 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Search by name, email, company..." 
                            className="pl-10 h-10 border-slate-200 bg-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (setPage(1), fetchLedger())}
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Select value={filterTarget} onValueChange={(v: any) => { setFilterTarget(v); setSelectedEntityId('all'); setPage(1); }}>
                            <SelectTrigger className="w-[140px] h-10 bg-white border-slate-200">
                                <SelectValue placeholder="Show All" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Entities</SelectItem>
                                <SelectItem value="reseller">Resellers</SelectItem>
                                <SelectItem value="user">Individuals</SelectItem>
                            </SelectContent>
                        </Select>

                        {filterTarget !== 'all' && (
                            <Select value={selectedEntityId} onValueChange={(v) => { setSelectedEntityId(v); setPage(1); }}>
                                <SelectTrigger className="w-[180px] h-10 bg-white border-slate-200">
                                    <SelectValue placeholder="Select Target" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                    <SelectItem value="all">Show All</SelectItem>
                                    {filterTarget === 'reseller' ? resellers.map(r => (
                                        <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                    )) : allUsers.map(u => (
                                        <SelectItem key={u.id} value={u.id.toString()}>{u.company || u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}

                        <Select value={month.toString()} onValueChange={(v) => { setMonth(parseInt(v)); setPage(1); }}>
                            <SelectTrigger className="w-[110px] h-10 bg-white border-slate-200">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Select value={year.toString()} onValueChange={(v) => { setYear(parseInt(v)); setPage(1); }}>
                            <SelectTrigger className="w-[90px] h-10 bg-white border-slate-200">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        <Button onClick={() => { setPage(1); fetchLedger(); }} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                            Apply Filter
                        </Button>
                    </div>
                </div>

                {/* Table with Clear Borders */}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[60px] border-r border-slate-100 font-semibold text-slate-700">ID</TableHead>
                                <TableHead className="border-r border-slate-100 font-semibold text-slate-700">Organization / User</TableHead>
                                <TableHead className="border-r border-slate-100 font-semibold text-slate-700 text-center">Onboarded</TableHead>
                                <TableHead className="border-r border-slate-100 font-semibold text-slate-700">Channel Consumption</TableHead>
                                <TableHead className="border-r border-slate-100 font-semibold text-slate-700 text-right">Consumption</TableHead>
                                <TableHead className="border-r border-slate-100 font-semibold text-slate-700 text-right text-emerald-600">Recharged</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right">Closing Balance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-400">Loading ledger data...</TableCell>
                                </TableRow>
                            ) : ledger.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">No data found for this period</TableCell>
                                </TableRow>
                            ) : (
                                ledger.map((item) => (
                                    <TableRow key={item.id} className="border-b border-slate-100 hover:bg-slate-50/30">
                                        <TableCell className="border-r border-slate-100 font-mono text-xs text-slate-500">{item.id}</TableCell>
                                        <TableCell className="border-r border-slate-100 min-w-[200px]">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm">{item.company || 'Personal'}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] text-slate-400 font-mono">{item.email}</span>
                                                    <div className="h-1 w-1 bg-slate-300 rounded-full" />
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase">{item.reseller_name || 'Direct'}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="border-r border-slate-100 text-center text-[11px] text-slate-500 font-medium">
                                            {item.account_created ? format(new Date(item.account_created), 'dd MMM yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell className="border-r border-slate-100">
                                            <div className="flex flex-wrap gap-1.5 justify-start">
                                                {/* WhatsApp Section */}
                                                {(item.wa_bulk > 0 || item.wa_api > 0) && (
                                                    <div className="flex flex-col gap-1 pr-2 border-r border-slate-100 last:border-0 border-dashed">
                                                        <span className="text-[7px] font-black text-emerald-600 uppercase">WhatsApp</span>
                                                        <div className="flex gap-1">
                                                            {item.wa_bulk > 0 && <Badge className="bg-emerald-50 text-emerald-700 border-none text-[8px] font-black px-1 h-3.5">B:{item.wa_bulk}</Badge>}
                                                            {item.wa_api > 0 && <Badge className="bg-emerald-600 text-white border-none text-[8px] font-black px-1 h-3.5">API:{item.wa_api}</Badge>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* SMS Section */}
                                                {(item.sms_bulk > 0 || item.sms_api > 0) && (
                                                    <div className="flex flex-col gap-1 pr-2 border-r border-slate-100 last:border-0 border-dashed">
                                                        <span className="text-[7px] font-black text-blue-600 uppercase">SMS</span>
                                                        <div className="flex gap-1">
                                                            {item.sms_bulk > 0 && <Badge className="bg-blue-50 text-blue-700 border-none text-[8px] font-black px-1 h-3.5">B:{item.sms_bulk}</Badge>}
                                                            {item.sms_api > 0 && <Badge className="bg-blue-600 text-white border-none text-[8px] font-black px-1 h-3.5">API:{item.sms_api}</Badge>}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* RCS Section */}
                                                {(item.rcs_bulk > 0 || item.rcs_api > 0) && (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-[7px] font-black text-indigo-600 uppercase">RCS</span>
                                                        <div className="flex gap-1">
                                                            {item.rcs_bulk > 0 && <Badge className="bg-indigo-50 text-indigo-700 border-none text-[8px] font-black px-1 h-3.5">B:{item.rcs_bulk}</Badge>}
                                                            {item.rcs_api > 0 && <Badge className="bg-indigo-600 text-white border-none text-[8px] font-black px-1 h-3.5">API:{item.rcs_api}</Badge>}
                                                        </div>
                                                    </div>
                                                )}

                                                {item.wa_bulk === 0 && item.wa_api === 0 && item.sms_bulk === 0 && item.sms_api === 0 && item.rcs_bulk === 0 && item.rcs_api === 0 && (
                                                    <span className="text-[10px] text-slate-300 italic">No consumption</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="border-r border-slate-100 text-right font-black text-slate-900">
                                            ₹{item.total_spent.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="border-r border-slate-100 text-right font-bold text-emerald-600">
                                            ₹{item.total_added.toLocaleString()}
                                        </TableCell>
                                        <TableCell className="text-right font-black text-blue-700 bg-blue-50/20">
                                            ₹{item.wallet_balance.toLocaleString()}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Simplified Pagination */}
                <div className="p-4 bg-slate-50/30 border-t flex items-center justify-between">
                    <div className="text-sm text-slate-500">
                        Page {page} of {totalPages} ({totalRecords} total entries)
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="outline" 
                            size="sm"
                            disabled={page === 1 || loading}
                            onClick={() => setPage(prev => prev - 1)}
                            className="h-9 border-slate-200"
                        >
                            <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            disabled={page === totalPages || loading}
                            onClick={() => setPage(prev => prev + 1)}
                            className="h-9 border-slate-200"
                        >
                            Next <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}
