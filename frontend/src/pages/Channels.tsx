import { useState, useEffect } from 'react';
import api from '../config/axios';
import axios from 'axios';
import { 
  Smartphone, 
  Plus, 
  Search, 
  MoreVertical, 
  RefreshCw, 
  Trash2, 
  Settings2, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Download, 
  ExternalLink,
  ChevronRight,
  Zap,
  Info,
  ShieldCheck,
  History,
  Terminal,
  FileText,
  Activity,
  Code
} from 'lucide-react';
import DeveloperConsole from '../components/channels/DeveloperConsole';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

// Mock Data for Channels
const initialChannels = [
  {
    id: 1,
    name: 'Cell24x7',
    number: '917208185276',
    provider: 'WAConnect',
    status: 'warning',
    created: '06/05/2024',
    type: 'Official',
    icon: '⚡'
  },
  {
    id: 2,
    name: 'sandy',
    number: '919876839965',
    provider: 'WAConnect',
    status: 'warning',
    created: '07/05/2024',
    type: 'Official',
    icon: '⚡'
  },
  {
    id: 3,
    name: 'Pingsparrow',
    number: '919887917729',
    provider: 'WAConnect',
    status: 'warning',
    created: '07/05/2024',
    type: 'Official',
    icon: '⚡'
  }
];

export default function Channels() {
  const [channels, setChannels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Provider, 2: Config, 3: QR
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [realQRCode, setRealQRCode] = useState<string | null>(null);
  const [isFetchingQR, setIsFetchingQR] = useState(false);

  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/api/proero/channels');
      if (response.data.success) {
        setChannels(response.data.channels);
      }
    } catch (err) {
      console.error('Fetch channels error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!channelName) return;
    try {
      const response = await api.post('/api/proero/channels', { 
        name: channelName,
        provider: selectedProvider 
      });
      if (response.data.success) {
        setIsConnectOpen(false);
        setStep(1);
        setChannelName('');
        fetchChannels();
        toast.success("Channel created successfully");
      }
    } catch (err) {
      console.error('Create channel error:', err);
      toast.error("Failed to create channel");
    }
  };

  const handleSyncChannelStatus = async (id: number) => {
    try {
      toast.loading("Syncing status...", { id: `sync-${id}` });
      const response = await api.post(`/api/proero/channels/${id}/sync`);
      if (response.data.success) {
        toast.success(`Channel synced: ${response.data.status}`, { id: `sync-${id}` });
        fetchChannels();
      } else {
        toast.error("Failed to sync channel status", { id: `sync-${id}` });
      }
    } catch (err) {
      console.error('Sync channel error:', err);
      toast.error("Failed to sync channel status", { id: `sync-${id}` });
    }
  };


  const handleDeleteChannel = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;
    try {
      setIsDeleting(true);
      const response = await api.delete(`/api/proero/channels/${id}`);
      if (response.data.success) {
        setChannels(channels.filter(c => c.id !== id));
        toast.success("Channel deleted successfully");
      }
    } catch (err) {
      console.error('Delete channel error:', err);
      toast.error("Failed to delete channel");
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredChannels = channels.filter(c => 
    (c.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
    (c.phone_number || c.number || '').includes(searchQuery)
  );

  const handleConnectChannel = () => {
    setIsConnectOpen(true);
    setStep(1);
  };

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
    setStep(2);
  };

  const handleConfigSubmit = () => {
    handleCreateChannel();
  };

  const handleViewQR = (channel: any) => {
    setActiveChannel(channel);
    setIsQRModalOpen(true);
    setRealQRCode(null); // Reset when opening
    // Trigger auto-fetch after state update
    setTimeout(() => {
      if (channel.provider === 'Proero' || channel.provider === 'WAConnect') {
         fetchRealQR(channel);
      }
    }, 100);
  };

  const fetchRealQR = async (channelOverride?: any) => {
    const targetChannel = channelOverride || activeChannel;
    if (!targetChannel) return;
    try {
      setIsFetchingQR(true);
      // API requires format like 'session1', 'session2'
      const sessionName = `session${targetChannel.id}`;
      // Use Backend Proxy to bypass CORS
      const response = await api.post('/api/proero/proxy/api/whatsapp/connect', { sessionName });
      
      const qrData = response.data.qr || response.data.data?.qr;
      if (qrData) {
        setRealQRCode(qrData);
        toast.success("Real QR Code loaded!");
      } else {
        toast.error("Failed to get QR from API");
      }
    } catch (err) {
      console.error('Fetch Real QR error:', err);
      toast.error("Failed to connect to WhatsApp API");
    } finally {
      setIsFetchingQR(false);
    }
  };

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Channels
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Manage your WhatsApp connected devices and communication routes
          </p>
        </div>
        <Button 
          onClick={handleConnectChannel} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 px-6 h-11 transition-all hover:scale-105 active:scale-95"
        >
          <Plus className="w-5 h-5 mr-2" />
          Connect Channel
        </Button>
      </div>

      {/* Stats & Search */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              placeholder="Search channels by name or number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-card border-border/50 focus:border-primary transition-all shadow-sm"
            />
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-lg flex items-center justify-center gap-4 h-12 shadow-sm">
          <span className="text-sm font-medium text-muted-foreground">Connected:</span>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            {channels.filter(c => c.status === 'connected').length} / {channels.length}
          </Badge>
        </div>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredChannels.map((channel) => (
          <Card key={channel.id} className="bg-card border shadow-sm hover:shadow-md transition-shadow rounded-xl">
            <CardContent className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {channel.provider === 'Proero' ? <Zap className="w-6 h-6" /> : <Smartphone className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg truncate">{channel.name || 'Unnamed'}</h3>
                  <p className="text-xs text-muted-foreground font-medium">{channel.phone_number || 'No Number'}</p>
                </div>
                <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0">
                  QR Code
                </Badge>
              </div>

              {/* Status Info */}
              <div className="grid grid-cols-2 gap-4 py-3 border-y">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Provider</p>
                  <p className="text-sm font-semibold">{channel.provider || 'Proero'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full", channel.status === 'connected' ? "bg-emerald-500" : "bg-orange-500")} />
                    <span className={cn("text-sm font-bold", channel.status === 'connected' ? "text-emerald-600" : "text-orange-600")}>
                      {channel.status === 'connected' ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button 
                  className="w-full font-bold h-10 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  onClick={() => handleViewQR(channel)}
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Manage & Scan
                </Button>
                
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs font-bold border border-border/50 text-muted-foreground hover:text-primary h-8 px-2"
                    onClick={() => handleSyncChannelStatus(channel.id)}
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" />
                    Sync
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold px-3 h-8 rounded-lg"
                    onClick={() => handleDeleteChannel(channel.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Connect Channel Dialog */}
      <Dialog open={isConnectOpen} onOpenChange={setIsConnectOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden border-none shadow-2xl">
          {step === 1 && (
            <div className="p-8 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  Select Provider
                </DialogTitle>
                <DialogDescription>
                  Choose a provider to connect your WhatsApp channel.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-3">
                <button 
                  onClick={() => handleProviderSelect('WAConnect')}
                  className="w-full p-4 rounded-xl border border-border/50 hover:border-emerald-500/50 hover:bg-emerald-50/50 transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-lg">WAConnect</p>
                    <p className="text-xs text-muted-foreground font-medium">Official API based connection</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => handleProviderSelect('Proero')}
                  className="w-full p-4 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-lg">Proero</p>
                      <Badge className="bg-primary/10 text-primary border-none text-[10px] h-4">UNOFFICIAL</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium">Direct QR scan based unofficial route</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="p-8 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                  <Smartphone className="w-6 h-6 text-primary" />
                  {selectedProvider}
                </DialogTitle>
                <DialogDescription>
                  Configure your {selectedProvider} channel settings.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Channel Name</Label>
                  <Input 
                    placeholder="e.g. My Business Channel" 
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    className="h-12 bg-muted/50 border-none focus-visible:ring-primary shadow-inner"
                  />
                  <p className="text-[10px] text-muted-foreground">This name is for internal identification only.</p>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button variant="ghost" onClick={() => setStep(1)} className="font-bold">Back</Button>
                <Button onClick={handleConfigSubmit} className="gradient-primary h-12 px-8 font-bold shadow-lg shadow-primary/20">
                  Connect Channel
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === 3 && (
            <div className="p-8 space-y-6">
               <div className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-64 h-64 bg-white p-4 rounded-3xl shadow-2xl border-4 border-primary/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PROERO_CONNECT_MOCK" 
                      alt="QR Code"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">Scan with WhatsApp</h3>
                    <p className="text-sm text-muted-foreground max-w-[300px]">
                      Open WhatsApp on your phone, go to Linked Devices and scan this code to connect.
                    </p>
                  </div>

                  <div className="w-full grid grid-cols-2 gap-3 pt-4">
                    <Button variant="outline" className="h-11 font-bold border-2">
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                    <Button className="h-11 font-bold gradient-primary" onClick={() => setIsConnectOpen(false)}>
                      Done
                    </Button>
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Management Modal (Simple) */}
      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="sm:max-w-[1000px] p-0 overflow-hidden border shadow-2xl rounded-xl">
          <div className="bg-background">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">{activeChannel?.name || 'Channel Settings'}</h2>
              <p className="text-sm font-mono text-muted-foreground">{activeChannel?.phone_number}</p>
            </div>

            <Tabs defaultValue="qr" className="w-full">
              <div className="px-6 py-2 border-b">
                <TabsList className="bg-muted h-10">
                  <TabsTrigger value="qr" className="font-bold">QR Code</TabsTrigger>
                  <TabsTrigger value="overview" className="font-bold">Overview</TabsTrigger>
                  {(activeChannel?.provider === 'Proero' || activeChannel?.provider === 'WAConnect') && (
                    <TabsTrigger value="developer" className="font-bold">Developer</TabsTrigger>
                  )}
                  <TabsTrigger value="settings" className="font-bold">Settings</TabsTrigger>
                </TabsList>
              </div>

              <div className="p-8">
                <TabsContent value="qr" className="m-0 flex flex-col items-center space-y-6">
                  <div className="p-4 bg-white border-2 border-primary/20 rounded-2xl shadow-xl transition-all hover:scale-[1.02]">
                    {realQRCode ? (
                      <img 
                        src={realQRCode.startsWith('data:') ? realQRCode : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(realQRCode)}`} 
                        alt="Real QR Code" 
                        className="w-64 h-64 object-contain"
                      />
                    ) : (
                      <div className="w-64 h-64 flex flex-col items-center justify-center bg-muted/50 rounded-xl gap-4">
                        <QrCode className="w-16 h-16 text-muted-foreground/30" />
                        <p className="text-xs text-muted-foreground font-bold px-4 text-center">Click below to fetch the real WhatsApp scanner</p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-4 w-full">
                    <Button 
                      className="flex-1 font-bold h-11 gradient-primary" 
                      onClick={fetchRealQR}
                      disabled={isFetchingQR}
                    >
                      {isFetchingQR ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
                      {realQRCode ? 'Refresh QR' : 'Fetch Real QR'}
                    </Button>
                    <Button variant="outline" className="flex-1 font-bold h-11" disabled={!realQRCode}>
                      <Download className="w-4 h-4 mr-2" /> Download
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest italic">
                    * This scanner connects your device to the unofficial route
                  </p>
                </TabsContent>

                <TabsContent value="overview" className="m-0 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Status</p>
                      <p className="text-lg font-bold text-emerald-600">Connected</p>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-xs font-bold text-muted-foreground uppercase">Provider</p>
                      <p className="text-lg font-bold">{activeChannel?.provider}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="developer" className="m-0">
                  <DeveloperConsole channel={activeChannel} />
                </TabsContent>
              </div>
            </Tabs>
            <div className="p-4 border-t bg-muted/10 flex justify-end">
              <Button variant="ghost" onClick={() => setIsQRModalOpen(false)} className="font-bold">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <label className={`block ${className}`}>{children}</label>;
}
