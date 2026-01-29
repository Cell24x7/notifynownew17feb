import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Send,
  MessageSquare,
  ChevronRight,
  Calendar,
  User,
  FileText,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ApprovalStatusHistory {
  status: string;
  changedAt: string;
  changedBy: string;
  notes?: string;
}

interface ApprovalStatus {
  botId: string;
  botName: string;
  currentStatus: 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
  submittedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  operatorFeedback?: string;
  assignedReviewerId?: string;
  slaDeadline?: string;
  statusHistory: ApprovalStatusHistory[];
  operatorAgentId?: string;
}

interface Approver {
  id: string;
  name: string;
  email: string;
  department: string;
  role: 'REVIEWER' | 'OPERATOR' | 'ADMIN';
}

const APPROVERS: Approver[] = [
  {
    id: '1',
    name: 'Priya Sharma',
    email: 'priya@company.com',
    department: 'RCS Operations',
    role: 'REVIEWER',
  },
  {
    id: '2',
    name: 'Rajesh Verma',
    email: 'rajesh@operator.com',
    department: 'Operator Team',
    role: 'OPERATOR',
  },
  {
    id: '3',
    name: 'Amit Kumar',
    email: 'amit@company.com',
    department: 'Compliance',
    role: 'ADMIN',
  },
];

export function ApprovalWorkflow() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedApprover, setSelectedApprover] = useState('');

  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>({
    botId: 'BOT_001',
    botName: 'Customer Care Bot',
    currentStatus: 'DRAFT',
    statusHistory: [
      {
        status: 'DRAFT',
        changedAt: new Date().toISOString(),
        changedBy: 'System',
        notes: 'Initial bot configuration created',
      },
    ],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'REJECTED':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'SUBMITTED':
      case 'IN_REVIEW':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'DRAFT':
      default:
        return <AlertCircle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      case 'SUBMITTED':
      case 'IN_REVIEW':
        return 'secondary';
      case 'DRAFT':
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Draft - Incomplete';
      case 'SUBMITTED':
        return 'Submitted - Awaiting Review';
      case 'IN_REVIEW':
        return 'In Review - Being Processed';
      case 'APPROVED':
        return 'Approved - Ready for UAT';
      case 'REJECTED':
        return 'Rejected - Requires Revision';
      default:
        return status;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Complete the RCS configuration and business verification to submit for review.';
      case 'SUBMITTED':
        return 'Your submission has been received. Review process will begin shortly.';
      case 'IN_REVIEW':
        return 'Our team and operator are reviewing your application.';
      case 'APPROVED':
        return 'Congratulations! Your application is approved. UAT credentials will be provided.';
      case 'REJECTED':
        return 'Please address the feedback and resubmit your application.';
      default:
        return '';
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const updatedApproval = {
        ...approvalStatus,
        currentStatus: 'SUBMITTED' as const,
        submittedAt: new Date().toISOString(),
        slaDeadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        statusHistory: [
          ...approvalStatus.statusHistory,
          {
            status: 'SUBMITTED',
            changedAt: new Date().toISOString(),
            changedBy: 'User',
            notes: 'Application submitted for review',
          },
        ],
      };

      setApprovalStatus(updatedApproval);

      toast({
        title: 'Submitted Successfully',
        description:
          'Your RCS application has been submitted. You will receive updates within 3-10 working days.',
      });
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const updatedApproval = {
        ...approvalStatus,
        currentStatus: 'APPROVED' as const,
        approvedAt: new Date().toISOString(),
        operatorAgentId: `AGENT_${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        statusHistory: [
          ...approvalStatus.statusHistory,
          {
            status: 'APPROVED',
            changedAt: new Date().toISOString(),
            changedBy: selectedApprover || 'Operator',
            notes: 'Application approved. Agent ID generated.',
          },
        ],
      };

      setApprovalStatus(updatedApproval);
      setShowAssignDialog(false);

      toast({
        title: 'Approved Successfully',
        description: `Application approved. Agent ID: ${updatedApproval.operatorAgentId}`,
      });
    } catch (error) {
      toast({
        title: 'Approval Failed',
        description: 'Failed to approve application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Required',
        description: 'Please provide a reason for rejection.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const updatedApproval = {
        ...approvalStatus,
        currentStatus: 'REJECTED' as const,
        rejectionReason: rejectReason,
        statusHistory: [
          ...approvalStatus.statusHistory,
          {
            status: 'REJECTED',
            changedAt: new Date().toISOString(),
            changedBy: selectedApprover || 'Reviewer',
            notes: rejectReason,
          },
        ],
      };

      setApprovalStatus(updatedApproval);
      setShowRejectDialog(false);
      setRejectReason('');

      toast({
        title: 'Application Rejected',
        description: 'The applicant has been notified and can resubmit.',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Rejection Failed',
        description: 'Failed to reject application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToinReview = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const updatedApproval = {
        ...approvalStatus,
        currentStatus: 'IN_REVIEW' as const,
        assignedReviewerId: selectedApprover,
        statusHistory: [
          ...approvalStatus.statusHistory,
          {
            status: 'IN_REVIEW',
            changedAt: new Date().toISOString(),
            changedBy: 'System',
            notes: `Assigned to ${
              APPROVERS.find((a) => a.id === selectedApprover)?.name ||
              'Reviewer'
            }`,
          },
        ],
      };

      setApprovalStatus(updatedApproval);
      setShowAssignDialog(false);
      setSelectedApprover('');

      toast({
        title: 'Status Updated',
        description: 'Application moved to in-review status.',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {getStatusIcon(approvalStatus.currentStatus)}
            {approvalStatus.botName}
          </CardTitle>
          <CardDescription>Approval & Verification Status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Status</p>
                <p className="text-lg font-semibold">
                  {getStatusLabel(approvalStatus.currentStatus)}
                </p>
              </div>
              <Badge variant={getStatusColor(approvalStatus.currentStatus)}>
                {approvalStatus.currentStatus}
              </Badge>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {getStatusDescription(approvalStatus.currentStatus)}
              </AlertDescription>
            </Alert>
          </div>

          {/* Timeline/Status Timeline */}
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold text-sm">Approval Timeline</h4>

            {approvalStatus.slaDeadline && (
              <div className="flex gap-2 items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Calendar className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">
                    SLA Deadline
                  </p>
                  <p className="text-xs text-blue-700">
                    {new Date(approvalStatus.slaDeadline).toLocaleDateString(
                      'en-IN',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }
                    )}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {approvalStatus.statusHistory.map((history, index) => (
                <div key={index} className="relative">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      {index === approvalStatus.statusHistory.length - 1 ? (
                        getStatusIcon(history.status)
                      ) : (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      )}
                      {index < approvalStatus.statusHistory.length - 1 && (
                        <div className="w-1 h-12 bg-gray-300 my-1" />
                      )}
                    </div>

                    <div className="flex-1 pt-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            index === approvalStatus.statusHistory.length - 1
                              ? getStatusColor(history.status)
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {history.status}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">{history.notes}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(history.changedAt).toLocaleDateString(
                          'en-IN'
                        )}{' '}
                        • {new Date(history.changedAt).toLocaleTimeString()} •{' '}
                        {history.changedBy}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Info */}
          {approvalStatus.operatorAgentId && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-900">
                RCS Agent ID Assigned
              </p>
              <p className="text-lg font-mono text-green-700 mt-1">
                {approvalStatus.operatorAgentId}
              </p>
            </div>
          )}

          {approvalStatus.operatorFeedback && (
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex gap-2">
                <MessageSquare className="w-4 h-4 text-yellow-700 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-900">
                    Operator Feedback
                  </p>
                  <p className="text-sm text-yellow-800 mt-1">
                    {approvalStatus.operatorFeedback}
                  </p>
                </div>
              </div>
            </div>
          )}

          {approvalStatus.rejectionReason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <p className="font-semibold mb-1">Rejection Reason:</p>
                <p>{approvalStatus.rejectionReason}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Admin Actions */}
          {approvalStatus.currentStatus === 'DRAFT' && (
            <div className="flex gap-2 pt-4 border-t justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Submit for Review
              </Button>
            </div>
          )}

          {approvalStatus.currentStatus === 'SUBMITTED' && (
            <div className="flex gap-2 pt-4 border-t justify-end">
              <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isLoading}>
                    Move to Review
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Assign Reviewer</DialogTitle>
                    <DialogDescription>
                      Select a reviewer to handle this application
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="approver-select">Assign to</Label>
                      <Select
                        value={selectedApprover}
                        onValueChange={setSelectedApprover}
                      >
                        <SelectTrigger id="approver-select">
                          <SelectValue placeholder="Select reviewer" />
                        </SelectTrigger>
                        <SelectContent>
                          {APPROVERS.filter(
                            (a) => a.role === 'REVIEWER' || a.role === 'ADMIN'
                          ).map((approver) => (
                            <SelectItem key={approver.id} value={approver.id}>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {approver.name} ({approver.role})
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setShowAssignDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleMoveToinReview}
                        disabled={!selectedApprover || isLoading}
                      >
                        Assign & Move
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {approvalStatus.currentStatus === 'IN_REVIEW' && (
            <div className="flex gap-2 pt-4 border-t justify-end">
              <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" disabled={isLoading}>
                    Reject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Reject Application</DialogTitle>
                    <DialogDescription>
                      Provide detailed feedback for the rejection
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Textarea
                      placeholder="Enter rejection reason..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={4}
                    />
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="outline"
                        onClick={() => setShowRejectDialog(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleReject}
                        disabled={!rejectReason.trim() || isLoading}
                      >
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleApprove}
                disabled={isLoading}
                className="gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Approve Application
              </Button>
            </div>
          )}

          {approvalStatus.currentStatus === 'REJECTED' && (
            <div className="flex gap-2 pt-4 border-t justify-end">
              <Button
                onClick={handleSubmit}
                disabled={isLoading}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Resubmit Application
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Requirements Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Approval Checklist
          </CardTitle>
          <CardDescription>
            Items required for successful approval
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { title: 'RCS Configuration', completed: true },
              { title: 'Business Verification', completed: false },
              { title: 'Document Approval', completed: false },
              { title: 'Operator Review', completed: false },
              { title: 'Legal Compliance', completed: false },
              { title: 'Template Approval', completed: false },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 p-3 rounded-lg border"
              >
                {item.completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                )}
                <span
                  className={
                    item.completed
                      ? 'text-green-700 font-medium'
                      : 'text-gray-600'
                  }
                >
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
