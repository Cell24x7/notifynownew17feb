import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
    Plus, Trash2, Image as ImageIcon,
    Video, FileText, Smartphone,
    Type, Globe, Tag, Info,
    MessageSquare, MousePointer2, Phone, ExternalLink,
    Layout, CreditCard, ShoppingBag, List, MapPin, Upload, Loader2, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { whatsappService } from '@/services/whatsappService';
import { useToast } from '@/hooks/use-toast';

interface WhatsAppTemplateFormProps {
    data: any;
    onChange: (data: any) => void;
}

export const WhatsAppTemplateForm: React.FC<WhatsAppTemplateFormProps> = ({ data, onChange }) => {
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState<string | null>(null);
    const [activeCard, setActiveCard] = useState(0);

    // Initialize components if they don't exist
    useEffect(() => {
        if (!data.components) {
            onChange({
                ...data,
                components: [
                    { type: 'BODY', text: '' }
                ]
            });
        }
    }, []);

    const updateComponent = (type: string, updates: any) => {
        const newComponents = [...(data.components || [])];
        const index = newComponents.findIndex(c => c.type === type);

        if (index > -1) {
            newComponents[index] = { ...newComponents[index], ...updates };
        } else {
            newComponents.push({ type, ...updates });
        }

        onChange({ ...data, components: newComponents });
    };

    const removeComponent = (type: string) => {
        const newComponents = (data.components || []).filter((c: any) => c.type !== type);
        onChange({ ...data, components: newComponents });
    };

    const getComponent = (type: string) => {
        return (data.components || []).find((c: any) => c.type === type);
    };

    const handleHeaderTypeChange = (format: string) => {
        if (format === 'NONE') {
            removeComponent('HEADER');
        } else {
            updateComponent('HEADER', { format, text: format === 'TEXT' ? '' : undefined });
        }
    };

    const addButton = () => {
        const buttonsComp = getComponent('BUTTONS') || { type: 'BUTTONS', buttons: [] };
        const newButtons = [...(buttonsComp.buttons || []), { type: 'QUICK_REPLY', text: '' }];
        updateComponent('BUTTONS', { buttons: newButtons });
    };

    const updateButton = (idx: number, updates: any) => {
        const buttonsComp = getComponent('BUTTONS');
        if (!buttonsComp) return;
        const newButtons = [...buttonsComp.buttons];
        newButtons[idx] = { ...newButtons[idx], ...updates };
        updateComponent('BUTTONS', { buttons: newButtons });
    };

    const removeButton = (idx: number) => {
        const buttonsComp = getComponent('BUTTONS');
        if (!buttonsComp) return;
        const newButtons = buttonsComp.buttons.filter((_: any, i: number) => i !== idx);
        if (newButtons.length === 0) {
            removeComponent('BUTTONS');
        } else {
            updateComponent('BUTTONS', { buttons: newButtons });
        }
    };

    const header = getComponent('HEADER');
    const body = getComponent('BODY');
    const footer = getComponent('FOOTER');
    const buttonsComp = getComponent('BUTTONS');
    const carousel = getComponent('CAROUSEL');

    const handleFileUpload = async (indexOrType: string | number, file: File) => {
        setIsUploading(String(indexOrType));
        try {
            const headerHandle = await whatsappService.uploadHeaderHandle(file);
            const previewUrl = URL.createObjectURL(file);

            if (typeof indexOrType === 'string') {
                // Main template header
                updateComponent('HEADER', { example: { header_handle: [headerHandle] }, previewUrl });
            } else {
                // Carousel card header
                const newCards = [...(carousel?.cards || [])];
                const cardComp = [...(newCards[indexOrType as number].components || [])];
                const hIdx = cardComp.findIndex((c: any) => c.type === 'HEADER');
                if (hIdx > -1) {
                    cardComp[hIdx] = { ...cardComp[hIdx], example: { header_handle: [headerHandle] }, previewUrl };
                } else {
                    cardComp.push({ type: 'HEADER', format: 'IMAGE', example: { header_handle: [headerHandle] }, previewUrl });
                }
                newCards[indexOrType as number] = { ...newCards[indexOrType as number], components: cardComp };
                updateComponent('CAROUSEL', { cards: newCards });
            }

            toast({ title: '✅ Upload successful', description: `Handle: ${headerHandle.substring(0, 20)}...` });
        } catch (err: any) {
            console.error('File upload failed:', err);
            toast({ title: '❌ Upload failed', description: err.message, variant: 'destructive' });
        } finally {
            setIsUploading(null);
        }
    };

    const addCarouselCard = () => {
        const currentCards = carousel?.cards || [];
        if (currentCards.length >= 10) return;
        const newCards = [...currentCards, {
            components: [
                { type: 'HEADER', format: 'IMAGE', example: { header_handle: [] } },
                { type: 'BODY', text: '' },
                { type: 'BUTTONS', buttons: [{ type: 'QUICK_REPLY', text: 'Button 1' }] }
            ]
        }];
        updateComponent('CAROUSEL', { cards: newCards });
        setActiveCard(newCards.length - 1);
    };

    const removeCarouselCard = (idx: number) => {
        const newCards = carousel.cards.filter((_: any, i: number) => i !== idx);
        if (newCards.length === 0) {
            removeComponent('CAROUSEL');
        } else {
            updateComponent('CAROUSEL', { cards: newCards });
            if (activeCard >= newCards.length) setActiveCard(newCards.length - 1);
        }
    };

    const updateCardComponent = (cardIdx: number, type: string, updates: any) => {
        const newCards = [...carousel.cards];
        const cardComponents = [...(newCards[cardIdx].components || [])];
        const idx = cardComponents.findIndex((c: any) => c.type === type);
        if (idx > -1) {
            cardComponents[idx] = { ...cardComponents[idx], ...updates };
        } else {
            cardComponents.push({ type, ...updates });
        }
        newCards[cardIdx] = { ...newCards[cardIdx], components: cardComponents };
        updateComponent('CAROUSEL', { cards: newCards });
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Basic Info */}
            <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-green-50 rounded-lg">
                        <Info className="h-5 w-5 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Template Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <Type className="h-4 w-4 text-gray-400" /> Template Name
                        </Label>
                        <Input
                            placeholder="e.g. order_confirmation"
                            value={data.name || ''}
                            onChange={(e) => onChange({ ...data, name: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                            className="bg-gray-50 border-none h-11 focus:ring-green-500 rounded-xl"
                        />
                        <p className="text-[10px] text-muted-foreground ml-1 italic">Only lowercase letters and underscores.</p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                            <Tag className="h-4 w-4 text-gray-400" /> Category
                        </Label>
                        <Select value={data.category || 'UTILITY'} onValueChange={(v) => onChange({ ...data, category: v })}>
                            <SelectTrigger className="bg-gray-50 border-none h-11 focus:ring-green-500 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="UTILITY">Utility</SelectItem>
                                <SelectItem value="MARKETING">Marketing</SelectItem>
                                <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                        <Globe className="h-4 w-4 text-gray-400" /> Language
                    </Label>
                    <Select value={data.language || 'en_US'} onValueChange={(v) => onChange({ ...data, language: v })}>
                        <SelectTrigger className="bg-gray-50 border-none h-11 focus:ring-green-500 rounded-xl">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en_US">English (US)</SelectItem>
                            <SelectItem value="hi">Hindi</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Header Section */}
            <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <ImageIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Header <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span></h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                        { id: 'NONE', label: 'None', icon: <Plus className="h-4 w-4 rotate-45" /> },
                        { id: 'TEXT', label: 'Text', icon: <Type className="h-4 w-4" /> },
                        { id: 'IMAGE', label: 'Image', icon: <ImageIcon className="h-4 w-4" /> },
                        { id: 'VIDEO', label: 'Video', icon: <Video className="h-4 w-4" /> },
                        { id: 'DOCUMENT', label: 'Document', icon: <FileText className="h-4 w-4" /> },
                        { id: 'LOCATION', label: 'Location', icon: <MapPin className="h-4 w-4" /> }
                    ].map((format) => (
                        <div
                            key={format.id}
                            onClick={() => handleHeaderTypeChange(format.id)}
                            className={cn(
                                "flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all cursor-pointer text-center gap-1",
                                (header?.format === format.id || (!header && format.id === 'NONE'))
                                    ? "border-blue-600 bg-blue-50/50"
                                    : "border-gray-50 bg-gray-50/30 hover:bg-gray-50 hover:border-gray-100"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                (header?.format === format.id || (!header && format.id === 'NONE')) ? "bg-blue-600 text-white" : "bg-white text-gray-400"
                            )}>
                                {format.icon}
                            </div>
                            <span className="text-[10px] font-bold">{format.label}</span>
                        </div>
                    ))}
                </div>

                {header?.format === 'TEXT' && (
                    <div className="space-y-2 pt-2 animate-in fade-in duration-300">
                        <Input
                            placeholder="Enter header text... (Max 60 chars)"
                            maxLength={60}
                            value={header.text || ''}
                            onChange={(e) => updateComponent('HEADER', { text: e.target.value })}
                            className="bg-gray-50 border-none h-11 focus:ring-blue-500 rounded-xl"
                        />
                    </div>
                )}

                {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(header?.format) && (
                    <div className="space-y-4 pt-2 animate-in fade-in duration-300">
                        <div className="p-4 bg-green-50/30 rounded-xl border border-dashed border-green-200">
                            <Label className="text-[11px] font-bold text-green-700 uppercase flex items-center gap-1.5 mb-2">
                                <Plus className="h-3 w-3" /> Media Handle or URL
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder={header.format === 'IMAGE' ? "https://example.com/image.jpg" : header.format === 'VIDEO' ? "https://example.com/video.mp4" : "https://example.com/doc.pdf"}
                                    value={header.example?.header_handle?.[0] || ''}
                                    readOnly={true}
                                    className="bg-white border-green-100 h-10 text-xs rounded-lg flex-1 text-gray-500"
                                    title="Pinbot generates this handle automatically when you upload."
                                />
                                <Label className="cursor-pointer">
                                    <div className={cn(
                                        "h-10 px-3 bg-green-600 text-white rounded-lg flex items-center gap-1 text-[10px] font-bold hover:bg-green-700 transition-colors",
                                        isUploading === 'header' && "opacity-50 pointer-events-none"
                                    )}>
                                        {isUploading === 'header' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />} 
                                        {isUploading === 'header' ? '...' : 'Upload'}
                                    </div>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept={header.format === 'IMAGE' ? 'image/*' : header.format === 'VIDEO' ? 'video/*' : '*'} 
                                        onChange={(e) => e.target.files?.[0] && handleFileUpload('header', e.target.files[0])}
                                    />
                                </Label>
                            </div>
                            <p className="text-[9px] text-green-600/70 mt-2 italic">
                                For Pinbot, please upload a file to get a valid header handle.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Body Section */}
            <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-purple-50 rounded-lg">
                            <MessageSquare className="h-5 w-5 text-purple-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Message Body *</h3>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] font-bold rounded-lg" onClick={() => updateComponent('BODY', { text: (body?.text || '') + '{{1}}' })}>
                        + Add Variable
                    </Button>
                </div>

                <Textarea
                    placeholder="Type your message here... Use {{1}}, {{2}} for variables."
                    rows={6}
                    value={body?.text || ''}
                    onChange={(e) => updateComponent('BODY', { text: e.target.value })}
                    className="bg-gray-50 border-none focus:ring-purple-500 rounded-2xl resize-none text-sm leading-relaxed"
                />
                <div className="flex justify-between items-center px-1">
                    <p className="text-[10px] text-muted-foreground px-1 italic">Markdown like *bold*, _italic_, ~strikethrough~ and ```code``` are supported.</p>
                    <span className={cn("text-[10px] font-bold", (body?.text?.length || 0) > 1024 ? "text-red-500" : "text-muted-foreground")}>
                        {body?.text?.length || 0}/1024
                    </span>
                </div>
            </div>

            {/* Carousel Section */}
            <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-pink-50 rounded-lg">
                            <Layout className="h-5 w-5 text-pink-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Carousel Cards <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span></h3>
                    </div>
                    {!carousel && (
                        <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold border-pink-200 text-pink-600 hover:bg-pink-50" onClick={addCarouselCard}>
                            <Plus className="h-3 w-3 mr-1" /> Enable Carousel
                        </Button>
                    )}
                </div>

                {carousel && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-4 overflow-x-auto no-scrollbar">
                            {carousel.cards.map((_: any, idx: number) => (
                                <Button
                                    key={idx}
                                    variant="ghost"
                                    onClick={() => setActiveCard(idx)}
                                    className={cn(
                                        "h-9 px-4 rounded-xl text-xs font-bold shrink-0",
                                        activeCard === idx ? "bg-pink-600 text-white hover:bg-pink-700 hover:text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    )}
                                >
                                    Card {idx + 1}
                                </Button>
                            ))}
                            {carousel.cards.length < 10 && (
                                <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100" onClick={addCarouselCard}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        {carousel.cards[activeCard] && (
                            <div className="space-y-4 bg-gray-50/30 p-4 rounded-2xl border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-bold text-gray-700">Editing Card {activeCard + 1}</h4>
                                    <Button variant="ghost" size="sm" className="h-7 text-red-500 hover:bg-red-50 text-[10px] font-bold" onClick={() => removeCarouselCard(activeCard)}>
                                        <Trash2 className="h-3 w-3 mr-1" /> Delete Card
                                    </Button>
                                </div>

                                {/* Card Header */}
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-gray-500 uppercase">Card Image Handle</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Example: 4::aW1h..."
                                            value={carousel.cards[activeCard].components.find((c: any) => c.type === 'HEADER')?.example?.header_handle?.[0] || ''}
                                            onChange={(e) => updateCardComponent(activeCard, 'HEADER', { example: { header_handle: [e.target.value] } })}
                                            className="bg-white border-gray-100 h-9 text-[10px] rounded-lg"
                                        />
                                        <Label className="cursor-pointer">
                                            <div className={cn(
                                                "h-9 px-3 bg-pink-600 text-white rounded-lg flex items-center gap-1 text-[10px] font-bold hover:bg-pink-700 transition-colors",
                                                isUploading === String(activeCard) && "opacity-50 pointer-events-none"
                                            )}>
                                                {isUploading === String(activeCard) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                                            </div>
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*" 
                                                onChange={(e) => e.target.files?.[0] && handleFileUpload(activeCard, e.target.files[0])}
                                            />
                                        </Label>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold text-gray-500 uppercase">Card Body</Label>
                                    <Textarea
                                        placeholder="Enter card description..."
                                        rows={3}
                                        value={carousel.cards[activeCard].components.find((c: any) => c.type === 'BODY')?.text || ''}
                                        onChange={(e) => updateCardComponent(activeCard, 'BODY', { text: e.target.value })}
                                        className="bg-white border-gray-100 focus:ring-pink-500 rounded-xl text-xs"
                                    />
                                </div>

                                {/* Card Buttons (Simple implementation for card level) */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label className="text-[11px] font-bold text-gray-500 uppercase">Card Buttons</Label>
                                    </div>
                                    {(carousel.cards[activeCard].components.find((c: any) => c.type === 'BUTTONS')?.buttons || []).map((btn: any, bidx: number) => (
                                        <div key={bidx} className="flex gap-2 mb-2">
                                            <Input
                                                placeholder="Button Text"
                                                value={btn.text}
                                                onChange={(e) => {
                                                    const cardComp = carousel.cards[activeCard].components;
                                                    const bIdx = cardComp.findIndex((c: any) => c.type === 'BUTTONS');
                                                    const btns = [...cardComp[bIdx].buttons];
                                                    btns[bidx] = { ...btns[bidx], text: e.target.value };
                                                    updateCardComponent(activeCard, 'BUTTONS', { buttons: btns });
                                                }}
                                                className="bg-white h-8 text-[10px] rounded-lg flex-1"
                                            />
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => {
                                                const cardComp = carousel.cards[activeCard].components;
                                                const bIdx = cardComp.findIndex((c: any) => c.type === 'BUTTONS');
                                                const btns = cardComp[bIdx].buttons.filter((_: any, i: number) => i !== bidx);
                                                updateCardComponent(activeCard, 'BUTTONS', { buttons: btns });
                                            }}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(carousel.cards[activeCard].components.find((c: any) => c.type === 'BUTTONS')?.buttons || []).length < 2 && (
                                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-dashed" onClick={() => {
                                            const bIdx = carousel.cards[activeCard].components.findIndex((c: any) => c.type === 'BUTTONS');
                                            const btns = bIdx > -1 ? [...carousel.cards[activeCard].components[bIdx].buttons, { type: 'QUICK_REPLY', text: 'New Button' }] : [{ type: 'QUICK_REPLY', text: 'New Button' }];
                                            updateCardComponent(activeCard, 'BUTTONS', { buttons: btns });
                                        }}>
                                            + Add Button
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer Section */}
            <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                        <Plus className="h-5 w-5 text-gray-600 rotate-45" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">Footer <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span></h3>
                </div>

                <Input
                    placeholder="Enter footer text... (Max 60 chars)"
                    maxLength={60}
                    value={footer?.text || ''}
                    onChange={(e) => {
                        if (e.target.value) {
                            updateComponent('FOOTER', { text: e.target.value });
                        } else {
                            removeComponent('FOOTER');
                        }
                    }}
                    className="bg-gray-50 border-none h-11 focus:ring-gray-500 rounded-xl"
                />
            </div>

            {/* Buttons Section */}
            <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <MousePointer2 className="h-5 w-5 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">Interactive Buttons <span className="text-[10px] font-normal text-muted-foreground">(Optional)</span></h3>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 text-amber-600 font-bold hover:bg-amber-50 rounded-lg px-2" onClick={addButton}>
                        <Plus className="h-4 w-4 mr-1" /> Add Button
                    </Button>
                </div>

                <div className="space-y-4">
                    {(buttonsComp?.buttons || []).map((btn: any, idx: number) => (
                        <Card key={idx} className="border-gray-100 bg-gray-50/30 rounded-2xl shadow-none overflow-hidden animate-in slide-in-from-left duration-300">
                            <div className="p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3 flex-1">
                                        <Select value={btn.type} onValueChange={(v) => updateButton(idx, { type: v, text: btn.text, url: v === 'URL' ? '' : undefined, phone_number: v === 'PHONE_NUMBER' ? '' : undefined })}>
                                            <SelectTrigger className="w-[180px] h-9 bg-white border-gray-200 rounded-lg text-xs font-bold">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                                                <SelectItem value="URL">Visit Website</SelectItem>
                                                <SelectItem value="PHONE_NUMBER">Call Phone</SelectItem>
                                                <SelectItem value="COPY_CODE">Copy Code</SelectItem>
                                                <SelectItem value="CATALOG">View Catalog</SelectItem>
                                                <SelectItem value="MPM">Multi-Product Message</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-full" onClick={() => removeButton(idx)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-bold text-gray-500 uppercase px-1">Button Label</Label>
                                        <Input
                                            placeholder="e.g. Subscribe Now"
                                            maxLength={25}
                                            value={btn.text || ''}
                                            onChange={(e) => updateButton(idx, { text: e.target.value })}
                                            className="bg-white border-gray-100 h-9 text-xs rounded-lg"
                                        />
                                    </div>

                                    {btn.type === 'URL' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-gray-500 uppercase px-1 underline decoration-blue-500 flex items-center gap-1">
                                                URL <ExternalLink className="h-2.5 w-2.5" />
                                            </Label>
                                            <Input
                                                placeholder="https://yoursite.com"
                                                value={btn.url || ''}
                                                onChange={(e) => updateButton(idx, { url: e.target.value })}
                                                className="bg-white border-gray-100 h-9 text-xs rounded-lg"
                                            />
                                        </div>
                                    )}

                                    {btn.type === 'PHONE_NUMBER' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-gray-500 uppercase px-1 underline decoration-green-500 flex items-center gap-1">
                                                Phone <Phone className="h-2.5 w-2.5" />
                                            </Label>
                                            <Input
                                                placeholder="+919876543210"
                                                value={btn.phone_number || ''}
                                                onChange={(e) => updateButton(idx, { phone_number: e.target.value })}
                                                className="bg-white border-gray-100 h-9 text-xs rounded-lg"
                                            />
                                        </div>
                                    )}

                                    {btn.type === 'COPY_CODE' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-gray-500 uppercase px-1 underline decoration-purple-500 flex items-center gap-1">
                                                Coupon Code <CreditCard className="h-2.5 w-2.5" />
                                            </Label>
                                            <Input
                                                placeholder="e.g. SAVE50"
                                                value={btn.example || ''}
                                                onChange={(e) => updateButton(idx, { example: e.target.value })}
                                                className="bg-white border-gray-100 h-9 text-xs rounded-lg"
                                            />
                                        </div>
                                    )}

                                    {btn.type === 'CATALOG' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-gray-500 uppercase px-1 underline decoration-orange-500 flex items-center gap-1">
                                                Thumbnail Product ID <ShoppingBag className="h-2.5 w-2.5" />
                                            </Label>
                                            <Input
                                                placeholder="Retailer ID (e.g. 2)"
                                                value={btn.action?.thumbnail_product_retailer_id || ''}
                                                onChange={(e) => updateButton(idx, { action: { ...btn.action, thumbnail_product_retailer_id: e.target.value } })}
                                                className="bg-white border-gray-100 h-9 text-xs rounded-lg"
                                            />
                                        </div>
                                    )}

                                    {btn.type === 'MPM' && (
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-bold text-gray-500 uppercase px-1 underline decoration-blue-500 flex items-center gap-1">
                                                Thumbnail Product ID <List className="h-2.5 w-2.5" />
                                            </Label>
                                            <Input
                                                placeholder="Retailer ID (e.g. 2)"
                                                value={btn.action?.thumbnail_product_retailer_id || ''}
                                                onChange={(e) => updateButton(idx, { action: { ...btn.action, thumbnail_product_retailer_id: e.target.value } })}
                                                className="bg-white border-gray-100 h-9 text-xs rounded-lg"
                                            />
                                            <p className="text-[9px] text-muted-foreground italic px-1">Note: MPM requires catalog sections configuration.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}

                    {(!buttonsComp?.buttons || buttonsComp.buttons.length === 0) && (
                        <div className="p-8 border-2 border-dashed border-gray-100 rounded-2xl text-center bg-gray-50/20">
                            <MousePointer2 className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                            <p className="text-xs text-muted-foreground font-medium">Add interactive buttons for higher conversion.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
