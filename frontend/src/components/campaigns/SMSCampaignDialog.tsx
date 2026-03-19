import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
    X, Search, Send, Clock,
    MessageSquare, FileText,
    Users, Info, Layout,
    ChevronRight, Check,
    Loader2
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
import { dltTemplateService, type DLTTemplate } from '@/services/dltTemplateService';
import { campaignService } from '@/services/campaignService';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface SMSCampaignDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function SMSCampaignDialog({ open, onOpenChange, onSuccess }: SMSCampaignDialogProps) {
    const { toast } = useToast();

    // Data State
    const [templates, setTemplates] = useState<DLTTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Form State
    const [campaignName, setCampaignName] = useState('');
    const [senderName, setSenderName] = useState('');
    const [dltTemplateId, setDltTemplateId] = useState('');
    const [routingType, setRoutingType] = useState('Domestic');
    const [messageType, setMessageType] = useState('English');
    const [message, setMessage] = useState('');
    const [recipientSource, setRecipientSource] = useState('manual');
    const [manualRecipients, setManualRecipients] = useState('');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [excelColumns, setExcelColumns] = useState<string[]>([]);
    const [shortUrl, setShortUrl] = useState(false);

    const [submitting, setSubmitting] = useState(false);
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
            const data = await dltTemplateService.getTemplates('', 1, 1000);
            setTemplates(data.templates);
            if (data.templates.length > 0 && !senderName) {
                // Optionially set default sender
            }
        } catch (err) {
            console.error('Failed to load DLT templates:', err);
        } finally {
            setLoadingTemplates(false);
        }
    };

    const filteredTemplates = useMemo(() => {
        return templates.filter(t =>
            t.temp_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.temp_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.sender.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [templates, searchQuery]);

    const handleSelectTemplate = (template: DLTTemplate) => {
        setDltTemplateId(template.temp_id);
        setSenderName(template.sender);
        setMessage(template.template_text);
        toast({
            title: 'Template Selected',
            description: `Loaded template: ${template.temp_name || template.temp_id}`,
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
                toast({
                    title: 'File Parsed',
                    description: `Found ${headers.length} columns in ${file.name}`,
                });
            }
        };
        reader.readAsBinaryString(file);
    };

    const getRecipientCount = () => {
        if (recipientSource === 'manual') {
            return manualRecipients.split(/[\n,]+/).filter(r => r.trim()).length;
        }
        return 0; // File upload count would be handled on backend or after parsing
    };

    const getCharCount = () => message.length;
    const getSmsCount = () => {
        const len = message.length;
        if (len === 0) return 0;
        if (messageType === 'English') {
            return len <= 160 ? 1 : Math.ceil(len / 153);
        } else {
            // Unicode
            return len <= 70 ? 1 : Math.ceil(len / 67);
        }
    };

    const handleSubmit = async () => {
        if (!campaignName) {
            toast({ title: 'Validation Error', description: 'Please enter a campaign name', variant: 'destructive' });
            return;
        }
        if (!senderName) {
            toast({ title: 'Validation Error', description: 'Please select a sender name', variant: 'destructive' });
            return;
        }
        if (!message) {
            toast({ title: 'Validation Error', description: 'Please enter a message or select a template', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create campaign record
            const payload = {
                name: campaignName,
                channel: 'sms',
                template_id: dltTemplateId,
                template_body: message,
                template_metadata: { templateId: dltTemplateId, sender: senderName },
                status: 'draft' as const,
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

            // 3. Start campaign (if immediate)
            await campaignService.startCampaign(campaignId);

            toast({
                title: '🚀 Campaign Created',
                description: 'Your SMS campaign has been scheduled for broadcast.',
            });
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            console.error('Campaign creation error:', err);
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to create campaign',
                variant: 'destructive',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[95vw] w-[1200px] h-[90vh] p-0 gap-0 overflow-hidden bg-[#f0f4f8] border-none shadow-2xl">
                {/* Professional Header */}
                <DialogHeader className="sr-only">
                    <DialogTitle>SMS Campaign Creation</DialogTitle>
                    <DialogDescription>Create and configure your bulk SMS campaign with DLT templates.</DialogDescription>
                </DialogHeader>
                <div className="bg-white px-6 py-4 flex items-center justify-between border-b shadow-sm z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <MessageSquare className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold text-gray-800">Campaign: Bulk SMS</DialogTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    Home <ChevronRight className="h-3 w-3" /> Campaign: Bulk SMS
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 shadow-lg shadow-emerald-600/20"
                        >
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Create Broadcast
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
                    {/* Main Form Section (Left + Middle) */}
                    <ScrollArea className="flex-1 bg-transparent p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">

                            {/* Left Column: Config */}
                            <div className="space-y-6">
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <div className="bg-white p-6 space-y-6">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold text-gray-700">Campaign Name</Label>
                                            <Input
                                                placeholder="Enter campaign name..."
                                                value={campaignName}
                                                onChange={(e) => setCampaignName(e.target.value)}
                                                className="border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary h-11"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold text-gray-700">Sender Name</Label>
                                            <Select value={senderName} onValueChange={setSenderName}>
                                                <SelectTrigger className="border-gray-200 h-11">
                                                    <SelectValue placeholder="Select Sender Name" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {Array.from(new Set(templates.map(t => t.sender))).map(sender => (
                                                        <SelectItem key={sender} value={sender}>{sender}</SelectItem>
                                                    ))}
                                                    {templates.length === 0 && (
                                                        <SelectItem disabled value="none">No senders found</SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-4 pt-2">
                                            <Label className="text-sm font-bold text-gray-700">Add Recipient(s)</Label>
                                            <RadioGroup
                                                value={recipientSource}
                                                onValueChange={setRecipientSource}
                                                className="flex flex-col gap-3"
                                            >
                                                <div className="flex items-start space-x-3 p-3 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all">
                                                    <RadioGroupItem value="manual" id="manual" className="mt-1" />
                                                    <div className="flex-1">
                                                        <Label htmlFor="manual" className="font-semibold cursor-pointer">Add Manual Number(s)</Label>
                                                        {recipientSource === 'manual' && (
                                                            <div className="mt-3">
                                                                <Textarea
                                                                    placeholder="Enter MSISDN. kindly use new line as a separation between msisdn"
                                                                    className="min-h-[120px] bg-[#f9fafb] border-gray-200 resize-none text-sm"
                                                                    value={manualRecipients}
                                                                    onChange={(e) => setManualRecipients(e.target.value)}
                                                                />
                                                                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground font-medium">
                                                                    <span className="flex items-center gap-1.5">
                                                                        <Users className="h-3.5 w-3.5" />
                                                                        Recipient(s) count: <span className="text-primary font-bold">{getRecipientCount()}</span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center space-x-3 p-3 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all">
                                                    <RadioGroupItem value="upload" id="upload" />
                                                    <div className="flex-1 flex items-center justify-between">
                                                        <Label htmlFor="upload" className="font-semibold cursor-pointer">Upload File</Label>
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

                                                <div className="flex items-center space-x-3 p-3 rounded-lg border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all opacity-60">
                                                    <RadioGroupItem value="group" id="group" disabled />
                                                    <Label htmlFor="group" className="font-semibold cursor-pointer">From Group</Label>
                                                </div>
                                            </RadioGroup>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            {/* Middle Column: Message details */}
                            <div className="space-y-6">
                                <Card className="border-none shadow-sm overflow-hidden">
                                    <div className="bg-white p-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2 text-primary">
                                                <Label className="text-sm font-bold text-gray-700">DLT template ID</Label>
                                                <Input
                                                    placeholder="Enter dlt template id"
                                                    value={dltTemplateId}
                                                    onChange={(e) => setDltTemplateId(e.target.value)}
                                                    className="border-gray-200 h-11 font-mono text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-bold text-gray-700">Routing Type</Label>
                                                <Select value={routingType} onValueChange={setRoutingType}>
                                                    <SelectTrigger className="border-gray-200 h-11">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Domestic">Domestic</SelectItem>
                                                        <SelectItem value="International">International</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-bold text-gray-700">Message Type</Label>
                                            <Select value={messageType} onValueChange={setMessageType}>
                                                <SelectTrigger className="border-gray-200 h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="English">English</SelectItem>
                                                    <SelectItem value="Unicode">Unicode (Hindi/Local)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2 relative">
                                            <Label className="text-sm font-bold text-gray-700 flex items-center justify-between">
                                                Message
                                                {dltTemplateId && (
                                                    <Badge variant="secondary" className="text-[10px] font-mono px-1.5 h-4">
                                                        DLT: {dltTemplateId}
                                                    </Badge>
                                                )}
                                            </Label>
                                            <Textarea
                                                placeholder="Enter Message ..."
                                                className="min-h-[160px] bg-[#fdfdfd] border-gray-200 resize-none text-[15px] leading-relaxed"
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                            />
                                            <div className="mt-3 flex items-center justify-between text-sm px-1">
                                                <div className="flex gap-4 font-medium text-gray-500">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="h-4 w-4" />
                                                        Message count: <span className="text-primary">{getSmsCount()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <FileText className="h-4 w-4" />
                                                        Chars count: <span className="text-primary">{getCharCount()}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 cursor-pointer group">
                                                    <Checkbox
                                                        id="short-url"
                                                        checked={shortUrl}
                                                        onCheckedChange={(checked) => setShortUrl(checked === true)}
                                                    />
                                                    <Label htmlFor="short-url" className="text-xs font-bold text-gray-600 cursor-pointer group-hover:text-primary transition-colors">
                                                        Short Url
                                                    </Label>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4">
                                            <Button
                                                variant="secondary"
                                                size="lg"
                                                className="w-full bg-[#3ac2ea] hover:bg-[#2eafd4] text-white font-bold h-12 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-blue-400/20"
                                                onClick={() => {
                                                    if (!campaignName || !message || !senderName) {
                                                        toast({ title: 'Preview Unavailable', description: 'Please fill in basic details first.', variant: 'default' });
                                                        return;
                                                    }
                                                    setShowPreview(true);
                                                }}
                                            >
                                                Preview campaign data
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Preview Dialog */}
                    <Dialog open={showPreview} onOpenChange={setShowPreview}>
                        <DialogContent className="max-w-md bg-white rounded-2xl shadow-2xl p-0 overflow-hidden border-none">
                            <DialogHeader className="p-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    <Send className="h-5 w-5" />
                                    Campaign Preview
                                </DialogTitle>
                                <DialogDescription className="text-emerald-50/90 font-medium">
                                    Review your SMS campaign before sending.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="p-6 space-y-6 bg-white">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                        <span className="text-sm font-bold text-gray-500 uppercase tracking-tighter">Campaign Name</span>
                                        <span className="text-sm font-semibold text-gray-800">{campaignName}</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                        <span className="text-sm font-bold text-gray-500 uppercase tracking-tighter">Sender Name</span>
                                        <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 px-3">{senderName}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                        <span className="text-sm font-bold text-gray-500 uppercase tracking-tighter">Recipients</span>
                                        <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                                            <Users className="h-4 w-4 text-emerald-600" />
                                            {getRecipientCount()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                        <span className="text-sm font-bold text-gray-500 uppercase tracking-tighter">SMS Parts</span>
                                        <Badge variant="secondary" className="font-bold">{getSmsCount()}</Badge>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-tighter">Message Body Preview</span>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap italic shadow-inner">
                                        "{message}"
                                    </div>
                                </div>
                            </div>
                            <DialogFooter className="p-4 bg-gray-50 flex items-center gap-3">
                                <Button variant="outline" onClick={() => setShowPreview(false)} className="flex-1 rounded-xl">Edit Details</Button>
                                <Button onClick={() => { setShowPreview(false); handleSubmit(); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold">Confirm & Send</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Right Sidebar: Template Picker */}
                    <div className="w-[380px] bg-white border-l shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] flex flex-col z-20">
                        <div className="p-4 border-b space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Layout className="h-4 w-4 text-primary" />
                                    Select DLT Template
                                </h3>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search Template message."
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
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <span className="text-sm font-medium">Fetching templates...</span>
                                    </div>
                                ) : filteredTemplates.length === 0 ? (
                                    <div className="text-center py-20 px-4">
                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                                            <Info className="h-6 w-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm font-bold text-gray-600">No templates found</p>
                                        <p className="text-xs text-muted-foreground mt-1">Try a different search or add templates in the DLT section.</p>
                                    </div>
                                ) : (
                                    filteredTemplates.map((template) => (
                                        <div
                                            key={template.id}
                                            onClick={() => handleSelectTemplate(template)}
                                            className={cn(
                                                "group relative p-4 rounded-xl border-2 transition-all cursor-pointer",
                                                dltTemplateId === template.temp_id
                                                    ? "border-primary bg-primary/[0.03] shadow-md shadow-primary/5"
                                                    : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                                            )}
                                        >
                                            {dltTemplateId === template.temp_id && (
                                                <div className="absolute -top-2 -right-2 bg-primary text-white p-1 rounded-full shadow-lg">
                                                    <Check className="h-3 w-3" />
                                                </div>
                                            )}

                                            <div className="space-y-2 pr-6">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[13px] font-bold text-gray-800 truncate block">
                                                        {template.temp_name || 'Unnamed Template'}
                                                    </span>
                                                    <Badge variant="outline" className="text-[10px] h-4 font-mono px-1">
                                                        {template.temp_type}
                                                    </Badge>
                                                </div>

                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[11px] font-mono text-primary font-bold">{template.temp_id}</span>
                                                    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{template.sender}</span>
                                                </div>

                                                <div className="pt-2">
                                                    <p className="text-[13px] text-gray-600 line-clamp-3 italic leading-relaxed">
                                                        "{template.template_text}"
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
