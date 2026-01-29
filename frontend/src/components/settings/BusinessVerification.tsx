import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  FileText,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Eye,
  Download,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DocumentFile {
  id: string;
  type: 'GST' | 'PAN' | 'COI' | 'MSME';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedAt: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'REUPLOAD_REQUIRED';
  notes?: string;
}

interface BusinessVerificationData {
  companyName: string;
  legalEntityName: string;
  address: string;
  website: string;
  industryType: string;
  businessDescription: string;
  documents: DocumentFile[];
  overallStatus: 'NOT_STARTED' | 'IN_REVIEW' | 'VERIFIED' | 'FAILED';
  submittedAt?: string;
  approvedAt?: string;
}

const INDUSTRY_TYPES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'E-Commerce',
  'Logistics',
  'Retail',
  'Telecommunications',
  'Manufacturing',
  'Services',
  'Other',
];

const DOCUMENT_TYPES = [
  {
    id: 'GST',
    label: 'GST Certificate',
    description: 'GST Registration Certificate (GSTIN)',
    required: true,
    maxSize: 5,
  },
  {
    id: 'PAN',
    label: 'PAN Card',
    description: 'Permanent Account Number Certificate',
    required: true,
    maxSize: 5,
  },
  {
    id: 'COI',
    label: 'Certificate of Incorporation',
    description: 'Company Registration Certificate',
    required: true,
    maxSize: 5,
  },
  {
    id: 'MSME',
    label: 'MSME Certificate',
    description: 'MSME Registration (if applicable)',
    required: false,
    maxSize: 5,
  },
];

export function BusinessVerification() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [businessData, setBusinessData] = useState<BusinessVerificationData>({
    companyName: '',
    legalEntityName: '',
    address: '',
    website: '',
    industryType: '',
    businessDescription: '',
    documents: [],
    overallStatus: 'NOT_STARTED',
  });

  const validateDocument = (file: File): boolean => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedFormats = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

    if (!allowedFormats.includes(file.type)) {
      toast({
        title: 'Invalid Format',
        description: 'Only PDF, PNG, JPG, JPEG formats are allowed.',
        variant: 'destructive',
      });
      return false;
    }

    if (file.size > maxSize) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 5MB.',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const handleDocumentUpload = (type: 'GST' | 'PAN' | 'COI' | 'MSME') => {
    fileInputRef.current?.click();
    fileInputRef.current?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!validateDocument(file)) return;

      const reader = new FileReader();
      reader.onload = () => {
        const newDoc: DocumentFile = {
          id: Date.now().toString(),
          type,
          fileName: file.name,
          fileUrl: reader.result as string,
          fileSize: file.size,
          uploadedAt: new Date().toISOString(),
          status: 'PENDING_REVIEW',
        };

        setBusinessData((prev) => ({
          ...prev,
          documents: [...prev.documents.filter((d) => d.type !== type), newDoc],
        }));

        toast({
          title: 'Document Uploaded',
          description: `${type} certificate uploaded successfully.`,
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeDocument = (id: string) => {
    setBusinessData((prev) => ({
      ...prev,
      documents: prev.documents.filter((d) => d.id !== id),
    }));
    toast({
      title: 'Document Removed',
      description: 'Document has been removed.',
    });
  };

  const handleApproveDocument = (id: string) => {
    setBusinessData((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === id ? { ...d, status: 'APPROVED' } : d
      ),
    }));
    toast({
      title: 'Document Approved',
      description: 'Document status updated to APPROVED.',
    });
  };

  const handleRejectDocument = (id: string) => {
    setRejectingDocId(id);
    setShowRejectDialog(true);
  };

  const confirmRejectDocument = () => {
    if (!rejectingDocId) return;

    setBusinessData((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === rejectingDocId
          ? {
              ...d,
              status: 'REUPLOAD_REQUIRED',
              notes: rejectionReason,
            }
          : d
      ),
    }));

    toast({
      title: 'Document Rejected',
      description: 'Document marked for reupload.',
      variant: 'destructive',
    });

    setShowRejectDialog(false);
    setRejectionReason('');
    setRejectingDocId(null);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
      case 'REUPLOAD_REQUIRED':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'PENDING_REVIEW':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'default';
      case 'REJECTED':
      case 'REUPLOAD_REQUIRED':
        return 'destructive';
      case 'PENDING_REVIEW':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleSubmit = async () => {
    const errors: string[] = [];

    if (!businessData.companyName.trim())
      errors.push('Company Name is required');
    if (!businessData.legalEntityName.trim())
      errors.push('Legal Entity Name is required');
    if (!businessData.address.trim()) errors.push('Address is required');
    if (!businessData.website.trim()) errors.push('Website URL is required');
    if (!businessData.industryType) errors.push('Industry Type is required');
    if (!businessData.businessDescription.trim())
      errors.push('Business Description is required');

    const requiredDocs = DOCUMENT_TYPES.filter((d) => d.required);
    const uploadedRequiredDocs = businessData.documents.filter((d) =>
      requiredDocs.some((rd) => rd.id === d.type)
    );

    if (uploadedRequiredDocs.length < requiredDocs.length) {
      errors.push('All required documents must be uploaded');
    }

    if (errors.length > 0) {
      toast({
        title: 'Validation Failed',
        description: errors.join('\n'),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Send to API
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const updatedData = {
        ...businessData,
        overallStatus: 'IN_REVIEW' as const,
        submittedAt: new Date().toISOString(),
      };
      setBusinessData(updatedData);

      toast({
        title: 'Submitted Successfully',
        description:
          'Business verification submitted. Our team will review within 24-48 hours.',
      });
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit verification data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Business Verification
          </CardTitle>
          <CardDescription>
            Submit your company details and required documents for verification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Status */}
          {businessData.overallStatus !== 'NOT_STARTED' && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Verification Status</p>
                    <p className="text-sm text-gray-600">
                      {businessData.overallStatus === 'IN_REVIEW' &&
                        'Your documents are under review. We will notify you of any updates.'}
                      {businessData.overallStatus === 'VERIFIED' &&
                        'All documents have been verified successfully.'}
                      {businessData.overallStatus === 'FAILED' &&
                        'Some documents require reupload. Please check the details below.'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      businessData.overallStatus === 'IN_REVIEW'
                        ? 'secondary'
                        : businessData.overallStatus === 'VERIFIED'
                          ? 'default'
                          : 'destructive'
                    }
                  >
                    {businessData.overallStatus}
                  </Badge>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Company Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Enter company name"
                  value={businessData.companyName}
                  onChange={(e) =>
                    setBusinessData({
                      ...businessData,
                      companyName: e.target.value,
                    })
                  }
                  disabled={businessData.overallStatus === 'VERIFIED'}
                />
              </div>

              <div>
                <Label htmlFor="legalEntityName">Legal Entity Name *</Label>
                <Input
                  id="legalEntityName"
                  placeholder="Enter legal entity name"
                  value={businessData.legalEntityName}
                  onChange={(e) =>
                    setBusinessData({
                      ...businessData,
                      legalEntityName: e.target.value,
                    })
                  }
                  disabled={businessData.overallStatus === 'VERIFIED'}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  placeholder="Enter full business address"
                  value={businessData.address}
                  onChange={(e) =>
                    setBusinessData({
                      ...businessData,
                      address: e.target.value,
                    })
                  }
                  disabled={businessData.overallStatus === 'VERIFIED'}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="website">Website URL *</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://example.com"
                  value={businessData.website}
                  onChange={(e) =>
                    setBusinessData({
                      ...businessData,
                      website: e.target.value,
                    })
                  }
                  disabled={businessData.overallStatus === 'VERIFIED'}
                />
              </div>

              <div>
                <Label htmlFor="industryType">Industry Type *</Label>
                <Select
                  value={businessData.industryType}
                  onValueChange={(value) =>
                    setBusinessData({
                      ...businessData,
                      industryType: value,
                    })
                  }
                  disabled={businessData.overallStatus === 'VERIFIED'}
                >
                  <SelectTrigger id="industryType">
                    <SelectValue placeholder="Select industry type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRY_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="businessDescription">
                  Business Description *
                </Label>
                <Textarea
                  id="businessDescription"
                  placeholder="Describe your business and its operations"
                  value={businessData.businessDescription}
                  onChange={(e) =>
                    setBusinessData({
                      ...businessData,
                      businessDescription: e.target.value,
                    })
                  }
                  disabled={businessData.overallStatus === 'VERIFIED'}
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-lg">Required Documents</h3>
            <p className="text-sm text-gray-600">
              Upload all required documents in PDF or image format (max 5MB each)
            </p>

            <ScrollArea className="h-auto">
              <div className="space-y-3">
                {DOCUMENT_TYPES.map((docType) => {
                  const uploadedDoc = businessData.documents.find(
                    (d) => d.type === docType.id
                  );

                  return (
                    <div
                      key={docType.id}
                      className="p-4 border rounded-lg space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">
                            {docType.label}
                            {docType.required && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {docType.description}
                          </p>
                        </div>
                      </div>

                      {uploadedDoc ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                            <div className="flex items-center gap-3 flex-1">
                              {getStatusIcon(uploadedDoc.status)}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {uploadedDoc.fileName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(uploadedDoc.fileSize / 1024).toFixed(2)} KB
                                  {' • '}
                                  {new Date(
                                    uploadedDoc.uploadedAt
                                  ).toLocaleDateString()}
                                </p>
                              </div>
                            </div>

                            <Badge
                              variant={getStatusBadgeVariant(
                                uploadedDoc.status
                              )}
                              className="ml-2 flex-shrink-0"
                            >
                              {uploadedDoc.status.replace(/_/g, ' ')}
                            </Badge>
                          </div>

                          {uploadedDoc.status === 'REUPLOAD_REQUIRED' &&
                            uploadedDoc.notes && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  <p className="font-medium">Rejection Reason:</p>
                                  <p className="text-sm">{uploadedDoc.notes}</p>
                                </AlertDescription>
                              </Alert>
                            )}

                          <div className="flex gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      // Open file viewer
                                      window.open(uploadedDoc.fileUrl, '_blank');
                                    }}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Document</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            {uploadedDoc.status === 'REUPLOAD_REQUIRED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDocumentUpload(
                                  docType.id as 'GST' | 'PAN' | 'COI' | 'MSME'
                                )}
                                disabled={isLoading}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Reupload
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeDocument(uploadedDoc.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleDocumentUpload(
                            docType.id as 'GST' | 'PAN' | 'COI' | 'MSME'
                          )}
                          disabled={isLoading}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload {docType.label}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-4 border-t justify-end">
            <Button variant="outline">Save as Draft</Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || businessData.overallStatus === 'VERIFIED'}
            >
              {isLoading ? 'Submitting...' : 'Submit for Verification'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rejection Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Reject Document?</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-4">
              <p>
                Please provide a reason for rejection. This will help the client
                reupload the correct document.
              </p>
              <Textarea
                placeholder="Enter rejection reason..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRejectDocument}
              disabled={!rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Reject & Notify
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
      />
    </div>
  );
}
