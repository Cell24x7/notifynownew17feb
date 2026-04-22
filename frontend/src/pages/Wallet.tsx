import { useState, useEffect } from 'react';
import { Search, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Loader2, Filter, History, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';
import { ChannelBadge } from '@/components/ui/channel-icon';
import { walletApi } from '@/services/walletApi';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

const API_URL = `${API_BASE_URL}/api`;

export default function Wallet() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [rechargeAmount, setRechargeAmount] = useState('1000');
  const [isRechargeLoading, setIsRechargeLoading] = useState(false);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  
  // Pagination states
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const ITEMS_PER_PAGE = 20;

  const fetchTransactions = async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/wallet/transactions?page=${pageNum}&limit=${ITEMS_PER_PAGE}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTransactions(res.data.transactions || []);
        setTotal(res.data.pagination?.total || 0);
      } else {
        toast({ title: 'Error', description: res.data.message || 'Failed to load transactions', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Failed to load',
        description: err.response?.data?.message || 'Could not connect to server',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(page);
  }, [page]);

  useEffect(() => {
    refreshUser(); // Sync balance with DB
    
    // Check for payment status in URL
    const status = searchParams.get('status');
    const amt = searchParams.get('amt');
    if (status === 'success') {
        toast({
            title: 'Recharge Successful!',
            description: `₹${amt} has been added to your wallet.`,
            className: "bg-emerald-500 text-white border-none"
        });
    } else if (status === 'failed') {
        toast({
            title: 'Payment Failed',
            description: 'The transaction could not be completed. Please try again.',
            variant: 'destructive'
        });
    }
  }, [searchParams]);

  const handleInitiatePayment = async () => {
    if (!rechargeAmount || isNaN(Number(rechargeAmount)) || Number(rechargeAmount) < 1) {
        toast({ title: 'Invalid Amount', description: 'Minimum recharge amount is ₹1', variant: 'destructive' });
        return;
    }

    setIsRechargeLoading(true);
    try {
        const res = await walletApi.ccavenueInitiate(Number(rechargeAmount));
        if (res.success) {
            // Create a hidden form and submit it to CCAvenue
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = res.gateway_url;

            const encInput = document.createElement('input');
            encInput.type = 'hidden';
            encInput.name = 'encRequest';
            encInput.value = res.enc_request;
            form.appendChild(encInput);

            const accessInput = document.createElement('input');
            accessInput.type = 'hidden';
            accessInput.name = 'access_code';
            accessInput.value = res.access_code;
            form.appendChild(accessInput);

            document.body.appendChild(form);
            form.submit();
        } else {
            toast({ title: 'Payment Initiation Failed', description: res.message || 'Something went wrong', variant: 'destructive' });
        }
    } catch (err: any) {
        toast({ 
            title: 'Error', 
            description: err.response?.data?.message || 'Failed to connect to payment gateway', 
            variant: 'destructive' 
        });
    } finally {
        setIsRechargeLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = txn.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || txn.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'credit': return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
      case 'debit': return <ArrowDownLeft className="w-4 h-4 text-rose-500" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'credit': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'debit': return 'bg-rose-500/10 text-rose-600 border-rose-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const detectChannel = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('whatsapp')) return 'whatsapp';
    if (desc.includes('rcs')) return 'rcs';
    if (desc.includes('sms')) return 'sms';
    if (desc.includes('voice') || desc.includes('voicebot')) return 'voicebot';
    if (desc.includes('email')) return 'email';
    return null;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Wallet & Credits</h1>
          <p className="text-muted-foreground">Monitor your credit usage and transaction history</p>
        </div>
        <Button variant="outline" onClick={() => fetchTransactions(page)} className="hidden sm:flex self-start">
          <History className="w-4 h-4 mr-2" /> Refresh History
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-primary/90 to-primary text-primary-foreground">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-primary-foreground/80 text-sm font-medium">Available Balance</p>
                <div className="text-4xl font-bold">
                  {(user?.role === 'admin' || user?.role === 'superadmin') 
                    ? 'Unlimited' 
                    : `₹${(user?.wallet_balance || 0).toLocaleString()}`}
                </div>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <WalletIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            
            {user?.role !== 'admin' && user?.role !== 'superadmin' && (
                <div className="mt-4">
                    <Dialog open={isRechargeOpen} onOpenChange={setIsRechargeOpen}>
                        <DialogTrigger asChild>
                            <Button variant="secondary" className="w-full bg-white text-primary hover:bg-white/90 font-bold border-none shadow-sm">
                                <CreditCard className="w-4 h-4 mr-2" /> Top-up Wallet
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-2xl">
                                    <CreditCard className="w-6 h-6 text-primary" />
                                    Recharge Wallet
                                </DialogTitle>
                                <DialogDescription>
                                    Add funds to your wallet instantly via CCAvenue Secure Gateway.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium leading-none">Enter Amount (INR)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">₹</span>
                                        <Input
                                            type="number"
                                            value={rechargeAmount}
                                            onChange={(e) => setRechargeAmount(e.target.value)}
                                            className="pl-8 text-lg font-bold h-12"
                                            placeholder="Min. 100"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mt-2">
                                        {['500', '1000', '5000'].map(amt => (
                                            <Button 
                                                key={amt} 
                                                variant="outline" 
                                                size="sm" 
                                                className="h-8 font-bold"
                                                onClick={() => setRechargeAmount(amt)}
                                            >
                                                +₹{amt}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-lg flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                    <p className="text-xs text-muted-foreground">
                                        You will be redirected to CCAvenue secure payment page to complete your transaction.
                                    </p>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button 
                                    className="w-full h-12 text-lg font-bold" 
                                    onClick={handleInitiatePayment}
                                    disabled={isRechargeLoading}
                                >
                                    {isRechargeLoading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                                    ) : (
                                        `Pay ₹${Number(rechargeAmount || 0).toLocaleString()}`
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            )}

            <div className="mt-4 flex items-center gap-2 text-xs text-primary-foreground/70">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Secure Payment Gateway Active
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-emerald-500/5 dark:bg-emerald-500/10">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Added</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                {"\u20B9"}{transactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + parseFloat(t.amount || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-xl">
              <ArrowUpRight className="w-6 h-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-rose-500/5 dark:bg-rose-500/10">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Total Spent</p>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                {"\u20B9"}{transactions.filter(t => t.type === 'debit').reduce((acc, t) => acc + parseFloat(t.amount || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-rose-500/10 rounded-xl">
              <ArrowDownLeft className="w-6 h-6 text-rose-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Section */}
      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-4 sm:p-6 border-b bg-muted/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Recent Transactions
            </CardTitle>
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-background focus:ring-1"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px] h-9">
                  <Filter className="w-3.5 h-3.5 mr-2" />
                  <SelectValue placeholder="All Flows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Flows</SelectItem>
                  <SelectItem value="credit">Added (In)</SelectItem>
                  <SelectItem value="debit">Spent (Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[180px]">Transaction Type</TableHead>
                  <TableHead>Description</TableHead>
                   <TableHead className="text-right">Amount ({"\u20B9"})</TableHead>
                  <TableHead className="text-right">Date & Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground font-medium">Loading your transactions...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                      No transactions found for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((txn) => (
                    <TableRow key={txn.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1.5 rounded-lg", txn.type === 'credit' ? "bg-emerald-500/10" : "bg-rose-500/10")}>
                            {getTypeIcon(txn.type)}
                          </div>
                          <Badge variant="outline" className={cn("capitalize text-[10px] font-bold tracking-tight", getTypeColor(txn.type))}>
                            {txn.type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[400px]">
                        <div className="flex items-start gap-2">
                           {detectChannel(txn.description) && (
                               <ChannelBadge channel={detectChannel(txn.description)!} className="shrink-0 mt-0.5" />
                           )}
                           <div className="min-w-0">
                                <p className="text-sm font-medium leading-tight break-words">{txn.description}</p>
                                <p className="text-[10px] text-muted-foreground mt-1 font-mono uppercase tracking-wider">{txn.status}</p>
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold tabular-nums",
                        txn.type === 'credit' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {txn.type === 'credit' ? '+' : '-'}{"\u20B9"}{parseFloat(txn.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {format(new Date(txn.created_at), 'MMM d, yyyy')}
                        <br />
                        <span className="text-[10px] opacity-70">{format(new Date(txn.created_at), 'HH:mm')}</span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {total > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/10">
            <div className="text-sm text-muted-foreground whitespace-nowrap">
              Showing <span className="font-medium">{((page - 1) * ITEMS_PER_PAGE) + 1}</span> to{' '}
              <span className="font-medium">{Math.min(page * ITEMS_PER_PAGE, total)}</span> of{' '}
              <span className="font-medium">{total}</span> results
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="h-8 px-2"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="h-8 px-3 font-bold bg-white">
                  Page {page} of {Math.ceil(total / ITEMS_PER_PAGE)}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === Math.ceil(total / ITEMS_PER_PAGE)}
                className="h-8 px-2"
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
