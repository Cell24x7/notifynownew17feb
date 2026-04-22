import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';

import {
    X, Search, Send, Clock,
    MessageSquare, FileText,
    Users, Info, Layout,
    ChevronRight, Check,
    Loader2, Smartphone, Paperclip, AlertCircle
} from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog, DialogContent,
    DialogHeader, DialogTitle,
    DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent,
    SelectItem, SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { whatsappService } from '@/services/whatsappService';
import { campaignService } from '@/services/campaignService';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface WhatsAppCampaignDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function WhatsAppCampaignDialog({ open, onOpenChange, onSuccess }: WhatsAppCampaignDialogProps) {
    const { toast } = useToast();

    // Data State
    const [templates, setTemplates] = useState<any[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [campaignName, setCampaignName] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [languageCode, setLanguageCode] = useState('en_US');
    const [recipientSource, setRecipientSource] = useState<'manual' | 'upload'>('manual');
    const [manualRecipients, setManualRecipients] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [excelColumns, setExcelColumns] = useState<string[]>([]);


    const [submitting, setSubmitting] = useState(false);
    const [fieldMapping, setFieldMapping] = useState<Record<string, { type: 'field' | 'custom', value: string }>>({});
    const [isUploadingMedia, setIsUploadingMedia] = useState<Record<string, boolean>>({});
    const [showPreview, setShowPreview] = useState(false);

    // Fetch templates when dialog opens
    useEffect(() => {
        if (open) {
            loadTemplates();
        }
    }, [open]);

    const loadTemplates = async () => {
        setLoadingTemplates(true);
        try {
            const data = await whatsappService.getTemplates();
            setTemplates(data.templates || []);
        } catch (err) {
            console.error('Failed to load WhatsApp templates:', err);
            toast({
                title: 'Error',
                description: 'Failed to fetch WhatsApp templates.',
                variant: 'destructive'
            });
        } finally {
            setLoadingTemplates(false);
        }
    };

    const filteredTemplates = useMemo(() => {
        return templates.filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [templates, searchQuery]);

    const selectedTemplate = useMemo(() => templates.find(t => t.name === templateName), [templates, templateName]);

    const templateVariables = useMemo(() => {
        if (!selectedTemplate) return [];
        const vars: string[] = [];
        
        // 1. Scan Components for {{n}} matches (Body, Header, etc.)
        selectedTemplate.components?.forEach((c: any) => {
            if ((c.type === 'BODY' || c.type === 'HEADER') && c.text) {
                const matches = c.text.match(/{{(\d+)}}/g);
                if (matches) {
                    matches.forEach((m: string) => {
                        const v = m.replace(/[{}]/g, '');
                        if (!vars.includes(v)) vars.push(v);
                    });
                }
            }
        });

        // 2. Special case: Media Headers
        const headerComp = selectedTemplate.components?.find((c: any) => c.type === 'HEADER' || c.type === 'header');
        if (headerComp && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerComp.format?.toUpperCase() || headerComp.type?.toUpperCase())) {
            if (!vars.includes('header_url')) vars.unshift('header_url');
        }

        // 3. Special case: Dynamic URL Buttons
        const buttonComp = selectedTemplate.components?.find((c: any) => c.type === 'BUTTONS');
        if (buttonComp) {
            buttonComp.buttons?.forEach((btn: any, idx: number) => {
                if (btn.type === 'URL' && btn.url?.includes('{{1}}')) {
                    // Meta dynamic URLs usually just use {{1}}
                    const btnVar = `button_${idx + 1}_url`;
                    if (!vars.includes(btnVar)) vars.push(btnVar);
                }
            });
        }

        return vars;
    }, [selectedTemplate]);

    const handleSelectTemplate = (template: any) => {
        setTemplateName(template.name);
        setLanguageCode(template.language || 'en_US');
        // Reset mapping when template changes
        setFieldMapping({});
        toast({
            title: 'Template Selected',
            description: `Loaded WhatsApp template: ${template.name}`,
        });
    };

    const handleFileChange = async (file: File | null) => {
        setUploadedFile(file);
        if (!file) {
            setExcelColumns([]);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target?.result;
            const workbook = XLSX.read(data, { type: 'binary' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            if (json.length > 0) {
                const headers = (json[0] as string[]).map(h => String(h).trim()).filter(Boolean);
                setExcelColumns(headers);
                
                // Smart Auto-Mapping
                const newMapping: any = { ...fieldMapping };
                headers.forEach(h => {
                    const lowHeader = h.toLowerCase();
                    if (lowHeader.includes('name')) newMapping['1'] = { type: 'field', value: h };
                    if (lowHeader.includes('date')) newMapping['2'] = { type: 'field', value: h };
                    if (lowHeader.includes('id') || lowHeader.includes('ticket')) newMapping['3'] = { type: 'field', value: h };
                    if (lowHeader.includes('guest')) newMapping['4'] = { type: 'field', value: h };
                });
                setFieldMapping(newMapping);
                toast({
                    title: 'Excel Columns Parsed',
                    description: `Found ${headers.length} columns. Smart mapping applied.`,
                });
            }
        };
        reader.readAsBinaryString(file);
    };

    const getRecipientCount = () => {
        if (recipientSource === 'manual') {
            return manualRecipients.split(/[\n,]+/).filter(r => r.trim()).length;
        }
        return 0;
    };

    const handleSubmit = async () => {
        if (!campaignName) {
            toast({ title: 'Validation Error', description: 'Please enter a campaign name', variant: 'destructive' });
            return;
        }
        if (!templateName) {
            toast({ title: 'Validation Error', description: 'Please select a WhatsApp template', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create campaign record
            const payload = {
                name: campaignName,
                channel: 'whatsapp',
                template_id: templateName,
                template_name: templateName,
                template_metadata: {
                    components: selectedTemplate.components,
                    language: selectedTemplate.language || languageCode,
                    category: selectedTemplate.category
                },
                template_body: selectedTemplate.components?.find((c: any) => c.type === 'BODY')?.text || '',
                template_type: selectedTemplate.category,
                status: 'draft' as const,
                variable_mapping: fieldMapping
            };

            const createRes = await campaignService.createCampaign(payload);
            const campaignId = createRes.campaignId;

            // 2. Upload recipients
            if (recipientSource === 'manual' && manualRecipients) {
                const phoneNumbers = manualRecipients.split(/[\n,]+/).map(n => n.trim()).filter(Boolean);
                const csvContent = "phone\n" + phoneNumbers.join("\n");
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const file = new File([blob], "manual_recipients.csv", { type: "text/csv" });
                await campaignService.uploadContacts(campaignId, file);
            } else if (recipientSource === 'upload' && uploadedFile) {
                await campaignService.uploadContacts(campaignId, uploadedFile);
            }

            // 3. Start campaign
            await campaignService.startCampaign(campaignId);

            toast({
                title: '🚀 WhatsApp Campaign Created',
                description: 'Your WhatsApp broadcast has been queued.',
            });
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('WhatsApp campaign creation error:', err);
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to create WhatsApp campaign',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 gap-0 overflow-hidden bg-[#f0f4f8] border-none shadow-2xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>WhatsApp Campaign Creation</DialogTitle>
                    <DialogDescription>Configure and send WhatsApp template messages.</DialogDescription>
                </DialogHeader>

                <div className="bg-white px-6 py-4 flex items-center justify-between border-b shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Smartphone className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-gray-800">Campaign: WhatsApp Broadcast</DialogTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    Home <ChevronRight className="h-3 w-3" /> Campaign: WhatsApp
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 shadow-lg shadow-green-600/20"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Start Broadcast
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="border-gray-300 hover:bg-gray-100"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>

                <div className="flex h-full overflow-hidden">
                    {/* Main Form Section */}
                    <ScrollArea className="flex-1 bg-transparent p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">

                            {/* Left Column: Basic Config */}
                            <div className="space-y-6">
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <div className="bg-white p-6 space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold text-gray-700">Campaign Name</Label>
                                            <Input
                                                placeholder="e.g. Festival Season Offer"
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                className="border-gray-200 h-11"
                                            />
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <Label className="text-sm font-bold text-gray-700">Recipients</Label>
                                            <RadioGroup
                                                value={recipientSource}
                                                onValueChange={(v: any) => setRecipientSource(v)}
                                                className="flex flex-col gap-3"
                                            >
                                                <div className="flex items-start space-x-3 p-3 rounded-lg border border-transparent hover:border-green-600/20 hover:bg-green-50 transition-all">
                                                    <RadioGroupItem value="manual" id="wa-manual" className="mt-1" />
                                                    <div className="flex-1">
                                                        <Label htmlFor="wa-manual" className="font-semibold cursor-pointer">Manual Numbers</Label>
                                                        {recipientSource === 'manual' && (
                                                            <div className="mt-3">
                                                                <Textarea
                                                                    placeholder="+919892891772, +918779721034"
                                                                    className="min-h-[120px] bg-[#f9fafb] border-gray-200 resize-none text-sm"
                                                                    value={manualRecipients}
                                                                    onChange={(e) => setManualRecipients(e.target.value)}
                                                                />
                                                                <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                                                                    <Info className="h-3 w-3" />
                                                                    Include country code. Total: {getRecipientCount()}
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-3 p-3 rounded-lg border border-transparent hover:border-green-600/20 hover:bg-green-50 transition-all">
                                                    <RadioGroupItem value="upload" id="wa-upload" />
                                                    <div className="flex-1 flex items-center justify-between">
                                                        <Label htmlFor="wa-upload" className="font-semibold cursor-pointer">Upload CSV/Excel</Label>
                                                        {recipientSource === 'upload' && (
                                                            <Input
                                                                type="file"
                                                                className="max-w-[200px] h-8 text-xs cursor-pointer"
                                                                accept=".csv,.xlsx,.xls"
                                                                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                                                            />
                                                        )}
                                                    </div>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    </div>
                                </Card>

                                {/* Variable Mapping Section */}
                                {templateVariables.length > 0 && (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex items-center justify-between px-1">
                                            <Label className="text-sm font-bold text-gray-700">Variable Mapping</Label>
                                            <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">{templateVariables.length} Required</Badge>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {templateVariables.map((variable) => (
                                                <Card key={variable} className="border-none shadow-sm overflow-hidden group">
                                                    <div className="p-4 bg-white flex flex-col gap-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-bold">
                                                                    {variable === 'header_url' ? 'H' : variable}
                                                                </div>
                                                                <span className="text-xs font-semibold text-gray-600">
                                                                    {variable === 'header_url' ? 'Header Media (Image/Video)' : `Variable {{${variable}}}`}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 flex gap-2">
                                                                <Select 
                                                                    value={fieldMapping[variable]?.type || 'custom'} 
                                                                    onValueChange={(v) => setFieldMapping(prev => ({ 
                                                                        ...prev, 
                                                                        [variable]: { type: v as any, value: prev[variable]?.value || '' } 
                                                                    }))}
                                                                >
                                                                    <SelectTrigger className="w-28 h-10 border-gray-200">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="custom">Custom</SelectItem>
                                                                        <SelectItem value="field" disabled={excelColumns.length === 0}>Column</SelectItem>
                                                                    </SelectContent>
                                                                </Select>

                                                                {fieldMapping[variable]?.type === 'field' ? (
                                                                    <Select 
                                                                        value={fieldMapping[variable]?.value || ''} 
                                                                        onValueChange={(v) => setFieldMapping(prev => ({ 
                                                                            ...prev, 
                                                                            [variable]: { type: 'field', value: v } 
                                                                        }))}
                                                                    >
                                                                        <SelectTrigger className="flex-1 h-10 border-green-600/20 bg-green-50/30">
                                                                            <SelectValue placeholder="Pick Column..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {excelColumns.map(col => (
                                                                                <SelectItem key={col} value={col}>{col}</SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                ) : (
                                                                    <Input
                                                                        placeholder={variable === 'header_url' ? "Enter URL or Upload..." : `Value for {{${variable}}}...`}
                                                                        className="h-10 border-gray-200 focus:border-green-600/30 flex-1"
                                                                        value={fieldMapping[variable]?.value || ''}
                                                                        onChange={(e) => setFieldMapping(prev => ({
                                                                            ...prev,
                                                                            [variable]: { type: 'custom', value: e.target.value }
                                                                        }))}
                                                                    />
                                                                )}
                                                            </div>
                                                            {variable === 'header_url' && (
                                                                <div className="relative">
                                                                    <input
                                                                        type="file"
                                                                        id={`wa-media-upload-${variable}`}
                                                                        className="hidden"
                                                                        accept="image/*,video/*,application/pdf"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (!file) return;
                                                                            setIsUploadingMedia(prev => ({ ...prev, [variable]: true }));
                                                                            try {
                                                                                const uploadRes = await whatsappService.uploadHeaderHandle(file);
                                                                                const link = uploadRes.url; // Use local link for campaign
                                                                                setFieldMapping(prev => ({
                                                                                    ...prev,
                                                                                    [variable]: { type: 'custom', value: link }
                                                                                }));
                                                                                toast({ title: 'Media Uploaded', description: 'Header media uploaded successfully.' });
                                                                            } catch (err: any) {
                                                                                toast({ 
                                                                                    title: 'Upload Failed', 
                                                                                    description: err.message || 'Failed to upload media',
                                                                                    variant: 'destructive' 
                                                                                });
                                                                            } finally {
                                                                                setIsUploadingMedia(prev => ({ ...prev, [variable]: false }));
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        className="h-10 w-10 p-0 border-gray-200 hover:bg-green-50 hover:text-green-600"
                                                                        disabled={isUploadingMedia[variable]}
                                                                        onClick={() => document.getElementById(`wa-media-upload-${variable}`)?.click()}
                                                                    >
                                                                        {isUploadingMedia[variable] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Middle Column: Template Details */}
                            <div className="space-y-6">
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <div className="bg-white p-6 space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold text-gray-700">Selected Template</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    readOnly
                                                    value={templateName || 'No template selected'}
                                                    className="border-gray-200 h-11 bg-gray-50 bg-opacity-50"
                                                />
                                                <Badge variant="secondary" className="h-8">{languageCode}</Badge>
                                            </div>
                                        </div>

                                        {selectedTemplate && (
                                            <div className="space-y-4 pt-2">
                                                <Label className="text-sm font-bold text-gray-700">Preview Content</Label>
                                                <div className="p-4 bg-green-50/50 rounded-xl border border-green-100 relative">
                                                    <div className="absolute top-0 right-0 p-2 opacity-10">
                                                        <Smartphone className="h-20 w-20" />
                                                    </div>
                                                    {selectedTemplate.components.map((c: any, i: number) => (
                                                        <div key={i} className="mb-2">
                                                            {c.type === 'HEADER' && c.format === 'TEXT' && (
                                                                <p className="font-bold text-gray-900 border-b pb-1 mb-2">{c.text}</p>
                                                            )}
                                                            {c.type === 'BODY' && (
                                                                <p className="text-sm text-gray-800 leading-relaxed">{c.text}</p>
                                                            )}
                                                            {c.type === 'FOOTER' && (
                                                                <p className="text-xs text-gray-500 mt-2">{c.text}</p>
                                                            )}
                                                            {c.type === 'BUTTONS' && (
                                                                <div className="mt-3 flex flex-wrap gap-2">
                                                                    {c.buttons.map((b: any, bi: number) => (
                                                                        <Badge key={bi} variant="outline" className="bg-white py-1">
                                                                            {b.text}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center mt-2 font-bold">WhatsApp Business API Preview</p>
                                            </div>
                                        )}

                                        {!selectedTemplate && (
                                            <div className="p-10 border-2 border-dashed rounded-xl text-center space-y-2">
                                                <Layout className="h-10 w-10 mx-auto text-gray-300" />
                                                <p className="text-sm font-medium text-gray-500">Pick a template from the right sidebar to see preview</p>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Right Sidebar: WhatsApp Template Picker */}
                    <div className="w-[380px] bg-white border-l shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] flex flex-col z-20">
                        <div className="p-4 border-b space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Smartphone className="h-4 w-4 text-green-600" />
                                    WhatsApp Templates
                                </h3>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search by name or category..."
                                    className="pl-9 h-10 border-gray-200 bg-gray-50 focus:bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <ScrollArea className="flex-1 p-4 bg-gray-50/50">
                            <div className="space-y-4">
                                {loadingTemplates ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                                        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                                        <span className="text-sm font-medium">Fetching Meta templates...</span>
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="text-center py-20 px-4">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                            <Info className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-600">No templates found</p>
                                        <p className="text-xs text-muted-foreground mt-1">Check your WhatsApp Manager in Meta Business Suite.</p>
                                    </div>
                                ) : (
                                    filteredTemplates.map((template) => (
                                        <div
                                            key={template.id || template.name}
                                            onClick={() => handleSelectTemplate(template)}
                                            className={cn(
                                                "group relative p-4 rounded-xl border-2 transition-all cursor-pointer",
                                                templateName === template.name
                                                    ? "border-green-600 bg-green-50 shadow-md shadow-green-600/5"
                                                    : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                                            )}
                                        >
                                            {templateName === template.name && (
                                                <div className="absolute -top-2 -right-2 bg-green-600 text-white p-1 rounded-full shadow-lg">
                                                    <Check className="h-3 w-3" />
                                                </div>
                                            )}

                                            <div className="space-y-2 pr-6">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[13px] font-bold text-gray-800 truncate block">
                                                        {template.name}
                                                    </span>
                                                    <Badge variant={(template.status === 'APPROVED' ? 'default' : 'secondary') as any} className="text-[9px] h-4 px-1">
                                                        {template.status}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] text-green-600 border-green-200">
                                                        {template.category}
                                                    </Badge>
                                                    <span className="text-[10px] text-gray-400 font-medium tracking-widest">{template.language}</span>
                                                </div>
                                                <div className="pt-2">
                                                    <p className="text-[12px] text-gray-600 line-clamp-2 italic leading-tight">
                                                        {template.components?.find((c: any) => c.type === 'BODY')?.text}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
