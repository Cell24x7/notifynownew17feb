import { useState, useEffect } from 'react';
import api from '../config/axios';
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
  FileText
} from 'lucide-react';
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
          <Card key={channel.id} className="group relative overflow-hidden bg-white border-slate-200/60 hover:shadow-2xl transition-all duration-500 rounded-[24px]">
            <CardContent className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner",
                  channel.provider === 'Proero' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
                )}>
                  {channel.provider === 'Proero' ? <Zap className="w-6 h-6 fill-current" /> : <Smartphone className="w-6 h-6" />}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-lg text-slate-800 leading-none truncate tracking-tight">{channel.name || 'Unnamed'}</h3>
                    <Badge variant="secondary" className="bg-amber-100/50 text-amber-700 hover:bg-amber-100/50 border-none text-[9px] font-black tracking-widest px-2 py-0.5 uppercase">
                       ● QR Code
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 font-bold tracking-tight">{channel.phone_number || '91xxxxxxxxxx'}</p>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                <div className="space-y-0.5">
                  <p className="text-[9px] uppercase font-black text-slate-300 tracking-widest">Provider</p>
                  <p className="text-sm font-black text-slate-700">{channel.provider || 'Proero'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] uppercase font-black text-slate-300 tracking-widest">Status</p>
                  <div className="flex items-center gap-1.5">
                    <div className={cn("h-2 w-2 rounded-full", channel.status === 'connected' ? "bg-emerald-500 animate-pulse" : "bg-orange-400")} />
                    <span className={cn("text-sm font-black tracking-tight", channel.status === 'connected' ? "text-emerald-600" : "text-orange-500")}>
                      {channel.status === 'connected' ? 'Connected' : 'Warning'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full h-12 rounded-2xl border-slate-100 hover:bg-slate-50 text-slate-600 font-black text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                  onClick={() => handleViewQR(channel)}
                >
                  <FileText className="w-4 h-4" />
                  View Logs
                </Button>
                
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-slate-300">
                     <History className="w-4 h-4" />
                     <span className="text-[10px] font-black uppercase tracking-wider">{channel.created ? new Date(channel.created).toLocaleDateString() : '5/13/2026'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-300 hover:text-amber-500 hover:bg-amber-50">
                      <Zap className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-slate-300 hover:text-blue-500 hover:bg-blue-50">
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50"
                      onClick={() => handleDeleteChannel(channel.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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

      {/* QR Management Modal (Based on Screenshot) */}
      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="sm:max-w-[620px] w-[95vw] p-0 overflow-hidden border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[40px] bg-[#f8fafc]">
          <div className="">
            {/* Modal Header */}
            <div className="p-10 pb-6 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm border border-rose-100/50">
                  <Zap className="w-7 h-7 fill-current" />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-none">{activeChannel?.name || 'sandy'}</h2>
                  <p className="text-sm text-slate-400 font-bold mt-2">
                    Manage channel settings and view health
                  </p>
                </div>
              </div>
              <p className="text-sm font-mono font-black text-slate-300">
                {activeChannel?.phone_number || '91xxxxxxxxxx'}
              </p>
            </div>

            {/* Modal Tabs */}
            <Tabs defaultValue="advanced" className="w-full">
              <div className="px-10 py-2">
                <TabsList className="bg-slate-200/40 p-1.5 rounded-[22px] h-16 w-full flex gap-1.5 backdrop-blur-md">
                  <TabsTrigger value="overview" className="flex-1 rounded-[16px] gap-2 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-lg transition-all text-slate-400">
                    <History className="w-4 h-4" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="status" className="flex-1 rounded-[16px] gap-2 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-lg transition-all text-slate-400">
                    <ShieldCheck className="w-4 h-4" /> Status
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="flex-1 rounded-[16px] gap-2 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-lg transition-all text-slate-400">
                    <Terminal className="w-4 h-4" /> Advanced
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="flex-1 rounded-[16px] gap-2 font-black text-[11px] uppercase tracking-wider data-[state=active]:bg-white data-[state=active]:text-slate-800 data-[state=active]:shadow-lg transition-all text-slate-400">
                    <Settings2 className="w-4 h-4" /> Tools
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-10 pt-4 pb-12">
                <TabsContent value="advanced" className="m-0 space-y-6 animate-in zoom-in-95 duration-500">
                  <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
                     <div className="space-y-1 mb-8 relative z-10">
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">QR Code Management</h3>
                        <p className="text-sm text-slate-400 font-bold">View or download the QR code to scan with WhatsApp</p>
                     </div>

                     <div className="flex flex-col items-center justify-center py-12 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200 relative z-10">
                        <div className="w-72 h-72 bg-white p-8 rounded-[32px] shadow-2xl border-slate-50 mb-10 relative group transition-transform hover:scale-[1.02]">
                           <img 
                            src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=PROERO_MANAGEMENT_MOCK" 
                            alt="Channel QR"
                            className="w-full h-full object-contain"
                          />
                        </div>

                        <div className="flex items-center gap-4 w-full px-12">
                           <Button className="flex-1 h-16 bg-[#10b981] hover:bg-[#059669] text-white font-black rounded-2xl shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] text-lg transition-all active:scale-95">
                             <QrCode className="w-6 h-6 mr-3" /> View QR
                           </Button>
                           <Button variant="outline" className="flex-1 h-16 font-black rounded-2xl border-2 border-slate-200 text-slate-600 hover:bg-white hover:border-slate-300 text-lg transition-all active:scale-95 bg-transparent">
                             <Download className="w-6 h-6 mr-3" /> Download
                           </Button>
                        </div>
                     </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="overview" className="m-0 space-y-8 animate-in slide-in-from-bottom-10 duration-500">
                    <div className="grid grid-cols-2 gap-6">
                       <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Provider</p>
                          <p className="text-2xl font-black text-slate-800">{activeChannel?.provider || 'WAConnect'}</p>
                       </div>
                       <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status</p>
                          <p className="text-2xl font-black text-emerald-500">Connected</p>
                       </div>
                    </div>
                    
                    <div className="bg-white p-10 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                       <div className="flex items-center justify-between">
                          <h4 className="font-black text-slate-800 flex items-center gap-2">
                             <History className="w-5 h-5 text-rose-500" /> Recent Activity
                          </h4>
                          <Badge variant="outline" className="rounded-full font-black text-[9px] uppercase tracking-widest">Live Updates</Badge>
                       </div>
                       <div className="space-y-4">
                          {[1,2].map(i => (
                            <div key={i} className="flex items-center justify-between p-5 rounded-[20px] bg-slate-50/50 border border-slate-100 text-xs">
                               <div className="flex items-center gap-4">
                                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                  <span className="font-black text-slate-600 uppercase tracking-tight">Session refreshed successfully</span>
                               </div>
                               <span className="text-slate-400 font-bold">{i*2} hours ago</span>
                            </div>
                          ))}
                       </div>
                    </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
  return <label className={`block ${className}`}>{children}</label>;
}
