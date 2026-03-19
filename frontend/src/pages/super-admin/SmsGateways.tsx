import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Wifi, WifiOff, MoreVertical, Loader2, Globe, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_URL = `${API_BASE_URL}/api/sms-gateways`;

export default function SmsGateways() {
  const { toast } = useToast();
  const [gateways, setGateways] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('gateways');

  // Assignment state
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    primary_url: '',
    secondary_url: '',
    status: 'active',
    routing: 'national',
    priority: 'both'
  });

  const fetchGateways = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setGateways(res.data.data || []);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.response?.data?.message || 'Could not fetch SMS gateways',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/assignments/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAssignments(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
    }
  };

  useEffect(() => {
    fetchGateways();
    fetchAssignments();
  }, []);

  const handleOpenDialog = (gateway: any = null) => {
    setSelectedGateway(gateway);
    setTestResult(null);
    setFormData(gateway ? {
      name: gateway.name || '',
      primary_url: gateway.primary_url || '',
      secondary_url: gateway.secondary_url || '',
      status: gateway.status || 'active',
      routing: gateway.routing || 'national',
      priority: gateway.priority || 'both'
    } : {
      name: '',
      primary_url: '',
      secondary_url: '',
      status: 'active',
      routing: 'national',
      priority: 'both'
    });
    setDialogOpen(true);
  };

  const handleSaveGateway = async () => {
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Gateway Name is required' });
      return;
    }
    if (!formData.primary_url.trim()) {
      toast({ variant: 'destructive', title: 'Primary URL is required' });
      return;
    }

    setFormLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      let res;

      if (selectedGateway) {
        res = await axios.put(`${API_URL}/${selectedGateway.id}`, formData, config);
      } else {
        res = await axios.post(API_URL, formData, config);
      }

      if (res.data.success) {
        toast({
          title: 'Success',
          description: selectedGateway ? 'Gateway updated successfully' : 'Gateway created successfully',
        });
        fetchGateways();
        setDialogOpen(false);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.response?.data?.message || 'Something went wrong',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteGateway = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this gateway?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast({ title: 'Success', description: 'Gateway deleted' });
        fetchGateways();
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.response?.data?.message || 'Could not delete gateway',
      });
    }
  };

  const handleTestConnectivity = async (id: number) => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_URL}/${id}/test`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestResult(res.data);
      toast({
        title: res.data.success ? '✅ Connected' : '❌ Failed',
        description: res.data.message,
        variant: res.data.success ? 'default' : 'destructive'
      });
    } catch (err: any) {
      setTestResult({ success: false, message: err.response?.data?.message || err.message });
      toast({ variant: 'destructive', title: 'Test Failed', description: err.message });
    } finally {
      setTestLoading(false);
    }
  };

  const handleAssignGateway = async (userId: number, gatewayId: number | null) => {
    setAssignLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${API_URL}/assign`, { user_id: userId, gateway_id: gatewayId }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'Success', description: 'Gateway assigned to user' });
      fetchAssignments();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Assignment failed' });
    } finally {
      setAssignLoading(false);
    }
  };

  const filteredGateways = gateways.filter((g: any) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const routingLabel = (r: string) => {
    switch(r) {
      case 'national': return 'National';
      case 'international': return 'International';
      case 'both': return 'Both';
      default: return r;
    }
  };

  const priorityLabel = (p: string) => {
    switch(p) {
      case 'non-otp': return 'Non-OTP';
      case 'otp': return 'OTP';
      case 'both': return 'Both';
      default: return p;
    }
  };

  const placeholderGuide = [
    { placeholder: '%FROM', description: 'Sender ID (CMTLTD)' },
    { placeholder: '%TO', description: 'Recipient number' },
    { placeholder: '%MSGTEXT', description: 'Message text (URL encoded)' },
    { placeholder: '%TEMPID', description: 'DLT Template ID' },
    { placeholder: '%PEID', description: 'PE Entity ID' },
    { placeholder: '%HASHID', description: 'Hash ID' },
    { placeholder: '%MSGID', description: 'Unique Message ID' },
    { placeholder: '%DLRUSERID', description: 'DLR User ID' },
    { placeholder: '%VENDOR', description: 'Vendor/Gateway name' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">SMS Gateways</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage SMS gateway configurations and user assignments</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Add Gateway
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="gateways">
            <Globe className="w-4 h-4 mr-2" /> Gateways
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Users className="w-4 h-4 mr-2" /> User Assignments
          </TabsTrigger>
        </TabsList>

        {/* GATEWAYS TAB */}
        <TabsContent value="gateways">
          <Card>
            <CardHeader>
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search gateways..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : filteredGateways.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No SMS gateways found. Click "Add Gateway" to create one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table className="min-w-full">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Gateway Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Routing</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGateways.map((gw: any) => (
                        <TableRow key={gw.id}>
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-2">
                              <Send className="w-4 h-4 text-primary" />
                              {gw.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={gw.status === 'active' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-500'}>
                              {gw.status === 'active' ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>{routingLabel(gw.routing)}</TableCell>
                          <TableCell>{priorityLabel(gw.priority)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(gw.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(gw)}>
                                  <Edit className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTestConnectivity(gw.id)}>
                                  <Wifi className="w-4 h-4 mr-2" /> Test Connectivity
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  className="text-destructive font-medium"
                                  onClick={() => handleDeleteGateway(gw.id)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
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

        {/* USER ASSIGNMENTS TAB */}
        <TabsContent value="assignments">
          <Card>
            <CardHeader>
              <CardTitle>Assign Gateways to Users</CardTitle>
              <CardDescription>Select which SMS gateway each user should use when sending SMS campaigns</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Assigned Gateway</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                        <TableCell>
                          {user.gateway_name ? (
                            <Badge className="bg-blue-500/10 text-blue-600">{user.gateway_name}</Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">Not assigned</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={user.sms_gateway_id ? String(user.sms_gateway_id) : 'none'}
                            onValueChange={(val) => handleAssignGateway(user.id, val === 'none' ? null : Number(val))}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select gateway" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No Gateway</SelectItem>
                              {gateways.filter(g => g.status === 'active').map(g => (
                                <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ADD/EDIT GATEWAY DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedGateway ? 'Edit Gateway' : 'Add New SMS Gateway'}</DialogTitle>
            <DialogDescription>
              Configure the SMS gateway URL with placeholders for dynamic parameters.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="gw_name">Gateway Name *</Label>
                <Input
                  id="gw_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. TATA, Airtel, BSNL"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_url">Primary URL *</Label>
              <Textarea
                id="primary_url"
                rows={4}
                value={formData.primary_url}
                onChange={(e) => setFormData({ ...formData, primary_url: e.target.value })}
                placeholder="http://example.com/sendsms?from=%FROM&to=%TO&text=%MSGTEXT&..."
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_url">Secondary / Fallback URL</Label>
              <Textarea
                id="secondary_url"
                rows={3}
                value={formData.secondary_url}
                onChange={(e) => setFormData({ ...formData, secondary_url: e.target.value })}
                placeholder="Optional fallback URL"
                className="font-mono text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Routing</Label>
                <Select value={formData.routing} onValueChange={(v) => setFormData({ ...formData, routing: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national">National</SelectItem>
                    <SelectItem value="international">International</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="non-otp">Non-OTP</SelectItem>
                    <SelectItem value="otp">OTP</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Placeholder Guide */}
            <div className="bg-muted/50 rounded-lg p-3 border">
              <p className="text-sm font-semibold mb-2">📋 URL Placeholder Guide</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                {placeholderGuide.map(p => (
                  <div key={p.placeholder} className="text-xs">
                    <code className="bg-primary/10 text-primary px-1 py-0.5 rounded font-bold">{p.placeholder}</code>
                    <span className="text-muted-foreground ml-1">→ {p.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook Guide */}
            <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
              <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Webhook / DLR Configuration
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                To receive Delivery Reports (DLR), set your gateway's response callback URL to:
                <code className="block mt-1 p-2 bg-muted rounded font-mono break-all">
                  {window.location.origin.replace('http://localhost:3000', API_BASE_URL)}/api/webhooks/sms/callback
                </code>
                The gateway should send <code className="font-bold">jobid</code> (or <code className="font-bold">msgid</code>), <code className="font-bold">status</code>, and <code className="font-bold">mobile</code> as GET/POST parameters.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveGateway} disabled={formLoading}>
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedGateway ? 'Update Gateway' : 'Create Gateway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
