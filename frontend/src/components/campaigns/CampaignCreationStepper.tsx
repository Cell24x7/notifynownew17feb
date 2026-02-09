import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Check, ChevronLeft, ChevronRight, Upload, Download, Users, FileSpreadsheet, Calendar, Send, Clock, X, Plus, AlertCircle, Search, Filter } from 'lucide-react';
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
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface CampaignCreationStepperProps {
  templates: MessageTemplate[];
  onComplete: (campaignData: CampaignData) => void;
  onCancel: () => void;
}

export interface CampaignData {
  name: string;
  channel: Channel;
  templateId: string;
  audienceId: string;
  contactSource: 'existing' | 'upload';
  selectedContacts: string[];
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

export default function CampaignCreationStepper({ templates, onComplete, onCancel }: CampaignCreationStepperProps) {
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

  const selectedTemplate = templates.find(t => t.id === campaignData.templateId);
  
  // Dynamically extract variables from template body
  const templateVariables = useMemo(() => {
    if (!selectedTemplate?.body) return [];
    const matches = selectedTemplate.body.match(/\{\{([^}]+)\}\}/g);
    if (!matches) return [];
    return Array.from(new Set(matches.map(m => m.replace(/\{\{|\}\}/g, ''))));
  }, [selectedTemplate]);

  const channelConfig = channelOptions.find(c => c.value === campaignData.channel);

  // Calculate estimated cost
  const calculateCost = () => {
    const costPerMsg = channelConfig?.costPerMessage || 0.25;
    return campaignData.audienceCount * costPerMsg;
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
    const sampleData = 'Name,Phone,Email,City,Order ID,Amount\nJohn Doe,+919876543210,john@email.com,Mumbai,ORD001,299\nJane Smith,+919876543211,jane@email.com,Delhi,ORD002,450';
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
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
        return campaignData.audienceCount > 0;
      case 4:
        return templateVariables.every(v => {
          const mapping = campaignData.fieldMapping[v];
          return mapping && mapping.value && mapping.value.trim() !== '';
        });
      case 5:
        if (campaignData.scheduleType === 'scheduled') {
          if (campaignData.schedulingMode === 'one-time') {
            return campaignData.scheduledDate && campaignData.scheduledTime;
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

  const filteredTemplates = templates.filter(t => t.channel === campaignData.channel);

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Stepper Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
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

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-6">
          {/* Step 1: Basic Details */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-2xl mx-auto">
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
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {channelOptions.filter(opt => enabledChannels.includes(opt.value)).map((channel) => (
                      <button
                        key={channel.value}
                        onClick={() => setCampaignData({ ...campaignData, channel: channel.value as Channel, templateId: '' })}
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
            <div className="space-y-6 max-w-2xl mx-auto">
              <div>
                <h2 className="text-xl font-semibold mb-1">Select Template</h2>
                <p className="text-muted-foreground">Choose a template for your {channelConfig?.label} campaign</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Template *</Label>
                  {filteredTemplates.length > 0 ? (
                    <Select
                      value={campaignData.templateId}
                      onValueChange={(value) => setCampaignData({ ...campaignData, templateId: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a template" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {filteredTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{template.name}</span>
                              <Badge variant="outline" className="text-xs">{template.status}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-8 border-2 border-dashed rounded-lg text-center">
                      <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground">No templates available for {channelConfig?.label}</p>
                      <p className="text-sm text-muted-foreground">Create a template first in the Templates tab</p>
                    </div>
                  )}
                </div>

                {/* Template Preview */}
                {selectedTemplate && (
                  <Card className="bg-muted/30">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">Template Preview</p>
                        <Badge variant="outline">{selectedTemplate.status}</Badge>
                      </div>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm">{selectedTemplate.body}</p>
                        {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">Variables:</span>
                            {selectedTemplate.variables.map((v: any) => (
                              <Badge key={typeof v === 'string' ? v : v.name} variant="secondary" className="text-xs">
                                {`{{${typeof v === 'string' ? v : (v.name || v)}}}`}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Audience Selection */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1">Select Audience</h2>
                <p className="text-muted-foreground">Choose existing contacts or upload a file (Real Data)</p>
              </div>

               <div className="grid grid-cols-2 gap-4 max-w-2xl">
                   <div 
                      onClick={() => setCampaignData({...campaignData, contactSource: 'existing'})}
                      className={cn(
                          "flex flex-col items-center justify-between rounded-lg border-2 p-6 cursor-pointer transition-all hover:bg-muted/50",
                          campaignData.contactSource === 'existing' && "border-primary bg-primary/5"
                      )}
                    >
                      <Users className="h-10 w-10 mb-3 text-primary" />
                      <span className="font-semibold">Choose from Contacts</span>
                      <span className="text-sm text-muted-foreground text-center mt-1">Select from real database contacts</span>
                    </div>

                    <div 
                      onClick={() => setIsUploadDialogOpen(true)}
                       className={cn(
                          "flex flex-col items-center justify-between rounded-lg border-2 p-6 cursor-pointer transition-all hover:bg-muted/50",
                          campaignData.contactSource === 'upload' && "border-primary bg-primary/5"
                      )}
                    >
                      <Upload className="h-10 w-10 mb-3 text-primary" />
                      <span className="font-semibold">Upload File</span>
                      <span className="text-sm text-muted-foreground text-center mt-1">Upload new CSV/Excel list</span>
                    </div>
               </div>

              {campaignData.contactSource === 'existing' && (
                <div className="space-y-4">
                  {/* Filters */}
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px] max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search contacts..."
                        value={contactSearch}
                        onChange={(e) => setContactSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={segmentFilter} onValueChange={setSegmentFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Segment" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="all">All Segments</SelectItem>
                        <SelectItem value="guest">Guest</SelectItem>
                        <SelectItem value="lead">Lead</SelectItem>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contacts Table */}
                  <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto relative">
                    {loadingContacts && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={filteredContacts.length > 0 && selectedContactIds.length === filteredContacts.length}
                              onCheckedChange={toggleAllContacts}
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContacts.length > 0 ? (
                          filteredContacts.map((contact) => (
                            <TableRow 
                              key={contact.id}
                              className={cn(
                                "cursor-pointer hover:bg-muted/50",
                                selectedContactIds.includes(contact.id) && "bg-primary/5"
                              )}
                              onClick={() => toggleContactSelection(contact.id)}
                            >
                              <TableCell onClick={(e) => e.stopPropagation()}>
                                <Checkbox 
                                  checked={selectedContactIds.includes(contact.id)}
                                  onCheckedChange={() => toggleContactSelection(contact.id)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{contact.name}</TableCell>
                              <TableCell className="text-muted-foreground">{contact.phone}</TableCell>
                              <TableCell className="text-muted-foreground">{contact.email || '-'}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs uppercase">{contact.category || 'lead'}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">
                                {contact.created_at ? format(new Date(contact.created_at), 'dd MMM yyyy') : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              {loadingContacts ? 'Loading contacts...' : 'No contacts found matching your filters'}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Showing {filteredContacts.length} contacts • {selectedContactIds.length} selected
                  </p>
                </div>
              )}

              {campaignData.contactSource === 'upload' && campaignData.uploadedFile && (
                 <div className="space-y-4 max-w-2xl border p-4 rounded-lg bg-green-50 border-green-200">
                    <div className="flex items-center gap-4">
                        <FileSpreadsheet className="h-8 w-8 text-green-600" />
                        <div>
                            <p className="font-medium text-green-900 line-clamp-1">{campaignData.uploadedFile.name}</p>
                            <p className="text-sm text-green-700">{campaignData.audienceCount} contacts ready</p>
                        </div>
                         <Button variant="outline" size="sm" className="ml-auto" onClick={() => setIsUploadDialogOpen(true)}>
                            Change File
                        </Button>
                    </div>
                 </div>
              )}

              <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogContent className="max-w-3xl">
                      <DialogHeader>
                          <DialogTitle>Upload Contact List</DialogTitle>
                          <DialogDescription>
                              Upload a CSV file to use for this campaign.
                          </DialogDescription>
                      </DialogHeader>

                      <div className="grid grid-cols-1 gap-6 py-4">
                          <div className="border-2 border-dashed rounded-lg p-8 text-center transition-colors hover:bg-muted/50">
                                <input
                                  type="file"
                                  accept=".csv,.xlsx,.xls"
                                  onChange={handleFileUpload}
                                  className="hidden"
                                  id="popup-file-upload"
                                />
                                <label htmlFor="popup-file-upload" className="cursor-pointer block w-full h-full">
                                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                                  <p className="font-medium">Click to upload CSV</p>
                                  <p className="text-xs text-muted-foreground mt-1">Supported: .csv, .xlsx</p>
                                </label>
                          </div>
                          
                          <div className="text-center">
                              <Button variant="link" onClick={downloadSampleFile} size="sm">
                                  <Download className="h-4 w-4 mr-2" />
                                  Download Sample Template
                              </Button>
                          </div>

                          {csvPreview.length > 0 && (
                            <div className="space-y-2">
                              <Label>Preview (first 5 rows)</Label>
                              <div className="border rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      {detectedColumns.map((col, i) => (
                                        <TableHead key={i} className="h-8 py-1">{col}</TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {csvPreview.map((row, i) => (
                                      <TableRow key={i}>
                                        {row.map((cell, j) => (
                                          <TableCell key={j} className="py-2 text-xs">{cell}</TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          )}
                      </div>

                      <DialogFooter>
                          <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>Cancel</Button>
                          <Button 
                             disabled={!campaignData.uploadedFile} 
                             onClick={handleConfirmUpload}
                             className="bg-green-600 hover:bg-green-700 text-white"
                          >
                             <Check className="h-4 w-4 mr-2" />
                             Confrim & Use File
                          </Button>
                      </DialogFooter>
                  </DialogContent>
              </Dialog>

              {campaignData.audienceCount > 0 && (
                <Card className="bg-primary/5 border-primary/20 max-w-2xl">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Users className="h-6 w-6 text-primary" />
                      <div>
                        <p className="font-semibold">{campaignData.audienceCount.toLocaleString()} Contacts Selected</p>
                        <p className="text-sm text-muted-foreground">
                          Estimated cost: ₹{calculateCost().toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Variable Mapping */}
          {currentStep === 4 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h2 className="text-xl font-semibold mb-1">Map Variables</h2>
                <p className="text-muted-foreground">Map your data columns to template variables</p>
              </div>

              {templateVariables.length > 0 ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium mb-2">Template Preview:</p>
                    <p className="text-sm text-muted-foreground">{selectedTemplate?.body}</p>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    {templateVariables.map((variable) => {
                      const mapping = campaignData.fieldMapping[variable] || { type: 'field', value: '' };
                      return (
                        <div key={variable} className="space-y-3">
                          <div className="flex items-center gap-4">
                            <div className="w-32">
                              <Badge className="mb-1 bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">{`{{${variable}}}`}</Badge>
                              <p className="text-sm text-muted-foreground">Template variable</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "transition-all",
                                    mapping.type === 'field' && "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white border-emerald-500"
                                  )}
                                  onClick={() => setCampaignData({
                                    ...campaignData,
                                    fieldMapping: { 
                                      ...campaignData.fieldMapping, 
                                      [variable]: { type: 'field', value: mapping.value } 
                                    }
                                  })}
                                >
                                  From Column
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "transition-all",
                                    mapping.type === 'custom' && "bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700" // Inactive style for screenshot match? Wait, screenshot shows Active=Green, Inactive=White
                                    // Actually screenshot shows: Active tab has background.
                                    // Let's stick to: Active = Green, Inactive = Outline/Default
                                  )}
                                  // Wait, simpler approach:
                                  // Active: bg-emerald-500 text-white
                                  // Inactive: bg-background border
                                /> */
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className={cn(
                                    "transition-all",
                                    mapping.type === 'custom' && "bg-emerald-500 text-white hover:bg-emerald-600 hover:text-white border-emerald-500"
                                  )}
                                  onClick={() => setCampaignData({
                                    ...campaignData,
                                    fieldMapping: { 
                                      ...campaignData.fieldMapping, 
                                      [variable]: { type: 'custom', value: '' } 
                                    }
                                  })}
                                >
                                  Custom Value
                                </Button>
                              </div>
                              {mapping.type === 'field' ? (
                                <Select
                                  value={mapping.value}
                                  onValueChange={(value) => setCampaignData({
                                    ...campaignData,
                                    fieldMapping: { 
                                      ...campaignData.fieldMapping, 
                                      [variable]: { type: 'field', value } 
                                    }
                                  })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select column" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-background z-50">
                                    {detectedColumns.map((col) => (
                                      <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input
                                  placeholder="Enter custom value..."
                                  value={mapping.value}
                                  onChange={(e) => setCampaignData({
                                    ...campaignData,
                                    fieldMapping: { 
                                      ...campaignData.fieldMapping, 
                                      [variable]: { type: 'custom', value: e.target.value } 
                                    }
                                  })}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator />

                  <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                    <p className="text-sm font-medium mb-2">Sample Message Preview:</p>
                    <p className="text-sm">
                      {selectedTemplate?.body.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
                        const mapping = campaignData.fieldMapping[variable];
                        if (mapping) {
                          if (mapping.type === 'custom') {
                            return mapping.value || `[${variable}]`;
                          }
                          // For field type, show sample data from CSV
                          if (csvPreview.length > 0) {
                            const colIndex = detectedColumns.indexOf(mapping.value);
                            return colIndex >= 0 ? csvPreview[0][colIndex] : `[${mapping.value}]`;
                          }
                          return `[${mapping.value}]`;
                        }
                        return `[${variable}]`;
                      })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-muted/50 rounded-lg">
                  <Check className="h-12 w-12 mx-auto text-success mb-3" />
                  <p className="font-medium">No variables to map</p>
                  <p className="text-sm text-muted-foreground">Your template doesn't contain any dynamic variables</p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Review & Schedule */}
          {currentStep === 5 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h2 className="text-xl font-semibold mb-1">Review & Schedule</h2>
                <p className="text-muted-foreground">Review your campaign details and schedule</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Campaign Name</p>
                    <p className="font-semibold">{campaignData.name}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Channel</p>
                    <ChannelBadge channel={campaignData.channel} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Template</p>
                    <p className="font-semibold font-mono">{selectedTemplate?.name}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground mb-1">Audience</p>
                    <p className="font-semibold">{campaignData.audienceCount.toLocaleString()} contacts</p>
                  </CardContent>
                </Card>
              </div>

              {/* Cost Summary */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Estimated Cost</p>
                      <p className="text-2xl font-bold text-primary">₹{calculateCost().toFixed(2)}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{campaignData.audienceCount} messages × ₹{channelConfig?.costPerMessage}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Schedule Options */}
              <div className="space-y-4">
                <Label>When do you want to send?</Label>
                <RadioGroup
                  value={campaignData.scheduleType}
                  onValueChange={(value) => setCampaignData({ ...campaignData, scheduleType: value as 'now' | 'scheduled' })}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="now" id="now" className="peer sr-only" />
                    <Label
                      htmlFor="now"
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                        campaignData.scheduleType === 'now' && "border-primary bg-primary/5"
                      )}
                    >
                      <Send className="h-6 w-6 text-primary" />
                      <div>
                        <span className="font-semibold">Send Now</span>
                        <p className="text-sm text-muted-foreground">Start immediately</p>
                      </div>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="scheduled" id="scheduled" className="peer sr-only" />
                    <Label
                      htmlFor="scheduled"
                      className={cn(
                        "flex items-center gap-3 rounded-lg border-2 p-4 cursor-pointer transition-all",
                        campaignData.scheduleType === 'scheduled' && "border-primary bg-primary/5"
                      )}
                    >
                      <Clock className="h-6 w-6 text-primary" />
                      <div>
                        <span className="font-semibold">Schedule</span>
                        <p className="text-sm text-muted-foreground">Pick date & time</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>

                {campaignData.scheduleType === 'scheduled' && (
                  <div className="space-y-6 animate-fade-in border rounded-lg p-4 bg-muted/30">
                     <div className="space-y-3">
                        <Label>Campaign Schedule</Label>
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
                             <Label htmlFor="repeat">Repeat Mode</Label>
                          </div>
                        </RadioGroup>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{campaignData.schedulingMode === 'repeat' ? 'Start Date' : 'Date'}</Label>
                          <Input
                            type="date"
                            value={campaignData.scheduledDate}
                            onChange={(e) => setCampaignData({ ...campaignData, scheduledDate: e.target.value })}
                            min={new Date().toISOString().split('T')[0]}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{campaignData.schedulingMode === 'repeat' ? 'Start Time' : 'Time'}</Label>
                          <Input
                            type="time"
                            value={campaignData.scheduledTime}
                            onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
                          />
                        </div>
                     </div>

                     {campaignData.schedulingMode === 'repeat' && (
                       <div className="space-y-4 animate-fade-in">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Frequency</Label>
                              <Select 
                                value={campaignData.frequency} 
                                onValueChange={(v) => setCampaignData({ ...campaignData, frequency: v as any, repeatDays: [] })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="hourly">Hourly</SelectItem>
                                  <SelectItem value="daily">Daily</SelectItem>
                                  <SelectItem value="weekly">Weekly</SelectItem>
                                  <SelectItem value="monthly">Monthly</SelectItem>
                                  <SelectItem value="yearly">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Secondary Option: Hidden for Daily */}
                            {campaignData.frequency !== 'daily' && (
                              <div className="space-y-2">
                                <Label>
                                  {campaignData.frequency === 'hourly' && "Select Interval (Hours)"}
                                  {campaignData.frequency === 'weekly' && "Select Day"}
                                  {campaignData.frequency === 'monthly' && "Select Date"}
                                  {campaignData.frequency === 'yearly' && "Select Month"}
                                </Label>
                                
                                {campaignData.frequency === 'weekly' ? (
                                  <Select
                                    value={campaignData.repeatDays[0] || ''}
                                    onValueChange={(v) => setCampaignData({ ...campaignData, repeatDays: [v] })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select day" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                        <SelectItem key={day} value={day}>{day}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : campaignData.frequency === 'monthly' ? (
                                  <Select
                                    value={campaignData.repeatDays[0] || ''}
                                    onValueChange={(v) => setCampaignData({ ...campaignData, repeatDays: [v] })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select date" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                      {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                        <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : campaignData.frequency === 'yearly' ? (
                                  <Select
                                    value={campaignData.repeatDays[0] || ''}
                                    onValueChange={(v) => setCampaignData({ ...campaignData, repeatDays: [v] })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select month" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                                        <SelectItem key={month} value={month}>{month}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Select
                                    value={campaignData.repeatDays[0] || '1'}
                                    onValueChange={(v) => setCampaignData({ ...campaignData, repeatDays: [v] })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select interval" />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[200px]">
                                      {Array.from({ length: 24 }, (_, i) => i + 1).map(num => (
                                        <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>End Date</Label>
                              <Input
                                type="date"
                                value={campaignData.endDate}
                                onChange={(e) => setCampaignData({ ...campaignData, endDate: e.target.value })}
                                min={campaignData.scheduledDate || new Date().toISOString().split('T')[0]}
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
      </div>

        {/* Test Campaign Dialog */}
         <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Send Test Message</DialogTitle>
                    <DialogDescription>
                        Enter a phone number or email to receive a test message.
                        This will use the currently selected template and variables.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Destination (Phone/Email)</Label>
                        <Input 
                            placeholder={campaignData.channel === 'email' ? 'Enter email...' : 'Enter phone number...'}
                            value={testDestination}
                            onChange={(e) => setTestDestination(e.target.value)}
                        />
                         <p className="text-xs text-muted-foreground">
                            Make sure to include country code for phone numbers (e.g., +91...)
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSendTest} disabled={!testDestination || isSendingTest}>
                        {isSendingTest ? "Sending..." : "Send Test"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      {/* Footer */ }
      <div className="flex-shrink-0 px-6 py-4 border-t bg-background flex items-center justify-between">
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
              {currentStep === 5 && campaignData.scheduleType === 'scheduled' && (!campaignData.scheduledDate || !campaignData.scheduledTime) && "Set schedule time"}
            </p>
          )}
          {currentStep === 5 && (
             <Button 
                variant="outline"
                className="mr-2 border-primary/20 hover:bg-primary/5 text-primary" 
                onClick={() => setIsTestDialogOpen(true)}
             >
                Test Campaign
             </Button>
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
