import { useState, useEffect } from 'react';
import { 
  Search, Loader2, ArrowUpRight, ArrowDownRight, CreditCard, ChevronLeft, ChevronRight, 
  Download, Filter, Zap, PlusCircle, UserPlus, CheckCircle, RefreshCw,
  Calendar, PieChart, Building2, MessageSquare, Send, FileText, Users
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from '@/components/ui/dialog';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api`;

export default function CreditLedger() {
  const { user } = useAuth();
  const { isPaymentDisabled, settings } = useBranding();
  const { toast } = useToast();

  const anyUser = user as any;
  const isBoltzman = isPaymentDisabled || 
    Number(anyUser?.id) === 10 || 
    Number(anyUser?.actual_reseller_id) === 10 || 
    Number(anyUser?.reseller_id) === 10 ||
    Number(anyUser?.parent_reseller_id) === 10 ||
    Number(anyUser?.id) === 56 || 
    Number(anyUser?.actual_reseller_id) === 56 || 
    Number(anyUser?.reseller_id) === 56 ||
    Number(anyUser?.parent_reseller_id) === 56 ||
    Boolean(anyUser?.is_advanced_reseller_suite) ||
    Boolean(settings?.brand_name?.toLowerCase().includes('boltzm')) ||
    Boolean(anyUser?.email?.toLowerCase().includes('boltzm')) ||
    Boolean(anyUser?.username?.toLowerCase().includes('boltzm'));

  const [activeTab, setActiveTab] = useState<'ledger' | 'monthly_summary'>('ledger');
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [clients, setClients] = useState<any[]>([]);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Manage Credits Dialog State
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [modalTargetUserId, setModalTargetUserId] = useState('');
  const [modalAction, setModalAction] = useState<'add' | 'deduct'>('add');
  const [modalAmount, setModalAmount] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [isSubmittingCredit, setIsSubmittingCredit] = useState(false);

  const [summaryTotals, setSummaryTotals] = useState<{ totalAdded: number; totalDeducted: number }>({ totalAdded: 0, totalDeducted: 0 });

  // Monthly Reseller Billing Summary State
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));
  const [summaryResellerId, setSummaryResellerId] = useState<string>('all');
  const [summaryClientId, setSummaryClientId] = useState<string>('all');
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [loadingMonthlySummary, setLoadingMonthlySummary] = useState<boolean>(false);

  const isReseller = user?.role === 'reseller';
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'super_admin';

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      if (isReseller) {
        // Fetch only clients belonging to this reseller
        const res = await axios.get(`${API_URL}/resellers/clients/list`, { 
          headers: { Authorization: `Bearer ${token}` } 
        });
        if (res.data.success) {
          setClients(res.data.clients || []);
        }
      } else {
        // Super Admin fetches all clients and resellers
        const [clientsRes, resellersRes] = await Promise.allSettled([
          axios.get(`${API_URL}/clients`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API_URL}/resellers`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        
        let allUsers: any[] = [];
        if (clientsRes.status === 'fulfilled' && clientsRes.value.data.success) {
          allUsers = [...allUsers, ...clientsRes.value.data.clients];
        }
        if (resellersRes.status === 'fulfilled' && resellersRes.value.data.success) {
          allUsers = [...allUsers, ...resellersRes.value.data.resellers];
        }
        
        setClients(allUsers);
      }
    } catch (err) {
      console.error('Failed to fetch users/resellers:', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [user?.role]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const res = await axios.get(`${API_URL}/wallet/ledger`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          limit: 15,
          type: typeFilter !== 'all' ? typeFilter : undefined,
          userId: selectedUserId !== 'all' ? selectedUserId : undefined
        }
      });
      if (res.data.success) {
        setLedger(res.data.ledger || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalItems(res.data.pagination?.total || 0);
        if (res.data.summary) {
          setSummaryTotals({
            totalAdded: res.data.summary.totalAdded || 0,
            totalDeducted: res.data.summary.totalDeducted || 0
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
      toast({
        title: 'Error',
        description: 'Failed to load credit ledger.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    setLoadingMonthlySummary(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      const res = await axios.get(`${API_URL}/wallet/reseller-monthly-summary`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          month: selectedMonth,
          resellerId: summaryResellerId !== 'all' ? summaryResellerId : undefined,
          clientId: summaryClientId !== 'all' ? summaryClientId : undefined
        }
      });
      if (res.data.success) {
        setMonthlyData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch monthly summary:', err);
      toast({
        title: 'Error',
        description: 'Failed to load monthly reseller summary.',
        variant: 'destructive',
      });
    } finally {
      setLoadingMonthlySummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly_summary') {
      fetchMonthlySummary();
    }
  }, [activeTab, selectedMonth, summaryResellerId, summaryClientId]);

  useEffect(() => {
    fetchLedger();
  }, [page, typeFilter, selectedUserId]);

  const handleManageCreditsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTargetUserId) {
      toast({ title: 'Validation Error', description: 'Please select a user or reseller.', variant: 'destructive' });
      return;
    }
    const numAmt = parseFloat(modalAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      toast({ title: 'Validation Error', description: 'Please enter a valid positive credit amount.', variant: 'destructive' });
      return;
    }

    setIsSubmittingCredit(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_URL}/wallet/manage-credits`, {
        targetUserId: modalTargetUserId,
        action: modalAction,
        amount: numAmt,
        description: modalDescription.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast({
          title: 'Success',
          description: res.data.message || 'Credits updated successfully.',
        });
        setIsManageModalOpen(false);
        setModalAmount('');
        setModalDescription('');
        setModalTargetUserId('');
        // Refresh ledger & client list
        fetchLedger();
        fetchClients();
      } else {
        toast({
          title: 'Error',
          description: res.data.message || 'Failed to update credits.',
          variant: 'destructive'
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update credits.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmittingCredit(false);
    }
  };

  const filteredLedger = ledger.filter(item => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      item.description?.toLowerCase().includes(s) ||
      item.owner_name?.toLowerCase().includes(s) ||
      item.owner_email?.toLowerCase().includes(s) ||
      item.reseller_name?.toLowerCase().includes(s)
    );
  });

  const selectedTargetClient = clients.find(c => c.id.toString() === modalTargetUserId);

  const totalCreditsAdded = summaryTotals.totalAdded || ledger
    .filter(i => i.type === 'credit')
    .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

  const totalCreditsDeducted = summaryTotals.totalDeducted || ledger
    .filter(i => i.type === 'debit')
    .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

  const handleExportCSV = () => {
    if (!ledger.length) return;
    const headers = ["ID", "Type", "User", "Email", "Role", "Managed By", "Amount", "Description", "Date"];
    const rows = ledger.map(item => [
      item.id,
      item.type,
      `"${item.owner_name || ''}"`,
      item.owner_email || '',
      item.owner_role || '',
      `"${item.reseller_name || (isReseller ? (user?.name || 'Reseller') : 'System/Admin')}"`,
      item.amount,
      `"${(item.description || '').replace(/"/g, '""')}"`,
      format(new Date(item.created_at), 'yyyy-MM-dd HH:mm:ss')
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `credit_ledger_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportMonthlyCSV = () => {
    if (!monthlyData?.summary?.clientBreakdown?.length) return;
    const headers = ["Client Name", "Email", "Monthly Allocated Credits", "WhatsApp Spent", "RCS Spent", "SMS Spent", "Total Spent", "Current Balance"];
    const rows = monthlyData.summary.clientBreakdown.map((item: any) => [
      `"${item.name || ''}"`,
      item.email || '',
      item.allocated || 0,
      item.whatsappSpent || 0,
      item.rcsSpent || 0,
      item.smsSpent || 0,
      item.spent || 0,
      item.currentBalance || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `monthly_billing_${monthlyData.reseller?.name || 'reseller'}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-4 md:p-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
            {isReseller ? 'Manage User Credits' : 'Credit Ledger & Management'}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {isReseller 
              ? 'Real-time tracking of credits allocated to your clients and transaction history.'
              : 'Comprehensive track of all credit allocations, debits, and transfers across all accounts.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(isAdmin || isReseller) && (
            <Button 
              onClick={() => setIsManageModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md rounded-xl font-medium"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              {isReseller ? 'Allocate Credits to Client' : 'Manage / Allocate Credits'}
            </Button>
          )}
          <Button variant="outline" onClick={activeTab === 'ledger' ? handleExportCSV : handleExportMonthlyCSV} className="rounded-xl hidden sm:flex">
            <Download className="w-4 h-4 mr-2" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border/60 space-x-4 pt-1">
        <button
          onClick={() => setActiveTab('ledger')}
          className={cn(
            "pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2",
            activeTab === 'ledger'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CreditCard className="w-4 h-4" />
          {isReseller ? 'Transaction History & Allocation' : 'Live Credit Ledger & Transactions'}
        </button>
        <button
          onClick={() => setActiveTab('monthly_summary')}
          className={cn(
            "pb-3 text-sm font-semibold transition-all border-b-2 flex items-center gap-2",
            activeTab === 'monthly_summary'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="w-4 h-4" />
          Monthly Reseller Billing & Usage Summary
        </button>
      </div>

      {activeTab === 'ledger' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard 
              title="Total Transactions" 
              value={totalItems.toLocaleString()} 
              icon={CreditCard} 
              color="text-blue-600" 
              bg="bg-blue-100/50 dark:bg-blue-950/30" 
            />
            <StatsCard 
              title="Credits Added (In)" 
              value={isBoltzman ? `${Math.floor(totalCreditsAdded).toLocaleString()} Credits` : `₹${totalCreditsAdded.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
              icon={ArrowDownRight} 
              color="text-emerald-600" 
              bg="bg-emerald-100/50 dark:bg-emerald-950/30" 
            />
            <StatsCard 
              title="Credits Deducted (Out)" 
              value={isBoltzman ? `${Math.floor(totalCreditsDeducted).toLocaleString()} Credits` : `₹${totalCreditsDeducted.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
              icon={ArrowUpRight} 
              color="text-rose-600" 
              bg="bg-rose-100/50 dark:bg-rose-950/30" 
            />
            <StatsCard 
              title="Active Accounts" 
              value={clients.length.toLocaleString()} 
              icon={Zap} 
              color="text-amber-600" 
              bg="bg-amber-100/50 dark:bg-amber-950/30" 
            />
          </div>

          {/* Main Ledger Table Card */}
          <Card className="border-none shadow-xl bg-card">
            <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/30 rounded-t-xl">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or description..."
                  className="pl-10 bg-background border-border focus:border-primary/50 transition-all rounded-xl"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
                <Select value={selectedUserId} onValueChange={(val) => { setSelectedUserId(val); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-background rounded-xl">
                    <SelectValue placeholder="All Accounts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts ({clients.length})</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name} ({client.role || 'client'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[150px] bg-background rounded-xl">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credits (In)</SelectItem>
                    <SelectItem value="debit">Debits (Out)</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => fetchLedger()} className="rounded-xl">
                  <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-b-xl">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="font-semibold text-foreground w-[100px]">Type</TableHead>
                    <TableHead className="font-semibold text-foreground">Account / User</TableHead>
                    <TableHead className="font-semibold text-foreground">Managed By / Source</TableHead>
                    <TableHead className="font-semibold text-foreground">Description</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Amount</TableHead>
                    <TableHead className="font-semibold text-foreground text-right">Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && ledger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary/50" />
                      </TableCell>
                    </TableRow>
                  ) : filteredLedger.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLedger.map((item) => (
                      <TableRow key={item.id} className="group hover:bg-muted/30 transition-colors border-b border-border/30">
                        <TableCell>
                          {item.type === 'credit' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30 gap-1 rounded-full px-2">
                              <ArrowDownRight className="w-3 h-3" /> Credit
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/30 gap-1 rounded-full px-2">
                              <ArrowUpRight className="w-3 h-3" /> Debit
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{item.owner_name || 'N/A'}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span>{item.owner_email || ''}</span>
                            {item.owner_role && (
                              <span className="bg-muted px-1.5 py-0.2 rounded text-[10px] uppercase font-semibold text-muted-foreground">
                                {item.owner_role}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {item.reseller_name ? (
                            <>
                              <div className="font-medium text-foreground">{item.reseller_name}</div>
                              {item.reseller_email && <div className="text-xs text-muted-foreground">{item.reseller_email}</div>}
                            </>
                          ) : isReseller ? (
                            <>
                              <div className="font-medium text-foreground">{user?.name || 'Reseller'}</div>
                              <div className="text-xs text-muted-foreground">{user?.email || ''}</div>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">System / Super Admin</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[280px]" title={item.description}>
                          <span className="text-sm text-foreground/80 line-clamp-2">{item.description}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={cn(
                            "font-semibold text-sm",
                            item.type === 'credit' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                          )}>
                            {item.type === 'credit' ? '+' : '-'}
                            {isBoltzman 
                              ? `${Math.floor(parseFloat(item.amount || 0)).toLocaleString()} Credits` 
                              : `₹${parseFloat(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {totalPages > 1 && (
              <div className="p-4 border-t border-border/50 flex items-center justify-between bg-muted/20 rounded-b-xl">
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages} ({totalItems} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 p-0 rounded-lg"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </>
      ) : (
        /* Monthly Reseller Billing Summary View */
        <div className="space-y-6">
          {/* Monthly Filters */}
          <Card className="border-none shadow-md bg-card p-4 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                {isAdmin && (
                  <div className="space-y-1 w-full sm:w-[240px]">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Reseller</Label>
                    <Select value={summaryResellerId} onValueChange={(val) => { setSummaryResellerId(val); setSummaryClientId('all'); }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Choose Reseller" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Resellers ({monthlyData?.resellers?.length || 0})</SelectItem>
                        {monthlyData?.resellers?.map((r: any) => (
                          <SelectItem key={r.id} value={r.id.toString()}>
                            {r.name} ({r.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1 w-full sm:w-[240px]">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Client Account</Label>
                  <Select value={summaryClientId} onValueChange={setSummaryClientId}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients ({monthlyData?.clients?.length || 0})</SelectItem>
                      {monthlyData?.clients?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()}>
                          {c.name} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 w-full sm:w-[180px]">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billing Month</Label>
                  <Input 
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="rounded-xl"
                  />
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => fetchMonthlySummary()} 
                  className="rounded-xl mt-5"
                >
                  <RefreshCw className={cn("w-4 h-4", loadingMonthlySummary && "animate-spin")} />
                </Button>
              </div>

              {monthlyData?.reseller ? (
                <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl border border-border/40 w-full sm:w-auto">
                  <Building2 className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="font-bold text-sm text-foreground">{monthlyData.reseller.name}</p>
                    <p className="text-xs text-muted-foreground">{monthlyData.reseller.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200/50 dark:border-indigo-800/30 w-full sm:w-auto">
                  <Building2 className="w-8 h-8 text-indigo-600" />
                  <div>
                    <p className="font-bold text-sm text-indigo-700 dark:text-indigo-300">All Resellers Overview</p>
                    <p className="text-xs text-muted-foreground">Combined System-wide Monthly Stats</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {loadingMonthlySummary ? (
            <Card className="border-none shadow-lg p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-600" />
              <p className="text-sm text-muted-foreground mt-3">Loading monthly billing breakdown...</p>
            </Card>
          ) : !monthlyData?.summary ? (
            <Card className="border-none shadow-lg p-12 text-center text-muted-foreground">
              No summary data found for selected month.
            </Card>
          ) : (
            <>
              {/* Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard 
                  title="Admin Allocated (In)" 
                  value={isBoltzman ? `${Math.floor(monthlyData.summary.adminAllocatedCredits).toLocaleString()} Credits` : `₹${monthlyData.summary.adminAllocatedCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                  icon={ArrowDownRight} 
                  color="text-emerald-600" 
                  bg="bg-emerald-100/50 dark:bg-emerald-950/30" 
                />
                <StatsCard 
                  title="Reseller Allocated to Clients" 
                  value={isBoltzman ? `${Math.floor(monthlyData.summary.resellerAllocatedCredits).toLocaleString()} Credits` : `₹${monthlyData.summary.resellerAllocatedCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                  icon={PlusCircle} 
                  color="text-blue-600" 
                  bg="bg-blue-100/50 dark:bg-blue-950/30" 
                />
                <StatsCard 
                  title="Total Spent by Clients" 
                  value={isBoltzman ? `${Math.floor(monthlyData.summary.totalSpentCredits).toLocaleString()} Credits` : `₹${monthlyData.summary.totalSpentCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                  icon={ArrowUpRight} 
                  color="text-rose-600" 
                  bg="bg-rose-100/50 dark:bg-rose-950/30" 
                />
                <StatsCard 
                  title="Reseller Available Balance" 
                  value={isBoltzman ? `${Math.floor(monthlyData.summary.resellerCurrentBalance).toLocaleString()} Credits` : `₹${monthlyData.summary.resellerCurrentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                  icon={CreditCard} 
                  color="text-indigo-600" 
                  bg="bg-indigo-100/50 dark:bg-indigo-950/30" 
                />
              </div>

              {/* Channel Breakdown Cards */}
              <Card className="border-none shadow-xl bg-card p-6">
                <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-indigo-600" />
                  Channel Consumption Breakdown ({format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
                    <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp</span>
                      <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">WA</Badge>
                    </div>
                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.channelBreakdown.whatsapp).toLocaleString()} Credits` : `₹${monthlyData.summary.channelBreakdown.whatsapp.toLocaleString()}`}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-800/30 bg-blue-50/50 dark:bg-blue-950/20 space-y-1">
                    <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5"><Send className="w-3.5 h-3.5 text-blue-600" /> RCS Messages</span>
                      <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">RCS</Badge>
                    </div>
                    <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.channelBreakdown.rcs).toLocaleString()} Credits` : `₹${monthlyData.summary.channelBreakdown.rcs.toLocaleString()}`}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-950/20 space-y-1">
                    <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-amber-600" /> SMS / DLT</span>
                      <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">SMS</Badge>
                    </div>
                    <p className="text-xl font-bold text-amber-700 dark:text-amber-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.channelBreakdown.sms).toLocaleString()} Credits` : `₹${monthlyData.summary.channelBreakdown.sms.toLocaleString()}`}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800/30 bg-slate-50/50 dark:bg-slate-950/20 space-y-1">
                    <div className="flex justify-between items-center text-xs text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-slate-600" /> Other / Adjustments</span>
                      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300">Misc</Badge>
                    </div>
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.channelBreakdown.other).toLocaleString()} Credits` : `₹${monthlyData.summary.channelBreakdown.other.toLocaleString()}`}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Per-Client Monthly Breakdown Table */}
              <Card className="border-none shadow-xl bg-card">
                <div className="p-4 border-b flex justify-between items-center bg-muted/30 rounded-t-xl">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Client-Wise Monthly Consumption ({monthlyData.summary.clientBreakdown?.length || 0} Clients)
                  </h3>
                  <Button variant="outline" size="sm" onClick={handleExportMonthlyCSV} className="rounded-xl text-xs">
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Export Client Report
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-b-xl">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border/50">
                        <TableHead className="font-semibold text-foreground">Client Name</TableHead>
                        <TableHead className="font-semibold text-foreground">Email</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Allocated (Month)</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">WhatsApp Spent</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">RCS Spent</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">SMS Spent</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Total Spent</TableHead>
                        <TableHead className="font-semibold text-foreground text-right">Current Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!monthlyData.summary.clientBreakdown?.length ? (
                        <TableRow>
                          <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                            No clients registered under this reseller.
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthlyData.summary.clientBreakdown.map((client: any) => (
                          <TableRow key={client.id} className="hover:bg-muted/30 border-b border-border/30">
                            <TableCell className="font-medium text-foreground">{client.name}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{client.email}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              +{isBoltzman ? Math.floor(client.allocated).toLocaleString() : `₹${client.allocated.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-emerald-600">
                              {isBoltzman ? Math.floor(client.whatsappSpent).toLocaleString() : `₹${client.whatsappSpent.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-blue-600">
                              {isBoltzman ? Math.floor(client.rcsSpent).toLocaleString() : `₹${client.rcsSpent.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-amber-600">
                              {isBoltzman ? Math.floor(client.smsSpent).toLocaleString() : `₹${client.smsSpent.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-right font-bold text-rose-600">
                              -{isBoltzman ? Math.floor(client.spent).toLocaleString() : `₹${client.spent.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-foreground">
                              {isBoltzman ? `${Math.floor(client.currentBalance).toLocaleString()} Credits` : `₹${client.currentBalance.toLocaleString()}`}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Manage / Allocate Credits Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              {isReseller ? 'Allocate Credits to Client' : 'Manage / Allocate Account Credits'}
            </DialogTitle>
            <DialogDescription>
              {isReseller 
                ? 'Add or reclaim credits from your registered clients in real time.'
                : 'Instantly add or deduct credits for any reseller or client account.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManageCreditsSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Select Target Account</Label>
              <Select value={modalTargetUserId} onValueChange={setModalTargetUserId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Choose account..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {clients.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>
                      {c.name} ({c.email}) - {c.role || 'client'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTargetClient && (
              <div className="p-3 bg-muted/40 rounded-xl border border-border/40 text-xs flex justify-between items-center">
                <span className="text-muted-foreground">Current Available Balance:</span>
                <span className="font-bold text-sm text-foreground">
                  {isBoltzman 
                    ? `${Math.floor(Number(selectedTargetClient.wallet_balance || selectedTargetClient.credits_available || 0)).toLocaleString()} Credits` 
                    : `₹${Number(selectedTargetClient.wallet_balance || selectedTargetClient.credits_available || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Action Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={modalAction === 'add' ? 'default' : 'outline'}
                  onClick={() => setModalAction('add')}
                  className={cn("rounded-xl", modalAction === 'add' ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "")}
                >
                  <ArrowDownRight className="w-4 h-4 mr-1.5" /> Add Credits
                </Button>
                <Button
                  type="button"
                  variant={modalAction === 'deduct' ? 'default' : 'outline'}
                  onClick={() => setModalAction('deduct')}
                  className={cn("rounded-xl", modalAction === 'deduct' ? "bg-rose-600 hover:bg-rose-700 text-white" : "")}
                >
                  <ArrowUpRight className="w-4 h-4 mr-1.5" /> Deduct Credits
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isBoltzman ? 'Credits Amount' : 'Amount (₹)'}
              </Label>
              <Input
                type="number"
                min="1"
                step="any"
                placeholder="Enter credit amount (e.g. 500)"
                value={modalAmount}
                onChange={(e) => setModalAmount(e.target.value)}
                className="rounded-xl text-base font-semibold"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description / Remarks (Optional)</Label>
              <Textarea
                placeholder="E.g., Monthly credit allocation, top-up recharge, correction..."
                value={modalDescription}
                onChange={(e) => setModalDescription(e.target.value)}
                className="rounded-xl resize-none text-xs"
                rows={2}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsManageModalOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmittingCredit} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmittingCredit ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                Confirm {modalAction === 'add' ? 'Allocation' : 'Deduction'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200 bg-card">
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className={cn("text-2xl font-bold", color)}>{value}</p>
        </div>
        <div className={cn("p-3 rounded-xl", bg)}>
          <Icon className={cn("w-6 h-6", color)} />
        </div>
      </CardContent>
    </Card>
  );
}
