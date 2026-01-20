import { useState } from 'react';
import { Search, Plus, Eye, Edit, Ban, MoreVertical, Building2, Globe, CreditCard, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { mockClients, mockPlans, Client } from '@/lib/superAdminMockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const allChannels = ['whatsapp', 'rcs', 'sms', 'email', 'instagram', 'facebook'] as const;

export default function SuperAdminClients() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  
  // Add Client form state
  const [newClient, setNewClient] = useState({
    name: '',
    planId: '',
    creditsAvailable: 0,
    channelsEnabled: [] as string[],
    status: 'active' as 'active' | 'suspended' | 'pending' | 'trial',
    contactEmail: '',
    contactPhone: '',
  });

  const filteredClients = mockClients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.domain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' || client.planId === planFilter;
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary/10 text-primary';
      case 'suspended': return 'bg-destructive/10 text-destructive';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'trial': return 'bg-secondary/10 text-secondary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleSuspend = (client: Client) => {
    toast({
      title: client.status === 'suspended' ? 'Client Activated' : 'Client Suspended',
      description: `${client.name} has been ${client.status === 'suspended' ? 'activated' : 'suspended'}`,
    });
  };

  const handleChannelToggle = (channel: string) => {
    setNewClient(prev => ({
      ...prev,
      channelsEnabled: prev.channelsEnabled.includes(channel)
        ? prev.channelsEnabled.filter(c => c !== channel)
        : [...prev.channelsEnabled, channel]
    }));
  };

  const handleAddClient = () => {
    if (!newClient.name.trim() || !newClient.planId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }
    
    toast({
      title: 'Client Added',
      description: `${newClient.name} has been added successfully.`,
    });
    setIsAddClientOpen(false);
    setNewClient({
      name: '',
      planId: '',
      creditsAvailable: 0,
      channelsEnabled: [],
      status: 'active',
      contactEmail: '',
      contactPhone: '',
    });
  };

  const totalCreditsUsed = filteredClients.reduce((acc, c) => acc + c.creditsUsed, 0);
  const totalCreditsAvailable = filteredClients.reduce((acc, c) => acc + c.creditsAvailable, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">Manage all platform clients</p>
        </div>
        <Button className="gradient-primary" onClick={() => setIsAddClientOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Clients</div>
                <div className="text-xl font-bold">{filteredClients.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Users</div>
                <div className="text-xl font-bold">
                  {filteredClients.reduce((acc, c) => acc + c.activeUsers, 0)}
                </div>
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
                <div className="text-sm text-muted-foreground">Credits Used</div>
                <div className="text-xl font-bold">{(totalCreditsUsed / 1000).toFixed(0)}K</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Credits Available</div>
                <div className="text-xl font-bold">{(totalCreditsAvailable / 1000).toFixed(0)}K</div>
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
                  placeholder="Search by name or domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                {mockPlans.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client Name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-center">Channels</TableHead>
                <TableHead className="text-right">Credits Used</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell className="text-muted-foreground">{client.domain}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.planName}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {client.channelsEnabled.slice(0, 4).map((channel) => (
                        <ChannelIcon key={channel} channel={channel} className="w-4 h-4" />
                      ))}
                      {client.channelsEnabled.length > 4 && (
                        <span className="text-xs text-muted-foreground">+{client.channelsEnabled.length - 4}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{client.creditsUsed.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{client.creditsAvailable.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', getStatusColor(client.status))}>
                      {client.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(client.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedClient(client)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className={client.status === 'suspended' ? 'text-primary' : 'text-destructive'}
                          onClick={() => handleSuspend(client)}
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          {client.status === 'suspended' ? 'Activate' : 'Suspend'}
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

      {/* Client Detail Dialog */}
      <Dialog open={!!selectedClient} onOpenChange={() => setSelectedClient(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {selectedClient?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedClient && (
            <Tabs defaultValue="overview" className="mt-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="channels">Channels</TabsTrigger>
                <TabsTrigger value="api">API Access</TabsTrigger>
                <TabsTrigger value="usage">Usage</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Domain</div>
                        <div className="font-medium flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          {selectedClient.domain}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Contact Email</div>
                        <div className="font-medium">{selectedClient.contactEmail}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Contact Phone</div>
                        <div className="font-medium">{selectedClient.contactPhone}</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <div className="text-sm text-muted-foreground">Plan</div>
                        <Badge variant="outline" className="mt-1">{selectedClient.planName}</Badge>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Status</div>
                        <Badge className={cn('mt-1', getStatusColor(selectedClient.status))}>
                          {selectedClient.status}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Created</div>
                        <div className="font-medium">
                          {format(new Date(selectedClient.createdAt), 'MMMM d, yyyy')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Quick Stats</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Active Users</div>
                        <div className="text-2xl font-bold">{selectedClient.activeUsers}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Messages</div>
                        <div className="text-2xl font-bold">{(selectedClient.totalMessages / 1000).toFixed(0)}K</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Credits Used</div>
                        <div className="text-2xl font-bold">{(selectedClient.creditsUsed / 1000).toFixed(0)}K</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Available</div>
                        <div className="text-2xl font-bold">{(selectedClient.creditsAvailable / 1000).toFixed(0)}K</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="channels" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                      {selectedClient.channelsEnabled.map((channel) => (
                        <div key={channel} className="flex items-center gap-3 p-3 border rounded-lg">
                          <ChannelIcon channel={channel} className="w-8 h-8" />
                          <div>
                            <div className="font-medium capitalize">{channel}</div>
                            <div className="text-xs text-primary">Enabled</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="api" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground">API Base URL</div>
                      <code className="block mt-1 p-2 bg-muted rounded text-sm">
                        {selectedClient.apiBaseUrl}
                      </code>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">API Key</div>
                      <code className="block mt-1 p-2 bg-muted rounded text-sm">
                        ••••••••••••••••
                      </code>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Credit Usage</span>
                          <span className="text-sm font-medium">
                            {selectedClient.creditsUsed.toLocaleString()} / {(selectedClient.creditsUsed + selectedClient.creditsAvailable).toLocaleString()}
                          </span>
                        </div>
                        <Progress 
                          value={(selectedClient.creditsUsed / (selectedClient.creditsUsed + selectedClient.creditsAvailable)) * 100} 
                          className="h-3"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="billing" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-muted-foreground">Billing information will be displayed here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Client Dialog */}
      <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Add New Client
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name <span className="text-destructive">*</span></Label>
              <Input
                id="clientName"
                placeholder="Enter client name"
                value={newClient.name}
                onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="admin@example.com"
                  value={newClient.contactEmail}
                  onChange={(e) => setNewClient(prev => ({ ...prev, contactEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  placeholder="+1234567890"
                  value={newClient.contactPhone}
                  onChange={(e) => setNewClient(prev => ({ ...prev, contactPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan <span className="text-destructive">*</span></Label>
                <Select
                  value={newClient.planId}
                  onValueChange={(value) => setNewClient(prev => ({ ...prev, planId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockPlans.filter(p => p.status === 'active').map(plan => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ${plan.price}/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newClient.status}
                  onValueChange={(value: 'active' | 'suspended' | 'pending' | 'trial') => 
                    setNewClient(prev => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits">Initial Credits</Label>
              <Input
                id="credits"
                type="number"
                placeholder="0"
                value={newClient.creditsAvailable || ''}
                onChange={(e) => setNewClient(prev => ({ ...prev, creditsAvailable: parseInt(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-3">
              <Label>Channels Enabled</Label>
              <div className="grid grid-cols-3 gap-3">
                {allChannels.map((channel) => (
                  <div
                    key={channel}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors',
                      newClient.channelsEnabled.includes(channel)
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => handleChannelToggle(channel)}
                  >
                    <Checkbox
                      checked={newClient.channelsEnabled.includes(channel)}
                      onCheckedChange={() => handleChannelToggle(channel)}
                    />
                    <ChannelIcon channel={channel} className="w-5 h-5" />
                    <span className="capitalize text-sm font-medium">{channel}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddClientOpen(false)}>
              Cancel
            </Button>
            <Button className="gradient-primary" onClick={handleAddClient}>
              Add Client
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
