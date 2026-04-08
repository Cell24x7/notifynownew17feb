import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Image as ImageIcon, Link as LinkIcon, Phone, MapPin, Calendar, Smartphone, Zap } from 'lucide-react';

interface RCSTemplateFormProps {
    data: any;
    onChange: (data: any) => void;
    onFileChange?: (file: File | null) => void;
    onCarouselFileChange?: (index: number, file: File | null) => void;
}

export const RCSTemplateForm: React.FC<RCSTemplateFormProps> = ({ data, onChange, onFileChange, onCarouselFileChange }) => {
    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    const handleMetadataChange = (field: string, value: any) => {
        onChange({ ...data, metadata: { ...data.metadata, [field]: value } });
    };

    const insertParam = (field: 'body' | 'cardTitle' | 'description', idx?: number) => {
        if (field === 'body') {
            handleChange('body', (data.body || '') + '[custom_param]');
        } else if (field === 'cardTitle') {
            handleMetadataChange('cardTitle', (data.metadata?.cardTitle || '') + '[custom_param]');
        } else if (field === 'description' && idx !== undefined) {
            const newList = [...(data.metadata?.carouselList || [])];
            newList[idx] = { ...newList[idx], description: (newList[idx].description || '') + '[custom_param]' };
            handleMetadataChange('carouselList', newList);
        }
    };

    const addButton = (target?: 'global' | number) => {
        const newBtn = { 
            type: 'reply', 
            displayText: '', 
            postback: '', 
            uri: '' 
        };

        if (target === 'global' || target === undefined) {
            const newButtons = [...(data.buttons || []), newBtn];
            handleChange('buttons', newButtons);
        } else {
            const newList = [...(data.metadata?.carouselList || [])];
            newList[target] = { 
                ...newList[target], 
                buttons: [...(newList[target].buttons || []), newBtn] 
            };
            handleMetadataChange('carouselList', newList);
        }
    };

    const updateButton = (btnIdx: number, field: string, value: any, cardIdx?: number) => {
        if (cardIdx === undefined) {
            const newButtons = [...(data.buttons || [])];
            newButtons[btnIdx] = { ...newButtons[btnIdx], [field]: value };
            handleChange('buttons', newButtons);
        } else {
            const newList = [...(data.metadata?.carouselList || [])];
            const newCardButtons = [...(newList[cardIdx].buttons || [])];
            newCardButtons[btnIdx] = { ...newCardButtons[btnIdx], [field]: value };
            newList[cardIdx] = { ...newList[cardIdx], buttons: newCardButtons };
            handleMetadataChange('carouselList', newList);
        }
    };

    const removeButton = (btnIdx: number, cardIdx?: number) => {
        if (cardIdx === undefined) {
            const newButtons = [...(data.buttons || [])];
            newButtons.splice(btnIdx, 1);
            handleChange('buttons', newButtons);
        } else {
            const newList = [...(data.metadata?.carouselList || [])];
            const newCardButtons = [...(newList[cardIdx].buttons || [])];
            newCardButtons.splice(btnIdx, 1);
            newList[cardIdx] = { ...newList[cardIdx], buttons: newCardButtons };
            handleMetadataChange('carouselList', newList);
        }
    };

    // Helper for Carousel Cards
    const addCarouselCard = () => {
        const newList = [...(data.metadata?.carouselList || []), {
            title: '',
            description: '',
            mediaUrl: '',
            buttons: []
        }];
        handleMetadataChange('carouselList', newList);
    };

    const updateCarouselCard = (index: number, field: string, value: any) => {
        const newList = [...(data.metadata?.carouselList || [])];
        newList[index] = { ...newList[index], [field]: value };
        handleMetadataChange('carouselList', newList);
    };

    const removeCarouselCard = (index: number) => {
        const newList = [...(data.metadata?.carouselList || [])];
        newList.splice(index, 1);
        handleMetadataChange('carouselList', newList);
    };
    const getOptimalDimensions = (isCarousel: boolean, cardIdx?: number) => {
        if (!isCarousel) {
            const orientation = data.metadata?.orientation || 'VERTICAL';
            const height = data.metadata?.height || 'SHORT_HEIGHT';
            
            if (orientation === 'HORIZONTAL') return { width: 768, height: 1024, ratio: '3:4', label: 'Horizontal (3:4)', maxSize: 2 };
            if (height === 'MEDIUM_HEIGHT') return { width: 1440, height: 720, ratio: '2:1', label: 'Vertical Medium (2:1)', maxSize: 2 };
            return { width: 1440, height: 480, ratio: '3:1', label: 'Vertical Short (3:1)', maxSize: 2 };
        } else {
            const height = data.metadata?.height || 'SHORT_HEIGHT';
            const width = data.metadata?.width || 'MEDIUM_WIDTH';
            
            if (height === 'SHORT_HEIGHT' && width === 'SMALL_WIDTH') return { width: 960, height: 720, ratio: '5:4', label: 'Short + Small (5:4)', maxSize: 1 };
            if (height === 'SHORT_HEIGHT' && width === 'MEDIUM_WIDTH') return { width: 1440, height: 720, ratio: '2:1', label: 'Short + Medium (2:1)', maxSize: 1 };
            if (height === 'MEDIUM_HEIGHT' && width === 'SMALL_WIDTH') return { width: 576, height: 720, ratio: '4:5', label: 'Medium + Small (4:5)', maxSize: 1 };
            return { width: 1440, height: 1080, ratio: '4:3', label: 'Medium + Medium (4:3)', maxSize: 1 };
        }
    };

    const validateImage = (file: File, isCarousel: boolean, isThumbnail: boolean = false): Promise<boolean> => {
        return new Promise((resolve) => {
            const specs = getOptimalDimensions(isCarousel);
            const isVideo = file.type.startsWith('video/');
            const videoMaxSize = isCarousel ? 5 : 10;

            if (isThumbnail) {
                const minThumbSize = 40 * 1024; // 40KB
                const maxThumbSize = 100 * 1024; // 100KB
                if (file.size < minThumbSize || file.size > maxThumbSize) {
                    alert(`Invalid Thumbnail Size. Thumbnails must be between 40KB and 100KB. Your file: ${(file.size / 1024).toFixed(1)}KB`);
                    resolve(false);
                    return;
                }
                if (isVideo) {
                    alert("Thumbnails must be images (JPEG, PNG).");
                    resolve(false);
                    return;
                }
            } else {
                const maxByteSize = specs.maxSize * 1024 * 1024;
                if (isVideo) {
                    if (file.size > videoMaxSize * 1024 * 1024) {
                        alert(`Video Too Large. Max size for ${isCarousel ? 'Carousel' : 'Standalone'} is ${videoMaxSize}MB.`);
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    return;
                }

                if (file.size > maxByteSize) {
                    alert(`File Too Large. Max size for ${specs.label} is ${specs.maxSize}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
                    resolve(false);
                    return;
                }
            }

            const img = new Image();
            img.src = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(img.src);
                if (img.width !== specs.width || img.height !== specs.height) {
                    alert(`Invalid Dimensions. For ${isThumbnail ? 'Thumbnail' : specs.label}, image must be exactly ${specs.width}x${specs.height} px.\nDetected: ${img.width}x${img.height} px`);
                    resolve(false);
                } else {
                    resolve(true);
                }
            };
            img.onerror = () => {
                alert("Invalid image file.");
                resolve(false);
            };
        });
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, isCarousel: boolean = false, index?: number) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // index -2 means standalone thumbnail, index < -2 could mean carousel thumbnail
        const isThumbnail = index === -2 || (isCarousel && index !== undefined && index < 0);
        const isValid = await validateImage(file, isCarousel, isThumbnail);
        
        if (!isValid) {
            e.target.value = ''; // Reset input
            return;
        }

        if (isCarousel && typeof index === 'number') {
            if (index < 0) {
                // Handle carousel thumbnail - adding a prefix or similar
                // For now, let's just use a special index mapping or a separate prop
                // But the parent only has onCarouselFileChange(index, file)
                // We might need to adjust how carousel thumbnails are stored
                onCarouselFileChange?.(index, file); 
            } else {
                onCarouselFileChange?.(index, file);
            }
        } else {
            onFileChange?.(file);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-700 ml-1">Template Name <span className="text-red-500">*</span></Label>
                <div className="relative">
                    <Input 
                        placeholder="e.g. promo_offer_01" 
                        value={data.name || ''}
                        maxLength={20}
                        onChange={(e) => {
                             const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_');
                             handleChange('name', val.substring(0, 20)); // Ensure strictly max 20 chars
                        }}
                        className="bg-white border-gray-100 focus:ring-primary h-11 px-4 rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1 leading-tight">Must contain at least one alphabet, max length 20, lowercase alphanumeric & underscores only.</p>
                </div>
            </div>

            {/* Template Type Selector */}
            <div className="space-y-3">
                <Label className="text-sm font-bold text-gray-700 ml-1">RCS Template Type</Label>
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { id: 'text_message', label: 'Plain Text', icon: <Smartphone className="h-4 w-4" />, desc: 'Simple text' },
                        { id: 'rich_card', label: 'Rich Card', icon: <ImageIcon className="h-4 w-4" />, desc: 'Image + Text' },
                        { id: 'carousel', label: 'Carousel', icon: <Plus className="h-4 w-4" />, desc: 'Multiple cards' }
                    ].map((type) => (
                        <div 
                            key={type.id}
                            className={cn(
                                "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all cursor-pointer text-center gap-1.5",
                                data.template_type === type.id 
                                    ? "border-primary bg-primary/5 shadow-sm" 
                                    : "border-gray-100 bg-white hover:border-gray-200"
                            )}
                            onClick={() => handleChange('template_type', type.id)}
                        >
                            <div className={cn(
                                "w-9 h-9 rounded-full flex items-center justify-center shadow-sm",
                                data.template_type === type.id ? "bg-primary text-white" : "bg-gray-50 text-gray-500"
                            )}>
                                {type.icon}
                            </div>
                            <div className="font-bold text-xs">{type.label}</div>
                            <div className="text-[10px] text-muted-foreground leading-tight">{type.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Common Fields */}
            {data.template_type !== 'carousel' && (
                <div className="space-y-4">
                    {data.template_type === 'rich_card' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-top-1 duration-300">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-gray-500 ml-1 uppercase tracking-tight">Orientation</Label>
                                    <Select 
                                        value={data.metadata?.orientation || 'VERTICAL'} 
                                        onValueChange={(v) => handleMetadataChange('orientation', v)}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-white border-gray-100 shadow-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="VERTICAL">Vertical</SelectItem>
                                            <SelectItem value="HORIZONTAL">Horizontal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-gray-500 ml-1 uppercase tracking-tight">Alignment</Label>
                                    <Select 
                                        value={data.metadata?.alignment || 'LEFT'} 
                                        onValueChange={(v) => handleMetadataChange('alignment', v)}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-white border-gray-100 shadow-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="LEFT">Left</SelectItem>
                                            <SelectItem value="RIGHT">Right</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-bold text-gray-500 ml-1 uppercase tracking-tight">Height</Label>
                                    <Select 
                                        value={data.metadata?.height || 'SHORT_HEIGHT'} 
                                        onValueChange={(v) => handleMetadataChange('height', v)}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-white border-gray-100 shadow-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="SHORT_HEIGHT">Short</SelectItem>
                                            <SelectItem value="MEDIUM_HEIGHT">Medium</SelectItem>
                                            <SelectItem value="TALL_HEIGHT">Tall</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="space-y-3 bg-gray-50/50 p-4 rounded-2xl border border-dashed border-gray-200">
                                <div className="space-y-1.5">
                                    <div className="flex flex-col gap-2">
                                        <div className="relative flex-1">
                                            <Input 
                                                placeholder="https://example.com/image.jpg" 
                                                value={data.metadata?.mediaUrl || ''}
                                                onChange={(e) => handleMetadataChange('mediaUrl', e.target.value)}
                                                className="bg-white border-gray-100 focus:ring-primary h-11 px-4 rounded-xl pr-10"
                                            />
                                            <ImageIcon className="absolute right-3 top-3.5 h-4 w-4 text-gray-400" />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="file" 
                                                accept="image/*,video/*" 
                                                onChange={(e) => handleFileSelect(e)}
                                                className="h-9 text-xs flex-1 bg-white"
                                            />
                                            {data.metadata?.isUpload && <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Selected</Badge>}
                                        </div>
                                    </div>
                                    {(() => {
                                        const specs = getOptimalDimensions(false);
                                        return (
                                            <div className="flex flex-col gap-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50">
                                                <div className="flex items-center gap-2">
                                                    <Zap className="h-3 w-3 text-blue-600" />
                                                    <p className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">Optimal Requirements</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                    <p className="text-[10px] text-slate-600">Resolution: <span className="font-bold text-slate-900">{specs.width}x{specs.height} px</span></p>
                                                    <p className="text-[10px] text-slate-600">Aspect Ratio: <span className="font-bold text-slate-900">{specs.ratio}</span></p>
                                                    <p className="text-[10px] text-slate-600">Max Image: <span className="font-bold text-slate-900">{specs.maxSize} MB</span></p>
                                                    <p className="text-[10px] text-slate-600">Max Video: <span className="font-bold text-slate-900">10 MB</span></p>
                                                </div>
                                                <div className="pt-2 mt-1 border-t border-blue-100/50">
                                                    <p className="text-[10px] text-blue-800 font-bold">Thumbnail (Required for Video):</p>
                                                    <p className="text-[9px] text-slate-600">Ratio: <span className="font-bold">{specs.ratio}</span> | Size: 40KB - 100KB</p>
                                                </div>
                                                <div className="pt-1 mt-1 border-t border-blue-100/50">
                                                    <p className="text-[9px] text-blue-600/70 italic">Allowed: JPEG, JPG, PNG, GIF</p>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>

                                <div className="space-y-1.5 p-3 bg-indigo-50/20 rounded-xl border border-indigo-100/30">
                                    <Label className="text-[11px] font-bold text-indigo-700 flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" /> Optional Thumbnail (for Video)
                                    </Label>
                                    <Input 
                                        type="file" 
                                        accept="image/jpeg,image/png" 
                                        onChange={(e) => handleFileSelect(e, false, -2)} // -2 for thumbnail
                                        className="h-9 text-[10px] bg-white"
                                    />
                                    <p className="text-[8px] text-muted-foreground italic">Use for videos only. Recommended size 40KB-100KB.</p>
                                </div>
                                
                                <div className="space-y-1.5">
                                    <div className="flex justify-between items-center">
                                        <Label className="text-[11px] font-bold text-gray-700 ml-1">Card Title</Label>
                                        <Button variant="link" size="sm" className="h-5 text-[10px] px-0 text-primary" onClick={() => insertParam('cardTitle')}>
                                            + Dynamic Param
                                        </Button>
                                    </div>
                                    <Input 
                                        placeholder="Headline for your card..."
                                        value={data.metadata?.cardTitle || ''}
                                        onChange={(e) => handleMetadataChange('cardTitle', e.target.value)}
                                        className="bg-white border-gray-100 focus:ring-primary h-11 px-4 rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label>{data.template_type === 'rich_card' ? 'Card Description' : 'Message Body'}</Label>
                            <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => insertParam('body')}>
                                + Param
                            </Button>
                        </div>
                        <Textarea 
                            rows={4}
                            value={data.body || ''} 
                            onChange={(e) => handleChange('body', e.target.value)}
                            placeholder="Enter your message text..."
                        />
                    </div>
                </div>
            )}

            {/* Carousel Specifics */}
            {data.template_type === 'carousel' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-400">
                     <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-gray-500 ml-1 uppercase">Card Height</Label>
                            <Select 
                                value={data.metadata?.height || 'SHORT_HEIGHT'} 
                                onValueChange={(v) => handleMetadataChange('height', v)}
                            >
                                <SelectTrigger className="h-10 rounded-xl bg-white border-gray-100 shadow-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="SHORT_HEIGHT">Short</SelectItem>
                                    <SelectItem value="MEDIUM_HEIGHT">Medium</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[11px] font-bold text-gray-500 ml-1 uppercase">Card Width</Label>
                            <Select 
                                value={data.metadata?.width || 'MEDIUM_WIDTH'} 
                                onValueChange={(v) => handleMetadataChange('width', v)}
                            >
                                <SelectTrigger className="h-10 rounded-xl bg-white border-gray-100 shadow-sm"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="SMALL_WIDTH">Small</SelectItem>
                                    <SelectItem value="MEDIUM_WIDTH">Medium</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <h4 className="text-sm font-bold text-gray-800">Carousel Cards</h4>
                                <p className="text-[10px] text-muted-foreground">Add up to 10 cards to your carousel</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={addCarouselCard} type="button" className="rounded-xl border-primary/20 hover:bg-primary/5 text-primary">
                                <Plus className="h-4 w-4 mr-1.5" /> Add Card
                            </Button>
                        </div>
                        
                        <div className="space-y-4">
                            {(data.metadata?.carouselList || []).map((card: any, idx: number) => (
                                <Card key={idx} className="border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="p-4 bg-gray-50/50 border-b border-gray-100 flex-row items-center justify-between space-y-0">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-primary text-white text-[10px] flex items-center justify-center font-bold">
                                                {idx + 1}
                                            </div>
                                            <CardTitle className="text-xs font-bold text-gray-700 uppercase tracking-wider">Card Metadata</CardTitle>
                                        </div>
                                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/5 rounded-full" onClick={() => removeCarouselCard(idx)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <div className="flex flex-col gap-2">
                                                    <Input 
                                                        placeholder="https://..." 
                                                        value={card.mediaUrl || ''}
                                                        onChange={(e) => updateCarouselCard(idx, 'mediaUrl', e.target.value)}
                                                        className="h-10 rounded-xl border-gray-100 bg-white"
                                                    />
                                                    <Input 
                                                        type="file" 
                                                        accept="image/*,video/*" 
                                                        onChange={(e) => handleFileSelect(e, true, idx)}
                                                        className="h-9 text-xs bg-white"
                                                    />
                                                    {(() => {
                                                        const specs = getOptimalDimensions(true);
                                                        return (
                                                            <div className="mt-2 p-2 bg-indigo-50/30 rounded-lg border border-indigo-100/50 space-y-1">
                                                                <p className="text-[9px] font-bold text-indigo-700 uppercase">Specs: {specs.width}x{specs.height} ({specs.ratio})</p>
                                                                <p className="text-[9px] text-indigo-600">Max: {specs.maxSize}MB Image | 5MB Video</p>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-[11px] font-bold text-gray-600 ml-1">Title</Label>
                                                <Input 
                                                    placeholder="Card title" 
                                                    value={card.title || ''}
                                                    onChange={(e) => updateCarouselCard(idx, 'title', e.target.value)}
                                                    className="h-10 rounded-xl border-gray-100 bg-white"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-[11px] font-bold text-gray-600 ml-1">Description</Label>
                                                <Button variant="link" size="sm" className="h-5 text-[10px] px-0 text-primary" onClick={() => insertParam('description', idx)}>
                                                    + Param
                                                </Button>
                                            </div>
                                            <Textarea 
                                                placeholder="Card description..." 
                                                value={card.description || ''}
                                                onChange={(e) => updateCarouselCard(idx, 'description', e.target.value)}
                                                className="min-h-[80px] rounded-xl border-gray-100 bg-white resize-none text-sm"
                                            />
                                        </div>

                                        {/* Per-card buttons */}
                                        <div className="space-y-3 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                                                    <Zap className="h-3.5 w-3.5" /> Card Actions
                                                </Label>
                                                <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold hover:bg-white rounded-lg text-primary" onClick={() => addButton(idx)} type="button">
                                                    <Plus className="h-3.5 w-3.5 mr-1" /> Add Action
                                                </Button>
                                            </div>
                                            <div className="space-y-2">
                                                {card.buttons?.map((btn: any, bIdx: number) => (
                                                    <div key={bIdx} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm">
                                                        <ActionItem 
                                                            btn={btn} 
                                                            onUpdate={(f, v) => updateButton(bIdx, f, v, idx)} 
                                                            onRemove={() => removeButton(bIdx, idx)} 
                                                        />
                                                    </div>
                                                ))}
                                                {(!card.buttons || card.buttons.length === 0) && (
                                                    <p className="text-[10px] text-center text-muted-foreground italic py-2">No actions added for this card</p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Buttons / Suggestions */}
            {data.template_type !== 'carousel' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                     <div className="flex items-center justify-between px-1">
                        <div>
                            <Label className="text-sm font-bold text-gray-800">Suggestions & Quick Replies</Label>
                            <p className="text-[10px] text-muted-foreground">Add interactive buttons to your message</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => addButton('global')} type="button" className="rounded-xl border-primary/20 hover:bg-primary/5 text-primary">
                            <Plus className="h-4 w-4 mr-1.5" /> Add Suggestion
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {data.buttons?.map((btn: any, idx: number) => (
                            <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
                                <ActionItem 
                                    btn={btn} 
                                    onUpdate={(f, v) => updateButton(idx, f, v)} 
                                    onRemove={() => removeButton(idx)} 
                                />
                            </div>
                        ))}
                        {(!data.buttons || data.buttons.length === 0) && (
                            <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-2xl py-8 text-center">
                                <p className="text-xs text-muted-foreground">No suggestions added yet</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Reusable Action Item Component
const ActionItem = ({ btn, onUpdate, onRemove }: { btn: any, onUpdate: (f: string, v: any) => void, onRemove: () => void }) => {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center gap-3">
                <div className="flex-1">
                    <Select 
                        value={btn.type} 
                        onValueChange={(v) => onUpdate('type', v)}
                    >
                        <SelectTrigger className="h-10 rounded-xl bg-gray-50/50 border-gray-100 shadow-none focus:bg-white"><SelectValue placeholder="Action Type" /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="reply">Start Chat (Reply)</SelectItem>
                            <SelectItem value="url_action">Open Website URL</SelectItem>
                            <SelectItem value="dialer_action">Dial Phone Number</SelectItem>
                            <SelectItem value="calendar_event">Add to Calendar</SelectItem>
                            <SelectItem value="view_location_latlong">View Map (Lat/Long)</SelectItem>
                            <SelectItem value="view_location_query">View Map (Address)</SelectItem>
                            <SelectItem value="share_location">Request User Location</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive/60 hover:text-destructive hover:bg-destructive/5 rounded-full" onClick={onRemove}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            <div className="relative">
                <Input 
                    placeholder="Button Text Label" 
                    value={btn.displayText || ''}
                    onChange={(e) => onUpdate('displayText', e.target.value)}
                    className="h-10 rounded-xl bg-white border-gray-100 focus:ring-primary h-11"
                />
            </div>

            {btn.type === 'reply' && (
                <div className="space-y-1 mt-1">
                    <Label className="text-[10px] text-gray-400 ml-1 uppercase font-bold tracking-tight">Postback Value (Required)</Label>
                    <Input 
                        placeholder="Internal identifier (e.g. YES_UPGRADE)" 
                        value={btn.postback || ''}
                        onChange={(e) => onUpdate('postback', e.target.value)}
                        className="h-9 text-xs rounded-xl bg-gray-50/30 border-gray-100 italic"
                    />
                </div>
            )}

            {btn.type === 'url_action' && (
                <Input 
                    placeholder="URL (e.g. https://...)" 
                    value={btn.uri || ''}
                    onChange={(e) => onUpdate('uri', e.target.value)}
                />
            )}
            
            {btn.type === 'dialer_action' && (
                <Input 
                    placeholder="Phone Number" 
                    value={btn.uri || ''}
                    onChange={(e) => onUpdate('uri', e.target.value)}
                />
            )}

            {btn.type === 'calendar_event' && (
                <div className="space-y-2 border-l-2 pl-3 py-1 bg-muted/20">
                    <Input 
                        placeholder="Event Title" 
                        value={btn.calendar?.title || ''}
                        onChange={(e) => onUpdate('calendar', { ...btn.calendar, title: e.target.value })}
                    />
                    <Textarea 
                        placeholder="Description" 
                        value={btn.calendar?.description || ''}
                        onChange={(e) => onUpdate('calendar', { ...btn.calendar, description: e.target.value })}
                        rows={2}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[10px]">Start Time</Label>
                            <Input type="datetime-local" value={btn.calendar?.startTime || ''} onChange={(e) => onUpdate('calendar', { ...btn.calendar, startTime: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px]">End Time</Label>
                            <Input type="datetime-local" value={btn.calendar?.endTime || ''} onChange={(e) => onUpdate('calendar', { ...btn.calendar, endTime: e.target.value })} />
                        </div>
                    </div>
                </div>
            )}

            {btn.type === 'view_location_latlong' && (
                <div className="grid grid-cols-2 gap-2">
                    <Input 
                        placeholder="Latitude" 
                        value={btn.location?.latitude || ''}
                        onChange={(e) => onUpdate('location', { ...btn.location, latitude: e.target.value })}
                    />
                    <Input 
                        placeholder="Longitude" 
                        value={btn.location?.longitude || ''}
                        onChange={(e) => onUpdate('location', { ...btn.location, longitude: e.target.value })}
                    />
                    <Input 
                        className="col-span-2"
                        placeholder="Label (e.g. My Shop)" 
                        value={btn.location?.label || ''}
                        onChange={(e) => onUpdate('location', { ...btn.location, label: e.target.value })}
                    />
                </div>
            )}

            {btn.type === 'view_location_query' && (
                    <Input 
                    placeholder="Query (e.g. Restaurants near me)"
                    value={btn.payload?.query || ''}
                    onChange={(e) => {
                        const payload = btn.payload || {};
                        onUpdate('payload', { ...payload, query: e.target.value });
                    }}
                />
            )}
        </div>
    );
};
