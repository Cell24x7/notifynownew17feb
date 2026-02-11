import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Edit2, 
  Eye, 
  Loader2, 
  Database,
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
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { rcsApi } from '@/services/rcsApi';
import { cn } from '@/lib/utils';

interface Bot {
  id: string;
  bot_name: string;
  brand_name: string;
  short_description: string;
  bot_type: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'SUSPENDED';
  message_type: string;
  languages_supported: string;
  bot_logo_url?: string;
  brand_color?: string;
  created_at: string;
  submission_date?: string;
}

interface RCSBotsListProps {
  onUpdate?: () => void;
}

export function RCSBotsList({ onUpdate }: RCSBotsListProps) {
  const { toast } = useToast();
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom scroll and drag functionality
  const internalScrollRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Dialog states
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Bot>>({});

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    setIsLoading(true);
    try {
      const allBots = await rcsApi.getAllBots();
      setBots(allBots);
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to fetch bot configurations.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bot configuration?')) return;
    try {
      await rcsApi.deleteBot(id);
      toast({ title: 'Deleted', description: 'Bot configuration deleted successfully.' });
      fetchBots();
      onUpdate?.();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete bot.', variant: 'destructive' });
    }
  };

  const handleView = (bot: Bot) => {
    setSelectedBot(bot);
    setIsViewOpen(true);
  };

  const handleEdit = (bot: Bot) => {
    setSelectedBot(bot);
    setEditForm({ ...bot });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedBot) return;
    setIsUpdating(true);
    try {
      await rcsApi.updateBot(selectedBot.id, editForm);
      toast({ title: 'Success', description: 'Bot updated successfully.' });
      setIsEditOpen(false);
      fetchBots();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update bot.', variant: 'destructive' });
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
      case 'DRAFT': return 'bg-gray-200 text-gray-800';
      case 'SUBMITTED': return 'bg-blue-200 text-blue-800';
      case 'APPROVED': return 'bg-green-200 text-green-800';
      case 'REJECTED': return 'bg-red-200 text-red-800';
      case 'ACTIVE': return 'bg-emerald-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'OTP': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'TRANSACTIONAL': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PROMOTIONAL': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-500">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">RCS Bot Configurations</h2>
            <p className="text-sm text-muted-foreground">Manage and track your official RCS business bots</p>
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
          <Button onClick={fetchBots} disabled={isLoading} variant="outline" size="sm" className="h-10">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh Data'}
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium text-muted-foreground">Syncing bot data...</p>
          </CardContent>
        </Card>
      ) : bots.length === 0 ? (
        <Card className="border-dashed bg-muted/30">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
               <Database className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No RCS Bots Found</h3>
            <p className="text-sm text-muted-foreground max-w-[280px] mt-1">
              You haven't configured any RCS bots yet. Build your first bot to get started.
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
            <table className="w-full text-sm border-collapse min-w-[1100px]">
              <thead>
                <tr className="bg-muted/30 border-b">
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">ID & Date</th>
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Bot Information</th>
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Brand</th>
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Description</th>
                  <th className="px-6 py-4 text-left font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Message Type</th>
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
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center overflow-hidden border border-border/50 group-hover/row:scale-105 transition-transform duration-300">
                          {bot.bot_logo_url ? (
                            <img src={bot.bot_logo_url} alt="logo" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">{bot.bot_name.charAt(0)}</span>
                          )}
                        </div>
                        <div className="font-bold text-foreground text-sm tracking-tight">{bot.bot_name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-5 font-semibold text-muted-foreground">{bot.brand_name}</td>
                    <td className="px-6 py-5 text-muted-foreground max-w-[300px]">
                      <div className="line-clamp-2 text-xs leading-relaxed" title={bot.short_description}>
                        {bot.short_description}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <Badge variant="outline" className={cn("px-2 py-0.5 text-[10px] border", getMessageTypeColor(bot.message_type))}>
                        {bot.message_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-5">
                      <Badge className={cn("px-2 py-0.5 text-[10px] font-bold shadow-sm", getStatusColor(bot.status))}>
                        {bot.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 sticky right-0 bg-background/90 backdrop-blur-md group-hover/row:bg-muted/10 transition-colors z-20 border-l shadow-[-12px_0_20px_-15px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 rounded-xl"
                          onClick={() => handleView(bot)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-9 w-9 text-muted-foreground hover:text-purple-500 hover:bg-purple-50 rounded-xl"
                          onClick={() => handleEdit(bot)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(bot.id)}
                          className="h-9 w-9 text-muted-foreground hover:bg-red-50 hover:text-red-600 rounded-xl"
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
          
          {/* Scroll progress gradient indicators */}
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none opacity-40" />
        </div>
      )}

      {/* Stats Dashboard section */}
      {bots.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Active Bots', val: bots.length, color: 'text-primary', bg: 'bg-primary/5' },
            { label: 'Pending Drafts', val: bots.filter(b => b.status === 'DRAFT').length, color: 'text-muted-foreground', bg: 'bg-muted/50' },
            { label: 'Approved Bots', val: bots.filter(b => b.status === 'APPROVED' || b.status === 'ACTIVE').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Awaiting Submission', val: bots.filter(b => b.status === 'SUBMITTED').length, color: 'text-blue-600', bg: 'bg-blue-50' }
          ].map((stat, i) => (
            <Card key={i} className="border-none shadow-sm overflow-hidden">
               <CardContent className={cn("p-6", stat.bg)}>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                 <div className={cn("text-3xl font-black", stat.color)}>{stat.val}</div>
               </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-500" />
              Bot Details
            </DialogTitle>
            <DialogDescription>
              In-depth view of the selected RCS Bot configuration.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-full max-h-[60vh] pr-4">
            {selectedBot && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Bot Name</Label>
                    <p className="font-semibold">{selectedBot.bot_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Brand Name</Label>
                    <p className="font-semibold">{selectedBot.brand_name}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Status</Label>
                    <div>
                      <Badge className={cn("font-bold", getStatusColor(selectedBot.status))}>
                        {selectedBot.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Message Type</Label>
                    <div>
                      <Badge variant="outline" className={getMessageTypeColor(selectedBot.message_type)}>
                        {selectedBot.message_type}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] uppercase text-muted-foreground">Description</Label>
                  <p className="text-sm border p-3 rounded-lg bg-muted/20 leading-relaxed italic">
                    "{selectedBot.short_description}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Bot Type</Label>
                    <p className="text-sm font-medium">{selectedBot.bot_type}</p>
                   </div>
                   <div className="space-y-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Languages</Label>
                    <p className="text-sm font-medium">{selectedBot.languages_supported}</p>
                   </div>
                </div>

                {selectedBot.bot_logo_url && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase text-muted-foreground">Bot Logo</Label>
                    <div className="w-24 h-24 rounded-xl overflow-hidden border">
                      <img src={selectedBot.bot_logo_url} alt="Logo" className="w-full h-full object-cover" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
            <Button onClick={() => { setIsViewOpen(false); handleEdit(selectedBot!); }}>Edit Configuration</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-purple-500" />
              Edit Bot Configuration
            </DialogTitle>
            <DialogDescription>
              Modify the existing bot settings. Some fields may require re-approval.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-full max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-bot-name">Bot Name</Label>
                  <Input 
                    id="edit-bot-name" 
                    value={editForm.bot_name || ''} 
                    onChange={(e) => setEditForm({...editForm, bot_name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-brand-name">Brand Name</Label>
                  <Input 
                    id="edit-brand-name" 
                    value={editForm.brand_name || ''} 
                    onChange={(e) => setEditForm({...editForm, brand_name: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-desc">Short Description</Label>
                <Textarea 
                  id="edit-desc" 
                  value={editForm.short_description || ''} 
                  onChange={(e) => setEditForm({...editForm, short_description: e.target.value})}
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <Label htmlFor="edit-languages">Languages Supported</Label>
                    <Input 
                      id="edit-languages" 
                      value={editForm.languages_supported || ''} 
                      onChange={(e) => setEditForm({...editForm, languages_supported: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="edit-status">Status (Preview Only)</Label>
                    <Input 
                      id="edit-status" 
                      value={editForm.status || ''} 
                      disabled
                      className="bg-muted"
                    />
                 </div>
              </div>
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
