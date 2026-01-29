import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Check,
  X,
  Clock,
  FileText,
  AlertTriangle,
  Download,
  Send
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OnboardingRequest {
  id: string;
  companyName: string;
  contactEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'in-review';
  submittedDate: string;
  reviewedDate?: string;
  documents: {
    gst: boolean;
    pan: boolean;
    incorporation: boolean;
    logo: boolean;
  };
  brandName: string;
  useCases: string[];
  notes?: string;
  reviewerNotes?: string;
}

const mockRequests: OnboardingRequest[] = [
  {
    id: 'RCS001',
    companyName: 'ABC E-commerce Ltd',
    contactEmail: 'rcs@abc.com',
    status: 'pending',
    submittedDate: '2026-01-24',
    documents: { gst: true, pan: true, incorporation: true, logo: true },
    brandName: 'ABC Shop',
    useCases: ['OTP & Authentication', 'Order Updates'],
    notes: 'Initial submission'
  },
  {
    id: 'RCS002',
    companyName: 'XYZ Bank',
    contactEmail: 'rcs@xyzbank.com',
    status: 'in-review',
    submittedDate: '2026-01-23',
    documents: { gst: true, pan: true, incorporation: true, logo: true },
    brandName: 'XYZ Bank',
    useCases: ['OTP & Authentication', 'Payment Notifications'],
    notes: 'Awaiting additional verification'
  },
  {
    id: 'RCS003',
    companyName: 'Tech Startup',
    contactEmail: 'contact@techstartup.com',
    status: 'approved',
    submittedDate: '2026-01-20',
    reviewedDate: '2026-01-22',
    documents: { gst: true, pan: true, incorporation: false, logo: true },
    brandName: 'Tech Startup',
    useCases: ['Order Updates'],
    notes: 'Approved',
    reviewerNotes: 'All documents verified. Ready for agent creation.'
  }
];

export default function RCSApprovalWorkflow() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<OnboardingRequest[]>(mockRequests);
  const [selectedRequest, setSelectedRequest] = useState<OnboardingRequest | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'in-review':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="w-4 h-4" />;
      case 'rejected':
        return <X className="w-4 h-4" />;
      case 'in-review':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;

    setActionInProgress(true);
    try {
      // API call to approve
      const updatedRequests = requests.map(req =>
        req.id === selectedRequest.id
          ? { ...req, status: 'approved' as const, reviewedDate: new Date().toISOString().split('T')[0], reviewerNotes }
          : req
      );
      setRequests(updatedRequests);
      setSelectedRequest(null);
      setIsDetailOpen(false);
      setReviewNotes('');

      toast({
        title: 'Approved',
        description: `${selectedRequest.companyName} has been approved for RCS`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve request',
        variant: 'destructive'
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;

    setActionInProgress(true);
    try {
      const updatedRequests = requests.map(req =>
        req.id === selectedRequest.id
          ? { ...req, status: 'rejected' as const, reviewedDate: new Date().toISOString().split('T')[0], reviewerNotes }
          : req
      );
      setRequests(updatedRequests);
      setSelectedRequest(null);
      setIsDetailOpen(false);
      setReviewNotes('');

      toast({
        title: 'Rejected',
        description: `${selectedRequest.companyName} request has been rejected`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject request',
        variant: 'destructive'
      });
    } finally {
      setActionInProgress(false);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const inReviewCount = requests.filter(r => r.status === 'in-review').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">📋 RCS Approval Workflow</h1>
        <p className="text-gray-600">Review and approve RCS onboarding applications</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{requests.length}</div>
              <p className="text-sm text-gray-600">Total Applications</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{pendingCount}</div>
              <p className="text-sm text-gray-600">Pending Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">{inReviewCount}</div>
              <p className="text-sm text-gray-600">In Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{approvedCount}</div>
              <p className="text-sm text-gray-600">Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Applications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Onboarding Applications</CardTitle>
          <CardDescription>Review submitted applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in-review">In Review</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Documents</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map(request => (
                      <TableRow key={request.id}>
                        <TableCell className="font-mono text-sm">{request.id}</TableCell>
                        <TableCell className="font-medium">{request.companyName}</TableCell>
                        <TableCell className="text-sm">{request.contactEmail}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(request.status)} className="gap-1">
                            {getStatusIcon(request.status)}
                            {request.status.replace('-', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{request.submittedDate}</TableCell>
                        <TableCell className="text-sm">
                          {Object.values(request.documents).filter(Boolean).length}/4
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRequest(request);
                              setIsDetailOpen(true);
                            }}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      {selectedRequest && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Review Application - {selectedRequest.id}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Business Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-600">Company Name</Label>
                  <p className="font-semibold">{selectedRequest.companyName}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Brand Name</Label>
                  <p className="font-semibold">{selectedRequest.brandName}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Contact Email</Label>
                  <p className="font-semibold">{selectedRequest.contactEmail}</p>
                </div>
                <div>
                  <Label className="text-gray-600">Status</Label>
                  <Badge variant={getStatusBadgeVariant(selectedRequest.status)} className="gap-1 mt-1">
                    {getStatusIcon(selectedRequest.status)}
                    {selectedRequest.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </div>
              </div>

              {/* Use Cases */}
              <div>
                <Label className="text-gray-600">Use Cases</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedRequest.useCases.map(useCase => (
                    <Badge key={useCase} variant="secondary">{useCase}</Badge>
                  ))}
                </div>
              </div>

              {/* Documents Status */}
              <div>
                <Label className="text-gray-600 block mb-3">Document Status</Label>
                <div className="space-y-2">
                  {Object.entries(selectedRequest.documents).map(([doc, uploaded]) => (
                    <div key={doc} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                      {uploaded ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-red-600" />
                      )}
                      <span className="capitalize flex-1">{doc} Certificate</span>
                      {uploaded && (
                        <Button size="sm" variant="ghost">
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <Label>Review Notes</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Add your review comments..."
                  rows={4}
                />
              </div>

              {selectedRequest.reviewerNotes && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <Label className="text-blue-900">Previous Notes</Label>
                  <p className="text-sm text-blue-800 mt-2">{selectedRequest.reviewerNotes}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              {selectedRequest.status !== 'approved' && selectedRequest.status !== 'rejected' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={actionInProgress}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={actionInProgress}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                </>
              )}
              {selectedRequest.status === 'approved' && (
                <Button>
                  <Send className="w-4 h-4 mr-2" />
                  Send to Operator
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
