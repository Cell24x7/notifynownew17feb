import { useState, useEffect, useRef } from 'react';
import { Search, Plus, FileText, CheckCircle, XCircle, Loader2, RefreshCw, Upload, Pencil, Trash2, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import * as XLSX from 'xlsx';
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

  // Add / Edit Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [templateForm, setTemplateForm] = useState({
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
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Upload Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTargetUserId, setBulkTargetUserId] = useState('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleOpenAddModal = () => {
    setEditingTemplateId(null);
    setTemplateForm({
      target_user_id: selectedClient !== 'all' ? selectedClient : (clients.length > 0 ? String(clients[0].id) : ''),
      sender: '',
      temp_name: '',
      temp_id: '',
      temp_type: 'Transactional',
      template_text: '',
      pe_id: '',
      hash_id: '',
      status: 'Y'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (t: any) => {
    setEditingTemplateId(t.id);
    setTemplateForm({
      target_user_id: String(t.user_id),
      sender: t.sender || '',
      temp_name: t.temp_name || '',
      temp_id: t.temp_id || '',
      temp_type: t.temp_type || 'Transactional',
      template_text: t.template_text || '',
      pe_id: t.pe_id || '',
      hash_id: t.hash_id || '',
      status: t.status || 'Y'
    });
    setIsAddModalOpen(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.target_user_id || !templateForm.sender || !templateForm.temp_id || !templateForm.template_text) {
      toast({ title: 'Missing Information', description: 'Customer Account, Sender ID, DLT Template ID, and Message Text are required.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      if (editingTemplateId) {
        // Update
        const res = await axios.put(`${API_URL}/dlt-templates/${editingTemplateId}`, {
          sender: templateForm.sender,
          temp_id: templateForm.temp_id,
          temp_name: templateForm.temp_name,
          temp_type: templateForm.temp_type,
          template_text: templateForm.template_text,
          pe_id: templateForm.pe_id || null,
          hash_id: templateForm.hash_id || null,
          status: templateForm.status
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          toast({ title: 'Success', description: 'DLT Template updated successfully.' });
          setIsAddModalOpen(false);
          fetchTemplates();
        }
      } else {
        // Create
        const res = await axios.post(`${API_URL}/dlt-templates`, {
          ...templateForm,
          userId: templateForm.target_user_id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          toast({ title: 'Success', description: 'DLT Template created for client account.' });
          setIsAddModalOpen(false);
          fetchTemplates();
        }
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to save template', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId: number) => {
    if (!window.confirm('Are you sure you want to delete this DLT template?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.delete(`${API_URL}/dlt-templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast({ title: 'Deleted', description: 'DLT template deleted successfully.' });
        fetchTemplates();
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to delete template', variant: 'destructive' });
    }
  };

  // Bulk upload handler
  const handleOpenBulkModal = () => {
    setBulkTargetUserId(selectedClient !== 'all' ? selectedClient : (clients.length > 0 ? String(clients[0].id) : ''));
    setBulkFile(null);
    setIsBulkModalOpen(true);
  };

  const handleProcessBulkUpload = async () => {
    if (!bulkTargetUserId) {
      toast({ title: 'Select Account', description: 'Please select a target customer account.', variant: 'destructive' });
      return;
    }
    if (!bulkFile) {
      toast({ title: 'Select File', description: 'Please select an Excel or CSV file to upload.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const dataBuffer = await bulkFile.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

      if (!rawRows || rawRows.length === 0) {
        toast({ title: 'Empty File', description: 'No valid data rows found in uploaded file.', variant: 'destructive' });
        setIsUploading(false);
        return;
      }

      // Map rows to standard schema
      const templatesList = rawRows.map(row => ({
        sender: String(row.sender || row.Sender || row.SenderID || row.Header || row.HEADER || '').trim(),
        temp_id: String(row.temp_id || row.TemplateID || row.DLT_ID || row.ID || row.Template_ID || '').trim(),
        temp_name: String(row.temp_name || row.TemplateName || row.Name || row.TEMPLATE_NAME || '').trim(),
        temp_type: String(row.temp_type || row.TemplateType || row.Type || 'Transactional').trim(),
        template_text: String(row.template_text || row.Message || row.TemplateText || row.Content || row.TEXT || '').trim(),
        pe_id: String(row.pe_id || row.PEID || row.EntityID || '').trim(),
        hash_id: String(row.hash_id || row.HashID || '').trim(),
        status: String(row.status || row.Status || 'Y').trim().toUpperCase() === 'Y' ? 'Y' : 'Y'
      })).filter(t => t.sender && t.temp_id && t.template_text);

      if (templatesList.length === 0) {
        toast({
          title: 'Invalid Format',
          description: 'Could not find required columns (Sender/Header, TemplateID/DLT_ID, TemplateText/Message). Please check file header names.',
          variant: 'destructive'
        });
        setIsUploading(false);
        return;
      }

      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_URL}/dlt-templates/bulk-upload`, {
        userId: bulkTargetUserId,
        templates: templatesList
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        toast({
          title: 'Upload Completed',
          description: res.data.message || `Successfully processed ${templatesList.length} DLT templates.`
        });
        setIsBulkModalOpen(false);
        fetchTemplates();
      } else {
        toast({ title: 'Upload Failed', description: res.data.message || 'Failed to upload templates', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error('Bulk upload parse error:', err);
      toast({ title: 'Parse Error', description: 'Failed to read Excel/CSV file. Please check file format.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleData = [
      {
        Sender: 'NTFYIN',
        TemplateID: '1707161234567890123',
        TemplateName: 'OTP Verification',
        TemplateType: 'Transactional',
        TemplateText: 'Dear {#var#}, your OTP is {#var#}. Valid for 5 mins.',
        PEID: '1701158000000000000',
        HashID: ''
      },
      {
        Sender: 'NOTIFY',
        TemplateID: '1707161234567890124',
        TemplateName: 'Order Alert',
        TemplateType: 'Service Implicit',
        TemplateText: 'Your order {#var#} has been shipped via {#var#}.',
        PEID: '1701158000000000000',
        HashID: ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DLT Templates');
    XLSX.writeFile(workbook, 'DLT_Templates_Sample.xlsx');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Account-Wise DLT Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Audit, edit, upload, and activate DLT content templates across customer accounts</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button variant="outline" size="sm" onClick={fetchTemplates} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleOpenBulkModal} className="shadow-sm">
            <Upload className="w-4 h-4 mr-2" /> Bulk Upload (Excel/CSV)
          </Button>
          <Button onClick={handleOpenAddModal} className="shadow-sm">
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
                <TableHead className="text-center">Status</TableHead>
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
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEditModal(t)} title="Edit Template">
                          <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" onClick={() => handleDeleteTemplate(t.id)} title="Delete Template">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Modal: Add/Edit Template for Client */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingTemplateId ? 'Edit DLT Template' : 'Add DLT Template for Customer Account'}</DialogTitle>
            <DialogDescription>
              {editingTemplateId 
                ? 'Update DLT header, template ID, and message text details.' 
                : 'Assign a new approved DLT template directly to one of your client accounts.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!editingTemplateId && (
              <div className="space-y-1.5">
                <Label>Select Target Customer Account <span className="text-red-500">*</span></Label>
                <Select value={templateForm.target_user_id} onValueChange={(val) => setTemplateForm(prev => ({ ...prev, target_user_id: val }))}>
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
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Header / Sender ID <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="e.g. NTFYIN"
                  value={templateForm.sender}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, sender: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>DLT Template ID <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="1707161234567890123"
                  value={templateForm.temp_id}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, temp_id: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Template Name</Label>
                <Input
                  placeholder="e.g. OTP Verification"
                  value={templateForm.temp_name}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, temp_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Template Type</Label>
                <Select value={templateForm.temp_type} onValueChange={(val) => setTemplateForm(prev => ({ ...prev, temp_type: val }))}>
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>PE ID (Optional)</Label>
                <Input
                  placeholder="Principal Entity ID"
                  value={templateForm.pe_id}
                  onChange={(e) => setTemplateForm(prev => ({ ...prev, pe_id: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={templateForm.status} onValueChange={(val) => setTemplateForm(prev => ({ ...prev, status: val }))}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Y">Active</SelectItem>
                    <SelectItem value="N">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Template Message Text <span className="text-red-500">*</span></Label>
              <Textarea
                placeholder="Dear {#var#}, your OTP is {#var#}. Valid for 5 mins."
                rows={4}
                value={templateForm.template_text}
                onChange={(e) => setTemplateForm(prev => ({ ...prev, template_text: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveTemplate} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTemplateId ? 'Update Template' : 'Save DLT Template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Bulk Upload DLT Templates */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Upload DLT Templates</DialogTitle>
            <DialogDescription>
              Upload an Excel (.xlsx, .xls) or CSV file containing approved DLT templates for a client account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Target Customer Account <span className="text-red-500">*</span></Label>
              <Select value={bulkTargetUserId} onValueChange={setBulkTargetUserId}>
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

            <div className="space-y-1.5">
              <Label>Select Excel / CSV File <span className="text-red-500">*</span></Label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-6 text-center cursor-pointer transition-colors bg-muted/10 hover:bg-muted/20"
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {bulkFile ? bulkFile.name : 'Click to browse Excel / CSV file'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Supports .xlsx, .xls, .csv</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setBulkFile(e.target.files[0]);
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" size="sm" onClick={handleDownloadSample} className="text-xs text-primary">
                <Download className="w-3.5 h-3.5 mr-1" /> Download Sample Format
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkModalOpen(false)} disabled={isUploading}>Cancel</Button>
            <Button onClick={handleProcessBulkUpload} disabled={isUploading || !bulkFile}>
              {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Upload & Import Templates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
