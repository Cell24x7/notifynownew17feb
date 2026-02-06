import { useState, useEffect } from 'react';
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
import { API_BASE_URL } from '@/config/api';

// Types for our data
interface ReportRecord {
  id: string;
  msisdn: string;
  sender: string;
  message: string;
  status: string;
  channel: string;
  timestamp: string;
  dlrTime: string;
  cost: number;
}

interface SummaryCategory {
  category: string;
  data: {
    label: string;
    sent: number;
    delivered: number;
    failed: number;
    pending: number;
    cost: number;
  }[];
}

// Available columns for configuration
const availableColumns = [
  { id: 'msisdn', label: 'MSISDN / Audience', default: true },
  { id: 'sender', label: 'Sender ID', default: true },
  { id: 'message', label: 'Message / Campaign', default: true },
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
  const [selectedRecord, setSelectedRecord] = useState<ReportRecord | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  
  // State for Real Data
  const [detailedReportData, setDetailedReportData] = useState<ReportRecord[]>([]);
  const [summaryCategories, setSummaryCategories] = useState<SummaryCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    availableColumns.filter(c => c.default).map(c => c.id)
  );
  const { toast } = useToast();

  // Fetch Data Effect
  useEffect(() => {
    fetchReports();
  }, [activeTab]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const queryParams = new URLSearchParams({
        from: dateFrom,
        to: dateTo,
        channel: selectedChannel,
        status: selectedStatus
      }).toString();

      // 1. Fetch Summary Data
      if (activeTab === 'summary') {
        const res = await fetch(`${API_BASE_URL}/api/reports/summary?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          // Transform API summary to UI format
          const newSummaryCategories: SummaryCategory[] = [
            { 
              category: 'By Channel', 
              data: data.summary.byChannel || [] 
            },
            { 
              category: 'By Sender', // Mapping 'By User' to 'By Sender' for UI consistency
              data: data.summary.byUser || [] 
            },
            { 
              category: 'By Date',
              data: data.summary.byDate || []
            },
            // 'By User' duplicate removed, using 'By Sender' as primary user view
          ];
          setSummaryCategories(newSummaryCategories);
        }
      }

      // 2. Fetch Detailed Data
      if (activeTab === 'detail') {
        const res = await fetch(`${API_BASE_URL}/api/reports/detail?${queryParams}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.success) {
          // Transform API detailed records to UI format
          const mappedRecords = data.reports.map((r: any) => ({
             id: r.id,
             msisdn: r.audience_count > 1 ? `Multiple (${r.audience_count})` : 'Single', // Adapting for Campaign data
             sender: r.sender || 'System',
             message: r.message || r.campaign_name, // Fallback
             status: r.status,
             channel: r.channel,
             timestamp: new Date(r.timestamp).toLocaleString(),
             dlrTime: new Date(r.timestamp).toLocaleString(), // Placeholder as DLRs match sent time for now
             cost: r.cost
          }));
          setDetailedReportData(mappedRecords);
        }
      }

    } catch (error) {
      console.error("Failed to fetch reports:", error);
      toast({ title: 'Error', description: 'Failed to load report data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    fetchReports();
  };

  const handleDownload = (format: 'csv' | 'excel' | 'pdf') => {
    try {
      const token = localStorage.getItem('authToken');
      const query = new URLSearchParams({
          from: dateFrom,
          to: dateTo,
          channel: selectedChannel,
          status: selectedStatus,
          format: format
      }).toString();
      
      const downloadUrl = `${API_BASE_URL}/api/reports/export?${query}`;
      
      // For authenticated downloads, we might need to use fetch with blob, 
      // but since we temporarily disabled auth for reports, direct link works.
      // If auth is re-enabled, we'd need to pass token in a different way or use cookies.
      // For now, let's try direct open which is simplest for file downloads.
      window.open(downloadUrl, '_blank');
      
      toast({
        title: "Download Started",
        description: `Generating ${format.toUpperCase()} report...`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not start download.",
        variant: "destructive"
      });
    }
  };

  const handleViewRecord = (record: ReportRecord) => {
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
      case 'completed': // Handle both backend status types
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Delivered</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/10 text-red-600 border-red-500/20">Failed</Badge>;
      case 'pending':
      case 'running':
      case 'draft': 
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
              <Button className="w-full" onClick={handleApplyFilters} disabled={loading}>
                <Filter className="w-4 h-4 mr-2" />
                {loading ? 'Loading...' : 'Apply Filters'}
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
                    {detailedReportData.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                           {loading ? 'Loading reports...' : 'No records found matching your filters.'}
                         </TableCell>
                       </TableRow>
                    ) : (
                      detailedReportData.map(record => (
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
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Report */}
        <TabsContent value="summary" className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            {summaryCategories.length === 0 && !loading && (
                <div className="p-2 text-sm text-muted-foreground">No summary data available.</div>
            )}
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
                  {currentSummaryData.reduce((acc, d) => acc + (d.sent || 0), 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Sent</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {currentSummaryData.reduce((acc, d) => acc + (d.delivered || 0), 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Delivered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {currentSummaryData.reduce((acc, d) => acc + (d.failed || 0), 0).toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Failed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
                  ₹{currentSummaryData.reduce((acc, d) => acc + (d.cost || 0), 0).toLocaleString()}
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
                  {currentSummaryData.length === 0 ? (
                       <TableRow>
                         <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                             No summary data available for this category.
                         </TableCell>
                       </TableRow>
                  ) : (
                    currentSummaryData.map((row, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        <TableCell className="text-right">{row.sent.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-green-600">{row.delivered.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">{row.failed.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-yellow-600">{row.pending.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {row.sent > 0 ? ((row.delivered / row.sent) * 100).toFixed(1) : '0.0'}%
                        </TableCell>
                        <TableCell className="text-right">₹{row.cost.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
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
