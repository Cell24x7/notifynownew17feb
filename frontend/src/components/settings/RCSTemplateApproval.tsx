import { useState } from 'react';
import { CheckCircle, XCircle, Eye, MessageSquare, Clock, User, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { mockRCSTemplates, type RCSTemplate } from '@/lib/mockData';

interface TemplateApprovalRequest {
  id: string;
  template: RCSTemplate;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
}

export function RCSTemplateApproval() {
  const [approvalRequests, setApprovalRequests] = useState<TemplateApprovalRequest[]>(
    mockRCSTemplates
      .filter(t => t.status === 'pending_approval' || t.status === 'draft')
      .map((template, idx) => ({
        id: `approval_${idx}`,
        template,
        requestedBy: template.createdBy,
        requestedAt: template.createdAt,
        status: 'pending',
      }))
  );

  const [selectedRequest, setSelectedRequest] = useState<TemplateApprovalRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectingId, setIsRejectingId] = useState<string | null>(null);

  const { toast } = useToast();

  const handleApprove = (id: string) => {
    setApprovalRequests(
      approvalRequests.map((req) =>
        req.id === id
          ? {
              ...req,
              status: 'approved',
              template: { ...req.template, status: 'approved' as const },
            }
          : req
      )
    );
    toast({
      title: 'Success',
      description: 'Template approved successfully',
    });
  };

  const handleReject = (id: string) => {
    if (!rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a rejection reason',
        variant: 'destructive',
      });
      return;
    }

    setApprovalRequests(
      approvalRequests.map((req) =>
        req.id === id
          ? {
              ...req,
              status: 'rejected',
              rejectionReason,
              template: {
                ...req.template,
                status: 'rejected' as const,
                rejectionReason,
              },
            }
          : req
      )
    );
    setIsRejectingId(null);
    setRejectionReason('');
    toast({
      title: 'Success',
      description: 'Template rejected',
    });
  };

  const pendingRequests = approvalRequests.filter((r) => r.status === 'pending');
  const approvedRequests = approvalRequests.filter((r) => r.status === 'approved');
  const rejectedRequests = approvalRequests.filter((r) => r.status === 'rejected');

  const ApprovalCard = ({ request }: { request: TemplateApprovalRequest }) => (
    <Card className="card-elevated hover:shadow-lg transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{request.template.name}</CardTitle>
            <CardDescription>{request.template.category}</CardDescription>
          </div>
          <Badge variant={request.status === 'approved' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>
            {request.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
            {request.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
            {request.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
            {request.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Preview */}
        <div className="bg-muted p-3 rounded-lg text-sm max-h-20 overflow-hidden">
          <p className="font-medium text-xs text-muted-foreground mb-1">PREVIEW</p>
          <p className="line-clamp-3">{request.template.body}</p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Requested by: {request.requestedBy}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{request.requestedAt.toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">{request.template.buttons.length} buttons</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">v{request.template.language}</span>
          </div>
        </div>

        {/* Rejection Reason */}
        {request.rejectionReason && (
          <div className="p-3 bg-destructive/10 rounded-lg">
            <p className="text-xs font-medium text-destructive mb-1">Rejection Reason</p>
            <p className="text-xs text-destructive/80">{request.rejectionReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              setSelectedRequest(request);
              setIsDetailsOpen(true);
            }}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          {request.status === 'pending' && (
            <>
              <Button
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => handleApprove(request.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setIsRejectingId(request.id)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>

        {/* Rejection Reason Input */}
        {isRejectingId === request.id && (
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
                onClick={() => handleReject(request.id)}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">RCS Template Approvals</h1>
        <p className="text-muted-foreground mt-1">Review and approve pending RCS templates</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</p>
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
                <p className="text-2xl font-bold text-green-600">{approvedRequests.length}</p>
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
                <p className="text-2xl font-bold text-red-600">{rejectedRequests.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {pendingRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Pending Review</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((request) => (
              <ApprovalCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Approved Templates */}
      {approvedRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Approved Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedRequests.map((request) => (
              <ApprovalCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {/* Rejected Templates */}
      {rejectedRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Rejected Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rejectedRequests.map((request) => (
              <ApprovalCard key={request.id} request={request} />
            ))}
          </div>
        </div>
      )}

      {approvalRequests.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-1">All templates processed</h3>
          <p className="text-muted-foreground">There are no templates pending approval</p>
        </div>
      )}

      {/* Details Dialog */}
      {selectedRequest && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Template Details: {selectedRequest.template.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Header */}
              {selectedRequest.template.headerType !== 'none' && (
                <div>
                  <p className="text-sm font-medium mb-2">Header ({selectedRequest.template.headerType.toUpperCase()})</p>
                  <div className="bg-muted p-4 rounded-lg">
                    {selectedRequest.template.headerType === 'image' && (
                      <img src="/placeholder.svg" alt="header" className="w-full h-32 object-cover rounded" />
                    )}
                    {selectedRequest.template.headerType === 'text' && (
                      <p className="font-medium">{selectedRequest.template.headerContent}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Body */}
              <div>
                <p className="text-sm font-medium mb-2">Message Body</p>
                <div className="bg-primary/5 p-4 rounded-lg whitespace-pre-wrap text-sm font-mono">
                  {selectedRequest.template.body}
                </div>
              </div>

              {/* Variables */}
              {selectedRequest.template.variables.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Variables</p>
                  <div className="space-y-2">
                    {selectedRequest.template.variables.map((variable, idx) => (
                      <div key={variable.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm font-mono">{`{{${variable.name}}}`}</span>
                        <span className="text-xs text-muted-foreground">{variable.sampleValue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Buttons */}
              {selectedRequest.template.buttons.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Buttons</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedRequest.template.buttons.map((btn) => (
                      <Button
                        key={btn.id}
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

              {/* Footer */}
              {selectedRequest.template.footer && (
                <div>
                  <p className="text-sm font-medium mb-2">Footer</p>
                  <div className="text-xs text-muted-foreground text-center border p-3 rounded">
                    {selectedRequest.template.footer}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-muted rounded">
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium mt-1">{selectedRequest.template.category}</p>
                </div>
                <div className="p-3 bg-muted rounded">
                  <p className="text-muted-foreground">Language</p>
                  <p className="font-medium mt-1">{selectedRequest.template.language}</p>
                </div>
                <div className="p-3 bg-muted rounded">
                  <p className="text-muted-foreground">Created By</p>
                  <p className="font-medium mt-1">{selectedRequest.requestedBy}</p>
                </div>
                <div className="p-3 bg-muted rounded">
                  <p className="text-muted-foreground">Requested On</p>
                  <p className="font-medium mt-1">{selectedRequest.requestedAt.toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
