import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, MessageSquare, Clock, User, Calendar, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { rcsTemplatesService } from '@/services/rcsTemplatesService';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface RCSTemplate {
  id: string;
  name: string;
  category: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  body: string;
  headerType: string;
  headerContent: string;
  buttons: any[];
  variables: any[];
  footer?: string;
  language: string;
  createdBy: string;
  createdAt: string | Date;
  rejectionReason?: string;
}

export function RCSTemplateApproval() {
  const [templates, setTemplates] = useState<RCSTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<RCSTemplate | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
      toast({
        title: 'Error',
        description: 'Failed to load templates for approval',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      setIsProcessing(true);
      await rcsTemplatesService.approveTemplate(id, 'admin');
      toast({
        title: 'Success',
        description: 'Template approved successfully',
      });
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve template',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      await rcsTemplatesService.rejectTemplate(id, rejectionReason, 'admin');
      setIsRejectingId(null);
      setRejectionReason('');
      toast({
        title: 'Success',
        description: 'Template rejected',
      });
      fetchTemplates();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject template',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const pendingTemplates = templates.filter((t) => t.status === 'pending_approval' || t.status === 'draft');
  const approvedTemplates = templates.filter((t) => t.status === 'approved');
  const rejectedTemplates = templates.filter((t) => t.status === 'rejected');

  const TemplateCard = ({ template }: { template: RCSTemplate }) => (
    <Card className="card-elevated hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            <CardDescription>{template.category}</CardDescription>
          </div>
          <Badge variant={template.status === 'approved' ? 'default' : template.status === 'rejected' ? 'destructive' : 'secondary'}>
            {template.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
            {template.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
            {(template.status === 'pending_approval' || template.status === 'draft') && <Clock className="h-3 w-3 mr-1" />}
            {template.status.replace('_', ' ')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted p-3 rounded-lg text-sm max-h-20 overflow-hidden">
          <p className="font-medium text-xs text-muted-foreground mb-1">PREVIEW</p>
          <p className="line-clamp-3">{template.body}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground truncate">By: {template.createdBy}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {template.createdAt ? format(new Date(template.createdAt), 'dd MMM yyyy') : 'N/A'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{template.buttons?.length || 0} buttons</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{template.language}</span>
          </div>
        </div>

        {template.rejectionReason && (
          <div className="p-3 bg-destructive/10 rounded-lg">
            <p className="text-xs font-medium text-destructive mb-1">Rejection Reason</p>
            <p className="text-xs text-destructive/80">{template.rejectionReason}</p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setSelectedTemplate(template);
              setIsDetailsOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            Details
          </Button>
          {(template.status === 'pending_approval' || template.status === 'draft') && (
            <>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleApprove(template.id)}
                disabled={isProcessing}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsRejectingId(template.id)}
                disabled={isProcessing}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {isRejectingId === template.id && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Rejection Reason</Label>
            <Textarea
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-20 text-xs"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setIsRejectingId(null);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => handleReject(template.id)}
                disabled={isProcessing}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Fetching templates from database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">RCS Template Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve pending RCS templates from your campaigns</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingTemplates.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-green-600">{approvedTemplates.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{rejectedTemplates.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingTemplates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            Pending Review
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTemplates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} />
            ))}
          </div>
        </div>
      )}

      {approvedTemplates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Approved Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedTemplates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} />
            ))}
          </div>
        </div>
      )}

      {rejectedTemplates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Rejected Templates
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rejectedTemplates.map((tpl) => (
              <TemplateCard key={tpl.id} template={tpl} />
            ))}
          </div>
        </div>
      )}

      {templates.length === 0 && (
        <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed">
          <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-1">No templates found in database</h3>
          <p className="text-muted-foreground">Create a template in the Campaigns tab to see it here.</p>
        </div>
      )}

      {selectedTemplate && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Template Details: {selectedTemplate.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {selectedTemplate.headerType !== 'none' && (
                <div>
                  <p className="text-sm font-medium mb-2">Header ({selectedTemplate.headerType.toUpperCase()})</p>
                  <div className="bg-muted p-4 rounded-lg">
                    {selectedTemplate.headerType === 'image' && (
                      <img src={selectedTemplate.headerContent || "/placeholder.svg"} alt="header" className="w-full h-32 object-cover rounded" />
                    )}
                    {(selectedTemplate.headerType === 'text' || selectedTemplate.headerType === 'video' || selectedTemplate.headerType === 'document') && (
                      <p className="font-medium">{selectedTemplate.headerContent}</p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Message Body</p>
                <div className="bg-primary/5 p-4 rounded-lg whitespace-pre-wrap text-sm font-mono">
                  {selectedTemplate.body}
                </div>
              </div>

              {selectedTemplate.buttons && selectedTemplate.buttons.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Buttons</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTemplate.buttons.map((btn, idx) => (
                      <Button
                        key={idx}
                        variant={btn.type === 'action' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full"
                      >
                        {btn.displayText}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.footer && (
                <div>
                  <p className="text-sm font-medium mb-2">Footer</p>
                  <div className="text-xs text-muted-foreground text-center border p-3 rounded">
                    {selectedTemplate.footer}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Category</p>
                  <p className="font-medium mt-1">{selectedTemplate.category}</p>
                </div>
                <div className="p-3 bg-muted rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Language</p>
                  <p className="font-medium mt-1">{selectedTemplate.language}</p>
                </div>
                <div className="p-3 bg-muted rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Created By</p>
                  <p className="font-medium mt-1">{selectedTemplate.createdBy}</p>
                </div>
                <div className="p-3 bg-muted rounded">
                  <p className="text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">Requested On</p>
                  <p className="font-medium mt-1">
                    {selectedTemplate.createdAt ? format(new Date(selectedTemplate.createdAt), 'dd MMM yyyy HH:mm') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
