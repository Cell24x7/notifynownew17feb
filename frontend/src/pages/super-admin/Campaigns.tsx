import { useState, useEffect } from 'react';
import { Search, Filter, BarChart3, Pause, Play, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { campaignService, Campaign } from '@/services/campaignService';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { mockClients } from '@/lib/superAdminMockData';

export default function SuperAdminCampaigns() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const resp = await campaignService.getAdminCampaigns({
        page,
        search: searchQuery,
        clientId: clientFilter,
        channel: channelFilter,
        status: statusFilter
      });
      setCampaigns(resp.campaigns);
      setTotalPages(resp.pagination.totalPages);
      setTotalItems(resp.pagination.total);
    } catch (error) {
      console.error('Fetch global campaigns error:', error);
      toast({ title: 'Error', description: 'Failed to load global campaigns', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns();
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, clientFilter, channelFilter, statusFilter, page]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-primary/10 text-primary';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'scheduled': return 'bg-secondary/10 text-secondary';
      case 'paused': return 'bg-warning/10 text-warning';
      case 'draft': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handlePauseCampaign = async (campaign: Campaign) => {
    try {
      const newStatus = campaign.status === 'paused' ? 'running' : 'paused';
      await campaignService.updateStatus(campaign.id, newStatus);
      toast({
        title: campaign.status === 'paused' ? 'Campaign Resumed' : 'Campaign Paused',
        description: `${campaign.name} has been ${campaign.status === 'paused' ? 'resumed' : 'paused'} (admin override)`,
      });
      fetchCampaigns();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to update campaign status', variant: 'destructive' });
    }
  };

  const totalMessages = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
  const totalCredits = campaigns.reduce((acc, c) => acc + (c.cost || 0), 0);
  const runningCount = campaigns.filter(c => c.status === 'running').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Global Campaigns</h1>
          <p className="text-muted-foreground">View and manage campaigns across all clients</p>
        </div>
        <Button variant="outline" onClick={fetchCampaigns} disabled={loading}>
          <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Campaigns</div>
            <div className="text-2xl font-bold">{totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Running Now</div>
            <div className="text-2xl font-bold text-primary">{runningCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Messages Sent</div>
            <div className="text-2xl font-bold">{totalMessages.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Credits Used</div>
            <div className="text-2xl font-bold">{totalCredits.toLocaleString()}</div>
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
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Clients" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {mockClients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">📱 WhatsApp</SelectItem>
                <SelectItem value="sms">📲 SMS</SelectItem>
                <SelectItem value="rcs">💬 RCS</SelectItem>
                <SelectItem value="rcs">💬 RCS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                     <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
                     <p className="text-muted-foreground">Loading global campaigns...</p>
                  </TableCell>
                </TableRow>
              ) : campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No campaigns found matching your criteria
                  </TableCell>
                </TableRow>
              ) : campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="text-primary">{(campaign as any).clientName || 'User ID: ' + campaign.user_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={campaign.channel as any} className="w-4 h-4" />
                      <span className="capitalize text-sm">{campaign.channel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', getStatusColor(campaign.status))}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{(campaign.sent_count || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{(campaign.cost || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {campaign.sent_count > 0 ? `${Math.round((campaign.delivered_count / campaign.sent_count) * 100)}%` : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(campaign.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSelectedCampaign(campaign)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {(campaign.status === 'running' || campaign.status === 'paused') && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePauseCampaign(campaign)}
                        >
                          {campaign.status === 'paused' ? (
                            <Play className="w-4 h-4 text-primary" />
                          ) : (
                            <Pause className="w-4 h-4 text-warning" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{" "}
            <span className="font-medium">{Math.min(page * 20, totalItems)}</span> of{" "}
            <span className="font-medium">{totalItems}</span> campaigns
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm font-medium">Page {page} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Campaign Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Global Campaign Analytics
            </DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedCampaign.name}</h3>
                  <p className="text-sm text-muted-foreground">{(selectedCampaign as any).clientName || 'User ID: ' + selectedCampaign.user_id}</p>
                </div>
                <Badge className={getStatusColor(selectedCampaign.status)}>
                  {selectedCampaign.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Messages Sent</div>
                    <div className="text-2xl font-bold">{(selectedCampaign.sent_count || 0).toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Credits Used</div>
                    <div className="text-2xl font-bold">{(selectedCampaign.cost || 0).toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Delivery Rate</span>
                  <span className="text-sm font-bold text-primary">
                    {selectedCampaign.sent_count > 0 ? Math.round((selectedCampaign.delivered_count / selectedCampaign.sent_count) * 100) : 0}%
                  </span>
                </div>
                <Progress value={selectedCampaign.sent_count > 0 ? (selectedCampaign.delivered_count / selectedCampaign.sent_count) * 100 : 0} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Channel</div>
                  <div className="font-medium capitalize flex items-center gap-2 mt-1">
                    <ChannelIcon channel={selectedCampaign.channel as any} className="w-4 h-4" />
                    {selectedCampaign.channel}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-medium mt-1">
                    {format(new Date(selectedCampaign.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                {selectedCampaign.scheduled_at && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Scheduled For</div>
                    <div className="font-medium mt-1">
                      {format(new Date(selectedCampaign.scheduled_at), 'MMM d, yyyy HH:mm')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
