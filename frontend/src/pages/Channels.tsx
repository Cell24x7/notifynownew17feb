import { useState } from 'react';
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
  Terminal
} from 'lucide-react';
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
  const [channels, setChannels] = useState(initialChannels);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Select Provider, 2: Config, 3: QR
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('');
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<any>(null);

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.number.includes(searchQuery)
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
    if (!channelName) {
      toast.error("Please enter a channel name");
      return;
    }
    setStep(3);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChannels.map((channel) => (
          <Card key={channel.id} className="group relative overflow-hidden border-border/50 hover:border-primary/50 transition-all hover:shadow-xl hover:-translate-y-1 duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem className="cursor-pointer">
                    <Settings2 className="w-4 h-4 mr-2" /> Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer text-red-500 hover:text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <CardContent className="p-6 space-y-6">
              {/* Channel Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                  {channel.icon}
                </div>
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg leading-none">{channel.name}</h3>
                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0">
                       ● QR Code
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{channel.number}</p>
                </div>
              </div>

              {/* Status & Provider */}
              <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/30">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Provider</p>
                  <p className="text-sm font-semibold">{channel.provider}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Status</p>
                  <div className="flex items-center gap-1.5">
                    {channel.status === 'connected' ? (
                      <>
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-sm font-semibold text-emerald-600 italic">Active</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-semibold text-orange-500">Warning</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase text-muted-foreground font-bold">Created</span>
                  <span className="text-xs font-medium">{channel.created}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleViewQR(channel)}
                  className="text-primary hover:text-primary hover:bg-primary/5 font-semibold text-xs h-8"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  View Logs
                </Button>
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
        <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <div className="bg-card">
            {/* Modal Header */}
            <div className="p-6 flex items-center justify-between border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold leading-none">{activeChannel?.name}</h2>
                  <p className="text-xs text-muted-foreground font-medium mt-1">
                    Manage channel settings, view health, and access advanced features
                  </p>
                </div>
              </div>
              <p className="text-xs font-mono font-bold text-muted-foreground">
                {activeChannel?.number}
              </p>
            </div>

            {/* Modal Tabs */}
            <Tabs defaultValue="advanced" className="w-full">
              <div className="px-6 py-2 border-b">
                <TabsList className="bg-transparent h-12 w-full justify-start gap-4">
                  <TabsTrigger value="overview" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary rounded-lg gap-2 font-bold px-4">
                    <Info className="w-4 h-4" /> Overview
                  </TabsTrigger>
                  <TabsTrigger value="status" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary rounded-lg gap-2 font-bold px-4">
                    <ShieldCheck className="w-4 h-4" /> Status
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary rounded-lg gap-2 font-bold px-4 border-2 border-transparent data-[state=active]:border-primary/20">
                    <Terminal className="w-4 h-4" /> Advanced
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="data-[state=active]:bg-primary/5 data-[state=active]:text-primary rounded-lg gap-2 font-bold px-4">
                    <Settings2 className="w-4 h-4" /> Tools
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-8 min-h-[400px]">
                <TabsContent value="advanced" className="m-0 space-y-8 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold">QR Code Management</h3>
                    <p className="text-sm text-muted-foreground font-medium">View or download the QR code to scan with WhatsApp</p>
                  </div>

                  <div className="flex flex-col items-center justify-center py-8 bg-muted/10 rounded-3xl border-2 border-dashed border-border/50">
                    <div className="w-56 h-56 bg-white p-6 rounded-2xl shadow-xl border-border/20 mb-8 relative group">
                       <img 
                        src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=PROERO_MANAGEMENT_MOCK" 
                        alt="Channel QR"
                        className="w-full h-full"
                      />
                      <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <Button variant="secondary" size="sm" className="font-bold">
                           <RefreshCw className="w-4 h-4 mr-2" /> Refresh
                         </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-lg shadow-emerald-600/20">
                         <QrCode className="w-4 h-4 mr-2" /> View QR
                       </Button>
                       <Button variant="outline" className="font-bold px-8 border-2">
                         <Download className="w-4 h-4 mr-2" /> Download
                       </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="overview" className="m-0 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       <Card className="bg-muted/20 border-none shadow-none">
                          <CardContent className="p-4 space-y-2">
                             <p className="text-xs font-bold text-muted-foreground uppercase">Messages Sent</p>
                             <p className="text-2xl font-bold">12,458</p>
                          </CardContent>
                       </Card>
                       <Card className="bg-muted/20 border-none shadow-none">
                          <CardContent className="p-4 space-y-2">
                             <p className="text-xs font-bold text-muted-foreground uppercase">Success Rate</p>
                             <p className="text-2xl font-bold text-emerald-600">98.2%</p>
                          </CardContent>
                       </Card>
                    </div>
                    <div className="space-y-4">
                       <h4 className="font-bold text-sm flex items-center gap-2">
                         <History className="w-4 h-4 text-primary" /> Recent Activity
                       </h4>
                       <div className="space-y-3">
                          {[1,2,3].map(i => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/50 text-xs">
                               <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="font-medium">Session refreshed successfully</span>
                               </div>
                               <span className="text-muted-foreground">2 hours ago</span>
                            </div>
                          ))}
                       </div>
                    </div>
                </TabsContent>
              </div>
            </Tabs>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-muted/10 flex justify-end px-8">
               <Button variant="ghost" onClick={() => setIsQRModalOpen(false)} className="font-bold">Close Window</Button>
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
