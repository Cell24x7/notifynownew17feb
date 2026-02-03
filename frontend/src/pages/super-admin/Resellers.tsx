import { useState, useEffect } from 'react';
import { Search, Plus, Eye, Pencil, Users, Percent, MoreVertical, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api`;

export default function SuperAdminResellers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [resellers, setResellers] = useState<any[]>([]);
  const [filteredResellers, setFilteredResellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [currentReseller, setCurrentReseller] = useState({
    id: null as number | null,
    name: '',
    email: '',
    phone: '',
    domain: '',
    api_base_url: '',
    commission_percent: 10,
    credits_available: 0,
    status: 'active' as 'active' | 'inactive' | 'pending',
  });

  // Fetch resellers
  const fetchResellers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/resellers`);
      if (res.data.success) {
        setResellers(res.data.resellers || []);
        setFilteredResellers(res.data.resellers || []);
      } else {
        toast({ title: 'Error', description: res.data.message || 'Failed to load resellers', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Failed to load',
        description: err.response?.data?.message || 'Server connection issue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResellers();
  }, []);

  // Search filter
  useEffect(() => {
    const filtered = resellers.filter(r =>
      r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredResellers(filtered);
  }, [resellers, searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const validateForm = () => {
    const errors: string[] = [];

    // Name: only letters, space, hyphen, apostrophe
    if (!currentReseller.name.trim()) {
      errors.push('Name is required.');
    } else if (!/^[A-Za-z\s\-']+$/.test(currentReseller.name.trim())) {
      errors.push('Name can only contain letters, spaces, hyphens and apostrophes (no numbers/special chars).');
    }

    // Email: strict format
    if (!currentReseller.email.trim()) {
      errors.push('Email is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentReseller.email.trim())) {
      errors.push('Please enter a valid email address.');
    }

    // Phone: optional, but if given → valid format
    if (currentReseller.phone.trim() && !/^\+?[0-9]{10,15}$/.test(currentReseller.phone.trim())) {
      errors.push('Phone must be 10-15 digits (optional + sign allowed).');
    }

    // Commission: number 0-100
    const comm = currentReseller.commission_percent;
    if (isNaN(comm) || comm < 0 || comm > 100) {
      errors.push('Commission % must be a number between 0 and 100.');
    }

    // Domain: optional valid domain
    if (currentReseller.domain.trim() && !/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(currentReseller.domain.trim())) {
      errors.push('Domain format is invalid (e.g., example.com).');
    }

    // API URL: optional valid URL
    if (currentReseller.api_base_url.trim() && !/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(currentReseller.api_base_url.trim())) {
      errors.push('API Base URL must be a valid URL starting with http/https.');
    }

    if (errors.length > 0) {
      toast({
        title: 'Validation Errors',
        description: errors.join(' '),
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      let res;
      if (modalMode === 'add') {
        res = await axios.post(`${API_URL}/resellers`, currentReseller);
      } else {
        res = await axios.put(`${API_URL}/resellers/${currentReseller.id}`, currentReseller);
      }

      if (res.data.success) {
        toast({
          title: 'Success',
          description: modalMode === 'add' ? 'Reseller added successfully!' : 'Reseller updated successfully!',
        });
        setIsModalOpen(false);
        resetForm();
        fetchResellers();
      } else {
        toast({ title: 'Failed', description: res.data.message || 'Could not save reseller', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = (reseller: any) => {
    setCurrentReseller(reseller);
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEdit = (reseller: any) => {
    setCurrentReseller(reseller);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleProcessPayout = (reseller: any) => {
    // Abhi simple toast, future mein backend call add kar sakte ho
    toast({
      title: 'Payout Processed',
      description: `₹${(reseller.payout_pending || 0).toLocaleString()} paid to ${reseller.name}.`,
    });
    // Optional: Backend call to reset payout_pending to 0
  };

  const resetForm = () => {
    setCurrentReseller({
      id: null,
      name: '',
      email: '',
      phone: '',
      domain: '',
      api_base_url: '',
      commission_percent: 10,
      credits_available: 0,
      status: 'active',
    });
  };

  const totalRevenue = resellers.reduce((acc, r) => acc + (r.revenue_generated || 0), 0);
  const totalClients = resellers.reduce((acc, r) => acc + (r.clients_managed || 0), 0);
  const totalPending = resellers.reduce((acc, r) => acc + (r.payout_pending || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Resellers</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage reseller partners and commissions</p>
        </div>
        <Button 
          className="w-full sm:w-auto gradient-primary" 
          onClick={() => {
            resetForm();
            setModalMode('add');
            setIsModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Reseller
        </Button>
      </div>

      {/* Stats - Responsive */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Resellers</p>
                <p className="text-lg sm:text-2xl font-bold">{resellers.length}</p>
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
                <p className="text-xs sm:text-sm text-muted-foreground">Clients Managed</p>
                <p className="text-lg sm:text-2xl font-bold">{totalClients.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-primary">₹</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Revenue Generated</p>
                <p className="text-lg sm:text-2xl font-bold">₹{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <span className="text-warning">₹</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Pending Payouts</p>
                <p className="text-lg sm:text-2xl font-bold">₹{totalPending.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative w-full max-w-md mx-auto sm:mx-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search resellers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[140px]">Reseller Name</TableHead>
              <TableHead className="min-w-[180px]">Email</TableHead>
              <TableHead className="text-right min-w-[90px]">Clients</TableHead>
              <TableHead className="text-right min-w-[110px]">Commission %</TableHead>
              <TableHead className="text-right min-w-[110px]">Revenue</TableHead>
              <TableHead className="text-right min-w-[130px]">Pending Payout</TableHead>
              <TableHead className="text-right min-w-[120px]">Used</TableHead>
              <TableHead className="text-right min-w-[120px]">Available</TableHead>
              <TableHead className="min-w-[90px]">Status</TableHead>
              <TableHead className="min-w-[100px]">Joined</TableHead>
              <TableHead className="text-right min-w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-10">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="mt-2 text-muted-foreground">Loading resellers...</p>
                </TableCell>
              </TableRow>
            ) : filteredResellers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-10 text-muted-foreground">
                  No resellers found
                </TableCell>
              </TableRow>
            ) : (
              filteredResellers.map((reseller) => (
                <TableRow key={reseller.id}>
                  <TableCell className="font-medium">{reseller.name}</TableCell>
                  <TableCell className="text-muted-foreground">{reseller.email}</TableCell>
                  <TableCell className="text-right">{reseller.clients_managed?.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Percent className="w-3 h-3" />
                      {reseller.commission_percent || 0}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    ₹{(reseller.revenue_generated || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium text-warning">
                    ₹{(reseller.payout_pending || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-sm">{reseller.credits_used?.toLocaleString() || '0'}</TableCell>
                  <TableCell className="text-right text-sm">{reseller.credits_available?.toLocaleString() || '0'}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', getStatusColor(reseller.status))}>
                      {reseller.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(reseller.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(reseller)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(reseller)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleProcessPayout(reseller)}>
                          <span className="w-4 h-4 mr-2">₹</span>
                          Process Payout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal - Fully Responsive */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl flex items-center gap-2">
              <Users className="w-5 h-5" />
              {modalMode === 'add' ? 'Add New Reseller' : modalMode === 'edit' ? 'Edit Reseller' : 'View Reseller'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 sm:space-y-6 py-4">
            {/* Name */}
            <div className="space-y-2">
              <Label>Reseller Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Enter reseller name"
                value={currentReseller.name}
                onChange={(e) => setCurrentReseller(prev => ({ ...prev, name: e.target.value }))}
                disabled={modalMode === 'view'}
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input
                  type="email"
                  placeholder="reseller@example.com"
                  value={currentReseller.email}
                  onChange={(e) => setCurrentReseller(prev => ({ ...prev, email: e.target.value }))}
                  disabled={modalMode === 'view'}
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={currentReseller.phone}
                  onChange={(e) => setCurrentReseller(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={modalMode === 'view'}
                />
              </div>
            </div>

            {/* Domain & API */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Input
                  placeholder="example.com"
                  value={currentReseller.domain}
                  onChange={(e) => setCurrentReseller(prev => ({ ...prev, domain: e.target.value }))}
                  disabled={modalMode === 'view'}
                />
              </div>
              <div className="space-y-2">
                <Label>API Base URL</Label>
                <Input
                  placeholder="https://api.example.com"
                  value={currentReseller.api_base_url}
                  onChange={(e) => setCurrentReseller(prev => ({ ...prev, api_base_url: e.target.value }))}
                  disabled={modalMode === 'view'}
                />
              </div>
            </div>

            {/* Commission & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commission %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={currentReseller.commission_percent}
                  onChange={(e) => setCurrentReseller(prev => ({ ...prev, commission_percent: parseFloat(e.target.value) || 0 }))}
                  disabled={modalMode === 'view'}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={currentReseller.status}
                  onValueChange={(v) => setCurrentReseller(prev => ({ ...prev, status: v as any }))}
                  disabled={modalMode === 'view'}
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

            {/* Credits */}
            <div className="space-y-2">
              <Label>Initial Credits</Label>
              <Input
                type="number"
                placeholder="0"
                value={currentReseller.credits_available}
                onChange={e => setCurrentReseller(prev => ({...prev, credits_available: parseInt(e.target.value) || 0 }))}
                disabled={modalMode === 'view'}
              />
            </div>

            {/* View Mode Stats */}
            {modalMode === 'view' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold">{currentReseller.clients_managed || 0}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Clients</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold">₹{(currentReseller.revenue_generated || 0).toLocaleString()}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Revenue</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-warning">₹{(currentReseller.payout_pending || 0).toLocaleString()}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Pending Payout</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsModalOpen(false)}>
              {modalMode === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {modalMode !== 'view' && (
              <Button 
                className="w-full sm:w-auto gradient-primary" 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {modalMode === 'add' ? 'Adding...' : 'Updating...'}
                  </>
                ) : (
                  modalMode === 'add' ? 'Add Reseller' : 'Update Reseller'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}   