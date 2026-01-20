import { useState } from 'react';
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

// Mock VMN data
const mockVMNs = [
  { id: '1', number: '+919876500001', type: 'dedicated', userId: '1', userName: 'John Doe', status: 'active', createdAt: '2024-01-10' },
  { id: '2', number: '+919876500002', type: 'shared', userId: '', userName: 'Pool', status: 'active', createdAt: '2024-01-11' },
  { id: '3', number: '+919876500003', type: 'dedicated', userId: '2', userName: 'Jane Smith', status: 'active', createdAt: '2024-01-12' },
  { id: '4', number: '+919876500004', type: 'dedicated', userId: '3', userName: 'Bob Wilson', status: 'inactive', createdAt: '2024-01-13' },
];

// Mock premium/blocked MSISDN data
const mockMSISDNs = [
  { id: '1', msisdn: '+919876543210', type: 'premium', userId: '1', userName: 'John Doe', reason: 'VIP Customer', createdAt: '2024-01-10' },
  { id: '2', msisdn: '+919876543211', type: 'blocked', userId: '1', userName: 'John Doe', reason: 'Spam complaint', createdAt: '2024-01-11' },
  { id: '3', msisdn: '+919876543212', type: 'premium', userId: '2', userName: 'Jane Smith', reason: 'Enterprise client', createdAt: '2024-01-12' },
  { id: '4', msisdn: '+919876543213', type: 'blocked', userId: '', userName: 'Global', reason: 'DND registered', createdAt: '2024-01-13' },
];

// Mock sender data
const mockSenders = [
  { id: '1', senderId: 'BRAND1', type: 'promotional', userId: '1', userName: 'John Doe', status: 'approved', createdAt: '2024-01-10' },
  { id: '2', senderId: 'TXNOTP', type: 'transactional', userId: '1', userName: 'John Doe', status: 'approved', createdAt: '2024-01-11' },
  { id: '3', senderId: 'PROMO2', type: 'promotional', userId: '2', userName: 'Jane Smith', status: 'pending', createdAt: '2024-01-12' },
  { id: '4', senderId: 'ALERTS', type: 'transactional', userId: '', userName: 'Shared', status: 'approved', createdAt: '2024-01-13' },
];

// Mock users
const mockUsers = [
  { id: '1', name: 'John Doe', email: 'john@company.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@company.com' },
  { id: '3', name: 'Bob Wilson', email: 'bob@company.com' },
];

// Mock VMN reports
const mockVMNReports = [
  { id: '1', vmn: '+919876500001', received: 150, date: '2024-01-15', user: 'John Doe' },
  { id: '2', vmn: '+919876500002', received: 85, date: '2024-01-15', user: 'Pool' },
  { id: '3', vmn: '+919876500003', received: 200, date: '2024-01-15', user: 'Jane Smith' },
  { id: '4', vmn: '+919876500001', received: 120, date: '2024-01-14', user: 'John Doe' },
];

type VMN = typeof mockVMNs[0];
type MSISDN = typeof mockMSISDNs[0];
type Sender = typeof mockSenders[0];

export default function Numbers() {
  const [activeTab, setActiveTab] = useState('vmn');
  const [vmns, setVMNs] = useState(mockVMNs);
  const [msisdns, setMSISDNs] = useState(mockMSISDNs);
  const [senders, setSenders] = useState(mockSenders);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog states
  const [vmnDialogOpen, setVmnDialogOpen] = useState(false);
  const [msisdnDialogOpen, setMsisdnDialogOpen] = useState(false);
  const [senderDialogOpen, setSenderDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  
  const [selectedVMN, setSelectedVMN] = useState<VMN | null>(null);
  const [selectedMSISDN, setSelectedMSISDN] = useState<MSISDN | null>(null);
  const [selectedSender, setSelectedSender] = useState<Sender | null>(null);
  const [reportType, setReportType] = useState<'summary' | 'detail'>('summary');
  
  const [vmnForm, setVmnForm] = useState({ number: '', type: 'dedicated', userId: '', status: 'active' });
  const [msisdnForm, setMsisdnForm] = useState({ msisdn: '', type: 'premium', userId: '', reason: '' });
  const [senderForm, setSenderForm] = useState({ senderId: '', type: 'promotional', userId: '', status: 'pending' });
  const [bulkData, setBulkData] = useState('');
  
  const { toast } = useToast();

  // VMN handlers
  const handleOpenVMNDialog = (vmn?: VMN) => {
    if (vmn) {
      setSelectedVMN(vmn);
      setVmnForm({ number: vmn.number, type: vmn.type, userId: vmn.userId, status: vmn.status });
    } else {
      setSelectedVMN(null);
      setVmnForm({ number: '', type: 'dedicated', userId: '', status: 'active' });
    }
    setVmnDialogOpen(true);
  };

  const handleSaveVMN = () => {
    const userName = mockUsers.find(u => u.id === vmnForm.userId)?.name || (vmnForm.type === 'shared' ? 'Pool' : '');
    if (selectedVMN) {
      setVMNs(vmns.map(v => v.id === selectedVMN.id ? { ...v, ...vmnForm, userName } : v));
      toast({ title: 'VMN updated', description: 'VMN configuration has been updated.' });
    } else {
      setVMNs([...vmns, { id: Date.now().toString(), ...vmnForm, userName, createdAt: new Date().toISOString().split('T')[0] }]);
      toast({ title: 'VMN added', description: 'New VMN has been added.' });
    }
    setVmnDialogOpen(false);
  };

  const handleDeleteVMN = (id: string) => {
    setVMNs(vmns.filter(v => v.id !== id));
    toast({ title: 'VMN deleted', description: 'VMN has been removed.' });
  };

  // MSISDN handlers
  const handleOpenMSISDNDialog = (msisdn?: MSISDN) => {
    if (msisdn) {
      setSelectedMSISDN(msisdn);
      setMsisdnForm({ msisdn: msisdn.msisdn, type: msisdn.type, userId: msisdn.userId, reason: msisdn.reason });
    } else {
      setSelectedMSISDN(null);
      setMsisdnForm({ msisdn: '', type: 'premium', userId: '', reason: '' });
    }
    setMsisdnDialogOpen(true);
  };

  const handleSaveMSISDN = () => {
    const userName = mockUsers.find(u => u.id === msisdnForm.userId)?.name || 'Global';
    if (selectedMSISDN) {
      setMSISDNs(msisdns.map(m => m.id === selectedMSISDN.id ? { ...m, ...msisdnForm, userName } : m));
      toast({ title: 'MSISDN updated', description: 'MSISDN entry has been updated.' });
    } else {
      setMSISDNs([...msisdns, { id: Date.now().toString(), ...msisdnForm, userName, createdAt: new Date().toISOString().split('T')[0] }]);
      toast({ title: 'MSISDN added', description: 'New MSISDN entry has been added.' });
    }
    setMsisdnDialogOpen(false);
  };

  const handleDeleteMSISDN = (id: string) => {
    setMSISDNs(msisdns.filter(m => m.id !== id));
    toast({ title: 'MSISDN deleted', description: 'MSISDN entry has been removed.' });
  };

  // Sender handlers
  const handleOpenSenderDialog = (sender?: Sender) => {
    if (sender) {
      setSelectedSender(sender);
      setSenderForm({ senderId: sender.senderId, type: sender.type, userId: sender.userId, status: sender.status });
    } else {
      setSelectedSender(null);
      setSenderForm({ senderId: '', type: 'promotional', userId: '', status: 'pending' });
    }
    setSenderDialogOpen(true);
  };

  const handleSaveSender = () => {
    const userName = mockUsers.find(u => u.id === senderForm.userId)?.name || 'Shared';
    if (selectedSender) {
      setSenders(senders.map(s => s.id === selectedSender.id ? { ...s, ...senderForm, userName } : s));
      toast({ title: 'Sender updated', description: 'Sender ID has been updated.' });
    } else {
      setSenders([...senders, { id: Date.now().toString(), ...senderForm, userName, createdAt: new Date().toISOString().split('T')[0] }]);
      toast({ title: 'Sender added', description: 'New Sender ID has been added.' });
    }
    setSenderDialogOpen(false);
  };

  const handleDeleteSender = (id: string) => {
    setSenders(senders.filter(s => s.id !== id));
    toast({ title: 'Sender deleted', description: 'Sender ID has been removed.' });
  };

  // Bulk upload handler
  const handleBulkUpload = () => {
    const lines = bulkData.split('\n').filter(l => l.trim());
    toast({ title: 'Bulk upload', description: `Processing ${lines.length} entries...` });
    setBulkUploadOpen(false);
    setBulkData('');
  };

  const handleDownloadReport = () => {
    toast({ title: 'Downloading report', description: 'VMN report is being generated...' });
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Number Management</h1>
          <p className="text-muted-foreground">Manage VMNs, MSISDNs, and Sender IDs</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="vmn" className="gap-2">
            <Phone className="w-4 h-4" />
            VMN Numbers
          </TabsTrigger>
          <TabsTrigger value="msisdn" className="gap-2">
            <Shield className="w-4 h-4" />
            Premium/Blocked MSISDN
          </TabsTrigger>
          <TabsTrigger value="sender" className="gap-2">
            <Users className="w-4 h-4" />
            Sender IDs
          </TabsTrigger>
          <TabsTrigger value="vmn-report" className="gap-2">
            <FileText className="w-4 h-4" />
            VMN Reports
          </TabsTrigger>
        </TabsList>

        {/* VMN Tab */}
        <TabsContent value="vmn" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search VMNs..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button onClick={() => handleOpenVMNDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add VMN
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
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
                  {vmns.filter(v => v.number.includes(searchQuery)).map(vmn => (
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
                            <DropdownMenuItem onClick={() => handleOpenVMNDialog(vmn)}>
                              <Edit className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteVMN(vmn.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />Delete
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

        {/* MSISDN Tab */}
        <TabsContent value="msisdn" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search MSISDNs..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
              <Button onClick={() => handleOpenMSISDNDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add MSISDN
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
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
                  {msisdns.filter(m => m.msisdn.includes(searchQuery)).map(msisdn => (
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
                            <DropdownMenuItem onClick={() => handleOpenMSISDNDialog(msisdn)}>
                              <Edit className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteMSISDN(msisdn.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />Delete
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

        {/* Sender Tab */}
        <TabsContent value="sender" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search Senders..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <Button onClick={() => handleOpenSenderDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Sender
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
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
                  {senders.filter(s => s.senderId.toLowerCase().includes(searchQuery.toLowerCase())).map(sender => (
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
                            <DropdownMenuItem onClick={() => handleOpenSenderDialog(sender)}>
                              <Edit className="w-4 h-4 mr-2" />Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteSender(sender.id)}>
                              <Trash2 className="w-4 h-4 mr-2" />Delete
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

        {/* VMN Reports Tab */}
        <TabsContent value="vmn-report" className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button variant={reportType === 'summary' ? 'default' : 'outline'} onClick={() => setReportType('summary')}>
                Summary Report
              </Button>
              <Button variant={reportType === 'detail' ? 'default' : 'outline'} onClick={() => setReportType('detail')}>
                Detailed Report
              </Button>
            </div>
            <Button variant="outline" onClick={handleDownloadReport}>
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>

          {reportType === 'summary' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from(new Set(mockVMNReports.map(r => r.vmn))).map(vmn => {
                const vmnReports = mockVMNReports.filter(r => r.vmn === vmn);
                const total = vmnReports.reduce((acc, r) => acc + r.received, 0);
                return (
                  <Card key={vmn}>
                    <CardContent className="pt-6">
                      <p className="font-mono text-sm text-muted-foreground">{vmn}</p>
                      <p className="text-2xl font-bold mt-2">{total}</p>
                      <p className="text-sm text-muted-foreground">Total Messages Received</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
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
                    {mockVMNReports.map(report => (
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedVMN ? 'Edit VMN' : 'Add VMN'}</DialogTitle>
            <DialogDescription>Configure virtual mobile number</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>VMN Number</Label>
              <Input value={vmnForm.number} onChange={e => setVmnForm({ ...vmnForm, number: e.target.value })} placeholder="+919876500001" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={vmnForm.type} onValueChange={v => setVmnForm({ ...vmnForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dedicated">Dedicated</SelectItem>
                  <SelectItem value="shared">Shared Pool</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {vmnForm.type === 'dedicated' && (
              <div className="space-y-2">
                <Label>Assign to User</Label>
                <Select value={vmnForm.userId} onValueChange={v => setVmnForm({ ...vmnForm, userId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
                  <SelectContent>
                    {mockUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={vmnForm.status} onValueChange={v => setVmnForm({ ...vmnForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVmnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveVMN}>{selectedVMN ? 'Update' : 'Add'} VMN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MSISDN Dialog */}
      <Dialog open={msisdnDialogOpen} onOpenChange={setMsisdnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMSISDN ? 'Edit MSISDN' : 'Add MSISDN'}</DialogTitle>
            <DialogDescription>Add premium or blocked MSISDN</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>MSISDN</Label>
              <Input value={msisdnForm.msisdn} onChange={e => setMsisdnForm({ ...msisdnForm, msisdn: e.target.value })} placeholder="+919876543210" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={msisdnForm.type} onValueChange={v => setMsisdnForm({ ...msisdnForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>User (optional - leave empty for global)</Label>
              <Select value={msisdnForm.userId} onValueChange={v => setMsisdnForm({ ...msisdnForm, userId: v })}>
                <SelectTrigger><SelectValue placeholder="Global (all users)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Global (all users)</SelectItem>
                  {mockUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={msisdnForm.reason} onChange={e => setMsisdnForm({ ...msisdnForm, reason: e.target.value })} placeholder="Enter reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMsisdnDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveMSISDN}>{selectedMSISDN ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sender Dialog */}
      <Dialog open={senderDialogOpen} onOpenChange={setSenderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSender ? 'Edit Sender' : 'Add Sender'}</DialogTitle>
            <DialogDescription>Configure sender ID</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sender ID</Label>
              <Input value={senderForm.senderId} onChange={e => setSenderForm({ ...senderForm, senderId: e.target.value })} placeholder="BRANDID" maxLength={6} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={senderForm.type} onValueChange={v => setSenderForm({ ...senderForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="promotional">Promotional</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>User (optional - leave empty for shared)</Label>
              <Select value={senderForm.userId} onValueChange={v => setSenderForm({ ...senderForm, userId: v })}>
                <SelectTrigger><SelectValue placeholder="Shared" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Shared</SelectItem>
                  {mockUsers.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={senderForm.status} onValueChange={v => setSenderForm({ ...senderForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSenderDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSender}>{selectedSender ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkUploadOpen} onOpenChange={setBulkUploadOpen}>
        <DialogContent>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkUploadOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpload}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
