import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Building2, Globe, Shield, Zap, Check, X, Loader2, Key, Link as LinkIcon, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { vendorApi, Vendor } from '@/services/vendorApi';


export default function Marketplace() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);

  // Fetch vendors on mount
  const fetchVendors = async () => {
    try {
      setFetching(true);
      const data = await vendorApi.getVendors();
      setVendors(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Fetch Error',
        description: error.message || 'Failed to load vendors.',
      });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    type: 'SMS',
    baseUrl: '',
    apiKey: '',
    username: '',
    password: '',
    senderId: '',
    status: 'Active',
    priority: '1',
  });

  const handleOpenDialog = (vendor: Vendor | null = null) => {
    setSelectedVendor(vendor);
    if (vendor) {
      setFormData({
        name: vendor.name,
        type: vendor.type.toUpperCase(),
        baseUrl: vendor.api_url,
        apiKey: '', // API key should not be pre-filled for security
        username: '', // Username should not be pre-filled for security
        password: '', // Password should not be pre-filled for security
        senderId: vendor.senderId || '',
        status: vendor.status === 'active' ? 'Active' : 'Inactive',
        priority: vendor.priority.toString(),
      });
    } else {
      setFormData({
        name: '',
        type: 'SMS',
        baseUrl: '',
        apiKey: '',
        username: '',
        password: '',
        senderId: '',
        status: 'Active',
        priority: '1',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.baseUrl) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        name: formData.name,
        type: formData.type,
        baseUrl: formData.baseUrl,
        apiKey: formData.apiKey || undefined,
        username: formData.username || undefined,
        password: formData.password || undefined,
        senderId: formData.senderId || undefined,
        priority: Number(formData.priority),
        status: formData.status.toLowerCase(),
      };

      if (selectedVendor) {
        await vendorApi.updateVendor(selectedVendor.id, payload);
        toast({ title: 'Vendor updated', description: 'Vendor has been updated successfully.' });
      } else {
        await vendorApi.createVendor(payload);
        toast({ title: 'Vendor added', description: 'New vendor has been added to your marketplace.' });
      }
      fetchVendors();
      setDialogOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving vendor',
        description: error.message || 'Something went wrong.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this vendor?')) {
      try {
        setLoading(true);
        await vendorApi.deleteVendor(id);
        toast({ title: 'Vendor deleted', description: 'Vendor has been removed.' });
        fetchVendors();
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Delete Error',
          description: error.message || 'Failed to delete vendor.',
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage your messaging vendors and API configurations.
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="gradient-primary w-full sm:w-auto h-11 sm:h-auto">
          <Plus className="w-4 h-4 mr-2" /> Add Vendor
        </Button>
      </div>

      {/* Stats Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Vendors</p>
              <p className="text-xl sm:text-2xl font-bold">{vendors.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-success/5 border-success/20 backdrop-blur-sm">
          <CardContent className="p-4 sm:p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-success/10 flex items-center justify-center text-success shadow-inner">
              <Check className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Active Vendors</p>
              <p className="text-xl sm:text-2xl font-bold">{vendors.filter(v => v.status === 'active').length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-warning/5 border-warning/20 backdrop-blur-sm sm:col-span-2 lg:col-span-1">
          <CardContent className="p-4 sm:p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center text-warning shadow-inner">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">Avg Priority</p>
              <p className="text-xl sm:text-2xl font-bold">
                {vendors.length > 0 ? (vendors.reduce((acc, v) => acc + v.priority, 0) / vendors.length).toFixed(1) : '0'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card className="overflow-hidden border-none shadow-premium bg-card/50 backdrop-blur-md">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border/50 focus:ring-primary/20"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/10">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[180px] sm:w-auto">Vendor</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="hidden md:table-cell">Base URL</TableHead>
                  <TableHead className="hidden lg:table-cell">Sender ID</TableHead>
                  <TableHead className="hidden sm:table-cell w-[80px]">Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fetching ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
                        <p className="text-muted-foreground">Loading vendors...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredVendors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Building2 className="w-10 h-10 opacity-20" />
                        <p>No vendors found matching your search.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVendors.map((vendor) => (
                    <TableRow key={vendor.id} className="group hover:bg-muted/20 transition-colors">
                      <TableCell className="font-semibold py-4">
                        <div className="flex flex-col">
                          <span>{vendor.name}</span>
                          <span className="md:hidden text-xs text-muted-foreground font-normal truncate max-w-[120px]">
                            {vendor.api_url}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-semibold px-3 overflow-hidden capitalize">
                          {vendor.type || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <code className="text-[11px] bg-muted/50 px-2 py-0.5 rounded text-muted-foreground">
                          {vendor.api_url}
                        </code>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {vendor.senderId || '—'}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="font-mono text-xs text-muted-foreground">P{vendor.priority}</span>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "bg-opacity-10 capitalize",
                          vendor.status === 'active' ? "bg-success text-success border-success/20" : "bg-muted text-muted-foreground border-border"
                        )}>
                          {vendor.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Desktop Actions */}
                        <div className="hidden sm:flex justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleOpenDialog(vendor)}
                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDelete(vendor.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {/* Mobile Actions Dropdown */}
                        <div className="sm:hidden">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem onClick={() => handleOpenDialog(vendor)}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(vendor.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog - Fully Responsive */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[650px] max-h-[90vh] overflow-y-auto p-4 sm:p-8 rounded-2xl shadow-2xl border-none">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                {selectedVendor ? <Edit className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              </div>
              {selectedVendor ? 'Update Vendor' : 'Add New Provider'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Enter the API details and failover priority for your messaging service.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Core Info Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vendor Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Twilio"
                  className="rounded-xl h-11 bg-muted/30 border-none focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Service Channel</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type" className="rounded-xl h-11 bg-muted/30 border-none focus:ring-primary/20">
                    <SelectValue placeholder="Select channel" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="SMS">SMS Gateway</SelectItem>
                    <SelectItem value="WhatsApp">WhatsApp API</SelectItem>
                    <SelectItem value="RCS">RCS Messaging</SelectItem>
                    <SelectItem value="Email">Email Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* API Config Group */}
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="baseUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Base URL</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                  <Input
                    id="baseUrl"
                    className="pl-10 rounded-xl h-11 bg-muted/30 border-none focus:ring-primary/20 font-mono text-[11px]"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder="https://api.provider.com/v1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">API Key / Token</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/50" />
                  <Input
                    id="apiKey"
                    type="password"
                    className="pl-10 rounded-xl h-11 bg-muted/30 border-none focus:ring-primary/20"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    placeholder="Enter secret token"
                  />
                </div>
              </div>
            </div>

            {/* Auth Group */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/50 pt-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Username (Optional)</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Sub-account ID"
                  className="rounded-xl h-11 bg-muted/30 border-none focus:ring-primary/20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password (Optional)</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Auth secret"
                  className="rounded-xl h-11 bg-muted/30 border-none focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Meta Group */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-1 space-y-2">
                <Label htmlFor="senderId" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sender ID</Label>
                <Input
                  id="senderId"
                  value={formData.senderId}
                  onChange={(e) => setFormData({ ...formData, senderId: e.target.value })}
                  placeholder="e.g. NOTIFY"
                  className="rounded-xl h-11 bg-muted/30 border-none focus:ring-primary/20"
                />
              </div>
              <div className="sm:col-span-1 space-y-2">
                <Label htmlFor="priority" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Failover</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger id="priority" className="rounded-xl h-11 bg-muted/30 border-none focus:ring-primary/20">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="1">P1 (Primary)</SelectItem>
                    <SelectItem value="2">P2 (Backup)</SelectItem>
                    <SelectItem value="3">P3</SelectItem>
                    <SelectItem value="4">P4</SelectItem>
                    <SelectItem value="5">P5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-1 space-y-2">
                <Label htmlFor="status" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">State</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger id="status" className="rounded-xl h-11 bg-muted/30 border-none focus:ring-primary/20">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 flex flex-col-reverse sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(false)}
              className="w-full sm:w-auto rounded-xl h-11 border-border/50 hover:bg-muted/50 transition-all font-semibold"
            >
              Discard Changes
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading} 
              className="w-full sm:w-auto gradient-primary rounded-xl h-11 font-semibold shadow-lg shadow-primary/20 min-w-[140px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                <span>{selectedVendor ? 'Save Changes' : 'Initialize Vendor'}</span>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
