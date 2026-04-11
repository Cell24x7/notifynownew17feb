import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Music, Play, Pause, Mic } from 'lucide-react';

interface VoiceTemplateFormProps {
  data: any;
  onChange: (data: any) => void;
  onFileChange?: (file: File | null) => void;
}

export function VoiceTemplateForm({ data, onChange, onFileChange }: VoiceTemplateFormProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(data.metadata?.mediaUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (onFileChange) onFileChange(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      onChange({
        ...data,
        metadata: {
          ...data.metadata,
          mediaUrl: url,
          fileName: file.name
        }
      });
    }
  };

  const removeFile = () => {
    if (onFileChange) onFileChange(null);
    setAudioUrl(null);
    onChange({
      ...data,
      metadata: {
        ...data.metadata,
        mediaUrl: '',
        fileName: ''
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Template Name *</Label>
            <Input
              placeholder="e.g. welcome_call_v1"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select 
              value={data.category} 
              onValueChange={(v) => onChange({ ...data, category: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Marketing">Marketing</SelectItem>
                <SelectItem value="Utility">Utility</SelectItem>
                <SelectItem value="Authentication">Authentication</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Voice Type</Label>
          <Select 
            value={data.template_type} 
            onValueChange={(v) => onChange({ ...data, template_type: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="static">Static Audio (Upload MP3/WAV)</SelectItem>
              <SelectItem value="dynamic">AI Text-to-Speech (Dynamic)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data.template_type === 'static' ? (
          <div className="space-y-4">
            <Label>Audio File *</Label>
            {!audioUrl ? (
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary transition-all cursor-pointer relative group">
                <input
                  type="file"
                  accept="audio/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileChange}
                />
                <Upload className="h-10 w-10 mx-auto text-muted-foreground group-hover:text-primary mb-2 transition-colors" />
                <p className="text-sm font-medium">Click to upload or drag & drop</p>
                <p className="text-xs text-muted-foreground mt-1">MP3, WAV, or OGG (max 5MB)</p>
              </div>
            ) : (
              <div className="bg-muted/30 border border-border rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold truncate max-w-[200px]">{data.metadata?.fileName || 'audio-file.mp3'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Static Audio</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Description / Transcript (Optional)</Label>
              <Textarea 
                placeholder="Content of the audio file for your reference..."
                value={data.body}
                onChange={(e) => onChange({ ...data, body: e.target.value })}
                rows={3}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>AI Voice Model</Label>
              <Select defaultValue="alloy">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alloy">Neutral (Alloy)</SelectItem>
                  <SelectItem value="echo">Confident (Echo)</SelectItem>
                  <SelectItem value="fable">Steady (Fable)</SelectItem>
                  <SelectItem value="onyx">Deep (Onyx)</SelectItem>
                  <SelectItem value="nova">Professional (Nova)</SelectItem>
                  <SelectItem value="shimmer">Clear (Shimmer)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Text to Speak *</Label>
              <Textarea 
                placeholder="Hello {{1}}, we are calling from {{2}} regarding your order..."
                value={data.body}
                onChange={(e) => onChange({ ...data, body: e.target.value })}
                rows={5}
              />
              <p className="text-[10px] text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">{"{{1}}"}</code> for dynamic variables from your contact list.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
