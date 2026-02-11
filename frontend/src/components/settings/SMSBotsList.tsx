import { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Edit2, 
  Eye, 
  Loader2, 
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Save,
  X
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';
import axios from 'axios';
import { useEffect } from 'react';

interface SMSBot {
  id: string;
  channelName: string;
  defaultSenderId: string;
  country: string;
  messageType: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  created_at: string;
  apiBaseUrl?: string;
  apiKey?: string;
  costPerSms?: string;
  authType?: string;
  enableLongSms?: number; 
  autoTrim?: number;
  initialCreditLimit?: string;
}

interface SMSBotsListProps {
  onUpdate?: () => void;
}

export function SMSBotsList({ onUpdate }: SMSBotsListProps) {
  const { toast } = useToast();
  const [bots, setBots] = useState<SMSBot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Custom scroll and drag functionality
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Dialog states
  const [selectedBot, setSelectedBot] = useState<SMSBot | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<SMSBot>>({});
  const fetchBots = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/sms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // Map DB fields to UI fields if necessary, currently they match roughly but observe casing
        const mappedBots = response.data.channels.map((ch: any) => ({
             id: ch.id,
             channelName: ch.channel_name,
             defaultSenderId: ch.default_sender_id,
             country: ch.country,
             messageType: ch.message_type,
             status: ch.status?.toUpperCase() || 'ACTIVE',
             created_at: ch.created_at,
             apiBaseUrl: ch.api_base_url,
             costPerSms: ch.cost_per_sms,
             apiKey: ch.api_key
        }));
        setBots(mappedBots);
      }
    } catch (error) {
      console.error('Fetch SMS bots error:', error);
      toast({ title: 'Error', description: 'Failed to load SMS channels.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const refreshBots = () => {
    fetchBots();
    toast({ title: 'Refreshed', description: 'SMS channel list updated.' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this SMS channel?')) return;
    try {
        const token = localStorage.getItem('authToken');
        await axios.delete(`${API_BASE_URL}/api/sms/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        setBots(bots.filter(b => b.id !== id));
        toast({ title: 'Deleted', description: 'SMS channel deleted successfully.' });
        onUpdate?.();
    } catch (error) {
        console.error('Delete SMS bot error:', error);
        toast({ title: 'Error', description: 'Failed to delete channel.', variant: 'destructive' });
    }
  };

  const handleView = (bot: SMSBot) => {
    setSelectedBot(bot);
    setIsViewOpen(true);
  };

  const handleEdit = (bot: SMSBot) => {
    setSelectedBot(bot);
    setEditForm({ ...bot });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedBot) return;
    setIsUpdating(true);
    
    try {
        const token = localStorage.getItem('authToken');
        // Send all fields from editForm
        // Backend now handles partial updates with COALESCE
        const { id, created_at, ...updateData } = editForm as any;

        const response = await axios.put(`${API_BASE_URL}/api/sms/${selectedBot.id}`, updateData, {
             headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
            setBots(bots.map(b => b.id === selectedBot.id ? { ...b, ...editForm } as SMSBot : b));
            setIsEditOpen(false);
            toast({ title: 'Success', description: 'Channel updated successfully.' });
        }
    } catch (error) {
        console.error('Update SMS bot error:', error);
        toast({ title: 'Error', description: 'Failed to update channel.', variant: 'destructive' });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (internalScrollRef.current) {
      const scrollAmount = 300;
      internalScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!internalScrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - internalScrollRef.current.offsetLeft);
    setScrollLeft(internalScrollRef.current.scrollLeft);
  };

  const onMouseUp = () => setIsDragging(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !internalScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - internalScrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    internalScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500 text-white';
      case 'INACTIVE': return 'bg-gray-200 text-gray-800';
      case 'PENDING': return 'bg-amber-100 text-amber-800';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/20">
            <MessageSquare className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Configured SMS Channels</h2>
            <p className="text-sm text-muted-foreground">Manage your connected SMS gateways</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border/50">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleScroll('left')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="w-[1px] h-4 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleScroll('right')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={refreshBots} disabled={isLoading} variant="outline" size="sm" className="h-10">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Loading channels...</p>
          </CardContent>
        </Card>
      ) : bots.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
               <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No SMS Channels Found</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mt-1">
              You haven't configured any SMS channels yet. Click 'Create' to add one.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative group">
          <div 
            ref={internalScrollRef}
            className={cn(
              "w-full overflow-x-auto rounded-2xl border bg-card shadow-lg shadow-black/5 scroll-smooth",
              "scrollbar-hide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
              isDragging ? "cursor-grabbing" : "cursor-grab"
            )}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onMouseMove={onMouseMove}
          >
            <table className="w-full text-sm border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Date Created</th>
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Channel Name</th>
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Sender ID</th>
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Country</th>
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Type</th>
                  <th className="px-4 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Status</th>
                  <th className="px-6 py-4 text-center font-bold text-muted-foreground uppercase tracking-wider text-[10px] sticky right-0 bg-muted/30 border-l">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bots.map((bot) => (
                  <tr key={bot.id} className="group/row hover:bg-muted/20 transition-all duration-200">
                    <td className="px-6 py-5">
                       <div className="font-mono text-[11px] font-bold text-primary">#{bot.id}</div>
                       <div className="text-[10px] text-muted-foreground mt-0.5">{new Date(bot.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-foreground text-sm tracking-tight">{bot.channelName}</div>
                    </td>
                    <td className="px-6 py-5 font-mono text-xs">{bot.defaultSenderId}</td>
                    <td className="px-6 py-5">{bot.country}</td>
                    <td className="px-6 py-5">
                      <Badge variant="outline" className="px-2 py-0.5 text-[10px]">
                        {bot.messageType}
                      </Badge>
                    </td>
                    <td className="px-4 py-5">
                      <Badge className={cn("px-2 py-0.5 text-[10px] font-bold shadow-sm", getStatusColor(bot.status))}>
                        {bot.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 sticky right-0 bg-background/90 backdrop-blur-md group-hover/row:bg-muted/10 transition-colors z-20 border-l">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                          onClick={() => handleView(bot)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 text-muted-foreground hover:text-purple-500 hover:bg-purple-50 rounded-lg"
                          onClick={() => handleEdit(bot)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(bot.id)}
                          className="h-8 w-8 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none opacity-40" />
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Channel Details
            </DialogTitle>
            <DialogDescription>
                Configuration details for {selectedBot?.channelName}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {selectedBot && (
              <div className="space-y-4 py-2">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <Label className="text-xs text-muted-foreground">Status</Label>
                        <div className="mt-1">
                             <Badge className={getStatusColor(selectedBot.status)}>{selectedBot.status}</Badge>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">Created At</Label>
                        <div className="mt-1 font-medium">{new Date(selectedBot.created_at).toLocaleDateString()}</div>
                    </div>
                 </div>
                 
                 <div className="space-y-3 pt-2">
                    <div>
                        <Label className="text-xs text-muted-foreground">Sender ID</Label>
                        <div className="font-mono text-sm bg-muted p-2 rounded border mt-1">{selectedBot.defaultSenderId}</div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">API Base URL</Label>
                        <div className="font-mono text-xs bg-muted p-2 rounded border mt-1 truncate">{selectedBot.apiBaseUrl}</div>
                    </div>
                     <div>
                        <Label className="text-xs text-muted-foreground">Cost Per SMS</Label>
                        <div className="font-medium mt-1">₹{selectedBot.costPerSms}</div>
                    </div>
                 </div>
              </div>
            )}
          </ScrollArea>
           <div className="flex justify-end gap-2">
             <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
           </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-purple-500" />
              Edit Channel
            </DialogTitle>
             <DialogDescription>Update settings for {selectedBot?.channelName}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Channel Name</Label>
              <Input 
                value={editForm.channelName || ''} 
                onChange={(e) => setEditForm({...editForm, channelName: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Default Sender ID</Label>
              <Input 
                value={editForm.defaultSenderId || ''} 
                onChange={(e) => setEditForm({...editForm, defaultSenderId: e.target.value})}
              />
            </div>
             <div className="space-y-2">
              <Label>Cost Per SMS</Label>
              <Input 
                 type="number"
                 step="0.01"
                value={editForm.costPerSms || ''} 
                onChange={(e) => setEditForm({...editForm, costPerSms: e.target.value})}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
