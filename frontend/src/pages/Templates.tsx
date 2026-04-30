import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit, Trash2, Eye, Zap, FileText, Smartphone, RefreshCw, Sparkles, ChevronRight, ChevronLeft, Shield, Image as ImageIcon, Bot, Phone, Link, MessageSquare, Mail, Mic, X } from 'lucide-react';
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
import { useClient } from '@/contexts/ClientContext';
import { dltTemplateService } from '@/services/dltTemplateService';
import { useNavigate } from 'react-router-dom';
import { EmailTemplateForm } from '@/components/campaigns/EmailTemplateForm';
import { EmailPreview } from '@/components/campaigns/EmailPreview';
import { VoiceTemplateForm } from '@/components/campaigns/VoiceTemplateForm';

export default function Templates() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { syncTemplate } = useRCSTemplates();
  const navigate = useNavigate();
  const { selectedClientId } = useClient();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [templateSubTab, setTemplateSubTab] = useState<'all' | 'pending'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'whatsapp' | 'rcs' | 'sms' | 'email' | 'voicebot'>('all');
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
  }, [user?.id, user?.rcs_config_id, user?.whatsapp_config_id, page, templateSubTab, selectedClientId]); // Added selectedClientId

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const templatesRes = isAdmin
        ? await templateService.getAdminTemplates(page, 20, selectedClientId)
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
      carouselList: [],
      subject: ''
    },
    body: '',
    footer: '',
    buttons: [],
    variables: []
  });

  // SMS / DLT Template form state
  const [smsFormData, setSmsFormData] = useState({
    sender: '',
    template_text: '',
    temp_id: '',
    temp_name: '',
    status: 'Y' as 'Y' | 'N',
    temp_type: 'Promotional',
  });

  const [savingSms, setSavingSms] = useState(false);

  const handleSaveSmsTemplate = async () => {
    if (!smsFormData.sender || !smsFormData.template_text || !smsFormData.temp_id) {
      toast({ title: 'Validation Error', description: 'Sender ID, Template Text, and Template ID are required.', variant: 'destructive' });
      return;
    }
    setSavingSms(true);
    try {
      await dltTemplateService.createTemplate(smsFormData);
      toast({ title: '✅ SMS Template Saved', description: 'DLT template created and ready to use in SMS campaigns.' });
      setIsTemplateOpen(false);
      setSmsFormData({ sender: '', template_text: '', temp_id: '', temp_name: '', status: 'Y', temp_type: 'Promotional' });
      setTemplateStep('channel');
      fetchTemplates();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to save SMS template', variant: 'destructive' });
    } finally {
      setSavingSms(false);
    }
  };

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
        status: isDraft ? 'draft' : (newTemplate.channel === 'email' ? 'approved' : 'pending'),
        body: newTemplate.body,
        buttons: mappedButtons,
        metadata: newTemplate.metadata,
        template_type: newTemplate.template_type,
        rcs_config_id: newTemplate.rcs_config_id,
        whatsapp_config_id: newTemplate.whatsapp_config_id
      };

      if (newTemplate.channel === 'rcs' && !isDraft) {
         const rcsDotgoPayload: any = { 
           name: newTemplate.name, 
           type: newTemplate.template_type, 
           fallbackText: newTemplate.body?.substring(0, 100) || 'RCS Message' 
         };

         if (newTemplate.template_type === 'text_message') {
           rcsDotgoPayload.textMessageContent = newTemplate.body;
           rcsDotgoPayload.suggestions = newTemplate.buttons;
         } else if (newTemplate.template_type === 'rich_card') {
           rcsDotgoPayload.orientation = newTemplate.metadata?.orientation || 'VERTICAL';
           rcsDotgoPayload.height = newTemplate.metadata?.height || 'SHORT_HEIGHT';
           rcsDotgoPayload.standAlone = {
             cardTitle: newTemplate.metadata?.cardTitle || 'Card Title',
             cardDescription: newTemplate.body || '',
             mediaUrl: newTemplate.metadata?.mediaUrl || '',
             fileName: selectedFile ? selectedFile.name : undefined,
             suggestions: newTemplate.buttons || []
           };
         } else if (newTemplate.template_type === 'carousel') {
           rcsDotgoPayload.height = newTemplate.metadata?.height || 'SHORT_HEIGHT';
           rcsDotgoPayload.width = newTemplate.metadata?.width || 'MEDIUM_WIDTH';
           rcsDotgoPayload.carouselList = (newTemplate.metadata?.carouselList || []).map((card: any, idx: number) => ({
              cardTitle: card.title || `Card ${idx + 1}`,
              cardDescription: card.description || '',
              mediaUrl: card.mediaUrl || '',
              fileName: carouselFiles[idx] ? carouselFiles[idx].name : undefined,
              suggestions: card.buttons || []
           }));
         }

         const rcsFormData = new FormData();
         rcsFormData.append('rich_template_data', JSON.stringify(rcsDotgoPayload));

         if (selectedFile) rcsFormData.append('multimedia_files', selectedFile);
         Object.values(carouselFiles).forEach(file => {
           if (file) rcsFormData.append('multimedia_files', file);
         });

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

  const [activePreviewType, setActivePreviewType] = useState<'phone' | 'email'>('phone');

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
    // If it's an SMS template and we are in the creation modal, use smsFormData
    const isSMSPreview = data.channel === 'sms';
    const previewData = (isSMSPreview && isTemplateOpen) ? {
        ...data,
        body: smsFormData.template_text || data.body,
        temp_id: smsFormData.temp_id || data.temp_id,
        metadata: { ...data.metadata, sender: smsFormData.sender }
    } : data;

    const isRCS = previewData.channel === 'rcs';
    const isSMS = previewData.channel === 'sms';
    const isWA = previewData.channel === 'whatsapp';
    
    // Header Info
    const meta = (isRCS || isWA || isSMS) ? (previewData.metadata || {}) : {};
    const botName = isRCS ? (meta.bot_name || "Business Profile") : isSMS ? (meta.sender || "Messaging") : "WhatsApp";
    const botColor = isRCS ? (meta.bot_color || "#1A73E8") : isSMS ? "#2A2A2E" : "#075E54";

    const renderRCSCard = (cardData: any, isCarousel = false, index?: number) => {
      const orientation = cardData?.orientation || (previewData.metadata?.orientation) || 'VERTICAL';
      const height = cardData?.height || (previewData.metadata?.height) || 'SHORT_HEIGHT';
      const previewUrl = isCarousel && index !== undefined ? filePreviews[`carousel_${index}`] : filePreviews['main'];
      const mediaSource = cardData?.mediaUrl || previewUrl || cardData?.image_url;

      return (
        <div className={cn(
          "bg-white dark:bg-[#1f2c33] rounded-2xl shadow-md overflow-hidden flex flex-col border border-black/5 animate-in fade-in zoom-in-95 duration-300",
          !isCarousel && orientation === 'HORIZONTAL' ? "flex-row h-36 w-full" : "w-[240px]"
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
              {cardData?.description || cardData?.body || previewData.body || '...'}
            </p>
            {cardData?.buttons?.length > 0 && (
              <div className="pt-2 flex flex-col gap-1 mt-auto">
                {cardData.buttons.slice(0, 2).map((btn: any, i: number) => (
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

    const wrapInPhoneMockup = (content: React.ReactNode) => (
      <div className="flex flex-col items-center justify-center w-full py-4 scale-[0.85] sm:scale-100 origin-top sm:origin-center">
        <div className="w-[280px] sm:w-[300px] aspect-[9/19] h-auto bg-[#1a1a1a] rounded-[2.5rem] sm:rounded-[3rem] p-2 sm:p-3 shadow-2xl relative border-[5px] sm:border-[7px] border-[#333] ring-1 ring-white/10 flex flex-col overflow-hidden">
          {/* Hardware Buttons */}
          <div className="absolute top-24 -left-[2px] w-[2px] h-10 bg-[#444] rounded-r-sm" />
          <div className="absolute top-36 -left-[2px] w-[2px] h-10 bg-[#444] rounded-r-sm" />
          <div className="absolute top-30 -right-[2px] w-[2px] h-14 bg-[#444] rounded-l-sm" />

          {/* Notch/Speaker */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 sm:w-28 h-5 sm:h-6 bg-[#1a1a1a] rounded-b-2xl z-30 flex items-center justify-center gap-1 sm:gap-1.5 px-3">
            <div className="w-6 sm:w-8 h-1 bg-white/5 rounded-full" />
            <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
          </div>
          <div className="h-full w-full bg-black rounded-[1.5rem] sm:rounded-[2rem] overflow-hidden relative border-[1px] border-white/5">
            {content}
          </div>
        </div>
      </div>
    );

    if (previewData.channel === 'email') {
        return wrapInPhoneMockup(
            <div className="h-full w-full bg-white dark:bg-zinc-900 overflow-y-auto no-scrollbar rounded-[1.5rem] sm:rounded-[2rem]">
                <EmailPreview data={{ ...previewData, subject: previewData.subject || previewData.metadata?.subject }} />
            </div>
        );
    }

    if (previewData.channel === 'whatsapp') {
        let waData = { ...previewData };
        if (typeof previewData.metadata === 'string') {
            try {
                const parsed = JSON.parse(previewData.metadata);
                waData = { ...waData, ...parsed };
            } catch (e) {}
        } else if (previewData.metadata && typeof previewData.metadata === 'object') {
            waData = { ...waData, ...previewData.metadata };
        }
        
        if ((!waData.components || waData.components.length === 0) && previewData.components) {
            waData.components = previewData.components;
        }
        
        return wrapInPhoneMockup(<WhatsAppPreview data={waData} />);
    }

    if (previewData.channel === 'voicebot') {
      return wrapInPhoneMockup(
        <div className="h-full w-full bg-[#000a14] rounded-[1.5rem] sm:rounded-[2rem] p-3 flex flex-col overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1c1e] to-[#000000] z-0" />
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-500/20 flex items-center justify-center mb-6 animate-pulse border border-blue-500/30">
                    <Phone className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2 truncate w-full">{previewData.name || 'AI Voice Bot'}</h3>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 mb-6 sm:mb-8">Active Call</Badge>
                
                <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 w-full border border-white/10 mb-6 sm:mb-8 max-h-[140px] sm:max-h-[160px] overflow-hidden">
                    <p className="text-[11px] sm:text-[12px] text-white/80 leading-relaxed italic line-clamp-4">
                        "{previewData.body || 'Playing your audio message...'}"
                    </p>
                </div>
            </div>

            <div className="relative z-10 mt-auto pb-8 flex justify-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 cursor-pointer">
                    <Phone className="h-7 w-7 sm:h-8 sm:w-8 text-white rotate-[135deg]" />
                </div>
            </div>
        </div>
      );
    }

    return wrapInPhoneMockup(
      <div className="h-full w-full bg-[#efeae2] dark:bg-[#0b141a] overflow-hidden flex flex-col relative z-10 no-scrollbar shadow-sm">
        {/* Header */}
        <div className="px-4 pt-8 pb-3 text-white flex items-center gap-3 relative z-20 shadow-md" style={{ backgroundColor: botColor }}>
           <ChevronLeft className="h-5 w-5 -ml-1 cursor-pointer opacity-80" />
           <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center border border-white/20 shadow-sm shrink-0 overflow-hidden">
              {isRCS ? (
                <div className="w-full h-full bg-[#1A73E8] flex items-center justify-center"><Bot className="h-5 w-5 text-white" /></div>
              ) : isSMS ? (
                <div className="w-full h-full bg-[#2A2A2E] flex items-center justify-center"><Smartphone className="h-5 w-5 text-white" /></div>
              ) : (
                <div className="w-full h-full bg-[#00a884] flex items-center justify-center text-[10px] font-bold text-white">WA</div>
              )}
           </div>
           <div className="flex-1 min-w-0">
             <p className="text-[14px] font-bold truncate leading-tight">{isSMS && smsFormData.sender ? smsFormData.sender : botName}</p>
             <div className="flex items-center gap-1 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] opacity-70 font-medium">Online</span>
             </div>
           </div>
           <div className="flex items-center gap-3 opacity-80">
              <Phone className="h-4 w-4" />
              <MoreVertical className="h-4 w-4" />
           </div>
        </div>

        {/* Message Content Area */}
        <div className={cn("flex-1 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto no-scrollbar pt-6", isSMS && "bg-background")}>
           <div className="flex justify-center mb-2">
             <Badge variant="outline" className="text-[8px] bg-black/5 dark:bg-white/5 border-none font-bold uppercase tracking-widest text-muted-foreground">Today</Badge>
           </div>

           <div className="space-y-3">
             {isRCS ? (
               <>
                {previewData.template_type === 'text_message' && (
                  <div className="bg-white dark:bg-[#1f2c33] p-3 rounded-2xl rounded-tl-sm shadow-sm border border-black/5 max-w-[85%] animate-in slide-in-from-left-2 duration-300">
                    <p className="text-[13px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-relaxed">{previewData.body || 'Type message...'}</p>
                    <div className="flex justify-end mt-1"><span className="text-[8px] opacity-40">10:45 AM</span></div>
                  </div>
                )}
                {previewData.template_type === 'rich_card' && renderRCSCard(previewData.metadata)}
                {previewData.template_type === 'carousel' && (
                  <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
                    {(previewData.metadata?.carouselList || []).map((card: any, i: number) => (
                      <div key={i} className="flex-shrink-0">{renderRCSCard(card, true, i)}</div>
                    ))}
                  </div>
                )}
               </>
             ) : isWA ? (
                <div className="bg-[#DCF8C6] dark:bg-[#056162] p-2.5 rounded-xl rounded-tl-sm shadow-sm self-start max-w-[90%] border border-black/5 animate-in slide-in-from-left-2 duration-300">
                  {/* WA Components Fallback (if WhatsAppPreview not used) */}
                  {(() => {
                    const components = previewData.components || [];
                    const header = components.find((c: any) => c.type === 'HEADER');
                    const body = components.find((c: any) => c.type === 'BODY');
                    const footer = components.find((c: any) => c.type === 'FOOTER');
                    const buttons = components.find((c: any) => c.type === 'BUTTONS')?.buttons || [];
                    
                    return (
                      <>
                        {header?.format === 'TEXT' && (
                          <p className="text-[13px] font-extrabold text-[#111b21] dark:text-[#e9edef] mb-1">{header.text || 'Header'}</p>
                        )}
                        {header?.format === 'IMAGE' && (
                          <div className="mb-2 rounded-lg overflow-hidden -mx-1 -mt-1 h-32 bg-muted flex items-center justify-center">
                            {header.previewUrl || header.handle ? <img src={header.previewUrl || header.handle} className="w-full h-full object-cover" alt="WA" /> : <ImageIcon className="h-8 w-8 opacity-20" />}
                          </div>
                        )}
                        <p className="text-[13px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap leading-relaxed">
                          {body?.text || previewData.body || 'Message content...'}
                        </p>
                        {footer?.text && <p className="text-[10px] text-[#667781] dark:text-[#8696a0] mt-1 italic">{footer.text}</p>}
                        {buttons.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-black/5 space-y-1">
                            {buttons.map((btn: any, i: number) => (
                              <div key={i} className="text-center py-1 text-[11px] font-bold text-[#00a884]">{btn.text || 'Button'}</div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="flex justify-end mt-1"><span className="text-[8px] opacity-40 uppercase tracking-tighter">10:45 AM</span></div>
                </div>
             ) : (
               <div className="p-4 rounded-2xl max-w-[92%] shadow-sm relative animate-in slide-in-from-left-2 duration-300 bg-zinc-100 dark:bg-zinc-800 rounded-tl-sm border border-zinc-200 dark:border-zinc-700">
                <p className="text-[13px] sm:text-[14px] leading-relaxed text-foreground font-medium">
                  {previewData.body || previewData.template_text || 'SMS Message content will appear here...'}
                </p>
                {smsFormData.temp_id && (
                  <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Template ID</span>
                    <span className="text-[9px] font-mono text-blue-500 bg-blue-500/10 px-1.5 rounded">{smsFormData.temp_id}</span>
                  </div>
                )}
                <div className="flex justify-end mt-2"><span className="text-[9px] opacity-40 font-bold uppercase tracking-widest">12:34 PM</span></div>
              </div>
             )}
           </div>

           {/* Buttons Support */}
           {previewData.buttons?.length > 0 && !isWA && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {previewData.buttons.map((btn: any, i: number) => (
                    <div key={i} className="bg-white dark:bg-zinc-800 border border-blue-500/30 text-blue-500 rounded-lg px-4 py-1.5 text-[11px] font-bold shadow-sm cursor-default">
                      {btn.displayText || btn.label}
                    </div>
                  ))}
                </div>
           )}
        </div>

        {/* Bottom Indicator */}
        <div className="h-6 pb-2 flex justify-center items-end bg-transparent"><div className="w-20 sm:w-24 h-1 bg-zinc-400/30 rounded-full" /></div>
      </div>
    );
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 space-y-4 sm:space-y-6 bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" /> Templates
          </h1>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">Manage your multi-channel message templates</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="outline" size="sm" onClick={handleRefreshTemplates} disabled={refreshing} className="bg-card border-border h-9 text-xs sm:text-sm">
            <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2", refreshing && "animate-spin")} /> Refresh
          </Button>
          <Button className="gradient-primary shadow-lg font-bold border-none h-9 text-xs sm:text-sm" onClick={() => { setEditingTemplate(null); resetTemplateForm(); setIsTemplateOpen(true); }}>
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2" /> Create Template
          </Button>
        </div>
      </div>

      <Card className="rounded-xl border-border bg-card shadow-sm">
        <CardContent className="p-3 sm:p-4 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0 sm:min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-10 h-9 sm:h-10 bg-muted/20 border-border text-sm"
            />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Select value={channelFilter} onValueChange={(v: any) => { setChannelFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-10 bg-muted/20 border-border text-foreground text-xs sm:text-sm"><SelectValue placeholder="Channels" /></SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="rcs">RCS</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="voicebot">AI VoiceBot</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v: any) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-10 bg-muted/20 border-border text-foreground text-xs sm:text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Card key={i} className="h-52 sm:h-64 animate-pulse bg-muted/40 border-border rounded-xl" />)}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card className="rounded-xl border-border bg-card py-12 sm:py-20 text-center">
          <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4"><FileText className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground" /></div>
          <h3 className="text-lg sm:text-xl font-semibold text-foreground">No templates found</h3>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="rounded-xl border-border bg-card shadow-sm hover:shadow-md transition-all border-b-4 border-b-transparent hover:border-b-primary flex flex-col h-full relative">
              {/* Channel Badge */}
              <div className={cn(
                "absolute top-0 right-0 font-semibold text-[9px] sm:text-[10px] uppercase px-2 sm:px-3 py-1 sm:py-1.5 rounded-bl-xl border-b border-l",
                template.channel === 'rcs' && 'bg-blue-500/10 text-blue-600 border-blue-500/20',
                template.channel === 'whatsapp' && 'bg-green-500/10 text-green-600 border-green-500/20',
                template.channel === 'sms' && 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                template.channel === 'email' && 'bg-orange-500/10 text-orange-600 border-orange-500/20',
                template.channel === 'voicebot' && 'bg-purple-500/10 text-purple-600 border-purple-500/20'
              )}>
                {template.channel === 'whatsapp' ? 'WhatsApp' : template.channel === 'voicebot' ? 'AI Voice' : template.channel.toUpperCase()}
              </div>
              <CardHeader className="pb-2 sm:pb-3 pt-4 sm:pt-6 px-4 sm:px-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 sm:space-y-1.5 min-w-0 flex-1">
                    <CardTitle className="text-sm sm:text-lg font-bold text-primary truncate">{template.name}</CardTitle>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <Badge variant="outline" className="bg-muted/50 border-none text-[9px] sm:text-[10px]">{template.category}</Badge>
                      <Badge variant={template.status === 'approved' ? 'secondary' : 'outline'} className="capitalize text-[9px] sm:text-[10px]">{template.status}</Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0"><MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 sm:w-56 rounded-xl border-border bg-card shadow-xl p-1.5">
                      <DropdownMenuItem onClick={() => { setPreviewTemplate(template); setIsPreviewOpen(true); }} className="rounded-lg h-9 sm:h-10 font-medium hover:bg-muted text-xs sm:text-sm"><Eye className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)} className="rounded-lg h-9 sm:h-10 font-medium hover:bg-muted text-xs sm:text-sm"><Edit className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuSeparator className="mx-1 my-1.5 bg-muted" />
                      <DropdownMenuItem onClick={() => handleDeleteTemplate(template.id)} className="rounded-lg h-9 sm:h-10 font-medium text-rose-600 hover:bg-rose-50 text-xs sm:text-sm"><Trash2 className="mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 pt-0 flex-1 flex flex-col">
                <div className="p-3 sm:p-4 rounded-xl bg-muted/30 text-xs sm:text-sm border border-border/50 min-h-[60px] sm:min-h-[80px] flex items-center">
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
        <DialogContent className={cn("max-w-[100vw] sm:max-w-[95vw] w-full p-0 overflow-hidden bg-card border-border shadow-2xl rounded-none sm:rounded-3xl h-[100dvh] sm:h-auto", templateStep === 'channel' ? "sm:max-w-2xl sm:h-auto" : "sm:max-w-5xl sm:h-[90vh]")}>
          <DialogHeader className="p-4 sm:p-6 pb-2">
            <DialogTitle className="text-base sm:text-lg">{templateStep === 'channel' ? 'Select Channel' : 'Configure Template'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col lg:flex-row h-full overflow-hidden">
            <ScrollArea className="flex-1">
              {templateStep === 'channel' ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 sm:p-6">
                  {[
                    { id: 'whatsapp', name: 'WhatsApp', icon: MessageSquare, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
                    { id: 'rcs', name: 'RCS', icon: Sparkles, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                    { id: 'sms', name: 'SMS', icon: Smartphone, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                    { id: 'email', name: 'Email', icon: Mail, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
                    { id: 'voicebot', name: 'AI VoiceBot', icon: Mic, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
                  ].map((chan) => (
                    <button key={chan.id} onClick={() => { setNewTemplate({ ...newTemplate, channel: chan.id as any }); setTemplateStep('form'); }} className="group flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-border bg-card hover:border-primary transition-all">
                        <div className={cn("p-3 sm:p-4 rounded-xl sm:rounded-2xl mb-2 sm:mb-4", chan.bg)}><chan.icon className={cn("h-6 w-6 sm:h-8 sm:w-8", chan.color)} /></div>
                        <span className="font-bold text-sm sm:text-base">{chan.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                   {newTemplate.channel === 'rcs' && <RCSTemplateForm data={newTemplate} onChange={setNewTemplate} onFileChange={setSelectedFile} onCarouselFileChange={(idx, file) => setCarouselFiles(p => ({ ...p, [idx]: file }))} />}
                   {newTemplate.channel === 'whatsapp' && <WhatsAppTemplateForm data={newTemplate} onChange={setNewTemplate} />}
                   {newTemplate.channel === 'email' && <EmailTemplateForm data={newTemplate} onChange={setNewTemplate} />}
                   {newTemplate.channel === 'voicebot' && <VoiceTemplateForm data={newTemplate} onChange={setNewTemplate} onFileChange={setSelectedFile} />}
                   {newTemplate.channel === 'sms' && (
                     <div className="space-y-4">
                       <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                         📋 SMS templates are stored in your DLT Template registry. Fill in the details exactly as registered on the DLT portal.
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                         <div className="space-y-2">
                           <Label className="text-sm font-medium">Sender ID (Header) <span className="text-red-500">*</span></Label>
                           <Input placeholder="e.g. CMTLTD" value={smsFormData.sender} onChange={(e) => setSmsFormData(p => ({ ...p, sender: e.target.value }))} />
                         </div>
                         <div className="space-y-2">
                           <Label className="text-sm font-medium">DLT Template ID <span className="text-red-500">*</span></Label>
                           <Input placeholder="e.g. 1107172914970106513" value={smsFormData.temp_id} onChange={(e) => setSmsFormData(p => ({ ...p, temp_id: e.target.value }))} />
                         </div>
                       </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Template Name</Label>
                        <Input placeholder="e.g. SVT_NEW" value={smsFormData.temp_name} onChange={(e) => setSmsFormData(p => ({ ...p, temp_name: e.target.value }))} />
                      </div>
                       <div className="space-y-2">
                         <Label className="text-sm font-medium">Template Text <span className="text-red-500">*</span></Label>
                         <Textarea
                           placeholder="Your OTP is {#var#}. Valid for 10 minutes."
                           value={smsFormData.template_text}
                           onChange={(e) => setSmsFormData(p => ({ ...p, template_text: e.target.value }))}
                           rows={4}
                           className="resize-none"
                         />
                         <p className="text-xs text-muted-foreground">
                           Use <code className="bg-muted px-1 rounded">{'{#var#}'}</code> or <code className="bg-muted px-1 rounded">{'{dynamic}'}</code> for variable placeholders · {smsFormData.template_text.length} chars
                         </p>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                         <div className="space-y-2">
                           <Label className="text-sm font-medium">Template Type</Label>
                           <Select value={smsFormData.temp_type} onValueChange={(v) => setSmsFormData(p => ({ ...p, temp_type: v }))}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Transactional">Transactional</SelectItem>
                               <SelectItem value="Service Implicit">Service Implicit</SelectItem>
                               <SelectItem value="Service Explicit">Service Explicit</SelectItem>
                               <SelectItem value="Promotional">Promotional</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         <div className="space-y-2">
                           <Label className="text-sm font-medium">Status</Label>
                           <Select value={smsFormData.status} onValueChange={(v) => setSmsFormData(p => ({ ...p, status: v as 'Y' | 'N' }))}>
                             <SelectTrigger><SelectValue /></SelectTrigger>
                             <SelectContent>
                               <SelectItem value="Y">✓ Active</SelectItem>
                               <SelectItem value="N">✗ Inactive</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>
                     </div>
                   )}
                   <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 sm:pt-6">
                      <Button variant="outline" className="flex-1 h-10 sm:h-12 rounded-xl text-sm" onClick={() => setTemplateStep('channel')}>Back</Button>
                      {newTemplate.channel === 'sms' ? (
                        <Button className="flex-[2] h-10 sm:h-12 rounded-xl gradient-primary text-sm" onClick={handleSaveSmsTemplate} disabled={savingSms}>
                          {savingSms ? '⏳ Saving...' : '💾 Save SMS Template'}
                        </Button>
                      ) : (
                        <Button className="flex-[2] h-10 sm:h-12 rounded-xl gradient-primary text-sm" onClick={() => handleSaveTemplate(false)}>{editingTemplate ? 'Update' : 'Save & Submit'}</Button>
                      )}
                   </div>
                </div>
              )}
            </ScrollArea>
            {templateStep !== 'channel' && (
              <div className="hidden lg:flex flex-col bg-muted/20 p-4 h-full border-l border-border min-w-[280px] xl:min-w-[320px]">
                <h3 className="text-center font-bold text-muted-foreground uppercase text-[10px] tracking-widest mb-4">Live Preview</h3>
                <div className="flex-1 flex flex-col items-center justify-center overflow-y-auto no-scrollbar">{renderPhonePreview()}</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-[100vw] sm:max-w-3xl w-full p-0 bg-card border-border shadow-2xl rounded-none sm:rounded-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
          {previewTemplate && (() => {
            const t = previewTemplate;
            const meta = (() => { try { return typeof t.metadata === 'string' ? JSON.parse(t.metadata) : (t.metadata || {}); } catch (e2) { return {}; } })();
            const components: any[] = (t as any).components || meta.components || [];
            const headerComp = components.find((c: any) => c.type === 'HEADER');
            const bodyComp   = components.find((c: any) => c.type === 'BODY');
            const footerComp = components.find((c: any) => c.type === 'FOOTER');
            const btnComps   = components.filter((c: any) => c.type === 'BUTTONS');
            const bodyText   = bodyComp?.text || t.body || '';
            const footerText = footerComp?.text || t.footer || '';
            const channelColorMap: Record<string,string> = { whatsapp: '#25D366', rcs: '#1A73E8', sms: '#F59E0B', email: '#F97316', voicebot: '#8B5CF6' };
            const channelColor = channelColorMap[t.channel] || '#6366F1';
            const allBtns: any[] = [...btnComps.flatMap((b: any) => b.buttons || []), ...(t.buttons || [])];

            return (
              <>
                {/* Header bar */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${channelColor}22` }}>
                      <span className="text-base">{t.channel === 'whatsapp' ? '💬' : t.channel === 'rcs' ? '✨' : t.channel === 'sms' ? '📱' : t.channel === 'email' ? '📧' : '🎙️'}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm sm:text-base text-foreground truncate">{t.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: channelColor }}>{t.channel === 'voicebot' ? 'AI Voice' : t.channel}</span>
                        <Badge variant={t.status === 'approved' ? 'secondary' : 'outline'} className="text-[10px] capitalize">{t.status}</Badge>
                        {t.category && <Badge variant="outline" className="text-[10px]">{t.category}</Badge>}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full shrink-0" onClick={() => setIsPreviewOpen(false)}><X className="h-4 w-4" /></Button>
                </div>

                {/* Preview + details */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col sm:flex-row gap-6 items-start justify-center bg-muted/20">
                  {/* Phone mockup */}
                  <div className="flex-shrink-0 mx-auto">{renderPhonePreview(t)}</div>

                  {/* Details panel */}
                  <div className="flex-1 min-w-0 space-y-3 max-w-sm mx-auto sm:mx-0 w-full">
                    {bodyText && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Message Body</p>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{bodyText}</p>
                      </div>
                    )}

                    {headerComp && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Header · {headerComp.format || headerComp.type}</p>
                        {(headerComp.format === 'IMAGE' || headerComp.format === 'VIDEO') && (headerComp.previewUrl || meta.mediaUrl) ? (
                          <img src={headerComp.previewUrl || meta.mediaUrl} alt="header" className="w-full rounded-lg object-cover max-h-40" />
                        ) : headerComp.text ? (
                          <p className="text-sm font-semibold text-foreground">{headerComp.text}</p>
                        ) : (
                          <div className="h-20 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-xs">📷 {headerComp.format || 'Media'} Header</div>
                        )}
                      </div>
                    )}

                    {t.channel === 'rcs' && meta.mediaUrl && !headerComp && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Media</p>
                        <img src={meta.mediaUrl} alt="RCS media" className="w-full rounded-lg object-cover max-h-40" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />
                      </div>
                    )}

                    {footerText && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Footer</p>
                        <p className="text-xs text-muted-foreground italic">{footerText}</p>
                      </div>
                    )}

                    {allBtns.length > 0 && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Buttons ({allBtns.length})</p>
                        <div className="flex flex-col gap-2">
                          {allBtns.map((btn: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/30 text-sm font-medium">
                              <span>{btn.type === 'PHONE_NUMBER' ? '📞' : btn.type === 'URL' ? '🔗' : '↩️'}</span>
                              <span className="text-foreground">{btn.text || btn.displayText || btn.label}</span>
                              {(btn.phone_number || btn.url || btn.value) && <span className="ml-auto text-xs text-muted-foreground truncate max-w-[100px]">{btn.phone_number || btn.url || btn.value}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {t.channel === 'rcs' && meta.carouselList?.length > 0 && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Carousel ({meta.carouselList.length} cards)</p>
                        <div className="space-y-2">
                          {meta.carouselList.map((card: any, i: number) => (
                            <div key={i} className="flex gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                              {card.mediaUrl && <img src={card.mediaUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }} />}
                              <div className="min-w-0"><p className="text-sm font-bold text-foreground truncate">{card.title}</p><p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {t.channel === 'voicebot' && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Voice Config</p>
                        <div className="space-y-1 text-sm">
                          {(t as any).template_id && <p className="text-muted-foreground">Audio ID: <span className="font-mono text-foreground">{(t as any).template_id}</span></p>}
                          {meta.retries && <p className="text-muted-foreground">Retries: <span className="text-foreground">{meta.retries}</span></p>}
                          {meta.retry_interval && <p className="text-muted-foreground">Retry Interval: <span className="text-foreground">{meta.retry_interval}s</span></p>}
                        </div>
                      </div>
                    )}

                    {t.channel === 'sms' && (meta.dlt_template_id || meta.sender) && (
                      <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">DLT Info</p>
                        <div className="space-y-1 text-sm">
                          {meta.sender && <p className="text-muted-foreground">Sender ID: <span className="font-bold text-foreground">{meta.sender}</span></p>}
                          {meta.dlt_template_id && <p className="text-muted-foreground">DLT ID: <span className="font-mono text-foreground text-xs">{meta.dlt_template_id}</span></p>}
                          {meta.pe_id && <p className="text-muted-foreground">PE ID: <span className="font-mono text-foreground text-xs">{meta.pe_id}</span></p>}
                        </div>
                      </div>
                    )}

                    <Button className="w-full gradient-primary font-bold h-11 rounded-xl" onClick={() => { setIsPreviewOpen(false); handleCreateCampaignFromTemplate(t); }}>
                      <Zap className="h-4 w-4 mr-2 fill-current" /> Create Campaign
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
