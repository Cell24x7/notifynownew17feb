import { useState, useRef } from 'react';
import { Upload, Mic, Play, Pause, Trash2, FileAudio, Check, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

interface VoiceFile {
  id: string;
  name: string;
  duration: string;
  size: string;
  url?: string;
  status: 'uploading' | 'ready' | 'error';
  progress?: number;
}

interface VoiceUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (files: VoiceFile[]) => void;
}

export function VoiceUpload({ open, onOpenChange, onUploadComplete }: VoiceUploadProps) {
  const [files, setFiles] = useState<VoiceFile[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;

    const newFiles: VoiceFile[] = [];
    
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      
      // Validate file type
      const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|m4a)$/i)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a supported audio format.`,
          variant: 'destructive',
        });
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds the 10MB limit.`,
          variant: 'destructive',
        });
        continue;
      }

      const voiceFile: VoiceFile = {
        id: Date.now().toString() + i,
        name: file.name,
        duration: '--:--',
        size: formatFileSize(file.size),
        status: 'uploading',
        progress: 0,
      };

      newFiles.push(voiceFile);
    }

    setFiles(prev => [...prev, ...newFiles]);

    // Simulate upload progress
    for (const voiceFile of newFiles) {
      for (let progress = 0; progress <= 100; progress += 20) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setFiles(prev => prev.map(f => 
          f.id === voiceFile.id ? { ...f, progress, status: progress === 100 ? 'ready' : 'uploading', duration: '0:30' } : f
        ));
      }
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDelete = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handlePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
      // Simulate audio playback ending
      setTimeout(() => setPlayingId(null), 3000);
    }
  };

  const handleStartRecording = () => {
    setRecording(true);
    setRecordingTime(0);
    
    // Simulate recording timer
    const interval = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 60) {
          clearInterval(interval);
          handleStopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    setRecording(false);
    const newFile: VoiceFile = {
      id: Date.now().toString(),
      name: `Recording_${new Date().toISOString().slice(0, 10)}.wav`,
      duration: formatTime(recordingTime),
      size: `${Math.round(recordingTime * 16)}KB`,
      status: 'ready',
    };
    setFiles(prev => [...prev, newFile]);
    setRecordingTime(0);
    toast({
      title: 'Recording saved',
      description: 'Your voice recording has been added.',
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = () => {
    const readyFiles = files.filter(f => f.status === 'ready');
    onUploadComplete?.(readyFiles);
    onOpenChange(false);
    toast({
      title: 'Voice files ready',
      description: `${readyFiles.length} voice file(s) are ready to use.`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Voice File Upload</DialogTitle>
          <DialogDescription>
            Upload audio files or record voice messages for your campaigns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          <div className="grid grid-cols-2 gap-4">
            <Card
              className="border-2 border-dashed cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="py-8 text-center">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Upload Audio Files</p>
                <p className="text-xs text-muted-foreground mt-1">MP3, WAV, OGG, M4A (max 10MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.ogg,.m4a,audio/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </CardContent>
            </Card>

            <Card
              className={`border-2 border-dashed cursor-pointer transition-colors ${recording ? 'border-red-500 bg-red-500/5' : 'hover:border-primary'}`}
              onClick={recording ? handleStopRecording : handleStartRecording}
            >
              <CardContent className="py-8 text-center">
                <Mic className={`w-10 h-10 mx-auto mb-3 ${recording ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
                <p className="font-medium">{recording ? 'Stop Recording' : 'Record Voice'}</p>
                {recording ? (
                  <p className="text-lg font-mono text-red-500 mt-1">{formatTime(recordingTime)}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Click to start recording</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Uploaded Files ({files.length})</Label>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {files.map(file => (
                    <Card key={file.id}>
                      <CardContent className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileAudio className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>{file.duration}</span>
                              <span>•</span>
                              <span>{file.size}</span>
                            </div>
                            {file.status === 'uploading' && (
                              <Progress value={file.progress} className="h-1 mt-2" />
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {file.status === 'ready' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handlePlay(file.id)}
                                >
                                  {playingId === file.id ? (
                                    <Pause className="w-4 h-4" />
                                  ) : (
                                    <Play className="w-4 h-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDelete(file.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {file.status === 'uploading' && (
                              <Badge variant="secondary">Uploading...</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Tips */}
          <div className="p-3 rounded-lg bg-muted/50 text-sm">
            <p className="font-medium mb-1">Tips for voice messages:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Keep messages under 60 seconds for best engagement</li>
              <li>• Speak clearly and at a moderate pace</li>
              <li>• Use a quiet environment for recording</li>
              <li>• Test playback before using in campaigns</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleComplete} disabled={files.filter(f => f.status === 'ready').length === 0}>
            <Check className="w-4 h-4 mr-2" />
            Use {files.filter(f => f.status === 'ready').length} File(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
