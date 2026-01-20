import { useState } from 'react';
import { Plus, Edit, Trash2, Building2, Link2, MoreVertical, Search, Users, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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

// Mock vendor data
const mockVendors = [
  { id: '1', name: 'SMS Gateway Pro', type: 'sms', apiUrl: 'https://api.smsgatewaypro.com', apiKey: '***hidden***', status: 'active', priority: 1, channels: ['SMS'] },
  { id: '2', name: 'WhatsApp Cloud API', type: 'whatsapp', apiUrl: 'https://graph.facebook.com', apiKey: '***hidden***', status: 'active', priority: 1, channels: ['WhatsApp'] },
  { id: '3', name: 'RCS Provider', type: 'rcs', apiUrl: 'https://api.rcsprovider.com', apiKey: '***hidden***', status: 'inactive', priority: 2, channels: ['RCS'] },
  { id: '4', name: 'Multi-Channel Hub', type: 'multi', apiUrl: 'https://api.multihub.com', apiKey: '***hidden***', status: 'active', priority: 1, channels: ['SMS', 'WhatsApp', 'RCS'] },
];

// Mock users for mapping
const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@company.com', company: 'Acme Corp' },
  { id: '2', name: 'Jane Smith', email: 'jane@company.com', company: 'Tech Inc' },
  { id: '3', name: 'Bob Wilson', email: 'bob@company.com', company: 'StartupXYZ' },
  { id: '4', name: 'Alice Brown', email: 'alice@company.com', company: 'Enterprise Co' },
];

// Mock vendor-user mappings
const mockMappings = [
  { vendorId: '1', userId: '1', priority: 1 },
  { vendorId: '1', userId: '2', priority: 1 },
  { vendorId: '2', userId: '1', priority: 1 },
  { vendorId: '4', userId: '3', priority: 1 },
];

type Vendor = typeof mockVendors[0];

export default function Vendors() {
  const [vendors, setVendors] = useState(mockVendors);
  const [mappings, setMappings] = useState(mockMappings);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('vendors');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [selectedVendorForMapping, setSelectedVendorForMapping] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    type: 'sms',
    apiUrl: '',
    apiKey: '',
    username: '',
    password: '',
    priority: 1,
    status: 'active',
  });
  const { toast } = useToast();

  const handleOpenDialog = (vendor?: Vendor) => {
    if (vendor) {
      setSelectedVendor(vendor);
      setFormData({
        name: vendor.name,
        type: vendor.type,
        apiUrl: vendor.apiUrl,
        apiKey: '',
        username: '',
        password: '',
        priority: vendor.priority,
        status: vendor.status,
      });
    } else {
      setSelectedVendor(null);
      setFormData({
        name: '',
        type: 'sms',
        apiUrl: '',
        apiKey: '',
        username: '',
        password: '',
        priority: 1,
        status: 'active',
      });
    }
    setDialogOpen(true);
  };

  const handleSaveVendor = () => {
    if (selectedVendor) {
      setVendors(vendors.map(v =>
        v.id === selectedVendor.id
          ? { ...v, name: formData.name, type: formData.type, apiUrl: formData.apiUrl, priority: formData.priority, status: formData.status }
          : v
      ));
      toast({ title: 'Vendor updated', description: 'Vendor configuration has been updated.' });
    } else {
      const newVendor: Vendor = {
        id: Date.now().toString(),
        name: formData.name,
        type: formData.type,
        apiUrl: formData.apiUrl,
        apiKey: '***hidden***',
        status: formData.status,
        priority: formData.priority,
        channels: formData.type === 'multi' ? ['SMS', 'WhatsApp', 'RCS'] : [formData.type.toUpperCase()],
      };
      setVendors([...vendors, newVendor]);
      toast({ title: 'Vendor added', description: 'New vendor has been added successfully.' });
    }
    setDialogOpen(false);
  };

  const handleDeleteVendor = (vendorId: string) => {
    setVendors(vendors.filter(v => v.id !== vendorId));
    setMappings(mappings.filter(m => m.vendorId !== vendorId));
    toast({ title: 'Vendor deleted', description: 'Vendor has been removed.' });
  };

  const handleOpenMappingDialog = (vendorId: string) => {
    setSelectedVendorForMapping(vendorId);
    const existingMappings = mappings.filter(m => m.vendorId === vendorId).map(m => m.userId);
    setSelectedUsers(existingMappings);
    setMappingDialogOpen(true);
  };

  const handleSaveMappings = () => {
    // Remove existing mappings for this vendor
    const otherMappings = mappings.filter(m => m.vendorId !== selectedVendorForMapping);
    // Add new mappings
    const newMappings = selectedUsers.map(userId => ({
      vendorId: selectedVendorForMapping,
      userId,
      priority: 1,
    }));
    setMappings([...otherMappings, ...newMappings]);
    setMappingDialogOpen(false);
    toast({ title: 'Mappings updated', description: 'User-vendor mappings have been saved.' });
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const getVendorUsers = (vendorId: string) => {
    const userIds = mappings.filter(m => m.vendorId === vendorId).map(m => m.userId);
    return mockUsers.filter(u => userIds.includes(u.id));
  };

  const filteredVendors = vendors.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Vendor Management</h1>
          <p className="text-muted-foreground">Manage messaging vendors and user mappings</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{vendors.length}</div>
            <p className="text-sm text-muted-foreground">Total Vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {vendors.filter(v => v.status === 'active').length}
            </div>
            <p className="text-sm text-muted-foreground">Active Vendors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">{mappings.length}</div>
            <p className="text-sm text-muted-foreground">User Mappings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(vendors.flatMap(v => v.channels)).size}
            </div>
            <p className="text-sm text-muted-foreground">Channels Covered</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vendors" className="gap-2">
            <Building2 className="w-4 h-4" />
            Vendors
          </TabsTrigger>
          <TabsTrigger value="mappings" className="gap-2">
            <Link2 className="w-4 h-4" />
            User Mappings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendors" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search vendors..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
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
                  {filteredVendors.map(vendor => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{vendor.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {vendor.channels.map(ch => (
                            <Badge key={ch} variant="secondary" className="text-xs">{ch}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {vendor.apiUrl}
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
                            <Button variant="ghost" size="icon">
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
                              className="text-destructive"
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mappings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>User-Vendor Mappings</CardTitle>
              <CardDescription>View and manage which vendors are assigned to each user</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Assigned Vendors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map(user => {
                    const userVendors = mappings
                      .filter(m => m.userId === user.id)
                      .map(m => vendors.find(v => v.id === m.vendorId))
                      .filter(Boolean);
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>{user.company}</TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {userVendors.length > 0 ? (
                              userVendors.map(v => (
                                <Badge key={v!.id} variant="outline">{v!.name}</Badge>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            <DialogDescription>
              {selectedVendor ? 'Update vendor configuration' : 'Configure a new messaging vendor'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Vendor Name</Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter vendor name"
              />
            </div>
            <div className="space-y-2">
              <Label>Vendor Type</Label>
              <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Label>API URL</Label>
              <Input
                value={formData.apiUrl}
                onChange={e => setFormData({ ...formData, apiUrl: e.target.value })}
                placeholder="https://api.vendor.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={formData.apiKey}
                  onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                  placeholder="Enter API key"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority.toString()} onValueChange={v => setFormData({ ...formData, priority: parseInt(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 (Highest)</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5 (Lowest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveVendor}>
              {selectedVendor ? 'Update Vendor' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map Users Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Map Users to Vendor</DialogTitle>
            <DialogDescription>Select users to assign to this vendor</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {mockUsers.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                  onClick={() => toggleUserSelection(user.id)}
                >
                  <Checkbox checked={selectedUsers.includes(user.id)} />
                  <div className="flex-1">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <Badge variant="outline">{user.company}</Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMappings}>Save Mappings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
