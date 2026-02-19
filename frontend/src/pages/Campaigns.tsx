import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Calendar, Send, Pause, Play, MoreVertical, BarChart3, LayoutGrid, List, Edit, Copy, Trash2, Eye, Zap, Users, FileText, Clock, TrendingUp, Target, Sparkles, X, Image, Video, File, Phone, Link, MessageSquare, ChevronRight, Check, ChevronsUpDown, IndianRupee, RefreshCw } from 'lucide-react';
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
import { templateService, type MessageTemplate, type TemplateButton } from '@/services/templateService';
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
import { RCSTemplateForm } from '@/components/campaigns/RCSTemplateForm';
import { rcsTemplatesService } from '@/services/rcsTemplatesService';
import { rcsCampaignApi } from '@/services/rcsCampaignApi';
import { useAuth } from '@/contexts/AuthContext';

// WhatsApp Business API supported template languages
const templateLanguages = [
  { code: 'en_US', name: 'English (US)' },
  { code: 'en_GB', name: 'English (UK)' },
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'es_AR', name: 'Spanish (Argentina)' },
  { code: 'es_ES', name: 'Spanish (Spain)' },
  { code: 'es_MX', name: 'Spanish (Mexico)' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt_BR', name: 'Portuguese (Brazil)' },
  { code: 'pt_PT', name: 'Portuguese (Portugal)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'zh_CN', name: 'Chinese (Simplified)' },
  { code: 'zh_TW', name: 'Chinese (Traditional)' },
  { code: 'zh_HK', name: 'Chinese (Hong Kong)' },
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
  { code: 'he', name: 'Hebrew' },
  { code: 'ms', name: 'Malay' },
  { code: 'fil', name: 'Filipino' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'cs', name: 'Czech' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'nb', name: 'Norwegian' },
  { code: 'el', name: 'Greek' },
  { code: 'sk', name: 'Slovak' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'lt', name: 'Lithuanian' },
  { code: 'lv', name: 'Latvian' },
  { code: 'et', name: 'Estonian' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'sw', name: 'Swahili' },
  { code: 'af', name: 'Afrikaans' },
  { code: 'zu', name: 'Zulu' },
  { code: 'fa', name: 'Persian' },
];

// Date range presets for analytics
const dateRangePresets = ['Today', 'Last 7 Days', 'Last 30 Days', 'This Month', 'Last Month', 'Custom Range'];

export default function Campaigns() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const enabledChannels = user?.channels_enabled || [];

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [activeTab, setActiveTab] = useState<'campaigns' | 'templates'>('campaigns');
  const [templateSubTab, setTemplateSubTab] = useState<'all' | 'pending'>('all');

  useEffect(() => {
    fetchData();
    refreshUser();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [campaignsData, templatesData] = await Promise.all([
        campaignService.getCampaigns(),
        templateService.getTemplates()
      ]);
      setCampaigns(campaignsData);
      setTemplates(templatesData);

      // Fetch external RCS templates
      try {
        const externalRcsData = await rcsCampaignApi.getExternalTemplates();
        if (externalRcsData && Array.isArray(externalRcsData.templates)) {
            console.log('📦 External RCS Templates API Response:', externalRcsData); // DEBUG LOG

            // Map external templates to MessageTemplate format
            const externalTemplates = externalRcsData.templates.map((t: any) => {
                // Handle various potential field names from external API - including TemplateName (PascalCase) from logs
                const tName = t.TemplateName || t.template_name || t.name || t.templateName || t.templateId || (typeof t === 'string' ? t : 'Unknown Template');
                // Use Name as ID if no ID present, or use API ID
                const tId = t.Id ? String(t.Id) : tName;

                return {
                    id: tId, 
                    name: tName,
                    channel: 'rcs',
                    status: 'approved', // External templates are assumed approved
                    language: t.language || 'en',
                    category: t.category || 'Marketing',
                    body: t.body || 'External Template (Preview not available)',
                    header: { type: 'none' },
                    footer: '',
                    buttons: [],
                    variables: []
                };
            });
            
            // Append to templates list, filtering out duplicates if any (by name)
            setTemplates(prev => {
                const existingNames = new Set(prev.filter(p => p.channel === 'rcs').map(p => p.name));
                const newTemplates = externalTemplates.filter((t: any) => !existingNames.has(t.name));
                return [...prev, ...newTemplates];
            });
        }
      } catch (rcsErr) {
        console.error('Failed to load external RCS templates', rcsErr);
        // Don't block loading
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns or templates. Please try again.',
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

  // Template creation/editing state
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [templateStep, setTemplateStep] = useState<'channel' | 'form'>('channel');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [templateType, setTemplateType] = useState<'standard' | 'carousel'>('standard');
  const [newTemplate, setNewTemplate] = useState<Omit<MessageTemplate, 'id' | 'createdAt' | 'usageCount' | 'status'>>({
    name: '',
    language: 'en',
    category: 'Marketing',
    channel: 'rcs',
    templateType: 'standard',
    header: { type: 'none' },
    body: '',
    footer: '',
    buttons: [],
    variables: []
  });// Language selector popover
  const [languagePopoverOpen, setLanguagePopoverOpen] = useState(false);

  const [templateAnalyticsOpen, setTemplateAnalyticsOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [analyticsDateRange, setAnalyticsDateRange] = useState('Last 30 Days');

  // Campaign analytics modal
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const filteredCampaigns = (campaigns || []).filter((campaign) =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleApproveTemplate = async (templateId: string, status: 'approved' | 'rejected') => {
    try {
      await templateService.updateTemplateStatus(templateId, status);
      fetchData();
      toast({
        title: status === 'approved' ? '✅ Template Approved' : '❌ Template Rejected',
        description: `Template status has been updated to ${status}.`,
      });
    } catch (err: any) {
      console.error('Approve template error:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to update template status',
        variant: 'destructive',
      });
    }
  };

  const handleSyncTemplate = async (templateId: string) => {
    try {
      toast({ title: 'Syncing...', description: 'Checking status with Vi RBM...' });
      await templateService.syncTemplate(templateId);
      fetchData();
      toast({ title: 'Synced', description: 'Template status updated.' });
    } catch (err: any) {
      console.error('Sync error:', err);
      toast({ title: 'Sync Failed', description: 'Could not fetch status from Vi RBM', variant: 'destructive' });
    }
  };

  const validateFile = (file: File, type: HeaderType | 'image' | 'video' | 'audio' | 'document') => {
    const limits = {
      image: { size: 2 * 1024 * 1024, types: ['image/jpeg', 'image/png', 'image/gif'], label: '2MB (JPEG, PNG)' },
      video: { size: 10 * 1024 * 1024, types: ['video/mp4'], label: '10MB (MP4)' },
      audio: { size: 5 * 1024 * 1024, types: ['audio/mpeg', 'audio/mp3'], label: '5MB (MP3)' },
      document: { size: 5 * 1024 * 1024, types: ['application/pdf'], label: '5MB (PDF)' },
      none: { size: 0, types: [], label: '' },
      text: { size: 0, types: [], label: '' }
    };

    // Cast type to keyof typeof limits to avoid indexing errors if type is generic string
    const limit = limits[type as keyof typeof limits];
    if (!limit || limit.size === 0) return true;

    if (file.size > limit.size) {
      toast({ title: 'File Too Large', description: `Max size for ${type} is ${limit.label}`, variant: 'destructive' });
      return false;
    }

    if (!limit.types.includes(file.type)) {
       toast({ title: 'Invalid File Type', description: `Allowed types: ${limit.label}`, variant: 'destructive' });
       return false;
    }
    return true;
  };

  const handleHeaderFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: HeaderType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateFile(file, type)) {
        e.target.value = ''; // Reset input
        return;
    }

    const url = URL.createObjectURL(file);
    setNewTemplate(prev => ({
        ...prev,
        header: { ...prev.header, type, content: url, fileName: file.name }
    }));
  };

  const filteredTemplates = templates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCampaignComplete = async (campaignData: CampaignData) => {
    try {
      // 1. Create Base Campaign (Draft)
      // We create the campaign first to get an ID for uploading contacts
      const campaignPayload = {
        name: campaignData.name,
        channel: campaignData.channel,
        template_id: campaignData.templateId,
        audience_id: campaignData.audienceId || undefined,
        audience_count: campaignData.audienceCount,
        status: 'draft' as any, // Start as draft, update later if 'now'
        scheduled_at: campaignData.scheduleType === 'scheduled' 
          ? `${campaignData.scheduledDate}T${campaignData.scheduledTime}`
          : undefined,
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
                  // Call RCS API directly or via service
                  // We need to pass campaignId to reuse it.
                  const rcsPayload = {
                    campaignId, // Backend should handle this
                    campaignName: campaignData.name,
                    templateName: templates.find(t => t.id === campaignData.templateId)?.name || campaignData.templateId,
                    contacts: contactsToSend
                  };
                  await rcsCampaignApi.sendCampaign(rcsPayload as any);
                  
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

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g);
    return matches ? matches.map(m => m.replace(/\{\{|\}\}/g, '')) : [];
  };

  const handleSaveTemplate = async (isDraft: boolean = false) => {
    try {
      const templateData = {
        name: newTemplate.name,
        language: newTemplate.language,
        category: newTemplate.category,
        channel: newTemplate.channel,
        template_type: templateType,
        button_type: "quick_reply",
        header_type: newTemplate.header.type,
        header_content: newTemplate.header.content,
        header_file_name: newTemplate.header.fileName, // Added field
        body: newTemplate.body,
        footer: newTemplate.footer || undefined,
        buttons: newTemplate.buttons,
        status: (isDraft ? 'draft' : (newTemplate.channel === 'rcs' ? 'approved' : 'pending')) as any,
      };

      if (newTemplate.channel === 'rcs' && !isDraft) {
        try {
          const formDataToSend = new FormData();
          formDataToSend.append('custId', '7');
          formDataToSend.append('template_name', newTemplate.name);
          formDataToSend.append('template_type', 'text_message');
          formDataToSend.append('template_content', newTemplate.body);
          
          const suggestions = newTemplate.buttons.map(btn => {
            if (btn.type === 'quick_reply') {
              return { suggestionType: 'reply', displayText: btn.label, postback: btn.label };
            } else if (btn.type === 'url') {
              return { suggestionType: 'url_action', displayText: btn.label, url: btn.value };
            } else if (btn.type === 'phone') {
              return { suggestionType: 'dialer_action', displayText: btn.label, phoneNumber: btn.value };
            }
            return null;
          }).filter(Boolean);
          
          formDataToSend.append('suggestion', JSON.stringify(suggestions));
          
          const result = await rcsTemplatesService.createExternalTemplate(formDataToSend);
          
          if (result.code !== 0) {
            toast({
              title: 'External API Error',
              description: result.msg || 'Failed to create template on RCS panel.',
              variant: 'destructive'
            });
            return; // Stop if external API fails? Or continue to local save? Assuming user wants both.
          }
        } catch (error: any) {
          console.error('External RCS API error:', error);
          toast({
            title: 'External API Connection Error',
            description: error.message || 'Could not connect to RCS external API.',
            variant: 'destructive'
          });
          return;
        }
      }

      if (editingTemplate) {
        await templateService.updateTemplate(editingTemplate.id, templateData);
        toast({
          title: '✅ Template updated',
          description: 'Your changes have been saved.',
        });
      } else {
        await templateService.createTemplate(templateData);
        toast({
          title: isDraft ? '📝 Draft saved' : (newTemplate.channel === 'rcs' ? '🎉 RCS Template Submitted!' : '🎉 Template submitted!'),
          description: isDraft ? 'Your template has been saved as draft.' : (newTemplate.channel === 'rcs' ? 'Your template has been created on the RCS panel.' : 'Your template has been submitted for approval.'),
        });
      }
      
      fetchData();
      setIsTemplateOpen(false);
      setEditingTemplate(null);
      resetTemplateForm();
    } catch (err) {
      console.error('Save template error:', err);
      toast({
        title: 'Error',
        description: err.response?.data?.message || 'Failed to save template.',
        variant: 'destructive'
      });
    }
  };

  const resetTemplateForm = () => {
    setNewTemplate({ 
      name: '', 
      language: 'en',
      category: 'Marketing', 
      channel: 'whatsapp', 
      header: { type: 'none' },
      body: '',
      footer: '',
      buttons: [],
    });
    setTemplateType('standard');
    setTemplateStep('channel');
  };

  const handleEditTemplate = (template: MessageTemplate) => {
    setEditingTemplate(template);
    setTemplateType(template.template_type);
    setNewTemplate({
      name: template.name,
      language: template.language,
      category: template.category,
      channel: template.channel,
      header: { 
        type: template.header_type as HeaderType, 
        content: template.header_content || undefined 
      },
      body: template.body,
      footer: template.footer || '',
      buttons: template.buttons.map(b => ({ ...b, id: b.id.toString() })),
    });
    setTemplateStep('form'); // Skip channel selection when editing
    setIsTemplateOpen(true);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await templateService.deleteTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
      toast({
        title: '🗑️ Template deleted',
        description: 'The template has been removed.',
      });
    } catch (err) {
      console.error('Delete template error:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete template.',
        variant: 'destructive'
      });
    }
  };

  const addButton = () => {
    if (newTemplate.buttons.length >= 3) return;
    setNewTemplate({
      ...newTemplate,
      buttons: [...newTemplate.buttons, { id: Date.now().toString(), type: 'quick_reply', label: '', value: '', position: newTemplate.buttons.length }],
    });
  };

  const updateButton = (id: string, field: keyof TemplateButton, value: string) => {
    setNewTemplate({
      ...newTemplate,
      buttons: newTemplate.buttons.map(b => b.id === id ? { ...b, [field]: value } : b),
    });
  };

  const removeButton = (id: string) => {
    setNewTemplate({
      ...newTemplate,
      buttons: newTemplate.buttons.filter(b => b.id !== id),
    });
  };

  const addVariable = () => {
    const variableCount = (newTemplate.body.match(/\{\{\d+\}\}/g) || []).length + 1;
    setNewTemplate({
      ...newTemplate,
      body: newTemplate.body + `{{${variableCount}}}`,
    });
  };

  const getDeliveryRate = (campaign: Campaign) => {
    if (campaign.sent_count === 0) return 0;
    return Math.round((campaign.delivered_count / campaign.sent_count) * 100);
  };

  const openAnalytics = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setAnalyticsOpen(true);
  };

  const openTemplateAnalytics = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setTemplateAnalyticsOpen(true);
  };

  const selectedCampaignTemplate = templates.find(t => t.id === newCampaign.templateId);
  const selectedAudience = audienceSegments.find(a => a.id === newCampaign.audienceId);

  // Stats cards
  const stats = [
    { label: 'Total Campaigns', value: campaigns.length, icon: Target, color: 'text-primary' },
    { label: 'Running', value: campaigns.filter(c => c.status === 'running').length, icon: Zap, color: 'text-success' },
    { label: 'Scheduled', value: campaigns.filter(c => c.status === 'scheduled').length, icon: Clock, color: 'text-warning' },
    { label: 'Total Delivered', value: campaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0).toLocaleString(), icon: TrendingUp, color: 'text-primary' },
  ];

  // Phone preview content builder - Channel specific
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
        case 'video':
           return newTemplate.header.content ? (
             <div className="mb-2 rounded-lg overflow-hidden bg-black">
               <video src={newTemplate.header.content} controls className="w-full h-auto" />
             </div>
           ) : (
             <div className="h-32 bg-muted rounded-lg flex items-center justify-center"><Video className="h-8 w-8 text-muted-foreground" /></div>
           );
        case 'audio':
             return newTemplate.header.content ? (
                 <div className="mb-2 p-2 bg-gray-50 rounded-md border flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                         <Phone size={14} className="rotate-90" />
                     </div>
                     <div className="flex-1 overflow-hidden">
                         <div className="text-xs font-medium truncate">{newTemplate.header.fileName || 'Audio File'}</div>
                         <div className="text-xs text-muted-foreground">Audio Message</div>
                     </div>
                 </div>
             ) : null;
        case 'document':
             return newTemplate.header.content ? (
                 <div className="mb-2 p-3 bg-gray-50 rounded-md border flex items-center gap-3">
                     <div className="p-2 bg-red-100 rounded text-red-600">
                         <FileText size={20} />
                     </div>
                     <div className="flex-1 overflow-hidden">
                         <div className="text-sm font-medium truncate">{newTemplate.header.fileName || 'Document.pdf'}</div>
                         <div className="text-xs text-muted-foreground">PDF Document</div>
                     </div>
                 </div>
             ) : (
                 <div className="h-20 bg-muted rounded-lg flex items-center justify-center gap-2"><File className="h-6 w-6 text-muted-foreground" /><span className="text-sm text-muted-foreground">Document</span></div>
             );
        case 'text': return newTemplate.header.content ? <p className="font-bold text-sm">{newTemplate.header.content}</p> : null;
        default: return null;
      }
    };

    // SMS Preview - Simple phone message style
    if (newTemplate.channel === 'sms') {
      return (
        <div className="flex flex-col h-full">
          <div className="relative mx-auto">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl z-10" />
            <div className="w-[280px] h-[500px] bg-[#F5F5F5] rounded-[2rem] overflow-hidden border-8 border-black relative">
              {/* Status bar */}
              <div className="bg-[#007AFF] text-white px-4 py-2 flex items-center gap-3">
                <ChevronRight className="h-5 w-5 rotate-180" />
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium">SMS Message</p>
                </div>
              </div>
              
              {/* Chat area */}
              <div className="p-3 h-[calc(100%-120px)] overflow-y-auto">
                <div className="bg-[#E9E9EB] rounded-2xl p-3 shadow-sm max-w-[85%] space-y-2">
                  {newTemplate.body ? (
                    <p className="text-sm whitespace-pre-wrap">{newTemplate.body}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Enter your SMS text...</p>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  {newTemplate.body.length}/160 characters ({Math.ceil(newTemplate.body.length / 160) || 1} SMS)
                </p>
              </div>
              
              {/* Input area */}
              <div className="absolute bottom-0 left-0 right-0 bg-white p-2 flex items-center gap-2 border-t">
                <div className="flex-1 bg-[#F0F0F0] rounded-full px-4 py-2 text-sm text-muted-foreground">
                  iMessage
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Email Preview - Email client style
    if (newTemplate.channel === 'email') {
      return (
        <div className="flex flex-col h-full">
          <div className="w-full max-w-[320px] mx-auto bg-white rounded-lg shadow-lg border overflow-hidden">
            {/* Email Header */}
            <div className="bg-muted/50 px-4 py-3 border-b">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">N</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium">NotifyNow</p>
                  <p className="text-[10px] text-muted-foreground">noreply@notifynow.com</p>
                </div>
              </div>
              <p className="font-semibold text-sm truncate">
                {newTemplate.header.content || 'Subject line...'}
              </p>
            </div>
            
            {/* Email Body */}
            <div className="p-4 min-h-[300px] max-h-[350px] overflow-y-auto">
              {newTemplate.body ? (
                <div className="text-sm whitespace-pre-wrap">{newTemplate.body}</div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Enter your email body content...</p>
              )}
              
              {/* Footer */}
              {newTemplate.footer && (
                <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
                  {newTemplate.footer}
                </div>
              )}
            </div>
            
            {/* Email Footer */}
            <div className="bg-muted/30 px-4 py-2 border-t">
              <p className="text-[10px] text-muted-foreground text-center">
                © 2026 NotifyNow. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Voice Bot Preview
    if (newTemplate.channel === 'voicebot') {
      return (
        <div className="flex flex-col h-full">
          <div className="relative mx-auto">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl z-10" />
            <div className="w-[280px] h-[500px] bg-white rounded-[2rem] overflow-hidden border-8 border-black relative">
              {/* Status bar */}
              <div className="bg-slate-800 text-white px-4 py-2 flex items-center gap-3">
                <ChevronRight className="h-5 w-5 rotate-180" />
                <div className="flex-1 text-center">
                  <p className="text-sm font-medium">Voice Call</p>
                </div>
              </div>
              
              {/* Call Interface */}
              <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <Phone className="h-10 w-10 text-slate-500" />
                </div>
                
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Incoming Call</h3>
                <p className="text-sm text-muted-foreground mb-8">Voice Bot Demo</p>
                
                <div className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-8 max-h-[200px] overflow-y-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">SCRIPT PREVIEW</p>
                  {newTemplate.body ? (
                    <p className="text-sm text-slate-700 leading-relaxed font-mono">
                      "{newTemplate.body}"
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Enter voice script...</p>
                  )}
                </div>
                
                <div className="flex items-center gap-8 mt-auto mb-12">
                  <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg">
                    <Phone className="h-6 w-6 text-white rotate-[135deg]" />
                  </div>
                  <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                    <Phone className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // RCS Preview - Rich messaging style
    if (newTemplate.channel === 'rcs') {
      return (
        <div className="flex flex-col h-full">
          <div className="relative mx-auto">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl z-10" />
            <div className="w-[280px] h-[500px] bg-[#F1F3F4] rounded-[2rem] overflow-hidden border-8 border-black relative">
              {/* Status bar */}
              <div className="bg-[#1A73E8] text-white px-4 py-2 flex items-center gap-3">
                <ChevronRight className="h-5 w-5 rotate-180" />
                <div className="w-8 h-8 rounded-full bg-blue-300" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Business RCS</p>
                  <div className="flex items-center gap-1">
                     <p className="text-xs opacity-80">Verified</p>
                     <span className="text-[10px] bg-white/20 px-1 rounded">{newTemplate.language.toUpperCase()}</span>
                  </div>
                </div>
              </div>
              
              {/* Chat area */}
              <div className="p-3 h-[calc(100%-120px)] overflow-y-auto">
                <div className="bg-white rounded-xl p-3 shadow-sm max-w-[90%] space-y-2">
                  {getHeaderIcon()}
                  {newTemplate.body ? (
                    <p className="text-sm whitespace-pre-wrap">{newTemplate.body}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Enter your message body...</p>
                  )}
                  <p className="text-[10px] text-muted-foreground text-right">10:30 AM</p>
                </div>
                
                {/* Buttons preview */}
                {newTemplate.buttons.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 max-w-[90%]">
                    {newTemplate.buttons.map((btn) => (
                      <button key={btn.id} className="px-4 py-2 text-sm text-[#1A73E8] font-medium border border-[#1A73E8] rounded-full bg-white">
                        {btn.label || 'Button'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Input area */}
              <div className="absolute bottom-0 left-0 right-0 bg-white p-2 flex items-center gap-2">
                <div className="flex-1 bg-[#F1F3F4] rounded-full px-4 py-2 text-sm text-muted-foreground">
                  Type a message
                </div>
                <div className="w-10 h-10 bg-[#1A73E8] rounded-full flex items-center justify-center">
                  <Send className="h-5 w-5 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // WhatsApp Preview (default)
    return (
      <div className="flex flex-col h-full">
        {/* Phone Frame */}
        <div className="relative mx-auto">
          {/* Phone notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-b-xl z-10" />
          
          {/* Phone screen */}
          <div className="w-[280px] h-[500px] bg-[#ECE5DD] rounded-[2rem] overflow-hidden border-8 border-black relative">
            {/* Status bar */}
            <div className="bg-[#075E54] text-white px-4 py-2 flex items-center gap-3">
              <ChevronRight className="h-5 w-5 rotate-180" />
              <div className="w-8 h-8 rounded-full bg-gray-300" />
              <div className="flex-1">
                <p className="text-sm font-medium">Business Name</p>
                <p className="text-xs opacity-80">online</p>
              </div>
            </div>
            
            {/* Chat area */}
            <div className="p-3 h-[calc(100%-120px)] overflow-y-auto">
              {/* Message bubble */}
              <div className="bg-white rounded-lg p-3 shadow-sm max-w-[90%] space-y-2">
                {getHeaderIcon()}
                {newTemplate.body ? (
                  <p className="text-sm whitespace-pre-wrap">{newTemplate.body}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Enter your message body...</p>
                )}
                {newTemplate.footer && (
                  <p className="text-xs text-muted-foreground">{newTemplate.footer}</p>
                )}
                <p className="text-[10px] text-muted-foreground text-right">10:30 AM</p>
              </div>
              
              {/* Buttons preview */}
              {newTemplate.buttons.length > 0 && (
                <div className="bg-white rounded-lg mt-1 shadow-sm overflow-hidden max-w-[90%]">
                  {newTemplate.buttons.map((btn, i) => (
                    <div key={btn.id}>
                      {i > 0 && <Separator />}
                      <button className="w-full py-2.5 text-sm text-[#00A884] font-medium flex items-center justify-center gap-2">
                        {btn.type === 'url' && <Link className="h-4 w-4" />}
                        {btn.type === 'phone' && <Phone className="h-4 w-4" />}
                        {btn.type === 'copy_code' && <Copy className="h-4 w-4" />}
                        {btn.label || 'Button'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Input area */}
            <div className="absolute bottom-0 left-0 right-0 bg-[#F0F0F0] p-2 flex items-center gap-2">
              <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-muted-foreground">
                Type a message
              </div>
              <div className="w-10 h-10 bg-[#00A884] rounded-full flex items-center justify-center">
                <Send className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
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
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setCreateStep(1); }}>
            <DialogTrigger asChild>
              <Button className="gradient-primary w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0">
              <DialogTitle className="sr-only">Create New Campaign</DialogTitle>
              <DialogDescription className="sr-only">Create a new messaging campaign</DialogDescription>
              <CampaignCreationStepper
                templates={templates.filter(t => t.status === 'approved')}
                onComplete={handleCampaignComplete}
                onCancel={() => setIsCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

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

      {/* Tabs for Campaigns and Templates */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'campaigns' | 'templates')}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Campaigns
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            {activeTab === 'campaigns' && (
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
            )}
            {activeTab === 'templates' && (
              <Button onClick={() => { setEditingTemplate(null); resetTemplateForm(); setIsTemplateOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            )}
          </div>
        </div>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-6">
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
                        <p className="text-lg font-bold">{campaign.sent_count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Sent</p>
                      </div>
                      <div className="p-2 rounded-lg bg-success/10">
                        <p className="text-lg font-bold text-success">{campaign.delivered_count.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Delivered</p>
                      </div>
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                         <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{campaign.read_count?.toLocaleString() || 0}</p>
                         <p className="text-xs text-muted-foreground">Read</p>
                      </div>
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <p className="text-lg font-bold text-destructive">{campaign.failed_count.toLocaleString()}</p>
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
                      <TableCell className="text-center">{campaign.sent_count.toLocaleString()}</TableCell>
                      <TableCell className="text-center text-success">{campaign.delivered_count.toLocaleString()}</TableCell>
                      <TableCell className="text-center text-purple-600">{campaign.read_count?.toLocaleString() || 0}</TableCell>
                      <TableCell className="text-center text-destructive">{campaign.failed_count.toLocaleString()}</TableCell>
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
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          {/* Sub-tabs for Templates */}
          <Tabs value={templateSubTab} onValueChange={(v) => setTemplateSubTab(v as 'all' | 'pending')} className="mb-6">
            <TabsList className="p-1 h-auto flex flex-wrap gap-2 bg-muted/50 rounded-lg w-full sm:w-auto overflow-x-auto">
              <TabsTrigger value="all" className="flex items-center gap-2 flex-1 sm:flex-none">
                <FileText className="h-4 w-4" />
                All Templates
                <Badge variant="secondary" className="ml-1">{templates.length}</Badge>
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="pending" className="flex items-center gap-2 flex-1 sm:flex-none">
                  <Clock className="h-4 w-4" />
                  Pending Approvals
                  <Badge variant="warning" className="ml-1 bg-amber-100 text-amber-700">
                    {templates.filter(t => t.status === 'pending').length}
                  </Badge>
                </TabsTrigger>
              )}
            </TabsList>

            {/* All Templates */}
            <TabsContent value="all" className="mt-6">
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
                        <Badge variant="secondary" className="text-xs">
                          {templateLanguages.find(l => l.code === template.language)?.name || template.language}
                        </Badge>
                        {template.status === 'pending' && (
                          <Badge variant="warning" className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200 animate-pulse">
                            Pending Approval
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && template.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-success hover:text-success hover:bg-success/10 border-success/30"
                            onClick={() => handleApproveTemplate(template.id, 'approved')}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => handleApproveTemplate(template.id, 'rejected')}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {isAdmin && template.status === 'pending' && (
                          <>
                            <DropdownMenuItem className="text-success" onClick={() => handleApproveTemplate(template.id, 'approved')}>
                              <Check className="h-4 w-4 mr-2" />
                              Approve Template
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleApproveTemplate(template.id, 'rejected')}>
                              <X className="h-4 w-4 mr-2" />
                              Reject Template
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        {template.analytics && (
                          <DropdownMenuItem onClick={() => openTemplateAnalytics(template)}>
                            <BarChart3 className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteTemplate(template.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    <p className="line-clamp-3">{template.body}</p>
                  </div>
                  {template.variables && template.variables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {template.variables.map((v: any, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {`{{${v.name || v}}}`}
                        </Badge>
                      ))}
                    </div>
                  )}



                  <div className="flex gap-2">
                    {template.channel === 'rcs' && (
                        <Button variant="outline" size="icon" title="Sync Status" onClick={() => handleSyncTemplate(template.id)}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="outline" className="flex-1" onClick={() => handleEditTemplate(template)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    {template.analytics && (
                      <Button variant="outline" size="icon" onClick={() => openTemplateAnalytics(template)}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
              </div>
            </TabsContent>

            {/* Pending Approvals Tab - Admin Only */}
            {isAdmin && (
              <TabsContent value="pending" className="mt-6">
                {templates.filter(t => t.status === 'pending').length === 0 ? (
                  <Card className="p-12">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                        <Check className="h-8 w-8 text-success" />
                      </div>
                      <h3 className="text-lg font-medium mb-1">All caught up!</h3>
                      <p className="text-muted-foreground">No templates pending approval</p>
                    </div>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {templates.filter(t => t.status === 'pending').map((template) => (
                      <Card key={template.id} className="card-elevated">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            {/* Template Info */}
                            <div className="flex-1 space-y-4">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold font-mono">{template.name}</h3>
                                  <Badge variant="warning" className="bg-amber-100 text-amber-700 animate-pulse">
                                    Pending Approval
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <ChannelBadge channel={template.channel} />
                                  <Badge variant="outline">{template.category}</Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {templateLanguages.find(l => l.code === template.language)?.name || template.language}
                                  </Badge>
                                </div>
                              </div>

                              {/* Template Preview */}
                              <div className="space-y-3">
                                {template.header_type !== 'none' && (
                                  <div className="p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-xs text-muted-foreground mb-1">Header ({template.header_type})</p>
                                    {template.header_type === 'text' && template.header_content && (
                                      <p className="font-semibold">{template.header_content}</p>
                                    )}
                                    {['image', 'video', 'document'].includes(template.header_type) && (
                                      <p className="text-sm text-muted-foreground italic">Media will be added when sending</p>
                                    )}
                                  </div>
                                )}
                                
                                <div className="p-3 rounded-lg bg-muted/50">
                                  <p className="text-xs text-muted-foreground mb-1">Body</p>
                                  <p className="text-sm whitespace-pre-wrap">{template.body}</p>
                                </div>

                                {template.footer && (
                                  <div className="p-3 rounded-lg bg-muted/30">
                                    <p className="text-xs text-muted-foreground mb-1">Footer</p>
                                    <p className="text-sm text-muted-foreground">{template.footer}</p>
                                  </div>
                                )}

                                {template.buttons && template.buttons.length > 0 && (
                                  <div className="p-3 rounded-lg bg-muted/30">
                                    <p className="text-xs text-muted-foreground mb-2">Buttons ({template.buttons.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                      {template.buttons.map((btn, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">
                                          {btn.type === 'url' && <Link className="h-3 w-3 mr-1" />}
                                          {btn.type === 'phone' && <Phone className="h-3 w-3 mr-1" />}
                                          {btn.label}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Metadata */}
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Created: {format(new Date(template.created_at), 'MMM d, yyyy h:mm a')}</span>
                                <span>•</span>
                                <span>Type: {template.template_type}</span>
                              </div>
                            </div>

                            {/* Approval Actions */}
                            <div className="flex flex-col gap-2 min-w-[140px]">
                              {template.channel === 'rcs' ? (
                                <Button
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => handleSyncTemplate(template.id)}
                                >
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Sync Status
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    className="gradient-primary w-full"
                                    onClick={() => handleApproveTemplate(template.id, 'approved')}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={() => handleApproveTemplate(template.id, 'rejected')}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              <Separator className="my-1" />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTemplate(template)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Template Create/Edit Modal - Channel Specific */}
      <Dialog open={isTemplateOpen} onOpenChange={(open) => { setIsTemplateOpen(open); if (!open) { setEditingTemplate(null); resetTemplateForm(); } }}>
        <DialogContent className={cn(
          "p-0 gap-0",
          templateStep === 'channel' ? "max-w-[500px]" : "max-w-[1100px] h-[90vh]"
        )}>
          <DialogDescription className="sr-only">Create or edit a message template</DialogDescription>
          {/* Channel Selection Step */}
          {templateStep === 'channel' && (
            <>
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="text-xl">Select Channel</DialogTitle>
                <p className="text-sm text-muted-foreground">Choose a channel for your template</p>
              </DialogHeader>
              <div className="p-6 space-y-4">
                {[
                  { value: 'whatsapp', label: 'WhatsApp', icon: '📱', description: 'Rich templates with headers, buttons & media' },
                  { value: 'sms', label: 'SMS', icon: '📲', description: 'Simple text messages up to 160 characters' },
                  { value: 'rcs', label: 'RCS', icon: '💬', description: 'Rich messaging with buttons & suggested replies' },
                  { value: 'instagram', label: 'Instagram', icon: '📸', description: 'Direct messages with rich media content' },
                  { value: 'facebook', label: 'Facebook', icon: '👥', description: 'Messenger templates with quick replies' },
                  { value: 'email', label: 'Email', icon: '📧', description: 'HTML emails with subject line and rich content' },
                  { value: 'voicebot', label: 'Voice Bot', icon: '🗣️', description: 'Text-to-speech scripts for voice calls' },
                ].filter(c => enabledChannels.includes(c.value)).map((channel) => (
                  <button
                    key={channel.value}
                    onClick={() => {
                      setNewTemplate({ ...newTemplate, channel: channel.value as TemplateChannel });
                      setTemplateStep('form');
                    }}
                    className={cn(
                      "w-full p-4 rounded-lg border-2 text-left transition-all hover:border-primary hover:bg-primary/5",
                      "flex items-center gap-4"
                    )}
                  >
                    <span className="text-3xl">{channel.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold">{channel.label}</p>
                      <p className="text-sm text-muted-foreground">{channel.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                ))}
                {enabledChannels.length === 0 && (
                  <div className="text-center p-8 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground">No channels active in your profile.</p>
                    <Button variant="link" className="mt-2">Go to Settings to enable channels</Button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Template Form Step */}
          {templateStep === 'form' && (
            <>
              <DialogHeader className="px-6 py-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {!editingTemplate && (
                      <Button variant="ghost" size="icon" onClick={() => setTemplateStep('channel')}>
                        <ChevronRight className="h-5 w-5 rotate-180" />
                      </Button>
                    )}
                    <div>
                      <DialogTitle className="text-xl">
                        {editingTemplate ? 'Edit Template' : 'New Template'}
                      </DialogTitle>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        {newTemplate.channel === 'whatsapp' && '📱 WhatsApp Template'}
                        {newTemplate.channel === 'sms' && '📲 SMS Template'}
                        {newTemplate.channel === 'rcs' && '💬 RCS Template'}
                        {newTemplate.channel === 'instagram' && '📸 Instagram Template'}
                        {newTemplate.channel === 'facebook' && '👥 Facebook Template'}
                        {newTemplate.channel === 'email' && '📧 Email Template'}
                        {newTemplate.channel === 'voicebot' && '🗣️ Voice Bot Template'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleSaveTemplate(true)}>
                      Save draft
                    </Button>
                    <Button 
                      className="gradient-primary" 
                      onClick={() => handleSaveTemplate(false)}
                      disabled={!newTemplate.name || !newTemplate.body}
                    >
                      Submit for Approval
                    </Button>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Form */}
                <ScrollArea className="flex-1 border-r">
                  <div className="p-6 space-y-6">
                    {/* WhatsApp Template Type Tabs - Only for WhatsApp */}
                    {newTemplate.channel === 'whatsapp' && (
                      <Tabs value={templateType} onValueChange={(v) => setTemplateType(v as 'standard' | 'carousel')}>
                        <TabsList className="w-full">
                          <TabsTrigger value="standard" className="flex-1">Standard Template</TabsTrigger>
                          <TabsTrigger value="carousel" className="flex-1">Carousel Template</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}

                    {/* Template Details */}
                    <div className="space-y-4">
                      <h3 className="font-semibold">Template Details</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Template Name *</Label>
                          <Input
                            placeholder="e.g booking_template"
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                          />
                          <p className="text-xs text-muted-foreground">Use lowercase letters, numbers, and underscores only</p>
                        </div>
                        <div className="space-y-2">
                          <Label>Language *</Label>
                          <Popover open={languagePopoverOpen} onOpenChange={setLanguagePopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={languagePopoverOpen}
                                className="w-full justify-between font-normal"
                              >
                                {templateLanguages.find(l => l.code === newTemplate.language)?.name || "Select language..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search language..." />
                                <CommandList>
                                  <CommandEmpty>No language found.</CommandEmpty>
                                  <CommandGroup className="max-h-[250px] overflow-auto">
                                    {templateLanguages.map((lang) => (
                                      <CommandItem
                                        key={lang.code}
                                        value={lang.name}
                                        onSelect={() => {
                                          setNewTemplate({ ...newTemplate, language: lang.code });
                                          setLanguagePopoverOpen(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            newTemplate.language === lang.code ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        {lang.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select
                          value={newTemplate.category}
                          onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value as MessageTemplate['category'] })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Utility">Utility</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="Authentication">Authentication</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    {/* Header Section - WhatsApp, RCS (media header) and Email (subject line) */}
                    {(newTemplate.channel === 'whatsapp' || newTemplate.channel === 'rcs') && (
                      <>
                        <div className="space-y-4">
                          <h3 className="font-semibold">Header (Optional)</h3>
                          <div className="space-y-2">
                            <Label>Header Type</Label>
                            <div className="flex gap-2 flex-wrap">
                              {(newTemplate.channel === 'whatsapp' 
                                ? ['none', 'text', 'image', 'video', 'document'] as HeaderType[]
                                : newTemplate.channel === 'rcs' 
                                ? ['none', 'text', 'image', 'video', 'audio', 'document'] as any 
                                : ['none', 'text', 'image'] as HeaderType[]
                              ).map((type: any) => (
                                <Button
                                  key={type}
                                  type="button"
                                  variant={newTemplate.header.type === type ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => setNewTemplate({ ...newTemplate, header: { type, content: type === 'text' ? '' : undefined } })}
                                  className="capitalize"
                                >
                                  {type === newTemplate.header.type && '✓ '}
                                  {type.toUpperCase()}
                                </Button>
                              ))}
                            </div>
                          </div>
                          
                          {newTemplate.header.type === 'text' && (
                            <div className="space-y-2">
                              <Label>Header Text</Label>
                              <Input
                                placeholder="Enter header text..."
                                value={newTemplate.header.content || ''}
                                onChange={(e) => setNewTemplate({ ...newTemplate, header: { ...newTemplate.header, content: e.target.value } })}
                              />
                            </div>
                          )}
                          
                          {['image', 'video', 'audio', 'document'].includes(newTemplate.header.type) && (
                            <div className="space-y-4">
                                <div className="p-4 border-2 border-dashed rounded-lg text-center hover:bg-muted/10 transition-colors relative">
                                    <Input 
                                        type="file" 
                                        accept={
                                            newTemplate.header.type === 'image' ? "image/png, image/jpeg" :
                                            newTemplate.header.type === 'video' ? "video/mp4" :
                                            newTemplate.header.type === 'audio' ? "audio/mp3, audio/mpeg" :
                                            "application/pdf"
                                        }
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={(e) => handleHeaderFileChange(e, newTemplate.header.type)}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                        {newTemplate.header.content ? (
                                            <>
                                                {newTemplate.header.type === 'image' ? (
                                                    <Image className="h-8 w-8 text-primary" />
                                                ) : newTemplate.header.type === 'video' ? (
                                                    <Video className="h-8 w-8 text-primary" />
                                                ) : newTemplate.header.type === 'audio' ? (
                                                    <Phone className="h-8 w-8 text-primary rotate-90" />
                                                ) : (
                                                    <FileText className="h-8 w-8 text-primary" />
                                                )}
                                                <p className="text-sm font-medium text-primary">File selected: {newTemplate.header.fileName}</p>
                                                <p className="text-xs text-muted-foreground">Click to replace</p>
                                            </>
                                        ) : (
                                            <>
                                                {newTemplate.header.type === 'image' ? (
                                                    <Image className="h-8 w-8 text-muted-foreground" />
                                                ) : newTemplate.header.type === 'video' ? (
                                                    <Video className="h-8 w-8 text-muted-foreground" />
                                                ) : newTemplate.header.type === 'audio' ? (
                                                    <Phone className="h-8 w-8 text-muted-foreground rotate-90" />
                                                ) : (
                                                    <FileText className="h-8 w-8 text-muted-foreground" />
                                                )}
                                                <p className="text-sm text-muted-foreground">
                                                    Click to upload {newTemplate.header.type}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {newTemplate.header.type === 'image' && 'Max 2MB (JPEG, PNG)'}
                                                    {newTemplate.header.type === 'video' && 'Max 10MB (MP4)'}
                                                    {newTemplate.header.type === 'audio' && 'Max 5MB (MP3)'}
                                                    {newTemplate.header.type === 'document' && 'Max 5MB (PDF)'}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                          )}
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Subject Line - Email only */}
                    {newTemplate.channel === 'email' && (
                      <>
                        <div className="space-y-4">
                          <h3 className="font-semibold">Subject Line *</h3>
                          <div className="space-y-2">
                            <Input
                              placeholder="Enter email subject line..."
                              value={newTemplate.header.content || ''}
                              onChange={(e) => setNewTemplate({ ...newTemplate, header: { type: 'text', content: e.target.value } })}
                              maxLength={100}
                            />
                            <p className="text-xs text-muted-foreground text-right">{(newTemplate.header.content || '').length}/100</p>
                          </div>
                        </div>
                        <Separator />
                      </>
                    )}

                    {/* Body Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                          {newTemplate.channel === 'sms' ? 'Message Text *' : newTemplate.channel === 'email' ? 'Email Body *' : newTemplate.channel === 'voicebot' ? 'Voice Script *' : 'Body *'}
                        </h3>
                        <Button type="button" variant="outline" size="sm" onClick={addVariable}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add variable
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Textarea
                          placeholder={
                            newTemplate.channel === 'sms' 
                              ? "Enter your SMS text..." 
                              : newTemplate.channel === 'email'
                              ? "Enter your email content here. You can use variables like {{name}} for personalization..."
                              : "Enter your message body text..."
                          }
                          value={newTemplate.body}
                          onChange={(e) => setNewTemplate({ ...newTemplate, body: e.target.value })}
                          rows={newTemplate.channel === 'sms' ? 4 : newTemplate.channel === 'email' ? 10 : 6}
                          className="resize-none"
                          maxLength={newTemplate.channel === 'sms' ? 320 : newTemplate.channel === 'email' ? 5000 : 1024}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Use {"{{1}}"}, {"{{name}}"}, etc. for dynamic variables</span>
                          {newTemplate.channel === 'sms' ? (
                            <span className={cn(
                              newTemplate.body.length > 160 && "text-warning"
                            )}>
                              {newTemplate.body.length}/160 ({Math.ceil(newTemplate.body.length / 160) || 1} SMS)
                            </span>
                          ) : newTemplate.channel === 'email' ? (
                            <span>{newTemplate.body.length} / 5000</span>
                          ) : (
                            <span>{newTemplate.body.length} / 1024</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer Section - WhatsApp and Email */}
                    {(newTemplate.channel === 'whatsapp' || newTemplate.channel === 'email') && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h3 className="font-semibold">
                            {newTemplate.channel === 'email' ? 'Email Signature / Footer (Optional)' : 'Footer (Optional)'}
                          </h3>
                          <div className="space-y-2">
                            {newTemplate.channel === 'email' ? (
                              <Textarea
                                placeholder="Enter your email signature or footer text..."
                                value={newTemplate.footer}
                                onChange={(e) => setNewTemplate({ ...newTemplate, footer: e.target.value })}
                                rows={3}
                                maxLength={500}
                              />
                            ) : (
                              <Input
                                placeholder="Enter footer text"
                                value={newTemplate.footer}
                                onChange={(e) => setNewTemplate({ ...newTemplate, footer: e.target.value })}
                                maxLength={60}
                              />
                            )}
                            <p className="text-xs text-muted-foreground text-right">
                              {newTemplate.footer.length}/{newTemplate.channel === 'email' ? 500 : 60}
                            </p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Buttons Section - WhatsApp and RCS only */}
                    {(newTemplate.channel === 'whatsapp' || newTemplate.channel === 'rcs') && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h3 className="font-semibold">Buttons (Optional)</h3>
                          <p className="text-sm text-muted-foreground">
                            {newTemplate.channel === 'whatsapp' 
                              ? 'Create buttons that let customers respond to your message or take action. You can add up to 3 buttons.'
                              : 'Add suggested replies or action buttons. You can add up to 4 buttons.'
                            }
                          </p>
                          
                          {newTemplate.buttons.map((button, index) => (
                            <div key={button.id} className="p-4 border rounded-lg space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Button {index + 1}</span>
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeButton(button.id)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label className="text-xs">Button Type</Label>
                                  <Select
                                    value={button.type}
                                    onValueChange={(value) => updateButton(button.id, 'type', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {newTemplate.channel === 'whatsapp' ? (
                                        <>
                                          <SelectItem value="url">URL Button</SelectItem>
                                          <SelectItem value="phone">Phone Number</SelectItem>
                                          <SelectItem value="quick_reply">Quick Reply</SelectItem>
                                          <SelectItem value="copy_code">Copy Code</SelectItem>
                                        </>
                                      ) : (
                                        <>
                                          <SelectItem value="quick_reply">Suggested Reply</SelectItem>
                                          <SelectItem value="url">Open URL</SelectItem>
                                          <SelectItem value="phone">Dial Phone</SelectItem>
                                        </>
                                      )}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-xs">Button Label</Label>
                                  <Input
                                    placeholder="Button text"
                                    value={button.label}
                                    onChange={(e) => updateButton(button.id, 'label', e.target.value)}
                                    maxLength={25}
                                  />
                                </div>
                              </div>
                              {(button.type === 'url' || button.type === 'phone') && (
                                <div className="space-y-2">
                                  <Label className="text-xs">{button.type === 'url' ? 'URL' : 'Phone Number'}</Label>
                                  <Input
                                    placeholder={button.type === 'url' ? 'https://example.com' : '+1234567890'}
                                    value={button.value}
                                    onChange={(e) => updateButton(button.id, 'value', e.target.value)}
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                          
                          {newTemplate.buttons.length < (newTemplate.channel === 'whatsapp' ? 3 : 4) && (
                            <Button type="button" variant="outline" className="w-full" onClick={addButton}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add new button
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>

                {/* Right Panel - Phone Preview */}
                <div className="w-[350px] bg-muted/30 p-6 flex flex-col">
                  <h3 className="font-semibold mb-4 text-center">Preview</h3>
                  {renderPhonePreview()}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Template Analytics Modal */}
      <Dialog open={templateAnalyticsOpen} onOpenChange={setTemplateAnalyticsOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Template Analytics
            </DialogTitle>
            <DialogDescription>
              {selectedTemplate?.name} - {selectedTemplate?.channel.toUpperCase()} Template Performance
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && selectedTemplate.usage_count !== undefined && (
            <div className="space-y-6 py-4">
              {/* Template Info */}
              <div className="p-4 rounded-lg bg-muted/50 flex justify-between items-start">
                <div>
                  <p className="font-mono font-semibold">{selectedTemplate.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedTemplate.category} • {selectedTemplate.language}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">{selectedTemplate.usage_count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Usage</p>
                </div>
              </div>

              {/* Date Range Selector */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">DATE RANGE</Label>
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {dateRangePresets.map((preset) => (
                      <Button
                        key={preset}
                        variant={analyticsDateRange === preset ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAnalyticsDateRange(preset)}
                        className={cn(
                          analyticsDateRange === preset && 'bg-primary text-primary-foreground'
                        )}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  <Button variant="outline" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Dec 14 - Jan 13, 2026
                  </Button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <MessageSquare className="h-4 w-4" />
                    <span className="text-sm">Sent</span>
                  </div>
                  <p className="text-2xl font-bold">{(selectedTemplate.analytics?.sent || 0).toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <span className="text-sm">Delivered</span>
                  </div>
                  <p className="text-2xl font-bold text-success">{(selectedTemplate.analytics?.deliveredRate || 0)}%</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <Eye className="h-4 w-4" />
                    <span className="text-sm">Opened</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">{(selectedTemplate.analytics?.openedRate || 0)}%</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm">Clicked</span>
                  </div>
                  <p className="text-2xl font-bold text-pink-500">{(selectedTemplate.analytics?.clickedRate || 0)}%</p>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Delivery Rate</span>
                    <span className="font-medium">{selectedTemplate.analytics?.deliveredRate || 0}%</span>
                  </div>
                  <Progress value={selectedTemplate.analytics?.deliveredRate || 0} className="h-3 bg-muted [&>div]:bg-success" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Open Rate</span>
                    <span className="font-medium">{selectedTemplate.analytics?.openedRate || 0}%</span>
                  </div>
                  <Progress value={selectedTemplate.analytics?.openedRate || 0} className="h-3 bg-muted [&>div]:bg-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Click Rate</span>
                    <span className="font-medium">{selectedTemplate.analytics?.clickedRate || 0}%</span>
                  </div>
                  <Progress value={selectedTemplate.analytics?.clickedRate || 0} className="h-3 bg-muted [&>div]:bg-pink-500" />
                </div>
              </div>

              {/* Button Clicks */}
              {selectedTemplate.analytics?.buttonClicks && selectedTemplate.analytics.buttonClicks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-500" />
                    <h4 className="font-semibold">Button Clicks</h4>
                  </div>
                  <div className="space-y-2">
                    {selectedTemplate.analytics.buttonClicks.map((btn, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium">{btn.label}</p>
                          <p className="text-sm text-muted-foreground capitalize">{btn.type.replace('_', ' ')} Button</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-pink-500">{btn.clicks.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">clicks</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.analytics?.lastUpdated && (
                <p className="text-xs text-muted-foreground text-center">
                  Last updated: {format(new Date(selectedTemplate.analytics.lastUpdated), 'MMM d, yyyy, h:mm a')}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Campaign Analytics Modal */}
      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Campaign Analytics
            </DialogTitle>
            <DialogDescription>{selectedCampaign?.name}</DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold">{selectedCampaign.audience_count.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Target Audience</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-3xl font-bold">{getDeliveryRate(selectedCampaign)}%</p>
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-muted/50">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold">{selectedCampaign.sent_count.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Sent</p>
                  </CardContent>
                </Card>
                <Card className="bg-success/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-success">{selectedCampaign.delivered_count.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Delivered</p>
                  </CardContent>
                </Card>
                <Card className="bg-destructive/10">
                  <CardContent className="p-4 text-center">
                    <p className="text-2xl font-bold text-destructive">{selectedCampaign.failed_count.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Failed</p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Delivery Progress</span>
                  <span>{selectedCampaign.audience_count > 0 ? Math.round((selectedCampaign.sent_count / selectedCampaign.audience_count) * 100) : 0}%</span>
                </div>
                <Progress value={selectedCampaign.audience_count > 0 ? (selectedCampaign.sent_count / selectedCampaign.audience_count) * 100 : 0} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
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

      {filteredCampaigns.length === 0 && activeTab === 'campaigns' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Send className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No campaigns found</h3>
          <p className="text-muted-foreground">Create your first campaign to get started</p>
        </div>
      )}

      {filteredTemplates.length === 0 && activeTab === 'templates' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No templates found</h3>
          <p className="text-muted-foreground">Create your first template to get started</p>
        </div>
      )}
    </div>
  );
}