import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Calendar, Send, Pause, Play, MoreVertical, BarChart3, LayoutGrid, List, Edit, Copy, Trash2, Eye, Zap, Users, FileText, Clock, TrendingUp, Target, Sparkles, X, Image, Video, File as FileIcon, Phone, Link, MessageSquare, Smartphone, ChevronRight, ChevronLeft, Check, ChevronsUpDown, IndianRupee, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChannelBadge } from '@/components/ui/channel-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { audienceSegments, type Channel, type TemplateChannel, type HeaderType } from '@/lib/mockData';
import { campaignService, type Campaign } from '@/services/campaignService';
import { templateService, type MessageTemplate } from '@/services/templateService';
import { contactService } from '@/services/contactService';
import { format } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import CampaignCreationStepper, { type CampaignData } from '@/components/campaigns/CampaignCreationStepper';
import { SMSCampaignDialog } from '@/components/campaigns/SMSCampaignDialog';
import { WhatsAppCampaignDialog } from '@/components/campaigns/WhatsAppCampaignDialog';
import { RCSTemplateForm } from '@/components/campaigns/RCSTemplateForm';
import { rcsTemplatesService, useRCSTemplates } from '@/services/rcsTemplatesService';
import { rcsCampaignApi } from '@/services/rcsCampaignApi';
import { whatsappService } from '@/services/whatsappService';
import { useAuth } from '@/contexts/AuthContext';

// Date range presets for analytics
const dateRangePresets = ['Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'];

export default function Campaigns() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const { syncTemplate } = useRCSTemplates();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const enabledChannels = user?.channels_enabled || [];

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    fetchData();
    if (!user) {
      refreshUser();
    }
  }, [user?.id, page]); // Re-fetch when user identity is established or page changes

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData();
        refreshUser();
      }, 5000); // 5 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Refresh user to get latest wallet balance and custom pricing
      await refreshUser();

      const [campaignsRes, templatesRes] = await Promise.all([
        campaignService.getCampaigns(page),
        templateService.getTemplates()
      ]);
      
      setCampaigns(campaignsRes.campaigns);
      setTotalPages(campaignsRes.pagination.totalPages);
      setTotalItems(campaignsRes.pagination.total);
      
      const templatesData = templatesRes.templates;

      // Fetch external RCS templates if channel enabled
      let mergedTemplates = [...templatesData];

      // Use local user object if available, otherwise check if rcs is likely enabled
      const isRcsEnabled = enabledChannels.includes('rcs') || user?.channels_enabled?.includes('rcs');

      if (isRcsEnabled) {
        try {
          const externalRcsData = await rcsCampaignApi.getExternalTemplates();
          const externalRcsList = externalRcsData?.templates || [];

          if (Array.isArray(externalRcsList)) {
            const mappedExternal = externalRcsList.map((t: any) => {
              const type = (t.type || t.templateType || 'text_message') as any;
              let body = t.textMessageContent || t.fallbackText || '';
              const meta: any = {};

              if (type === 'rich_card' && t.standAlone) {
                body = t.standAlone.cardDescription || body;
                meta.cardTitle = t.standAlone.cardTitle;
                meta.mediaUrl = t.standAlone.mediaUrl;
              } else if (type === 'carousel' && t.carouselList) {
                body = t.carouselList[0]?.cardDescription || body;
                meta.carouselList = t.carouselList.map((c: any) => ({
                  title: c.cardTitle,
                  description: c.cardDescription,
                  mediaUrl: c.mediaUrl
                }));
              }

              return {
                id: String(t.name || t.TemplateName || t.id),
                name: String(t.name || t.TemplateName || t.id),
                channel: 'rcs' as const,
                status: 'approved' as any,
                template_type: type,
                body: body,
                metadata: meta,
                isExternal: true
              };
            });

            const other = mergedTemplates.filter(p => p.channel !== 'rcs');
            const localRcs = mergedTemplates.filter(p => p.channel === 'rcs');
            const reconciled: MessageTemplate[] = [];

            localRcs.forEach(local => {
              const live = mappedExternal.find(t => t.name === local.name);
              if (live) {
                // If we have local body and it's not "External Template", preserve it unless live has real content
                const useLocalBody = local.body && local.body !== 'External Template';
                const liveHasBody = live.body && live.body !== 'External Template';

                reconciled.push({
                  ...local,
                  ...live,
                  id: local.id,
                  body: (useLocalBody && !liveHasBody) ? local.body : live.body,
                  metadata: (local.metadata && Object.keys(local.metadata).length > 0 && (!live.metadata || Object.keys(live.metadata).length === 0)) ? local.metadata : live.metadata
                });
              } else {
                reconciled.push(local);
              }
            });

            mappedExternal.forEach(external => {
              if (!localRcs.some(l => l.name === external.name)) {
                reconciled.push(external as any);
              }
            });

            mergedTemplates = [...other, ...reconciled];
          }
        } catch (rcsErr) {
          console.error('Failed to fetch external RCS templates:', rcsErr);
        }
      }

      const isWhatsappEnabled = enabledChannels.includes('whatsapp') || user?.channels_enabled?.includes('whatsapp');
      if (isWhatsappEnabled) {
        try {
          const waData = await whatsappService.getTemplates();
          const waList = waData?.templates || [];
          if (Array.isArray(waList)) {
            const mappedWa = waList.map((t: any) => {
              const bodyComponent = t.components?.find((c: any) => c.type === 'BODY');
                return {
                  id: String(t.name || t.id),
                  name: String(t.name || t.id),
                  channel: 'whatsapp' as const,
                  status: (t.status?.toLowerCase() === 'approved' ? 'approved' : 'pending') as any,
                  template_type: (t.category || 'text_message') as any,
                  body: bodyComponent?.text || '',
                  metadata: {
                    components: t.components,
                    language: t.language,
                    category: t.category
                  },
                  isExternal: true
                };
            });

            // Reconciliation logic similar to Templates.tsx
            const other = mergedTemplates.filter(p => p.channel !== 'whatsapp');
            const localWa = mergedTemplates.filter(p => p.channel === 'whatsapp');
            const reconciled: MessageTemplate[] = [];

            localWa.forEach(local => {
              const live = mappedWa.find(t => t.name === local.name);
              if (live) {
                reconciled.push({ ...local, ...live, id: local.id });
              } else {
                reconciled.push(local);
              }
            });

            mappedWa.forEach(external => {
              if (!localWa.some(l => l.name === external.name)) {
                reconciled.push(external as any);
              }
            });

            mergedTemplates = [...other, ...reconciled];
          }
        } catch (waErr) {
          console.error('Failed to fetch WhatsApp templates:', waErr);
        }
      }

      setTemplates(mergedTemplates);


    } catch (err) {
      console.error('Error fetching data:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Campaign creation state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    channel: 'whatsapp' as const,
    templateId: '',
    audienceId: '',
    scheduleType: 'now' as 'now' | 'scheduled',
    scheduledDate: '',
    scheduledTime: '',
  });

  // Campaign analytics modal
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const currentCampaign = useMemo(() => {
    if (!selectedCampaign) return null;
    return campaigns.find(c => c.id === selectedCampaign.id) || selectedCampaign;
  }, [campaigns, selectedCampaign]);

  // SMS Specific Dialog
  const [isSmsDialogOpen, setIsSmsDialogOpen] = useState(false);
  const [isWhatsappDialogOpen, setIsWhatsappDialogOpen] = useState(false);

  const filteredCampaigns = (campaigns || []).filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCampaignComplete = async (campaignData: CampaignData) => {
    try {
      // 1. Create Base Campaign (Draft)
      // We create the campaign first to get an ID for uploading contacts
      const selectedTpl = templates.find(t => t.id === campaignData.templateId);
      
      const campaignPayload = {
        name: campaignData.name,
        channel: campaignData.channel,
        template_id: campaignData.templateId,
        template_name: selectedTpl?.name, // Send the name!
        template_metadata: selectedTpl?.metadata, // New snapshot
        template_body: selectedTpl?.body, // New snapshot
        template_type: selectedTpl?.template_type, // New snapshot
        audience_id: campaignData.audienceId || undefined,
        recipient_count: (campaignData.contactSource === 'existing' && campaignData.scheduleType === 'scheduled') 
          ? campaignData.recipientCount 
          : 0,
        status: 'draft' as any, // Start as draft, update later if 'now'
        scheduled_at: campaignData.scheduleType === 'scheduled'
          ? `${campaignData.scheduledDate}T${campaignData.scheduledTime}`
          : undefined,
        variable_mapping: campaignData.fieldMapping // Map field mapping to backend
      };

      const createRes = await campaignService.createCampaign(campaignPayload);
      const campaignId = createRes.campaignId;

      if (!campaignId) throw new Error('Failed to create campaign record');

      let isLargeCampaign = false;

      // 2. Handle Contacts Logic
      if (campaignData.contactSource === 'upload' && campaignData.uploadedFile) {
        isLargeCampaign = true;
        toast({ title: 'Uploading Contacts', description: 'Streaming file to server...' });
        await campaignService.uploadContacts(campaignId, campaignData.uploadedFile);
        toast({ title: 'Contacts Uploaded', description: 'File processed successfully.' });

      } else if (campaignData.contactSource === 'manual') {
        // Parse manual numbers
        const mobileNumbers = campaignData.manualNumbers
          .split(/[\n,\s]+/)
          .map(n => n.trim())
          .filter(n => n !== '')
          .map(n => parseInt(n.replace(/\D/g, '')))
          .filter(n => !isNaN(n));

        if (mobileNumbers.length > 50) {
          isLargeCampaign = true;
          // Convert to CSV Blob for upload
          const csvContent = "phone\n" + mobileNumbers.join("\n");
          const blob = new Blob([csvContent], { type: 'text/csv' });
          const file = new File([blob], "manual_upload.csv", { type: "text/csv" });

          toast({ title: 'Uploading Contacts', description: `Processing ${mobileNumbers.length} numbers...` });
          await campaignService.uploadContacts(campaignId, file);
        } else {
          // Small batch - proceed with legacy/immediate flow handled by backend or frontend API
          // Actually, since we already created the campaign, we should probably upload these too 
          // OR send them in the start command if the API supports it.
          // But my start command only creates... actually startCampaign uses /rcs/send-campaign.
          // Let's just upload them too for consistency if > 0? 
          // Or keep legacy flow?
          // To be safe and compliant with new backend logic (which checks queue), let's upload even small batches 
          // OR use the legacy flow passing 'contacts' array to startCampaign.
          // We will pass contacts array to startCampaign for small batches.
        }
      }

      // 3. Trigger Sending (if Now)
      if (campaignData.scheduleType === 'now') {
        if (isLargeCampaign) {
          await campaignService.startCampaign(campaignId);
          toast({
            title: '🚀 Campaign Started',
            description: 'Campaign is running in background.',
          });
        } else {
          // Legacy Small Batch / Existing Audience
          // If existing audience, we need to fetch logic or let backend handle?
          // Current rcs/send-campaign handles 'contacts' array.

          let contactsToSend: string[] = [];
          if (campaignData.contactSource === 'existing') {
            const contactsList = await contactService.getContacts();
            const selectedContacts = contactsList.filter(c => campaignData.selectedContacts.includes(c.id));
            contactsToSend = selectedContacts.map(c => c.phone);
          } else if (campaignData.contactSource === 'manual') {
            contactsToSend = campaignData.manualNumbers.split(/[\n,\s]+/).map(n => n.trim()).filter(Boolean);
          }

          // We need to pass campaignId so backend updates the row we just created
          // instead of creating a new one.
          if (contactsToSend.length > 0) {
            // Call API directly or via service depending on channel
            // We need to pass campaignId to reuse it.
            const payload = {
              campaignId, // Backend should handle this
              campaignName: campaignData.name,
              templateName: templates.find(t => t.id === campaignData.templateId)?.name || campaignData.templateId,
              contacts: contactsToSend
            };

            if (campaignData.channel === 'whatsapp') {
              await whatsappService.sendCampaign(payload);
            } else {
              await rcsCampaignApi.sendCampaign(payload as any);
            }

            toast({
              title: '🚀 Campaign Sent',
              description: `Processed ${contactsToSend.length} contacts.`,
            });
          }
        }
      } else {
        toast({
          title: '📅 Campaign Scheduled',
          description: `Campaign scheduled for ${campaignData.scheduledDate}.`,
        });
      }

      fetchData();
      setIsCreateOpen(false);
      setCreateStep(1);

    } catch (err: any) {
      console.error('Create campaign error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to create campaign.',
        variant: 'destructive'
      });
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: Campaign['status']) => {
    try {
      await campaignService.updateStatus(campaignId, newStatus);
      setCampaigns(campaigns.map((c) => (c.id === campaignId ? { ...c, status: newStatus } : c)));

      const statusMessages = {
        running: '🚀 Campaign is now running!',
        paused: '⏸️ Campaign paused',
        completed: '✅ Campaign completed',
        draft: '📝 Saved as draft',
        scheduled: '📅 Campaign scheduled',
        sent: '📤 Campaign sent',
      };
      toast({
        title: statusMessages[newStatus] || 'Campaign updated',
        description: `Campaign status changed to ${newStatus}.`,
      });
    } catch (err) {
      console.error('Update status error:', err);
      toast({
        title: 'Error',
        description: 'Failed to update campaign status.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      await campaignService.deleteCampaign(campaignId);
      setCampaigns(campaigns.filter(c => c.id !== campaignId));
      toast({
        title: '🗑️ Campaign deleted',
        description: 'The campaign has been removed.',
      });
    } catch (err) {
      console.error('Delete campaign error:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign.',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicateCampaign = async (campaign: Campaign) => {
    try {
      await campaignService.duplicateCampaign(campaign.id);
      fetchData(); // Refresh list to get the new copy
      toast({
        title: '📋 Campaign duplicated',
        description: 'A copy of the campaign has been created.',
      });
    } catch (err) {
      console.error('Duplicate campaign error:', err);
      toast({
        title: 'Error',
        description: 'Failed to duplicate campaign.',
        variant: 'destructive'
      });
    }
  };

  // Stats cards
  const stats = [
    { label: 'Total Campaigns', value: campaigns.length, icon: Target, color: 'text-primary' },
    { label: 'Running', value: campaigns.filter(c => c.status === 'running').length, icon: Zap, color: 'text-success' },
    { label: 'Scheduled', value: campaigns.filter(c => c.status === 'scheduled').length, icon: Clock, color: 'text-warning' },
    { label: 'Total Delivered', value: campaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0).toLocaleString(), icon: TrendingUp, color: 'text-primary' },
  ];

  const openAnalytics = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setAnalyticsOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in w-full max-w-[100vw] overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-primary" />
            Campaigns
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">Create and manage your messaging campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4 bg-muted/50 px-3 py-1.5 rounded-lg border border-border/50">
            <Label htmlFor="auto-refresh" className="text-xs font-medium cursor-pointer">Auto-Refresh</Label>
            <input
              id="auto-refresh"
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
            />
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setCreateStep(1); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary w-full sm:w-auto shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 font-bold border-none">
                <Plus className="h-5 w-5 mr-2" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0">
              <DialogTitle className="sr-only">Create New Campaign</DialogTitle>
              <DialogDescription className="sr-only">Create a new messaging campaign</DialogDescription>
              <CampaignCreationStepper
                templates={templates.filter(t => t.status === 'approved') as any}
                onComplete={handleCampaignComplete}
                onCancel={() => setIsCreateOpen(false)}
                onSmsSelect={() => {
                  setIsCreateOpen(false);
                  setIsSmsDialogOpen(true);
                }}
                onWhatsappSelect={() => {
                  setIsCreateOpen(false);
                  setIsWhatsappDialogOpen(true);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* SMS Specific Dialog Component */}
      <SMSCampaignDialog
        open={isSmsDialogOpen}
        onOpenChange={setIsSmsDialogOpen}
        onSuccess={() => {
          fetchData();
          toast({
            title: "Success",
            description: "SMS Campaign created and started successfully."
          });
        }}
      />

      <WhatsAppCampaignDialog
        open={isWhatsappDialogOpen}
        onOpenChange={setIsWhatsappDialogOpen}
        onSuccess={() => {
          fetchData();
          toast({
            title: "Success",
            description: "WhatsApp Campaign created and started successfully."
          });
        }}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="card-elevated">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-lg md:text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={cn("h-6 w-6 md:h-8 md:w-8", stat.color)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Campaign Management</h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign.id} className="card-elevated animate-slide-up group hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      <ChannelBadge channel={campaign.channel as any} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openAnalytics(campaign)}>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Analytics
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCampaign(campaign.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={campaign.status as any} />
                    {campaign.scheduled_at && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(campaign.scheduled_at), 'MMM d, yyyy')}
                      </div>
                    )}
                  </div>

                  {campaign.status !== 'draft' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Delivery Rate</span>
                        <span className="font-medium">{getDeliveryRate(campaign)}%</span>
                      </div>
                      <Progress value={getDeliveryRate(campaign)} className="h-2" />
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted">
                      <p className="text-lg font-bold">{campaign.sent_count?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div className="p-2 rounded-lg bg-success/10">
                      <p className="text-lg font-bold text-success">{campaign.delivered_count?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Delivered</p>
                    </div>
                    <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                      <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{campaign.read_count?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Read</p>
                    </div>
                    <div className="p-2 rounded-lg bg-destructive/10">
                      <p className="text-lg font-bold text-destructive">{campaign.failed_count?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Failed</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    {campaign.status === 'draft' && (
                      <Button
                        className="flex-1 gradient-primary"
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, 'running')}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Now
                      </Button>
                    )}
                    {campaign.status === 'running' && (
                      <Button
                        variant="outline"
                        className="flex-1"
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, 'paused')}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                    )}
                    {campaign.status === 'paused' && (
                      <Button
                        className="flex-1 gradient-primary"
                        size="sm"
                        onClick={() => handleStatusChange(campaign.id, 'running')}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </Button>
                    )}
                    {(campaign.status === 'completed' || campaign.sent_count > 0) && (
                      <Button variant="outline" size="sm" onClick={() => openAnalytics(campaign)}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Analytics
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Sent</TableHead>
                  <TableHead className="text-center">Delivered</TableHead>
                  <TableHead className="text-center">Read</TableHead>
                  <TableHead className="text-center">Failed</TableHead>
                  <TableHead className="text-center">Delivery Rate</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">{campaign.name}</TableCell>
                    <TableCell><ChannelBadge channel={campaign.channel as any} /></TableCell>
                    <TableCell><StatusBadge status={campaign.status as any} /></TableCell>
                    <TableCell className="text-center">{campaign.sent_count?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-center text-success">{campaign.delivered_count?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-center text-purple-600">{campaign.read_count?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-center text-destructive">{campaign.failed_count?.toLocaleString() || 0}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2">
                        <Progress value={getDeliveryRate(campaign)} className="h-2 flex-1" />
                        <span className="text-sm font-medium w-10">{getDeliveryRate(campaign)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1 text-muted-foreground">
                        <IndianRupee className="h-3 w-3" />
                        {Number(campaign.cost).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(campaign.created_at), 'MMM d')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {campaign.status === 'draft' && (
                          <Button size="sm" onClick={() => handleStatusChange(campaign.id, 'running')} className="gradient-primary">
                            <Send className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        )}
                        {campaign.status === 'running' && (
                          <Button size="sm" variant="outline" onClick={() => handleStatusChange(campaign.id, 'paused')}>
                            <Pause className="h-3 w-3 mr-1" />
                            Pause
                          </Button>
                        )}
                        {campaign.status === 'paused' && (
                          <Button size="sm" onClick={() => handleStatusChange(campaign.id, 'running')} className="gradient-primary">
                            <Play className="h-3 w-3 mr-1" />
                            Resume
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => openAnalytics(campaign)}>
                          <BarChart3 className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDuplicateCampaign(campaign)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteCampaign(campaign.id)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

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
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-9 h-9 p-0"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>
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

      {/* Campaign Analytics Modal */}
      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="max-w-[800px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Campaign Analytics
            </DialogTitle>
            <DialogDescription>
              Performance metrics for {selectedCampaign?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedCampaign && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground mb-1">Total Sent</p>
                  <p className="text-2xl font-bold">{selectedCampaign.sent_count?.toLocaleString() || 0}</p>
                </Card>
                <Card className="p-4 bg-success/5 border-success/20">
                  <p className="text-sm text-success font-medium mb-1">Delivered</p>
                  <p className="text-2xl font-bold text-success">{selectedCampaign.delivered_count?.toLocaleString() || 0}</p>
                </Card>
                <Card className="p-4 bg-purple-50 border-purple-200">
                  <p className="text-sm text-purple-600 font-medium mb-1">Read</p>
                  <p className="text-2xl font-bold text-purple-600">{selectedCampaign.read_count?.toLocaleString() || 0}</p>
                </Card>
                <Card className="p-4 bg-destructive/5 border-destructive/20">
                  <p className="text-sm text-destructive font-medium mb-1">Failed</p>
                  <p className="text-2xl font-bold text-destructive">{selectedCampaign.failed_count?.toLocaleString() || 0}</p>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Delivery Success Rate</span>
                  <span className="font-medium">{getDeliveryRate(selectedCampaign)}%</span>
                </div>
                <Progress value={getDeliveryRate(selectedCampaign)} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Channel</p>
                  <div className="mt-1"><ChannelBadge channel={selectedCampaign.channel as any} /></div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Status</p>
                  <div className="mt-1"><StatusBadge status={selectedCampaign.status as any} /></div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium mt-1">{format(new Date(selectedCampaign.created_at), 'MMM d, yyyy')}</p>
                </div>
                {selectedCampaign.scheduled_at && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground">Scheduled</p>
                    <p className="font-medium mt-1">{format(new Date(selectedCampaign.scheduled_at), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No campaigns found</h3>
          <p className="text-muted-foreground">Create your first campaign to get started</p>
        </div>
      )}
    </div>
  );
}

const getDeliveryRate = (campaign: Campaign) => {
  if (!campaign.sent_count) return 0;
  return Math.round((campaign.delivered_count / campaign.sent_count) * 100);
};
