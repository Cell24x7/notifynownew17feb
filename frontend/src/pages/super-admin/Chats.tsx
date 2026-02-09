import { useState } from 'react';
import { Search, Filter, Eye, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { mockGlobalChats, mockClients, GlobalChat } from '@/lib/superAdminMockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function SuperAdminChats() {
  const [searchQuery, setSearchQuery] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedChat, setSelectedChat] = useState<GlobalChat | null>(null);

  const filteredChats = mockGlobalChats.filter(chat => {
    const matchesSearch = chat.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClient = clientFilter === 'all' || chat.clientId === clientFilter;
    const matchesChannel = channelFilter === 'all' || chat.channel === channelFilter;
    const matchesStatus = statusFilter === 'all' || chat.status === statusFilter;
    return matchesSearch && matchesClient && matchesChannel && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-primary/10 text-primary';
      case 'closed': return 'bg-muted text-muted-foreground';
      case 'pending': return 'bg-warning/10 text-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Global Inbox</h1>
          <p className="text-muted-foreground">Monitor chats across all clients (Read-Only)</p>
        </div>
        <Badge variant="outline" className="px-4 py-2">
          <Eye className="w-4 h-4 mr-2" />
          Monitoring Mode
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by customer or client..."
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
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="rcs">RCS</SelectItem>
                <SelectItem value="rcs">RCS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Chat List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            All Conversations ({filteredChats.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedChat(chat)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <ChannelIcon channel={chat.channel} className="w-8 h-8" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{chat.customerName}</span>
                        <Badge className={cn('text-xs', getStatusColor(chat.status))}>
                          {chat.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate max-w-md">
                        {chat.lastMessage}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-medium text-primary">{chat.clientName}</div>
                    <div className="text-muted-foreground text-xs">
                      {format(new Date(chat.updatedAt), 'MMM d, HH:mm')}
                    </div>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Credits: {chat.creditsDeducted}</span>
                  {chat.automationTriggered && (
                    <Badge variant="secondary" className="text-xs">Bot Active</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Chat Detail Dialog */}
      <Dialog open={!!selectedChat} onOpenChange={() => setSelectedChat(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChannelIcon channel={selectedChat?.channel || 'whatsapp'} className="w-5 h-5" />
              Conversation with {selectedChat?.customerName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-3 gap-4">
            {/* Messages */}
            <div className="col-span-2">
              <ScrollArea className="h-[400px] border rounded-lg p-4">
                <div className="space-y-4">
                  {selectedChat?.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex flex-col max-w-[80%]',
                        msg.sender === 'customer' ? 'items-start' : 'items-end ml-auto'
                      )}
                    >
                      <div
                        className={cn(
                          'px-4 py-2 rounded-xl text-sm',
                          msg.sender === 'customer'
                            ? 'bg-muted'
                            : msg.sender === 'bot'
                            ? 'bg-secondary/10 text-secondary'
                            : 'bg-primary text-primary-foreground'
                        )}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize">{msg.sender}</span>
                        <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Metadata */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Metadata</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="text-muted-foreground text-xs">Client</div>
                    <div className="font-medium">{selectedChat?.clientName}</div>
                  </div>
                  <Separator />
                  <div>
                    <div className="text-muted-foreground text-xs">Channel</div>
                    <div className="font-medium capitalize">{selectedChat?.channel}</div>
                  </div>
                  <Separator />
                  <div>
                    <div className="text-muted-foreground text-xs">Automation Triggered</div>
                    <Badge variant={selectedChat?.automationTriggered ? 'default' : 'secondary'}>
                      {selectedChat?.automationTriggered ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                  <Separator />
                  <div>
                    <div className="text-muted-foreground text-xs">Credits Deducted</div>
                    <div className="font-medium">{selectedChat?.creditsDeducted}</div>
                  </div>
                  <Separator />
                  <div>
                    <div className="text-muted-foreground text-xs">Status</div>
                    <Badge className={getStatusColor(selectedChat?.status || 'open')}>
                      {selectedChat?.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
