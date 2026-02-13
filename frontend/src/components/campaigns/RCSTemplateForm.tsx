import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Image as ImageIcon, Link as LinkIcon, Phone, MapPin, Calendar, Smartphone } from 'lucide-react';

interface RCSTemplateFormProps {
    data: any;
    onChange: (data: any) => void;
}

export const RCSTemplateForm: React.FC<RCSTemplateFormProps> = ({ data, onChange }) => {
    const handleChange = (field: string, value: any) => {
        onChange({ ...data, [field]: value });
    };

    const handleMetadataChange = (field: string, value: any) => {
        onChange({ ...data, metadata: { ...data.metadata, [field]: value } });
    };

    const addButton = () => {
        const newButtons = [...(data.buttons || []), { 
            type: 'reply', 
            displayText: '', 
            postback: '', 
            uri: '' 
        }];
        handleChange('buttons', newButtons);
    };

    const updateButton = (index: number, field: string, value: any) => {
        const newButtons = [...(data.buttons || [])];
        newButtons[index] = { ...newButtons[index], [field]: value };
        handleChange('buttons', newButtons);
    };

    const removeButton = (index: number) => {
        const newButtons = [...(data.buttons || [])];
        newButtons.splice(index, 1);
        handleChange('buttons', newButtons);
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

    return (
        <div className="space-y-6">
            {/* Template Type Selector */}
            <div className="space-y-2">
                <Label>RCS Template Type</Label>
                <div className="flex gap-4">
                    {['text_message', 'rich_card', 'carousel'].map((type) => (
                        <div 
                            key={type}
                            className={`border rounded-lg p-4 cursor-pointer hover:bg-accent ${data.template_type === type ? 'border-primary bg-primary/5' : ''}`}
                            onClick={() => handleChange('template_type', type)}
                        >
                            <div className="font-medium capitalize">{type.replace('_', ' ')}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Common Fields */}
            {data.template_type !== 'carousel' && (
                <div className="space-y-4">
                    {data.template_type === 'rich_card' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Card Orientation</Label>
                                    <Select 
                                        value={data.metadata?.orientation || 'VERTICAL'} 
                                        onValueChange={(v) => handleMetadataChange('orientation', v)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="VERTICAL">Vertical</SelectItem>
                                            <SelectItem value="HORIZONTAL">Horizontal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Card Height</Label>
                                    <Select 
                                        value={data.metadata?.height || 'SHORT_HEIGHT'} 
                                        onValueChange={(v) => handleMetadataChange('height', v)}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SHORT_HEIGHT">Short</SelectItem>
                                            <SelectItem value="MEDIUM_HEIGHT">Medium</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Media URL</Label>
                                <Input 
                                    placeholder="https://example.com/image.jpg" 
                                    value={data.metadata?.mediaUrl || ''}
                                    onChange={(e) => handleMetadataChange('mediaUrl', e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Publicly accessible URL for image/video</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Card Title</Label>
                                <Input 
                                    value={data.metadata?.cardTitle || ''}
                                    onChange={(e) => handleMetadataChange('cardTitle', e.target.value)}
                                />
                            </div>
                        </>
                    )}
                    
                    <div className="space-y-2">
                        <Label>{data.template_type === 'rich_card' ? 'Card Description' : 'Message Body'}</Label>
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
                <div className="space-y-4">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Card Height</Label>
                            <Select 
                                value={data.metadata?.height || 'SHORT_HEIGHT'} 
                                onValueChange={(v) => handleMetadataChange('height', v)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SHORT_HEIGHT">Short</SelectItem>
                                    <SelectItem value="MEDIUM_HEIGHT">Medium</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Card Width</Label>
                            <Select 
                                value={data.metadata?.width || 'MEDIUM_WIDTH'} 
                                onValueChange={(v) => handleMetadataChange('width', v)}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SMALL_WIDTH">Small</SelectItem>
                                    <SelectItem value="MEDIUM_WIDTH">Medium</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Carousel Cards</Label>
                            <Button size="sm" variant="outline" onClick={addCarouselCard} type="button">
                                <Plus className="h-4 w-4 mr-1" /> Add Card
                            </Button>
                        </div>
                        
                        {(data.metadata?.carouselList || []).map((card: any, idx: number) => (
                            <Card key={idx}>
                                <CardContent className="p-4 space-y-4">
                                    <div className="flex justify-between">
                                        <h4 className="text-sm font-semibold">Card {idx + 1}</h4>
                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeCarouselCard(idx)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <Input 
                                        placeholder="Media URL" 
                                        value={card.mediaUrl || ''}
                                        onChange={(e) => updateCarouselCard(idx, 'mediaUrl', e.target.value)}
                                    />
                                    <Input 
                                        placeholder="Title" 
                                        value={card.title || ''}
                                        onChange={(e) => updateCarouselCard(idx, 'title', e.target.value)}
                                    />
                                    <Textarea 
                                        placeholder="Description" 
                                        value={card.description || ''}
                                        onChange={(e) => updateCarouselCard(idx, 'description', e.target.value)}
                                    />
                                    {/* Buttons for Carousel Cards would go here - simplified for now */}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Buttons / Suggestions (Global for non-carousel, or add per card logic later) */}
            {data.template_type !== 'carousel' && (
                <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Label>Suggestions / Actions</Label>
                        <Button size="sm" variant="outline" onClick={addButton} type="button">
                            <Plus className="h-4 w-4 mr-1" /> Add Action
                        </Button>
                    </div>

                    {data.buttons?.map((btn: any, idx: number) => (
                        <Card key={idx}>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="w-1/3">
                                        <Select 
                                            value={btn.type} 
                                            onValueChange={(v) => updateButton(idx, 'type', v)}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="reply">Start Chat (Reply)</SelectItem>
                                                <SelectItem value="url_action">Open URL</SelectItem>
                                                <SelectItem value="dialer_action">Dial Phone</SelectItem>
                                                <SelectItem value="calendar_event">Add to Calendar</SelectItem>
                                                <SelectItem value="view_location_query">View Location</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeButton(idx)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <Input 
                                    placeholder="Button Text" 
                                    value={btn.displayText || ''}
                                    onChange={(e) => updateButton(idx, 'displayText', e.target.value)}
                                />

                                {btn.type === 'url_action' && (
                                    <Input 
                                        placeholder="URL (e.g. https://...)" 
                                        value={btn.uri || ''}
                                        onChange={(e) => updateButton(idx, 'uri', e.target.value)}
                                    />
                                )}
                                {btn.type === 'dialer_action' && (
                                    <Input 
                                        placeholder="Phone Number" 
                                        value={btn.uri || ''}
                                        onChange={(e) => updateButton(idx, 'uri', e.target.value)}
                                    />
                                )}
                                {btn.type === 'view_location_query' && (
                                     <Input 
                                        placeholder="Query (e.g. Restaurants near me)"
                                        value={btn.payload?.query || ''}
                                        onChange={(e) => {
                                            const payload = btn.payload || {};
                                            updateButton(idx, 'payload', { ...payload, query: e.target.value });
                                        }}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};
