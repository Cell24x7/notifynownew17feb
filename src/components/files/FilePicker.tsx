import { useState, useMemo } from 'react';
import { Search, File, Image, FileVideo, FileAudio, FileText, Check, Upload, FolderOpen } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { mockFiles, type MediaFile } from '@/lib/mockData';

interface FilePickerProps {
  trigger?: React.ReactNode;
  onSelect: (file: MediaFile) => void;
  accept?: MediaFile['type'][];
  multiple?: boolean;
  selectedFiles?: MediaFile[];
}

export function FilePicker({
  trigger,
  onSelect,
  accept = ['image', 'video', 'audio', 'document'],
  multiple = false,
  selectedFiles = [],
}: FilePickerProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selected, setSelected] = useState<MediaFile[]>(selectedFiles);

  const files = mockFiles.filter(f => accept.includes(f.type));

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = activeTab === 'all' || file.type === activeTab;
      return matchesSearch && matchesType;
    });
  }, [files, searchQuery, activeTab]);

  const getFileIcon = (type: MediaFile['type']) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4 text-green-500" />;
      case 'video':
        return <FileVideo className="h-4 w-4 text-purple-500" />;
      case 'audio':
        return <FileAudio className="h-4 w-4 text-orange-500" />;
      case 'document':
        return <FileText className="h-4 w-4 text-blue-500" />;
      default:
        return <File className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSelect = (file: MediaFile) => {
    if (multiple) {
      const isSelected = selected.some(f => f.id === file.id);
      if (isSelected) {
        setSelected(selected.filter(f => f.id !== file.id));
      } else {
        setSelected([...selected, file]);
      }
    } else {
      onSelect(file);
      setOpen(false);
    }
  };

  const handleConfirm = () => {
    if (multiple && selected.length > 0) {
      selected.forEach(file => onSelect(file));
      setOpen(false);
    }
  };

  const isSelected = (file: MediaFile) => selected.some(f => f.id === file.id);

  const availableTabs = [
    { value: 'all', label: 'All Files' },
    ...(accept.includes('image') ? [{ value: 'image', label: 'Images' }] : []),
    ...(accept.includes('video') ? [{ value: 'video', label: 'Videos' }] : []),
    ...(accept.includes('audio') ? [{ value: 'audio', label: 'Audio' }] : []),
    ...(accept.includes('document') ? [{ value: 'document', label: 'Documents' }] : []),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <FolderOpen className="h-4 w-4 mr-2" />
            Choose from Library
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select File from Library</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start">
              {availableTabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value}>
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[400px]">
                {filteredFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No files found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload files in Settings → File Manager
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                    {filteredFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => handleSelect(file)}
                        className={cn(
                          "relative cursor-pointer border-2 rounded-lg overflow-hidden transition-all",
                          isSelected(file) 
                            ? "border-primary ring-2 ring-primary/20" 
                            : "border-transparent hover:border-muted-foreground/30"
                        )}
                      >
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          {file.thumbnail ? (
                            <img
                              src={file.thumbnail}
                              alt={file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="scale-150">{getFileIcon(file.type)}</div>
                          )}
                        </div>
                        <div className="p-2">
                          <p className="text-xs font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                        </div>
                        {isSelected(file) && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          {multiple && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selected.length} file(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleConfirm} disabled={selected.length === 0}>
                  Confirm Selection
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
