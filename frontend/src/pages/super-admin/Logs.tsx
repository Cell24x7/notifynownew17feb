import { useState, useEffect } from 'react';
import { Search, Filter, AlertTriangle, Info, AlertCircle, User, Globe, CreditCard, Shield, RotateCw, FileDown, Eye, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { logsApi, SystemLog, LogsStats } from '@/api/logsApi';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SuperAdminLogs() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<LogsStats>({ total: 0, errors: 0, warnings: 0, info: 0 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await logsApi.getLogs({
        type: typeFilter,
        severity: severityFilter,
        search: searchQuery,
        startDate: startDate ? `${startDate} 00:00:00` : undefined,
        endDate: endDate ? `${endDate} 23:59:59` : undefined,
        page,
        limit: 50
      });
      setLogs(data.logs);
      setStats(data.stats);
      setTotalPages(data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      toast.error('Failed to load system logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetch all logs matching filters (ignoring pagination for export)
      const data = await logsApi.getLogs({
        type: typeFilter,
        severity: severityFilter,
        search: searchQuery,
        startDate: startDate ? `${startDate} 00:00:00` : undefined,
        endDate: endDate ? `${endDate} 23:59:59` : undefined,
        limit: 1000 // Reasonable limit for export
      });

      const exportData = data.logs;
      if (exportData.length === 0) {
        toast.error('No data found to export');
        return;
      }

      // Generate CSV
      const headers = ['ID', 'Timestamp', 'Type', 'Severity', 'Action', 'User', 'Client', 'IP', 'Device', 'Location', 'Details'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(log => [
          log.id,
          format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss'),
          log.type,
          log.severity,
          `"${log.action.replace(/"/g, '""')}"`,
          `"${(log.userName || '').replace(/"/g, '""')}"`,
          `"${(log.clientName || '').replace(/"/g, '""')}"`,
          log.ipAddress,
          `"${(log.deviceInfo || 'Unknown').replace(/"/g, '""')}"`,
          `"${(log.location || 'Unknown').replace(/"/g, '""')}"`,
          `"${log.details.replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `system_logs_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Logs exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export logs');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 500); 
    return () => clearTimeout(timer);
  }, [searchQuery, typeFilter, severityFilter, startDate, endDate, page]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login': return <User className="w-4 h-4" />;
      case 'api': return <Globe className="w-4 h-4" />;
      case 'credit': return <CreditCard className="w-4 h-4" />;
      case 'admin_action': return <Shield className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'login': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'api': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'credit': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'admin_action': return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
      case 'error': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">Monitor platform activity, device info, and user events</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || logs.length === 0}>
                <FileDown className={cn("w-4 h-4 mr-2", exporting && "animate-pulse")} />
                Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
                <RotateCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
                Refresh
            </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
            { label: 'Total Logs', value: stats.total, icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Errors', value: stats.errors, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
            { label: 'Warnings', value: stats.warnings, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Info', value: stats.info, icon: Info, color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
        ].map((stat, i) => (
            <Card key={i}>
                <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", stat.bg)}>
                            <stat.icon className={cn("w-5 h-5", stat.color)} />
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">{stat.label}</div>
                            <div className="text-xl font-bold">{stat.value}</div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search action, details..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
            
            <div className="flex gap-2 lg:col-span-2">
                <div className="relative flex-1">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)} 
                        className="pl-10 h-9 text-sm"
                    />
                </div>
                <div className="relative flex-1">
                    <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)} 
                        className="pl-10 h-9 text-sm"
                    />
                </div>
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="credit">Credit</SelectItem>
                <SelectItem value="admin_action">Admin Action</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="All Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Event Info</TableHead>
                    <TableHead>User / Client</TableHead>
                    <TableHead>Device & IP</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="w-[80px] text-right">Details</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                        <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                        Loading latest system logs...
                    </TableCell>
                    </TableRow>
                ) : logs.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-muted-foreground">
                        No logs found matching your criteria.
                    </TableCell>
                    </TableRow>
                ) : (
                    logs.map((log) => (
                    <TableRow key={log.id} className={cn(
                        "hover:bg-muted/30 transition-colors",
                        log.severity === 'error' && 'bg-red-50/50 dark:bg-red-950/10',
                        log.severity === 'warning' && 'bg-amber-50/50 dark:bg-amber-950/10'
                    )}>
                        <TableCell className="pl-4">
                        {getSeverityIcon(log.severity)}
                        </TableCell>
                        <TableCell>
                            <div className="space-y-1">
                                <Badge className={cn('text-[10px] px-1.5 h-4 gap-1 border-none font-medium', getTypeColor(log.type))}>
                                    {getTypeIcon(log.type)}
                                    <span className="capitalize">{log.type.replace('_', ' ')}</span>
                                </Badge>
                                <div className="font-semibold text-sm line-clamp-1">{log.action}</div>
                            </div>
                        </TableCell>
                        <TableCell>
                        <div className="space-y-0.5 min-w-[120px]">
                            {log.userName && <div className="text-sm font-medium">{log.userName}</div>}
                            {log.clientName && <div className="text-xs text-muted-foreground bg-muted/50 px-1 inline-block rounded">{log.clientName}</div>}
                            {!log.userName && !log.clientName && <span className="text-muted-foreground">-</span>}
                        </div>
                        </TableCell>
                        <TableCell>
                            <div className="space-y-1">
                                <div className="text-xs font-mono bg-muted/80 px-1.5 py-0.5 rounded w-fit">{log.ipAddress}</div>
                                {log.deviceInfo && <div className="text-[11px] text-muted-foreground max-w-[180px] truncate" title={log.deviceInfo}>{log.deviceInfo}</div>}
                            </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {format(new Date(log.createdAt), 'MMM d, yyyy')}<br/>
                        {format(new Date(log.createdAt), 'HH:mm:ss')}
                        </TableCell>
                        <TableCell className="text-right pr-4">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => setSelectedLog(log)}
                            >
                                <Eye className="w-4 h-4" />
                            </Button>
                        </TableCell>
                    </TableRow>
                    ))
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
            <p className="text-xs text-muted-foreground">
                Showing page {page} of {totalPages} ({stats.total} total logs)
            </p>
            <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setPage(p => Math.max(1, p - 1)); window.scrollTo(0,0); }}
                    disabled={page === 1}
                >
                    Previous
                </Button>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { setPage(p => Math.min(totalPages, p + 1)); window.scrollTo(0,0); }}
                    disabled={page === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    {selectedLog && getSeverityIcon(selectedLog.severity)}
                    Log Details
                </DialogTitle>
            </DialogHeader>
            {selectedLog && (
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Type / Action</label>
                            <div className="text-sm font-semibold flex items-center gap-2">
                                <Badge className={cn('text-[10px]', getTypeColor(selectedLog.type))}>{selectedLog.type}</Badge>
                                {selectedLog.action}
                            </div>
                        </div>
                        <div className="space-y-1 text-right">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">Timestamp</label>
                            <div className="text-sm">{format(new Date(selectedLog.createdAt), 'PPP p')}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">User info</label>
                            <div className="text-sm font-medium">{selectedLog.userName || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">{selectedLog.clientName || 'No Company'}</div>
                        </div>
                        <div className="space-y-1 text-right">
                            <label className="text-[10px] font-bold uppercase text-muted-foreground">IP & Location</label>
                            <div className="text-sm font-mono">{selectedLog.ipAddress}</div>
                            <div className="text-xs text-muted-foreground font-medium">{selectedLog.location || 'Location tracking enabled'}</div>
                        </div>
                    </div>

                    <div className="space-y-1 border-t pt-4">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Device / Browser Info</label>
                        <div className="text-sm bg-muted/30 p-2 rounded-md font-mono text-xs">
                            {selectedLog.deviceInfo || 'No user-agent collected'}
                        </div>
                    </div>

                    <div className="space-y-1 border-t pt-4">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">Full Event Message</label>
                        <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {selectedLog.details}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>Close</Button>
                    </div>
                </div>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
