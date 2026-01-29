import { useState } from 'react';
import { FileText, Download, Eye, Filter, Calendar, BarChart3, PieChart, TrendingUp, Settings2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

// Mock detailed report data
const detailedReportData = [
  { id: '1', msisdn: '+919876543210', sender: 'BRAND1', message: 'Your OTP is 123456', status: 'delivered', channel: 'SMS', timestamp: '2024-01-15 10:30:00', dlrTime: '2024-01-15 10:30:05', cost: 0.25 },
  { id: '2', msisdn: '+919876543211', sender: 'BRAND1', message: 'Welcome to our service', status: 'delivered', channel: 'WhatsApp', timestamp: '2024-01-15 10:31:00', dlrTime: '2024-01-15 10:31:03', cost: 0.50 },
  { id: '3', msisdn: '+919876543212', sender: 'BRAND2', message: 'Payment received', status: 'failed', channel: 'SMS', timestamp: '2024-01-15 10:32:00', dlrTime: '-', cost: 0 },
  { id: '4', msisdn: '+919876543213', sender: 'BRAND1', message: 'Order confirmed', status: 'pending', channel: 'RCS', timestamp: '2024-01-15 10:33:00', dlrTime: '-', cost: 0.75 },
  { id: '5', msisdn: '+919876543214', sender: 'BRAND3', message: 'Delivery update', status: 'delivered', channel: 'SMS', timestamp: '2024-01-15 10:34:00', dlrTime: '2024-01-15 10:34:02', cost: 0.25 },
];

// Mock summary report data
const summaryCategories = [
  { category: 'By Channel', data: [
    { label: 'SMS', sent: 15000, delivered: 14500, failed: 500, pending: 0, cost: 3750 },
    { label: 'WhatsApp', sent: 8000, delivered: 7800, failed: 200, pending: 0, cost: 4000 },
    { label: 'RCS', sent: 3000, delivered: 2800, failed: 150, pending: 50, cost: 2250 },
    { label: 'Email', sent: 5000, delivered: 4900, failed: 100, pending: 0, cost: 500 },
  ]},
  { category: 'By Sender', data: [
    { label: 'BRAND1', sent: 12000, delivered: 11500, failed: 400, pending: 100, cost: 4500 },
    { label: 'BRAND2', sent: 8000, delivered: 7700, failed: 300, pending: 0, cost: 3200 },
    { label: 'BRAND3', sent: 6000, delivered: 5800, failed: 200, pending: 0, cost: 2400 },
    { label: 'PROMO', sent: 5000, delivered: 4800, failed: 150, pending: 50, cost: 1400 },
  ]},
  { category: 'By User', data: [
    { label: 'user1@company.com', sent: 10000, delivered: 9600, failed: 400, pending: 0, cost: 3500 },
    { label: 'user2@company.com', sent: 8000, delivered: 7700, failed: 300, pending: 0, cost: 2800 },
    { label: 'user3@company.com', sent: 7000, delivered: 6800, failed: 150, pending: 50, cost: 2600 },
    { label: 'user4@company.com', sent: 6000, delivered: 5700, failed: 250, pending: 50, cost: 1600 },
  ]},
  { category: 'By Date', data: [
    { label: '2024-01-15', sent: 5000, delivered: 4800, failed: 200, pending: 0, cost: 1500 },
    { label: '2024-01-14', sent: 6000, delivered: 5800, failed: 150, pending: 50, cost: 1800 },
    { label: '2024-01-13', sent: 5500, delivered: 5300, failed: 200, pending: 0, cost: 1650 },
    { label: '2024-01-12', sent: 4500, delivered: 4300, failed: 150, pending: 50, cost: 1350 },
  ]},
];

// Available columns for configuration
const availableColumns = [
  { id: 'msisdn', label: 'MSISDN', default: true },
  { id: 'sender', label: 'Sender ID', default: true },
  { id: 'message', label: 'Message', default: true },
  { id: 'status', label: 'Status', default: true },
  { id: 'channel', label: 'Channel', default: true },
  { id: 'timestamp', label: 'Sent Time', default: true },
  { id: 'dlrTime', label: 'DLR Time', default: false },
  { id: 'cost', label: 'Cost', default: false },
  { id: 'errorCode', label: 'Error Code', default: false },
  { id: 'operator', label: 'Operator', default: false },
  { id: 'circle', label: 'Circle', default: false },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('detail');
  const [summaryCategory, setSummaryCategory] = useState('By Channel');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<typeof detailedReportData[0] | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    availableColumns.filter(c => c.default).map(c => c.id)
  );
  const { toast } = useToast();

  const handleDownload = (format: 'csv' | 'excel' | 'pdf') => {
    toast({
      title: `Downloading ${format.toUpperCase()}`,
      description: 'Your report is being generated...',
    });
  };

  const handleViewRecord = (record: typeof detailedReportData[0]) => {
    setSelectedRecord(record);
    setViewDialogOpen(true);
  };

  const toggleColumn = (columnId: string) => {
    setVisibleColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Delivered</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const currentSummaryData = summaryCategories.find(c => c.category === summaryCategory)?.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View detailed and summary reports with download options</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setConfigDialogOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            Configure Columns
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="rcs">RCS</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="detail" className="gap-2">
              <FileText className="w-4 h-4" />
              Detailed Report
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Summary Report
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDownload('csv')}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload('excel')}>
              <Download className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleDownload('pdf')}>
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>

        {/* Detailed Report */}
        <TabsContent value="detail" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.includes('msisdn') && <TableHead>MSISDN</TableHead>}
                      {visibleColumns.includes('sender') && <TableHead>Sender</TableHead>}
                      {visibleColumns.includes('message') && <TableHead>Message</TableHead>}
                      {visibleColumns.includes('status') && <TableHead>Status</TableHead>}
                      {visibleColumns.includes('channel') && <TableHead>Channel</TableHead>}
                      {visibleColumns.includes('timestamp') && <TableHead>Sent Time</TableHead>}
                      {visibleColumns.includes('dlrTime') && <TableHead>DLR Time</TableHead>}
                      {visibleColumns.includes('cost') && <TableHead>Cost</TableHead>}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedReportData.map(record => (
                      <TableRow key={record.id}>
                        {visibleColumns.includes('msisdn') && <TableCell className="font-mono">{record.msisdn}</TableCell>}
                        {visibleColumns.includes('sender') && <TableCell>{record.sender}</TableCell>}
                        {visibleColumns.includes('message') && <TableCell className="max-w-[200px] truncate">{record.message}</TableCell>}
                        {visibleColumns.includes('status') && <TableCell>{getStatusBadge(record.status)}</TableCell>}
                        {visibleColumns.includes('channel') && <TableCell><Badge variant="outline">{record.channel}</Badge></TableCell>}
                        {visibleColumns.includes('timestamp') && <TableCell className="text-sm text-muted-foreground">{record.timestamp}</TableCell>}
                        {visibleColumns.includes('dlrTime') && <TableCell className="text-sm text-muted-foreground">{record.dlrTime}</TableCell>}
                        {visibleColumns.includes('cost') && <TableCell>₹{record.cost.toFixed(2)}</TableCell>}
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleViewRecord(record)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Report */}
        <TabsContent value="summary" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {summaryCategories.map(cat => (
              <Button
                key={cat.category}
                variant={summaryCategory === cat.category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSummaryCategory(cat.category)}
              >
                {cat.category}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">
                  {currentSummaryData.reduce((acc, d) => acc + d.sent, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {currentSummaryData.reduce((acc, d) => acc + d.delivered, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Delivered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {currentSummaryData.reduce((acc, d) => acc + d.failed, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  ₹{currentSummaryData.reduce((acc, d) => acc + d.cost, 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Cost</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{summaryCategory.replace('By ', '')}</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Delivery %</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSummaryData.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell className="text-right">{row.sent.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-green-600">{row.delivered.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-red-600">{row.failed.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-yellow-600">{row.pending.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {((row.delivered / row.sent) * 100).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">₹{row.cost.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Record Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>Complete details of the message record</DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">MSISDN</Label>
                  <p className="font-mono">{selectedRecord.msisdn}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Sender</Label>
                  <p>{selectedRecord.sender}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Channel</Label>
                  <p>{selectedRecord.channel}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRecord.status)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Sent Time</Label>
                  <p className="text-sm">{selectedRecord.timestamp}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">DLR Time</Label>
                  <p className="text-sm">{selectedRecord.dlrTime}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cost</Label>
                  <p>₹{selectedRecord.cost.toFixed(2)}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Message</Label>
                <p className="mt-1 p-3 bg-muted rounded-lg">{selectedRecord.message}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Column Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Report Columns</DialogTitle>
            <DialogDescription>Select which columns to display in the detailed report</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {availableColumns.map(column => (
              <div key={column.id} className="flex items-center gap-3">
                <Checkbox
                  id={column.id}
                  checked={visibleColumns.includes(column.id)}
                  onCheckedChange={() => toggleColumn(column.id)}
                />
                <Label htmlFor={column.id} className="cursor-pointer">{column.label}</Label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setConfigDialogOpen(false)}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
