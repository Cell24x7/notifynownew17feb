import { useState, useEffect } from 'react';
import { Search, Plus, Eye, EyeOff, Pencil, Users, Percent, MoreVertical, Loader2, CreditCard, LogIn, Ban, Trash2, Globe, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { DialogDescription } from '@/components/ui/dialog'; // Added
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ChannelIcon } from '@/components/ui/channel-icon';

import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api`;

export default function SuperAdminResellers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [resellers, setResellers] = useState<any[]>([]);
  const [filteredResellers, setFilteredResellers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [showPassword, setShowPassword] = useState(false);
  const [currentReseller, setCurrentReseller] = useState({
    id: null as number | null,
    name: '',
    email: '',
    phone: '',
    domain: '',
    api_base_url: '',
    commission_percent: 10,
    credits_available: 0,
    credits_spent: 0,
    plan_id: '',
    status: 'active' as 'active' | 'inactive' | 'pending',
    channels_enabled: [] as string[],
    password: '',
    clients_managed: 0,
    revenue_generated: 0,
    payout_pending: 0,
    brand_name: '',
    logo_url: '',
    favicon_url: '',
    primary_color: '#3b82f6',
    secondary_color: '#1d4ed8',
    support_email: '',
    support_phone: '',
    rcs_text_price: 1.00,
    rcs_rich_card_price: 1.00,
    rcs_carousel_price: 1.00,
    wa_marketing_price: 1.00,
    wa_utility_price: 1.00,
    wa_authentication_price: 1.00,
    sms_promotional_price: 1.00,
    sms_transactional_price: 1.00,
    sms_service_price: 1.00,
    is_dinstar_enabled: false,
    is_api_allowed: false,
    is_proero_enabled: false,
    is_smm_enabled: false,
    dlr_webhook_url: '',
    wa_unofficial_webhook_enabled: false,
  });

  const cleanNumber = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.-]+/g, '');
    return parseFloat(cleaned) || 0;
  };

  // Fetch plans
  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/plans?admin=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data) {
        setPlans(res.data);
      }
    } catch (err) {
      console.error('Failed to load plans', err);
    }
  };

  // Fetch resellers
  const fetchResellers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/resellers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    fetchPlans();
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
    } else if (currentReseller.name.trim().length < 2) {
      errors.push('Name must be at least 2 characters.');
    }

    // Email: strict format
    if (!currentReseller.email.trim()) {
      errors.push('Email is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(currentReseller.email.trim())) {
      errors.push('Please enter a valid email address.');
    }

    // Plan
    if (!currentReseller.plan_id) {
      errors.push('Plan is required.');
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
      const token = localStorage.getItem('authToken');
      let res;
      if (modalMode === 'add') {
        res = await axios.post(`${API_URL}/resellers`, currentReseller, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        res = await axios.put(`${API_URL}/resellers/${currentReseller.id}`, currentReseller, {
          headers: { Authorization: `Bearer ${token}` }
        });
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

  const handlePlanChange = (planId: string) => {
    // Convert to string for comparison to handle both number/string IDs
    const selectedPlan = plans.find(p => String(p.id) === String(planId));
    let newChannels: string[] = [];

    if (selectedPlan && selectedPlan.channelsAllowed) {
      newChannels = selectedPlan.channelsAllowed;
    }

    setCurrentReseller(prev => ({
      ...prev,
      plan_id: planId,
      channels_enabled: newChannels
    }));
  };

  const handleView = (reseller: any) => {
    setCurrentReseller({
      ...reseller,
      brand_name: reseller.brand_name || '',
      logo_url: reseller.logo_url || '',
      favicon_url: reseller.favicon_url || '',
      primary_color: reseller.primary_color || '#3b82f6',
      secondary_color: reseller.secondary_color || '#1d4ed8',
      support_email: reseller.support_email || '',
      support_phone: reseller.support_phone || '',
      api_base_url: reseller.api_base_url || '',
      domain: reseller.domain || '',
      rcs_text_price: reseller.rcs_text_price || 1.00,
      rcs_rich_card_price: reseller.rcs_rich_card_price || 1.00,
      rcs_carousel_price: reseller.rcs_carousel_price || 1.00,
      wa_marketing_price: reseller.wa_marketing_price || 1.00,
      wa_utility_price: reseller.wa_utility_price || 1.00,
      wa_authentication_price: reseller.wa_authentication_price || 1.00,
      sms_promotional_price: reseller.sms_promotional_price || 1.00,
      sms_transactional_price: reseller.sms_transactional_price || 1.00,
      sms_service_price: reseller.sms_service_price || 1.00,
      is_dinstar_enabled: !!reseller.is_dinstar_enabled,
      is_api_allowed: !!reseller.is_api_allowed,
      is_proero_enabled: !!reseller.is_proero_enabled,
      is_smm_enabled: !!reseller.is_smm_enabled,
      dlr_webhook_url: reseller.dlr_webhook_url || '',
      wa_unofficial_webhook_enabled: !!reseller.wa_unofficial_webhook_enabled,
      password: '',
    });
    setModalMode('view');
    setIsModalOpen(true);
  };

  const handleEdit = (reseller: any) => {
    // When editing, if reseller has channels, use them. 
    // If not, maybe auto-populate from plan? 
    // Using existing data is safer.

    // Check if channels_enabled is a string or array
    let channels = [];
    try {
      if (typeof reseller.channels_enabled === 'string') {
        channels = JSON.parse(reseller.channels_enabled);
      } else if (Array.isArray(reseller.channels_enabled)) {
        channels = reseller.channels_enabled;
      }
    } catch (e) {
      channels = [];
    }

    setCurrentReseller({
      ...reseller,
      channels_enabled: channels,
      brand_name: reseller.brand_name || '',
      logo_url: reseller.logo_url || '',
      favicon_url: reseller.favicon_url || '',
      primary_color: reseller.primary_color || '#3b82f6',
      secondary_color: reseller.secondary_color || '#1d4ed8',
      support_email: reseller.support_email || '',
      support_phone: reseller.support_phone || '',
      api_base_url: reseller.api_base_url || '',
      domain: reseller.domain || '',
      rcs_text_price: reseller.rcs_text_price || 1.00,
      rcs_rich_card_price: reseller.rcs_rich_card_price || 1.00,
      rcs_carousel_price: reseller.rcs_carousel_price || 1.00,
      wa_marketing_price: reseller.wa_marketing_price || 1.00,
      wa_utility_price: reseller.wa_utility_price || 1.00,
      wa_authentication_price: reseller.wa_authentication_price || 1.00,
      sms_promotional_price: reseller.sms_promotional_price || 1.00,
      sms_transactional_price: reseller.sms_transactional_price || 1.00,
      sms_service_price: reseller.sms_service_price || 1.00,
      is_dinstar_enabled: !!reseller.is_dinstar_enabled,
      is_api_allowed: !!reseller.is_api_allowed,
      is_proero_enabled: !!reseller.is_proero_enabled,
      is_smm_enabled: !!reseller.is_smm_enabled,
      dlr_webhook_url: reseller.dlr_webhook_url || '',
      wa_unofficial_webhook_enabled: !!reseller.wa_unofficial_webhook_enabled,
      password: '', 
    });
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleLoginAsReseller = async (resellerId: number | string) => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await axios.post(`${API_URL}/resellers/${resellerId}/impersonate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const { success, token: impToken, redirectTo } = response.data;

      if (success && impToken) {
        localStorage.setItem('authToken', impToken);
        toast({
          title: "Success",
          description: "Successfully logged in as reseller",
        });
        window.location.href = redirectTo || '/dashboard';
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Impersonate Failed",
        description: err.response?.data?.message || 'Failed to login as reseller.',
      });
    }
  };

  const handleSuspend = async (reseller: any) => {
    try {
      const newStatus = reseller.status === 'suspended' ? 'active' : 'suspended';
      const token = localStorage.getItem('authToken');
      await axios.put(`${API_URL}/resellers/${reseller.id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({
        title: 'Success',
        description: `Reseller ${newStatus === 'active' ? 'activated' : 'suspended'}`,
      });
      fetchResellers();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleDeleteReseller = async (reseller: any) => {
    if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE reseller "${reseller.name}" (${reseller.email})? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.delete(`${API_URL}/resellers/${reseller.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast({
          title: 'Deleted',
          description: `Reseller ${reseller.name} has been removed.`,
        });
        fetchResellers();
      } else {
        toast({ title: 'Failed', description: res.data.message || 'Could not delete reseller', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to delete reseller',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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
      credits_spent: 0,
      plan_id: '',
      status: 'active',
      channels_enabled: [],
      password: '',
      clients_managed: 0,
      revenue_generated: 0,
      payout_pending: 0,
      brand_name: '',
      logo_url: '',
      favicon_url: '',
      primary_color: '#3b82f6',
      secondary_color: '#1d4ed8',
      support_email: '',
      support_phone: '',
    });
  };

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

  const totalRevenue = resellers.reduce((acc, r) => acc + cleanNumber(r.revenue_generated), 0);
  const totalClients = resellers.reduce((acc, r) => acc + (parseInt(r.clients_managed) || 0), 0);
  const totalResellerPool = resellers.reduce((acc, r) => acc + cleanNumber(r.credits_available), 0);
  const totalPending = resellers.reduce((acc, r) => acc + cleanNumber(r.payout_pending), 0);

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
                <span className="text-primary">{"\u20B9"}</span>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Revenue Generated</p>
                <p className="text-lg sm:text-2xl font-bold">{"\u20B9"}{Number(totalRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total Credit Pool</p>
                <p className="text-lg sm:text-2xl font-bold">{totalResellerPool.toLocaleString()}</p>
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
              <TableHead className="min-w-[140px]">Reseller</TableHead>
              <TableHead className="min-w-[180px]">Account</TableHead>
              <TableHead className="min-w-[120px]">Plan</TableHead>
              <TableHead className="text-right min-w-[110px]">Pool Available</TableHead>
              <TableHead className="text-right min-w-[110px]">Credits Spent</TableHead>
              <TableHead className="text-right min-w-[90px]">Clients</TableHead>
              <TableHead className="text-right min-w-[110px]">Revenue</TableHead>
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
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{reseller.name}</span>
                      <span className="text-[10px] text-muted-foreground">{reseller.domain || 'no domain'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs">
                      <span className="text-muted-foreground">{reseller.email}</span>
                      <span className="text-[10px] text-slate-400">{reseller.phone}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize font-normal text-[10px]">
                      {plans.find(p => String(p.id) === String(reseller.plan_id))?.name || reseller.plan_id || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-bold text-emerald-600">
                    {Number(reseller.credits_available || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-500">
                    {Number(reseller.credits_spent || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{reseller.clients_managed?.toLocaleString() || 0}</TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    {"\u20B9"}{cleanNumber(reseller.revenue_generated).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-[10px] px-2 py-0', getStatusColor(reseller.status))}>
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
                        <DropdownMenuItem onClick={() => handleLoginAsReseller(reseller.id)} className="text-blue-600 font-medium">
                          <LogIn className="w-4 h-4 mr-2" />
                          Login as Reseller
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSuspend(reseller)} className="text-orange-600 focus:text-orange-600">
                          <Ban className="w-4 h-4 mr-2" />
                          {reseller.status === 'suspended' ? 'Activate Account' : 'Suspend Account'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteReseller(reseller)} className="text-red-600 focus:text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Account
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
            <DialogDescription>
              {modalMode === 'view' ? 'View details for this reseller partner.' : 'Fill in the information below to manage the reseller.'}
            </DialogDescription>
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

            <div className="h-px bg-border" />

            {/* Plan Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Assign Plan <span className="text-destructive">*</span></Label>
              <Select
                value={currentReseller.plan_id}
                onValueChange={handlePlanChange}
                disabled={modalMode === 'view'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({"\u20B9"}{p.price})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="h-px bg-border" />

            {/* Domain */}
            <div className="space-y-2">
              <Label>Reseller Domain (White-label URL)</Label>
              <Input
                placeholder="e.g. smartsms.com"
                value={currentReseller.domain || ''}
                onChange={(e) => setCurrentReseller(prev => ({ ...prev, domain: e.target.value }))}
                disabled={modalMode === 'view'}
              />
              <p className="text-[10px] text-muted-foreground italic">Custom domain where the reseller's clients will login.</p>
            </div>

            {/* White Labeling Settings */}
            <div className="h-px bg-border" />
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Pencil className="w-4 h-4" /> White Labeling Settings
            </h3>

            <div className="space-y-2">
              <Label>Brand Name</Label>
              <Input
                placeholder="Reseller Brand Name"
                value={currentReseller.brand_name || ''}
                onChange={(e) => setCurrentReseller(prev => ({ ...prev, brand_name: e.target.value }))}
                disabled={modalMode === 'view'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Logo URL</Label>
                <Input
                  placeholder="https://example.com/logo.png"
                  value={currentReseller.logo_url || ''}
                  onChange={(e) => setCurrentReseller(prev => ({ ...prev, logo_url: e.target.value }))}
                  disabled={modalMode === 'view'}
                />
              </div>
              <div className="space-y-2">
                <Label>Favicon URL</Label>
                <Input
                  placeholder="https://example.com/favicon.ico"
                  value={currentReseller.favicon_url || ''}
                  onChange={(e) => setCurrentReseller(prev => ({ ...prev, favicon_url: e.target.value }))}
                  disabled={modalMode === 'view'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="w-12 p-1 h-10"
                    value={currentReseller.primary_color || '#3b82f6'}
                    onChange={(e) => setCurrentReseller(prev => ({ ...prev, primary_color: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                  <Input
                    placeholder="#3b82f6"
                    value={currentReseller.primary_color || ''}
                    onChange={(e) => setCurrentReseller(prev => ({ ...prev, primary_color: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="w-12 p-1 h-10"
                    value={currentReseller.secondary_color || '#1d4ed8'}
                    onChange={(e) => setCurrentReseller(prev => ({ ...prev, secondary_color: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                  <Input
                    placeholder="#1d4ed8"
                    value={currentReseller.secondary_color || ''}
                    onChange={(e) => setCurrentReseller(prev => ({ ...prev, secondary_color: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Support Email</Label>
                <Input
                  placeholder="support@reseller.com"
                  value={currentReseller.support_email || ''}
                  onChange={(e) => setCurrentReseller(prev => ({ ...prev, support_email: e.target.value }))}
                  disabled={modalMode === 'view'}
                />
              </div>
              <div className="space-y-2">
                <Label>Support Phone</Label>
                <Input
                  placeholder="+91..."
                  value={currentReseller.support_phone || ''}
                  onChange={(e) => setCurrentReseller(prev => ({ ...prev, support_phone: e.target.value }))}
                  disabled={modalMode === 'view'}
                />
              </div>
            </div>

            {/* Commission & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Commission (%)</Label>
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

            {/* Credits Section */}
            <div className="h-px bg-border" />
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Credit Management
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{modalMode === 'add' ? 'Initial Credits' : 'Current Balance'}</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={currentReseller.credits_available}
                  onChange={e => setCurrentReseller(prev => ({ ...prev, credits_available: parseInt(e.target.value) || 0 }))}
                  disabled={modalMode === 'view'}
                />
                <p className="text-[10px] text-muted-foreground">Admin can recharge reseller by updating this value.</p>
              </div>
              <div className="space-y-2">
                <Label>Credits Spent (Lifetime)</Label>
                <Input
                  type="text"
                  value={Number(currentReseller.credits_spent || 0).toLocaleString()}
                  disabled
                  className="bg-muted"
                />
                <p className="text-[10px] text-muted-foreground">Read-only: Lifetime usage by clients.</p>
              </div>
            </div>

            {/* Custom Pricing Section */}
            <div className="h-px bg-border mt-6" />
            
            {/* RCS Custom Pricing */}
            <div className="space-y-4 pt-4">
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
                      value={currentReseller.rcs_text_price}
                      onChange={e => setCurrentReseller(prev => ({ ...prev, rcs_text_price: parseFloat(e.target.value) || 0 }))}
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
                    value={currentReseller.rcs_rich_card_price}
                    onChange={e => setCurrentReseller(prev => ({ ...prev, rcs_rich_card_price: parseFloat(e.target.value) || 0 }))}
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
                    value={currentReseller.rcs_carousel_price}
                    onChange={e => setCurrentReseller(prev => ({ ...prev, rcs_carousel_price: parseFloat(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-[10px] text-muted-foreground">Carousel/multi-card</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* WhatsApp Custom Pricing */}
            <div className="space-y-4 pb-4 pt-4">
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
                      value={currentReseller.wa_marketing_price}
                      onChange={e => setCurrentReseller(prev => ({ ...prev, wa_marketing_price: parseFloat(e.target.value) || 0 }))}
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
                    value={currentReseller.wa_utility_price}
                    onChange={e => setCurrentReseller(prev => ({ ...prev, wa_utility_price: parseFloat(e.target.value) || 0 }))}
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
                    value={currentReseller.wa_authentication_price}
                    onChange={e => setCurrentReseller(prev => ({ ...prev, wa_authentication_price: parseFloat(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-[10px] text-muted-foreground">OTP/Auth templates</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />
            
            {/* SMS Custom Pricing */}
            <div className="space-y-4 pb-4 pt-4">
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
                      value={currentReseller.sms_promotional_price}
                      onChange={e => setCurrentReseller(prev => ({ ...prev, sms_promotional_price: parseFloat(e.target.value) || 0 }))}
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
                    value={currentReseller.sms_transactional_price}
                    onChange={e => setCurrentReseller(prev => ({ ...prev, sms_transactional_price: parseFloat(e.target.value) || 0 }))}
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
                    value={currentReseller.sms_service_price}
                    onChange={e => setCurrentReseller(prev => ({ ...prev, sms_service_price: parseFloat(e.target.value) || 0 }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-[10px] text-muted-foreground">Alerts/Operational</p>
                </div>
              </div>
            </div>

            {/* Section: Feature Permissions */}
            <div className="space-y-4 pt-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4" /> Feature Permissions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/20 p-4 rounded-xl border border-dashed border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Allow Bulk API Access</Label>
                    <p className="text-xs text-muted-foreground">Enable developer API and secret keys</p>
                  </div>
                  <Checkbox 
                    checked={currentReseller.is_api_allowed}
                    onCheckedChange={(checked) => setCurrentReseller(p => ({ ...p, is_api_allowed: !!checked }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base text-primary font-bold">Enable Proero (Unofficial WA)</Label>
                    <p className="text-xs text-muted-foreground">Show "Channels" tab and enable QR scan flow</p>
                  </div>
                  <Checkbox 
                    checked={currentReseller.is_proero_enabled}
                    onCheckedChange={(checked) => setCurrentReseller(p => ({ ...p, is_proero_enabled: !!checked }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base text-indigo-600 font-bold">Enable SMM Hub (Social Media)</Label>
                    <p className="text-xs text-muted-foreground">Show "Social Media" tab for FB/Insta/LinkedIn</p>
                  </div>
                  <Checkbox 
                    checked={currentReseller.is_smm_enabled}
                    onCheckedChange={(checked) => setCurrentReseller(p => ({ ...p, is_smm_enabled: !!checked }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base text-teal-600 font-bold">Enable Dinstar GSM (SIM Gateway)</Label>
                    <p className="text-xs text-muted-foreground">Show "Custom GSM Message" option in SMS campaigns</p>
                  </div>
                  <Checkbox 
                    checked={currentReseller.is_dinstar_enabled}
                    onCheckedChange={(checked) => setCurrentReseller(p => ({ ...p, is_dinstar_enabled: !!checked }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-border" />

            {/* Section: Developer Webhook Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Globe className="w-4 h-4" /> Developer Webhook Forwarding
              </h3>
              <div className="space-y-4 bg-muted/20 p-4 rounded-xl border border-dashed border-border">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-semibold">Enable Unofficial WhatsApp Webhook</Label>
                    <p className="text-xs text-muted-foreground">Forward real-time DLR callbacks for unofficial WhatsApp campaigns</p>
                  </div>
                  <Checkbox 
                    checked={currentReseller.wa_unofficial_webhook_enabled}
                    onCheckedChange={(checked) => setCurrentReseller(p => ({ ...p, wa_unofficial_webhook_enabled: !!checked }))}
                    disabled={modalMode === 'view'}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Custom DLR Webhook URL</Label>
                  <Input
                    type="url"
                    placeholder="https://your-domain.com/webhook/dlr"
                    value={currentReseller.dlr_webhook_url || ''}
                    onChange={e => setCurrentReseller(p => ({ ...p, dlr_webhook_url: e.target.value }))}
                    disabled={modalMode === 'view'}
                  />
                  <p className="text-xs text-muted-foreground">This URL will receive a POST request with real-time delivery statuses.</p>
                </div>
              </div>
            </div>

            <div className="h-px bg-border mt-6" />

            {/* Password Section (Lowered priority) */}
            {(modalMode === 'add' || modalMode === 'edit') && (
              <>
                <div className="h-px bg-border" />
                <div className="space-y-2">
                  <Label>
                    Change Password {modalMode === 'add' && <span className="text-destructive">*</span>}
                    {modalMode === 'edit' && <span className="text-xs text-muted-foreground ml-2">(Only if you want to reset it)</span>}
                  </Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={modalMode === 'add' ? "Enter password" : "Enter new password"}
                      value={currentReseller.password || ''}
                      onChange={(e) => setCurrentReseller(prev => ({ ...prev, password: e.target.value }))}
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
              </>
            )}

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
                    <div className="text-xl sm:text-2xl font-bold">{"\u20B9"}{(currentReseller.revenue_generated || 0).toLocaleString()}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Revenue</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-warning">{"\u20B9"}{(currentReseller.payout_pending || 0).toLocaleString()}</div>
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