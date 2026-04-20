import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Eye, EyeOff, Ban, MoreVertical, Building2, Globe, CreditCard, Users, Loader2, Pencil, Trash2, LogIn, ChevronLeft, ChevronRight, Check, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api`;

const allChannels = ['whatsapp', 'rcs', 'sms'] as const;

export default function SuperAdminClients() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); // Logged in user info
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clients, setClients] = useState<any[]>([]);
  const [filteredClients, setFilteredClients] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]); // State for real plans
  const [rcsConfigs, setRcsConfigs] = useState<any[]>([]); // State for RCS configs
  const [whatsappConfigs, setWhatsappConfigs] = useState<any[]>([]); // State for WhatsApp configs
  const [smsGateways, setSmsGateways] = useState<any[]>([]); // State for SMS gateways
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('clients');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [showPassword, setShowPassword] = useState(false);

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
    rcs_config_id: '',
    whatsapp_config_id: '',
    rcs_text_price: 1.00,
    rcs_rich_card_price: 1.00,
    rcs_carousel_price: 1.00,
    wa_marketing_price: 1.00,
    wa_utility_price: 1.00,
    wa_authentication_price: 1.00,
    sms_promotional_price: 1.00,
    sms_transactional_price: 1.00,
    sms_service_price: 1.00,
    rcs_limit: null as number | null,
    wa_limit: null as number | null,
    sms_limit: null as number | null,
    voice_limit: null as number | null,
    sms_gateway_id: '',
    pe_id: '',
    hash_id: '',
    is_api_allowed: false,
  });

  // Fetch real plans
  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/plans`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/clients?_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  // Fetch RCS configurations
  const fetchRcsConfigs = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/rcs-configs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setRcsConfigs(res.data.configs || []);
      }
    } catch (err) {
      console.error('Failed to load RCS configs', err);
    }
  };

  // Fetch WhatsApp configurations
  const fetchWhatsappConfigs = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/whatsapp-configs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setWhatsappConfigs(res.data.configs || []);
      }
    } catch (err) {
      console.error('Failed to load WhatsApp configs', err);
    }
  };

  // Fetch SMS Gateways
  const fetchSmsGateways = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/sms-gateways`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setSmsGateways(res.data.gateways || []);
      }
    } catch (err) {
      console.error('Failed to load SMS gateways', err);
    }
  };

  useEffect(() => {
    fetchClients();
    fetchPlans();
    fetchRcsConfigs();
    fetchWhatsappConfigs();
    fetchSmsGateways();
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
      const payload = { ...currentClient };
      if (payload.rcs_config_id === '') payload.rcs_config_id = null as any;
      if (payload.whatsapp_config_id === '') payload.whatsapp_config_id = null as any;

      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_URL}/clients`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      if (payload.rcs_config_id === '') payload.rcs_config_id = null as any;
      if (payload.whatsapp_config_id === '') payload.whatsapp_config_id = null as any;
      if (payload.sms_gateway_id === '') payload.sms_gateway_id = null as any;

      const token = localStorage.getItem('authToken');
      const res = await axios.put(`${API_URL}/clients/${currentClient.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      rcs_config_id: '',
      whatsapp_config_id: '',
      rcs_text_price: 1.00,
      rcs_rich_card_price: 1.00,
      rcs_carousel_price: 1.00,
      wa_marketing_price: 1.00,
      wa_utility_price: 1.00,
      wa_authentication_price: 1.00,
      sms_promotional_price: 1.00,
      sms_transactional_price: 1.00,
      sms_service_price: 1.00,
      rcs_limit: null,
      wa_limit: null,
      sms_limit: null,
      voice_limit: null,
      sms_gateway_id: '',
      pe_id: '',
      hash_id: '',
      is_api_allowed: false,
    });
  }

  const handleMarkAsRead = async (clientId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${API_BASE_URL}/api/clients/${clientId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Update local state to reflect read status
      setClients(prev => prev.map(c => c.id === clientId ? { ...prev.find(x => x.id === clientId), is_read: 1 } : c));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleView = (client: any) => {
    if (client.status === 'pending' && !client.is_read) {
      handleMarkAsRead(client.id);
    }
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
      rcs_config_id: client.rcs_config_id ? String(client.rcs_config_id) : '',
      whatsapp_config_id: client.whatsapp_config_id ? String(client.whatsapp_config_id) : '',
      rcs_text_price: client.rcs_text_price || 1.00,
      rcs_rich_card_price: client.rcs_rich_card_price || 1.00,
      rcs_carousel_price: client.rcs_carousel_price || 1.00,
      wa_marketing_price: client.wa_marketing_price || 1.00,
      wa_utility_price: client.wa_utility_price || 1.00,
      wa_authentication_price: client.wa_authentication_price || 1.00,
      sms_promotional_price: client.sms_promotional_price || 1.00,
      sms_transactional_price: client.sms_transactional_price || 1.00,
      sms_service_price: client.sms_service_price || 1.00,
      rcs_limit: client.rcs_limit || null,
      wa_limit: client.wa_limit || null,
      sms_limit: client.sms_limit || null,
      voice_limit: client.voice_limit || null,
      sms_gateway_id: client.sms_gateway_id ? String(client.sms_gateway_id) : '',
      pe_id: client.pe_id || '',
      hash_id: client.hash_id || '',
      is_api_allowed: !!client.is_api_allowed,
    });
    setModalMode('view');
    setIsClientModalOpen(true);
  };

  const handleEdit = (client: any) => {
    if (client.status === 'pending' && !client.is_read) {
      handleMarkAsRead(client.id);
    }
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
      rcs_config_id: client.rcs_config_id ? String(client.rcs_config_id) : '',
      whatsapp_config_id: client.whatsapp_config_id ? String(client.whatsapp_config_id) : '',
      rcs_text_price: client.rcs_text_price || 1.00,
      rcs_rich_card_price: client.rcs_rich_card_price || 1.00,
      rcs_carousel_price: client.rcs_carousel_price || 1.00,
      wa_marketing_price: client.wa_marketing_price || 1.00,
      wa_utility_price: client.wa_utility_price || 1.00,
      wa_authentication_price: client.wa_authentication_price || 1.00,
      sms_promotional_price: client.sms_promotional_price || 1.00,
      sms_transactional_price: client.sms_transactional_price || 1.00,
      sms_service_price: client.sms_service_price || 1.00,
      rcs_limit: client.rcs_limit || null,
      wa_limit: client.wa_limit || null,
      sms_limit: client.sms_limit || null,
      voice_limit: client.voice_limit || null,
      sms_gateway_id: client.sms_gateway_id ? String(client.sms_gateway_id) : '',
      pe_id: client.pe_id || '',
      hash_id: client.hash_id || '',
      is_api_allowed: !!client.is_api_allowed,
    });
    setModalMode('edit');
    setIsClientModalOpen(true);
  };

  const handleSuspend = async (client: any) => {
    try {
      const newStatus = client.status === 'suspended' ? 'active' : 'suspended';
      const token = localStorage.getItem('authToken');
      await axios.put(`${API_URL}/clients/${client.id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    const token = localStorage.getItem('authToken');

    try {
      const response = await axios.post(`${API_BASE_URL}/api/clients/${id}/impersonate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { success, token: impToken, redirectTo } = response.data;

      if (success && impToken) {
        localStorage.setItem('authToken', impToken);
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

  const handleDeleteClient = async (client: any) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE client "${client.name}" (${client.email})? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.delete(`${API_URL}/clients/${client.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast({
          title: 'Deleted',
          description: `Client ${client.name} has been removed.`,
        });
        fetchClients();
      } else {
        toast({ title: 'Failed', description: res.data.message || 'Could not delete client', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to delete client',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
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
  const totalCreditsAssigned = (filteredClients || []).reduce((sum, c) => sum + (Number(c.credits_available) || 0) + (Number(c.credits_used) || 0), 0);
  const totalCreditsAvailable = (filteredClients || []).reduce((sum, c) => sum + (Number(c.credits_available) || 0), 0);

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
          title="Total Assigned"
          value={(Number(totalCreditsAssigned || 0) / 1000).toFixed(1) + 'K'}
          icon={CreditCard}
          color="text-red-600"
          bg="bg-red-500/10"
        />
        <StatsCard
          title={currentUser?.role === 'reseller' ? "My Credit Pool" : "Available Credits"}
          value={(currentUser?.role === 'admin' || currentUser?.role === 'superadmin') 
            ? "Unlimited" 
            : (currentUser?.wallet_balance || 0).toLocaleString()}
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-80 grid-cols-2 rounded-xl bg-muted/50 p-1 mb-2">
          <TabsTrigger value="clients" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Clients
          </TabsTrigger>
          <TabsTrigger value="enquiries" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm relative">
            Enquiries
            {filteredClients.filter(c => c.status === 'pending' && !c.is_read).length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white animate-pulse">
                {filteredClients.filter(c => c.status === 'pending' && !c.is_read).length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <Card className="relative overflow-hidden border shadow-sm">
          <div className="flex items-center justify-between p-4 border-b bg-muted/5">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                {activeTab === 'clients' ? 'Client List' : 'New Enquiries'}
              </h2>
              <Badge variant="secondary" className="hidden sm:inline-flex bg-muted text-muted-foreground h-5 px-1.5 text-[10px]">
                {activeTab === 'clients' 
                  ? filteredClients.filter(c => c.status !== 'pending').length 
                  : filteredClients.filter(c => c.status === 'pending').length}
              </Badge>
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
                ) : (activeTab === 'clients' 
                  ? filteredClients.filter(c => c.status !== 'pending')
                  : filteredClients.filter(c => c.status === 'pending')
                ).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-20 text-muted-foreground">
                      No {activeTab === 'clients' ? 'clients' : 'enquiries'} found
                    </TableCell>
                  </TableRow>
                ) : (
                  (activeTab === 'clients' 
                    ? filteredClients.filter(c => c.status !== 'pending')
                    : filteredClients.filter(c => c.status === 'pending')
                  ).map((client) => (
                    <TableRow key={client.id} className={cn("group transition-colors", client.status === 'pending' && !client.is_read && "bg-blue-50/50 hover:bg-blue-100/50")}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {client.name}
                          {client.status === 'pending' && !client.is_read && (
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{client.company_name}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{client.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize font-normal">
                          {plans.find(p => p.id === client.plan_id)?.name || client.plan_id}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center -space-x-1.5 hover:space-x-0.5 transition-all">
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
                            {"\u20B9"}{(client.wallet_balance || 0).toLocaleString()}
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
                            <DropdownMenuItem onClick={() => handleSuspend(client)} className="text-orange-600 focus:text-orange-600">
                              <Ban className="w-4 h-4 mr-2" />
                              {client.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClient(client)} className="text-red-600 focus:text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete Account
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
      </Tabs>

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
                    onChange={e => setCurrentClient(prev => ({ ...prev, name: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company Name <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="e.g. Acme Corp"
                    value={currentClient.company_name}
                    onChange={e => setCurrentClient(prev => ({ ...prev, company_name: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address <span className="text-red-500">*</span></Label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={currentClient.email}
                    onChange={e => setCurrentClient(prev => ({ ...prev, email: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    placeholder="+1 (555) 000-0000"
                    value={currentClient.contact_phone}
                    onChange={e => setCurrentClient(prev => ({ ...prev, contact_phone: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                {modalMode !== 'view' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Password {modalMode === 'add' && <span className="text-red-500">*</span>}</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder={modalMode === 'add' ? "Create a secure password" : "Leave blank to keep current password"}
                        value={currentClient.password}
                        onChange={e => setCurrentClient(prev => ({ ...prev, password: e.target.value }))}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}
                {modalMode !== 'view' && (
                  <div className="flex items-center space-x-2 pt-2 md:col-span-2">
                    <Checkbox 
                      id="api_hub_access" 
                      checked={currentClient.is_api_allowed}
                      onCheckedChange={(checked) => setCurrentClient(prev => ({ ...prev, is_api_allowed: !!checked }))}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <Label htmlFor="api_hub_access" className="text-sm font-semibold cursor-pointer">Enable API Hub Access</Label>
                      <p className="text-[10px] text-muted-foreground">Allows the client to view API Documentation and integrate via REST APIs.</p>
                    </div>
                  </div>
                )}
                {modalMode === 'view' && (
                  <div className="md:col-span-2">
                    <Badge variant={currentClient.is_api_allowed ? 'default' : 'outline'} className="text-[10px]">
                      API HUB: {currentClient.is_api_allowed ? 'ENABLED' : 'DISABLED'}
                    </Badge>
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
                    onValueChange={v => setCurrentClient(p => ({ ...p, status: v as any }))}
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
                  <div className="flex justify-between items-center">
                    <Label>Initial Credits</Label>
                    {currentUser?.role === 'reseller' && (
                       <span className="text-[10px] font-bold text-emerald-600">Pool: {Number(currentUser.wallet_balance).toLocaleString()}</span>
                    )}
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={currentClient.credits_available}
                    onChange={e => setCurrentClient(prev => ({ ...prev, credits_available: parseInt(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                    className={cn(
                      currentUser?.role === 'reseller' && 
                      currentClient.credits_available > (currentUser?.wallet_balance || 0) && 
                      "border-red-500 focus-visible:ring-red-500"
                    )}
                  />
                  {currentUser?.role === 'reseller' && currentClient.credits_available > (currentUser?.wallet_balance || 0) && (
                    <p className="text-[10px] text-red-500 font-medium">Warning: Exceeds your available pool.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Channel Quotas / Allocations */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Channel Allocations (Budget Limits)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label>RCS Limit (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Unlimited if empty"
                    value={currentClient.rcs_limit === null ? '' : currentClient.rcs_limit}
                    onChange={e => setCurrentClient(prev => ({ ...prev, rcs_limit: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp Limit (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Unlimited if empty"
                    value={currentClient.wa_limit === null ? '' : currentClient.wa_limit}
                    onChange={e => setCurrentClient(prev => ({ ...prev, wa_limit: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SMS Limit (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Unlimited if empty"
                    value={currentClient.sms_limit === null ? '' : currentClient.sms_limit}
                    onChange={e => setCurrentClient(prev => ({ ...prev, sms_limit: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Voice Limit (₹)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="Unlimited if empty"
                    value={currentClient.voice_limit === null ? '' : currentClient.voice_limit}
                    onChange={e => setCurrentClient(prev => ({ ...prev, voice_limit: e.target.value === '' ? null : parseFloat(e.target.value) }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section 3: RCS Configuration */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Provider Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>RCS Configuration</Label>
                  <Select
                    value={currentClient.rcs_config_id || 'default'}
                    onValueChange={v => setCurrentClient(p => ({ ...p, rcs_config_id: v === 'default' ? '' : v }))}
                    disabled={modalMode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select RCS Configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">None (Select a configuration)</SelectItem>
                      {rcsConfigs.map(config => (
                        <SelectItem key={config.id} value={String(config.id)}>{config.name} ({config.bot_id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Each user must have a Dotgo RCS configuration assigned to send messages.</p>
                </div>

                <div className="space-y-2">
                  <Label>WhatsApp Configuration</Label>
                  <Select
                    value={currentClient.whatsapp_config_id || 'default'}
                    onValueChange={v => setCurrentClient(p => ({ ...p, whatsapp_config_id: v === 'default' ? '' : v }))}
                    disabled={modalMode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select WhatsApp Configuration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">None (Select a configuration)</SelectItem>
                      {whatsappConfigs.map(config => (
                        <SelectItem key={config.id} value={String(config.id)}>{config.chatbot_name || 'Unnamed Bot'} ({config.ph_no_id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Each user must have a Meta WhatsApp business account assigned to send messages.</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section: SMS Gateway & DLT Metadata */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" /> SMS Gateway & DLT Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>SMS Gateway</Label>
                  <Select
                    value={currentClient.sms_gateway_id || 'default'}
                    onValueChange={v => setCurrentClient(p => ({ ...p, sms_gateway_id: v === 'default' ? '' : v }))}
                    disabled={modalMode === 'view'}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select SMS Gateway" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">None (Use Global Default)</SelectItem>
                      {smsGateways.map(gw => (
                        <SelectItem key={gw.id} value={String(gw.id)}>{gw.name} ({gw.sender_id})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Default PE ID</Label>
                  <Input
                    placeholder="Principal Entity ID"
                    value={currentClient.pe_id || ''}
                    onChange={e => setCurrentClient(p => ({ ...p, pe_id: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Default Hash ID</Label>
                  <Input
                    placeholder="DLT Hash ID"
                    value={currentClient.hash_id || ''}
                    onChange={e => setCurrentClient(p => ({ ...p, hash_id: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section 4: RCS Custom Pricing */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" /> RCS Custom Pricing (Per Message)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Normal Message (₹)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={currentClient.rcs_text_price}
                      onChange={e => setCurrentClient(prev => ({ ...prev, rcs_text_price: parseFloat(e.target.value) || 0 }))}
                      disabled={modalMode === 'view'}
                    />
                  <p className="text-[10px] text-muted-foreground">Standard text templates</p>
                </div>
                <div className="space-y-2">
                  <Label>Rich Card (₹)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={currentClient.rcs_rich_card_price}
                    onChange={e => setCurrentClient(prev => ({ ...prev, rcs_rich_card_price: parseFloat(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-[10px] text-muted-foreground">Single rich cards</p>
                </div>
                <div className="space-y-2">
                  <Label>Carousel (₹)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={currentClient.rcs_carousel_price}
                    onChange={e => setCurrentClient(prev => ({ ...prev, rcs_carousel_price: parseFloat(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-[10px] text-muted-foreground">Carousel/multi-card</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section 5: WhatsApp Custom Pricing */}
            <div className="space-y-4 pb-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" /> WhatsApp Custom Pricing (Per Message)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Marketing (₹)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={currentClient.wa_marketing_price}
                      onChange={e => setCurrentClient(prev => ({ ...prev, wa_marketing_price: parseFloat(e.target.value) || 0 }))}
                      disabled={modalMode === 'view'}
                    />
                  <p className="text-[10px] text-muted-foreground">Marketing templates</p>
                </div>
                <div className="space-y-2">
                  <Label>Utility (₹)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={currentClient.wa_utility_price}
                    onChange={e => setCurrentClient(prev => ({ ...prev, wa_utility_price: parseFloat(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-[10px] text-muted-foreground">Utility/Operational</p>
                </div>
                <div className="space-y-2">
                  <Label>Authentication (₹)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={currentClient.wa_authentication_price}
                    onChange={e => setCurrentClient(prev => ({ ...prev, wa_authentication_price: parseFloat(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-[10px] text-muted-foreground">OTP/Auth templates</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />
            
            {/* Section 6: SMS Custom Pricing */}
            <div className="space-y-4 pb-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" /> SMS Custom Pricing (Per Message)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Promotional (₹)</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={currentClient.sms_promotional_price}
                      onChange={e => setCurrentClient(prev => ({ ...prev, sms_promotional_price: parseFloat(e.target.value) || 0 }))}
                      disabled={modalMode === 'view'}
                    />
                  <p className="text-[10px] text-muted-foreground">Bulk Marketing SMS</p>
                </div>
                <div className="space-y-2">
                  <Label>Transactional (₹)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={currentClient.sms_transactional_price}
                    onChange={e => setCurrentClient(prev => ({ ...prev, sms_transactional_price: parseFloat(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-[10px] text-muted-foreground">OTP/Auth templates</p>
                </div>
                <div className="space-y-2">
                  <Label>Service (₹)</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={currentClient.sms_service_price}
                    onChange={e => setCurrentClient(prev => ({ ...prev, sms_service_price: parseFloat(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-[10px] text-muted-foreground">Alerts/Operational</p>
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