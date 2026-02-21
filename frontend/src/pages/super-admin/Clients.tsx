import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Eye, Ban, MoreVertical, Building2, Globe, CreditCard, Users, Loader2, Pencil, Trash2, LogIn, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api`;

const allChannels = ['whatsapp', 'rcs', 'sms'] as const;

export default function SuperAdminClients() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]); // State for real plans
  const [loading, setLoading] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');

  // Client form state
  const [currentClient, setCurrentClient] = useState({
    id: '',
    name: '',
    company_name: '',
    email: '',
    password: '',
    contact_phone: '',
    plan_id: '',
    status: 'active' as 'active' | 'suspended' | 'pending' | 'trial',
    credits_available: 0,
    channels_enabled: [] as string[],
  });

  // Fetch real plans
  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${API_URL}/plans`);
      if (res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error('Failed to load plans', err);
    }
  };

  // Fetch real clients from backend
  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/clients?_t=${Date.now()}`);
      if (res.data.success) {
        setClients(res.data.clients || []);
        setFilteredClients(res.data.clients || []);
      } else {
        toast({ title: 'Error', description: res.data.message || 'Failed to load clients', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Failed to load',
        description: err.response?.data?.message || 'Could not connect to server',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchPlans();
  }, []);

  // Real-time filtering
  useEffect(() => {
    const filtered = clients.filter(client => {
      const search = searchQuery.toLowerCase();
      const matchesSearch =
        client.name?.toLowerCase().includes(search) ||
        client.company_name?.toLowerCase().includes(search) ||
        client.email?.toLowerCase().includes(search);
      const matchesPlan = planFilter === 'all' || client.plan_id === planFilter;
      const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
    setFilteredClients(filtered);
  }, [clients, searchQuery, planFilter, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-600 border-green-200/50';
      case 'suspended': return 'bg-red-500/10 text-red-600 border-red-200/50';
      case 'pending': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200/50';
      case 'trial': return 'bg-blue-500/10 text-blue-600 border-blue-200/50';
      default: return 'bg-muted text-muted-foreground border-border/50';
    }
  };

  const handleChannelToggle = (channel: string) => {
    setCurrentClient(prev => ({
      ...prev,
      channels_enabled: prev.channels_enabled.includes(channel)
        ? prev.channels_enabled.filter(c => c !== channel)
        : [...prev.channels_enabled, channel],
    }));
  };

  // Helper to safely parse channels which might be string or array
  const parseChannels = (channels: any): string[] => {
      if (Array.isArray(channels)) return channels;
      if (typeof channels === 'string') {
          try {
              return JSON.parse(channels);
          } catch (e) {
              return [];
          }
      }
      return [];
  };

  // Handle Plan Change - Auto-assign channels
  const handlePlanChange = (planId: string) => {
    const selectedPlan = plans.find(p => p.id === planId);
    let newChannels: string[] = [];
    
    if (selectedPlan && selectedPlan.channelsAllowed) {
        // Normalize channelsAllowed from plan (it might be camelCase or mixed)
        // Backend plans usually return channelsAllowed as array of strings
        newChannels = selectedPlan.channelsAllowed;
    }

    setCurrentClient(prev => ({
        ...prev,
        plan_id: planId,
        channels_enabled: newChannels
    }));
  };

  const handleAddClient = async () => {
    if (!currentClient.name.trim() || !currentClient.company_name.trim() || !currentClient.email.trim() || !currentClient.password.trim() || !currentClient.plan_id) {
      toast({
        title: 'Validation Error',
        description: 'All required fields must be filled',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/clients`, currentClient);
      if (res.data.success) {
        toast({
          title: 'Success',
          description: `${currentClient.name} has been added successfully`,
        });
        setIsClientModalOpen(false);
        resetForm();
        fetchClients();
      } else {
        toast({ title: 'Failed', description: res.data.message || 'Could not add client', variant: 'destructive' });
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

  const handleUpdateClient = async () => {
    if (!currentClient.name.trim() || !currentClient.company_name.trim() || !currentClient.email.trim() || !currentClient.plan_id) {
      toast({
        title: 'Validation Error',
        description: 'All required fields must be filled',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const payload = { ...currentClient };
      if (!payload.password.trim()) {
        delete (payload as any).password;
      }
      const res = await axios.put(`${API_URL}/clients/${currentClient.id}`, payload);
      if (res.data.success) {
        toast({
          title: 'Success',
          description: `${currentClient.name} has been updated successfully`,
        });
        setIsClientModalOpen(false);
        fetchClients();
      } else {
        toast({ title: 'Failed', description: res.data.message || 'Could not update client', variant: 'destructive' });
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

  const resetForm = () => {
    setCurrentClient({
        id: '',
        name: '',
        company_name: '',
        email: '',
        password: '',
        contact_phone: '',
        plan_id: '',
        status: 'active',
        credits_available: 0,
        channels_enabled: [],
      });
  }

  const handleView = (client: any) => {
    // When viewing/editing, ensure we set channels correctly if plan exists
    // However, for existing clients, we should use what's in the DB
    const clientChannels = parseChannels(client.channels_enabled);
    
    // If clientChannels is empty but plan exists, maybe populate from plan?
    // User asked to "tablme dikham ok ki ye plan me ye channel hai"
    // So let's rely on what's in DB for Edit/View to avoid overriding custom setups if any.
    
    setCurrentClient({
      id: client.id,
      name: client.name,
      company_name: client.company_name,
      email: client.email,
      password: '',
      contact_phone: client.contact_phone || '',
      plan_id: client.plan_id || '',
      status: client.status,
      credits_available: client.credits_available || 0,
      channels_enabled: clientChannels,
    });
    setModalMode('view');
    setIsClientModalOpen(true);
  };

  const handleEdit = (client: any) => {
    setCurrentClient({
      id: client.id,
      name: client.name,
      company_name: client.company_name,
      email: client.email,
      password: '',
      contact_phone: client.contact_phone || '',
      plan_id: client.plan_id || '',
      status: client.status,
      credits_available: client.credits_available || 0,
       channels_enabled: parseChannels(client.channels_enabled),
    });
    setModalMode('edit');
    setIsClientModalOpen(true);
  };

  const handleSuspend = async (client: any) => {
    try {
      const newStatus = client.status === 'suspended' ? 'active' : 'suspended';
      await axios.put(`${API_URL}/clients/${client.id}`, { status: newStatus });
      toast({
        title: 'Success',
        description: `Client ${newStatus === 'active' ? 'activated' : 'suspended'}`,
      });
      fetchClients();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

const handleLoginAsClient = async (clientId: string | number | undefined) => {
  if (!clientId || typeof clientId === 'object') {
    toast({
      variant: "destructive",
      title: "Error",
      description: "Invalid client selected.",
    });
    return;
  }

  const id = String(clientId);

  try {
    const response = await axios.post(`${API_BASE_URL}/api/clients/${id}/impersonate`);
    const { success, token, redirectTo } = response.data;

    if (success && token) {
      localStorage.setItem('authToken', token);
      toast({
        title: "Success",
        description: "Successfully logged in as client",
      });
      window.location.href = redirectTo || '/dashboard';
    } else {
      throw new Error('No token received');
    }
  } catch (err: any) {
    toast({
      variant: "destructive",
      title: "Impersonate Failed",
      description: err.response?.data?.message || 'Failed to login as client.',
    });
  }
};

  // Scroll logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; 
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const scrollHorizontally = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - 400 : scrollLeft + 400;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // Stats
  const totalClients = filteredClients.length;
  const totalActiveUsers = filteredClients.filter(c => c.status === 'active').length;
  const totalCreditsUsed = filteredClients.reduce((sum, c) => sum + (c.credits_used || 0), 0);
  const totalCreditsAvailable = filteredClients.reduce((sum, c) => sum + (c.credits_available || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and monitor all platform clients</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setModalMode('add');
            setIsClientModalOpen(true);
          }}
          className="w-full sm:w-auto shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
            title="Total Clients" 
            value={totalClients} 
            icon={Users} 
            color="text-primary" 
            bg="bg-primary/10" 
        />
        <StatsCard 
            title="Active Users" 
            value={totalActiveUsers} 
            icon={Check} 
            color="text-green-600" 
            bg="bg-green-500/10" 
        />
        <StatsCard 
            title="Credits Used" 
            value={(totalCreditsUsed / 1000).toFixed(1) + 'K'} 
            icon={CreditCard} 
            color="text-red-600" 
            bg="bg-red-500/10" 
        />
        <StatsCard 
            title="Available Credits" 
            value={(totalCreditsAvailable / 1000).toFixed(1) + 'K'} 
            icon={CreditCard} 
            color="text-blue-600" 
            bg="bg-blue-500/10" 
        />
      </div>

      {/* Filters */}
      <Card className="border-none shadow-sm bg-muted/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search by name, company or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 border-input/50 focus-visible:ring-1 focus-visible:ring-primary h-10"
              />
            </div>
            <div className="md:col-span-3">
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="h-10 bg-background/50 border-input/50">
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 bg-background/50 border-input/50">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Account</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="trial">Free Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="relative overflow-hidden border shadow-sm">
        <div className="flex items-center justify-between p-4 border-b bg-muted/5">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Client List</h2>
            <Badge variant="secondary" className="hidden sm:inline-flex bg-muted text-muted-foreground h-5 px-1.5 text-[10px]">{totalClients}</Badge>
          </div>
          <div className="flex items-center gap-1 sm:hidden">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollHorizontally('left')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => scrollHorizontally('right')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={cn(
            "w-full overflow-x-auto",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-muted/30">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]">Client Name</TableHead>
                <TableHead className="w-[180px]">Company</TableHead>
                <TableHead className="w-[220px]">Email</TableHead>
                <TableHead className="w-[120px]">Plan</TableHead>
                <TableHead className="text-center w-[150px]">Channels</TableHead>
                <TableHead className="text-right w-[120px]">Wallet Balance</TableHead>
                <TableHead className="w-[120px] text-center">Status</TableHead>
                <TableHead className="w-[140px]">Created</TableHead>
                <TableHead className="text-right w-[80px] sticky right-0 bg-background/95 backdrop-blur-sm shadow-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-20">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-sm text-muted-foreground">Loading clients...</p>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-20 text-muted-foreground">
                    No clients found
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="group">
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-muted-foreground">{client.company_name}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{client.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize font-normal">
                        {plans.find(p => p.id === client.plan_id)?.name || client.plan_id}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center -space-x-1.5 hover:space-x-0.5 transition-all">
                        {/* 
                           Show channels from the Plan if available, fall back to client's own channels 
                           The logic: client channels are auto-set from plan upon creation/update.
                        */}
                        {parseChannels(client.channels_enabled)
                          .filter((ch: any) => ['whatsapp', 'sms', 'rcs'].includes(ch))
                          .slice(0, 4)
                          .map((ch: any) => (
                          <div key={ch} className="relative z-0 hover:z-10 transition-all transform hover:scale-110">
                              <div className="bg-background rounded-full p-0.5 shadow-sm border">
                                <ChannelIcon channel={ch} className="w-5 h-5 shadow-sm" />
                              </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs font-medium text-green-600">
                                ₹{(client.wallet_balance || 0).toLocaleString()}
                             </span>
                             <span className="text-[10px] text-muted-foreground">
                                {client.credits_available.toLocaleString()} units
                             </span>
                        </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full capitalize shadow-none border', getStatusColor(client.status))}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(client.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-background/95 backdrop-blur-sm shadow-sm group-hover:bg-muted/5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem onClick={() => handleView(client)}>
                            <Eye className="w-4 h-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(client)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleLoginAsClient(client.id)}>
                            <LogIn className="w-4 h-4 mr-2" /> Login as Client
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSuspend(client)} className="text-red-600 focus:text-red-600">
                            <Ban className="w-4 h-4 mr-2" />
                            {client.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Redesigned Client Modal */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <DialogHeader className="p-6 border-b bg-muted/20 sticky top-0 z-10 backdrop-blur-xl">
            <DialogTitle className="text-xl flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              {modalMode === 'add' ? 'Add New Client' : modalMode === 'edit' ? 'Edit Client Details' : 'Client Details'}
            </DialogTitle>
            <DialogDescription>
                {modalMode === 'add' ? 'Create a new client account with specific permissions and credits.' : 'Manage client information and settings.'}
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-8">
            {/* Section 1: Basic Info */}
            <div className="space-y-4">
                <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" /> Account Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label>Client Name <span className="text-red-500">*</span></Label>
                        <Input
                        placeholder="e.g. John Doe"
                        value={currentClient.name}
                        onChange={e => setCurrentClient(prev => ({...prev, name: e.target.value}))}
                        disabled={modalMode === 'view'}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Company Name <span className="text-red-500">*</span></Label>
                        <Input
                        placeholder="e.g. Acme Corp"
                        value={currentClient.company_name}
                        onChange={e => setCurrentClient(prev => ({...prev, company_name: e.target.value}))}
                        disabled={modalMode === 'view'}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Email Address <span className="text-red-500">*</span></Label>
                        <Input
                        type="email"
                        placeholder="name@company.com"
                        value={currentClient.email}
                        onChange={e => setCurrentClient(prev => ({...prev, email: e.target.value}))}
                        disabled={modalMode === 'view'}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Contact Phone</Label>
                        <Input
                        placeholder="+1 (555) 000-0000"
                        value={currentClient.contact_phone}
                        onChange={e => setCurrentClient(prev => ({...prev, contact_phone: e.target.value}))}
                        disabled={modalMode === 'view'}
                        />
                    </div>
                     {modalMode !== 'view' && (
                        <div className="space-y-2 md:col-span-2">
                            <Label>Password {modalMode === 'add' && <span className="text-red-500">*</span>}</Label>
                            <Input
                                type="password"
                                placeholder={modalMode === 'add' ? "Create a secure password" : "Leave blank to keep current password"}
                                value={currentClient.password}
                                onChange={e => setCurrentClient(prev => ({...prev, password: e.target.value}))}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section 2: Plan & Credits */}
            <div className="space-y-4">
                 <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Subscription & Credits
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label>Assign Plan <span className="text-red-500">*</span></Label>
                        <Select
                        value={currentClient.plan_id}
                        onValueChange={handlePlanChange}
                        disabled={modalMode === 'view'}
                        >
                        <SelectTrigger>
                            <SelectValue placeholder="Select Plan" />
                        </SelectTrigger>
                        <SelectContent>
                            {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} (${p.price})</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Account Status</Label>
                        <Select
                        value={currentClient.status}
                        onValueChange={v => setCurrentClient(p => ({...p, status: v as any}))}
                        disabled={modalMode === 'view'}
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
                    <div className="space-y-2">
                        <Label>Initial Credits</Label>
                        <Input
                        type="number"
                        min="0"
                        value={currentClient.credits_available}
                        onChange={e => setCurrentClient(prev => ({...prev, credits_available: parseInt(e.target.value) || 0 }))}
                        disabled={modalMode === 'view'}
                        />
                    </div>
                </div>
            </div>

            {/* Channel section removed as per user request */}
          </div>

          <DialogFooter className="p-6 border-t bg-muted/20 sm:justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-xl">
             {modalMode === 'view' ? (
              <Button variant="outline" onClick={() => setIsClientModalOpen(false)}>Close</Button>
            ) : (
                <>
                <Button variant="outline" onClick={() => setIsClientModalOpen(false)} disabled={loading}>Cancel</Button>
                <Button onClick={modalMode === 'add' ? handleAddClient : handleUpdateClient} disabled={loading} className="gradient-primary">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {modalMode === 'add' ? 'Create Client' : 'Save Changes'}
                </Button>
                </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Sub-component for consistency
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