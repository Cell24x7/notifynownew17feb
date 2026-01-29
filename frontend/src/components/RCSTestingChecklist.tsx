import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Share2,
  AlertTriangle,
  Zap,
  MessageSquare,
  Users,
  Settings,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'not-started' | 'in-progress' | 'passed' | 'failed';
  priority: 'high' | 'medium' | 'low';
  steps: string[];
  expectedResult: string;
  notes?: string;
}

const testCases: TestCase[] = [
  {
    id: 'TEST001',
    name: 'Onboarding Form Submission',
    description: 'Verify that onboarding form can be submitted with all required fields',
    category: 'Onboarding',
    status: 'passed',
    priority: 'high',
    steps: [
      'Fill in all business information fields',
      'Upload required documents',
      'Select RCS use cases',
      'Click Submit button',
      'Verify success message'
    ],
    expectedResult: 'Form submitted successfully with confirmation message'
  },
  {
    id: 'TEST002',
    name: 'Document Upload Validation',
    description: 'Verify document upload with file size and type validation',
    category: 'Documents',
    status: 'passed',
    priority: 'high',
    steps: [
      'Try uploading oversized file (>5MB)',
      'Try uploading unsupported file type',
      'Upload valid documents',
      'Verify all files are accepted'
    ],
    expectedResult: 'Invalid files rejected with error messages, valid files accepted'
  },
  {
    id: 'TEST003',
    name: 'API Key Generation',
    description: 'Test API credential generation and management',
    category: 'API Integration',
    status: 'passed',
    priority: 'high',
    steps: [
      'Navigate to API Credentials section',
      'Create new credential',
      'Copy API Key',
      'Copy API Secret',
      'Test credential in integration'
    ],
    expectedResult: 'API credentials generated and can be used for authentication'
  },
  {
    id: 'TEST004',
    name: 'Template Creation & Submission',
    description: 'Verify RCS template creation workflow',
    category: 'Templates',
    status: 'in-progress',
    priority: 'high',
    steps: [
      'Create new template',
      'Add template content with variables',
      'Add rich elements (buttons, cards)',
      'Preview template',
      'Submit for approval'
    ],
    expectedResult: 'Template created and submitted successfully'
  },
  {
    id: 'TEST005',
    name: 'Message Sending via API',
    description: 'Test sending RCS messages through API',
    category: 'API Integration',
    status: 'not-started',
    priority: 'high',
    steps: [
      'Prepare API request with valid credentials',
      'Include recipient phone number',
      'Include message content',
      'Send request',
      'Verify message delivery'
    ],
    expectedResult: 'Message sent successfully and received by recipient'
  },
  {
    id: 'TEST006',
    name: 'Fallback to SMS',
    description: 'Verify SMS fallback when RCS unavailable',
    category: 'Fallback',
    status: 'not-started',
    priority: 'high',
    steps: [
      'Send message to device without RCS support',
      'Monitor delivery route',
      'Verify SMS fallback triggered',
      'Confirm message received'
    ],
    expectedResult: 'Message delivered via SMS when RCS unavailable'
  },
  {
    id: 'TEST007',
    name: 'Rich Elements Display',
    description: 'Test rich elements rendering in RCS messages',
    category: 'Features',
    status: 'not-started',
    priority: 'medium',
    steps: [
      'Send message with buttons',
      'Send message with cards',
      'Send message with carousel',
      'Send message with images',
      'Verify all elements display correctly'
    ],
    expectedResult: 'All rich elements display correctly on recipient device'
  },
  {
    id: 'TEST008',
    name: 'Variable Substitution',
    description: 'Verify template variables are substituted correctly',
    category: 'Templates',
    status: 'not-started',
    priority: 'medium',
    steps: [
      'Create template with variables ({{name}}, {{code}})',
      'Send message with variable values',
      'Verify correct substitution',
      'Check multiple recipients'
    ],
    expectedResult: 'Variables correctly substituted in all messages'
  },
  {
    id: 'TEST009',
    name: 'Admin Approval Workflow',
    description: 'Test approval workflow for templates and applications',
    category: 'Admin',
    status: 'not-started',
    priority: 'medium',
    steps: [
      'Submit template for approval',
      'Login as admin',
      'Review submission',
      'Approve/reject',
      'Verify status change'
    ],
    expectedResult: 'Admin can approve/reject with proper status updates'
  },
  {
    id: 'TEST010',
    name: 'Error Handling',
    description: 'Verify proper error handling and user feedback',
    category: 'Error Handling',
    status: 'not-started',
    priority: 'medium',
    steps: [
      'Try invalid API key',
      'Try invalid phone number',
      'Send oversized message',
      'Simulate network error',
      'Verify error messages'
    ],
    expectedResult: 'Clear error messages displayed for all failure scenarios'
  },
  {
    id: 'TEST011',
    name: 'Performance - Message Throughput',
    description: 'Verify API can handle expected message volume',
    category: 'Performance',
    status: 'not-started',
    priority: 'low',
    steps: [
      'Send 100 messages in bulk',
      'Send 1000 messages in bulk',
      'Monitor response times',
      'Check delivery rate',
      'Verify no messages lost'
    ],
    expectedResult: 'All messages sent and delivered within SLA'
  },
  {
    id: 'TEST012',
    name: 'Security - Data Encryption',
    description: 'Verify sensitive data is encrypted',
    category: 'Security',
    status: 'not-started',
    priority: 'high',
    steps: [
      'Check API requests use HTTPS',
      'Verify API keys not logged',
      'Check database encryption',
      'Verify sensitive data masking'
    ],
    expectedResult: 'All sensitive data encrypted and protected'
  }
];

export default function RCSTestingChecklist() {
  const { toast } = useToast();
  const [tests, setTests] = useState<TestCase[]>(testCases);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const categories = ['All', ...new Set(tests.map(t => t.category))];
  const filteredTests = selectedCategory === 'All' ? tests : tests.filter(t => t.category === selectedCategory);

  const handleStatusChange = (id: string, newStatus: TestCase['status']) => {
    setTests(tests.map(t =>
      t.id === id ? { ...t, status: newStatus } : t
    ));
    toast({
      title: 'Status Updated',
      description: `Test case status updated to ${newStatus}`
    });
  };

  const calculateProgress = () => {
    const passed = tests.filter(t => t.status === 'passed').length;
    return Math.round((passed / tests.length) * 100);
  };

  const getStatusCounts = () => ({
    passed: tests.filter(t => t.status === 'passed').length,
    inProgress: tests.filter(t => t.status === 'in-progress').length,
    failed: tests.filter(t => t.status === 'failed').length,
    notStarted: tests.filter(t => t.status === 'not-started').length
  });

  const handleExportReport = () => {
    const report = `RCS Testing Checklist Report
Generated: ${new Date().toLocaleString()}

Progress: ${calculateProgress()}% Complete

Summary:
- Total Tests: ${tests.length}
- Passed: ${getStatusCounts().passed}
- Failed: ${getStatusCounts().failed}
- In Progress: ${getStatusCounts().inProgress}
- Not Started: ${getStatusCounts().notStarted}

Detailed Results:
${tests.map(t => `
[${t.status.toUpperCase()}] ${t.name}
Priority: ${t.priority}
Category: ${t.category}
Expected: ${t.expectedResult}
${t.notes ? `Notes: ${t.notes}` : ''}
`).join('\n')}`;

    const element = document.createElement('a');
    element.setAttribute('href', `data:text/plain;charset=utf-8,${encodeURIComponent(report)}`);
    element.setAttribute('download', 'rcs-testing-report.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: 'Report Exported',
      description: 'Testing report downloaded successfully'
    });
  };

  const statusCounts = getStatusCounts();
  const progress = calculateProgress();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">✅ Testing Checklist</h1>
          <p className="text-gray-600">Comprehensive RCS system testing and validation</p>
        </div>
        <Button onClick={handleExportReport} variant="outline" size="lg">
          <Download className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
              <p className="text-3xl font-bold text-blue-600">{progress}%</p>
              <Progress value={progress} className="mt-3" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{statusCounts.passed}</div>
              <p className="text-sm text-gray-600">Passed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{statusCounts.inProgress}</div>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">{statusCounts.failed}</div>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600 mb-2">{statusCounts.notStarted}</div>
              <p className="text-sm text-gray-600">Not Started</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            onClick={() => setSelectedCategory(cat)}
            size="sm"
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Test Cases */}
      <Accordion type="single" collapsible className="w-full">
        {filteredTests.map((test, index) => (
          <AccordionItem key={test.id} value={test.id}>
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3 w-full text-left">
                {/* Status Icon */}
                <div>
                  {test.status === 'passed' ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : test.status === 'failed' ? (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  ) : test.status === 'in-progress' ? (
                    <Clock className="w-5 h-5 text-yellow-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Test Info */}
                <div className="flex-1">
                  <p className="font-semibold">{test.name}</p>
                  <p className="text-sm text-gray-600">{test.description}</p>
                </div>

                {/* Badges */}
                <div className="flex gap-2">
                  <Badge variant={test.priority === 'high' ? 'destructive' : 'secondary'}>
                    {test.priority.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">{test.category}</Badge>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent>
              <div className="space-y-4 pt-4">
                {/* Steps */}
                <div>
                  <h4 className="font-semibold mb-2">Test Steps:</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {test.steps.map((step, idx) => (
                      <li key={idx} className="text-sm text-gray-700">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Expected Result */}
                <div>
                  <h4 className="font-semibold mb-2">Expected Result:</h4>
                  <p className="text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    {test.expectedResult}
                  </p>
                </div>

                {/* Status Selection */}
                <div>
                  <h4 className="font-semibold mb-2">Test Result:</h4>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant={test.status === 'passed' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(test.id, 'passed')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Passed
                    </Button>
                    <Button
                      size="sm"
                      variant={test.status === 'in-progress' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(test.id, 'in-progress')}
                    >
                      <Clock className="w-4 h-4 mr-1" />
                      In Progress
                    </Button>
                    <Button
                      size="sm"
                      variant={test.status === 'failed' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(test.id, 'failed')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Failed
                    </Button>
                    <Button
                      size="sm"
                      variant={test.status === 'not-started' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange(test.id, 'not-started')}
                    >
                      Not Started
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Recommendations */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Pre-Production Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-900">
            <li className="flex items-center gap-2">
              <Checkbox disabled checked={statusCounts.failed === 0} />
              <span>All critical tests passed (0 failures)</span>
            </li>
            <li className="flex items-center gap-2">
              <Checkbox disabled checked={statusCounts.notStarted === 0} />
              <span>All high-priority tests completed</span>
            </li>
            <li className="flex items-center gap-2">
              <Checkbox disabled checked={progress >= 80} />
              <span>Overall progress above 80%</span>
            </li>
            <li className="flex items-center gap-2">
              <Checkbox disabled checked={statusCounts.passed >= 8} />
              <span>At least 8 tests passed</span>
            </li>
            <li className="flex items-center gap-2">
              <Checkbox disabled />
              <span>Security audit completed</span>
            </li>
            <li className="flex items-center gap-2">
              <Checkbox disabled />
              <span>Performance benchmarks met</span>
            </li>
            <li className="flex items-center gap-2">
              <Checkbox disabled />
              <span>Documentation reviewed</span>
            </li>
            <li className="flex items-center gap-2">
              <Checkbox disabled />
              <span>Production environment verified</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Critical Issues */}
      {tests.some(t => t.status === 'failed') && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertTriangle className="w-5 h-5" />
              Critical Issues Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tests
                .filter(t => t.status === 'failed')
                .map(test => (
                  <div key={test.id} className="text-sm text-red-800">
                    <strong>• {test.name}:</strong> Priority {test.priority} - {test.description}
                  </div>
                ))}
            </div>
            <p className="mt-3 text-sm text-red-800 font-semibold">
              Please address these issues before proceeding to production.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Testing Documentation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-gray-700">
              <strong>Test Environment Setup:</strong> All tests should be conducted in the sandbox
              environment first. Use test credentials and phone numbers.
            </p>
            <p className="text-sm text-gray-700">
              <strong>Performance Testing:</strong> Run load tests to ensure the system can handle
              expected message volume (minimum 1000 msg/sec).
            </p>
            <p className="text-sm text-gray-700">
              <strong>Security Validation:</strong> Ensure all API endpoints use HTTPS, API keys
              are not logged, and sensitive data is encrypted.
            </p>
            <p className="text-sm text-gray-700">
              <strong>Compliance Check:</strong> Verify compliance with RCS operator requirements
              and carrier guidelines.
            </p>
            <Button className="mt-4" size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Testing Guide
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
