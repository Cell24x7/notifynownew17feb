import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit, Copy, Trash2, Eye, CheckCircle, Clock, XCircle, Filter, Download, Share2, Loader, FileText, Smartphone, Image as ImageIcon, Layers, MoreHorizontal, Calendar, MapPin, Phone, Globe, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { rcsTemplatesService } from '@/services/rcsTemplatesService';
import { type RCSTemplate } from '@/lib/mockData';

// Types for new template structures
type TemplateType = 'text_message' | 'rich_card' | 'carousel';
type CardOrientation = 'VERTICAL' | 'HORIZONTAL';
type CardHeight = 'SHORT_HEIGHT' | 'MEDIUM_HEIGHT';
type CardWidth = 'SHORT_WIDTH' | 'MEDIUM_WIDTH';

interface ActionButton {
  type: 'reply' | 'dialer_action' | 'url_action' | 'view_location_latlong' | 'calendar_event';
  displayText: string;
  postback?: string;
  phoneNumber?: string;
  url?: string;
  latitude?: string;
  longitude?: string;
  label?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  description?: string;
}

interface RichCardData {
  orientation: CardOrientation;
  height: CardHeight;
  mediaUrl: string;
  title: string;
  description: string;
  buttons: ActionButton[];
}

interface CarouselCardData {
  mediaUrl: string;
  title: string;
  description: string;
  buttons: ActionButton[];
}

interface RCSTemplateFormData {
  name: string;
  language: string;
  category: 'Utility' | 'Marketing' | 'Authentication';
  templateType: TemplateType;
  // Header (Text Message Only)
  headerType: 'none' | 'text' | 'image' | 'video' | 'audio' | 'document';
  headerContent: string;
  headerFileName?: string; // To store the original filename
  // Text Message specific
  body: string;
  // Rich Card specific
  richCard: RichCardData;
  // Carousel specific
  carousel: {
    height: CardHeight;
    width: CardWidth;
    cards: CarouselCardData[];
  };
  // Footer (common)
  footer: string;
  // Common buttons (for text message)
  buttons: ActionButton[];
}

const INITIAL_RICH_CARD: RichCardData = {
  orientation: 'VERTICAL',
  height: 'MEDIUM_HEIGHT',
  mediaUrl: '',
  title: '',
  description: '',
  buttons: []
};

const INITIAL_CAROUSEL_CARD: CarouselCardData = {
  mediaUrl: '',
  title: '',
  description: '',
  buttons: []
};

export default function RCSTemplateManagement() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState<RCSTemplateFormData>({
    name: '',
    language: 'English',
    category: 'Marketing',
    templateType: 'text_message',
    headerType: 'none',
    headerContent: '',
    headerFileName: '',
    body: '',
    richCard: { ...INITIAL_RICH_CARD },
    carousel: {
      height: 'MEDIUM_HEIGHT',
      width: 'MEDIUM_WIDTH',
      cards: [{ ...INITIAL_CAROUSEL_CARD }, { ...INITIAL_CAROUSEL_CARD }]
    },
    footer: '',
    buttons: []
  });

  // Temporary state for button adding
  const [newButton, setNewButton] = useState<Partial<ActionButton>>({ type: 'reply', displayText: '' });
  const [activeCardIndex, setActiveCardIndex] = useState<number>(-1); // -1 for main buttons, 0+ for carousel cards

  const { toast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await rcsTemplatesService.getAllTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({ title: 'Error', description: 'Failed to load templates', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const insertVariable = (field: string, index?: number) => {
    const variable = '{{1}}'; // Simple placeholder for now, ideally strictly named params
    // Logic to insert at cursor position would go here, for now appending
    if (field === 'body') {
      setFormData(prev => ({ ...prev, body: prev.body + variable }));
    } else if (field === 'header') {
      setFormData(prev => ({ ...prev, headerContent: prev.headerContent + variable }));
    } else if (field === 'richCard.title') {
      setFormData(prev => ({ ...prev, richCard: { ...prev.richCard, title: prev.richCard.title + variable } }));
    } else if (field === 'richCard.description') {
      setFormData(prev => ({ ...prev, richCard: { ...prev.richCard, description: prev.richCard.description + variable } }));
    }
    // ... handle other fields
  };

  const validateFile = (file: File, type: 'image' | 'video' | 'audio' | 'document') => {
    const limits = {
      image: { size: 2 * 1024 * 1024, types: ['image/jpeg', 'image/png'], label: '2MB (JPEG, PNG)' },
      video: { size: 10 * 1024 * 1024, types: ['video/mp4'], label: '10MB (MP4)' },
      audio: { size: 5 * 1024 * 1024, types: ['audio/mpeg', 'audio/mp3'], label: '5MB (MP3)' },
      document: { size: 5 * 1024 * 1024, types: ['application/pdf'], label: '5MB (PDF)' }
    };

    const limit = limits[type];
    if (!limit) return true;

    if (file.size > limit.size) {
      toast({ title: 'File Too Large', description: `Max size for ${type} is ${limit.label}`, variant: 'destructive' });
      return false;
    }

    if (!limit.types.some(t => file.type.includes(t.split('/')[1]) || file.type === t)) {
        // Simple type check, can be more robust
       // toast({ title: 'Invalid File Type', description: `Allowed types: ${limit.label}`, variant: 'destructive' });
       // allowing a bit loose check for now or strict? Let's use the explicit types
       if(!limit.types.includes(file.type)) {
          toast({ title: 'Invalid File Type', description: `Allowed types: ${limit.label}`, variant: 'destructive' });
          return false;
       }
    }
    return true;
  };

  const handleHeaderFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'audio' | 'document') => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!validateFile(file, type)) {
          e.target.value = ''; // Reset input
          return;
      }

      const url = URL.createObjectURL(file);
      setFormData(prev => ({ 
          ...prev, 
          headerContent: url,
          headerFileName: file.name
      }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'richCard' | 'carousel', index?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!validateFile(file, 'image')) return; // Rich cards only support images usually
      
      const url = URL.createObjectURL(file);
      if (type === 'richCard') {
        setFormData(prev => ({ ...prev, richCard: { ...prev.richCard, mediaUrl: url } }));
      } else if (type === 'carousel' && typeof index === 'number') {
        const newCards = [...formData.carousel.cards];
        newCards[index].mediaUrl = url;
        setFormData(prev => ({ ...prev, carousel: { ...prev.carousel, cards: newCards } }));
      }
    }
  };

  const addCarouselCard = () => {
    setFormData(prev => ({
      ...prev,
      carousel: { ...prev.carousel, cards: [...prev.carousel.cards, { ...INITIAL_CAROUSEL_CARD }] }
    }));
  };

  const removeCarouselCard = (index: number) => {
    if (formData.carousel.cards.length <= 2) {
      toast({ title: "Min Cards", description: "Carousel must have at least 2 cards", variant: "destructive" });
      return;
    }
    const newCards = formData.carousel.cards.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, carousel: { ...prev.carousel, cards: newCards } }));
  };

  const handleAddButton = () => {
    if (!newButton.displayText) return;
    
    const buttonToAdd = { ...newButton } as ActionButton;
    
    if (formData.templateType === 'text_message') {
       setFormData(prev => ({ ...prev, buttons: [...prev.buttons, buttonToAdd] }));
    } else if (formData.templateType === 'rich_card') {
       if (formData.richCard.buttons.length >= 4) {
         toast({ title: "Limit Reached", description: "Max 4 buttons allowed", variant: "destructive" });
         return;
       }
       setFormData(prev => ({ ...prev, richCard: { ...prev.richCard, buttons: [...prev.richCard.buttons, buttonToAdd] } }));
    } 
    // Reset
    setNewButton({ type: 'reply', displayText: '' });
  };
  
  const removeButton = (index: number, cardIndex: number = -1) => {
      if (cardIndex === -1) {
          if (formData.templateType === 'text_message') {
             setFormData(prev => ({ ...prev, buttons: prev.buttons.filter((_, i) => i !== index) }));
          } else if (formData.templateType === 'rich_card') {
             setFormData(prev => ({ ...prev, richCard: { ...prev.richCard, buttons: prev.richCard.buttons.filter((_, i) => i !== index) } }));
          }
      } else {
           // Handle carousel buttons
      }
  };

  const handleCreateTemplate = async () => {
    if (!formData.name) {
      toast({ title: 'Error', description: 'Template name is required', variant: 'destructive' });
      return;
    }

    try {
      setIsCreating(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('custId', '7');
      formDataToSend.append('template_name', formData.name);
      formDataToSend.append('template_type', formData.templateType);

      if (formData.templateType === 'text_message') {
        formDataToSend.append('template_content', formData.body);
        
        const suggestions = formData.buttons.map(btn => {
          if (btn.type === 'reply') {
            return { suggestionType: 'reply', displayText: btn.displayText, postback: btn.postback || btn.displayText };
          } else if (btn.type === 'url_action') {
            return { suggestionType: 'url_action', displayText: btn.displayText, url: btn.url };
          } else if (btn.type === 'dialer_action') {
            return { suggestionType: 'dialer_action', displayText: btn.displayText, phoneNumber: btn.phoneNumber };
          }
          return null;
        }).filter(Boolean);
        
        formDataToSend.append('suggestion', JSON.stringify(suggestions));
      } else if (formData.templateType === 'rich_card') {
        formDataToSend.append('template_content', formData.richCard.description);
        formDataToSend.append('title', formData.richCard.title);
        formDataToSend.append('media_url', formData.richCard.mediaUrl);
        formDataToSend.append('suggestion', JSON.stringify(formData.richCard.buttons));
      }

      const result = await rcsTemplatesService.createExternalTemplate(formDataToSend);
      
      if (result.code === 0) {
        toast({ title: 'Success', description: result.msg || 'Template created successfully!' });
        setIsCreateOpen(false);
        fetchTemplates();
        setFormData({
          name: '', language: 'English', category: 'Marketing', templateType: 'text_message',
          headerType: 'none', headerContent: '', headerFileName: '',
          body: '', richCard: { ...INITIAL_RICH_CARD }, 
          carousel: { height: 'MEDIUM_HEIGHT', width: 'MEDIUM_WIDTH', cards: [{ ...INITIAL_CAROUSEL_CARD }, { ...INITIAL_CAROUSEL_CARD }] },
          footer: '', buttons: []
        });
      } else {
        throw new Error(result.msg || 'Failed to create template');
      }

    } catch (error: any) {
      console.error('Error creating template:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create template', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };
  
  const handleDelete = async (id: string) => {
      try {
          await rcsTemplatesService.deleteTemplate(id);
          setTemplates(prev => prev.filter(t => t.id !== id));
          toast({ title: "Deleted", description: "Template deleted successfully" });
      } catch (err) {
          toast({ title: "Error", description: "Failed to delete template", variant: "destructive" });
      }
  };

  // Helper to render preview
  const renderDevicePreview = () => {
    return (
      <div className="border rounded-3xl border-gray-800 bg-white overflow-hidden w-[300px] h-[600px] relative mx-auto shadow-xl">
         {/* Status Bar */}
         <div className="bg-gray-100 p-2 flex justify-between items-center text-xs border-b">
             <span>10:00</span>
             <div className="flex space-x-2 items-center">
                 <span className="text-[10px] font-mono bg-gray-200 px-1 rounded text-gray-600">{formData.language.substring(0,2).toUpperCase()}</span>
                 <div className="flex space-x-1">
                     <Smartphone size={12} />
                     <span className="font-bold">5G</span>
                 </div>
             </div>
         </div>
         
         {/* Content Area */}
         <div className="p-4 h-[calc(100%-100px)] overflow-y-auto bg-gray-50">
             {/* Sender Bubble */}
             <div className="flex flex-col space-y-2">
                 
                 {formData.templateType === 'text_message' && (
                     <div className="bg-blue-100 p-3 rounded-lg rounded-tl-none max-w-[85%] text-sm text-gray-800 shadow-sm">
                         {/* Header Preview */}
                         {formData.headerType === 'text' && (
                             <div className="font-bold mb-2 pb-1 text-base">{formData.headerContent}</div>
                         )}
                         {formData.headerType === 'image' && formData.headerContent && (
                             <div className="mb-2 rounded-md overflow-hidden">
                                 <img src={formData.headerContent} alt="Header" className="w-full h-auto object-cover" />
                             </div>
                         )}
                         {formData.headerType === 'video' && formData.headerContent && (
                             <div className="mb-2 rounded-md overflow-hidden bg-black">
                                 <video src={formData.headerContent} controls className="w-full h-auto" />
                             </div>
                         )}
                         {formData.headerType === 'audio' && formData.headerContent && (
                             <div className="mb-2 p-2 bg-gray-50 rounded-md border flex items-center gap-2">
                                 <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                     <Phone size={14} className="rotate-90" />
                                 </div>
                                 <div className="flex-1 overflow-hidden">
                                     <div className="text-xs font-medium truncate">{formData.headerFileName || 'Audio File'}</div>
                                     <div className="text-xs text-gray-500">Audio Message</div>
                                 </div>
                             </div>
                         )}
                         {formData.headerType === 'document' && formData.headerContent && (
                             <div className="mb-2 p-3 bg-gray-50 rounded-md border flex items-center gap-3">
                                 <div className="p-2 bg-red-100 rounded text-red-600">
                                     <FileText size={20} />
                                 </div>
                                 <div className="flex-1 overflow-hidden">
                                     <div className="text-sm font-medium truncate">{formData.headerFileName || 'Document.pdf'}</div>
                                     <div className="text-xs text-gray-500">PDF Document</div>
                                 </div>
                             </div>
                         )}
                         
                         <div className="whitespace-pre-wrap">{formData.body || 'Your message text...'}</div>
                         {formData.footer && <div className="text-xs text-gray-500 mt-1 pt-1 border-t border-blue-200">{formData.footer}</div>}
                     </div>
                 )}

                 {formData.templateType === 'rich_card' && (
                     <div className="bg-white rounded-lg rounded-tl-none max-w-[90%] shadow-md overflow-hidden border">
                         {formData.richCard.mediaUrl ? (
                             <img src={formData.richCard.mediaUrl} className={`w-full object-cover ${formData.richCard.height === 'SHORT_HEIGHT' ? 'h-32' : 'h-48'}`} alt="Card Media" />
                         ) : (
                             <div className={`w-full bg-gray-200 flex items-center justify-center text-gray-400 ${formData.richCard.height === 'SHORT_HEIGHT' ? 'h-32' : 'h-48'}`}>
                                 <ImageIcon size={24} />
                             </div>
                         )}
                         <div className="p-3">
                             <h4 className="font-bold text-sm mb-1">{formData.richCard.title || 'Card Title'}</h4>
                             <p className="text-xs text-gray-600 mb-2">{formData.richCard.description || 'Card description goes here...'}</p>
                             
                             {/* Buttons */}
                             <div className="space-y-1 mt-2">
                                 {formData.richCard.buttons.map((btn, idx) => (
                                     <button key={idx} className="w-full py-1.5 px-3 text-xs font-medium text-blue-600 border border-gray-200 rounded hover:bg-gray-50">{btn.displayText}</button>
                                 ))}
                             </div>
                         </div>
                     </div>
                 )}
                 
                 {formData.templateType === 'carousel' && (
                      <div className="flex overflow-x-auto space-x-2 pb-2 snap-x">
                          {formData.carousel.cards.map((card, idx) => (
                              <div key={idx} className="min-w-[220px] bg-white rounded-lg shadow-md overflow-hidden border snap-center">
                                  {card.mediaUrl ? (
                                     <img src={card.mediaUrl} className={`w-full object-cover ${formData.carousel.height === 'SHORT_HEIGHT' ? 'h-24' : 'h-36'}`} alt={`Card ${idx}`} />
                                  ) : (
                                     <div className={`w-full bg-gray-200 flex items-center justify-center text-gray-400 ${formData.carousel.height === 'SHORT_HEIGHT' ? 'h-24' : 'h-36'}`}>
                                         <ImageIcon size={20} />
                                     </div>
                                  )}
                                  <div className="p-2">
                                      <h4 className="font-bold text-xs mb-1">{card.title || `Card ${idx+1}`}</h4>
                                      <p className="text-[10px] text-gray-600 line-clamp-2">{card.description || 'Description...'}</p>
                                  </div>
                              </div>
                          ))}
                      </div>
                 )}

                 {/* Standalone Actions (for text message) */}
                 {formData.templateType === 'text_message' && formData.buttons.length > 0 && (
                     <div className="space-y-1 mt-1">
                         {formData.buttons.map((btn, idx) => (
                             <div key={idx} className="bg-white border text-blue-600 text-xs py-2 px-3 rounded-full text-center shadow-sm">
                                 {btn.displayText}
                             </div>
                         ))}
                     </div>
                 )}

             </div>
         </div>
         
         {/* Bottom Bar */}
         <div className="absolute bottom-0 w-full bg-gray-100 p-2 flex justify-center items-center border-t">
             <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
         </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RCS Templates</h1>
          <p className="text-muted-foreground mt-1">Manage and create RCS message templates</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl h-[90vh] overflow-hidden flex flex-col p-0">
             <div className="px-6 py-4 border-b">
               <DialogTitle>Create New Template</DialogTitle>
             </div>
             
             <div className="flex-1 overflow-hidden flex">
                <div className="w-2/3 p-6 overflow-y-auto border-r">
                    {/* Basic Info */}
                    <div className="space-y-4 mb-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Template Name *</Label>
                                <Input 
                                    placeholder="Enter Template Name" 
                                    maxLength={20}
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">Use lowercase letters, numbers, and underscores only</p>
                            </div>
                            <div>
                                <Label>Category</Label>
                                <Select value={formData.category} onValueChange={(v: any) => setFormData({...formData, category: v})}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Marketing">Marketing</SelectItem>
                                        <SelectItem value="Utility">Utility</SelectItem>
                                        <SelectItem value="Authentication">Authentication</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Template Type Selection */}
                        <div className="p-4 bg-muted/30 rounded-lg border">
                            <Label className="mb-2 block">Template Type</Label>
                            <RadioGroup 
                                value={formData.templateType} 
                                onValueChange={(v: TemplateType) => setFormData({...formData, templateType: v})}
                                className="flex space-x-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="text_message" id="type-text" />
                                    <Label htmlFor="type-text" className="font-normal cursor-pointer">Text Message</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="rich_card" id="type-rich" />
                                    <Label htmlFor="type-rich" className="font-normal cursor-pointer">Rich Card Standalone</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="carousel" id="type-carousel" />
                                    <Label htmlFor="type-carousel" className="font-normal cursor-pointer">Rich Card Carousel</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    </div>

                    {/* Dynamic Content Builders */}
                    <div className="space-y-6">
                        {/* Text Message Builder */}
                        {formData.templateType === 'text_message' && (
                            <div className="space-y-4">
                                {/* Header Section */}
                                <div className="space-y-3 p-3 border rounded bg-slate-50">
                                    <div className="flex justify-between items-center">
                                        <Label className="font-semibold">Header (Optional)</Label>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs">Header Type</Label>
                                        <Select value={formData.headerType} onValueChange={(v: any) => setFormData({...formData, headerType: v, headerContent: ''})}>
                                            <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">NONE</SelectItem>
                                                <SelectItem value="text">TEXT</SelectItem>
                                                <SelectItem value="image">IMAGE</SelectItem>
                                                <SelectItem value="video">VIDEO</SelectItem>
                                                <SelectItem value="audio">AUDIO</SelectItem>
                                                <SelectItem value="document">DOCUMENT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {formData.headerType === 'text' && (
                                        <div className="space-y-2">
                                            <Label className="text-xs">Header Text</Label>
                                            <div className="flex gap-2">
                                                <Input 
                                                    className="bg-white"
                                                    placeholder="Enter header text..." 
                                                    maxLength={60}
                                                    value={formData.headerContent}
                                                    onChange={e => setFormData({...formData, headerContent: e.target.value})}
                                                />
                                                <Button variant="outline" size="sm" onClick={() => insertVariable('header')}>+ Param</Button>
                                            </div>
                                        </div>
                                    )}

                                    {formData.headerType === 'image' && (
                                        <div className="space-y-2">
                                            <Label className="text-xs">Header Image</Label>
                                            <Input 
                                                className="bg-white"
                                                type="file" 
                                                accept="image/png, image/jpeg"
                                                onChange={(e) => handleHeaderFileChange(e, 'image')}
                                            />
                                            <p className="text-[10px] text-gray-500">Max 2MB (JPEG, PNG)</p>
                                            {formData.headerContent && <p className="text-[10px] text-green-600">Image selected: {formData.headerFileName}</p>}
                                        </div>
                                    )}

                                    {formData.headerType === 'video' && (
                                        <div className="space-y-2">
                                            <Label className="text-xs">Header Video</Label>
                                            <Input 
                                                className="bg-white"
                                                type="file" 
                                                accept="video/mp4"
                                                onChange={(e) => handleHeaderFileChange(e, 'video')}
                                            />
                                            <p className="text-[10px] text-gray-500">Max 10MB (MP4)</p>
                                            {formData.headerContent && <p className="text-[10px] text-green-600">Video selected: {formData.headerFileName}</p>}
                                        </div>
                                    )}

                                    {formData.headerType === 'audio' && (
                                        <div className="space-y-2">
                                            <Label className="text-xs">Header Audio</Label>
                                            <Input 
                                                className="bg-white"
                                                type="file" 
                                                accept="audio/mpeg, audio/mp3"
                                                onChange={(e) => handleHeaderFileChange(e, 'audio')}
                                            />
                                            <p className="text-[10px] text-gray-500">Max 5MB (MP3)</p>
                                            {formData.headerContent && <p className="text-[10px] text-green-600">Audio selected: {formData.headerFileName}</p>}
                                        </div>
                                    )}

                                    {formData.headerType === 'document' && (
                                        <div className="space-y-2">
                                            <Label className="text-xs">Header Document</Label>
                                            <Input 
                                                className="bg-white"
                                                type="file" 
                                                accept="application/pdf"
                                                onChange={(e) => handleHeaderFileChange(e, 'document')}
                                            />
                                            <p className="text-[10px] text-gray-500">Max 5MB (PDF)</p>
                                            {formData.headerContent && <p className="text-[10px] text-green-600">Document selected: {formData.headerFileName}</p>}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <Label>Body *</Label>
                                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => insertVariable('body')}>
                                            + Add Parameter
                                        </Button>
                                    </div>
                                    <Textarea 
                                        placeholder="Enter your message content..." 
                                        className="min-h-[120px]"
                                        maxLength={2500}
                                        value={formData.body}
                                        onChange={e => setFormData({...formData, body: e.target.value})}
                                    />
                                </div>

                                {/* Button Builder Section */}
                                <div className="p-3 border rounded-lg bg-gray-50">
                                    <Label className="mb-3 block font-bold">Button</Label>
                                    
                                    {/* Button Inputs */}
                                    <div className="grid grid-cols-12 gap-3 mb-3 items-end">
                                        <div className="col-span-3">
                                            <Label className="text-xs mb-1 block">Type</Label>
                                            <Select value={newButton.type} onValueChange={(v: any) => setNewButton({...newButton, type: v})}>
                                                <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="reply">Reply</SelectItem>
                                                    <SelectItem value="dialer_action">Dialer Action</SelectItem>
                                                    <SelectItem value="url_action">Url Action</SelectItem>
                                                    <SelectItem value="view_location_latlong">View Location</SelectItem>
                                                    <SelectItem value="calendar_event">Calendar Event</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-3">
                                            <Label className="text-xs mb-1 block">Button Text</Label>
                                            <Input 
                                                className="bg-white"
                                                value={newButton.displayText || ''}
                                                onChange={e => setNewButton({...newButton, displayText: e.target.value})}
                                                placeholder="Enter Text"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <Label className="text-xs mb-1 block">Button Postback</Label>
                                            <Input 
                                                className="bg-white"
                                                value={newButton.postback || ''}
                                                onChange={e => setNewButton({...newButton, postback: e.target.value})}
                                                placeholder="Enter Postback"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                             <Button className="w-full" onClick={handleAddButton} variant="default">Add Button</Button>
                                        </div>

                                        {/* Dynamic inputs for specific button types */}
                                        {newButton.type === 'dialer_action' && (
                                            <div className="col-span-6 mt-2">
                                                <Label className="text-xs mb-1 block">Phone Number</Label>
                                                <Input className="bg-white" value={newButton.phoneNumber || ''} onChange={e => setNewButton({...newButton, phoneNumber: e.target.value})} placeholder="+1234567890" />
                                            </div>
                                        )}
                                        {newButton.type === 'url_action' && (
                                            <div className="col-span-6 mt-2">
                                                <Label className="text-xs mb-1 block">URL</Label>
                                                <Input className="bg-white" value={newButton.url || ''} onChange={e => setNewButton({...newButton, url: e.target.value})} placeholder="https://example.com" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Buttons Table */}
                                    <div className="bg-white border rounded-md overflow-hidden mt-4">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-gray-100 text-gray-700 font-medium border-b">
                                                <tr>
                                                    <th className="p-2 border-r w-12 text-center">No</th>
                                                    <th className="p-2 border-r">Type</th>
                                                    <th className="p-2 border-r">Button Text</th>
                                                    <th className="p-2 border-r">Button Postback</th>
                                                    <th className="p-2 border-r">Action Value</th>
                                                    <th className="p-2 text-center w-16">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.buttons.map((btn, idx) => (
                                                    <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                                                        <td className="p-2 border-r text-center">{idx + 1}</td>
                                                        <td className="p-2 border-r">{btn.type.replace('_', ' ')}</td>
                                                        <td className="p-2 border-r">{btn.displayText}</td>
                                                        <td className="p-2 border-r">{btn.postback || '-'}</td>
                                                        <td className="p-2 border-r">
                                                            {btn.type === 'dialer_action' ? btn.phoneNumber : 
                                                             btn.type === 'url_action' ? btn.url : '-'}
                                                        </td>
                                                        <td className="p-2 text-center">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => removeButton(idx)}>
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {formData.buttons.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="p-4 text-center text-gray-400">
                                                            No data available in table
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                        {formData.buttons.length > 0 && (
                                            <div className="p-2 border-t text-xs text-gray-500 bg-gray-50 flex justify-between">
                                                <span>Showing {1} to {formData.buttons.length} of {formData.buttons.length} entries</span>
                                                <div className="space-x-2">
                                                    <span className="cursor-pointer hover:underline">Previous</span>
                                                    <span className="cursor-pointer hover:underline">Next</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Rich Card Builder */}
                        {formData.templateType === 'rich_card' && (
                            <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                                <div className="grid grid-cols-3 gap-4">
                                     <div>
                                         <Label className="mb-1 block">Orientation</Label>
                                         <Select value={formData.richCard.orientation} onValueChange={(v: any) => setFormData({...formData, richCard: {...formData.richCard, orientation: v}})}>
                                             <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                             <SelectContent>
                                                 <SelectItem value="VERTICAL">Vertical</SelectItem>
                                                 <SelectItem value="HORIZONTAL">Horizontal</SelectItem>
                                             </SelectContent>
                                         </Select>
                                     </div>
                                     <div>
                                         <Label className="mb-1 block">Alignment</Label>
                                         <Select value="LEFT" disabled>
                                             <SelectTrigger className="bg-white"><SelectValue placeholder="Left" /></SelectTrigger>
                                         </Select>
                                     </div>
                                     <div>
                                         <Label className="mb-1 block">Height</Label>
                                         <Select value={formData.richCard.height} onValueChange={(v: any) => setFormData({...formData, richCard: {...formData.richCard, height: v}})}>
                                             <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                             <SelectContent>
                                                 <SelectItem value="SHORT_HEIGHT">Short Height</SelectItem>
                                                 <SelectItem value="MEDIUM_HEIGHT">Medium Height</SelectItem>
                                             </SelectContent>
                                         </Select>
                                     </div>
                                </div>
                                
                                <div>
                                    <Label className="mb-1 block">Image</Label>
                                    <Input className="bg-white" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'richCard')} />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <Label>Card Title</Label>
                                        <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => insertVariable('richCard.title')}>+ Param</Button>
                                    </div>
                                    <Input 
                                        className="bg-white"
                                        value={formData.richCard.title} 
                                        onChange={e => setFormData({...formData, richCard: {...formData.richCard, title: e.target.value}})}
                                    />
                                </div>

                                <div className="space-y-2">
                                     <div className="flex justify-between items-center">
                                        <Label>Card Description</Label>
                                        <Button variant="ghost" size="sm" className="h-5 text-[10px]" onClick={() => insertVariable('richCard.description')}>+ Param</Button>
                                    </div>
                                    <Textarea 
                                        className="bg-white"
                                        value={formData.richCard.description}
                                        onChange={e => setFormData({...formData, richCard: {...formData.richCard, description: e.target.value}})}
                                        rows={3}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Carousel Builder */}
                        {formData.templateType === 'carousel' && (
                             <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
                                 <div className="flex gap-4">
                                     <div className="flex-1">
                                         <Label className="mb-1 block">Height</Label>
                                         <Select value={formData.carousel.height} onValueChange={(v: any) => setFormData({...formData, carousel: {...formData.carousel, height: v}})}>
                                             <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                             <SelectContent>
                                                 <SelectItem value="SHORT_HEIGHT">Short Height</SelectItem>
                                                 <SelectItem value="MEDIUM_HEIGHT">Medium Height</SelectItem>
                                             </SelectContent>
                                         </Select>
                                     </div>
                                     <div className="flex-1">
                                         <Label className="mb-1 block">Width</Label>
                                         <Select value={formData.carousel.width} onValueChange={(v: any) => setFormData({...formData, carousel: {...formData.carousel, width: v}})}>
                                             <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                             <SelectContent>
                                                 <SelectItem value="SHORT_WIDTH">Short Width</SelectItem>
                                                 <SelectItem value="MEDIUM_WIDTH">Medium Width</SelectItem>
                                             </SelectContent>
                                         </Select>
                                     </div>
                                 </div>

                                 <div className="space-y-4 mt-4">
                                     {formData.carousel.cards.map((card, idx) => (
                                         <Card key={idx} className="relative bg-white">
                                             <Button variant="ghost" size="icon" className="absolute top-2 right-2 text-red-500 h-6 w-6" onClick={() => removeCarouselCard(idx)}>
                                                 <XCircle className="h-4 w-4" />
                                             </Button>
                                             <CardHeader className="p-4 pb-2">
                                                 <CardTitle className="text-sm font-medium">Card {idx + 1}</CardTitle>
                                             </CardHeader>
                                             <CardContent className="p-4 pt-0 space-y-3">
                                                 <Input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'carousel', idx)} />
                                                 <Input placeholder="Card Title" value={card.title} onChange={(e) => {
                                                     const newCards = [...formData.carousel.cards];
                                                     newCards[idx].title = e.target.value;
                                                     setFormData({...formData, carousel: {...formData.carousel, cards: newCards}});
                                                 }} />
                                                 <Textarea placeholder="Card Description" rows={2} value={card.description} onChange={(e) => {
                                                     const newCards = [...formData.carousel.cards];
                                                     newCards[idx].description = e.target.value;
                                                     setFormData({...formData, carousel: {...formData.carousel, cards: newCards}});
                                                 }} />
                                             </CardContent>
                                         </Card>
                                     ))}
                                     
                                     {formData.carousel.cards.length < 10 && (
                                         <Button variant="outline" className="w-full border-dashed bg-white" onClick={addCarouselCard}>
                                             <Plus className="h-4 w-4 mr-2" /> Add Carousel Card
                                         </Button>
                                     )}
                                 </div>
                             </div>
                        )}
                    </div>
                </div>

                {/* Preview Section */}
                <div className="w-1/3 bg-gray-100 p-6 border-l flex flex-col items-center justify-center">
                    <h3 className="text-sm font-semibold text-gray-500 mb-4 uppercase tracking-wider">Live Preview</h3>
                    {renderDevicePreview()}
                    <div className="mt-8 w-full px-4">
                        <Button className="w-full gradient-primary" size="lg" onClick={handleCreateTemplate} disabled={isCreating}>
                            {isCreating ? <Loader className="animate-spin mr-2" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                            Create Template
                        </Button>
                        <Button variant="outline" className="w-full mt-2" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                    </div>
                </div>
             </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template Listing (Simplified for brevity, assuming existing grid logic) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant={template.status === 'approved' ? 'default' : 'secondary'}>{template.status}</Badge>
                </div>
                <CardDescription className="text-xs uppercase font-bold tracking-wider text-primary/70">{template.templateType?.replace('_', ' ') || 'TEXT MESSAGE'}</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {template.templateType === 'text_message' ? template.body : (template.metadata?.richCard?.title || template.metadata?.carousel?.cards?.[0]?.title || 'Rich Message Content')}
                </p>
                <div className="flex justify-between items-center text-xs text-gray-400 border-t pt-3">
                    <span>{template.category}</span>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                </div>
            </CardContent>
          </Card>
        ))}
        {templates.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-10 text-gray-400">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No templates found. Create your first one!</p>
            </div>
        )}
      </div>
    </div>
  );
}
