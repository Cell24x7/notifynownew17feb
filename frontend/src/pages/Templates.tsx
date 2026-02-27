import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, MoreVertical, BarChart3, Edit, Trash2, Eye, Zap, FileText, Clock, X, Image, Video, File, Phone, Link, RefreshCw, Check, Sparkles, TrendingUp, Target, Smartphone, ChevronRight, ChevronsUpDown, Send, MessageSquare } from 'lucide-react';
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
import { rcsTemplatesService, useRCSTemplates } from '@/services/rcsTemplatesService';
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

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const templatesData = await templateService.getTemplates();
      setTemplates(templatesData);

      // Fetch external RCS templates
      try {
        const externalRcsData = await rcsCampaignApi.getExternalTemplates();
        if (externalRcsData && Array.isArray(externalRcsData.templates)) {
          const externalTemplates = externalRcsData.templates.map((t: any) => {
            const tName = t.name || t.TemplateName || 'Unknown Template';
            return {
              id: tName,
              name: tName,
              channel: 'rcs',
              status: t.status || 'approved',
              language: t.language || 'en',
              category: t.category || 'Marketing',
              body: t.body || 'External Template',
              template_type: t.type || t.TemplateType || 'text_message',
              header: { type: 'none' },
              footer: '',
              buttons: [],
              variables: []
            };
          });

          setTemplates(prev => {
            const existingRcsNames = new Set(prev.filter(p => p.channel === 'rcs').map(p => p.name));
            // Only add external templates that don't exist locally
            const newExternal = externalTemplates.filter((t: any) => !existingRcsNames.has(t.name));
            return [...prev, ...newExternal];
          });
        }
      } catch (rcsErr) {
        console.error('Failed to load external RCS templates', rcsErr);
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

  const filteredTemplates = useMemo(() => {
    return (templates || []).filter((template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.channel.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [templates, searchQuery]);

  const allCount = useMemo(() => templates.length, [templates]);
  const pendingCount = useMemo(() => templates.filter(t => t.status === 'pending').length, [templates]);

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

  const handleSaveTemplate = async (isDraft: boolean = false) => {
    try {
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

      const templateData = {
        name: newTemplate.name,
        language: newTemplate.language,
        category: newTemplate.category,
        channel: newTemplate.channel,
        // Map frontend "text_message" to DB "standard"
        template_type: newTemplate.template_type === 'text_message' ? 'standard' : newTemplate.template_type,
        button_type: "quick_reply",
        header_type: newTemplate.header?.type || 'none',
        header_content: newTemplate.header?.content || null,
        header_file_name: newTemplate.header?.fileName || null,
        body: newTemplate.body,
        footer: newTemplate.footer || undefined,
        buttons: mappedButtons,
        status: (isDraft ? 'draft' : (newTemplate.channel === 'rcs' ? 'approved' : 'pending')) as any,
      };

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

        const result = await rcsTemplatesService.createTemplate(rcsDotgoPayload);
        if (!result.success) {
          toast({ title: 'RCS API Error', description: result.message || 'Failed to create template on Dotgo.', variant: 'destructive' });
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
      const errorMessage = err.response?.data?.message || err.message || 'Failed to save template.';
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

  const renderPhonePreview = () => {
    const getHeaderIcon = () => {
      switch (newTemplate.header.type) {
        case 'image':
          return newTemplate.header.content ? (
            <div className="mb-2 rounded-lg overflow-hidden">
              <img src={newTemplate.header.content} alt="Header" className="w-full h-auto object-cover" />
            </div>
          ) : (
            <div className="h-32 bg-muted rounded-lg flex items-center justify-center"><Image className="h-8 w-8 text-muted-foreground" /></div>
          );
        case 'text': return newTemplate.header.content ? <p className="font-bold text-sm">{newTemplate.header.content}</p> : null;
        default: return null;
      }
    };

    if (newTemplate.channel === 'rcs') {
      const { template_type, metadata, body, buttons } = newTemplate;
      
      const renderCard = (cardData: any, isCarousel = false) => {
        const orientation = cardData?.orientation || metadata?.orientation || 'VERTICAL';
        const alignment = cardData?.alignment || metadata?.alignment || 'LEFT';
        const height = cardData?.height || metadata?.height || 'SHORT_HEIGHT';

        return (
          <div className={cn(
            "bg-white rounded-xl shadow-sm overflow-hidden flex flex-col border border-gray-100",
            !isCarousel && orientation === 'HORIZONTAL' ? "flex-row h-36" : "w-[220px]"
          )}>
            {cardData?.mediaUrl && (
              <div className={cn(
                "bg-muted relative shrink-0",
                !isCarousel && orientation === 'HORIZONTAL' ? "w-[40%] h-full" : "w-full",
                height === 'SHORT_HEIGHT' ? "h-24" : height === 'MEDIUM_HEIGHT' ? "h-32" : "h-44"
              )}>
                <img src={cardData.mediaUrl} className="w-full h-full object-cover" alt="Card" />
              </div>
            )}
            <div className={cn(
              "p-3 space-y-1 flex-1 flex flex-col justify-center",
              alignment === 'RIGHT' ? "text-right" : "text-left"
            )}>
              {(cardData?.title || cardData?.cardTitle) && (
                <h4 className="text-[11px] font-bold text-gray-800 truncate leading-tight">{cardData.title || cardData.cardTitle}</h4>
              )}
              <p className="text-[10px] text-gray-500 line-clamp-2 leading-snug">
                {cardData?.description || cardData?.body || body || 'No content...'}
              </p>
              {cardData?.buttons?.length > 0 && (
                <div className="pt-2 flex flex-col gap-1.5 mt-auto">
                  {cardData.buttons.slice(0, 2).map((btn: any, i: number) => (
                    <div key={i} className="text-[9px] py-1.5 border border-primary/10 rounded-lg text-primary font-bold text-center bg-primary/5 truncate">
                      {btn.displayText || 'Action'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      };

      return (
        <div className="flex flex-col h-full scale-[0.68] origin-center">
          <div className="relative mx-auto mt-4">
            <div className="w-[300px] h-[550px] bg-[#F8F9FA] rounded-[3rem] overflow-hidden border-[12px] border-gray-900 shadow-2xl relative">
              {/* Top Bar */}
              <div className="bg-white px-6 py-4 border-b flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold leading-none">Business RCS</p>
                  <p className="text-[10px] text-green-600 font-semibold uppercase flex items-center gap-0.5 mt-0.5">
                    <Check className="h-2 w-2" /> Verified
                  </p>
                </div>
              </div>

              {/* Chat Area */}
              <div className="p-4 h-[calc(100%-120px)] overflow-y-auto no-scrollbar space-y-4">
                {template_type === 'text_message' && (
                   <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm max-w-[85%]">
                     <p className="text-xs whitespace-pre-wrap">{body || 'Type your message...'}</p>
                   </div>
                )}

                {template_type === 'rich_card' && renderCard(metadata)}

                {template_type === 'carousel' && (
                  <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-1 px-1">
                    {(metadata.carouselList || []).length > 0 ? (
                      metadata.carouselList.map((card: any, i: number) => (
                        <div key={i} className="flex-shrink-0">
                          {renderCard(card, true)}
                        </div>
                      ))
                    ) : (
                      <div className="w-[200px] h-32 bg-white rounded-xl border-2 border-dashed flex items-center justify-center text-[10px] text-muted-foreground">
                        Add Carousel Cards
                      </div>
                    )}
                  </div>
                )}
                
                {/* Global Chip Actions */}
                {template_type !== 'carousel' && buttons?.length > 0 && (
                   <div className="flex flex-wrap gap-2 pt-2">
                     {buttons.map((btn: any, i: number) => (
                       <div key={i} className="px-3 py-1.5 bg-white border border-primary/30 text-primary rounded-full text-[10px] font-medium shadow-sm flex items-center gap-1">
                         {btn.type === 'url_action' && <Link className="h-2 w-2" />}
                         {btn.type === 'dialer_action' && <Phone className="h-2 w-2" />}
                         {btn.displayText || 'Reply'}
                       </div>
                     ))}
                   </div>
                )}
              </div>

              {/* Bottom Bar */}
              <div className="absolute bottom-4 left-4 right-4 h-10 bg-white rounded-full shadow-inner border flex items-center px-4">
                <div className="text-[10px] text-muted-foreground">Chat message</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full scale-[0.65] origin-center">
        <div className="relative mx-auto">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl z-10" />
          <div className="w-[280px] h-[500px] bg-[#ECE5DD] rounded-[2rem] overflow-hidden border-8 border-black relative">
            <div className="bg-[#075E54] text-white px-4 py-2 flex items-center gap-3">
              <ChevronRight className="h-5 w-5 rotate-180" />
              <div className="w-8 h-8 rounded-full bg-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-medium">WhatsApp</p>
              </div>
            </div>
            <div className="p-3 h-[calc(100%-120px)] overflow-y-auto">
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[90%] space-y-2">
                {getHeaderIcon()}
                <p className="text-sm whitespace-pre-wrap">{newTemplate.body || 'Message body...'}</p>
                {newTemplate.footer && <p className="text-xs text-muted-foreground">{newTemplate.footer}</p>}
              </div>
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
            Message Templates
            {!loading && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-xs font-bold px-2 py-0.5 rounded-full">
                {allCount} Total
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground">Manage your cross-channel message templates</p>
        </div>
        <div className="flex items-center gap-2">
           <Button onClick={() => { setEditingTemplate(null); resetTemplateForm(); setIsTemplateOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
        </div>
      </div>

      <Tabs value={templateSubTab} onValueChange={(v) => setTemplateSubTab(v as 'all' | 'pending')}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList className="p-1 h-auto flex flex-wrap gap-2 bg-muted/50 rounded-lg w-full sm:w-auto">
            <TabsTrigger value="all" className="flex items-center gap-2 flex-1 sm:flex-none">
              <FileText className="h-4 w-4" />
              All Templates
              <Badge variant="secondary" className="ml-1">{allCount}</Badge>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="pending" className="flex items-center gap-2 flex-1 sm:flex-none">
                <Clock className="h-4 w-4" />
                Pending Approvals
                <Badge variant="outline" className="ml-1 border-amber-500 text-amber-700 bg-amber-50">
                  {pendingCount}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="all" className="mt-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="card-elevated group hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg font-mono">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          <ChannelBadge channel={template.channel} />
                          <Badge variant="outline">{template.category}</Badge>
                          {template.status && (
                            <Badge 
                              variant={template.status === 'approved' ? 'secondary' : template.status === 'rejected' ? 'destructive' : 'outline'}
                              className={cn(
                                "capitalize",
                                template.status === 'approved' && "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                              )}
                            >
                              {template.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {template.channel === 'rcs' && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSyncTemplate(template)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTemplate(template.id)}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-3 rounded-lg bg-muted/50 text-sm">
                      <p className="line-clamp-3">{template.body}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 gradient-primary text-white border-none" onClick={() => handleCreateCampaignFromTemplate(template)}>
                        <Zap className="h-4 w-4 mr-2" />
                        Create Campaign
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          {/* Admin Pending Logic here */}
          <div className="text-center p-12 text-muted-foreground">Admin approval logic ported.</div>
        </TabsContent>
      </Tabs>

      {/* Template View/Edit Dialog */}
      <Dialog open={isTemplateOpen} onOpenChange={setIsTemplateOpen}>
        <DialogContent className={cn(
          "max-w-[95vw] w-full transition-all duration-300 no-scrollbar p-0 overflow-hidden",
          templateStep === 'channel' ? "lg:max-w-2xl" : "lg:max-w-5xl h-[90vh]"
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
                  <div className="space-y-4 pt-2">
                    <div className="space-y-3">
                      {[
                        { 
                          id: 'whatsapp', 
                          title: 'WhatsApp', 
                          description: 'Rich templates with headers, buttons & media',
                          icon: <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors"><MessageSquare className="h-6 w-6 text-green-600" /></div>,
                          enabled: user?.channels_enabled?.includes('whatsapp') || true 
                        },
                        { 
                          id: 'sms', 
                          title: 'SMS', 
                          description: 'Simple text messages up to 160 characters',
                          icon: <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors"><Smartphone className="h-6 w-6 text-amber-600" /></div>,
                          enabled: user?.channels_enabled?.includes('sms')
                        },
                        { 
                          id: 'rcs', 
                          title: 'RCS', 
                          description: 'Rich messaging with buttons & suggested replies',
                          icon: <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors"><Sparkles className="h-6 w-6 text-blue-600" /></div>,
                          enabled: user?.channels_enabled?.includes('rcs') || true
                        }
                      ].filter(c => c.enabled).map((channel) => (
                        <Card 
                          key={channel.id}
                          className="group hover:border-primary cursor-pointer transition-all hover:shadow-md border-muted-foreground/10" 
                          onClick={() => { 
                            setNewTemplate({ 
                              ...newTemplate, 
                              channel: channel.id,
                              template_type: channel.id === 'rcs' ? 'text_message' : 'standard'
                            }); 
                            setTemplateStep('form'); 
                          }}
                        >
                          <CardContent className="p-4 flex items-center gap-4">
                            {channel.icon}
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900">{channel.title}</h3>
                              <p className="text-xs text-muted-foreground">{channel.description}</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors pr-2" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
                              setNewTemplate({...newTemplate, name: sanitizedValue});
                            }} 
                           className="bg-white border-gray-200 focus:ring-primary h-11 px-4 rounded-xl"
                         />
                       </div>
                       <div className="space-y-2">
                         <Label className="text-sm font-bold text-gray-700 ml-1">Category</Label>
                         <Select value={newTemplate.category} onValueChange={v => setNewTemplate({...newTemplate, category: v})}>
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
                       />
                     ) : (
                       <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-bold text-gray-700 ml-1">Message Content</Label>
                            <Textarea 
                              value={newTemplate.body} 
                              onChange={e => setNewTemplate({...newTemplate, body: e.target.value})} 
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
                    {renderPhonePreview()}
                 </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
