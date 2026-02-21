import { useState, useEffect } from 'react';
import { Search, ArrowUpRight, ArrowDownLeft, Wallet as WalletIcon, Loader2, Filter, History } from 'lucide-react';
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

const API_URL = `${API_BASE_URL}/api`;

export default function Wallet() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/wallet/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTransactions(res.data.transactions || []);
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
    fetchTransactions();
    refreshUser(); // Sync balance with DB
  }, []);

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

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Wallet & Credits</h1>
          <p className="text-muted-foreground">Monitor your credit usage and transaction history</p>
        </div>
        <Button variant="outline" onClick={fetchTransactions} className="hidden sm:flex self-start">
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
                <div className="text-4xl font-bold">₹{(user?.wallet_balance || 0).toLocaleString()}</div>
              </div>
              <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                <WalletIcon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="mt-6 flex items-center gap-2 text-xs text-primary-foreground/70">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Last updated just now
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-emerald-500/5 dark:bg-emerald-500/10">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Total Added</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                ₹{transactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + parseFloat(t.amount || 0), 0).toLocaleString()}
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
                ₹{transactions.filter(t => t.type === 'debit').reduce((acc, t) => acc + parseFloat(t.amount || 0), 0).toLocaleString()}
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
                  <TableHead className="text-right">Amount (₹)</TableHead>
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
                        <p className="text-sm font-medium leading-none">{txn.description}</p>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{txn.status}</p>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-bold tabular-nums",
                        txn.type === 'credit' ? "text-emerald-600" : "text-rose-600"
                      )}>
                        {txn.type === 'credit' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString()}
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
      </Card>
    </div>
  );
}
