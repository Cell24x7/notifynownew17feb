import { useState, useRef } from 'react';
import { Upload, FileText, X, Check, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface UploadedTemplate {
  id: string;
  name: string;
  body: string;
  status: 'pending' | 'valid' | 'error';
  error?: string;
}

interface BulkTemplateUploadProps {
  channel: 'sms' | 'rcs';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (templates: UploadedTemplate[]) => void;
}

export function BulkTemplateUpload({ channel, open, onOpenChange, onUploadComplete }: BulkTemplateUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [templates, setTemplates] = useState<UploadedTemplate[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['.csv', '.xlsx', '.xls'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!validTypes.includes(ext)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a CSV or Excel file.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setProgress(0);

    // Simulate file parsing
    const mockTemplates: UploadedTemplate[] = [
      { id: '1', name: 'Welcome Message', body: 'Welcome to our service! Your OTP is {{1}}', status: 'valid' },
      { id: '2', name: 'Order Confirmation', body: 'Your order #{{1}} has been confirmed. Delivery on {{2}}', status: 'valid' },
      { id: '3', name: 'Payment Receipt', body: 'Payment of ₹{{1}} received. Transaction ID: {{2}}', status: 'valid' },
      { id: '4', name: 'Invalid Template', body: '', status: 'error', error: 'Message body is empty' },
      { id: '5', name: 'Promo Alert', body: 'Special offer! Get {{1}}% off on your next purchase. Use code: {{2}}', status: 'valid' },
    ];

    // Simulate progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setProgress(i);
    }

    setTemplates(mockTemplates);
    setUploading(false);
    setStep('preview');
  };

  const handleConfirmUpload = () => {
    setStep('result');
    const validTemplates = templates.filter(t => t.status === 'valid');
    onUploadComplete(validTemplates);
  };

  const handleDownloadSample = () => {
    // Create sample CSV content
    const sampleContent = `name,body,category
Welcome Message,"Welcome to our service! Your OTP is {{1}}",Transactional
Order Update,"Your order #{{1}} is on the way",Transactional
Promotional Offer,"Get {{1}}% off! Use code {{2}}",Marketing`;

    const blob = new Blob([sampleContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${channel}_template_sample.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Sample downloaded',
      description: 'Use this file as a reference for your bulk upload.',
    });
  };

  const handleClose = () => {
    setStep('upload');
    setTemplates([]);
    setProgress(0);
    onOpenChange(false);
  };

  const validCount = templates.filter(t => t.status === 'valid').length;
  const errorCount = templates.filter(t => t.status === 'error').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Template Upload - {channel.toUpperCase()}</DialogTitle>
          <DialogDescription>
            Upload multiple templates at once using a CSV or Excel file
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <Card
              className="border-2 border-dashed cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardContent className="py-12 text-center">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Click to upload or drag and drop</p>
                <p className="text-sm text-muted-foreground mt-1">CSV or Excel files (.csv, .xlsx, .xls)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </CardContent>
            </Card>

            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">Processing file... {progress}%</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" onClick={handleDownloadSample}>
                <Download className="w-4 h-4 mr-2" />
                Download Sample File
              </Button>
              <div className="text-sm text-muted-foreground">
                Required columns: name, body, category (optional)
              </div>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-green-500/10 text-green-600">
                <Check className="w-3 h-3 mr-1" />
                {validCount} Valid
              </Badge>
              {errorCount > 0 && (
                <Badge variant="outline" className="bg-red-500/10 text-red-600">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errorCount} Errors
                </Badge>
              )}
            </div>

            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {templates.map(template => (
                  <Card key={template.id} className={template.status === 'error' ? 'border-red-500/50' : ''}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{template.name}</span>
                            {template.status === 'valid' ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {template.body || <span className="italic">Empty message body</span>}
                          </p>
                          {template.error && (
                            <p className="text-sm text-red-600 mt-1">{template.error}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('upload')}>Back</Button>
              <Button onClick={handleConfirmUpload} disabled={validCount === 0}>
                Upload {validCount} Templates
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'result' && (
          <div className="space-y-4 text-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Upload Complete!</h3>
              <p className="text-muted-foreground">
                {validCount} templates have been added successfully.
              </p>
            </div>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
