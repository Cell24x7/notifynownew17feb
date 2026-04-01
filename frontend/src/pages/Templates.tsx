import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, Zap, FileText, Smartphone, RefreshCw, Sparkles, ChevronRight, ChevronLeft, Shield, Image, Phone, Link, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { templateService, type MessageTemplate } from '@/services/templateService';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { RCSTemplateForm } from '@/components/campaigns/RCSTemplateForm';
import { WhatsAppTemplateForm } from '@/components/campaigns/WhatsAppTemplateForm';
import { WhatsAppPreview } from '@/components/campaigns/WhatsAppPreview';
import { rcsTemplatesService, useRCSTemplates } from '@/services/rcsTemplatesService';
import { whatsappService } from '@/services/whatsappService';
import { rcsCampaignApi } from '@/services/rcsCampaignApi';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Templates() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { syncTemplate } = useRCSTemplates();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [templateSubTab, setTemplateSubTab] = useState<'all' | 'pending'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'rcs' | 'sms'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingTemplateId, setRefreshingTemplateId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // File states for RCS uploads
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [carouselFiles, setCarouselFiles] = useState<Record<number, File | null>>({});
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const previews: Record<string, string> = {};
    if (selectedFile) {
      previews['main'] = URL.createObjectURL(selectedFile);
    }
    Object.entries(carouselFiles).forEach(([idx, file]) => {
      if (file) previews[`carousel_${idx}`] = URL.createObjectURL(file);
    });

    setFilePreviews(previews);

    return () => {
      Object.values(previews).forEach(URL.revokeObjectURL);
    };
  }, [selectedFile, carouselFiles]);

  useEffect(() => {
    if (user) {
      fetchTemplates();
    }
  }, [user?.id, user?.rcs_config_id, user?.whatsapp_config_id, page, templateSubTab]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const templatesRes = templateSubTab === 'pending' && isAdmin
        ? await templateService.getAdminTemplates(page)
        : await templateService.getTemplates(page);
      
      const templatesData = templatesRes.templates;
      setTotalPages(templatesRes.pagination.totalPages);
      setTotalItems(templatesRes.pagination.total);
      setTemplates(templatesData);

      // Fetch external RCS templates
      const rcsConfigId = (user as any)?.rcs_config_id;
      if (rcsConfigId) {
        try {
          const externalRcsData = await rcsCampaignApi.getExternalTemplates();
          if (externalRcsData && Array.isArray(externalRcsData.templates)) {
            const externalTemplates = externalRcsData.templates.map((t: any) => {
              const tName = t.name || t.TemplateName || 'Unknown Template';
              const type = (t.type || t.templateType || t.TemplateType || 'text_message') as any;
              let body = t.body || t.textMessageContent || t.fallbackText || 'External Template';
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
                id: tName,
                name: tName,
                channel: 'rcs',
                status: (t.status || t.templateStatus || 'approved').toLowerCase(),
                language: t.language || 'en',
                category: t.category || 'Marketing',
                body: body,
                template_type: type,
                metadata: meta,
                header: { type: 'none' },
                footer: '',
                buttons: [],
                variables: []
              };
            });

            setTemplates(prev => {
              const other = prev.filter(p => p.channel !== 'rcs');
              const localRcs = prev.filter(p => p.channel === 'rcs');
              const reconciled: MessageTemplate[] = [];

              localRcs.forEach(local => {
                const live = externalTemplates.find(t => t.name === local.name);
                if (live) {
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

              externalTemplates.forEach(external => {
                if (!localRcs.some(l => l.name === external.name)) {
                  reconciled.push(external);
                }
              });

              return [...other, ...reconciled];
            });
          }
        } catch (rcsErr) {
          console.warn('RCS template fetch failed:', rcsErr);
        }
      }

      // Fetch external WhatsApp templates
      const waConfigId = (user as any)?.whatsapp_config_id;
      if (waConfigId) {
        try {
          const externalWaData = await whatsappService.getTemplates();
          if (externalWaData && externalWaData.success && Array.isArray(externalWaData.templates)) {
            const externalWaTemplates = externalWaData.templates.map((t: any) => {
              const bodyComponent = t.components?.find((c: any) => c.type === 'BODY');
              const bodyText = bodyComponent ? bodyComponent.text : (t.components?.length ? 'Media-only Template' : 'External Template');
              return {
                id: t.name || t.id,
                name: t.name,
                channel: 'whatsapp',
                status: t.status === 'APPROVED' ? 'approved' : t.status === 'REJECTED' ? 'rejected' : 'pending',
                language: t.language || 'en_US',
                category: t.category || 'MARKETING',
                body: bodyText,
                template_type: t.category,
                components: t.components,
                header: { type: 'none' },
                footer: '',
                buttons: [],
                variables: []
              };
            });

            setTemplates(prev => {
              const other = prev.filter(p => p.channel !== 'whatsapp');
              const localWa = prev.filter(p => p.channel === 'whatsapp');
              const reconciled: MessageTemplate[] = [];

              localWa.forEach(local => {
                const live = externalWaTemplates.find(t => t.name === local.name);
                if (live) {
                  reconciled.push({ ...local, ...live, id: local.id });
                } else {
                  reconciled.push(local);
                }
              });

              externalWaTemplates.forEach(external => {
                if (!localWa.some(l => l.name === external.name)) {
                  reconciled.push(external);
                }
              });

              return [...other, ...reconciled];
            });
          }
        } catch (waErr) {
          console.warn('WhatsApp template fetch failed:', waErr);
        }
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch templates. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Template creation/editing state
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [templateStep, setTemplateStep] = useState<'channel' | 'form'>('channel');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState<any>({
    name: '',
    language: 'en',
    category: 'Marketing',
    channel: 'rcs',
    template_type: 'text_message',
    metadata: {
      orientation: 'VERTICAL',
      height: 'SHORT_HEIGHT',
      alignment: 'LEFT',
      mediaUrl: '',
      cardTitle: '',
      carouselList: []
    },
    body: '',
    footer: '',
    buttons: [],
    variables: []
  });

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<MessageTemplate | null>(null);

  const filteredTemplates = useMemo(() => {
    return (templates || []).filter((template) => {
      const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.channel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesChannel = channelFilter === 'all' || template.channel === channelFilter;
      const matchesStatus = statusFilter === 'all' || template.status === statusFilter;
      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [templates, searchQuery, channelFilter, statusFilter]);

  const handleRefreshTemplates = async () => {
    setRefreshing(true);
    await fetchTemplates();
    setRefreshing(false);
    toast({ title: '🔄 Templates Refreshed', description: 'Latest template statuses fetched from providers.' });
  };

  const handleApproveTemplate = async (templateId: string, status: 'approved' | 'rejected') => {
    try {
      await templateService.updateTemplateStatus(templateId, status);
      fetchTemplates();
      toast({
        title: status === 'approved' ? '✅ Template Approved' : '❌ Template Rejected',
        description: `Template status has been updated to ${status}.`,
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update template status',
        variant: 'destructive',
      });
    }
  };

  const handleSyncTemplateDetails = async (template: MessageTemplate) => {
    try {
      setRefreshingTemplateId(template.id);
      toast({ title: 'Syncing Details...', description: `Fetching full content for ${template.name} from Dotgo...` });
      const result = await rcsTemplatesService.syncTemplateDetails(template.name);
      if (result.success) {
        toast({ title: '✅ Sync Complete', description: `Full details for "${template.name}" have been synced.` });
        await fetchTemplates();
      }
    } catch (err: any) {
      toast({ title: 'Sync Failed', description: err.message || 'Failed to sync template details', variant: 'destructive' });
    } finally {
      setRefreshingTemplateId(null);
    }
  };

  const handleSaveTemplate = async (isDraft: boolean = false) => {
    if (newTemplate.channel === 'whatsapp') {
      try {
        setLoading(true);
        const cleanComponents = (components: any[]) => {
          return components.map(c => {
            const { previewUrl, handle, ...rest } = c;
            if (rest.type === 'CAROUSEL' && Array.isArray(rest.cards)) {
              rest.cards = rest.cards.map((card: any) => ({
                ...card,
                components: card.components ? cleanComponents(card.components) : []
              }));
            }
            return rest;
          });
        };

        const templatePayload = {
          name: newTemplate.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          category: (newTemplate.category || 'UTILITY').toUpperCase() as any,
          language: newTemplate.language || 'en_US',
          components: cleanComponents(newTemplate.components || []),
          allow_category_change: true
        };

        await whatsappService.createTemplate(templatePayload);
        toast({ title: '🎉 WhatsApp Template Submitted' });
        fetchTemplates();
        setIsTemplateOpen(false);
        resetTemplateForm();
      } catch (err: any) {
        toast({ title: '❌ Template Creation Failed', description: err.message, variant: 'destructive' });
        return;
      } finally {
        setLoading(false);
      }
    }

    try {
      setLoading(true);
      const mappedButtons = newTemplate.channel === 'rcs'
        ? newTemplate.buttons.map((btn: any, index: number) => ({
            type: btn.type === 'url_action' ? 'url' : btn.type === 'dialer_action' ? 'phone' : 'quick_reply',
            label: btn.displayText || 'Button',
            value: btn.uri || btn.postback || btn.displayText || '',
            position: index
          }))
        : newTemplate.buttons;

      const templateData: any = {
        name: newTemplate.name,
        language: newTemplate.language || 'en_US',
        category: newTemplate.category || 'MARKETING',
        channel: newTemplate.channel,
        status: isDraft ? 'draft' : 'pending',
        body: newTemplate.body,
        buttons: mappedButtons
      };

      if (newTemplate.channel === 'rcs' && !isDraft) {
         const rcsDotgoPayload: any = { name: newTemplate.name, type: newTemplate.template_type, fallbackText: newTemplate.body?.substring(0, 100) || 'RCS Message' };
         if (newTemplate.template_type === 'text_message') rcsDotgoPayload.textMessageContent = newTemplate.body;
         const rcsFormData = new FormData();
         rcsFormData.append('rich_template_data', JSON.stringify(rcsDotgoPayload));
         await rcsTemplatesService.createTemplate(rcsFormData);
      }

      if (editingTemplate) {
        await templateService.updateTemplate(editingTemplate.id, templateData);
      } else {
        await templateService.createTemplate(templateData);
      }

      fetchTemplates();
      setIsTemplateOpen(false);
      resetTemplateForm();
    } catch (err: any) {
      toast({ title: 'Error Saving Template', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const resetTemplateForm = () => {
    setNewTemplate({
      name: '',
      language: 'en',
      category: 'Marketing',
      channel: 'rcs',
      template_type: 'text_message',
      metadata: { orientation: 'VERTICAL', height: 'SHORT_HEIGHT', alignment: 'LEFT', mediaUrl: '', cardTitle: '', carouselList: [] },
      body: '',
      footer: '',
      buttons: [],
    });
    setTemplateStep('channel');
    setSelectedFile(null);
    setCarouselFiles({});
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    const savedMetadata = (template as any).metadata || {};
    setNewTemplate({
      name: template.name,
      language: template.language,
      category: template.category,
      channel: template.channel,
      template_type: template.template_type || 'text_message',
      metadata: {
        orientation: savedMetadata.orientation || 'VERTICAL',
        height: savedMetadata.height || 'SHORT_HEIGHT',
        alignment: savedMetadata.alignment || 'LEFT',
        mediaUrl: savedMetadata.mediaUrl || template.header_content || '',
        cardTitle: savedMetadata.cardTitle || '',
        carouselList: savedMetadata.carouselList || []
      },
      body: template.body,
      footer: template.footer || '',
      buttons: template.buttons || [],
    });
    setTemplateStep('form');
    setIsTemplateOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (template?.channel === 'rcs') await rcsTemplatesService.deleteExternalTemplate(template.name);
      if (template?.channel === 'whatsapp') await whatsappService.deleteTemplate(template.name);
      await templateService.deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast({ title: '🗑️ Template deleted' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const handleCreateCampaignFromTemplate = (template: MessageTemplate) => {
    navigate('/campaigns', { state: { templateId: template.id, channel: template.channel } });
  };

  const renderPhonePreview = (data: any = newTemplate) => {
    const getHeaderIcon = () => {
      if (data.header?.type === 'image' && data.header.content) {
        return (
          <div className="mb-2 rounded-lg overflow-hidden">
            <img src={data.header.content} alt="Header" className="w-full h-auto object-cover" />
          </div>
        );
      }
      return null;
    };

    if (data.channel === 'rcs') {
      const { template_type, metadata, body, buttons } = data;
      const renderCard = (cardData: any, isCarousel = false, index?: number) => {
        const orientation = cardData?.orientation || metadata?.orientation || 'VERTICAL';
        const height = cardData?.height || metadata?.height || 'SHORT_HEIGHT';
        const previewUrl = isCarousel && index !== undefined ? filePreviews[`carousel_${index}`] : filePreviews['main'];
        const mediaSource = cardData?.mediaUrl || previewUrl;

        return (
          <div className={cn(
            "bg-white dark:bg-[#1f2c33] rounded-2xl shadow-md overflow-hidden flex flex-col border border-black/5",
            !isCarousel && orientation === 'HORIZONTAL' ? "flex-row h-36" : "w-[240px]"
          )}>
            {mediaSource && (
              <div className={cn(
                "bg-muted relative shrink-0",
                !isCarousel && orientation === 'HORIZONTAL' ? "w-[40%] h-full" : "w-full",
                height === 'SHORT_HEIGHT' ? "h-28" : "h-36"
              )}>
                <img src={mediaSource} className="w-full h-full object-cover" alt="Card" />
              </div>
            )}
            <div className="p-3 space-y-1 flex-1 flex flex-col">
              {(cardData?.title || cardData?.cardTitle) && (
                <h4 className="text-[13px] font-bold text-[#111b21] dark:text-[#e9edef] truncate leading-tight">{cardData.title || cardData.cardTitle}</h4>
              )}
              <p className="text-[11px] text-[#667781] dark:text-[#8696a0] line-clamp-2 leading-snug">
                {cardData?.description || body || '...'}
              </p>
              {buttons?.length > 0 && (
                <div className="pt-2 flex flex-col gap-1 mt-auto">
                  {buttons.slice(0, 2).map((btn: any, i: number) => (
                    <div key={i} className="text-[11px] py-1.5 border-t border-[#f0f2f5] dark:border-white/5 text-[#00a884] dark:text-[#53bdeb] font-bold text-center">
                      {btn.displayText || btn.label || 'Action'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      };

      return (
        <div className="flex flex-col h-full items-center justify-start py-2 overflow-y-auto no-scrollbar w-full">
          <div className="h-full w-[310px] bg-slate-50 dark:bg-[#0b141a] rounded-[2rem] overflow-hidden flex flex-col relative z-10 no-scrollbar shadow-2xl border border-black/5 min-h-[550px]">
              <div className="px-4 pt-5 pb-4 bg-[#1A73E8] text-white flex items-center gap-3 relative z-20">
                <ChevronLeft className="h-5 w-5" />
                <div className="flex-1">
                  <p className="text-xs font-bold truncate">Business Profile</p>
                  <p className="text-[9px] opacity-70 flex items-center gap-0.5"><Shield className="h-2.5 w-2.5" /> Verified</p>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-4">
                {template_type === 'text_message' && (
                  <div className="bg-white dark:bg-[#1f2c33] p-3 rounded-2xl rounded-tl-sm shadow-md border border-black/5 max-w-[90%]">
                    <p className="text-[13px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap">{body || 'Type message...'}</p>
                  </div>
                )}
                {template_type === 'rich_card' && renderCard(metadata)}
                {template_type === 'carousel' && (
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-2 px-2">
                    {(metadata.carouselList || []).map((card: any, i: number) => (
                      <div key={i} className="flex-shrink-0">{renderCard(card, true, i)}</div>
                    ))}
                  </div>
                )}
              </div>
          </div>
        </div>
      );
    }

    return (
        <div className="flex flex-col h-full items-center justify-start py-8 overflow-y-auto no-scrollbar w-full">
          <div className="w-[280px] bg-[#ECE5DD] dark:bg-[#0b141a] rounded-[2rem] shadow-2xl overflow-hidden relative border border-black/5 min-h-[500px]">
            <div className="bg-[#075E54] text-white px-4 py-4 flex items-center gap-3 relative z-20">
              <ChevronRight className="h-5 w-5 rotate-180" />
              <div className="flex-1"><p className="text-sm font-medium">WhatsApp</p></div>
            </div>
            <div className="p-3">
              <div className="bg-white dark:bg-[#1f2c33] rounded-lg p-3 shadow-sm max-w-[90%] space-y-2">
                {getHeaderIcon()}
                <p className="text-sm whitespace-pre-wrap text-[#111b21] dark:text-[#e9edef]">{data.body || 'Message body...'}</p>
                {data.footer && <p className="text-[10px] text-muted-foreground">{data.footer}</p>}
              </div>
            </div>
          </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-background min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-emerald-500" /> Templates
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your multi-channel message templates</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleRefreshTemplates} disabled={refreshing} className="bg-card border-border">
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} /> Refresh
          </Button>
          <Button className="gradient-primary shadow-lg font-bold border-none" onClick={() => { setEditingTemplate(null); resetTemplateForm(); setIsTemplateOpen(true); }}>
            <Plus className="h-5 w-5 mr-2" /> Create Template
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-border bg-card shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[240px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-10 h-10 bg-muted/20 border-border"
            />
          </div>
          <div className="flex items-center gap-3">
            <Select value={channelFilter} onValueChange={(v: any) => { setChannelFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-10 bg-muted/20 border-border text-foreground"><SelectValue placeholder="Channels" /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="rcs">RCS</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[140px] h-10 bg-muted/20 border-border text-foreground"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (
        <Tabs value={templateSubTab} onValueChange={(v: any) => setTemplateSubTab(v)} className="w-full">
          <TabsList className="bg-muted/50 p-1 rounded-xl w-fit h-11 border border-border/50">
            <TabsTrigger value="all" className="rounded-lg px-6 font-bold text-xs">My Templates</TabsTrigger>
            <TabsTrigger value="pending" className="rounded-lg px-6 font-bold text-xs">Pending Approval</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="h-64 animate-pulse bg-muted/40 border-border rounded-xl" />)}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="rounded-xl border-border bg-card py-20 text-center">
          <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4"><FileText className="h-10 w-10 text-muted-foreground" /></div>
          <h3 className="text-xl font-semibold text-foreground">No templates found</h3>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="rounded-xl border-border bg-card shadow-sm hover:shadow-md transition-all border-b-4 border-b-transparent hover:border-b-primary flex flex-col h-full relative">
              {template.channel === 'rcs' && (
                <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-600 font-semibold text-[10px] uppercase px-3 py-1.5 rounded-bl-xl border-b border-l border-blue-500/20">RCS</div>
              )}
              <CardHeader className="pb-3 pt-6 px-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="text-lg font-bold text-primary">{template.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-muted/50 border-none text-[10px]">{template.category}</Badge>
                      <Badge variant={template.status === 'approved' ? 'secondary' : 'outline'} className="capitalize text-[10px]">{template.status}</Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreVertical className="h-4 w-4 text-muted-foreground" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 rounded-xl border-border bg-card shadow-xl p-1.5">
                      <DropdownMenuItem onClick={() => { setPreviewTemplate(template); setIsPreviewOpen(true); }} className="rounded-lg h-10 font-medium hover:bg-muted"><Eye className="mr-2 h-4 w-4" /> View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)} className="rounded-lg h-10 font-medium hover:bg-muted"><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuSeparator className="mx-1 my-1.5 bg-muted" />
                      <DropdownMenuItem onClick={() => handleDeleteTemplate(template.id)} className="rounded-lg h-10 font-medium text-rose-600 hover:bg-rose-50"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 pt-0 flex-1 flex flex-col">
                <div className="p-4 rounded-xl bg-muted/30 text-sm border border-border/50 min-h-[80px] flex items-center">
                  <p className="line-clamp-3 text-muted-foreground leading-relaxed italic">"{template.body || 'External Template'}"</p>
                </div>
                <div className="mt-auto pt-5">
                  {template.body === 'External Template' ? (
                     <Button className="w-full bg-amber-500 hover:bg-amber-600 font-bold h-11 rounded-xl" onClick={() => handleSyncTemplateDetails(template)}>
                        <RefreshCw className={cn("h-4 w-4 mr-2", refreshingTemplateId === template.id && "animate-spin")} /> Sync Template
                     </Button>
                  ) : (
                    <Button className="w-full gradient-primary font-bold h-11 rounded-xl" onClick={() => handleCreateCampaignFromTemplate(template)}>
                       <Zap className="h-4 w-4 mr-2 fill-current" /> Create Campaign
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Placeholder */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-8 border-t border-border/50">
          <p className="text-xs text-muted-foreground font-bold tracking-widest opacity-60">PAGE {page} OF {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl"><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-xl"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className={cn("max-w-[95vw] w-full p-0 overflow-hidden bg-card border-border shadow-2xl sm:rounded-3xl", templateStep === 'channel' ? "sm:max-w-2xl" : "sm:max-w-5xl h-[90vh]")}>
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>{templateStep === 'channel' ? 'Select Channel' : 'Configure Template'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            <ScrollArea className="flex-1">
              {templateStep === 'channel' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6">
                  {[
                    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
                    { id: 'rcs', name: 'RCS', icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { id: 'sms', name: 'SMS', icon: Smartphone, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                  ].map((chan) => (
                    <button key={chan.id} onClick={() => { setNewTemplate({ ...newTemplate, channel: chan.id as any }); setTemplateStep('form'); }} className="group flex flex-col items-center justify-center p-8 rounded-3xl border border-border bg-card hover:border-primary transition-all">
                        <div className={cn("p-4 rounded-2xl mb-4", chan.bg)}><chan.icon className={cn("h-8 w-8", chan.color)} /></div>
                        <span className="font-bold text-lg">{chan.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 space-y-6">
                   {newTemplate.channel === 'rcs' && <RCSTemplateForm data={newTemplate} onChange={setNewTemplate} onFileSelect={setSelectedFile} onCarouselFileSelect={(idx, file) => setCarouselFiles(p => ({ ...p, [idx]: file }))} />}
                   {newTemplate.channel === 'whatsapp' && <WhatsAppTemplateForm data={newTemplate} onChange={setNewTemplate} />}
                   <div className="flex gap-3 pt-6">
                      <Button variant="outline" className="flex-1 h-12 rounded-xl" onClick={() => setTemplateStep('channel')}>Back</Button>
                      <Button className="flex-[2] h-12 rounded-xl gradient-primary" onClick={() => handleSaveTemplate(false)}>{editingTemplate ? 'Update' : 'Save & Submit'}</Button>
                   </div>
                </div>
              )}
            </ScrollArea>
            {templateStep !== 'channel' && (
              <div className="hidden lg:flex flex-col bg-muted/20 p-4 h-full border-l border-border min-w-[320px]">
                <h3 className="text-center font-bold text-muted-foreground uppercase text-[10px] tracking-widest mb-4">Live Preview</h3>
                <div className="flex-1 flex flex-col items-center justify-center">{newTemplate.channel === 'whatsapp' ? <WhatsAppPreview data={newTemplate} /> : renderPhonePreview()}</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-fit w-auto p-0 bg-transparent border-none shadow-none flex items-center justify-center">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10" />
          {previewTemplate && (
            <div className="rounded-[2.5rem] bg-background w-[320px] h-auto max-h-[85vh] shadow-2xl relative overflow-y-auto no-scrollbar border border-border">
              {previewTemplate.channel === 'whatsapp' ? <WhatsAppPreview data={previewTemplate} /> : <div className="p-4">{renderPhonePreview(previewTemplate)}</div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
