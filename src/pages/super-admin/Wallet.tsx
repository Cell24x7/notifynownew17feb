import { useState } from 'react';
import { Search, Plus, ArrowUpRight, ArrowDownLeft, RefreshCw, CreditCard, DollarSign, Wallet as WalletIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { mockWalletTransactions, mockClients, WalletTransaction } from '@/lib/superAdminMockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminWallet() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'add' | 'refund'>('add');

  const filteredTransactions = mockWalletTransactions.filter(txn => {
    const matchesSearch = txn.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      txn.description.toLowerCase().includes(searchQuery.toLowerCase());
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

  const totalPurchases = mockWalletTransactions.filter(t => t.type === 'purchase').reduce((acc, t) => acc + t.amount, 0);
  const totalCreditsIssued = mockWalletTransactions.filter(t => t.credits > 0).reduce((acc, t) => acc + t.credits, 0);
  const totalDeductions = mockWalletTransactions.filter(t => t.type === 'deduction').reduce((acc, t) => acc + Math.abs(t.credits), 0);

  const handleAdjustment = () => {
    toast({
      title: adjustType === 'add' ? 'Credits Added' : 'Refund Processed',
      description: 'Transaction completed successfully.',
    });
    setIsAdjustOpen(false);
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
                <div className="text-xl font-bold">{mockWalletTransactions.length}</div>
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
              {filteredTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(txn.type)}
                      <Badge className={cn('text-xs capitalize', getTypeColor(txn.type))}>
                        {txn.type}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{txn.clientName}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">
                    {txn.description}
                  </TableCell>
                  <TableCell className="text-right">
                    {txn.amount > 0 ? `$${txn.amount.toLocaleString()}` : '-'}
                  </TableCell>
                  <TableCell className={cn(
                    'text-right font-medium',
                    txn.credits > 0 ? 'text-primary' : 'text-destructive'
                  )}>
                    {txn.credits > 0 ? '+' : ''}{txn.credits.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {txn.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(txn.createdAt), 'MMM d, HH:mm')}
                  </TableCell>
                </TableRow>
              ))}
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
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {mockClients.map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Credits Amount</Label>
              <Input type="number" placeholder="Enter credits amount" />
            </div>

            <div className="space-y-2">
              <Label>Reason / Description</Label>
              <Input placeholder="Enter reason for adjustment" />
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
