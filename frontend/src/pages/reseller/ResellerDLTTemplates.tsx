import { useState, useEffect } from 'react';
import { Search, Plus, Filter, FileText, CheckCircle, XCircle, Loader2, User, Building, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api`;

export default function ResellerDLTTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState('all');
  const [senderFilter, setSenderFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Template form state
  const [newTemplate, setNewTemplate] = useState({
    target_user_id: '',
    sender: '',
    temp_name: '',
    temp_id: '',
    temp_type: 'Transactional',
    template_text: '',
    pe_id: '',
    hash_id: '',
    status: 'Y'
  });

  const fetchResellerClients = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/resellers/clients/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setClients(res.data.clients || []);
      }
    } catch (err) {
      console.error('Failed to load reseller clients', err);
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_URL}/dlt-templates/reseller/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          targetUserId: selectedClient,
          search: searchQuery,
          sender: senderFilter
        }
      });
      if (res.data.success) {
        setTemplates(res.data.templates || []);
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to load DLT templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResellerClients();
    fetchTemplates();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTemplates();
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedClient, searchQuery, senderFilter]);

  const handleToggleStatus = async (templateId: number, currentStatus: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const nextStatus = currentStatus === 'Y' ? 'N' : 'Y';
      const res = await axios.put(`${API_URL}/dlt-templates/${templateId}/toggle-status`, { status: nextStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast({ title: 'Success', description: `Template status changed to ${nextStatus === 'Y' ? 'Active' : 'Inactive'}` });
        fetchTemplates();
      }
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to toggle status', variant: 'destructive' });
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplate.target_user_id || !newTemplate.sender || !newTemplate.temp_id || !newTemplate.template_text) {
      toast({ title: 'Missing Information', description: 'Client User, Sender ID, DLT Template ID, and Message Text are required.', variant: 'destructive' });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_URL}/dlt-templates`, {
        ...newTemplate,
        userId: newTemplate.target_user_id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast({ title: 'Success', description: 'DLT Template created for client' });
        setIsAddModalOpen(false);
        setNewTemplate({
          target_user_id: '',
          sender: '',
          temp_name: '',
          temp_id: '',
          temp_type: 'Transactional',
          template_text: '',
          pe_id: '',
          hash_id: '',
          status: 'Y'
        });
        fetchTemplates();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to create template', variant: 'destructive' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Account-Wise DLT Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Audit, edit, and activate DLT content templates across your customer accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Add Template for Client
          </Button>
        </div>
      </div>

      {/* Filters Card */}
      <Card className="border-none shadow-sm bg-muted/20">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by Template Name, DLT ID, Header or Text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-background/50"
              />
            </div>
            <div className="md:col-span-4">
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="h-10 bg-background/50">
                  <SelectValue placeholder="Filter by Client Account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customer Accounts</SelectItem>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-3">
              <Input
                placeholder="Filter Header/Sender (e.g. NTFYIN)..."
                value={senderFilter}
                onChange={(e) => setSenderFilter(e.target.value)}
                className="h-10 bg-background/50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card className="border shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>Customer Account</TableHead>
                <TableHead>Header / Sender ID</TableHead>
                <TableHead>DLT Template ID & Name</TableHead>
                <TableHead className="min-w-[300px]">Template Text / Content</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Status Toggle</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                    <span className="text-xs text-muted-foreground mt-2 block">Loading customer templates...</span>
                  </TableCell>
                </TableRow>
              ) : templates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                    No DLT templates found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                templates.map(t => (
                  <TableRow key={t.id} className="hover:bg-muted/10">
                    <TableCell>
                      <div className="font-medium text-xs text-foreground">{t.user_name || 'Client'}</div>
                      <div className="text-[10px] text-muted-foreground">{t.user_email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs font-semibold bg-primary/5 text-primary border-primary/20">
                        {t.sender}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-xs text-foreground">{t.temp_name || 'DLT Template'}</div>
                      <div className="font-mono text-[10px] text-muted-foreground select-all">{t.temp_id}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono max-w-[400px] whitespace-normal break-words text-muted-foreground">
                      {t.template_text}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] capitalize">
                        {t.temp_type || 'Transactional'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant={t.status === 'Y' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleToggleStatus(t.id, t.status)}
                        className={`h-7 text-[11px] px-3 font-semibold ${
                          t.status === 'Y' 
                            ? 'bg-green-600 hover:bg-green-700 text-white' 
                            : 'text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50'
                        }`}
                      >
                        {t.status === 'Y' ? (
                          <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Active</>
                        ) : (
                          <><XCircle className="w-3.5 h-3.5 mr-1" /> Inactive</>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[10px] text-muted-foreground block font-mono">PE: {t.pe_id || 'Inherited'}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal: Add Template for Client */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add DLT Template for Customer Account</DialogTitle>
            <DialogDescription>Assign a new DLT template directly to one of your reseller client accounts.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Target Customer Account <span className="text-red-500">*</span></Label>
              <Select value={newTemplate.target_user_id} onValueChange={(val) => setNewTemplate(prev => ({ ...prev, target_user_id: val }))}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Choose customer..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} ({c.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Header / Sender ID <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. NTFYIN"
                  value={newTemplate.sender}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, sender: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>DLT Template ID <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="1707161234567890123"
                  value={newTemplate.temp_id}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, temp_id: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g. OTP Verification"
                  value={newTemplate.temp_name}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, temp_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Template Type</Label>
                <Select value={newTemplate.temp_type} onValueChange={(val) => setNewTemplate(prev => ({ ...prev, temp_type: val }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transactional">Transactional</SelectItem>
                    <SelectItem value="Service Implicit">Service Implicit</SelectItem>
                    <SelectItem value="Service Explicit">Service Explicit</SelectItem>
                    <SelectItem value="Promotional">Promotional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Template Message Text <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Dear {#var#}, your OTP is {#var#}. Valid for 5 mins."
                rows={4}
                value={newTemplate.template_text}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, template_text: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTemplate}>Save DLT Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
