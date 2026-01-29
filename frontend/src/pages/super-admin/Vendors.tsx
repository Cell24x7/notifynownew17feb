import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Building2, Link2, MoreVertical, Users, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { cn } from '@/lib/utils';

const API_URL = 'http://localhost:5000/api/vendors';

const channelOptions = ['sms', 'whatsapp', 'rcs', 'email', 'voice'] as const;

export default function Vendors() {
  const { toast } = useToast();
  const [vendors, setVendors] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('vendors');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<any>(null);
  const [selectedVendorForMapping, setSelectedVendorForMapping] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'sms',
    api_url: '',
    api_key: '',
    priority: 1,
    status: 'active',
    channels: [] as string[],
  });

  // Fetch vendors
  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      if (res.data.success) {
        setVendors(res.data.vendors || []);
      } else {
        toast({ variant: 'destructive', title: 'Failed to load vendors', description: res.data.message });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.response?.data?.message || 'Could not fetch vendors',
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch mappings
  const fetchMappings = async () => {
    try {
      const res = await axios.get(`${API_URL}/mappings`);
      if (res.data.success) {
        setMappings(res.data.mappings || []);
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to load mappings' });
    }
  };

  // Fetch users (from /api/clients)
  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/clients');
      if (res.data.success) {
        setUsers(res.data.clients || []);
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Failed to load users' });
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchMappings();
    fetchUsers();
  }, []);

  const handleOpenDialog = (vendor: any = null) => {
    setSelectedVendor(vendor);
    setFormData(vendor ? {
      name: vendor.name || '',
      type: vendor.type || 'sms',
      api_url: vendor.api_url || '',
      api_key: '',
      priority: vendor.priority || 1,
      status: vendor.status || 'active',
      channels: vendor.channels || [],
    } : {
      name: '',
      type: 'sms',
      api_url: '',
      api_key: '',
      priority: 1,
      status: 'active',
      channels: [],
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Name is required' });
      return false;
    }
    if (!formData.api_url.trim()) {
      toast({ variant: 'destructive', title: 'API URL is required' });
      return false;
    }
    if (formData.channels.length === 0) {
      toast({ variant: 'destructive', title: 'Select at least one channel' });
      return false;
    }
    return true;
  };

  const handleSaveVendor = async () => {
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      let res;
      if (selectedVendor) {
        res = await axios.put(`${API_URL}/${selectedVendor.id}`, formData);
      } else {
        res = await axios.post(API_URL, formData);
      }

      if (res.data.success) {
        toast({
          title: 'Success',
          description: selectedVendor ? 'Vendor updated successfully' : 'Vendor added successfully',
        });
        fetchVendors();
        setDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: res.data.message || 'Unknown error' });
      }
    } catch (err: any) {
      let errorMsg = err.message || 'Something went wrong';

      if (err.response?.status === 400) {
        // Backend Zod error handling
        if (err.response.data.errors) {
          const firstError = err.response.data.errors[0];
          errorMsg = `${firstError.path.join('.')} : ${firstError.message}`;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        }
      }

      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMsg,
      });
      console.error('Vendor save error:', err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;

    try {
      const res = await axios.delete(`${API_URL}/${vendorId}`);
      if (res.data.success) {
        toast({ title: 'Success', description: 'Vendor deleted' });
        fetchVendors();
        fetchMappings();
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.response?.data?.message || 'Could not delete vendor',
      });
    }
  };

  const handleOpenMappingDialog = (vendorId: string) => {
    setSelectedVendorForMapping(vendorId);
    const existing = mappings.filter((m: any) => m.vendor_id === vendorId).map((m: any) => m.user_id);
    setSelectedUsers(existing);
    setMappingDialogOpen(true);
  };

  const handleSaveMappings = async () => {
    try {
      const res = await axios.post(`${API_URL}/mappings`, {
        vendor_id: selectedVendorForMapping,
        user_ids: selectedUsers,
      });

      if (res.data.success) {
        toast({ title: 'Success', description: 'User mappings saved' });
        fetchMappings();
        setMappingDialogOpen(false);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.response?.data?.message || 'Could not save mappings',
      });
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const getVendorUsers = (vendorId: string) => {
    const userIds = mappings.filter((m: any) => m.vendor_id === vendorId).map((m: any) => m.user_id);
    return users.filter((u: any) => userIds.includes(u.id));
  };

  const filteredVendors = vendors.filter((v: any) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage messaging vendors and user mappings</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Add Vendor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{vendors.length}</div>
            <p className="text-sm text-muted-foreground">Total Vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {vendors.filter((v: any) => v.status === 'active').length}
            </div>
            <p className="text-sm text-muted-foreground">Active Vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">{mappings.length}</div>
            <p className="text-sm text-muted-foreground">User Mappings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {new Set(vendors.flatMap((v: any) => v.channels || [])).size}
            </div>
            <p className="text-sm text-muted-foreground">Channels Covered</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vendors" className="gap-2">
            <Building2 className="w-4 h-4" /> Vendors
          </TabsTrigger>
          <TabsTrigger value="mappings" className="gap-2">
            <Link2 className="w-4 h-4" /> User Mappings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="relative flex-1 max-w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredVendors.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No vendors found. Add your first vendor!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Channels</TableHead>
                        <TableHead>API URL</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Mapped Users</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVendors.map((vendor: any) => (
                        <TableRow key={vendor.id}>
                          <TableCell className="font-medium">{vendor.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{vendor.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {(vendor.channels || []).map((ch: string) => (
                                <Badge key={ch} variant="secondary" className="text-xs">{ch.toUpperCase()}</Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {vendor.api_url}
                          </TableCell>
                          <TableCell>{vendor.priority}</TableCell>
                          <TableCell>
                            <Badge className={vendor.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}>
                              {vendor.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{getVendorUsers(vendor.id).length} users</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(vendor)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenMappingDialog(vendor.id)}>
                                  <Users className="w-4 h-4 mr-2" />
                                  Map Users
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => handleDeleteVendor(vendor.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Assigned Vendors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: any) => {
                    const userVendors = mappings
                      .filter((m: any) => m.user_id === user.id)
                      .map((m: any) => vendors.find((v: any) => v.id === m.vendor_id)?.name)
                      .filter(Boolean);

                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>{user.company_name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {userVendors.length > 0 ? (
                              userVendors.map((name: string) => (
                                <Badge key={name} variant="outline" className="text-xs">
                                  {name}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-sm text-muted-foreground">No vendors assigned</span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Vendor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            <DialogDescription>
              {selectedVendor ? 'Update vendor details below.' : 'Enter new vendor information.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter vendor name"
              />
            </div>

            <div className="space-y-2">
              <Label>Vendor Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="rcs">RCS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                  <SelectItem value="multi">Multi-Channel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API URL *</Label>
              <Input
                value={formData.api_url}
                onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                placeholder="https://api.vendor.com"
              />
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Enter API key (optional)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority.toString()}
                  onValueChange={(v) => setFormData({ ...formData, priority: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (Highest)</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 (Lowest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Channels * (at least one required)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {channelOptions.map((channel) => (
                  <Button
                    key={channel}
                    variant={formData.channels.includes(channel) ? 'default' : 'outline'}
                    className="gap-2 justify-start"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        channels: prev.channels.includes(channel)
                          ? prev.channels.filter((c) => c !== channel)
                          : [...prev.channels, channel],
                      }));
                    }}
                  >
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                      {formData.channels.includes(channel) ? <Check className="w-4 h-4" /> : null}
                    </div>
                    {channel.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveVendor}
              disabled={formLoading}
              className="min-w-[120px]"
            >
              {formLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : selectedVendor ? 'Update Vendor' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Map Users to Vendor</DialogTitle>
            <DialogDescription>
              Select which users should have access to this vendor
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users available
                </div>
              ) : (
                users.map((user: any) => (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedUsers.includes(user.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleUserSelection(user.id)}
                  >
                    <Checkbox checked={selectedUsers.includes(user.id)} />
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {user.company_name || 'No Company'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveMappings}>
              Save Mappings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}