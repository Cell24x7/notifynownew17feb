import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import API_BASE_URL from "../config/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileUpload, CheckCircle, Clock, AlertCircle, Upload, Eye, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OnboardingData {
  // Business Info
  companyName: string;
  legalEntityName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  website: string;
  industryType: string;
  businessDescription: string;

  // Contact Person
  contactName: string;
  contactEmail: string;
  contactMobile: string;

  // Documents
  documents: Record<string, File | null>;

  // RCS Details
  brandName: string;
  brandTagline: string;
  useCases: string[];
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
}

const industryTypes = [
  'Retail & E-commerce',
  'Banking & Finance',
  'Travel & Hospitality',
  'Healthcare',
  'Education',
  'Logistics',
  'Media & Entertainment',
  'Telecom',
  'FMCG',
  'Technology',
  'Other'
];

const useCaseOptions = [
  'OTP & Authentication',
  'Order Updates',
  'Payment Notifications',
  'Appointment Reminders',
  'Marketing & Promotions',
  'Customer Support',
  'Transactional Updates',
  'Account Alerts'
];

const requiredDocuments = [
  { id: 'gst', label: 'GST Certificate', required: true },
  { id: 'pan', label: 'PAN Card', required: true },
  { id: 'incorporation', label: 'Certificate of Incorporation', required: true },
  { id: 'msme', label: 'MSME Certificate', required: false },
  { id: 'logo', label: 'Brand Logo (PNG/JPG)', required: true },
  { id: 'address_proof', label: 'Address Proof', required: true }
];

export default function RCSOnboarding() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('business');
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadedFile | null>>({});
  const [formData, setFormData] = useState<OnboardingData>({
    companyName: '',
    legalEntityName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    website: '',
    industryType: '',
    businessDescription: '',
    contactName: '',
    contactEmail: '',
    contactMobile: '',
    documents: {},
    brandName: '',
    brandTagline: '',
    useCases: []
  });

  const [submitting, setSubmitting] = useState(false);
  const [completionStatus, setCompletionStatus] = useState({
    business: 0,
    contact: 0,
    documents: 0,
    rcs: 0
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    updateCompletionStatus();
  };

  const handleUseCase = (useCase: string) => {
    setFormData(prev => ({
      ...prev,
      useCases: prev.useCases.includes(useCase)
        ? prev.useCases.filter(u => u !== useCase)
        : [...prev.useCases, useCase]
    }));
  };

  const handleFileUpload = (docId: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive'
      });
      return;
    }

    setUploadedFiles(prev => ({
      ...prev,
      [docId]: {
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toLocaleString()
      }
    }));

    setFormData(prev => ({
      ...prev,
      documents: { ...prev.documents, [docId]: file }
    }));

    toast({
      title: 'File Uploaded',
      description: `${file.name} uploaded successfully`
    });

    updateCompletionStatus();
  };

  const removeFile = (docId: string) => {
    setUploadedFiles(prev => {
      const updated = { ...prev };
      delete updated[docId];
      return updated;
    });

    setFormData(prev => ({
      ...prev,
      documents: { ...prev.documents, [docId]: null }
    }));
  };

  const updateCompletionStatus = () => {
    const calculateStatus = (fields: string[]): number => {
      const filled = fields.filter(f => {
        const value = formData[f as keyof OnboardingData];
        return value && value !== '';
      }).length;
      return Math.round((filled / fields.length) * 100);
    };

    setCompletionStatus({
      business: calculateStatus(['companyName', 'legalEntityName', 'address', 'city', 'state', 'pincode', 'website', 'industryType', 'businessDescription']),
      contact: calculateStatus(['contactName', 'contactEmail', 'contactMobile']),
      documents: Object.keys(uploadedFiles).length * 20,
      rcs: calculateStatus(['brandName', 'brandTagline']) + (formData.useCases.length > 0 ? 33 : 0)
    });
  };

  const handleSubmit = async () => {
    // Validate all required fields
    if (!formData.companyName || !formData.contactEmail || !formData.brandName) {
      toast({
        title: 'Missing Required Fields',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);

    try {
      // Prepare FormData for file upload
      const submitData = new FormData();
      
      // Add all form fields
      Object.keys(formData).forEach(key => {
        if (key !== 'documents') {
          const value = formData[key as keyof OnboardingData];
          if (Array.isArray(value)) {
            submitData.append(key, JSON.stringify(value));
          } else {
            submitData.append(key, String(value));
          }
        }
      });

      // Add files
      Object.entries(formData.documents).forEach(([key, file]) => {
        if (file) {
          submitData.append(`file_${key}`, file);
        }
      });

    // Submit to backend
const response = await fetch(
  `${API_BASE_URL}/api/rcs/onboarding`,
  {
    method: 'POST',
    body: submitData
  }
);
      if (response.ok) {
        toast({
          title: 'Onboarding Submitted',
          description: 'Your RCS onboarding application has been submitted for review'
        });
        // Reset form
        setFormData({
          companyName: '',
          legalEntityName: '',
          address: '',
          city: '',
          state: '',
          pincode: '',
          website: '',
          industryType: '',
          businessDescription: '',
          contactName: '',
          contactEmail: '',
          contactMobile: '',
          documents: {},
          brandName: '',
          brandTagline: '',
          useCases: []
        });
        setUploadedFiles({});
      } else {
        toast({
          title: 'Submission Failed',
          description: 'Please try again',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred during submission',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">🚀 RCS Onboarding</h1>
        <p className="text-gray-600">Complete the onboarding process to enable RCS messaging for your business</p>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Business Info', status: completionStatus.business },
          { title: 'Contact Details', status: completionStatus.contact },
          { title: 'Documents', status: completionStatus.documents },
          { title: 'RCS Details', status: completionStatus.rcs }
        ].map(item => (
          <Card key={item.title}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">{item.status}%</div>
                <p className="text-sm text-gray-600">{item.title}</p>
                <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all" 
                    style={{ width: `${item.status}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Form Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Application Form</CardTitle>
          <CardDescription>Fill in all required information</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="rcs">RCS Details</TabsTrigger>
            </TabsList>

            {/* Business Tab */}
            <TabsContent value="business" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Company Name *</Label>
                  <Input
                    value={formData.companyName}
                    onChange={e => handleInputChange('companyName', e.target.value)}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <Label>Legal Entity Name *</Label>
                  <Input
                    value={formData.legalEntityName}
                    onChange={e => handleInputChange('legalEntityName', e.target.value)}
                    placeholder="As per registration"
                  />
                </div>
              </div>

              <div>
                <Label>Website URL *</Label>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={e => handleInputChange('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Industry Type *</Label>
                  <Select value={formData.industryType} onValueChange={value => handleInputChange('industryType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industryTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={e => handleInputChange('city', e.target.value)}
                    placeholder="City"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <Label>State</Label>
                  <Input
                    value={formData.state}
                    onChange={e => handleInputChange('state', e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label>Pincode</Label>
                  <Input
                    value={formData.pincode}
                    onChange={e => handleInputChange('pincode', e.target.value)}
                    placeholder="000000"
                  />
                </div>
              </div>

              <div>
                <Label>Full Address *</Label>
                <Textarea
                  value={formData.address}
                  onChange={e => handleInputChange('address', e.target.value)}
                  placeholder="Enter full business address"
                  rows={3}
                />
              </div>

              <div>
                <Label>Business Description</Label>
                <Textarea
                  value={formData.businessDescription}
                  onChange={e => handleInputChange('businessDescription', e.target.value)}
                  placeholder="Describe your business operations"
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Contact Tab */}
            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Contact Name *</Label>
                  <Input
                    value={formData.contactName}
                    onChange={e => handleInputChange('contactName', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div>
                  <Label>Contact Email *</Label>
                  <Input
                    type="email"
                    value={formData.contactEmail}
                    onChange={e => handleInputChange('contactEmail', e.target.value)}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <Label>Contact Mobile *</Label>
                <Input
                  type="tel"
                  value={formData.contactMobile}
                  onChange={e => handleInputChange('contactMobile', e.target.value)}
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>Note:</strong> All documents must be clear, legible scans/photos. Maximum file size: 5MB each
                </p>
              </div>

              {requiredDocuments.map(doc => (
                <div key={doc.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-base font-semibold">
                        {doc.label}
                        {doc.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                    </div>
                    {uploadedFiles[doc.id] && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-600">Uploaded</span>
                      </div>
                    )}
                  </div>

                  {uploadedFiles[doc.id] ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{uploadedFiles[doc.id]?.name}</p>
                        <p className="text-xs text-gray-500">
                          {uploadedFiles[doc.id]?.size} bytes • {uploadedFiles[doc.id]?.uploadedAt}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeFile(doc.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        onChange={e => e.target.files && handleFileUpload(doc.id, e.target.files[0])}
                        className="hidden"
                        id={`file-${doc.id}`}
                      />
                      <label htmlFor={`file-${doc.id}`} className="cursor-pointer block">
                        <Upload className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm font-medium text-gray-700">Click to upload</p>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF • Max 5MB</p>
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </TabsContent>

            {/* RCS Details Tab */}
            <TabsContent value="rcs" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Brand Name for RCS *</Label>
                  <Input
                    value={formData.brandName}
                    onChange={e => handleInputChange('brandName', e.target.value)}
                    placeholder="How should your brand appear in RCS?"
                  />
                </div>
                <div>
                  <Label>Brand Tagline</Label>
                  <Input
                    value={formData.brandTagline}
                    onChange={e => handleInputChange('brandTagline', e.target.value)}
                    placeholder="e.g., Premium Online Shopping"
                  />
                </div>
              </div>

              <div>
                <Label>Intended Use Cases *</Label>
                <p className="text-sm text-gray-600 mb-3">Select all that apply:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {useCaseOptions.map(useCase => (
                    <div key={useCase} className="flex items-center">
                      <input
                        type="checkbox"
                        id={useCase}
                        checked={formData.useCases.includes(useCase)}
                        onChange={() => handleUseCase(useCase)}
                        className="w-4 h-4"
                      />
                      <label htmlFor={useCase} className="ml-2 text-sm cursor-pointer">
                        {useCase}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                      <p className="font-semibold mb-2">RCS Agent Creation Timeline:</p>
                      <ul className="space-y-1 text-xs">
                        <li>✅ Document verification: 2-3 business days</li>
                        <li>✅ Approval from operator: 3-5 business days</li>
                        <li>✅ Agent creation: 1-2 business days</li>
                        <li>✅ Template approval: 1-2 business days</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Submit Button */}
          <div className="mt-8 flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting || completionStatus.business < 100 || completionStatus.contact < 100 || completionStatus.documents < 60}
              className="flex-1"
              size="lg"
            >
              {submitting ? 'Submitting...' : 'Submit Onboarding Application'}
            </Button>
            <Button variant="outline" size="lg">
              Save as Draft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
