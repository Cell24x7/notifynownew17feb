import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CreditCard, History, Plus, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ManageBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any | null;
  onSuccess: () => void;
}

export function ManageBalanceModal({ isOpen, onClose, client, onSuccess }: ManageBalanceModalProps) {
  const [activeTab, setActiveTab] = useState('manage');
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'add' | 'deduct'>('add');
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTx, setLoadingTx] = useState(false);

  useEffect(() => {
    if (isOpen && client && activeTab === 'history') {
      fetchTransactions();
    }
  }, [isOpen, client, activeTab]);

  const fetchTransactions = async () => {
    if (!client) return;
    setLoadingTx(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/wallet/transactions?clientId=${client.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTx(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return toast.error('Please enter a valid positive amount');
    }

    const currentBalance = parseFloat(client.wallet_balance || client.credits_available || 0);
    const delta = parseFloat(amount);
    
    if (action === 'deduct' && delta > currentBalance) {
      return toast.error('Cannot deduct more than current balance');
    }

    const newBalance = action === 'add' ? currentBalance + delta : currentBalance - delta;

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          credits_available: newBalance
        })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully ${action === 'add' ? 'added' : 'deducted'} ₹${delta}`);
        setAmount('');
        onSuccess();
        if (activeTab === 'history') fetchTransactions();
        else onClose();
      } else {
        toast.error(data.message || 'Failed to update balance');
      }
    } catch (error) {
      console.error('Update balance error:', error);
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Manage Balance - {client.name}
          </DialogTitle>
          <DialogDescription>
            Current Balance: <span className="font-bold text-green-600 dark:text-green-400">₹{parseFloat(client.wallet_balance || client.credits_available || 0).toLocaleString()}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manage">Add / Deduct</TabsTrigger>
            <TabsTrigger value="history">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="manage" className="space-y-6 pt-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={action === 'add' ? 'default' : 'outline'}
                  className={`h-24 flex flex-col gap-2 ${action === 'add' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                  onClick={() => setAction('add')}
                >
                  <Plus className="w-8 h-8" />
                  <span className="text-lg">Add Credits</span>
                </Button>
                <Button
                  type="button"
                  variant={action === 'deduct' ? 'default' : 'outline'}
                  className={`h-24 flex flex-col gap-2 ${action === 'deduct' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                  onClick={() => setAction('deduct')}
                >
                  <Minus className="w-8 h-8" />
                  <span className="text-lg">Deduct Credits</span>
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 text-lg"
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={loading || !amount}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Confirm {action === 'add' ? 'Addition' : 'Deduction'}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="history" className="pt-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTx ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading history...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx: any) => (
                      <TableRow key={tx.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.type === 'credit' ? 'default' : 'destructive'} className="uppercase text-[10px]">
                            {tx.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{tx.description}</TableCell>
                        <TableCell className={`text-right font-medium ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.type === 'credit' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
