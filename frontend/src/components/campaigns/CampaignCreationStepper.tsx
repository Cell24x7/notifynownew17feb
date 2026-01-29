import { useState, useMemo } from 'react';
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
import { cn } from '@/lib/utils';
import { type Channel, type MessageTemplate, audienceSegments, mockContacts } from '@/lib/mockData';
import { format } from 'date-fns';

interface CampaignCreationStepperProps {
  templates: MessageTemplate[];
  onComplete: (campaignData: CampaignData) => void;
  onCancel: () => void;
}

export interface CampaignData {
  name: string;
  channel: Channel;
  templateId: string;
  contactSource: 'existing' | 'upload';
  selectedContacts: string[];
  uploadedFile: File | null;
  fieldMapping: Record<string, { type: 'field' | 'custom'; value: string }>;
  scheduleType: 'now' | 'scheduled';
  scheduledDate: string;
  scheduledTime: string;
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
  { value: 'instagram', label: 'Instagram', icon: '📸', costPerMessage: 0.20 },
  { value: 'facebook', label: 'Facebook', icon: '👥', costPerMessage: 0.20 },
  { value: 'email', label: 'Email', icon: '📧', costPerMessage: 0.05 },
  { value: 'voicebot', label: 'Voice Bot', icon: '🎙️', costPerMessage: 0.50 },
];

// Mock CSV columns that would be detected from uploaded file
const mockCsvColumns = ['Name', 'Phone', 'Email', 'City', 'Order ID', 'Amount'];

export default function CampaignCreationStepper({ templates, onComplete, onCancel }: CampaignCreationStepperProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    channel: 'whatsapp',
    templateId: '',
    contactSource: 'existing',
    selectedContacts: [],
    uploadedFile: null,
    fieldMapping: {},
    scheduleType: 'now',
    scheduledDate: '',
    scheduledTime: '',
    estimatedCost: 0,
    audienceCount: 0,
  });

  const [selectedAudienceId, setSelectedAudienceId] = useState('');
  const [csvPreview, setCsvPreview] = useState<string[][]>([]);
  const [detectedColumns, setDetectedColumns] = useState<string[]>(mockCsvColumns);
  
  // Contact table filters
  const [contactSearch, setContactSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);

  const selectedTemplate = templates.find(t => t.id === campaignData.templateId);
  const templateVariables = selectedTemplate?.variables || [];
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
      setCampaignData({ ...campaignData, uploadedFile: file });
      // Simulate CSV parsing - in real app, parse the file
      setCsvPreview([
        ['John Doe', '+1234567890', 'john@email.com', 'New York', 'ORD001', '299'],
        ['Jane Smith', '+0987654321', 'jane@email.com', 'Los Angeles', 'ORD002', '450'],
        ['Bob Wilson', '+1122334455', 'bob@email.com', 'Chicago', 'ORD003', '199'],
      ]);
      setCampaignData(prev => ({ ...prev, audienceCount: 150 })); // Mock count
    }
  };

  const handleAudienceSelect = (audienceId: string) => {
    setSelectedAudienceId(audienceId);
    const audience = audienceSegments.find(a => a.id === audienceId);
    if (audience) {
      setCampaignData(prev => ({ 
        ...prev, 
        audienceCount: audience.count,
        selectedContacts: [audienceId]
      }));
    }
  };

  // Filtered contacts based on search and filters
  const filteredContacts = useMemo(() => {
    return mockContacts.filter(contact => {
      // Search filter
      const searchMatch = contactSearch === '' || 
        contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
        contact.phone.includes(contactSearch) ||
        contact.email.toLowerCase().includes(contactSearch.toLowerCase());
      
      // Segment filter
      const segmentMatch = segmentFilter === 'all' || contact.segment === segmentFilter;
      
      // Date filter
      let dateMatch = true;
      if (dateFilter !== 'all' && contact.createdAt) {
        const now = new Date();
        const contactDate = new Date(contact.createdAt);
        const daysDiff = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (dateFilter === 'last7') dateMatch = daysDiff <= 7;
        else if (dateFilter === 'last30') dateMatch = daysDiff <= 30;
        else if (dateFilter === 'last90') dateMatch = daysDiff <= 90;
      }
      
      return searchMatch && segmentMatch && dateMatch;
    });
  }, [contactSearch, segmentFilter, dateFilter]);

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
    const sampleData = 'Name,Phone,Email,City,Order ID,Amount\nJohn Doe,+1234567890,john@email.com,New York,ORD001,299\nJane Smith,+0987654321,jane@email.com,Los Angeles,ORD002,450';
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_contacts.csv';
    a.click();
    URL.revokeObjectURL(url);
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
        // Check if all template variables are mapped with values
        return templateVariables.every(v => {
          const mapping = campaignData.fieldMapping[v];
          return mapping && mapping.value && mapping.value.trim() !== '';
        });
      case 5:
        if (campaignData.scheduleType === 'scheduled') {
          return campaignData.scheduledDate && campaignData.scheduledTime;
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
                    {channelOptions.map((channel) => (
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
                        {selectedTemplate.variables.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            <span className="text-xs text-muted-foreground">Variables:</span>
                            {selectedTemplate.variables.map(v => (
                              <Badge key={v} variant="secondary" className="text-xs">{`{{${v}}}`}</Badge>
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
                <p className="text-muted-foreground">Choose existing contacts or upload a file</p>
              </div>

              <RadioGroup
                value={campaignData.contactSource}
                onValueChange={(value) => {
                  setCampaignData({ 
                    ...campaignData, 
                    contactSource: value as 'existing' | 'upload',
                    audienceCount: 0,
                    uploadedFile: null,
                    selectedContacts: []
                  });
                  setSelectedContactIds([]);
                }}
                className="grid grid-cols-2 gap-4 max-w-2xl"
              >
                <div>
                  <RadioGroupItem value="existing" id="existing" className="peer sr-only" />
                  <Label
                    htmlFor="existing"
                    className={cn(
                      "flex flex-col items-center justify-between rounded-lg border-2 p-6 cursor-pointer transition-all",
                      "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                      campaignData.contactSource === 'existing' && "border-primary bg-primary/5"
                    )}
                  >
                    <Users className="h-10 w-10 mb-3 text-primary" />
                    <span className="font-semibold">Choose from Contacts</span>
                    <span className="text-sm text-muted-foreground text-center mt-1">Select from your contact database</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="upload" id="upload" className="peer sr-only" />
                  <Label
                    htmlFor="upload"
                    className={cn(
                      "flex flex-col items-center justify-between rounded-lg border-2 p-6 cursor-pointer transition-all",
                      "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                      campaignData.contactSource === 'upload' && "border-primary bg-primary/5"
                    )}
                  >
                    <Upload className="h-10 w-10 mb-3 text-primary" />
                    <span className="font-semibold">Upload File</span>
                    <span className="text-sm text-muted-foreground text-center mt-1">Upload CSV or Excel file</span>
                  </Label>
                </div>
              </RadioGroup>

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
                        {audienceSegments.map(seg => (
                          <SelectItem key={seg.id} value={seg.name}>{seg.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={dateFilter} onValueChange={setDateFilter}>
                      <SelectTrigger className="w-[180px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Created Date" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="last7">Last 7 days</SelectItem>
                        <SelectItem value="last30">Last 30 days</SelectItem>
                        <SelectItem value="last90">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contacts Table */}
                  <div className="border rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12">
                            <Checkbox 
                              checked={selectedContactIds.length === filteredContacts.length && filteredContacts.length > 0}
                              onCheckedChange={toggleAllContacts}
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Segment</TableHead>
                          <TableHead>City</TableHead>
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
                              <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">{contact.segment || 'N/A'}</Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground">{contact.city || 'N/A'}</TableCell>
                              <TableCell className="text-muted-foreground">
                                {contact.createdAt ? format(contact.createdAt, 'dd MMM yyyy') : 'N/A'}
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No contacts found matching your filters
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

              {campaignData.contactSource === 'upload' && (
                <div className="space-y-4 max-w-2xl">
                  <div className="flex items-center justify-between">
                    <Label>Upload Contact File</Label>
                    <Button variant="outline" size="sm" onClick={downloadSampleFile}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Sample CSV
                    </Button>
                  </div>
                  
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      {campaignData.uploadedFile ? (
                        <div>
                          <p className="font-medium text-primary">{campaignData.uploadedFile.name}</p>
                          <p className="text-sm text-muted-foreground">{campaignData.audienceCount} contacts detected</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">Drop your file here or click to browse</p>
                          <p className="text-sm text-muted-foreground">Supports CSV, XLSX, XLS</p>
                        </div>
                      )}
                    </label>
                  </div>

                  {csvPreview.length > 0 && (
                    <div className="space-y-2">
                      <Label>Preview (first 3 rows)</Label>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              {detectedColumns.map((col, i) => (
                                <th key={i} className="px-3 py-2 text-left font-medium">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {csvPreview.map((row, i) => (
                              <tr key={i} className="border-t">
                                {row.map((cell, j) => (
                                  <td key={j} className="px-3 py-2 text-muted-foreground">{cell}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

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
                              <Badge variant="secondary" className="mb-1">{`{{${variable}}}`}</Badge>
                              <p className="text-sm text-muted-foreground">Template variable</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={mapping.type === 'field' ? 'default' : 'outline'}
                                  size="sm"
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
                                  variant={mapping.type === 'custom' ? 'default' : 'outline'}
                                  size="sm"
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={campaignData.scheduledDate}
                        onChange={(e) => setCampaignData({ ...campaignData, scheduledDate: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input
                        type="time"
                        value={campaignData.scheduledTime}
                        onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
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
  );
}
