// src/pages/super-admin/Numbers.tsx (Final updated version)
// - Fixed SelectItem value="" error by using 'global' or 'shared' as non-empty values
// - Made filters safe with optional chaining
// - Added responsive improvements: Use responsive grid for reports summary, scrollable tables on small screens
// - Ensured dialogs don't crash on add/edit
// - No white screen on edit/add; tested logic for user selection

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Phone, Ban, Shield, Users, Search, Upload, Download, MoreVertical, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';

// API Base URL
const API_BASE = 'http://localhost:5000/api/numbers';

// Schemas for form validation
const vmnSchema = z.object({
  number: z.string().regex(/^\+91\d{10}$/, 'Invalid Indian phone number format (+91XXXXXXXXXX)'),
  type: z.enum(['dedicated', 'shared']),
  userId: z.string().optional(),
  status: z.enum(['active', 'inactive']),
});

const msisdnSchema = z.object({
  msisdn: z.string().regex(/^\+91\d{10}$/, 'Invalid Indian phone number format (+91XXXXXXXXXX)'),
  type: z.enum(['premium', 'blocked']),
  userId: z.string().optional(),
  reason: z.string().min(1, 'Reason is required'),
});

const senderSchema = z.object({
  senderId: z.string().min(1, 'Sender ID is required').max(6, 'Max 6 characters'),
  type: z.enum(['promotional', 'transactional']),
  userId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']),
});

// Types (inferred from backend, but defined here for TS)
type VMN = { id: string; number: string; type: 'dedicated' | 'shared'; userId: string | null; userName: string; status: 'active' | 'inactive'; createdAt: string };
type MSISDN = { id: string; msisdn: string; type: 'premium' | 'blocked'; userId: string | null; userName: string; reason: string; createdAt: string };
type Sender = { id: string; senderId: string; type: 'promotional' | 'transactional'; userId: string | null; userName: string; status: 'pending' | 'approved' | 'rejected'; createdAt: string };
type User = { id: string; name: string; email: string };
type VMNReport = { id: string; vmn: string; received: number; date: string; user: string };

export default function Numbers() {
  const [activeTab, setActiveTab] = useState('vmn');
  const [vmns, setVMNs] = useState<VMN[]>([]);
  const [msisdns, setMSISDNs] = useState<MSISDN[]>([]);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [vmnReports, setVMNReports] = useState<VMNReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [vmnDialogOpen, setVmnDialogOpen] = useState(false);
  const [msisdnDialogOpen, setMsisdnDialogOpen] = useState(false);
  const [senderDialogOpen, setSenderDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const [selectedVMN, setSelectedVMN] = useState<VMN | null>(null);
  const [selectedMSISDN, setSelectedMSISDN] = useState<MSISDN | null>(null);
  const [selectedSender, setSelectedSender] = useState<Sender | null>(null);
  const [reportType, setReportType] = useState<'summary' | 'detail'>('summary');

  const [bulkData, setBulkData] = useState('');

  const { toast } = useToast();

  // Forms with validation
  const vmnForm = useForm<z.infer<typeof vmnSchema>>({ resolver: zodResolver(vmnSchema), defaultValues: { number: '', type: 'dedicated', userId: '', status: 'active' } });
  const msisdnForm = useForm<z.infer<typeof msisdnSchema>>({ resolver: zodResolver(msisdnSchema), defaultValues: { msisdn: '', type: 'premium', userId: '', reason: '' } });
  const senderForm = useForm<z.infer<typeof senderSchema>>({ resolver: zodResolver(senderSchema), defaultValues: { senderId: '', type: 'promotional', userId: '', status: 'pending' } });

  // Fetch all data on mount
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vmnsRes, msisdnsRes, sendersRes, usersRes, reportsRes] = await Promise.all([
        axios.get(`${API_BASE}/vmns`),
        axios.get(`${API_BASE}/msisdns`),
        axios.get(`${API_BASE}/senders`),
        axios.get(`${API_BASE}/users`),
        axios.get(`${API_BASE}/vmn-reports`),
      ]);
      setVMNs(vmnsRes.data);
      setMSISDNs(msisdnsRes.data);
      setSenders(sendersRes.data);
      setUsers(usersRes.data);
      setVMNReports(reportsRes.data);
    } catch (err) {
      setError('Failed to fetch data');
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // VMN handlers
  const handleOpenVMNDialog = (vmn?: VMN) => {
    if (vmn) {
      setSelectedVMN(vmn);
      vmnForm.reset({ number: vmn.number, type: vmn.type, userId: vmn.userId || 'global', status: vmn.status });
    } else {
      setSelectedVMN(null);
      vmnForm.reset({ number: '', type: 'dedicated', userId: 'global', status: 'active' });
    }
    setVmnDialogOpen(true);
  };

  const handleSaveVMN = async (data: z.infer<typeof vmnSchema>) => {
    const submitData = {
      ...data,
      userId: data.userId === 'global' ? '' : data.userId,
    };
    try {
      if (selectedVMN) {
        await axios.put(`${API_BASE}/vmns/${selectedVMN.id}`, submitData);
        toast({ title: 'VMN updated' });
      } else {
        await axios.post(`${API_BASE}/vmns`, submitData);
        toast({ title: 'VMN added' });
      }
      fetchAllData();
      setVmnDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleDeleteVMN = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/vmns/${id}`);
      toast({ title: 'VMN deleted' });
      fetchAllData();
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // MSISDN handlers
  const handleOpenMSISDNDialog = (msisdn?: MSISDN) => {
    if (msisdn) {
      setSelectedMSISDN(msisdn);
      msisdnForm.reset({ msisdn: msisdn.msisdn, type: msisdn.type, userId: msisdn.userId || 'global', reason: msisdn.reason });
    } else {
      setSelectedMSISDN(null);
      msisdnForm.reset({ msisdn: '', type: 'premium', userId: 'global', reason: '' });
    }
    setMsisdnDialogOpen(true);
  };

  const handleSaveMSISDN = async (data: z.infer<typeof msisdnSchema>) => {
    const submitData = {
      ...data,
      userId: data.userId === 'global' ? '' : data.userId,
    };
    try {
      if (selectedMSISDN) {
        await axios.put(`${API_BASE}/msisdns/${selectedMSISDN.id}`, submitData);
        toast({ title: 'MSISDN updated' });
      } else {
        await axios.post(`${API_BASE}/msisdns`, submitData);
        toast({ title: 'MSISDN added' });
      }
      fetchAllData();
      setMsisdnDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleDeleteMSISDN = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/msisdns/${id}`);
      toast({ title: 'MSISDN deleted' });
      fetchAllData();
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Sender handlers
  const handleOpenSenderDialog = (sender?: Sender) => {
    if (sender) {
      setSelectedSender(sender);
      senderForm.reset({ senderId: sender.senderId, type: sender.type, userId: sender.userId || 'shared', status: sender.status });
    } else {
      setSelectedSender(null);
      senderForm.reset({ senderId: '', type: 'promotional', userId: 'shared', status: 'pending' });
    }
    setSenderDialogOpen(true);
  };

  const handleSaveSender = async (data: z.infer<typeof senderSchema>) => {
    const submitData = {
      ...data,
      userId: data.userId === 'shared' ? '' : data.userId,
    };
    try {
      if (selectedSender) {
        await axios.put(`${API_BASE}/senders/${selectedSender.id}`, submitData);
        toast({ title: 'Sender updated' });
      } else {
        await axios.post(`${API_BASE}/senders`, submitData);
        toast({ title: 'Sender added' });
      }
      fetchAllData();
      setSenderDialogOpen(false);
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleDeleteSender = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/senders/${id}`);
      toast({ title: 'Sender deleted' });
      fetchAllData();
    } catch (err) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Bulk upload handler
  const handleBulkUpload = async () => {
    const lines = bulkData.split('\n').filter(l => l.trim());
    if (lines.length === 0) return toast({ title: 'No data' });
    try {
      await axios.post(`${API_BASE}/msisdns/bulk`, { msisdns: lines });
      toast({ title: 'Bulk upload successful' });
      fetchAllData();
      setBulkUploadOpen(false);
      setBulkData('');
    } catch (err) {
      toast({ title: 'Bulk upload failed', variant: 'destructive' });
    }
  };

  // Download report (client-side CSV example; could be server-side)
  const handleDownloadReport = () => {
    const csv = ['VMN,Received,Date,User\n', ...vmnReports.map(r => `${r.vmn},${r.received},${r.date},${r.user}\n`)].join('');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vmn-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-500/10 text-green-600',
      inactive: 'bg-gray-500/10 text-gray-600',
      approved: 'bg-green-500/10 text-green-600',
      pending: 'bg-yellow-500/10 text-yellow-600',
      rejected: 'bg-red-500/10 text-red-600',
    };
    return <Badge className={colors[status] || 'bg-gray-500/10 text-gray-600'}>{status}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      premium: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      blocked: 'bg-red-500/10 text-red-600 border-red-500/20',
      dedicated: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      shared: 'bg-green-500/10 text-green-600 border-green-500/20',
      promotional: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      transactional: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    };
    return <Badge variant="outline" className={colors[type] || ''}>{type}</Badge>;
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (error) return <div className="p-4 text-center text-red-600">Error: {error}</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Number Management</h1>
          <p className="text-muted-foreground text-sm md:text-base">Manage VMNs, MSISDNs, and Sender IDs</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
    <TabsList className="inline-flex flex-wrap justify-start gap-2 md:gap-3 bg-transparent border-b pb-3 min-w-full">
      <TabsTrigger 
        value="vmn" 
        className="gap-1.5 px-3 py-2 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md transition-all"
      >
        <Phone className="w-4 h-4" /> VMN Numbers
      </TabsTrigger>
      
      <TabsTrigger 
        value="msisdn" 
        className="gap-1.5 px-3 py-2 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md transition-all"
      >
        <Shield className="w-4 h-4" /> Premium/Blocked
      </TabsTrigger>
      
      <TabsTrigger 
        value="sender" 
        className="gap-1.5 px-3 py-2 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md transition-all"
      >
        <Users className="w-4 h-4" /> Sender IDs
      </TabsTrigger>
      
      <TabsTrigger 
        value="vmn-report" 
        className="gap-1.5 px-3 py-2 text-xs sm:text-sm md:text-base whitespace-nowrap data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-t-md transition-all"
      >
        <FileText className="w-4 h-4" /> VMN Reports
      </TabsTrigger>
    </TabsList>

        <TabsContent value="vmn" className="mt-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search VMNs..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button onClick={() => handleOpenVMNDialog()}><Plus className="w-4 h-4 mr-2" />Add VMN</Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>VMN Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vmns
                    .filter(v => v.number?.includes(searchQuery) ?? false)
                    .map(vmn => (
                      <TableRow key={vmn.id}>
                        <TableCell className="font-mono">{vmn.number}</TableCell>
                        <TableCell>{getTypeBadge(vmn.type)}</TableCell>
                        <TableCell>{vmn.userName}</TableCell>
                        <TableCell>{getStatusBadge(vmn.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{vmn.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenVMNDialog(vmn)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteVMN(vmn.id)}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
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

        <TabsContent value="msisdn" className="mt-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search MSISDNs..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" onClick={() => setBulkUploadOpen(true)} className="w-full md:w-auto"><Upload className="w-4 h-4 mr-2" />Bulk Upload</Button>
              <Button onClick={() => handleOpenMSISDNDialog()} className="w-full md:w-auto"><Plus className="w-4 h-4 mr-2" />Add MSISDN</Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>MSISDN</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {msisdns
                    .filter(m => m.msisdn?.includes(searchQuery) ?? false)
                    .map(msisdn => (
                      <TableRow key={msisdn.id}>
                        <TableCell className="font-mono">{msisdn.msisdn}</TableCell>
                        <TableCell>{getTypeBadge(msisdn.type)}</TableCell>
                        <TableCell>{msisdn.userName}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{msisdn.reason}</TableCell>
                        <TableCell className="text-muted-foreground">{msisdn.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenMSISDNDialog(msisdn)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMSISDN(msisdn.id)}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
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

        <TabsContent value="sender" className="mt-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search Senders..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button onClick={() => handleOpenSenderDialog()} className="w-full md:w-auto"><Plus className="w-4 h-4 mr-2" />Add Sender</Button>
          </div>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {senders
                    .filter(s => s.senderId?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false)
                    .map(sender => (
                      <TableRow key={sender.id}>
                        <TableCell className="font-mono font-medium">{sender.senderId}</TableCell>
                        <TableCell>{getTypeBadge(sender.type)}</TableCell>
                        <TableCell>{sender.userName}</TableCell>
                        <TableCell>{getStatusBadge(sender.status)}</TableCell>
                        <TableCell className="text-muted-foreground">{sender.createdAt}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenSenderDialog(sender)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteSender(sender.id)}><Trash2 className="w-4 h-4 mr-2" />Delete</DropdownMenuItem>
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

        <TabsContent value="vmn-report" className="mt-4 space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex gap-2 w-full md:w-auto">
              <Button variant={reportType === 'summary' ? 'default' : 'outline'} onClick={() => setReportType('summary')} className="w-full md:w-auto">Summary Report</Button>
              <Button variant={reportType === 'detail' ? 'default' : 'outline'} onClick={() => setReportType('detail')} className="w-full md:w-auto">Detailed Report</Button>
            </div>
            <Button variant="outline" onClick={handleDownloadReport} className="w-full md:w-auto"><Download className="w-4 h-4 mr-2" />Download Report</Button>
          </div>

          {reportType === 'summary' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from(new Set(vmnReports.map(r => r.vmn))).map(vmn => {
                const reports = vmnReports.filter(r => r.vmn === vmn);
                const total = reports.reduce((acc, r) => acc + r.received, 0);
                return (
                  <Card key={vmn}>
                    <CardContent className="pt-6">
                      <p className="font-mono text-sm text-muted-foreground truncate">{vmn}</p>
                      <p className="text-2xl font-bold mt-2">{total}</p>
                      <p className="text-sm text-muted-foreground">Total Messages Received</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>VMN</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Messages Received</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vmnReports.map(report => (
                      <TableRow key={report.id}>
                        <TableCell className="font-mono">{report.vmn}</TableCell>
                        <TableCell>{report.date}</TableCell>
                        <TableCell>{report.user}</TableCell>
                        <TableCell className="text-right font-medium">{report.received}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* VMN Dialog */}
      <Dialog open={vmnDialogOpen} onOpenChange={setVmnDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedVMN ? 'Edit VMN' : 'Add VMN'}</DialogTitle>
            <DialogDescription>Configure virtual mobile number</DialogDescription>
          </DialogHeader>
          <form onSubmit={vmnForm.handleSubmit(handleSaveVMN)} className="space-y-4">
            <div className="space-y-2">
              <Label>VMN Number</Label>
              <Controller name="number" control={vmnForm.control} render={({ field }) => <Input {...field} placeholder="+919876500001" />} />
              {vmnForm.formState.errors.number && <p className="text-red-500 text-sm">{vmnForm.formState.errors.number.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller name="type" control={vmnForm.control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dedicated">Dedicated</SelectItem>
                    <SelectItem value="shared">Shared Pool</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            {vmnForm.watch('type') === 'dedicated' && (
              <div className="space-y-2">
                <Label>Assign to User (optional)</Label>
                <Controller name="userId" control={vmnForm.control} render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global / Shared Pool</SelectItem>
                      {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller name="status" control={vmnForm.control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setVmnDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" className="w-full sm:w-auto">{selectedVMN ? 'Update' : 'Add'} VMN</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MSISDN Dialog */}
      <Dialog open={msisdnDialogOpen} onOpenChange={setMsisdnDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedMSISDN ? 'Edit MSISDN' : 'Add MSISDN'}</DialogTitle>
            <DialogDescription>Add premium or blocked MSISDN</DialogDescription>
          </DialogHeader>
          <form onSubmit={msisdnForm.handleSubmit(handleSaveMSISDN)} className="space-y-4">
            <div className="space-y-2">
              <Label>MSISDN</Label>
              <Controller name="msisdn" control={msisdnForm.control} render={({ field }) => <Input {...field} placeholder="+919876543210" />} />
              {msisdnForm.formState.errors.msisdn && <p className="text-red-500 text-sm">{msisdnForm.formState.errors.msisdn.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller name="type" control={msisdnForm.control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>User (optional)</Label>
              <Controller name="userId" control={msisdnForm.control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Global (all users)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (all users)</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Controller name="reason" control={msisdnForm.control} render={({ field }) => <Input {...field} placeholder="Enter reason" />} />
              {msisdnForm.formState.errors.reason && <p className="text-red-500 text-sm">{msisdnForm.formState.errors.reason.message}</p>}
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMsisdnDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" className="w-full sm:w-auto">{selectedMSISDN ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Sender Dialog */}
      <Dialog open={senderDialogOpen} onOpenChange={setSenderDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedSender ? 'Edit Sender' : 'Add Sender'}</DialogTitle>
            <DialogDescription>Configure sender ID</DialogDescription>
          </DialogHeader>
          <form onSubmit={senderForm.handleSubmit(handleSaveSender)} className="space-y-4">
            <div className="space-y-2">
              <Label>Sender ID</Label>
              <Controller name="senderId" control={senderForm.control} render={({ field }) => <Input {...field} placeholder="BRANDID" maxLength={6} />} />
              {senderForm.formState.errors.senderId && <p className="text-red-500 text-sm">{senderForm.formState.errors.senderId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller name="type" control={senderForm.control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>User (optional)</Label>
              <Controller name="userId" control={senderForm.control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Shared" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared">Shared</SelectItem>
                    {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller name="status" control={senderForm.control} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )} />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSenderDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button type="submit" className="w-full sm:w-auto">{selectedSender ? 'Update' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bulk Upload MSISDNs</DialogTitle>
            <DialogDescription>Enter one MSISDN per line</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="+919876543210&#10;+919876543211&#10;+919876543212"
              value={bulkData}
              onChange={e => setBulkData(e.target.value)}
              rows={10}
            />
            <p className="text-sm text-muted-foreground">
              {bulkData.split('\n').filter(l => l.trim()).length} entries detected
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setBulkUploadOpen(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleBulkUpload} className="w-full sm:w-auto">Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}