import { useState, useEffect } from 'react';
import { Search, Loader2, ArrowUpRight, ArrowDownRight, CreditCard, ChevronLeft, ChevronRight, Download, Filter, Zap } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api`;

export default function CreditLedger() {
  const { toast } = useToast();
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

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem('authToken');
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
    } catch (err) {
      console.error('Failed to fetch users/resellers:', err);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
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
        setLedger(res.data.ledger);
        setTotalPages(res.data.pagination.totalPages);
        setTotalItems(res.data.pagination.total);
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

  useEffect(() => {
    fetchLedger();
  }, [page, typeFilter, selectedUserId]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">Credit Ledger</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Comprehensive track of all credit allocations, debits, and transfers.
          </p>
        </div>
        <Button variant="outline" className="hidden sm:flex">
          <Download className="w-4 h-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard 
          title="Total Transactions" 
          value={totalItems} 
          icon={CreditCard} 
          color="text-blue-600" 
          bg="bg-blue-100/50" 
        />
        <StatsCard 
          title="Recent Activity" 
          value={ledger.length > 0 ? "Active" : "Quiet"} 
          icon={Zap} 
          color="text-amber-600" 
          bg="bg-amber-100/50" 
        />
      </div>

      <Card className="border-none shadow-xl bg-white/60 backdrop-blur-xl">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between bg-white/50 rounded-t-xl">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or description..."
              className="pl-10 bg-white/80 border-gray-200/60 focus:border-primary/50 transition-all rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <Select value={selectedUserId} onValueChange={(val) => { setSelectedUserId(val); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[200px] bg-white rounded-xl">
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name} ({client.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[150px] bg-white rounded-xl">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="credit">Credits (In)</SelectItem>
                <SelectItem value="debit">Debits (Out)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-b-xl">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-gray-100">
                <TableHead className="font-semibold text-gray-900 w-[100px]">Type</TableHead>
                <TableHead className="font-semibold text-gray-900">User</TableHead>
                <TableHead className="font-semibold text-gray-900">Parent/Reseller</TableHead>
                <TableHead className="font-semibold text-gray-900">Description</TableHead>
                <TableHead className="font-semibold text-gray-900 text-right">Amount</TableHead>
                <TableHead className="font-semibold text-gray-900 text-right">Date</TableHead>
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
                  <TableRow key={item.id} className="group hover:bg-gray-50/50 transition-colors border-b border-gray-50">
                    <TableCell>
                      {item.type === 'credit' ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 rounded-full px-2">
                          <ArrowDownRight className="w-3 h-3" /> Credit
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 gap-1 rounded-full px-2">
                          <ArrowUpRight className="w-3 h-3" /> Debit
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">{item.owner_name}</div>
                      <div className="text-xs text-muted-foreground">{item.owner_email}</div>
                    </TableCell>
                    <TableCell>
                      {item.reseller_name ? (
                        <>
                          <div className="font-medium text-gray-700">{item.reseller_name}</div>
                          <div className="text-xs text-muted-foreground">{item.reseller_email}</div>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">System/Admin</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={item.description}>
                      <span className="text-sm text-gray-600">{item.description}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "font-semibold text-sm",
                        item.type === 'credit' ? "text-emerald-600" : "text-gray-900"
                      )}>
                        {item.type === 'credit' ? '+' : '-'}₹{parseFloat(item.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-gray-500 whitespace-nowrap">
                      {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 rounded-b-xl">
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
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
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-200">
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
  )
}
