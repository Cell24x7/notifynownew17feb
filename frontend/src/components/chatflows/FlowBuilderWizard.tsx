import { useState, useEffect, useRef } from 'react';
import {
    X, Check, ChevronRight, ChevronLeft, Plus, Trash2,
    Settings, Bot, MessageSquare, Link, Calendar,
    Save, Play, User, Phone, Zap, FileText,
    Image as ImageIcon, Video, File as FileIcon,
    ExternalLink, Database, Bell, Info, Bold, Type,
    Smartphone, MousePointer2, List as ListIcon,
    CircleArrowRight, RefreshCw, Eye, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { templateService, type MessageTemplate } from '@/services/templateService';
import { whatsappService } from '@/services/whatsappService';
import { useAuth } from '@/contexts/AuthContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface FlowBuilderWizardProps {
    initialData?: any;
    onSave: (data: any) => void;
    onCancel: () => void;
}

const steps = [
    { id: 1, title: 'Message Header', icon: Type },
    { id: 2, title: 'Body Content', icon: MessageSquare },
    { id: 3, title: 'Footer & Buttons', icon: MousePointer2 },
    { id: 4, title: 'Logic & Actions', icon: Settings },
];

const categories = ['Formal Message', 'Template Message', 'Catalog Message'];
const headerTypes = ['None', 'Text', 'Image', 'Video', 'Document'];

export default function FlowBuilderWizard({ onSave, onCancel, initialData }: FlowBuilderWizardProps) {
    const { toast } = useToast();
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        step1: {
            name: initialData?.name || '',
            category: initialData?.category || 'Formal Message',
            template: '',
            keywords: initialData?.keywords || [],
            headerType: initialData?.header_type || 'None',
            headerValue: initialData?.header_value || '',
            headerFile: null as File | null,
        },
        step2: {
            body: initialData?.body || '',
            trackUrl: !!initialData?.track_url,
            variables: [],
            apiIntegration: initialData?.api_config || {
                enabled: false,
                type: 'rest',
                method: 'GET',
                url: '',
                timeout: 10,
                params: [],
                mappings: []
            }
        },
        step3: initialData?.footer_config || {
            footerType: 'existing_topic',
            interactiveType: 'Button',
            selectedTopics: [],
            customButtons: [],
            customList: {
                title: '',
                sections: []
            },
            appointment: {
                startDate: '',
                endDate: '',
                occurrence: 1,
                period: 'Day',
                days: [],
                startTime: '',
                endTime: '',
                limit: 0
            }
        },
        step4: initialData?.logic_config || {
            connectToTopic: '',
            resetFlowKeyword: '',
            getUserInput: false,
            saveConversation: false,
            conversationField: '',
            notifyCustomer: false,
            notifyEmail: false,
            notifyWhatsApp: false,
        }
    });

    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [fetchingTemplates, setFetchingTemplates] = useState(false);


    const [keywordInput, setKeywordInput] = useState('');
    const [previewActive, setPreviewActive] = useState(true);

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                setFetchingTemplates(true);
                // 1. Fetch local templates
                let allTemplates: MessageTemplate[] = [];
                try {
                    const localData = await templateService.getTemplates();
                    allTemplates = localData;
                } catch (err) {
                    console.error('Error loading local templates:', err);
                }

                // 2. Fetch external WhatsApp templates if config exists
                const waConfigId = (user as any)?.whatsapp_config_id;
                if (waConfigId) {
                    try {
                        const externalWaData = await whatsappService.getTemplates();
                        if (externalWaData && externalWaData.success && Array.isArray(externalWaData.templates)) {
                            const externalWaTemplates = externalWaData.templates.map((t: any) => {
                                const bodyComponent = t.components?.find((c: any) => c.type === 'BODY');
                                const headerComponent = t.components?.find((c: any) => c.type === 'HEADER');
                                const footerComponent = t.components?.find((c: any) => c.type === 'FOOTER');
                                const buttonComponent = t.components?.find((c: any) => c.type === 'BUTTONS');

                                return {
                                    id: t.name || t.id,
                                    name: t.name,
                                    channel: 'whatsapp',
                                    status: t.status?.toLowerCase() || 'approved',
                                    language: t.language || 'en_US',
                                    category: t.category || 'MARKETING',
                                    body: bodyComponent?.text || '',
                                    header_type: (headerComponent?.format?.toLowerCase() || 'none') as any,
                                    header_content: headerComponent?.text || null,
                                    footer: footerComponent?.text || null,
                                    buttons: buttonComponent?.buttons?.map((b: any, i: number) => ({
                                        label: b.text || b.label,
                                        type: b.type?.toLowerCase() || 'quick_reply',
                                        position: i
                                    })) || []
                                } as MessageTemplate;
                            });

                            // Reconcile: merge external into local, avoiding duplicates by name
                            const localWaNames = new Set(allTemplates.filter(t => t.channel === 'whatsapp').map(t => t.name));
                            externalWaTemplates.forEach(ext => {
                                if (!localWaNames.has(ext.name)) {
                                    allTemplates.push(ext);
                                }
                            });
                        }
                    } catch (waErr) {
                        console.warn('External WhatsApp templates fetch skipped:', waErr);
                    }
                }

                // 3. Final filter for WhatsApp only as requested for Chatflows
                const whatsappTemplates = allTemplates.filter(t => t.channel.toLowerCase() === 'whatsapp');
                setTemplates(whatsappTemplates);
            } catch (error) {
                console.error('Error loading templates:', error);
            } finally {
                setFetchingTemplates(false);
            }
        };
        loadTemplates();
    }, [user?.whatsapp_config_id]);

    const handleTemplateSelect = (templateId: string) => {
        const template = templates.find(t => t.id === templateId || t.name === templateId);
        if (!template) return;

        // Auto-fill body, buttons, etc.
        setFormData(prev => ({
            ...prev,
            step1: {
                ...prev.step1,
                template: template.name,
                category: 'Template Message',
                headerType: (template.header_type || 'None') as any,
                headerValue: template.header_content || prev.step1.headerValue
            },
            step2: {
                ...prev.step2,
                body: template.body
            },
            step3: {
                ...prev.step3,
                interactiveType: template.buttons && template.buttons.length > 0 ? 'Button' : prev.step3.interactiveType,
                selectedTopics: template.buttons ? template.buttons.map(b => b.label) : []
            }
        }));

        toast({
            title: "Template applied",
            description: `Loaded content from template "${template.name}"`,
        });
    };

    const handleNext = () => {
        if (currentStep < 4) setCurrentStep(prev => prev + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(prev => prev - 1);
    };

    const addKeyword = () => {
        if (!keywordInput.trim()) return;
        if (!formData.step1.keywords.includes(keywordInput.trim())) {
            setFormData({
                ...formData,
                step1: {
                    ...formData.step1,
                    keywords: [...formData.step1.keywords, keywordInput.trim()]
                }
            });
        }
        setKeywordInput('');
    };

    const removeKeyword = (kw: string) => {
        setFormData({
            ...formData,
            step1: {
                ...formData.step1,
                keywords: formData.step1.keywords.filter(k => k !== kw)
            }
        });
    };

    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('message-body') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.step2.body;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        setFormData({
            ...formData,
            step2: {
                ...formData.step2,
                body: before + `{{${variable}}}` + after
            }
        });

        // Reset focus
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
        }, 0);
    };

    return (
        <div className="flex flex-col md:flex-row h-full overflow-hidden bg-background">
            {/* Wizard Content */}
            <div className="flex-1 flex flex-col min-w-0 border-r overflow-hidden">
                {/* Wizard Header */}
                <div className="p-4 md:p-6 border-b flex items-center justify-between bg-card/50">
                    <div className="flex flex-col gap-1">
                        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                            {initialData ? 'Edit Flow' : 'Create New Flow'}
                            <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5">Advanced Wizard</Badge>
                        </h2>
                        <div className="flex items-center gap-2">
                            {steps.map((step, i) => (
                                <div key={step.id} className="flex items-center">
                                    <div className={cn(
                                        "flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold transition-all border-2",
                                        currentStep >= step.id ? "bg-primary border-primary text-white" : "border-muted text-muted-foreground"
                                    )}>
                                        {currentStep > step.id ? <Check className="h-3 w-3" /> : step.id}
                                    </div>
                                    <span className={cn(
                                        "ml-2 text-xs font-semibold hidden lg:block",
                                        currentStep === step.id ? "text-primary" : "text-muted-foreground"
                                    )}>
                                        {step.title}
                                    </span>
                                    {i < steps.length - 1 && (
                                        <div className={cn(
                                            "w-4 h-[2px] mx-2 hidden lg:block",
                                            currentStep > step.id ? "bg-primary" : "bg-muted"
                                        )} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Wizard Steps */}
                <ScrollArea className="flex-1 p-4 md:p-8">
                    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

                        {/* Step 1: Message Header */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-3xl border bg-card/50 shadow-sm backdrop-blur-sm">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-primary/70">Flow Identity Name</Label>
                                        <Input
                                            placeholder="e.g. Booking Confirmation"
                                            className="h-11 rounded-xl border-primary/10 bg-background"
                                            value={formData.step1.name}
                                            onChange={(e) => setFormData({ ...formData, step1: { ...formData.step1, name: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase tracking-widest text-primary/70">Flow Category</Label>
                                        <Select
                                            value={formData.step1.category}
                                            onValueChange={(val) => setFormData({ ...formData, step1: { ...formData.step1, category: val } })}
                                        >
                                            <SelectTrigger className="h-11 rounded-xl border-primary/10 bg-background">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                {categories.map(c => <SelectItem key={c} value={c} className="rounded-lg m-1">{c}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-4 p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                                                <Sparkles className="h-4 w-4" />
                                                Use Message Template
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground font-medium">Select a pre-approved WhatsApp or RCS template to load content</p>
                                        </div>
                                        {fetchingTemplates && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
                                    </div>
                                    <Select
                                        value={formData.step1.template}
                                        onValueChange={handleTemplateSelect}
                                    >
                                        <SelectTrigger className="bg-background">
                                            <SelectValue placeholder="-- Select a Template --" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <ScrollArea className="h-60">
                                                {templates.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-[8px] h-4 px-1">{t.channel.toUpperCase()}</Badge>
                                                            <span>{t.name}</span>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </ScrollArea>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <Label className="flex items-center gap-2">
                                        Keywords
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                                                <TooltipContent>Messages starting with these words will trigger this flow</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Type keyword and press Enter"
                                            value={keywordInput}
                                            onChange={(e) => setKeywordInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                            className="bg-muted/50"
                                        />
                                        <Button onClick={addKeyword}><Plus className="h-4 w-4" /></Button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.step1.keywords.map(kw => (
                                            <Badge key={kw} variant="secondary" className="pl-3 pr-1 py-1 flex items-center gap-2 group border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
                                                {kw}
                                                <button onClick={() => removeKeyword(kw)} className="p-0.5 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive group-hover:scale-110 transition-transform">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-4 p-6 rounded-2xl border bg-card shadow-sm">
                                    <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                                        <Smartphone className="h-4 w-4" />
                                        Header Settings
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Header Type</Label>
                                            <div className="flex flex-wrap gap-2">
                                                {headerTypes.map(t => (
                                                    <Button
                                                        key={t}
                                                        type="button"
                                                        variant={formData.step1.headerType === t ? 'default' : 'outline'}
                                                        size="sm"
                                                        className="h-8 text-[11px] font-bold uppercase tracking-wider"
                                                        onClick={() => setFormData({ ...formData, step1: { ...formData.step1, headerType: t } })}
                                                    >
                                                        {t === 'None' && <X className="h-3 w-3 mr-1" />}
                                                        {t === 'Text' && <Type className="h-3 w-3 mr-1" />}
                                                        {t === 'Image' && <ImageIcon className="h-3 w-3 mr-1" />}
                                                        {t === 'Video' && <Video className="h-3 w-3 mr-1" />}
                                                        {t === 'Document' && <FileIcon className="h-3 w-3 mr-1" />}
                                                        {t}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>

                                        {formData.step1.headerType !== 'None' && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                                                <Label>{formData.step1.headerType === 'Text' ? 'Header Text' : 'Media URL'}</Label>
                                                <Input
                                                    placeholder={formData.step1.headerType === 'Text' ? 'Enter header text...' : 'https://...'}
                                                    value={formData.step1.headerValue}
                                                    onChange={(e) => setFormData({ ...formData, step1: { ...formData.step1, headerValue: e.target.value } })}
                                                />
                                                {formData.step1.headerType !== 'Text' && (
                                                    <p className="text-[10px] text-muted-foreground font-medium italic">Max size: 5MB. Formats: JPG, PNG, MP4, PDF</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Body Content & API */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Message Body</Label>
                                        <div className="flex gap-1">
                                            {['NAME', 'PHONE', 'EMAIL', 'MESSAGE'].map(v => (
                                                <Button
                                                    key={v}
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-7 text-[10px] font-black border-dashed px-2"
                                                    onClick={() => insertVariable(v)}
                                                >
                                                    <span className="text-primary mr-1">+</span>{v}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <Textarea
                                            id="message-body"
                                            placeholder="Type your automated response message here..."
                                            rows={8}
                                            value={formData.step2.body}
                                            onChange={(e) => setFormData({ ...formData, step2: { ...formData.step2, body: e.target.value } })}
                                            className="text-base leading-relaxed p-4 group-hover:border-primary/50 transition-colors"
                                        />
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => insertVariable('USER_MESSAGE')} className="h-8 w-8 text-primary">
                                                <Bold className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id="track-url"
                                                checked={formData.step2.trackUrl}
                                                onCheckedChange={(val) => setFormData({ ...formData, step2: { ...formData.step2, trackUrl: val } })}
                                            />
                                            <Label htmlFor="track-url" className="text-xs font-semibold">Track Link Clicks</Label>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-bold">{formData.step2.body.length} / 4096 characters</span>
                                    </div>
                                </div>

                                <div className="space-y-4 p-6 rounded-2xl border-2 border-primary/10 bg-primary/5">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-1">
                                            <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                                                <Zap className="h-4 w-4" />
                                                API & Data Integration
                                            </h3>
                                            <p className="text-[11px] text-muted-foreground font-medium">Fetch dynamic data to use in your message body</p>
                                        </div>
                                        <Switch
                                            checked={formData.step2.apiIntegration.enabled}
                                            onCheckedChange={(val) => setFormData({
                                                ...formData,
                                                step2: {
                                                    ...formData.step2,
                                                    apiIntegration: { ...formData.step2.apiIntegration, enabled: val }
                                                }
                                            })}
                                        />
                                    </div>

                                    {formData.step2.apiIntegration.enabled && (
                                        <Tabs defaultValue="rest" className="animate-in fade-in slide-in-from-top-2 border rounded-xl overflow-hidden bg-background">
                                            <TabsList className="w-full justify-start h-10 border-b rounded-none p-0 bg-muted/40">
                                                <TabsTrigger value="rest" className="flex-1 rounded-none border-r h-full">Rest API</TabsTrigger>
                                                <TabsTrigger value="zoho" className="flex-1 rounded-none h-full">Zoho CRM</TabsTrigger>
                                            </TabsList>
                                            <TabsContent value="rest" className="p-4 space-y-4 m-0">
                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                                    <div className="col-span-1">
                                                        <Label className="text-xs">Method</Label>
                                                        <Select defaultValue="GET">
                                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {['GET', 'POST', 'PUT', 'PATCH'].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="col-span-3">
                                                        <Label className="text-xs">Endpoint URL</Label>
                                                        <Input placeholder="https://api.example.com/data" className="h-9" />
                                                    </div>
                                                </div>
                                                <div className="bg-muted/50 rounded-lg p-3 border border-dashed">
                                                    <p className="text-[10px] text-center text-muted-foreground font-bold">Use Response Mapping to bind API properties to variables</p>
                                                </div>
                                            </TabsContent>
                                            <TabsContent value="zoho" className="p-4 flex flex-col items-center justify-center gap-3 m-0 py-8">
                                                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e0/Zoho_Logo.png" className="h-6 object-contain grayscale opacity-50" />
                                                <Button variant="outline" className="gap-2 text-xs h-9">
                                                    <ExternalLink className="h-3 w-3" />
                                                    Connect Zoho CRM
                                                </Button>
                                                <p className="text-[10px] text-muted-foreground font-medium">Auto-sync leads and customer data directly into flows</p>
                                            </TabsContent>
                                        </Tabs>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 3: Footer & Buttons */}
                        {currentStep === 3 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl border bg-card">
                                    <div className="space-y-4">
                                        <Label className="font-bold text-primary">Footer Mode</Label>
                                        <div className="space-y-2">
                                            {[
                                                { id: 'existing_topic', label: 'Existing Topic Link', color: 'bg-blue-500' },
                                                { id: 'new_option', label: 'Custom Quick Replies', color: 'bg-indigo-500' },
                                                { id: 'appointment', label: 'Book Appointment', color: 'bg-purple-500' },
                                                { id: 'days', label: 'Days as Options', color: 'bg-emerald-500' },
                                            ].map(m => (
                                                <div
                                                    key={m.id}
                                                    onClick={() => setFormData({ ...formData, step3: { ...formData.step3, footerType: m.id } })}
                                                    className={cn(
                                                        "p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group",
                                                        formData.step3.footerType === m.id ? "border-primary bg-primary/5 shadow-inner" : "hover:border-primary/20 bg-muted/30"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("w-2 h-2 rounded-full", m.color)} />
                                                        <span className={cn("text-xs font-bold", formData.step3.footerType === m.id ? "text-primary" : "text-muted-foreground")}>
                                                            {m.label}
                                                        </span>
                                                    </div>
                                                    <div className={cn(
                                                        "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                                        formData.step3.footerType === m.id ? "bg-primary border-primary" : "border-muted group-hover:border-primary/40"
                                                    )}>
                                                        {formData.step3.footerType === m.id && <Check className="h-3 w-3 text-white" />}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="font-bold text-primary">Interactive Format</Label>
                                        <div className="flex gap-2">
                                            <Button
                                                variant={formData.step3.interactiveType === 'Button' ? 'default' : 'outline'}
                                                className="flex-1 flex-col h-20 gap-2 border-primary/20"
                                                onClick={() => setFormData({ ...formData, step3: { ...formData.step3, interactiveType: 'Button' } })}
                                            >
                                                <Bot className="h-5 w-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Quick Reply Buttons</span>
                                            </Button>
                                            <Button
                                                variant={formData.step3.interactiveType === 'List' ? 'default' : 'outline'}
                                                className="flex-1 flex-col h-20 gap-2 border-primary/20"
                                                onClick={() => setFormData({ ...formData, step3: { ...formData.step3, interactiveType: 'List' } })}
                                            >
                                                <ListIcon className="h-5 w-5" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Vertical List Menu</span>
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground font-medium italic">
                                            * WhatsApp allows max 3 buttons or 10 list options.
                                        </p>
                                    </div>
                                </div>

                                {/* Foot Mode Config - Step 3 Subcontent */}
                                <div className="animate-in zoom-in-95 fade-in duration-300">
                                    {formData.step3.footerType === 'existing_topic' && (
                                        <div className="space-y-3 p-6 border-2 border-dashed rounded-2xl bg-muted/40">
                                            <Label>Select Trigger Topics</Label>
                                            <Select onValueChange={(v) => {
                                                if (!formData.step3.selectedTopics.includes(v)) {
                                                    setFormData({ ...formData, step3: { ...formData.step3, selectedTopics: [...formData.step3.selectedTopics, v] } });
                                                }
                                            }}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Search & Select Topics..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {['Welcome', 'Product Demo', 'Support', 'Pricing', 'Location'].map(t => (
                                                        <SelectItem key={t} value={t}>{t}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <div className="flex flex-wrap gap-2">
                                                {formData.step3.selectedTopics.map(t => (
                                                    <Badge key={t} className="gap-2 pl-3">
                                                        {t}
                                                        <button onClick={() => setFormData({ ...formData, step3: { ...formData.step3, selectedTopics: formData.step3.selectedTopics.filter(st => st !== t) } })}>
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {formData.step3.footerType === 'new_option' && (
                                        <div className="space-y-4">
                                            {formData.step3.customButtons.map((btn: any, idx: number) => (
                                                <div key={idx} className="grid grid-cols-2 lg:grid-cols-11 gap-2 items-end bg-muted/20 p-2 rounded-xl border">
                                                    <div className="lg:col-span-5 space-y-1">
                                                        <Input
                                                            value={btn.label}
                                                            onChange={(e) => {
                                                                const newBtns = [...formData.step3.customButtons];
                                                                newBtns[idx].label = e.target.value;
                                                                setFormData({ ...formData, step3: { ...formData.step3, customButtons: newBtns } });
                                                            }}
                                                            placeholder="Button Label"
                                                            className="h-8 text-xs"
                                                        />
                                                    </div>
                                                    <div className="lg:col-span-5 space-y-1">
                                                        <Input
                                                            value={btn.keyword}
                                                            onChange={(e) => {
                                                                const newBtns = [...formData.step3.customButtons];
                                                                newBtns[idx].keyword = e.target.value;
                                                                setFormData({ ...formData, step3: { ...formData.step3, customButtons: newBtns } });
                                                            }}
                                                            placeholder="Trigger Keyword"
                                                            className="h-8 text-xs font-mono"
                                                        />
                                                    </div>
                                                    <div className="lg:col-span-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => {
                                                                const newBtns = formData.step3.customButtons.filter((_: any, i: number) => i !== idx);
                                                                setFormData({ ...formData, step3: { ...formData.step3, customButtons: newBtns } });
                                                            }}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="grid grid-cols-2 lg:grid-cols-11 gap-2 items-end">
                                                <div className="lg:col-span-5 space-y-2">
                                                    <Label className="text-[10px] font-bold uppercase">Button Label</Label>
                                                    <Input id="new-btn-label" placeholder="e.g. Schedule Call" className="h-9" />
                                                </div>
                                                <div className="lg:col-span-4 space-y-2">
                                                    <Label className="text-[10px] font-bold uppercase">Keyword / Trigger</Label>
                                                    <Input id="new-btn-keyword" placeholder="keyword" className="h-9 font-mono" />
                                                </div>
                                                <div className="lg:col-span-2">
                                                    <Button className="w-full h-9" onClick={() => {
                                                        const label = (document.getElementById('new-btn-label') as HTMLInputElement).value;
                                                        const keyword = (document.getElementById('new-btn-keyword') as HTMLInputElement).value;
                                                        if (label && keyword) {
                                                            setFormData({
                                                                ...formData,
                                                                step3: {
                                                                    ...formData.step3,
                                                                    customButtons: [...formData.step3.customButtons, { label, keyword }]
                                                                }
                                                            });
                                                            (document.getElementById('new-btn-label') as HTMLInputElement).value = '';
                                                            (document.getElementById('new-btn-keyword') as HTMLInputElement).value = '';
                                                        }
                                                    }}><Plus className="h-4 w-4" /></Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {formData.step3.footerType === 'appointment' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-2xl bg-card">
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">Start Date</Label>
                                                        <Input type="date" className="h-9" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-xs">End Date</Label>
                                                        <Input type="date" className="h-9" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs">Frequency</Label>
                                                    <div className="flex gap-2">
                                                        <Input type="number" defaultValue={1} className="w-20 h-9" />
                                                        <Select defaultValue="Day">
                                                            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                                            <SelectContent>
                                                                {['Day', 'Week', 'Month'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <Label className="text-xs font-bold uppercase text-primary">Time Slots</Label>
                                                <div className="flex items-center gap-2">
                                                    <Select><SelectTrigger className="h-9"><SelectValue placeholder="From" /></SelectTrigger></Select>
                                                    <Select><SelectTrigger className="h-9"><SelectValue placeholder="To" /></SelectTrigger></Select>
                                                    <Button size="icon" className="h-9 w-9 shrink-0"><Plus className="h-4 w-4" /></Button>
                                                </div>
                                                <div className="p-3 bg-muted/50 rounded-xl border border-dashed flex flex-col items-center justify-center min-h-[80px]">
                                                    <Calendar className="h-5 w-5 text-muted-foreground opacity-30 mb-2" />
                                                    <p className="text-[10px] text-muted-foreground font-medium italic text-center">Define available slots for customer self-booking</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 4: Logic & Actions */}
                        {currentStep === 4 && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card className="border-2 border-indigo-100 dark:border-indigo-900 shadow-sm hover:shadow-md transition-shadow h-min">
                                        <CardContent className="p-6 space-y-4">
                                            <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-600">
                                                <CircleArrowRight className="h-4 w-4" />
                                                Flow Continuity
                                            </h3>
                                            <div className="space-y-5">
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <Label className="text-xs font-semibold">Jump to Next Topic</Label>
                                                        <Switch
                                                            checked={!!formData.step4.connectToTopic}
                                                            onCheckedChange={(val) => setFormData({ ...formData, step4: { ...formData.step4, connectToTopic: val ? 'some_topic' : '' } })}
                                                        />
                                                    </div>
                                                    {formData.step4.connectToTopic && (
                                                        <Select defaultValue="Age">
                                                            <SelectTrigger className="animate-in slide-in-from-top-1 h-9">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {['Welcome', 'Pricing', 'Age', 'Location'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-semibold">Flow Reset Button (Optional)</Label>
                                                    <Input
                                                        placeholder="Label to start from beginning..."
                                                        className="h-9"
                                                        value={formData.step4.resetFlowKeyword}
                                                        onChange={(e) => setFormData({ ...formData, step4: { ...formData.step4, resetFlowKeyword: e.target.value } })}
                                                    />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card className="border-2 border-emerald-100 dark:border-emerald-900 shadow-sm hover:shadow-md transition-shadow h-min">
                                        <CardContent className="p-6 space-y-4">
                                            <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-600">
                                                <Database className="h-4 w-4" />
                                                Data Capturing
                                            </h3>
                                            <div className="space-y-5">
                                                <div className="flex items-center justify-between group">
                                                    <div className="space-y-0.5">
                                                        <Label className="text-xs font-semibold">Wait for User Input</Label>
                                                        <p className="text-[10px] text-muted-foreground font-medium italic">Pause logic until user replies</p>
                                                    </div>
                                                    <Switch checked={formData.step4.getUserInput} onCheckedChange={(v) => setFormData({ ...formData, step4: { ...formData.step4, getUserInput: v } })} />
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-0.5">
                                                            <Label className="text-xs font-semibold">Save to CRM Column</Label>
                                                            <p className="text-[10px] text-muted-foreground font-medium italic">Store response in contact info</p>
                                                        </div>
                                                        <Switch checked={formData.step4.saveConversation} onCheckedChange={(v) => setFormData({ ...formData, step4: { ...formData.step4, saveConversation: v } })} />
                                                    </div>
                                                    {formData.step4.saveConversation && (
                                                        <Input
                                                            placeholder="Column name (e.g. Lead Type)"
                                                            className="h-9 animate-in slide-in-from-top-1"
                                                            value={formData.step4.conversationField}
                                                            onChange={(e) => setFormData({ ...formData, step4: { ...formData.step4, conversationField: e.target.value } })}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card className="border-2 border-amber-100 dark:border-amber-900 shadow-sm bg-amber-50/10 h-min">
                                    <CardContent className="p-6 space-y-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-sm font-bold flex items-center gap-2 text-amber-600">
                                                <Bell className="h-4 w-4" />
                                                Notifications & Alerts
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                <Switch checked={formData.step4.notifyCustomer} onCheckedChange={(v) => setFormData({ ...formData, step4: { ...formData.step4, notifyCustomer: v } })} />
                                                <Label className="text-xs font-bold">Enabled</Label>
                                            </div>
                                        </div>

                                        {formData.step4.notifyCustomer && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in">
                                                <div className="space-y-3 border p-4 rounded-xl bg-background/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Team Alert</span>
                                                        <Badge className="bg-amber-500">NEW</Badge>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Switch id="mail-not" checked={formData.step4.notifyEmail} onCheckedChange={(v) => setFormData({ ...formData, step4: { ...formData.step4, notifyEmail: v } })} />
                                                        <Label htmlFor="mail-not" className="text-xs">Notify via Email</Label>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <Switch id="wa-not" checked={formData.step4.notifyWhatsApp} onCheckedChange={(v) => setFormData({ ...formData, step4: { ...formData.step4, notifyWhatsApp: v } })} />
                                                        <Label htmlFor="wa-not" className="text-xs">Notify via WhatsApp</Label>
                                                    </div>
                                                </div>
                                                <div className="space-y-2 flex flex-col items-center justify-center text-center p-4 border border-dashed rounded-xl grayscale opacity-60">
                                                    <Settings className="h-8 w-8 text-amber-500/40 mb-2" />
                                                    <p className="text-[10px] font-bold text-muted-foreground">Notification Templates</p>
                                                    <p className="text-[9px] text-muted-foreground italic px-4">Templates for team alerts are managed in Settings &gt; Notifications</p>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                    </div>
                </ScrollArea>

                {/* Wizard Footer */}
                <div className="p-4 md:p-6 border-t flex items-center justify-between bg-card">
                    <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="gap-2 font-bold px-6">
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={onCancel} className="font-semibold px-6 border-none text-muted-foreground">Cancel</Button>
                        {currentStep < 4 ? (
                            <Button onClick={handleNext} className="gradient-primary gap-2 font-bold px-8 shadow-md">
                                Continue
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button onClick={() => onSave(formData)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-black px-10 shadow-lg shadow-emerald-500/20">
                                <Save className="h-4 w-4" />
                                Finish & Activate
                            </Button>
                        )}
                    </div>
                </div>
            </div >

            {/* Live Preview Sidebar */}
            < div className={
                cn(
                    "w-full md:w-[350px] lg:w-[420px] bg-slate-100 dark:bg-slate-900 flex flex-col shadow-inner transition-all",
                    !previewActive && "md:w-0 overflow-hidden"
                )
            }>
                <div className="h-14 border-b flex items-center justify-between px-6 bg-background/50 gap-4 shrink-0">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                        <Eye className="h-4 w-4 text-primary" />
                        Real-time Preview
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mt-0.5">Live Sync</span>
                    </div>
                </div>

                <div className="flex-1 p-6 flex items-center justify-center overflow-auto scrollbar-hide">
                    <div className="relative w-[280px] h-[580px] bg-slate-950 rounded-[3rem] border-[8px] border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden shrink-0 ring-4 ring-slate-900/50">
                        {/* iPhone Dynamic Island */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-slate-950 rounded-b-2xl z-20 flex items-center justify-center">
                            <div className="w-12 h-1 bg-slate-800/50 rounded-full" />
                        </div>

                        {/* Status Bar */}
                        <div className="h-10 px-6 flex items-center justify-between shrink-0 z-10">
                            <span className="text-[10px] font-bold text-white/80">9:41</span>
                            <div className="flex gap-1.5 items-center">
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4].map(i => <div key={i} className="w-[2px] h-[6px] bg-white/80 rounded-full" />)}
                                </div>
                                <Smartphone className="h-3 w-3 text-white/80" />
                                <div className="w-4 h-2 rounded-sm border border-white/50 relative">
                                    <div className="absolute inset-[1px] bg-white/80 rounded-sm w-[70%]" />
                                </div>
                            </div>
                        </div>

                        {/* Conversation Header */}
                        <div className="h-12 border-b border-white/5 bg-slate-900/40 backdrop-blur-md flex items-center px-4 shrink-0 gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 overflow-hidden ring-2 ring-primary/10">
                                <img src="/logo.svg" className="h-5 w-5 object-contain" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold text-white">NotifyNow Bot</p>
                                <p className="text-[8px] text-emerald-400 font-bold uppercase tracking-tight">Active Online</p>
                            </div>
                        </div>

                        {/* Chat Area */}
                        <div className="flex-1 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/WhatsApp_Chat_Background_Clean.png/640px-WhatsApp_Chat_Background_Clean.png')] bg-cover bg-center p-3 space-y-3 overflow-hidden">
                            <div className="flex justify-end">
                                <div className="max-w-[80%] bg-[#056162] text-white px-3 py-2 rounded-2xl rounded-tr-none text-[11px] font-medium shadow-sm border border-white/5">
                                    {formData.step1.keywords[0] || 'Hello'}
                                    <div className="text-[8px] text-right mt-1 opacity-60">9:41 AM <Check className="h-2 w-2 inline ml-0.5" /><Check className="h-2 w-2 inline -ml-1 text-emerald-400" /></div>
                                </div>
                            </div>

                            <div className="flex justify-start animate-in fade-in slide-in-from-left-4 duration-500 delay-300">
                                <div className="max-w-[90%] bg-slate-800 text-white rounded-2xl rounded-tl-none shadow-xl border border-white/5 overflow-hidden ring-1 ring-white/5">
                                    {/* Rich Media Header */}
                                    {formData.step1.headerType !== 'None' && (
                                        <div className="p-1 border-b border-white/5">
                                            {formData.step1.headerType === 'Text' ? (
                                                <p className="p-2 text-[10px] font-black bg-white/5 rounded-lg text-primary">{formData.step1.headerValue || 'Header Text'}</p>
                                            ) : (
                                                <div className="h-24 bg-slate-900 flex items-center justify-center rounded-xl relative group overflow-hidden">
                                                    {formData.step1.headerType === 'Image' && <ImageIcon className="h-6 w-6 text-white/20 group-hover:scale-110 transition-transform" />}
                                                    {formData.step1.headerType === 'Video' && <Play className="h-6 w-6 text-white/20" />}
                                                    {formData.step1.headerType === 'Document' && <FileIcon className="h-6 w-6 text-white/20" />}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Body */}
                                    <div className="p-3 text-[11px] leading-relaxed whitespace-pre-wrap font-medium">
                                        {formData.step2.body || 'Type your message in Step 2 to see it here...'}
                                        <div className="text-[8px] text-right mt-1 opacity-60 font-bold">9:41 AM</div>
                                    </div>

                                    {/* Logic Indicator (Preview only) */}
                                    {formData.step4.getUserInput && (
                                        <div className="px-3 py-1.5 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center gap-2">
                                            <RefreshCw className="h-2 w-2 text-emerald-500 animate-spin" />
                                            <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter">Waiting for user reply...</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Footer Buttons Preview */}
                            {(formData.step3.selectedTopics.length > 0 || formData.step3.interactiveType === 'Button') && (
                                <div className="flex flex-col gap-1.5 animate-in slide-in-from-bottom-4 duration-500 delay-500">
                                    {formData.step3.interactiveType === 'Button' ? (
                                        <div className="flex flex-col gap-1.5 max-w-[85%] mx-auto">
                                            {formData.step3.selectedTopics.length > 0 ? (
                                                formData.step3.selectedTopics.map((btn, i) => (
                                                    <div key={i} className="bg-slate-800/90 backdrop-blur-md text-[#33b1ff] h-8 flex items-center justify-center rounded-xl text-xs font-black shadow-lg border border-white/5 active:bg-slate-700 transition-colors">
                                                        {btn}
                                                    </div>
                                                ))
                                            ) : formData.step3.customButtons.length > 0 ? (
                                                formData.step3.customButtons.map((btn: any, i: number) => (
                                                    <div key={i} className="bg-slate-800/90 backdrop-blur-md text-[#33b1ff] h-8 flex items-center justify-center rounded-xl text-xs font-black shadow-lg border border-white/5 active:bg-slate-700 transition-colors">
                                                        {btn.label}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="bg-slate-800/90 backdrop-blur-md text-[#33b1ff] h-8 flex items-center justify-center rounded-xl text-xs font-black shadow-lg border border-white/5 opacity-40 italic">
                                                    Quick Reply Button
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="max-w-[75%] mx-auto bg-slate-800/90 backdrop-blur-md text-[#33b1ff] h-9 flex items-center justify-center rounded-2xl text-[10px] font-black shadow-lg border-2 border-[#33b1ff]/30 ring-1 ring-[#33b1ff]/10">
                                            <ListIcon className="h-3 w-3 mr-2" />
                                            {formData.step3.customList.title || 'View Options Menu'}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="h-14 bg-slate-900 border-t border-white/5 flex items-center px-4 gap-3 shrink-0">
                            <div className="text-white/30"><Plus className="h-5 w-5" /></div>
                            <div className="flex-1 h-8 bg-slate-800 rounded-full border border-white/10" />
                            <div className="text-primary"><ImageIcon className="h-5 w-5" /></div>
                            <div className="text-primary"><Smartphone className="h-5 w-5" /></div>
                        </div>

                        {/* Home Indicator */}
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/20 rounded-full" />
                    </div>
                </div>

                <div className="p-6 shrink-0 mt-auto border-t bg-background/50">
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border-2 border-primary/10 shadow-inner group">
                        <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-lg bg-primary/10 text-primary ring-2 ring-primary/20 group-hover:scale-110 transition-transform">
                            <Settings className="h-5 w-5 animate-spin-slow" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest leading-tight">Pro-Config</p>
                            <p className="text-[9px] text-muted-foreground font-medium leading-tight">These settings follow professional conversion design principles.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Tooltip helper
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
