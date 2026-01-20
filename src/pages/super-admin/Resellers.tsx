import { useState } from 'react';
import { Search, Plus, Eye, Edit, DollarSign, Users, Percent, MoreVertical, Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { mockResellers, Reseller } from '@/lib/superAdminMockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminResellers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [resellers, setResellers] = useState<Reseller[]>(mockResellers);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  // Add Reseller form state
  const [newReseller, setNewReseller] = useState({
    name: '',
    email: '',
    phone: '',
    domain: '',
    apiBaseUrl: '',
    commissionPercent: 10,
    status: 'active' as 'active' | 'inactive' | 'pending',
  });

  const filteredResellers = resellers.filter(reseller => 
    reseller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    reseller.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary/10 text-primary';
      case 'inactive': return 'bg-muted text-muted-foreground';
      case 'pending': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleAddReseller = () => {
    if (!newReseller.name.trim() || !newReseller.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'Reseller Added',
      description: `${newReseller.name} has been added successfully.`,
    });
    setIsAddOpen(false);
    setNewReseller({
      name: '',
      email: '',
      phone: '',
      domain: '',
      apiBaseUrl: '',
      commissionPercent: 10,
      status: 'active',
    });
  };

  const totalRevenue = resellers.reduce((acc, r) => acc + r.revenueGenerated, 0);
  const totalClients = resellers.reduce((acc, r) => acc + r.clientsManaged, 0);
  const totalPending = resellers.reduce((acc, r) => acc + r.payoutPending, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resellers</h1>
          <p className="text-muted-foreground">Manage reseller partners and commissions</p>
        </div>
        <Button className="gradient-primary" onClick={() => setIsAddOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Reseller
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Resellers</div>
                <div className="text-xl font-bold">{resellers.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Clients Managed</div>
                <div className="text-xl font-bold">{totalClients}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Revenue Generated</div>
                <div className="text-xl font-bold">${totalRevenue.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Pending Payouts</div>
                <div className="text-xl font-bold">${totalPending.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search resellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Resellers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reseller Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Clients</TableHead>
                <TableHead className="text-right">Commission %</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Pending Payout</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResellers.map((reseller) => (
                <TableRow key={reseller.id}>
                  <TableCell className="font-medium">{reseller.name}</TableCell>
                  <TableCell className="text-muted-foreground">{reseller.email}</TableCell>
                  <TableCell className="text-right">{reseller.clientsManaged}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Percent className="w-3 h-3" />
                      {reseller.commissionPercent}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    ${reseller.revenueGenerated.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium text-warning">
                    ${reseller.payoutPending.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', getStatusColor(reseller.status))}>
                      {reseller.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(reseller.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedReseller(reseller);
                          setIsViewOpen(true);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <DollarSign className="w-4 h-4 mr-2" />
                          Process Payout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Reseller Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              {selectedReseller?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedReseller && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <div className="font-medium">{selectedReseller.email}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <div className="font-medium">{selectedReseller.phone}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{selectedReseller.clientsManaged}</div>
                    <div className="text-xs text-muted-foreground">Clients</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{selectedReseller.commissionPercent}%</div>
                    <div className="text-xs text-muted-foreground">Commission</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">${selectedReseller.revenueGenerated.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Revenue</div>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-warning/5 border-warning/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-muted-foreground">Pending Payout</div>
                      <div className="text-2xl font-bold text-warning">${selectedReseller.payoutPending.toLocaleString()}</div>
                    </div>
                    <Button variant="outline" className="text-warning border-warning hover:bg-warning/10">
                      Process Payout
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Reseller Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Add New Reseller
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resellerName">Reseller Name <span className="text-destructive">*</span></Label>
              <Input
                id="resellerName"
                placeholder="Enter reseller name"
                value={newReseller.name}
                onChange={(e) => setNewReseller(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="resellerEmail">Email <span className="text-destructive">*</span></Label>
                <Input
                  id="resellerEmail"
                  type="email"
                  placeholder="reseller@example.com"
                  value={newReseller.email}
                  onChange={(e) => setNewReseller(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="resellerPhone">Phone</Label>
                <Input
                  id="resellerPhone"
                  placeholder="+1234567890"
                  value={newReseller.phone}
                  onChange={(e) => setNewReseller(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resellerDomain">Domain</Label>
              <Input
                id="resellerDomain"
                placeholder="example.com"
                value={newReseller.domain}
                onChange={(e) => setNewReseller(prev => ({ ...prev, domain: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="resellerApiUrl">API Base URL</Label>
              <Input
                id="resellerApiUrl"
                placeholder="https://api.example.com"
                value={newReseller.apiBaseUrl}
                onChange={(e) => setNewReseller(prev => ({ ...prev, apiBaseUrl: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="commission">Commission %</Label>
                <Input
                  id="commission"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="10"
                  value={newReseller.commissionPercent}
                  onChange={(e) => setNewReseller(prev => ({ ...prev, commissionPercent: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newReseller.status}
                  onValueChange={(value: 'active' | 'inactive' | 'pending') => 
                    setNewReseller(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button className="gradient-primary" onClick={handleAddReseller}>
              Add Reseller
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
