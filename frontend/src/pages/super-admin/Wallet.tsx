import { useState, useEffect } from 'react';
import { Search, Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard, DollarSign, Wallet as WalletIcon, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api`;

export default function SuperAdminWallet() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'refund'>('add');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    clientId: '',
    amount: 0,
    description: '',
  });

  // Fetch transactions
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/wallet/transactions`);
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

  // Fetch clients for dropdown
  const fetchClients = async () => {
    try {
      const res = await axios.get(`${API_URL}/clients`);
      if (res.data.success) {
        setClients(res.data.clients || []);
      }
    } catch (err) {
      console.error('Failed to load clients');
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchClients();
  }, []);

  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = txn.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || txn.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'purchase': return <ArrowUpRight className="w-4 h-4 text-primary" />;
      case 'deduction': return <ArrowDownLeft className="w-4 h-4 text-destructive" />;
      case 'refund': return <RefreshCw className="w-4 h-4 text-warning" />;
      case 'adjustment': return <CreditCard className="w-4 h-4 text-secondary" />;
      default: return null;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'bg-primary/10 text-primary';
      case 'deduction': return 'bg-destructive/10 text-destructive';
      case 'refund': return 'bg-warning/10 text-warning';
      case 'adjustment': return 'bg-secondary/10 text-secondary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const totalPurchases = transactions.filter(t => t.type === 'purchase').reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalCreditsIssued = transactions.filter(t => (t.credits || 0) > 0).reduce((acc, t) => acc + (t.credits || 0), 0);
  const totalDeductions = transactions.filter(t => t.type === 'deduction').reduce((acc, t) => acc + Math.abs(t.credits || 0), 0);

  const handleAdjustment = async () => {
    if (!adjustForm.clientId || adjustForm.amount <= 0 || !adjustForm.description.trim()) {
      toast({
        title: 'Validation Error',
        description: 'All fields are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        user_id: adjustForm.clientId,
        type: adjustType === 'add' ? 'adjustment' : 'refund',
        credits: adjustType === 'add' ? adjustForm.amount : -adjustForm.amount, // For refund, negative credits?
        description: adjustForm.description,
      };
      const res = await axios.post(`${API_URL}/wallet/adjust`, payload);
      if (res.data.success) {
        toast({
          title: adjustType === 'add' ? 'Credits Added' : 'Refund Processed',
          description: 'Transaction completed successfully.',
        });
        setIsAdjustOpen(false);
        setAdjustForm({ clientId: '', amount: 0, description: '' });
        fetchTransactions(); // Refresh
      } else {
        toast({ title: 'Failed', description: res.data.message || 'Could not process', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Wallet / Credits</h1>
          <p className="text-muted-foreground">Manage credit transactions and adjustments</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => {
              setAdjustType('refund');
              setIsAdjustOpen(true);
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refund Credits
          </Button>
          <Button 
            className="gradient-primary"
            onClick={() => {
              setAdjustType('add');
              setIsAdjustOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Credits
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Purchases</div>
                <div className="text-xl font-bold">${totalPurchases.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Credits Issued</div>
                <div className="text-xl font-bold">{totalCreditsIssued.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Credits Deducted</div>
                <div className="text-xl font-bold">{totalDeductions.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <WalletIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Transactions</div>
                <div className="text-xl font-bold">{transactions.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by client or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="purchase">Purchases</SelectItem>
                <SelectItem value="deduction">Deductions</SelectItem>
                <SelectItem value="refund">Refunds</SelectItem>
                <SelectItem value="adjustment">Adjustments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Transaction History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Loading transactions...</p>
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(txn.type)}
                        <Badge className={cn('text-xs capitalize', getTypeColor(txn.type))}>
                          {txn.type}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{txn.client_name || txn.clientName}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[300px] truncate">
                      {txn.description}
                    </TableCell>
                    <TableCell className="text-right">
                      {txn.amount > 0 ? `$${txn.amount.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className={cn(
                      'text-right font-medium',
                      (txn.credits || 0) > 0 ? 'text-primary' : 'text-destructive'
                    )}>
                      {txn.credits > 0 ? '+' : ''}{txn.credits.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {txn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(txn.created_at || txn.createdAt), 'MMM d, HH:mm')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adjust Credits Dialog */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {adjustType === 'add' ? 'Add Credits' : 'Refund Credits'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Select
                value={adjustForm.clientId}
                onValueChange={(v) => setAdjustForm(prev => ({ ...prev, clientId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id.toString()}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Credits Amount</Label>
              <Input 
                type="number" 
                placeholder="Enter credits amount" 
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason / Description</Label>
              <Input 
                placeholder="Enter reason for adjustment" 
                value={adjustForm.description}
                onChange={(e) => setAdjustForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
            <Button 
              className={adjustType === 'add' ? 'gradient-primary' : ''} 
              variant={adjustType === 'refund' ? 'outline' : 'default'}
              onClick={handleAdjustment}
            >
              {adjustType === 'add' ? 'Add Credits' : 'Process Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}