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
    <div className="space-y-4 p-3.5 sm:p-5 min-h-screen max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 dark:from-zinc-100 dark:to-zinc-400 bg-clip-text text-transparent">
            {isReseller ? 'Manage User Credits' : 'Credit Ledger & Management'}
          </h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {isReseller 
              ? 'Real-time tracking of credits allocated to your clients and transaction history.'
              : 'Comprehensive track of all credit allocations, debits, and transfers across all accounts.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(isAdmin || isReseller) && (
            <Button 
              onClick={() => setIsManageModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-lg h-8 text-xs px-3 font-medium"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              {isReseller ? 'Allocate Credits to Client' : 'Manage / Allocate Credits'}
            </Button>
          )}
          <Button variant="outline" onClick={activeTab === 'ledger' ? handleExportCSV : handleExportMonthlyCSV} className="rounded-lg h-8 text-xs px-3 hidden sm:flex">
            <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border/60 space-x-4 pt-0.5">
        <button
          onClick={() => setActiveTab('ledger')}
          className={cn(
            "pb-2 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5",
            activeTab === 'ledger'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <CreditCard className="w-3.5 h-3.5" />
          {isReseller ? 'Transaction History & Allocation' : 'Live Credit Ledger & Transactions'}
        </button>
        <button
          onClick={() => setActiveTab('monthly_summary')}
          className={cn(
            "pb-2 text-xs font-semibold transition-all border-b-2 flex items-center gap-1.5",
            activeTab === 'monthly_summary'
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Calendar className="w-3.5 h-3.5" />
          Monthly Reseller Billing & Usage Summary
        </button>
      </div>

      {activeTab === 'ledger' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          <Card className="border shadow-xs bg-card">
            <div className="p-3 border-b flex flex-col sm:flex-row gap-3 items-center justify-between bg-muted/20 rounded-t-xl">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or description..."
                  className="pl-8 h-8 text-xs bg-background border-border focus:border-primary/50 transition-all rounded-lg"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Filter className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
                <Select value={selectedUserId} onValueChange={(val) => { setSelectedUserId(val); setPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[200px] h-8 text-xs bg-background rounded-lg">
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
                  <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs bg-background rounded-lg">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credits (In)</SelectItem>
                    <SelectItem value="debit">Debits (Out)</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => fetchLedger()} className="h-8 w-8 rounded-lg">
                  <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-b-xl">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="py-2 text-[10px] font-bold uppercase text-muted-foreground w-[90px]">Type</TableHead>
                    <TableHead className="py-2 text-[10px] font-bold uppercase text-muted-foreground">Account / User</TableHead>
                    <TableHead className="py-2 text-[10px] font-bold uppercase text-muted-foreground">Managed By / Source</TableHead>
                    <TableHead className="py-2 text-[10px] font-bold uppercase text-muted-foreground">Description</TableHead>
                    <TableHead className="py-2 text-[10px] font-bold uppercase text-muted-foreground text-right">Amount</TableHead>
                    <TableHead className="py-2 text-[10px] font-bold uppercase text-muted-foreground text-right">Date & Time</TableHead>
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
                        <TableCell className="py-2.5 px-3">
                          {item.type === 'credit' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30 gap-1 rounded-full text-[10px] px-2 py-0.5">
                              <ArrowDownRight className="w-3 h-3" /> Credit
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200 dark:border-rose-800/30 gap-1 rounded-full text-[10px] px-2 py-0.5">
                              <ArrowUpRight className="w-3 h-3" /> Debit
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 px-3">
                          <div className="font-semibold text-xs text-foreground">{item.owner_name || 'N/A'}</div>
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5 font-mono">
                            <span>{item.owner_email || ''}</span>
                            {item.owner_role && (
                              <span className="bg-muted px-1.5 py-0.2 rounded text-[9px] uppercase font-semibold text-muted-foreground">
                                {item.owner_role}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 px-3">
                          {item.reseller_name ? (
                            <>
                              <div className="font-medium text-xs text-foreground">{item.reseller_name}</div>
                              {item.reseller_email && <div className="text-[10px] text-muted-foreground font-mono">{item.reseller_email}</div>}
                            </>
                          ) : isReseller ? (
                            <>
                              <div className="font-medium text-xs text-foreground">{user?.name || 'Reseller'}</div>
                              <div className="text-[10px] text-muted-foreground font-mono">{user?.email || ''}</div>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">System / Super Admin</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 px-3 max-w-[280px]" title={item.description}>
                          <span className="text-xs text-foreground/80 line-clamp-2">{item.description}</span>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-right">
                          <span className={cn(
                            "font-bold text-xs font-mono",
                            item.type === 'credit' ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                          )}>
                            {item.type === 'credit' ? '+' : '-'}
                            {isBoltzman 
                              ? `${Math.floor(parseFloat(item.amount || 0)).toLocaleString()} Credits` 
                              : `₹${parseFloat(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5 px-3 text-right text-[11px] font-mono text-muted-foreground whitespace-nowrap">
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
        <div className="space-y-4">
          {/* Filter Bar & Header */}
          <Card className="border border-border/50 shadow-xs bg-card/80 backdrop-blur-md p-3.5 rounded-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {isAdmin && (
                  <div className="space-y-1 w-full sm:w-[220px]">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-indigo-500" /> Select Reseller
                    </Label>
                    <Select value={summaryResellerId} onValueChange={(val) => { setSummaryResellerId(val); setSummaryClientId('all'); }}>
                      <SelectTrigger className="rounded-lg h-8 text-xs border-border/60 bg-background/50 font-medium">
                        <SelectValue placeholder="Choose Reseller" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="font-semibold text-indigo-600 text-xs">
                          ✨ All Resellers ({monthlyData?.resellers?.length || 0})
                        </SelectItem>
                        {monthlyData?.resellers?.map((r: any) => (
                          <SelectItem key={r.id} value={r.id.toString()} className="text-xs">
                            {r.name} ({r.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1 w-full sm:w-[220px]">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Users className="w-3 h-3 text-indigo-500" /> Select Client Account
                  </Label>
                  <Select value={summaryClientId} onValueChange={setSummaryClientId}>
                    <SelectTrigger className="rounded-lg h-8 text-xs border-border/60 bg-background/50 font-medium">
                      <SelectValue placeholder="All Clients" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-semibold text-indigo-600 text-xs">
                        👥 All Clients ({monthlyData?.clients?.length || 0})
                      </SelectItem>
                      {monthlyData?.clients?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id.toString()} className="text-xs">
                          {c.name} ({c.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 w-full sm:w-[160px]">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-500" /> Billing Month
                  </Label>
                  <Input 
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="rounded-lg h-8 text-xs border-border/60 bg-background/50 font-medium"
                  />
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => fetchMonthlySummary()} 
                    className="rounded-lg h-8 w-8 border-border/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600"
                    title="Refresh Data"
                  >
                    <RefreshCw className={cn("w-3.5 h-3.5", loadingMonthlySummary && "animate-spin")} />
                  </Button>
                </div>
              </div>

              {monthlyData?.reseller ? (
                <div className="flex items-center gap-2.5 p-2 px-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent rounded-xl border border-indigo-200/40 dark:border-indigo-800/30">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {monthlyData.reseller.name?.charAt(0)?.toUpperCase() || 'R'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-bold text-xs text-foreground">{monthlyData.reseller.name}</p>
                      <Badge className="bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-[9px] px-1.5 py-0 border-none font-semibold">
                        Reseller
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono">{monthlyData.reseller.email}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 p-2 px-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent rounded-xl border border-indigo-200/40 dark:border-indigo-800/30">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-bold text-xs text-indigo-900 dark:text-indigo-200">System Reseller Overview</p>
                    <p className="text-[10px] text-muted-foreground">Aggregated monthly analytics & client usage</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {loadingMonthlySummary ? (
            <Card className="border-none shadow-lg p-16 text-center rounded-2xl bg-card">
              <Loader2 className="w-10 h-10 animate-spin mx-auto text-indigo-600" />
              <p className="text-base font-medium text-foreground mt-4">Generating Monthly Billing Breakdown...</p>
              <p className="text-xs text-muted-foreground mt-1">Fetching credit transfers, campaign usage, and channel distribution.</p>
            </Card>
          ) : !monthlyData?.summary ? (
            <Card className="border-none shadow-lg p-16 text-center text-muted-foreground rounded-2xl bg-card">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="font-bold text-lg text-foreground">No Billing Data Found</h4>
              <p className="text-sm mt-1">There are no records for the selected reseller or month.</p>
            </Card>
          ) : (
            <>
              {/* Compact & Premium KPI Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="relative overflow-hidden border border-emerald-200/60 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-500/5 via-card to-card p-4 rounded-xl shadow-xs hover:shadow-sm transition-all duration-300 group">
                  <div className="flex items-center justify-between relative z-10 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Admin Transferred (In)</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <ArrowDownRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="relative z-10 space-y-0.5">
                    <h3 className="text-xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.adminAllocatedCredits).toLocaleString()} Credits` : `₹${monthlyData.summary.adminAllocatedCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">Credits Inflow</span>
                      <span className="text-[10px] bg-emerald-100/60 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">Received</span>
                    </div>
                  </div>
                </Card>

                <Card className="relative overflow-hidden border border-blue-200/60 dark:border-blue-900/40 bg-gradient-to-br from-blue-500/5 via-card to-card p-4 rounded-xl shadow-xs hover:shadow-sm transition-all duration-300 group">
                  <div className="flex items-center justify-between relative z-10 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Allocated to Clients</span>
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="relative z-10 space-y-0.5">
                    <h3 className="text-xl font-bold tracking-tight text-blue-700 dark:text-blue-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.resellerAllocatedCredits).toLocaleString()} Credits` : `₹${monthlyData.summary.resellerAllocatedCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="font-medium text-blue-600 dark:text-blue-400">Client Allocation</span>
                      <span className="text-[10px] bg-blue-100/60 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium">Distributed</span>
                    </div>
                  </div>
                </Card>

                <Card className="relative overflow-hidden border border-rose-200/60 dark:border-rose-900/40 bg-gradient-to-br from-rose-500/5 via-card to-card p-4 rounded-xl shadow-xs hover:shadow-sm transition-all duration-300 group">
                  <div className="flex items-center justify-between relative z-10 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Total Spent by Clients</span>
                    <div className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="relative z-10 space-y-0.5">
                    <h3 className="text-xl font-bold tracking-tight text-rose-700 dark:text-rose-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.totalSpentCredits).toLocaleString()} Credits` : `₹${monthlyData.summary.totalSpentCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="font-medium text-rose-600 dark:text-rose-400">Campaign Usage</span>
                      <span className="text-[10px] bg-rose-100/60 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded font-medium">Consumed</span>
                    </div>
                  </div>
                </Card>

                <Card className="relative overflow-hidden border border-indigo-200/60 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-500/5 via-card to-card p-4 rounded-xl shadow-xs hover:shadow-sm transition-all duration-300 group">
                  <div className="flex items-center justify-between relative z-10 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Available Wallet Balance</span>
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="relative z-10 space-y-0.5">
                    <h3 className="text-xl font-bold tracking-tight text-indigo-700 dark:text-indigo-300">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.resellerCurrentBalance).toLocaleString()} Credits` : `₹${monthlyData.summary.resellerCurrentBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">Current Reserve</span>
                      <span className="text-[10px] bg-indigo-100/60 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-medium">Active</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Channel Breakdown Cards */}
              <Card className="border border-border/50 shadow-md bg-card/80 backdrop-blur-md p-6 rounded-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-border/40">
                  <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                      <PieChart className="w-5 h-5 text-indigo-600" />
                      Channel Consumption Breakdown
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Detailed credit expenditure by channel for {format(new Date(`${selectedMonth}-01`), 'MMMM yyyy')}
                    </p>
                  </div>
                  <Badge variant="outline" className="w-fit bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/40 px-3 py-1 font-semibold rounded-xl">
                    Total Spent: {isBoltzman ? `${Math.floor(monthlyData.summary.totalSpentCredits).toLocaleString()} Credits` : `₹${monthlyData.summary.totalSpentCredits.toLocaleString()}`}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* WhatsApp Card */}
                  <div className="p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/40 bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300">
                        <MessageSquare className="w-4 h-4 text-emerald-600" /> WhatsApp
                      </span>
                      <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 border-none font-bold">WA</Badge>
                    </div>
                    <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.channelBreakdown.whatsapp).toLocaleString()} Credits` : `₹${monthlyData.summary.channelBreakdown.whatsapp.toLocaleString()}`}
                    </p>
                    <div className="w-full bg-emerald-200/50 dark:bg-emerald-950/60 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${monthlyData.summary.totalSpentCredits ? Math.min(100, Math.round((monthlyData.summary.channelBreakdown.whatsapp / monthlyData.summary.totalSpentCredits) * 100)) : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 font-medium text-right">
                      {monthlyData.summary.totalSpentCredits ? Math.round((monthlyData.summary.channelBreakdown.whatsapp / monthlyData.summary.totalSpentCredits) * 100) : 0}% of total spent
                    </p>
                  </div>

                  {/* RCS Card */}
                  <div className="p-4 rounded-2xl border border-blue-200/80 dark:border-blue-800/40 bg-gradient-to-b from-blue-500/10 via-blue-500/5 to-transparent space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300">
                        <Send className="w-4 h-4 text-blue-600" /> RCS Messages
                      </span>
                      <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0.5 border-none font-bold">RCS</Badge>
                    </div>
                    <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.channelBreakdown.rcs).toLocaleString()} Credits` : `₹${monthlyData.summary.channelBreakdown.rcs.toLocaleString()}`}
                    </p>
                    <div className="w-full bg-blue-200/50 dark:bg-blue-950/60 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${monthlyData.summary.totalSpentCredits ? Math.min(100, Math.round((monthlyData.summary.channelBreakdown.rcs / monthlyData.summary.totalSpentCredits) * 100)) : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 font-medium text-right">
                      {monthlyData.summary.totalSpentCredits ? Math.round((monthlyData.summary.channelBreakdown.rcs / monthlyData.summary.totalSpentCredits) * 100) : 0}% of total spent
                    </p>
                  </div>

                  {/* SMS Card */}
                  <div className="p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/40 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                        <FileText className="w-4 h-4 text-amber-600" /> SMS / DLT
                      </span>
                      <Badge className="bg-amber-600 text-white text-[10px] px-2 py-0.5 border-none font-bold">SMS</Badge>
                    </div>
                    <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.channelBreakdown.sms).toLocaleString()} Credits` : `₹${monthlyData.summary.channelBreakdown.sms.toLocaleString()}`}
                    </p>
                    <div className="w-full bg-amber-200/50 dark:bg-amber-950/60 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${monthlyData.summary.totalSpentCredits ? Math.min(100, Math.round((monthlyData.summary.channelBreakdown.sms / monthlyData.summary.totalSpentCredits) * 100)) : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium text-right">
                      {monthlyData.summary.totalSpentCredits ? Math.round((monthlyData.summary.channelBreakdown.sms / monthlyData.summary.totalSpentCredits) * 100) : 0}% of total spent
                    </p>
                  </div>

                  {/* Other Card */}
                  <div className="p-4 rounded-2xl border border-purple-200/80 dark:border-purple-800/40 bg-gradient-to-b from-purple-500/10 via-purple-500/5 to-transparent space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-purple-800 dark:text-purple-300">
                        <Zap className="w-4 h-4 text-purple-600" /> Other / Adjustments
                      </span>
                      <Badge className="bg-purple-600 text-white text-[10px] px-2 py-0.5 border-none font-bold">Misc</Badge>
                    </div>
                    <p className="text-2xl font-extrabold text-purple-700 dark:text-purple-400">
                      {isBoltzman ? `${Math.floor(monthlyData.summary.channelBreakdown.other).toLocaleString()} Credits` : `₹${monthlyData.summary.channelBreakdown.other.toLocaleString()}`}
                    </p>
                    <div className="w-full bg-purple-200/50 dark:bg-purple-950/60 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-purple-600 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${monthlyData.summary.totalSpentCredits ? Math.min(100, Math.round((monthlyData.summary.channelBreakdown.other / monthlyData.summary.totalSpentCredits) * 100)) : 0}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-purple-700/80 dark:text-purple-400/80 font-medium text-right">
                      {monthlyData.summary.totalSpentCredits ? Math.round((monthlyData.summary.channelBreakdown.other / monthlyData.summary.totalSpentCredits) * 100) : 0}% of total spent
                    </p>
                  </div>
                </div>
              </Card>

              {/* Per-Client Monthly Breakdown Table */}
              <Card className="border border-border/50 shadow-md bg-card rounded-2xl overflow-hidden">
                <div className="p-4 px-6 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-muted/20">
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Client-Wise Monthly Consumption ({monthlyData.summary.clientBreakdown?.length || 0} Clients)
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Individual allocation and usage report for each client</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportMonthlyCSV} 
                    className="rounded-xl border-border/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600 font-medium"
                  >
                    <Download className="w-4 h-4 mr-2" /> Export Client Report (CSV)
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow className="border-b border-border/50">
                        <TableHead className="font-bold text-foreground py-3.5 pl-6">Client Account</TableHead>
                        <TableHead className="font-bold text-foreground text-right">Allocated (Month)</TableHead>
                        <TableHead className="font-bold text-emerald-700 dark:text-emerald-400 text-right">WhatsApp</TableHead>
                        <TableHead className="font-bold text-blue-700 dark:text-blue-400 text-right">RCS</TableHead>
                        <TableHead className="font-bold text-amber-700 dark:text-amber-400 text-right">SMS</TableHead>
                        <TableHead className="font-bold text-rose-700 dark:text-rose-400 text-right">Total Spent</TableHead>
                        <TableHead className="font-bold text-foreground text-right pr-6">Current Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!monthlyData.summary.clientBreakdown?.length ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-36 text-center text-muted-foreground">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <Users className="w-8 h-8 text-muted-foreground/50 mb-1" />
                              <p className="font-medium text-sm">No client accounts found under this reseller.</p>
                              <p className="text-xs text-muted-foreground">Clients created by this reseller will appear here automatically.</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        monthlyData.summary.clientBreakdown.map((client: any) => (
                          <TableRow key={client.id} className="hover:bg-muted/30 transition-colors border-b border-border/30">
                            <TableCell className="pl-6 py-3.5">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                  {client.name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                  <p className="font-semibold text-sm text-foreground">{client.name}</p>
                                  <p className="text-xs text-muted-foreground">{client.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-800/40 text-xs">
                                +{isBoltzman ? `${Math.floor(client.allocated).toLocaleString()} Credits` : `₹${client.allocated.toLocaleString()}`}
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                              {isBoltzman ? `${Math.floor(client.whatsappSpent).toLocaleString()} Credits` : `₹${client.whatsappSpent.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-blue-700 dark:text-blue-400">
                              {isBoltzman ? `${Math.floor(client.rcsSpent).toLocaleString()} Credits` : `₹${client.rcsSpent.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-right text-xs font-semibold text-amber-700 dark:text-amber-400">
                              {isBoltzman ? `${Math.floor(client.smsSpent).toLocaleString()} Credits` : `₹${client.smsSpent.toLocaleString()}`}
                            </TableCell>
                            <TableCell className="text-right font-bold text-rose-600 dark:text-rose-400">
                              <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg border border-rose-200/50 dark:border-rose-800/40 text-xs">
                                -{isBoltzman ? `${Math.floor(client.spent).toLocaleString()} Credits` : `₹${client.spent.toLocaleString()}`}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-foreground pr-6">
                              <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200/50 dark:border-indigo-800/40 text-xs text-indigo-700 dark:text-indigo-300">
                                {isBoltzman ? `${Math.floor(client.currentBalance).toLocaleString()} Credits` : `₹${client.currentBalance.toLocaleString()}`}
                              </span>
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
    <Card className="border shadow-xs hover:shadow-sm transition-all duration-200 bg-card">
      <CardContent className="p-3.5 flex items-center justify-between">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
          <p className={cn("text-xl font-bold tracking-tight truncate", color)}>{value}</p>
        </div>
        <div className={cn("p-2 rounded-lg shrink-0", bg)}>
          <Icon className={cn("w-4 h-4", color)} />
        </div>
      </CardContent>
    </Card>
  );
}
