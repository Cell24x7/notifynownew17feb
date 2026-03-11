import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Check, ChevronLeft, ChevronRight, Upload, Download, Users, FileSpreadsheet, Calendar, Send, Clock, X, Plus, AlertCircle, Search, Filter, Smile, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ChannelBadge } from '@/components/ui/channel-icon';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { type Channel, type MessageTemplate, audienceSegments } from '@/lib/mockData';
import { contactService, type Contact } from '@/services/contactService';
import { campaignService } from '@/services/campaignService';
import { CampaignPreview } from './CampaignPreview';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { rcsTemplatesService } from '@/services/rcsTemplatesService';
import { Loader2, Paperclip } from 'lucide-react';
import { whatsappService } from '@/services/whatsappService';
interface CampaignCreationStepperProps {
   templates: MessageTemplate[];
   onComplete: (campaignData: CampaignData) => void;
   onCancel: () => void;
   onSmsSelect?: () => void;
   onWhatsappSelect?: () => void;
}

export interface CampaignData {
   name: string;
   channel: Channel;
   templateId: string;
   audienceId: string;
   contactSource: 'existing' | 'upload' | 'manual';
   selectedContacts: string[];
   manualNumbers: string;
   uploadedFile: File | null;
   fieldMapping: Record<string, { type: 'field' | 'custom'; value: string }>;
   scheduleType: 'now' | 'scheduled';
   schedulingMode: 'one-time' | 'repeat';
   frequency: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
   repeatDays: string[];
   scheduledDate: string;
   scheduledTime: string;
   endDate: string;
   endTime: string;
   estimatedCost: number;
   audienceCount: number;
}

const steps = [
   { id: 1, title: 'Basic Details', description: 'Name & channel selection' },
   { id: 2, title: 'Template', description: 'Select message template' },
   { id: 3, title: 'Audience', description: 'Choose or upload contacts' },
   { id: 4, title: 'Variable Mapping', description: 'Map fields to template' },
   { id: 5, title: 'Review & Send', description: 'Confirm and schedule' },
];

const channelOptions = [
   { value: 'whatsapp', label: 'WhatsApp', icon: '📱', costPerMessage: 0.35 },
   { value: 'sms', label: 'SMS', icon: '📲', costPerMessage: 0.25 },
   { value: 'rcs', label: 'RCS', icon: '💬', costPerMessage: 0.30 },
];

export default function CampaignCreationStepper({ templates, onComplete, onCancel, onSmsSelect, onWhatsappSelect }: CampaignCreationStepperProps) {
   const { user } = useAuth();
   const { toast } = useToast();
   const enabledChannels = user?.channels_enabled || [];

   const [currentStep, setCurrentStep] = useState(1);
   const [campaignData, setCampaignData] = useState<CampaignData>({
      name: '',
      channel: 'whatsapp',
      templateId: '',
      audienceId: '',
      contactSource: 'existing',
      selectedContacts: [],
      manualNumbers: '',
      uploadedFile: null,
      fieldMapping: {},
      scheduleType: 'now',
      schedulingMode: 'one-time',
      frequency: 'daily',
      repeatDays: [],
      scheduledDate: '',
      scheduledTime: '',
      endDate: '',
      endTime: '',
      estimatedCost: 0,
      audienceCount: 0,
   });

   const [selectedAudienceId, setSelectedAudienceId] = useState('');
   const [csvPreview, setCsvPreview] = useState<string[][]>([]);
   const [detectedColumns, setDetectedColumns] = useState<string[]>([]);
   const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

   // Real Contacts State
   const [contacts, setContacts] = useState<Contact[]>([]);
   const [loadingContacts, setLoadingContacts] = useState(false);

   // Contact table filters
   const [contactSearch, setContactSearch] = useState('');
   const [segmentFilter, setSegmentFilter] = useState<string>('all');
   const [dateFilter, setDateFilter] = useState<string>('all');
   const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

   // Test Campaign State
   const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
   const [testDestination, setTestDestination] = useState('');
   const [isSendingTest, setIsSendingTest] = useState(false);

   // File upload state for mapping variables
   const [isUploadingMedia, setIsUploadingMedia] = useState<Record<string, boolean>>({});

   // --- DERIVED STATE / HOOKS THAT MUST BE DEFINED EARLY ---
   const selectedTemplate = useMemo(() =>
      templates.find(t => t.id === campaignData.templateId),
      [templates, campaignData.templateId]);

   // Dynamically extract variables from template body and metadata
   const templateVariables = useMemo(() => {
      if (!selectedTemplate) return [];

      const meta = (selectedTemplate as any).metadata || {};
      const carouselList = meta.carouselList || [];

      // Combine all text fields that might contain variables
      const textToScan = [
         selectedTemplate.body,
         meta.cardTitle,
         meta.cardDescription,
         ...carouselList.map((c: any) => `${c.title || ''} ${c.description || ''}`)
      ].filter(Boolean).join(" ");

      if (!textToScan) return [];

      // Matches both {{var}} and [var] patterns
      const matches = textToScan.match(/\{\{([^}]+)\}\}|\[([^\]]+)\]/g);
      const vars = matches ? Array.from(new Set(matches.map(m => m.replace(/\{\{|\}\}|\[|\]/g, '').trim()))) : [];

      // Check if WhatsApp template has a media header
      const headerComp = meta.components?.find((c: any) => typeof c.type === 'string' && c.type.toUpperCase() === 'HEADER');
      if (headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format?.toUpperCase())) {
         vars.unshift('header_url');
      }

      return vars;
   }, [selectedTemplate]);

   // Auto-fill campaign name on mount or when user changes
   useEffect(() => {
      if (user?.name && !campaignData.name) {
         const uniqueId = Math.random().toString(36).substring(2, 7).toUpperCase();
         const generatedName = `${user.name} - NotifyNow - ${uniqueId}`;
         setCampaignData(prev => ({ ...prev, name: generatedName }));
      }
   }, [user, currentStep === 1]);

   // Fetch real contacts
   useEffect(() => {
      if (currentStep === 3 && campaignData.contactSource === 'existing') {
         const fetchContacts = async () => {
            setLoadingContacts(true);
            try {
               const data = await contactService.getContacts();
               setContacts(data);
            } catch (error) {
               console.error("Failed to fetch contacts", error);
               toast({
                  title: "Error",
                  description: "Failed to load contacts.",
                  variant: "destructive"
               });
            } finally {
               setLoadingContacts(false);
            }
         };
         fetchContacts();
      }
   }, [currentStep, campaignData.contactSource]);

   // Auto-mapping logic
   useEffect(() => {
      if (detectedColumns.length > 0 && templateVariables.length > 0) {
         console.log('🤖 Attempting auto-mapping for columns:', detectedColumns);
         setCampaignData(prev => {
            const newMapping = { ...prev.fieldMapping };
            let mappedCount = 0;

            templateVariables.forEach(v => {
               // Skip if already mapped manually
               if (newMapping[v]?.value) return;

               const matchedCol = detectedColumns.find(col =>
                  col.toLowerCase().trim() === v.toLowerCase().trim() ||
                  col.toLowerCase().trim().replace(/\s/g, '_') === v.toLowerCase().trim()
               );

               if (matchedCol) {
                  newMapping[v] = { type: 'field', value: matchedCol };
                  mappedCount++;
               }
            });

            if (mappedCount > 0) {
               toast({
                  title: "Auto-mapping complete",
                  description: `Automatically matched ${mappedCount} fields from your file.`
               });
            }
            return { ...prev, fieldMapping: newMapping };
         });
      }
   }, [detectedColumns, templateVariables]);

   const channelConfig = channelOptions.find(c => c.value === campaignData.channel);

   // Get current rate per message
   const getCurrentRate = () => {
      let costPerMsg = channelConfig?.costPerMessage || 0.25;

      if (campaignData.channel === 'rcs') {
         const type = (selectedTemplate as any)?.template_type || (selectedTemplate as any)?.templateType || 'standard';
         const u = user as any;
         if (type === 'standard' || type === 'text_message') {
            costPerMsg = parseFloat(u?.rcs_text_price) || 0.10;
         } else if (type === 'rich_card' || type === 'rich-card') {
            costPerMsg = parseFloat(u?.rcs_rich_card_price) || 0.15;
         } else if (type === 'carousel') {
            costPerMsg = parseFloat(u?.rcs_carousel_price) || 0.20;
         }
      }
      return costPerMsg;
   };

   // Calculate estimated cost
   const calculateCost = () => {
      return campaignData.audienceCount * getCurrentRate();
   };

   const handleNext = () => {
      if (currentStep < 5) {
         setCurrentStep(currentStep + 1);
      } else {
         // Complete campaign creation
         onComplete({
            ...campaignData,
            estimatedCost: calculateCost(),
         });
      }
   };

   const handleBack = () => {
      if (currentStep > 1) {
         setCurrentStep(currentStep - 1);
      }
   };

   // --- AUTO-SYNC EXTERNAL TEMPLATE DETAILS ---
   const [isSyncingTemplate, setIsSyncingTemplate] = useState(false);
   useEffect(() => {
      const syncExternalDetails = async () => {
         // Check if it's an RCS template with "External Template" placeholder
         const isExternalPlaceholder = selectedTemplate?.body === 'External Template' || !selectedTemplate?.body;
         const isRcs = selectedTemplate?.channel === 'rcs';

         if (isRcs && isExternalPlaceholder && !isSyncingTemplate) {
            try {
               setIsSyncingTemplate(true);
               console.log(`🔄 Auto-syncing details for external template: ${selectedTemplate.name}`);
               const result = await rcsTemplatesService.syncTemplateDetails(selectedTemplate.name);

               if (result.success) {
                  // After successful sync, we need to refresh the template in our list
                  // Usually parent's 'templates' stays the same until a full refresh
                  // To avoid full refresh, we'll manually patch our local 'templates' reference if possible
                  // or rely on user to proceed and CampaignCreationStepper will re-run the useMemo
                  toast({
                     title: "Template Synced",
                     description: "Successfully fetched full template details from Dotgo.",
                  });

                  // Trigger a re-fetch of templates in the parent if possible or force update
                  // But since 'templates' is a prop, we can't mutate it easily without a callback.
                  // For now, we'll suggest proceeding or wait for the parent to re-render.
                  // NOTE: The backend sync already updated the DB, so next time it's fetched it will be correct.
               }
            } catch (err) {
               console.error("Failed to auto-sync template details:", err);
            } finally {
               setIsSyncingTemplate(false);
            }
         }
      };

      if (selectedTemplate && currentStep === 2) {
         syncExternalDetails();
      }
   }, [selectedTemplate?.id, currentStep]);

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
         // Parse file properly
         const reader = new FileReader();
         reader.onload = (event) => {
            const text = event.target?.result as string;
            const rows = text.split('\n').map(row => row.split(','));
            const headers = rows[0].map(h => h.trim());

            setDetectedColumns(headers);
            setCsvPreview(rows.slice(1, 6)); // Preview first 5 rows
            setCampaignData({
               ...campaignData,
               uploadedFile: file,
               audienceCount: rows.length - 1 // Exclude header
            });
         };
         reader.readAsText(file);
      }
   };

   const handleConfirmUpload = () => {
      setIsUploadDialogOpen(false);
      setCampaignData(prev => ({
         ...prev,
         contactSource: 'upload'
      }));
      toast({
         title: "File Uploaded",
         description: `${campaignData.audienceCount} contacts ready for campaign.`
      });
   };

   // Filtered contacts based on search and filters
   const filteredContacts = useMemo(() => {
      return contacts.filter(contact => {
         // Search filter
         const searchMatch = contactSearch === '' ||
            contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
            contact.phone.includes(contactSearch) ||
            (contact.email && contact.email.toLowerCase().includes(contactSearch.toLowerCase()));

         // Segment filter
         const segmentMatch = segmentFilter === 'all' || (contact.category || 'lead') === segmentFilter.toLowerCase(); // Map segment to category

         // Date filter
         let dateMatch = true;
         if (dateFilter !== 'all' && contact.created_at) {
            const now = new Date();
            const contactDate = new Date(contact.created_at);
            const daysDiff = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));

            if (dateFilter === 'last7') dateMatch = daysDiff <= 7;
            else if (dateFilter === 'last30') dateMatch = daysDiff <= 30;
            else if (dateFilter === 'last90') dateMatch = daysDiff <= 90;
         }

         return searchMatch && segmentMatch && dateMatch;
      });
   }, [contacts, contactSearch, segmentFilter, dateFilter]); // Added contacts to dependency

   // Handle contact selection
   const toggleContactSelection = (contactId: string) => {
      setSelectedContactIds(prev => {
         const newSelection = prev.includes(contactId)
            ? prev.filter(id => id !== contactId)
            : [...prev, contactId];

         setCampaignData(prevData => ({
            ...prevData,
            audienceCount: newSelection.length,
            selectedContacts: newSelection
         }));

         return newSelection;
      });
   };

   const toggleAllContacts = () => {
      if (selectedContactIds.length === filteredContacts.length) {
         setSelectedContactIds([]);
         setCampaignData(prev => ({ ...prev, audienceCount: 0, selectedContacts: [] }));
      } else {
         const allIds = filteredContacts.map(c => c.id);
         setSelectedContactIds(allIds);
         setCampaignData(prev => ({ ...prev, audienceCount: allIds.length, selectedContacts: allIds }));
      }
   };

   const downloadSampleFile = () => {
      // Create headers based on detected variables + basic fields
      const headers = ['Name', 'Phone', ...templateVariables];
      const sampleRow = ['John Doe', '+919876543210', ...templateVariables.map(v => `Value for ${v}`)];

      const csvContent = [
         headers.join(','),
         sampleRow.join(',')
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sample_${selectedTemplate?.name || 'campaign'}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({
         title: "Sample Downloaded",
         description: `Use this file structure for your ${selectedTemplate?.name} campaign.`
      });
   };

   const handleSendTest = async () => {
      if (!testDestination) return;

      setIsSendingTest(true);
      try {
         // Prepare variables (using custom values or mock data for fields)
         const variables: Record<string, string> = {};
         templateVariables.forEach(v => {
            const mapping = campaignData.fieldMapping[v];
            if (mapping) {
               if (mapping.type === 'custom') {
                  variables[v] = mapping.value;
               } else if (csvPreview.length > 0) {
                  const colIndex = detectedColumns.indexOf(mapping.value);
                  variables[v] = colIndex >= 0 ? csvPreview[0][colIndex] : `[${mapping.value}]`;
               } else {
                  variables[v] = `[${mapping.value}]`;
               }
            }
         });

         const response = await campaignService.sendTest({
            channel: campaignData.channel,
            template_id: campaignData.templateId,
            destination: testDestination,
            variables
         });

         if (response.success) {
            toast({
               title: "Test Sent",
               description: "Message sent successfully. Check the preview in the response.",
            });
            // We could also show the preview in a dialog or toast
            setIsTestDialogOpen(false);
         }
      } catch (error) {
         console.error(error);
         toast({
            title: "Error",
            description: "Failed to send test message",
            variant: "destructive"
         });
      } finally {
         setIsSendingTest(false);
      }
   };

   const canProceed = () => {
      switch (currentStep) {
         case 1:
            return campaignData.name.trim() !== '' && campaignData.channel;
         case 2:
            return campaignData.templateId !== '';
         case 3:
            if (campaignData.contactSource === 'manual') {
               const count = campaignData.manualNumbers.split(/[\n,\s]+/).filter(n => n.trim()).length;
               return count > 0;
            }
            return campaignData.audienceCount > 0;
         case 4:
            return templateVariables.every(v => {
               const mapping = campaignData.fieldMapping[v];
               return mapping && mapping.value && mapping.value.trim() !== '';
            });
         case 5:
            if (campaignData.scheduleType === 'now') {
               const cost = calculateCost();
               const balance = user?.wallet_balance || 0;
               return cost <= balance;
            }
            if (campaignData.scheduleType === 'scheduled') {
               if (campaignData.schedulingMode === 'one-time') {
                  return campaignData.scheduledDate !== '' && campaignData.scheduledTime !== '';
               } else {
                  if (!campaignData.scheduledDate || !campaignData.scheduledTime || !campaignData.endDate || !campaignData.endTime) return false;
                  if (campaignData.frequency === 'weekly' && campaignData.repeatDays.length === 0) return false;
                  return true;
               }
            }
            return true;
         default:
            return true;
      }
   };



   const filteredTemplates = useMemo(() => {
      return templates.filter(t => t.channel === campaignData.channel && t.status === 'approved');
   }, [templates, campaignData.channel]);



   return (
      <div className="flex flex-col h-full max-h-full overflow-hidden bg-background">
         {/* Stepper Header */}
         <div className="flex-shrink-0 px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center justify-between max-w-5xl mx-auto w-full">
               {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                     <div className="flex items-center gap-3">
                        <div
                           className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all",
                              currentStep > step.id && "bg-primary text-primary-foreground",
                              currentStep === step.id && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                              currentStep < step.id && "bg-muted text-muted-foreground"
                           )}
                        >
                           {currentStep > step.id ? <Check className="h-5 w-5" /> : step.id}
                        </div>
                        <div className="hidden md:block">
                           <p className={cn(
                              "font-medium text-sm",
                              currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                           )}>
                              {step.title}
                           </p>
                           <p className="text-xs text-muted-foreground">{step.description}</p>
                        </div>
                     </div>
                     {index < steps.length - 1 && (
                        <div className={cn(
                           "w-12 lg:w-24 h-0.5 mx-4",
                           currentStep > step.id ? "bg-primary" : "bg-muted"
                        )} />
                     )}
                  </div>
               ))}
            </div>
         </div>

         {/* Main Content Area - Split View */}
         <div className="flex-1 overflow-hidden">
            <div className="h-full flex flex-col lg:flex-row">
               {/* Left Column: Form Steps */}
               <div className="flex-1 overflow-y-auto p-6 scrollbar-hide no-scrollbar">
                  <div className="max-w-2xl mx-auto pb-20">

                     {/* Step 1: Basic Details */}
                     {currentStep === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                           <div>
                              <h2 className="text-xl font-semibold mb-1">Campaign Details</h2>
                              <p className="text-muted-foreground">Enter the basic information for your campaign</p>
                           </div>

                           <div className="space-y-4">
                              <div className="space-y-2">
                                 <Label>Campaign Name *</Label>
                                 <Input
                                    placeholder="e.g., New Year Sale Campaign"
                                    value={campaignData.name}
                                    onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                                 />
                              </div>

                              <div className="space-y-2">
                                 <Label>Select Channel *</Label>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {channelOptions.filter(opt => enabledChannels.includes(opt.value)).map((channel) => (
                                       <button
                                          key={channel.value}
                                          onClick={() => {
                                             if (channel.value === 'sms' && onSmsSelect) {
                                                onSmsSelect();
                                             } else if (channel.value === 'whatsapp' && onWhatsappSelect) {
                                                onWhatsappSelect();
                                             } else {
                                                setCampaignData({ ...campaignData, channel: channel.value as Channel, templateId: '' });
                                             }
                                          }}
                                          className={cn(
                                             "p-4 rounded-lg border-2 text-center transition-all hover:border-primary hover:bg-primary/5",
                                             campaignData.channel === channel.value && "border-primary bg-primary/10"
                                          )}
                                       >
                                          <span className="text-2xl">{channel.icon}</span>
                                          <p className="font-medium mt-1">{channel.label}</p>
                                          <p className="text-xs text-muted-foreground">₹{channel.costPerMessage}/msg</p>
                                       </button>
                                    ))}
                                 </div>
                                 {enabledChannels.length === 0 && (
                                    <div className="p-8 border-2 border-dashed rounded-lg text-center bg-muted/30">
                                       <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                                       <p className="text-muted-foreground">No channels active in your profile.</p>
                                       <p className="text-sm text-muted-foreground">Please contact administrator or enable them in settings.</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Step 2: Template Selection */}
                     {currentStep === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                           <div>
                              <h2 className="text-xl font-semibold mb-1">Select Template</h2>
                              <p className="text-muted-foreground">Choose a template for your {channelConfig?.label} campaign</p>
                           </div>

                           <div className="space-y-4">
                              <div className="space-y-2">
                                 <Label>Template *</Label>
                                 {filteredTemplates.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                       {filteredTemplates.map((template) => (
                                          <div
                                             key={template.id}
                                             onClick={() => setCampaignData({ ...campaignData, templateId: template.id })}
                                             className={cn(
                                                "p-4 rounded-lg border-2 cursor-pointer transition-all hover:border-primary hover:bg-muted/50 flex items-center justify-between",
                                                campaignData.templateId === template.id && "border-primary bg-primary/5 ring-1 ring-primary"
                                             )}
                                          >
                                             <div className="flex items-center gap-3">
                                                <div>
                                                   <p className="font-medium text-sm">{template.name}</p>
                                                   <p className="text-[11px] text-muted-foreground line-clamp-1">
                                                      {template.body === 'External Template' ? 'Fetch full details from Dotgo' : template.body.substring(0, 70)}
                                                   </p>
                                                </div>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                {isSyncingTemplate && campaignData.templateId === template.id && (
                                                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold animate-pulse">
                                                      <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                                      <span>SYNCING</span>
                                                   </div>
                                                )}
                                                <Badge variant={template.status === 'approved' ? 'default' : 'secondary'} className="text-[10px] h-5">
                                                   {template.status}
                                                </Badge>
                                             </div>
                                          </div>
                                       ))}
                                    </div>
                                 ) : (
                                    <div className="p-8 border-2 border-dashed rounded-lg text-center">
                                       <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                                       <p className="text-muted-foreground">No templates available for {channelConfig?.label}</p>
                                       <p className="text-sm text-muted-foreground">Create a template first in the Templates tab</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     )}

                     {/* Step 3: Audience */}
                     {currentStep === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                           <div className="flex items-center justify-between">
                              <div>
                                 <h2 className="text-xl font-semibold mb-1">Select Audience</h2>
                                 <p className="text-muted-foreground">Choose existing contacts or upload a file (Real Data)</p>
                              </div>
                              <div className="flex bg-muted p-1 rounded-lg">
                                 <button
                                    onClick={() => setCampaignData({ ...campaignData, contactSource: 'existing' })}
                                    className={cn(
                                       "px-3 py-1 text-sm font-medium rounded-md transition-all",
                                       campaignData.contactSource === 'existing' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                 >
                                    Existing Contacts
                                 </button>
                                 <button
                                    onClick={() => setCampaignData({ ...campaignData, contactSource: 'upload' })}
                                    className={cn(
                                       "px-3 py-1 text-sm font-medium rounded-md transition-all",
                                       campaignData.contactSource === 'upload' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                 >
                                    Upload File
                                 </button>
                                 <button
                                    onClick={() => setCampaignData({ ...campaignData, contactSource: 'manual' })}
                                    className={cn(
                                       "px-3 py-1 text-sm font-medium rounded-md transition-all",
                                       campaignData.contactSource === 'manual' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                 >
                                    Manual Input
                                 </button>
                              </div>
                           </div>

                           {/* Existing Contacts View */}
                           {campaignData.contactSource === 'existing' && (
                              <div className="space-y-4">
                                 <div className="flex flex-col md:flex-row gap-4">
                                    <div className="relative flex-1">
                                       <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                       <Input
                                          placeholder="Search contacts..."
                                          className="pl-9"
                                          value={contactSearch}
                                          onChange={(e) => setContactSearch(e.target.value)}
                                       />
                                    </div>
                                    <div className="flex gap-2">
                                       <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                                          <SelectTrigger className="w-[140px]">
                                             <Filter className="mr-2 h-4 w-4" />
                                             <SelectValue placeholder="Segment" />
                                          </SelectTrigger>
                                          <SelectContent>
                                             <SelectItem value="all">All Segments</SelectItem>
                                             <SelectItem value="lead">Leads</SelectItem>
                                             <SelectItem value="customer">Customers</SelectItem>
                                             <SelectItem value="vip">VIPs</SelectItem>
                                          </SelectContent>
                                       </Select>

                                       <Select value={dateFilter} onValueChange={setDateFilter}>
                                          <SelectTrigger className="w-[140px]">
                                             <Calendar className="mr-2 h-4 w-4" />
                                             <SelectValue placeholder="Date Added" />
                                          </SelectTrigger>
                                          <SelectContent>
                                             <SelectItem value="all">Any Time</SelectItem>
                                             <SelectItem value="last7">Last 7 Days</SelectItem>
                                             <SelectItem value="last30">Last 30 Days</SelectItem>
                                             <SelectItem value="last90">Last 90 Days</SelectItem>
                                          </SelectContent>
                                       </Select>
                                    </div>
                                 </div>

                                 <div className="border rounded-lg overflow-hidden">
                                    <Table>
                                       <TableHeader>
                                          <TableRow>
                                             <TableHead className="w-[50px]">
                                                <Checkbox
                                                   checked={filteredContacts.length > 0 && selectedContactIds.length === filteredContacts.length}
                                                   onCheckedChange={toggleAllContacts}
                                                />
                                             </TableHead>
                                             <TableHead>Name</TableHead>
                                             <TableHead>Phone</TableHead>
                                             <TableHead>Email</TableHead>
                                             <TableHead>Added</TableHead>
                                          </TableRow>
                                       </TableHeader>
                                       <TableBody>
                                          {loadingContacts ? (
                                             <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                   Loading contacts...
                                                </TableCell>
                                             </TableRow>
                                          ) : filteredContacts.length === 0 ? (
                                             <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                                   No contacts found matching your filters.
                                                </TableCell>
                                             </TableRow>
                                          ) : (
                                             filteredContacts.map((contact) => (
                                                <TableRow key={contact.id} className="hover:bg-muted/50">
                                                   <TableCell>
                                                      <Checkbox
                                                         checked={selectedContactIds.includes(contact.id)}
                                                         onCheckedChange={() => toggleContactSelection(contact.id)}
                                                      />
                                                   </TableCell>
                                                   <TableCell className="font-medium">{contact.name}</TableCell>
                                                   <TableCell>{contact.phone}</TableCell>
                                                   <TableCell>{contact.email || '-'}</TableCell>
                                                   <TableCell className="text-muted-foreground text-xs">
                                                      {contact.created_at ? new Date(contact.created_at).toLocaleDateString() : '-'}
                                                   </TableCell>
                                                </TableRow>
                                             ))
                                          )}
                                       </TableBody>
                                    </Table>
                                 </div>
                                 <div className="flex justify-between items-center text-sm text-muted-foreground">
                                    <span>{selectedContactIds.length} contacts selected</span>
                                    <span>Total: {filteredContacts.length}</span>
                                 </div>
                              </div>
                           )}

                           {/* Upload File View */}
                           {campaignData.contactSource === 'upload' && (
                              <div className="space-y-6">
                                 <div
                                    className="border-2 border-dashed rounded-lg p-10 text-center hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => document.getElementById('file-upload')?.click()}
                                 >
                                    <Input
                                       id="file-upload"
                                       type="file"
                                       accept=".csv"
                                       className="hidden"
                                       onChange={handleFileUpload}
                                    />
                                    <div className="flex flex-col items-center gap-2">
                                       <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                                          <Upload className="h-6 w-6" />
                                       </div>
                                       <h3 className="font-semibold text-lg">Click to Upload CSV</h3>
                                       <p className="text-muted-foreground text-sm max-w-sm">
                                          Upload a CSV file with headers. We'll automatically detect columns for variable mapping.
                                       </p>
                                    </div>
                                 </div>

                                 <div className="flex justify-center">
                                    <Button variant="outline" size="sm" onClick={downloadSampleFile}>
                                       <Download className="mr-2 h-4 w-4" />
                                       Download Sample CSV
                                    </Button>
                                 </div>

                                 {campaignData.uploadedFile && (
                                    <div className="animate-in fade-in slide-in-from-bottom-2">
                                       <div className="flex items-center justify-between mb-2">
                                          <h4 className="font-medium flex items-center gap-2">
                                             <FileSpreadsheet className="h-4 w-4 text-green-600" />
                                             {campaignData.uploadedFile.name}
                                          </h4>
                                          <Badge variant="outline">{campaignData.audienceCount} Rows</Badge>
                                       </div>

                                       {csvPreview.length > 0 && (
                                          <div className="border rounded-lg overflow-x-auto">
                                             <Table>
                                                <TableHeader>
                                                   <TableRow>
                                                      {detectedColumns.map((col, i) => (
                                                         <TableHead key={i} className="whitespace-nowrap">{col}</TableHead>
                                                      ))}
                                                   </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                   {csvPreview.map((row, i) => (
                                                      <TableRow key={i}>
                                                         {row.map((cell, j) => (
                                                            <TableCell key={j} className="whitespace-nowrap">{cell}</TableCell>
                                                         ))}
                                                      </TableRow>
                                                   ))}
                                                </TableBody>
                                             </Table>
                                          </div>
                                       )}
                                    </div>
                                 )}
                              </div>
                           )}

                           {/* Manual Input View */}
                           {campaignData.contactSource === 'manual' && (
                              <div className="space-y-4">
                                 <div className="space-y-2">
                                    <Label>Enter Mobile Numbers</Label>
                                    <textarea
                                       className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                       placeholder={`919876543210\n919876543211\n919876543212`}
                                       value={campaignData.manualNumbers}
                                       onChange={(e) => {
                                          const val = e.target.value;
                                          const count = val.split(/[\n,\s]+/).filter(n => n.trim()).length;
                                          setCampaignData({ ...campaignData, manualNumbers: val, audienceCount: count });
                                       }}
                                    />
                                 </div>
                                 <div className="flex items-center justify-between text-sm">
                                    <p className="text-muted-foreground">
                                       Enter one number per line. Include country code (e.g., 91).
                                    </p>
                                    <Badge variant="secondary">{campaignData.audienceCount} numbers</Badge>
                                 </div>
                              </div>
                           )}
                        </div>
                     )}

                     {/* Step 4 & 5 placeholders/existing logic... */}
                     {currentStep >= 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                           {/* Reuse existing logic for Steps 4 and 5 */}
                           {currentStep === 4 && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                 <div className="flex items-center justify-between">
                                    <div>
                                       <h2 className="text-xl font-semibold mb-1">Variable Mapping</h2>
                                       <p className="text-muted-foreground">Map template variables to your data source</p>
                                    </div>
                                    {campaignData.contactSource === 'upload' && (
                                       <Button variant="outline" size="sm" onClick={downloadSampleFile}>
                                          <Download className="mr-2 h-4 w-4" />
                                          Sample CSV
                                       </Button>
                                    )}
                                 </div>

                                 {/* Helper Box */}
                                 <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-primary mt-0.5" />
                                    <div className="text-sm">
                                       <p className="font-semibold text-primary mb-1">Required Excel/CSV Structure</p>
                                       <p className="text-muted-foreground mb-2">For this template, please ensure your file has columns for:</p>
                                       <div className="flex flex-wrap gap-2">
                                          {templateVariables.map(v => (
                                             <Badge key={v} variant="secondary" className="font-mono text-[10px]">{v}</Badge>
                                          ))}
                                       </div>
                                    </div>
                                 </div>

                                 <div className="space-y-4">
                                    {templateVariables.length > 0 ? (
                                       templateVariables.map(variable => (
                                          <div key={variable} className="p-5 border rounded-xl bg-card shadow-sm hover:shadow-md transition-all border-l-4 border-l-primary">
                                             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex-1">
                                                   <div className="flex items-center gap-2 mb-1">
                                                      <Badge variant="outline" className="text-primary font-mono">{`{{${variable}}}`}</Badge>
                                                      <span className="text-sm font-medium text-muted-foreground">maps to</span>
                                                   </div>
                                                   <p className="text-xs text-muted-foreground">Select where to get data for this variable</p>
                                                </div>

                                                <div className="flex flex-col gap-2 min-w-[240px]">
                                                   <div className="flex gap-2">
                                                      <Select
                                                         value={campaignData.fieldMapping[variable]?.type || 'custom'}
                                                         onValueChange={(val: any) => {
                                                            setCampaignData(prev => ({
                                                               ...prev,
                                                               fieldMapping: {
                                                                  ...prev.fieldMapping,
                                                                  [variable]: { ...prev.fieldMapping[variable], type: val, value: '' }
                                                               }
                                                            }));
                                                         }}
                                                      >
                                                         <SelectTrigger className="w-32">
                                                            <SelectValue />
                                                         </SelectTrigger>
                                                         <SelectContent>
                                                            <SelectItem value="field">Field</SelectItem>
                                                            <SelectItem value="custom">Custom</SelectItem>
                                                         </SelectContent>
                                                      </Select>

                                                      {campaignData.fieldMapping[variable]?.type === 'field' ? (
                                                         <Select
                                                            value={campaignData.fieldMapping[variable]?.value || ''}
                                                            onValueChange={(val) => {
                                                               setCampaignData(prev => ({
                                                                  ...prev,
                                                                  fieldMapping: { ...prev.fieldMapping, [variable]: { type: 'field', value: val } }
                                                               }));
                                                            }}
                                                         >
                                                            <SelectTrigger className="flex-1">
                                                               <SelectValue placeholder="Select Column..." />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                               {campaignData.contactSource === 'upload' ? (
                                                                  detectedColumns.length > 0 ? (
                                                                     detectedColumns.map(col => (
                                                                        <SelectItem key={col} value={col}>{col}</SelectItem>
                                                                     ))
                                                                  ) : (
                                                                     <SelectItem value="no_cols" disabled>Upload a file first</SelectItem>
                                                                  )
                                                               ) : (
                                                                  <>
                                                                     <SelectItem value="name">Name</SelectItem>
                                                                     <SelectItem value="phone">Phone</SelectItem>
                                                                     <SelectItem value="email">Email</SelectItem>
                                                                     <SelectItem value="city">City</SelectItem>
                                                                  </>
                                                               )}
                                                            </SelectContent>
                                                         </Select>
                                                      ) : (
                                                         <div className="flex flex-1 gap-2 items-center">
                                                            <Input
                                                               placeholder={variable === 'header_url' ? "Enter URL or Handle..." : "Enter static value..."}
                                                               className="flex-1"
                                                               value={campaignData.fieldMapping[variable]?.value || ''}
                                                               onChange={(e) => {
                                                                  setCampaignData(prev => ({
                                                                     ...prev,
                                                                     fieldMapping: { ...prev.fieldMapping, [variable]: { type: 'custom', value: e.target.value } }
                                                                  }));
                                                               }}
                                                            />
                                                            {variable === 'header_url' && campaignData.channel === 'whatsapp' && (
                                                               <div className="relative">
                                                                  <input
                                                                     type="file"
                                                                     id={`file-upload-${variable}`}
                                                                     className="hidden"
                                                                     accept="image/*,video/*,application/pdf"
                                                                     disabled={isUploadingMedia[variable]}
                                                                     onChange={async (e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (!file) return;
                                                                        setIsUploadingMedia(prev => ({ ...prev, [variable]: true }));
                                                                        try {
                                                                           const handle = await whatsappService.uploadHeaderHandle(file);
                                                                           setCampaignData(prev => ({
                                                                              ...prev,
                                                                              fieldMapping: { ...prev.fieldMapping, [variable]: { type: 'custom', value: handle } }
                                                                           }));
                                                                           toast({ title: 'Media Uploaded', description: 'Header media uploaded successfully.' });
                                                                        } catch (err: any) {
                                                                           const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to upload header media';
                                                                           toast({ title: 'Upload Failed', description: errMsg, variant: 'destructive' });
                                                                        } finally {
                                                                           setIsUploadingMedia(prev => ({ ...prev, [variable]: false }));
                                                                        }
                                                                     }}
                                                                  />
                                                                  <Button
                                                                     type="button"
                                                                     variant="outline"
                                                                     size="icon"
                                                                     title="Upload Media"
                                                                     disabled={isUploadingMedia[variable]}
                                                                     onClick={() => { document.getElementById(`file-upload-${variable}`)?.click(); }}
                                                                  >
                                                                     {isUploadingMedia[variable] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                                                                  </Button>
                                                               </div>
                                                            )}
                                                         </div>
                                                      )}
                                                   </div>
                                                </div>
                                             </div>
                                          </div>
                                       ))
                                    ) : (
                                       <div className="p-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
                                          <Smile className="h-10 w-10 mx-auto text-muted-foreground mb-3 opacity-20" />
                                          <h3 className="text-lg font-medium text-muted-foreground">Pure Content Template</h3>
                                          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                             This template doesn't contain any variables. All recipients will receive the exact same message.
                                          </p>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           )}

                           {currentStep === 5 && (
                              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                 <div>
                                    <h2 className="text-xl font-semibold mb-1">Review & Schedule</h2>
                                    <p className="text-muted-foreground">Finalize your campaign details before sending.</p>
                                 </div>

                                 <div className="grid grid-cols-2 gap-4">
                                    <Card>
                                       <CardContent className="p-4 flex flex-col items-center text-center">
                                          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Channel</Label>
                                          <div className="flex items-center gap-2 mb-1">
                                             <span className="text-2xl">
                                                {channelOptions.find(c => c.value === campaignData.channel)?.icon}
                                             </span>
                                             <span className="font-semibold capitalize">{campaignData.channel}</span>
                                          </div>
                                          <Badge variant="secondary" className="text-xs">
                                             {channelOptions.find(c => c.value === campaignData.channel)?.label}
                                          </Badge>
                                       </CardContent>
                                    </Card>

                                    <Card>
                                       <CardContent className="p-4 flex flex-col items-center text-center">
                                          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Template</Label>
                                          <div className="font-semibold line-clamp-1 mb-1" title={selectedTemplate?.name}>
                                             {selectedTemplate?.name}
                                          </div>
                                          <Badge variant={selectedTemplate?.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                                             {selectedTemplate?.status}
                                          </Badge>
                                       </CardContent>
                                    </Card>

                                    <Card>
                                       <CardContent className="p-4 flex flex-col items-center text-center">
                                          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Audience</Label>
                                          <div className="flex items-center gap-2 mb-1">
                                             <Users className="h-5 w-5 text-primary" />
                                             <span className="font-semibold text-2xl">{campaignData.audienceCount}</span>
                                          </div>
                                          <div className="text-xs text-muted-foreground">Recipients</div>
                                       </CardContent>
                                    </Card>

                                    <Card className={cn(
                                       "relative overflow-hidden",
                                       calculateCost() > (user?.wallet_balance || 0) && "border-destructive bg-destructive/5"
                                    )}>
                                       <CardContent className="p-4 flex flex-col items-center text-center">
                                          <Label className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Est. Cost</Label>
                                          <div className="flex items-center gap-1 mb-1">
                                             <span className="text-sm font-medium text-muted-foreground">₹</span>
                                             <span className={cn(
                                                "font-semibold text-2xl",
                                                calculateCost() > (user?.wallet_balance || 0) ? "text-destructive" : "text-primary"
                                             )}>
                                                {calculateCost().toFixed(2)}
                                             </span>
                                          </div>
                                          <div className="text-xs text-muted-foreground">@ ₹{getCurrentRate().toFixed(2)}/msg</div>
                                          {calculateCost() > (user?.wallet_balance || 0) && (
                                             <div className="mt-2 text-[10px] font-bold text-destructive flex items-center gap-1">
                                                <AlertCircle className="h-3 w-3" />
                                                INSUFFICIENT BALANCE
                                             </div>
                                          )}
                                       </CardContent>
                                    </Card>
                                 </div>

                                 {calculateCost() > (user?.wallet_balance || 0) && (
                                    <div className="p-4 rounded-lg border border-destructive bg-destructive/10 flex items-start gap-3 animate-pulse">
                                       <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                                       <div>
                                          <p className="font-semibold text-destructive">Insufficient Wallet Balance</p>
                                          <p className="text-sm text-destructive/80">
                                             Estimated cost (₹{calculateCost().toFixed(2)}) exceeds your current balance (₹{(user?.wallet_balance || 0).toFixed(2)}).
                                             Please recharge your wallet to continue.
                                          </p>
                                          <Button
                                             variant="outline"
                                             size="sm"
                                             className="mt-2 border-destructive text-destructive hover:bg-destructive hover:text-white"
                                             onClick={() => window.open('/wallet', '_blank')}
                                          >
                                             Recharge Wallet
                                          </Button>
                                       </div>
                                    </div>
                                 )}

                                 <div className="border rounded-lg p-6 bg-muted/20">
                                    <Label className="text-base font-semibold mb-4 block">Scheduling Options</Label>
                                    <RadioGroup
                                       value={campaignData.scheduleType}
                                       onValueChange={(v: any) => setCampaignData({ ...campaignData, scheduleType: v })}
                                       className="grid grid-cols-2 gap-4 mb-6"
                                    >
                                       <div onClick={() => setCampaignData({ ...campaignData, scheduleType: 'now' })} className={cn("border-2 rounded-lg p-4 cursor-pointer transition-all hover:bg-background", campaignData.scheduleType === 'now' ? "border-primary bg-primary/5" : "border-transparent bg-background")}>
                                          <div className="flex items-center gap-2 mb-2">
                                             <RadioGroupItem value="now" id="now" />
                                             <Label htmlFor="now" className="font-semibold cursor-pointer">Send Immediately</Label>
                                          </div>
                                          <p className="text-xs text-muted-foreground pl-6">Campaign will launch as soon as you click send.</p>
                                       </div>

                                       <div onClick={() => setCampaignData({ ...campaignData, scheduleType: 'scheduled' })} className={cn("border-2 rounded-lg p-4 cursor-pointer transition-all hover:bg-background", campaignData.scheduleType === 'scheduled' ? "border-primary bg-primary/5" : "border-transparent bg-background")}>
                                          <div className="flex items-center gap-2 mb-2">
                                             <RadioGroupItem value="scheduled" id="scheduled" />
                                             <Label htmlFor="scheduled" className="font-semibold cursor-pointer">Schedule for Later</Label>
                                          </div>
                                          <p className="text-xs text-muted-foreground pl-6">Pick a future date and time for delivery.</p>
                                       </div>
                                    </RadioGroup>


                                    {campaignData.scheduleType === 'scheduled' && (
                                       <div className="space-y-6 animate-in fade-in pt-2 border-t mt-4">
                                          <div className="flex items-center gap-6 pt-4">
                                             <Label>Frequency:</Label>
                                             <RadioGroup
                                                value={campaignData.schedulingMode}
                                                onValueChange={(value) => setCampaignData({ ...campaignData, schedulingMode: value as 'one-time' | 'repeat' })}
                                                className="flex items-center gap-6"
                                             >
                                                <div className="flex items-center space-x-2">
                                                   <RadioGroupItem value="one-time" id="one-time" />
                                                   <Label htmlFor="one-time">One Time</Label>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                   <RadioGroupItem value="repeat" id="repeat" />
                                                   <Label htmlFor="repeat">Recurring</Label>
                                                </div>
                                             </RadioGroup>
                                          </div>

                                          <div className="grid grid-cols-2 gap-4">
                                             <div className="space-y-2">
                                                <Label>{campaignData.schedulingMode === 'repeat' ? 'Start Date' : 'Date'}</Label>
                                                <div className="relative">
                                                   <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                   <Input
                                                      type="date"
                                                      className="pl-9"
                                                      value={campaignData.scheduledDate}
                                                      onChange={(e) => setCampaignData({ ...campaignData, scheduledDate: e.target.value })}
                                                      min={new Date().toISOString().split('T')[0]}
                                                   />
                                                </div>
                                             </div>
                                             <div className="space-y-2">
                                                <Label>{campaignData.schedulingMode === 'repeat' ? 'Start Time' : 'Time'}</Label>
                                                <div className="relative">
                                                   <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                   <Input
                                                      type="time"
                                                      className="pl-9"
                                                      value={campaignData.scheduledTime}
                                                      onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
                                                   />
                                                </div>
                                             </div>
                                          </div>

                                          {campaignData.schedulingMode === 'repeat' && (
                                             <div className="space-y-4 pt-2">
                                                <div className="space-y-2">
                                                   <Label>Repeat Frequency</Label>
                                                   <Select
                                                      value={campaignData.frequency}
                                                      onValueChange={(v: any) => setCampaignData({ ...campaignData, frequency: v })}
                                                   >
                                                      <SelectTrigger>
                                                         <SelectValue placeholder="Select frequency" />
                                                      </SelectTrigger>
                                                      <SelectContent>
                                                         <SelectItem value="daily">Daily</SelectItem>
                                                         <SelectItem value="weekly">Weekly</SelectItem>
                                                         <SelectItem value="monthly">Monthly</SelectItem>
                                                      </SelectContent>
                                                   </Select>
                                                </div>

                                                {campaignData.frequency === 'weekly' && (
                                                   <div className="space-y-2">
                                                      <Label>Repeat On</Label>
                                                      <div className="flex flex-wrap gap-2">
                                                         {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                                            <button
                                                               key={day}
                                                               onClick={() => {
                                                                  const days = campaignData.repeatDays.includes(day)
                                                                     ? campaignData.repeatDays.filter(d => d !== day)
                                                                     : [...campaignData.repeatDays, day];
                                                                  setCampaignData({ ...campaignData, repeatDays: days });
                                                               }}
                                                               className={cn(
                                                                  "h-8 w-8 rounded-full text-xs font-medium transition-colors border",
                                                                  campaignData.repeatDays.includes(day)
                                                                     ? "bg-primary text-primary-foreground border-primary"
                                                                     : "bg-background hover:bg-muted"
                                                               )}
                                                            >
                                                               {day.charAt(0)}
                                                            </button>
                                                         ))}
                                                      </div>
                                                   </div>
                                                )}

                                                <div className="grid grid-cols-2 gap-4">
                                                   <div className="space-y-2">
                                                      <Label>End Date</Label>
                                                      <Input
                                                         type="date"
                                                         value={campaignData.endDate}
                                                         onChange={(e) => setCampaignData({ ...campaignData, endDate: e.target.value })}
                                                         min={campaignData.scheduledDate}
                                                      />
                                                   </div>
                                                   <div className="space-y-2">
                                                      <Label>End Time</Label>
                                                      <Input
                                                         type="time"
                                                         value={campaignData.endTime}
                                                         onChange={(e) => setCampaignData({ ...campaignData, endTime: e.target.value })}
                                                      />
                                                   </div>
                                                </div>
                                             </div>
                                          )}
                                       </div>
                                    )}
                                 </div>
                              </div>
                           )}
                        </div>
                     )}
                  </div>
               </div>

               {/* Right Column: Sticky Preview */}
               <div className="hidden lg:block w-[380px] border-l bg-muted/5 flex-shrink-0">
                  <div className="sticky top-0 h-screen flex flex-col p-6">
                     <h3 className="font-semibold mb-6 text-center text-muted-foreground uppercase tracking-widest text-xs">Live Preview</h3>
                     <div className="flex-1 flex items-start justify-center overflow-hidden">
                        <CampaignPreview
                           campaignData={campaignData}
                           template={selectedTemplate}
                           variables={templateVariables}
                           csvPreview={csvPreview}
                           detectedColumns={detectedColumns}
                        />
                     </div>
                  </div>
               </div>
            </div>
         </div>





         {/* Footer */}
         <div className="flex-shrink-0 px-6 py-4 border-t bg-background flex items-center justify-between z-50 relative">
            <Button variant="outline" onClick={currentStep === 1 ? onCancel : handleBack}>
               {currentStep === 1 ? (
                  <>
                     <X className="h-4 w-4 mr-2" />
                     Cancel
                  </>
               ) : (
                  <>
                     <ChevronLeft className="h-4 w-4 mr-2" />
                     Back
                  </>
               )}
            </Button>
            <div className="flex items-center gap-4">
               {!canProceed() && (
                  <p className="text-xs text-destructive font-medium animate-pulse">
                     {currentStep === 1 && !campaignData.name.trim() && "Enter campaign name"}
                     {currentStep === 1 && campaignData.name.trim() && !campaignData.channel && "Select channel"}
                     {currentStep === 2 && !campaignData.templateId && "Select a template"}
                     {currentStep === 3 && campaignData.audienceCount === 0 && "Select contacts"}
                     {currentStep === 5 && campaignData.scheduleType === 'now' && calculateCost() > (user?.wallet_balance || 0) && "Insufficient wallet balance"}
                     {currentStep === 5 && campaignData.scheduleType === 'scheduled' && (!campaignData.scheduledDate || !campaignData.scheduledTime) && "Set schedule time"}
                  </p>
               )}
               <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="gradient-primary"
               >
                  {currentStep === 5 ? (
                     <>
                        {campaignData.scheduleType === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
                        <Send className="h-4 w-4 ml-2" />
                     </>
                  ) : (
                     <>
                        Continue
                        <ChevronRight className="h-4 w-4 ml-2" />
                     </>
                  )}
               </Button>
            </div>
         </div>
      </div>
   );
}

