import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, MoreVertical, BarChart3, Edit, Trash2, Eye, Zap, FileText, Clock, X, Image, Video, File, Phone, Link, RefreshCw, Check, Sparkles, TrendingUp, Target, Smartphone, ChevronRight, ChevronLeft, Shield, ChevronsUpDown, Send, MessageSquare, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChannelBadge } from '@/components/ui/channel-icon';
import { templateService, type MessageTemplate, type TemplateButton } from '@/services/templateService';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { RCSTemplateForm } from '@/components/campaigns/RCSTemplateForm';
import { WhatsAppTemplateForm } from '@/components/campaigns/WhatsAppTemplateForm';
import { WhatsAppPreview } from '@/components/campaigns/WhatsAppPreview';
import { rcsTemplatesService, useRCSTemplates } from '@/services/rcsTemplatesService';
import { whatsappService } from '@/services/whatsappService';
import { rcsCampaignApi } from '@/services/rcsCampaignApi';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { type HeaderType } from '@/lib/mockData';

// WhatsApp Business API supported template languages
const templateLanguages = [
  { code: 'en_US', name: 'English (US)' },
  { code: 'en_GB', name: 'English (UK)' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt_BR', name: 'Portuguese (Brazil)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh_CN', name: 'Chinese (Simplified)' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'th', name: 'Thai' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'bn', name: 'Bengali' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'mr', name: 'Marathi' },
  { code: 'te', name: 'Telugu' },
  { code: 'ta', name: 'Tamil' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ur', name: 'Urdu' },
];

export default function Templates() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
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
      console.log('🔄 User detected, fetching templates for:', user.email, 'Page:', page, 'Tab:', templateSubTab);
      fetchTemplates();
    }
  }, [user?.id, user?.rcs_config_id, user?.whatsapp_config_id, page, templateSubTab]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      console.log(`📡 Fetching local templates (Tab: ${templateSubTab}, Page: ${page})...`);
      const templatesRes = templateSubTab === 'pending' && isAdmin
        ? await templateService.getAdminTemplates(page)
        : await templateService.getTemplates(page);
      
      const templatesData = templatesRes.templates;
      setTotalPages(templatesRes.pagination.totalPages);
      setTotalItems(templatesRes.pagination.total);
      
      console.log(`✅ Loaded ${templatesData.length} local templates.`);
      setTemplates(templatesData);

      // Fetch external RCS templates
      const rcsConfigId = (user as any)?.rcs_config_id;
      if (rcsConfigId) {
        console.log('📡 Fetching external RCS templates for config:', rcsConfigId);
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

            console.log(`📥 RCS: Reconciled ${externalTemplates.length} external templates with ${templatesData.filter(p => p.channel === 'rcs').length} local.`);
            setTemplates(prev => {
              // Ensure we use the most fresh data (either from templatesData or prev)
              const baseTemplates = prev.length > 0 ? prev : templatesData;
              const other = baseTemplates.filter(p => p.channel !== 'rcs');
              const localRcs = baseTemplates.filter(p => p.channel === 'rcs');

              const reconciled: MessageTemplate[] = [];

              localRcs.forEach(local => {
                const live = externalTemplates.find(t => t.name === local.name);
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
                  // Keep local template even if not found in live (could be newly created or restricted)
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
          console.warn('RCS template fetch skipped or failed:', rcsErr);
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

            console.log(`📥 WhatsApp: Reconciled ${externalWaTemplates.length} external templates with ${templatesData.filter(p => p.channel === 'whatsapp').length} local.`);
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
          console.warn('WhatsApp template fetch skipped or failed:', waErr);
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

  const [templateAnalyticsOpen, setTemplateAnalyticsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
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

  const allCount = useMemo(() => templates.length, [templates]);
  const pendingCount = useMemo(() => templates.filter(t => t.status === 'pending').length, [templates]);
  const channelCounts = useMemo(() => ({
    whatsapp: templates.filter(t => t.channel === 'whatsapp').length,
    rcs: templates.filter(t => t.channel === 'rcs').length,
    sms: templates.filter(t => t.channel === 'sms').length,
  }), [templates]);
  const statusCounts = useMemo(() => ({
    approved: templates.filter(t => t.status === 'approved').length,
    pending: templates.filter(t => t.status === 'pending').length,
    rejected: templates.filter(t => t.status === 'rejected').length,
  }), [templates]);

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

  const handleSyncTemplate = async (template: MessageTemplate) => {
    try {
      toast({ title: 'Syncing...', description: `Checking status for ${template.name}...` });
      const result = await syncTemplate(template.name);
      setTemplates(prev => prev.map(t =>
        (t.name === template.name || t.id === template.id)
          ? { ...t, status: result.status } as MessageTemplate
          : t
      ));
      toast({ title: 'Status Updated', description: `Template "${template.name}" status is now: ${result.status}` });
    } catch (err: any) {
      toast({ title: 'Sync Failed', description: err.message || 'Could not fetch status from Dotgo', variant: 'destructive' });
    }
  };

  const handleSyncTemplateDetails = async (template: MessageTemplate) => {
    try {
      setRefreshingTemplateId(template.id);
      toast({ title: 'Syncing Details...', description: `Fetching full content for ${template.name} from Dotgo...` });

      const result = await rcsTemplatesService.syncTemplateDetails(template.name);

      if (result.success) {
        toast({
          title: '✅ Sync Complete',
          description: `Full details for "${template.name}" have been synced to your local database.`
        });
        // Full refresh to get the updated DB records
        await fetchTemplates();
      }
    } catch (err: any) {
      console.error('Manual sync details error:', err);
      toast({
        title: 'Sync Failed',
        description: err.message || 'Failed to sync template details',
        variant: 'destructive'
      });
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
            
            // If it's a carousel, we also need to clean the cards inside it
            if (rest.type === 'CAROUSEL' && Array.isArray(rest.cards)) {
              rest.cards = rest.cards.map((card: any) => ({
                ...card,
                components: card.components ? cleanComponents(card.components) : []
              }));
            }
            
            return rest;
          });
        };

        // Validation: Media headers MUST have an example handle
        const mediaHeader = newTemplate.components?.find((c: any) => (c.type === 'HEADER' || c.type === 'header') && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(c.format));
        if (mediaHeader && (!mediaHeader.example?.header_handle?.length || !mediaHeader.example.header_handle[0])) {
            toast({
                title: 'Media Sample Required',
                description: `Please upload a sample ${mediaHeader.format.toLowerCase()} for the header. Meta requires an example to approve media templates.`,
                variant: 'destructive',
            });
            return;
        }

        const templatePayload = {
          name: newTemplate.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          category: (newTemplate.category || 'UTILITY').toUpperCase() as any,
          language: newTemplate.language || 'en_US',
          components: cleanComponents(newTemplate.components || []),
          allow_category_change: true  // Required for Pinbot, safe for Meta too
        };

        console.log('📤 Submitting WhatsApp Template:', JSON.stringify(templatePayload, null, 2));

        await whatsappService.createTemplate(templatePayload);

        toast({
          title: '🎉 WhatsApp Template Submitted',
          description: 'Template has been submitted to Meta/Pinbot for approval.',
        });

        fetchTemplates();
        setIsTemplateOpen(false);
        resetTemplateForm();
      } catch (err: any) {
        console.error('WhatsApp template creation error:', err);
        const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to create WhatsApp template';
        toast({
          title: '❌ Template Creation Failed',
          description: typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg,
          variant: 'destructive',
        });
        return;
      } finally {
        setLoading(false);
      }
    }

    try {
      setLoading(true);
      // Frontend Validation
      if (!newTemplate.name?.trim()) {
        toast({ title: "Validation Error", description: "Template name is required", variant: "destructive" });
        return;
      }

      if (newTemplate.channel === 'rcs' && !isDraft) {
        if (newTemplate.template_type === 'text_message' && !newTemplate.body?.trim()) {
          toast({ title: "Validation Error", description: "Message body is required for text templates", variant: "destructive" });
          return;
        }
        if (newTemplate.template_type === 'rich_card' && !newTemplate.metadata?.cardTitle?.trim() && !newTemplate.body?.trim()) {
          toast({ title: "Validation Error", description: "Rich card requires at least a title or body content", variant: "destructive" });
          return;
        }
      }

      // Map buttons for local database format (label/value) instead of RCS format (displayText/uri)
      const mappedButtons = newTemplate.channel === 'rcs'
        ? newTemplate.buttons.map((btn: any, index: number) => {
          // Map RCS frontend types to Database enum types
          let dbType = 'quick_reply';
          if (btn.type === 'url_action') dbType = 'url';
          if (btn.type === 'dialer_action') dbType = 'phone';

          return {
            type: dbType,
            label: btn.displayText || 'Button',
            value: btn.uri || btn.postback || btn.displayText || '',
            position: index
          };
        })
        : newTemplate.buttons;

      const templateData: any = {
        name: newTemplate.name,
        language: newTemplate.language || 'en_US',
        category: newTemplate.category || 'MARKETING',
        channel: newTemplate.channel,
        status: (isDraft ? 'draft' : (newTemplate.channel === 'rcs' ? 'approved' : 'pending')) as any,
      };

      if (newTemplate.channel === 'whatsapp') {
        const bodyComp = newTemplate.components?.find((c: any) => c.type === 'BODY');
        templateData.body = bodyComp?.text || '';
        templateData.template_type = 'standard';
        templateData.buttons = []; // Meta buttons are complex, maybe map later if needed
        templateData.metadata = { components: newTemplate.components };
      } else {
        // RCS or SMS
        templateData.template_type = newTemplate.template_type === 'text_message' ? 'standard' : newTemplate.template_type;
        templateData.body = newTemplate.body;
        templateData.buttons = mappedButtons;
        templateData.header_type = newTemplate.header?.type || 'none';
        templateData.header_content = newTemplate.header?.content || null;
        templateData.header_file_name = newTemplate.header?.fileName || null;
        templateData.footer = newTemplate.footer || undefined;
      }

      if (newTemplate.channel === 'rcs' && !isDraft) {
        const mapAction = (btn: any) => {
          if (btn.type === 'reply') return { suggestionType: 'reply', displayText: btn.displayText, postback: btn.displayText };
          if (btn.type === 'url_action') return { suggestionType: 'url_action', displayText: btn.displayText, url: btn.uri };
          if (btn.type === 'dialer_action') return { suggestionType: 'dialer_action', displayText: btn.displayText, phoneNumber: btn.uri };
          if (btn.type === 'calendar_event') return {
            suggestionType: 'calendar_event',
            displayText: btn.displayText,
            calendarEvent: {
              startTime: btn.calendar?.startTime,
              endTime: btn.calendar?.endTime,
              title: btn.calendar?.title,
              description: btn.calendar?.description
            }
          };
          if (btn.type === 'view_location_latlong') return {
            suggestionType: 'view_location',
            displayText: btn.displayText,
            location: {
              latitude: parseFloat(btn.location?.latitude),
              longitude: parseFloat(btn.location?.longitude),
              label: btn.location?.label
            }
          };
          if (btn.type === 'view_location_query') return {
            suggestionType: 'view_location',
            displayText: btn.displayText,
            location: { query: btn.payload?.query }
          };
          if (btn.type === 'share_location') return { suggestionType: 'share_location', displayText: btn.displayText };
          return null;
        };

        let rcsDotgoPayload: any = {
          name: newTemplate.name,
          type: newTemplate.template_type,
          fallbackText: newTemplate.body?.substring(0, 100) || 'RCS Message'
        };

        if (newTemplate.template_type === 'text_message') {
          rcsDotgoPayload.textMessageContent = newTemplate.body;
          rcsDotgoPayload.suggestions = newTemplate.buttons?.map(mapAction).filter(Boolean);
        } else if (newTemplate.template_type === 'rich_card') {
          rcsDotgoPayload.orientation = newTemplate.metadata.orientation || 'VERTICAL';
          rcsDotgoPayload.height = newTemplate.metadata.height || 'SHORT_HEIGHT';
          rcsDotgoPayload.standAlone = {
            cardTitle: newTemplate.metadata.cardTitle,
            cardDescription: newTemplate.body,
            mediaUrl: newTemplate.metadata.mediaUrl || undefined,
            suggestions: newTemplate.buttons?.map(mapAction).filter(Boolean)
          };
        } else if (newTemplate.template_type === 'carousel') {
          rcsDotgoPayload.height = newTemplate.metadata.height || 'SHORT_HEIGHT';
          rcsDotgoPayload.width = newTemplate.metadata.width || 'MEDIUM_WIDTH';
          rcsDotgoPayload.carouselList = (newTemplate.metadata.carouselList || []).map((card: any) => ({
            cardTitle: card.title,
            cardDescription: card.description,
            mediaUrl: card.mediaUrl || undefined,
            suggestions: card.buttons?.map(mapAction).filter(Boolean)
          }));
        }

        const rcsFormData = new FormData();
        rcsDotgoPayload.isUpdate = !!editingTemplate;

        // Clean up mediaUrls if files are provided to prevent base64/conflicting errors
        if (selectedFile) {
          if (rcsDotgoPayload.standAlone) {
            rcsDotgoPayload.standAlone.mediaUrl = undefined;
            rcsDotgoPayload.standAlone.fileName = selectedFile.name; // Set fileName for Dotgo
            rcsFormData.append('multimedia_files', selectedFile);
          }
        }

        if (Object.keys(carouselFiles).length > 0) {
          if (rcsDotgoPayload.carouselList) {
            rcsDotgoPayload.carouselList.forEach((card: any, idx: number) => {
              if (carouselFiles[idx]) {
                const file = carouselFiles[idx]!;
                card.mediaUrl = undefined;
                card.fileName = file.name; // Set fileName for Dotgo
                rcsFormData.append('multimedia_files', file);
              }
            });
          }
        }

        rcsFormData.append('rich_template_data', JSON.stringify(rcsDotgoPayload));

        // Use originalName if this is an update to ensure Dotgo finds the right template
        const createResult = await rcsTemplatesService.createTemplate(rcsFormData, editingTemplate?.name);
        if (!createResult.success) {
          toast({ title: 'RCS API Error', description: createResult.message || 'Failed to process template on Dotgo.', variant: 'destructive' });
          return;
        }
      }

      if (editingTemplate) {
        await templateService.updateTemplate(editingTemplate.id, templateData);
        toast({ title: '✅ Template updated', description: 'Your changes have been saved.' });
      } else {
        await templateService.createTemplate(templateData);
        toast({ title: isDraft ? '📝 Draft saved' : '🎉 Template submitted!', description: 'Your template has been processed.' });
      }

      fetchTemplates();
      setIsTemplateOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
    } catch (err: any) {
      console.error('Save template error:', err);
      // Try to extract a clean message from Dotgo JSON if it exists
      let errorMessage = err.message || 'Failed to save template.';
      if (typeof err === 'string' && err.includes('"message":')) {
        try {
          const parsed = JSON.parse(err);
          errorMessage = parsed.error?.message || parsed.message || err;
        } catch (e) { }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }

      toast({
        title: 'Error Saving Template',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const resetTemplateForm = () => {
    setNewTemplate({
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
    setTemplateStep('channel');
    setSelectedFile(null);
    setCarouselFiles({});
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);

    // Reconstruct metadata if it exists as an object, otherwise use defaults
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

      if (template?.channel === 'rcs') {
        try {
          // Always try to delete from Dotgo if it's an RCS template
          await rcsTemplatesService.deleteExternalTemplate(template.name);
        } catch (extErr: any) {
          console.error('Failed to delete from Dotgo:', extErr);
          // Don't block local deletion if external fails (maybe it was already deleted)
        }
      }

      if (template?.channel === 'whatsapp') {
        try {
          await whatsappService.deleteTemplate(template.name);
        } catch (waErr: any) {
          console.error('Failed to delete WhatsApp template:', waErr);
        }
      }

      // Check if it's a local template (ID starts with TPL or is numeric)
      const isLocal = templateId.startsWith('TPL') || !isNaN(Number(templateId));

      if (isLocal) {
        await templateService.deleteTemplate(templateId);
      }

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast({ title: '🗑️ Template deleted', description: 'The template has been removed.' });
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to delete template.', variant: 'destructive' });
    }
  };

  const handleCreateCampaignFromTemplate = (template: MessageTemplate) => {
    // Navigate to campaigns page and trigger creation if possible, or just navigate
    navigate('/campaigns', { state: { templateId: template.id, channel: template.channel } });
  };

  const renderPhonePreview = (data: any = newTemplate) => {
    const getHeaderIcon = () => {
      switch (data.header?.type) {
        case 'image':
          return data.header.content ? (
            <div className="mb-2 rounded-lg overflow-hidden">
              <img src={data.header.content} alt="Header" className="w-full h-auto object-cover" />
            </div>
          ) : (
            <div className="h-32 bg-muted rounded-lg flex items-center justify-center"><Image className="h-8 w-8 text-muted-foreground" /></div>
          );
        case 'text': return data.header.content ? <p className="font-bold text-sm">{data.header.content}</p> : null;
        default: return null;
      }
    };
 
    if (data.channel === 'rcs') {
      const { template_type, metadata, body, buttons } = data;

      const renderCard = (cardData: any, isCarousel = false, index?: number) => {
        const orientation = cardData?.orientation || metadata?.orientation || 'VERTICAL';
        const alignment = cardData?.alignment || metadata?.alignment || 'LEFT';
        const height = cardData?.height || metadata?.height || 'SHORT_HEIGHT';

        // Use preview from local file if available
        const previewUrl = isCarousel && index !== undefined
          ? filePreviews[`carousel_${index}`]
          : filePreviews['main'];

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
                height === 'SHORT_HEIGHT' ? "h-28" : height === 'MEDIUM_HEIGHT' ? "h-36" : "h-48"
              )}>
                <img src={mediaSource} className="w-full h-full object-cover" alt="Card" />
              </div>
            )}
            <div className={cn(
              "p-3 space-y-1 flex-1 flex flex-col justify-center",
              alignment === 'RIGHT' ? "text-right" : "text-left"
            )}>
              {(cardData?.title || cardData?.cardTitle) && (
                <h4 className="text-[13px] font-bold text-[#111b21] dark:text-[#e9edef] truncate leading-tight">{cardData.title || cardData.cardTitle}</h4>
              )}
              <p className="text-[11px] text-[#667781] dark:text-[#8696a0] line-clamp-2 leading-snug">
                {cardData?.description || cardData?.body || body || 'No content...'}
              </p>
              {(cardData?.buttons?.length > 0 || (isCarousel && buttons?.length > 0) || (!isCarousel && buttons?.length > 0)) && (
                <div className="pt-2 flex flex-col gap-1 mt-auto">
                  {(cardData?.buttons || buttons || []).slice(0, 2).map((btn: any, i: number) => (
                    <div key={i} className="text-[11px] py-1.5 border-t border-[#f0f2f5] dark:border-white/5 text-[#00a884] dark:text-[#53bdeb] font-bold text-center hover:bg-black/5 cursor-pointer">
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
        <div className="flex flex-col h-full items-center justify-start py-2 overflow-y-auto max-h-[750px] no-scrollbar w-full">
          <div className="h-full w-[310px] bg-slate-50 dark:bg-[#0b141a] rounded-[2rem] overflow-hidden flex flex-col relative z-10 no-scrollbar shadow-2xl border border-black/5 min-h-[550px]">
              {/* Header */}
              <div className="px-4 pt-5 pb-4 bg-[#1A73E8] text-white flex items-center gap-3 shadow-md border-b border-white/5 relative z-20">
                <ChevronLeft className="h-5 w-5" />
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-[11px] font-bold border border-blue-400/20">
                  RCS
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate tracking-tight">Business Profile</p>
                  <p className="text-[9px] opacity-70 flex items-center gap-0.5">
                    <Shield className="h-2.5 w-2.5" /> Verified Account
                  </p>
                </div>
                <MoreVertical className="h-4 w-4 opacity-70" />
              </div>

              {/* Chat Area */}
              <div className="flex-1 p-4 overflow-y-auto no-scrollbar space-y-4">
                {/* Date Bubble */}
                <div className="flex justify-center">
                  <span className="bg-black/5 dark:bg-white/5 text-[9px] px-2.5 py-0.5 rounded-md text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-widest">
                    Today
                  </span>
                </div>

                {template_type === 'text_message' && (
                  <div className="bg-white dark:bg-[#1f2c33] p-3 rounded-2xl rounded-tl-sm shadow-md border border-black/5 max-w-[90%]">
                    <p className="text-[13px] text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap">{body || 'Type your message...'}</p>
                    <div className="flex justify-end mt-1">
                      <span className="text-[9px] text-[#667781] dark:text-[#8696a0]">10:45 AM</span>
                    </div>
                  </div>
                )}

                {template_type === 'rich_card' && renderCard(metadata)}

                {template_type === 'carousel' && (
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-2 px-2">
                    {(metadata.carouselList || []).length > 0 ? (
                      metadata.carouselList.map((card: any, i: number) => (
                        <div key={i} className="flex-shrink-0">
                          {renderCard(card, true, i)}
                        </div>
                      ))
                    ) : (
                      <div className="w-[200px] h-32 bg-white dark:bg-[#1f2c33] rounded-2xl border-2 border-dashed border-[#f0f2f5] dark:border-white/5 flex items-center justify-center text-[11px] text-muted-foreground">
                        Add Carousel Cards
                      </div>
                    )}
                  </div>
                )}

                {/* Global Chip Actions (suggestions) */}
                {buttons?.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {buttons.map((btn: any, i: number) => (
                      <div key={i} className="px-4 py-2 bg-white dark:bg-[#1f2c33] border border-[#f0f2f5] dark:border-white/10 text-[#00a884] dark:text-[#53bdeb] rounded-full text-[11px] font-bold shadow-sm flex items-center gap-1.5 cursor-pointer hover:bg-black/5">
                        {btn.type === 'url_action' && <Link className="h-3 w-3" />}
                        {btn.type === 'dialer_action' && <Phone className="h-3 w-3" />}
                        {btn.displayText || btn.label || 'Reply'}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottom Bar */}
              <div className="p-3 bg-white dark:bg-[#111b21] border-t dark:border-white/5 flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#f0f2f5] dark:bg-[#1f2b33] flex items-center justify-center">
                  <Plus className="h-4 w-4 text-[#8696a0]" />
                </div>
                <div className="flex-1 h-8 rounded-full bg-[#f0f2f5] dark:bg-[#2a3942] px-3 flex items-center text-[#8696a0] text-[11px]">
                  Type a message
                </div>
              </div>
            </div>
          </div>
      );
    }

    return (
        <div className="flex flex-col h-full items-center justify-start py-8 overflow-y-auto no-scrollbar w-full">
          <div className="w-[280px] bg-[#ECE5DD] dark:bg-[#0b141a] rounded-[2rem] shadow-2xl overflow-hidden relative border border-black/5 min-h-[500px]">
            <div className="bg-[#075E54] text-white px-4 py-4 flex items-center gap-3 shadow-md relative z-20">
              <ChevronRight className="h-5 w-5 rotate-180" />
              <div className="w-8 h-8 rounded-full bg-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-medium">WhatsApp</p>
              </div>
            </div>
            <div className="p-3 h-[calc(100%-120px)] overflow-y-auto">
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[90%] space-y-2">
                {getHeaderIcon()}
                <p className="text-sm whitespace-pre-wrap">{data.body || 'Message body...'}</p>
                {data.footer && <p className="text-xs text-muted-foreground">{data.footer}</p>}
              </div>
            </div>
          </div>
      </div>

    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in w-full max-w-[100vw] overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </div>
            Message Templates
            {!loading && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                {allCount} Total
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Manage your cross-channel message templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefreshTemplates} disabled={refreshing} title="Refresh all templates & statuses" className="h-12 w-12 rounded-xl border-none shadow-lg">
            <RefreshCw className={cn("h-5 w-5", refreshing && "animate-spin")} />
          </Button>
          <Button className="gradient-primary text-white border-none shadow-xl px-6 h-12 font-bold rounded-xl" onClick={() => { setEditingTemplate(null); resetTemplateForm(); setIsTemplateOpen(true); }}>
            <Plus className="h-5 w-5 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Templates', value: allCount, icon: FileText, color: 'text-primary', bgColor: 'bg-primary/10' },
          { label: 'Approved', value: statusCounts.approved, icon: Check, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
          { label: 'Pending', value: statusCounts.pending, icon: Clock, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
          { label: 'Rejected', value: statusCounts.rejected, icon: AlertCircle, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
        ].map((stat, i) => (
          <Card key={i} className="card-elevated border-none shadow-sm hover:shadow-md transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-2xl", stat.bgColor)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={templateSubTab} onValueChange={(v) => setTemplateSubTab(v as 'all' | 'pending')} className="mt-8">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white/50 p-4 rounded-2xl border border-slate-100 shadow-sm">
          {/* <TabsList className="p-1 h-auto flex flex-wrap gap-2 bg-muted/50 rounded-lg w-full xl:w-auto">
            <TabsTrigger value="all" className="flex items-center gap-2 flex-1 xl:flex-none">
              <FileText className="h-4 w-4" />
              All Templates
              <Badge variant="secondary" className="ml-1">{filteredTemplates.length}</Badge>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="pending" className="flex items-center gap-2 flex-1 xl:flex-none">
                <Clock className="h-4 w-4" />
                Pending Approvals
                <Badge variant="outline" className="ml-1 border-amber-500 text-amber-700 bg-amber-50">
                  {pendingCount}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList> */}

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Channel Dropdown */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Select value={channelFilter} onValueChange={(v: any) => setChannelFilter(v)}>
                <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-xl bg-white border-slate-200 focus:ring-primary shadow-sm hover:border-primary/30 transition-all text-xs font-bold">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="rcs">RCS</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Dropdown */}
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-full sm:w-[150px] h-10 rounded-xl bg-white border-slate-200 focus:ring-primary shadow-sm hover:border-primary/30 transition-all text-xs font-bold">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 rounded-xl bg-white border-slate-200 focus:ring-primary shadow-sm w-full text-xs"
              />
            </div>
          </div>
        </div>

        <TabsContent value="all" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full border-muted/20 rounded-2xl">
                  {template.channel === 'whatsapp' && (
                    <div className="absolute top-0 right-0 bg-green-500/10 text-green-600 font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-bl-xl border-b border-l border-green-500/20 z-10">
                      WhatsApp
                    </div>
                  )}
                  {template.channel === 'rcs' && (
                    <div className="absolute top-0 right-0 bg-blue-500/10 text-blue-600 font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-bl-xl border-b border-l border-blue-500/20 z-10">
                      RCS
                    </div>
                  )}

                  <CardHeader className="pb-3 pt-6 px-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <CardTitle className="text-lg font-bold tracking-tight text-primary leading-none">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap pt-1">
                          <Badge variant="outline" className="bg-muted/50 border-none text-[10px] px-2 py-0.5">{template.category}</Badge>
                          {template.status && (
                            <Badge
                              variant={template.status === 'approved' ? 'secondary' : template.status === 'rejected' ? 'destructive' : 'outline'}
                              className={cn(
                                "capitalize text-[10px] px-2 py-0.5",
                                template.status === 'approved' && "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                              )}
                            >
                              {template.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {(template.channel === 'rcs' || template.channel === 'whatsapp') && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors" title="Sync Status" onClick={() => {
                            if (template.channel === 'rcs') handleSyncTemplate(template);
                            else handleRefreshTemplates();
                          }}>
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem onClick={() => {
                              setPreviewTemplate(template);
                              setIsPreviewOpen(true);
                            }} className="gap-2">
                              <Eye className="h-4 w-4" />Preview
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)} className="gap-2"><Edit className="h-4 w-4" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive gap-2 focus:text-destructive" onClick={() => handleDeleteTemplate(template.id)}><Trash2 className="h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col space-y-4 p-6 pt-0">
                    <div className="p-4 rounded-xl bg-muted/30 text-sm border border-muted/20 min-h-[80px] flex flex-col justify-center gap-2">
                       {template.body === 'External Template' ? (
                          <>
                            <div className="flex items-center gap-2 text-amber-600/80 mb-1">
                                <RefreshCw className="h-3 w-3 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Ready to Sync</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground italic">
                               Full content available on provider. Click sync to load locally.
                            </p>
                          </>
                       ) : (
                          <p className="line-clamp-3 text-muted-foreground leading-relaxed text-[13px]">
                             {template.body || 'Media-only Template Content'}
                          </p>
                       )}
                    </div>
                    
                    <Button
                        className={cn(
                            "w-full mt-auto text-white border-none shadow-lg hover:shadow-xl transition-all duration-300 font-bold h-11 rounded-xl",
                            template.body === 'External Template' ? "bg-amber-500 hover:bg-amber-600" : "gradient-primary"
                        )}
                        onClick={() => {
                            if (template.body === 'External Template') {
                                if (template.channel === 'rcs') handleSyncTemplateDetails(template);
                                else handleRefreshTemplates();
                            } else {
                                handleCreateCampaignFromTemplate(template);
                            }
                        }}
                    >
                        {template.body === 'External Template' ? (
                            <RefreshCw className={cn("h-4 w-4 mr-2", refreshingTemplateId === template.id && "animate-spin")} />
                        ) : (
                            <Zap className="h-4 w-4 mr-2 fill-current" />
                        )}
                        {template.body === 'External Template' ? 'Sync Template' : 'Create Campaign'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination Controls */}
            {(totalPages > 1 || filteredTemplates.length > 20) && (
              <div className="flex items-center justify-between px-2 py-8 mt-4 border-t border-slate-100">
                <p className="text-sm text-muted-foreground">
                  Showing <span className="font-medium">{(page - 1) * 20 + 1}</span> to{" "}
                  <span className="font-medium">{Math.min(page * 20, totalItems)}</span> of{" "}
                  <span className="font-medium">{totalItems}</span> templates
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === 1}
                    className="rounded-xl"
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
                          className={cn(
                              "w-9 h-9 p-0 rounded-xl",
                              page === pageNum ? "bg-primary text-white shadow-lg shadow-primary/20" : ""
                          )}
                          onClick={() => {
                              setPage(pageNum);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                        setPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={page === totalPages}
                    className="rounded-xl"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
            </>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {[1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted shadow-none rounded-2xl" />)}
             </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.filter(t => t.status === 'pending').map((template) => (
                  <Card key={template.id} className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 flex flex-col h-full border-muted/20 rounded-2xl">
                     <div className="absolute top-0 right-0 bg-amber-500/10 text-amber-600 font-semibold text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-bl-xl border-b border-l border-amber-500/20 z-10">
                        Pending
                      </div>
                      <CardHeader className="pb-3 pt-6 px-6">
                        <CardTitle className="text-lg font-bold tracking-tight text-primary">{template.name}</CardTitle>
                        <Badge variant="outline" className="w-fit">{template.channel.toUpperCase()}</Badge>
                      </CardHeader>
                      <CardContent className="flex-1 px-6 pb-6 pt-0 flex flex-col">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100 italic">
                          "{template.body}"
                        </p>
                        <div className="flex gap-2 mt-auto">
                          <Button 
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold h-11 rounded-xl"
                            onClick={() => handleApproveTemplate(template.id, 'approved')}
                          >
                            Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-bold h-11 rounded-xl"
                            onClick={() => handleApproveTemplate(template.id, 'rejected')}
                          >
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                  </Card>
                ))}
              </div>
              
              {templates.filter(t => t.status === 'pending').length === 0 && (
                <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed border-muted/50">
                  <Clock className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                  <h3 className="text-lg font-bold text-slate-400">No Pending Approvals</h3>
                  <p className="text-sm text-slate-400">All templates have been processed.</p>
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-8 mt-4 border-t border-slate-100">
                  <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="rounded-xl">Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-xl">Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Template View/Edit Dialog */}
      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className={cn(
          "max-w-[95vw] w-full transition-all duration-300 no-scrollbar p-0 overflow-hidden bg-white sm:rounded-3xl border-none shadow-2xl",
          templateStep === 'channel' ? "sm:max-w-2xl" : "sm:max-w-5xl h-[90vh]"
        )}>
          <DialogHeader className={cn(
            "p-6 pb-2",
            templateStep === 'channel' && "text-center"
          )}>
            <DialogTitle className={cn(templateStep === 'channel' && "text-2xl font-bold")}>
              {templateStep === 'channel' ? 'Select Channel' : (editingTemplate ? 'Edit Template' : 'Configure Template')}
            </DialogTitle>
            <DialogDescription className={cn(templateStep === 'channel' && "text-base")}>
              {templateStep === 'channel'
                ? 'Choose a channel for your template to get started'
                : `Fill in the details for your ${newTemplate.channel.toUpperCase()} template`}
            </DialogDescription>
          </DialogHeader>

          <div className={cn(
            "grid gap-0 h-[calc(90vh-100px)]",
            templateStep === 'channel' ? "grid-cols-1 w-full overflow-y-auto" : "lg:grid-cols-2"
          )}>
            {/* Form Side - Scrollable */}
            <ScrollArea className="h-full">
              <div className={cn(
                "p-8 pt-2 space-y-6",
                templateStep === 'channel' && "max-w-xl mx-auto"
              )}>
                {templateStep === 'channel' ? (
                  <div className="space-y-6 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        {
                          id: 'whatsapp',
                          title: 'WhatsApp Business',
                          description: 'Rich templates with headers, interactive buttons & high-engagement media.',
                          icon: <MessageSquare className="h-7 w-7 text-green-600" />,
                          bg: "bg-green-50",
                          hover: "hover:bg-green-100",
                          border: "border-green-100",
                          accent: "bg-green-600",
                          enabled: user?.channels_enabled?.includes('whatsapp')
                        },
                        {
                          id: 'rcs',
                          title: 'RCS Messaging',
                          description: 'Next-gen rich messaging with carousels, rich cards & suggested actions.',
                          icon: <Sparkles className="h-7 w-7 text-blue-600" />,
                          bg: "bg-blue-50",
                          hover: "hover:bg-blue-100",
                          border: "border-blue-100",
                          accent: "bg-blue-600",
                          enabled: user?.channels_enabled?.includes('rcs')
                        },
                        {
                          id: 'sms',
                          title: 'SMS Gateway',
                          description: 'Reliable, text-only messages delivered instantly to any mobile device.',
                          icon: <Smartphone className="h-7 w-7 text-amber-600" />,
                          bg: "bg-amber-50",
                          hover: "hover:bg-amber-100",
                          border: "border-amber-100",
                          accent: "bg-amber-600",
                          enabled: user?.channels_enabled?.includes('sms')
                        }
                      ].filter(c => c.enabled).map((channel) => (
                        <Card
                          key={channel.id}
                          className={cn(
                            "group relative overflow-hidden h-full border-2 transition-all duration-300 cursor-pointer hover:shadow-xl active:scale-[0.98]",
                            "border-transparent hover:border-primary/20 bg-muted/30"
                          )}
                          onClick={() => {
                            setNewTemplate({
                              ...newTemplate,
                              channel: channel.id,
                              template_type: channel.id === 'rcs' ? 'text_message' : 'standard',
                              components: channel.id === 'whatsapp' ? [{ type: 'BODY', text: '' }] : undefined
                            });
                            setTemplateStep('form');
                          }}
                        >
                          <CardContent className="p-6 flex flex-col items-center text-center space-y-4 h-full animate-in fade-in zoom-in-95 duration-500">
                            <div className={cn(
                              "w-16 h-16 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300",
                              channel.bg
                            )}>
                              {channel.icon}
                            </div>
                            <div className="space-y-2">
                              <h3 className="font-bold text-lg text-gray-900 leading-none">{channel.title}</h3>
                              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                                {channel.description}
                              </p>
                            </div>
                            <div className="pt-2 mt-auto w-full">
                              <div className="flex items-center justify-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 duration-300">
                                Get Started <ChevronRight className="h-3 w-3" />
                              </div>
                            </div>
                          </CardContent>
                          <div className={cn("absolute top-0 right-0 w-16 h-16 opacity-10 -mr-8 -mt-8 rounded-full", channel.accent)} />
                        </Card>
                      ))}
                    </div>
                    {(['whatsapp', 'rcs', 'sms'].filter(id => (user?.channels_enabled || []).includes(id)).length === 0) && (
                      <div className="text-center py-12 space-y-4 bg-muted/20 rounded-3xl border border-dashed border-muted-foreground/20">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                          <Zap className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="font-bold text-lg">No Channels Enabled</h3>
                          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                            Please enable channels in your settings page to start creating templates.
                          </p>
                        </div>
                        <Button variant="outline" onClick={() => navigate('/settings?tab=channels')} className="rounded-xl">
                          Go to Settings
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                          {newTemplate.channel === 'whatsapp' ? <MessageSquare className="h-5 w-5 text-green-600" /> : <Sparkles className="h-5 w-5 text-blue-600" />}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-primary uppercase tracking-wider">Channel</p>
                          <h3 className="font-bold text-lg capitalize">{newTemplate.channel}</h3>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setTemplateStep('channel')} className="bg-white hover:bg-gray-50 rounded-xl">
                        Change
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 ml-1">Template Name</Label>
                        <Input
                          placeholder="e.g. order_confirmation"
                          value={newTemplate.name}
                          onChange={e => {
                            const sanitizedValue = e.target.value
                              .replace(/\s+/g, '_')   // Replace spaces with underscores
                              .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters
                              .substring(0, 20);      // Max 20 chars
                            setNewTemplate({ ...newTemplate, name: sanitizedValue });
                          }}
                          className="bg-white border-gray-200 focus:ring-primary h-11 px-4 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 ml-1">Category</Label>
                        <Select value={newTemplate.category} onValueChange={v => setNewTemplate({ ...newTemplate, category: v })}>
                          <SelectTrigger className="bg-white border-gray-200 focus:ring-primary h-11 px-4 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Utility">Utility</SelectItem>
                            <SelectItem value="Authentication">Authentication</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator className="opacity-50" />

                    {newTemplate.channel === 'rcs' ? (
                      <RCSTemplateForm
                        data={newTemplate}
                        onChange={(data) => setNewTemplate(data)}
                        onFileChange={(file) => {
                          setSelectedFile(file);
                          if (file) {
                            setNewTemplate({
                              ...newTemplate,
                              metadata: { ...newTemplate.metadata, isUpload: true }
                            });
                          }
                        }}
                        onCarouselFileChange={(idx, file) => {
                          setCarouselFiles(prev => ({ ...prev, [idx]: file }));
                        }}
                      />
                    ) : newTemplate.channel === 'whatsapp' ? (
                      <WhatsAppTemplateForm
                        data={newTemplate}
                        onChange={(data) => setNewTemplate(data)}
                      />
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-bold text-gray-700 ml-1">Message Content</Label>
                          <Textarea
                            value={newTemplate.body}
                            onChange={e => setNewTemplate({ ...newTemplate, body: e.target.value })}
                            rows={6}
                            placeholder="Type your message here... Use {{1}} for variables."
                            className="bg-white border-gray-200 focus:ring-primary p-4 rounded-2xl resize-none text-sm"
                          />
                          <p className="text-[11px] text-muted-foreground ml-1">Tips: Use dynamic variables like {"{{1}}"}, {"{{2}}"} etc.</p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end items-center pt-6 gap-3">
                      <Button variant="ghost" onClick={() => setIsTemplateOpen(false)} className="rounded-xl px-6">
                        Discard
                      </Button>
                      <Button className="gradient-primary text-white border-none shadow-xl px-8 h-12 font-bold rounded-xl" onClick={() => handleSaveTemplate()}>
                        {editingTemplate ? 'Update Changes' : 'Create Template'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Preview Side - Sticky/Fixed */}
            {templateStep !== 'channel' && (
              <div className="hidden lg:flex flex-col bg-muted/20 p-4 h-full sticky top-0 overflow-hidden border-l border-border relative">
                <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent pointer-events-none" />
                <h3 className="absolute top-4 left-0 right-0 text-center font-bold text-muted-foreground uppercase text-[10px] tracking-widest z-20">Live Preview</h3>
                <div className="relative z-10 flex-1 flex flex-col items-center justify-center overflow-y-auto no-scrollbar pt-8">
                  {newTemplate.channel === 'whatsapp' ? (
                    <WhatsAppPreview data={newTemplate} />
                  ) : (
                    renderPhonePreview()
                  )}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Standalone Template Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-fit w-auto max-h-[90vh] p-0 bg-transparent border-none shadow-none flex flex-col items-center justify-center z-[100] outline-none ring-0 overflow-visible [&>button]:hidden">
          {/* Minimal Backdrop - Light Blur only, no color as requested */}
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm -z-10" />

          {previewTemplate && (
            <div className="relative animate-in zoom-in-95 duration-500 origin-center">
              {/* Core Content Only - No Bezel/Frame */}
              <div className="overflow-hidden rounded-[2.5rem] bg-white w-[320px] h-auto max-h-[85vh] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] relative overflow-y-auto no-scrollbar border border-white/10">
                {previewTemplate.channel === 'whatsapp' ? (
                  <WhatsAppPreview data={{
                    ...previewTemplate,
                    components: (previewTemplate as any).components || [
                      { type: 'BODY', text: previewTemplate.body || 'No content provided' },
                      ...(previewTemplate.footer ? [{ type: 'FOOTER', text: previewTemplate.footer }] : []),
                      ...(previewTemplate.header_content ? [{ type: 'HEADER', format: 'TEXT', text: previewTemplate.header_content }] : [])
                    ]
                  }} />
                ) : (
                  <div className="p-4">
                    {renderPhonePreview(previewTemplate)}
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
