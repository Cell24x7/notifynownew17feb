import { useState } from 'react';
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
import { mockGlobalCampaigns, mockClients, GlobalCampaign } from '@/lib/superAdminMockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminCampaigns() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCampaign, setSelectedCampaign] = useState<GlobalCampaign | null>(null);

  const filteredCampaigns = mockGlobalCampaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      campaign.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = clientFilter === 'all' || campaign.clientId === clientFilter;
    const matchesChannel = channelFilter === 'all' || campaign.channel === channelFilter;
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
    return matchesSearch && matchesClient && matchesChannel && matchesStatus;
  });

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

  const handlePauseCampaign = (campaign: GlobalCampaign) => {
    toast({
      title: campaign.status === 'paused' ? 'Campaign Resumed' : 'Campaign Paused',
      description: `${campaign.name} has been ${campaign.status === 'paused' ? 'resumed' : 'paused'} (admin override)`,
    });
  };

  const totalMessages = filteredCampaigns.reduce((acc, c) => acc + c.messagesSent, 0);
  const totalCredits = filteredCampaigns.reduce((acc, c) => acc + c.creditsUsed, 0);
  const runningCount = filteredCampaigns.filter(c => c.status === 'running').length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Global Campaigns</h1>
          <p className="text-muted-foreground">View and manage campaigns across all clients</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Campaigns</div>
            <div className="text-2xl font-bold">{filteredCampaigns.length}</div>
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
            <TableHeader>
              <TableRow>
                <TableHead>Campaign Name</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="text-right">Credits</TableHead>
                <TableHead className="text-right">Delivery</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">{campaign.name}</TableCell>
                  <TableCell className="text-primary">{campaign.clientName}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ChannelIcon channel={campaign.channel} className="w-4 h-4" />
                      <span className="capitalize text-sm">{campaign.channel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', getStatusColor(campaign.status))}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{campaign.messagesSent.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{campaign.creditsUsed.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {campaign.deliveryRate > 0 ? `${campaign.deliveryRate}%` : '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(campaign.createdAt), 'MMM d, yyyy')}
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

      {/* Campaign Detail Dialog */}
      <Dialog open={!!selectedCampaign} onOpenChange={() => setSelectedCampaign(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Campaign Analytics
            </DialogTitle>
          </DialogHeader>
          
          {selectedCampaign && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedCampaign.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCampaign.clientName}</p>
                </div>
                <Badge className={getStatusColor(selectedCampaign.status)}>
                  {selectedCampaign.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Messages Sent</div>
                    <div className="text-2xl font-bold">{selectedCampaign.messagesSent.toLocaleString()}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground">Credits Used</div>
                    <div className="text-2xl font-bold">{selectedCampaign.creditsUsed.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Delivery Rate</span>
                  <span className="text-sm font-bold text-primary">{selectedCampaign.deliveryRate}%</span>
                </div>
                <Progress value={selectedCampaign.deliveryRate} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Channel</div>
                  <div className="font-medium capitalize flex items-center gap-2 mt-1">
                    <ChannelIcon channel={selectedCampaign.channel} className="w-4 h-4" />
                    {selectedCampaign.channel}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-medium mt-1">
                    {format(new Date(selectedCampaign.createdAt), 'MMM d, yyyy')}
                  </div>
                </div>
                {selectedCampaign.scheduledAt && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground">Scheduled For</div>
                    <div className="font-medium mt-1">
                      {format(new Date(selectedCampaign.scheduledAt), 'MMM d, yyyy HH:mm')}
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
