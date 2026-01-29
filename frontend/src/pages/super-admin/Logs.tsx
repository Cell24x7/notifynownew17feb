import { useState } from 'react';
import { Search, Filter, AlertTriangle, Info, AlertCircle, User, Globe, CreditCard, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { mockSystemLogs, SystemLog } from '@/lib/superAdminMockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SuperAdminLogs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filteredLogs = mockSystemLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.clientName && log.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || log.type === typeFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    return matchesSearch && matchesType && matchesSeverity;
  });

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
      case 'login': return 'bg-primary/10 text-primary';
      case 'api': return 'bg-secondary/10 text-secondary';
      case 'credit': return 'bg-warning/10 text-warning';
      case 'admin_action': return 'bg-muted text-foreground';
      case 'error': return 'bg-destructive/10 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'info': return <Info className="w-4 h-4 text-muted-foreground" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'info': return 'text-muted-foreground';
      case 'warning': return 'text-warning';
      case 'error': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const logCounts = {
    total: mockSystemLogs.length,
    errors: mockSystemLogs.filter(l => l.severity === 'error').length,
    warnings: mockSystemLogs.filter(l => l.severity === 'warning').length,
    info: mockSystemLogs.filter(l => l.severity === 'info').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Logs</h1>
          <p className="text-muted-foreground">Monitor platform activity and events</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Info className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Logs</div>
                <div className="text-xl font-bold">{logCounts.total}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Errors</div>
                <div className="text-xl font-bold text-destructive">{logCounts.errors}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Warnings</div>
                <div className="text-xl font-bold text-warning">{logCounts.warnings}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Info</div>
                <div className="text-xl font-bold">{logCounts.info}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
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
              <SelectTrigger className="w-[140px]">
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>User / Client</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className={cn(
                  log.severity === 'error' && 'bg-destructive/5',
                  log.severity === 'warning' && 'bg-warning/5'
                )}>
                  <TableCell>
                    {getSeverityIcon(log.severity)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge className={cn('text-xs gap-1', getTypeColor(log.type))}>
                        {getTypeIcon(log.type)}
                        <span className="capitalize">{log.type.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{log.action}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      {log.userName && <div className="text-sm">{log.userName}</div>}
                      {log.clientName && <div className="text-xs text-muted-foreground">{log.clientName}</div>}
                      {!log.userName && !log.clientName && <span className="text-muted-foreground">-</span>}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm text-muted-foreground truncate">{log.details}</p>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">{log.ipAddress}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MMM d, HH:mm:ss')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
