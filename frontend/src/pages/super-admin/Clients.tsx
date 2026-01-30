import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Eye, Ban, MoreVertical, Building2, Globe, CreditCard, Users, Loader2, Pencil, Trash2, LogIn, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ChannelIcon } from '@/components/ui/channel-icon'; // ← yeh add kiya
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const API_URL = 'http://localhost:5000/api';

const allChannels = ['whatsapp', 'rcs', 'sms', 'email', 'instagram', 'facebook'] as const;

const plans = [
  { id: 'basic', name: 'Basic', price: 99 },
  { id: 'pro', name: 'Pro', price: 299 },
  { id: 'enterprise', name: 'Enterprise', price: 999 },
];

export default function SuperAdminClients() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
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

  // Fetch real clients from backend
  const fetchClients = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/clients`);
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
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'trial': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
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
        fetchClients(); // Refresh list
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
        delete payload.password;
      }
      const res = await axios.put(`${API_URL}/clients/${currentClient.id}`, payload);
      if (res.data.success) {
        toast({
          title: 'Success',
          description: `${currentClient.name} has been updated successfully`,
        });
        setIsClientModalOpen(false);
        fetchClients(); // Refresh list
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

  const handleView = (client: any) => {
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
      channels_enabled: JSON.parse(client.channels_enabled || '[]'),
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
      channels_enabled: JSON.parse(client.channels_enabled || '[]'),
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

  // const handleDelete = async (client: any) => {
  //   if (!window.confirm("Are you sure you want to delete this client?")) return;

  //   try {
  //     const res = await axios.delete(`${API_URL}/clients/${client.id}`);
  //     if (res.data.success) {
  //       toast({
  //         title: 'Success',
  //         description: 'Client deleted successfully',
  //       });
  //       fetchClients(); // refresh your datatable
  //     } else {
  //       toast({
  //         title: 'Error',
  //         description: res.data.message || 'Failed to delete client',
  //         variant: 'destructive',
  //       });
  //     }
  //   } catch (err: any) {
  //     console.error('DELETE CLIENT ERROR:', err);
  //     toast({
  //       title: 'Error',
  //       description: 'Failed to delete client',
  //       variant: 'destructive',
  //     });
  //   }
  // };




const handleLoginAsClient = async (clientId: string | number | undefined) => {
  // Safety check – prevent [object Object] or invalid ID
  if (!clientId || typeof clientId === 'object') {
    console.error('Invalid clientId passed to impersonate:', clientId);
    toast({
      variant: "destructive",
      title: "Error",
      description: "Invalid client selected. Please try again.",
    });
    return;
  }

  const id = String(clientId); // make sure it's string

  console.log(`Attempting to impersonate client ID: ${id}`);

  try {
    const response = await axios.post(`http://localhost:5000/api/clients/${id}/impersonate`);

    console.log('Impersonate response:', response.data);

    const { success, token, redirectTo } = response.data;

    if (success && token) {
      localStorage.setItem('authToken', token);

      toast({
        title: "Success",
        description: "Successfully logged in as client",
      });

      // Redirect to dashboard
      window.location.href = redirectTo || '/dashboard';
    } else {
      throw new Error('No token received from server');
    }
  } catch (err: any) {
    console.error('Impersonate failed:', err);

    const errorMessage =
      err.response?.data?.message ||
      err.message ||
      'Failed to login as client. Server may be down or client not found.';

    toast({
      variant: "destructive",
      title: "Impersonate Failed",
      description: errorMessage,
    });
  }
};

  // Scroll & Drag functionality
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

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2; // Scroll speed
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const scrollHorizontally = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - 400 : scrollLeft + 400;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // Real totals from filtered clients
  const totalClients = filteredClients.length;
  const totalActiveUsers = filteredClients.filter(c => c.status === 'active').length;
  const totalCreditsUsed = filteredClients.reduce((sum, c) => sum + (c.credits_used || 0), 0);
  const totalCreditsAvailable = filteredClients.reduce((sum, c) => sum + (c.credits_available || 0), 0);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Clients</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage all platform clients</p>
        </div>
        <Button
          onClick={() => {
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
            setModalMode('add');
            setIsClientModalOpen(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Client
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200 border-none bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Clients</p>
              <p className="text-2xl font-black text-primary">{totalClients}</p>
            </div>
            <div className="bg-primary/10 p-2.5 rounded-xl">
               <Building2 className="w-6 h-6 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="hover:shadow-md transition-shadow duration-200 border-none bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Users</p>
              <p className="text-2xl font-black text-green-600">{totalActiveUsers}</p>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 p-2.5 rounded-xl">
               <Users className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200 border-none bg-red-50/50 dark:bg-red-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credits Used</p>
              <p className="text-2xl font-black text-red-600">{(totalCreditsUsed / 1000).toFixed(1)}K</p>
            </div>
            <div className="bg-red-100 dark:bg-red-900/30 p-2.5 rounded-xl">
               <CreditCard className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow duration-200 border-none bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available</p>
              <p className="text-2xl font-black text-blue-600">{(totalCreditsAvailable / 1000).toFixed(1)}K</p>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2.5 rounded-xl">
               <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
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
                className="pl-10 bg-background/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-11"
              />
            </div>
            <div className="md:col-span-3">
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="h-11 bg-background/50 border-none focus:ring-1 focus:ring-primary">
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
                <SelectTrigger className="h-11 bg-background/50 border-none focus:ring-1 focus:ring-primary">
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

      {/* Clients Table with Header Scroll Controls */}
      <Card className="relative overflow-hidden border-none shadow-lg">
        <div className="flex items-center justify-between p-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-lg">Client List</h2>
            <Badge variant="secondary" className="hidden sm:inline-flex">{totalClients} Total</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-background"
              onClick={(e) => {
                e.stopPropagation();
                scrollHorizontally('left');
              }}
              title="Scroll Left"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 rounded-full bg-background"
              onClick={(e) => {
                e.stopPropagation();
                scrollHorizontally('right');
              }}
              title="Scroll Right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* OUR CUSTOM SCROLLING CONTAINER */}
        <div 
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          className={cn(
            "w-full overflow-x-auto overflow-y-hidden select-none touch-pan-x",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
        >
          <table className="w-full caption-bottom text-sm border-collapse min-w-[1000px]">
            <TableHeader className="bg-muted/30 sticky top-0 z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px] whitespace-nowrap">Client Name</TableHead>
                <TableHead className="w-[180px] whitespace-nowrap">Company</TableHead>
                <TableHead className="w-[220px] whitespace-nowrap">Email</TableHead>
                <TableHead className="w-[120px] whitespace-nowrap">Plan</TableHead>
                <TableHead className="text-center w-[150px] whitespace-nowrap">Channels</TableHead>
                <TableHead className="text-right w-[120px] whitespace-nowrap">Used</TableHead>
                <TableHead className="text-right w-[120px] whitespace-nowrap">Available</TableHead>
                <TableHead className="w-[120px] whitespace-nowrap text-center">Status</TableHead>
                <TableHead className="w-[140px] whitespace-nowrap">Created</TableHead>
                <TableHead className="text-right w-[80px] sticky right-0 bg-background/95 backdrop-blur-sm z-20 border-l shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
                    <p className="mt-4 text-sm font-medium text-muted-foreground italic">Fetching data from server...</p>
                  </TableCell>
                </TableRow>
              ) : filteredClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-20 text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                       <Search className="w-12 h-12 opacity-20" />
                       <p className="font-medium">No clients found matching your filters</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredClients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-semibold text-primary">{client.name}</TableCell>
                    <TableCell className="font-medium">{client.company_name}</TableCell>
                    <TableCell className="text-xs font-mono">{client.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {plans.find(p => p.id === client.plan_id)?.name || client.plan_id}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1.5">
                        {JSON.parse(client.channels_enabled || '[]').slice(0, 4).map((ch: any) => (
                          <ChannelIcon key={ch} channel={ch} className="w-5 h-5 shadow-sm" />
                        ))}
                        {JSON.parse(client.channels_enabled || '[]').length > 4 && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1">
                            +{JSON.parse(client.channels_enabled || '[]').length - 4}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {client.credits_used?.toLocaleString() || '0'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {client.credits_available.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn('text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter', getStatusColor(client.status))}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(client.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-background/95 backdrop-blur-sm z-20 border-l shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => handleView(client)} className="gap-2">
                            <Eye className="w-4 h-4 text-blue-500" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(client)} className="gap-2">
                            <Pencil className="w-4 h-4 text-amber-500" /> Edit Client
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleLoginAsClient(client.id)} className="gap-2">
                            <LogIn className="w-4 h-4 text-primary" /> Login as Client
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSuspend(client)} className="gap-2">
                            <Ban className="w-4 h-4 text-red-500" />
                            {client.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </table>
        </div>
      </Card>

      {/* Client Modal Dialog */}
      <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
        <DialogContent className="max-w-3xl sm:max-w-[95vw] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl flex items-center gap-3">
              <Building2 className="w-6 h-6 text-primary" />
              {modalMode === 'add' ? 'Add New Client' : modalMode === 'edit' ? `Edit Client: ${currentClient.name}` : `View Client: ${currentClient.name}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 sm:space-y-6 py-4">
            {/* Name & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client Name *</Label>
                <Input
                  placeholder="Enter client name"
                  value={currentClient.name}
                  onChange={e => setCurrentClient(prev => ({...prev, name: e.target.value}))}
                  disabled={modalMode === 'view'}
                />
              </div>
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  placeholder="Enter company name"
                  value={currentClient.company_name}
                  onChange={e => setCurrentClient(prev => ({...prev, company_name: e.target.value}))}
                  disabled={modalMode === 'view'}
                />
              </div>
            </div>

            {/* Email & Password */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="client@example.com"
                  value={currentClient.email}
                  onChange={e => setCurrentClient(prev => ({...prev, email: e.target.value}))}
                  disabled={modalMode === 'view'}
                />
              </div>
              {modalMode !== 'view' && (
                <div className="space-y-2">
                  <Label>Password {modalMode === 'add' ? '*' : '(Leave blank to keep current)'}</Label>
                  <Input
                    type="password"
                    placeholder="Enter password"
                    value={currentClient.password}
                    onChange={e => setCurrentClient(prev => ({...prev, password: e.target.value}))}
                  />
                </div>
              )}
            </div>

            {/* Contact Phone */}
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input
                placeholder="+91 98765 43210"
                value={currentClient.contact_phone}
                onChange={e => setCurrentClient(prev => ({...prev, contact_phone: e.target.value}))}
                disabled={modalMode === 'view'}
              />
            </div>

            {/* Plan & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan *</Label>
                <Select
                  value={currentClient.plan_id}
                  onValueChange={v => setCurrentClient(p => ({...p, plan_id: v}))}
                  disabled={modalMode === 'view'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} - ${p.price}/mo</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
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
            </div>

            {/* Credits */}
            <div className="space-y-2">
              <Label>Initial Credits</Label>
              <Input
                type="number"
                placeholder="0"
                value={currentClient.credits_available}
                onChange={e => setCurrentClient(prev => ({...prev, credits_available: parseInt(e.target.value) || 0 }))}
                disabled={modalMode === 'view'}
              />
            </div>

            {/* Channels */}
            <div className="space-y-3">
              <Label>Channels Enabled</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {allChannels.map(channel => (
                  <div
                    key={channel}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg transition-colors',
                      currentClient.channels_enabled.includes(channel) && 'border-primary bg-primary/5',
                      modalMode !== 'view' && 'cursor-pointer hover:bg-muted/50'
                    )}
                    onClick={modalMode !== 'view' ? () => handleChannelToggle(channel) : undefined}
                  >
                    <Checkbox
                      checked={currentClient.channels_enabled.includes(channel)}
                      onCheckedChange={() => handleChannelToggle(channel)}
                      disabled={modalMode === 'view'}
                    />
                    <ChannelIcon channel={channel} className="w-6 h-6 flex-shrink-0" />
                    <span className="capitalize text-sm font-medium truncate">{channel}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-3 pt-4 border-t">
            {modalMode !== 'view' && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIsClientModalOpen(false)}>
                Cancel
              </Button>
            )}
            {modalMode === 'view' ? (
              <Button className="w-full sm:w-auto" onClick={() => setIsClientModalOpen(false)}>
                Close
              </Button>
            ) : (
              <Button className="w-full sm:w-auto gradient-primary" onClick={modalMode === 'add' ? handleAddClient : handleUpdateClient} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {modalMode === 'add' ? 'Adding...' : 'Updating...'}
                  </>
                ) : (
                  modalMode === 'add' ? 'Add Client' : 'Update Client'
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}   