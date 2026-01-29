import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  PhoneOff,
  MessageSquare,
  Zap,
  Settings,
  Plus,
  Edit2,
  Trash2,
  TestTube,
  Clock,
  AlertTriangle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FallbackRule {
  id: string;
  name: string;
  enabled: boolean;
  conditions: {
    rcsDeliveryFailed: boolean;
    rcsNotSupported: boolean;
    noInternet: boolean;
    timeout: boolean;
  };
  fallbackChannel: 'sms' | 'whatsapp' | 'email' | 'call';
  priority: 1 | 2 | 3;
  description: string;
  createdAt: string;
  lastModified: string;
}

interface RoutingTest {
  id: string;
  phoneNumber: string;
  message: string;
  status: 'pending' | 'success' | 'failed';
  routeTaken: string;
  timestamp: string;
}

const mockRules: FallbackRule[] = [
  {
    id: 'RULE001',
    name: 'SMS Fallback',
    enabled: true,
    conditions: {
      rcsDeliveryFailed: true,
      rcsNotSupported: true,
      noInternet: false,
      timeout: false
    },
    fallbackChannel: 'sms',
    priority: 1,
    description: 'Fallback to SMS when RCS delivery fails or device not supported',
    createdAt: '2026-01-20',
    lastModified: '2026-01-26'
  },
  {
    id: 'RULE002',
    name: 'WhatsApp Backup',
    enabled: true,
    conditions: {
      rcsDeliveryFailed: true,
      rcsNotSupported: false,
      noInternet: true,
      timeout: true
    },
    fallbackChannel: 'whatsapp',
    priority: 2,
    description: 'Fallback to WhatsApp for connectivity issues',
    createdAt: '2026-01-18',
    lastModified: '2026-01-25'
  }
];

const mockTests: RoutingTest[] = [
  {
    id: 'TEST001',
    phoneNumber: '+919876543210',
    message: 'Test OTP message',
    status: 'success',
    routeTaken: 'RCS (Primary)',
    timestamp: '2026-01-26 14:30'
  },
  {
    id: 'TEST002',
    phoneNumber: '+919876543211',
    message: 'Test transactional message',
    status: 'success',
    routeTaken: 'SMS (Fallback)',
    timestamp: '2026-01-26 14:25'
  },
  {
    id: 'TEST003',
    phoneNumber: '+919876543212',
    message: 'Test promotional message',
    status: 'failed',
    routeTaken: 'All channels failed',
    timestamp: '2026-01-26 14:20'
  }
];

export default function RCSFallbackRouting() {
  const { toast } = useToast();
  const [rules, setRules] = useState<FallbackRule[]>(mockRules);
  const [tests, setTests] = useState<RoutingTest[]>(mockTests);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<FallbackRule | null>(null);
  const [ruleToDelete, setRuleToDelete] = useState<FallbackRule | null>(null);

  // Form states
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [fallbackChannel, setFallbackChannel] = useState<'sms' | 'whatsapp' | 'email' | 'call'>('sms');
  const [rulePriority, setRulePriority] = useState<1 | 2 | 3>(1);
  const [conditions, setConditions] = useState({
    rcsDeliveryFailed: true,
    rcsNotSupported: true,
    noInternet: false,
    timeout: false
  });

  // Test form states
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Test RCS message');
  const [testingInProgress, setTestingInProgress] = useState(false);

  const handleCreateRule = async () => {
    if (!ruleName) {
      toast({
        title: 'Required Field',
        description: 'Please enter a rule name',
        variant: 'destructive'
      });
      return;
    }

    const newRule: FallbackRule = {
      id: `RULE${String(rules.length + 1).padStart(3, '0')}`,
      name: ruleName,
      enabled: true,
      conditions,
      fallbackChannel,
      priority: rulePriority,
      description: ruleDescription,
      createdAt: new Date().toISOString().split('T')[0],
      lastModified: new Date().toISOString().split('T')[0]
    };

    setRules([...rules, newRule]);
    setIsRuleDialogOpen(false);
    resetRuleForm();

    toast({
      title: 'Created',
      description: 'Fallback rule created successfully'
    });
  };

  const handleToggleRule = (id: string) => {
    const updated = rules.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    setRules(updated);
  };

  const handleDeleteRule = () => {
    if (!ruleToDelete) return;
    setRules(rules.filter(r => r.id !== ruleToDelete.id));
    setRuleToDelete(null);
    toast({
      title: 'Deleted',
      description: 'Fallback rule deleted successfully'
    });
  };

  const handleTestRouting = async () => {
    if (!testPhoneNumber) {
      toast({
        title: 'Required Field',
        description: 'Please enter a phone number',
        variant: 'destructive'
      });
      return;
    }

    setTestingInProgress(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      const newTest: RoutingTest = {
        id: `TEST${String(tests.length + 1).padStart(3, '0')}`,
        phoneNumber: testPhoneNumber,
        message: testMessage,
        status: 'success',
        routeTaken: 'RCS (Primary)',
        timestamp: new Date().toLocaleString()
      };

      setTests([newTest, ...tests]);
      setIsTestDialogOpen(false);
      setTestPhoneNumber('');
      setTestMessage('Test RCS message');

      toast({
        title: 'Test Completed',
        description: `Message routed via ${newTest.routeTaken}`
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Failed to test routing',
        variant: 'destructive'
      });
    } finally {
      setTestingInProgress(false);
    }
  };

  const resetRuleForm = () => {
    setRuleName('');
    setRuleDescription('');
    setFallbackChannel('sms');
    setRulePriority(1);
    setConditions({
      rcsDeliveryFailed: true,
      rcsNotSupported: true,
      noInternet: false,
      timeout: false
    });
  };

  const activeRules = rules.filter(r => r.enabled).length;
  const successfulTests = tests.filter(t => t.status === 'success').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">📲 Fallback Routing</h1>
          <p className="text-gray-600">Configure RCS fallback channels and routing rules</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsTestDialogOpen(true)} variant="outline">
            <TestTube className="w-4 h-4 mr-2" />
            Test Routing
          </Button>
          <Button onClick={() => setIsRuleDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Rules</p>
                <p className="text-3xl font-bold">{rules.length}</p>
              </div>
              <Settings className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Rules</p>
                <p className="text-3xl font-bold">{activeRules}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tests Performed</p>
                <p className="text-3xl font-bold">{tests.length}</p>
              </div>
              <TestTube className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                <p className="text-3xl font-bold">{Math.round((successfulTests / tests.length) * 100)}%</p>
              </div>
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fallback Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Fallback Rules</CardTitle>
          <CardDescription>Define rules for channel fallback</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {rules.map(rule => (
              <div key={rule.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{rule.name}</h3>
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                      <Badge variant="outline">Priority {rule.priority}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

                    {/* Conditions */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-semibold text-gray-700 mb-2">TRIGGERS:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {rule.conditions.rcsDeliveryFailed && (
                          <span className="text-xs bg-red-100 text-red-700 rounded px-2 py-1">
                            RCS Delivery Failed
                          </span>
                        )}
                        {rule.conditions.rcsNotSupported && (
                          <span className="text-xs bg-blue-100 text-blue-700 rounded px-2 py-1">
                            RCS Not Supported
                          </span>
                        )}
                        {rule.conditions.noInternet && (
                          <span className="text-xs bg-orange-100 text-orange-700 rounded px-2 py-1">
                            No Internet
                          </span>
                        )}
                        {rule.conditions.timeout && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 rounded px-2 py-1">
                            Timeout
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fallback Channel */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">Fallback to:</span>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        {rule.fallbackChannel === 'sms' && <MessageSquare className="w-3 h-3 mr-1" />}
                        {rule.fallbackChannel === 'whatsapp' && <MessageSquare className="w-3 h-3 mr-1" />}
                        {rule.fallbackChannel === 'call' && <PhoneOff className="w-3 h-3 mr-1" />}
                        {rule.fallbackChannel.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleRule(rule.id)}
                    >
                      <CheckCircle className={`w-4 h-4 ${rule.enabled ? 'text-green-600' : 'text-gray-300'}`} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRuleToDelete(rule)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Routing Tests */}
      <Card>
        <CardHeader>
          <CardTitle>Routing Tests</CardTitle>
          <CardDescription>View results of routing tests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Route Taken</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map(test => (
                  <TableRow key={test.id}>
                    <TableCell className="font-mono text-sm">{test.phoneNumber}</TableCell>
                    <TableCell className="text-sm truncate max-w-xs">{test.message}</TableCell>
                    <TableCell className="text-sm">{test.routeTaken}</TableCell>
                    <TableCell>
                      {test.status === 'success' ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Success
                        </Badge>
                      ) : test.status === 'pending' ? (
                        <Badge variant="outline">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 border-red-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">{test.timestamp}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Guide */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Guide</CardTitle>
          <CardDescription>Best practices for fallback routing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">✅ Primary Route (RCS)</h4>
            <p className="text-sm text-blue-800">
              RCS is the primary channel. Use rich elements like buttons, cards, carousels, and images for
              better user experience.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">🔄 Fallback Channels</h4>
            <ul className="text-sm text-green-800 list-disc list-inside space-y-1">
              <li><strong>SMS:</strong> Plain text, 160 characters limit</li>
              <li><strong>WhatsApp:</strong> WhatsApp Business API, supports media</li>
              <li><strong>Email:</strong> For longer content with formatting</li>
              <li><strong>Call:</strong> Voice calls for critical alerts</li>
            </ul>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">⚠️ Important Notes</h4>
            <ul className="text-sm text-orange-800 list-disc list-inside space-y-1">
              <li>Rules are evaluated in priority order</li>
              <li>First matching rule's fallback channel is used</li>
              <li>Test routing before deploying to production</li>
              <li>Monitor fallback rates to identify issues</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Create Rule Dialog */}
      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Fallback Rule</DialogTitle>
            <DialogDescription>Define when and how messages should fallback to other channels</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Rule Name *</Label>
              <Input
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
                placeholder="e.g., SMS Fallback for All"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={ruleDescription}
                onChange={e => setRuleDescription(e.target.value)}
                placeholder="Describe when this rule applies..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fallback Channel *</Label>
                <select
                  value={fallbackChannel}
                  onChange={e => setFallbackChannel(e.target.value as any)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                  <option value="call">Call</option>
                </select>
              </div>

              <div>
                <Label>Priority *</Label>
                <select
                  value={rulePriority}
                  onChange={e => setRulePriority(parseInt(e.target.value) as any)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value={1}>1 (Highest)</option>
                  <option value={2}>2 (Medium)</option>
                  <option value={3}>3 (Lowest)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="mb-3 block">Trigger Conditions</Label>
              <div className="space-y-2 bg-gray-50 rounded-lg p-4">
                {Object.entries(conditions).map(([key, value]) => (
                  <label key={key} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={e =>
                        setConditions({ ...conditions, [key]: e.target.checked })
                      }
                      className="w-4 h-4"
                    />
                    <span className="ml-2 text-sm capitalize">
                      {key
                        .replace(/([A-Z])/g, ' $1')
                        .toLowerCase()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRule}>
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Routing Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Test Message Routing</DialogTitle>
            <DialogDescription>Test how your message will be routed</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Phone Number *</Label>
              <Input
                value={testPhoneNumber}
                onChange={e => setTestPhoneNumber(e.target.value)}
                placeholder="+919876543210"
              />
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                value={testMessage}
                onChange={e => setTestMessage(e.target.value)}
                placeholder="Enter test message..."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                <strong>Note:</strong> This will send a test message and show which channel it was routed through.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)} disabled={testingInProgress}>
              Cancel
            </Button>
            <Button onClick={handleTestRouting} disabled={testingInProgress}>
              {testingInProgress ? 'Testing...' : 'Test Routing'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Rule Alert */}
      <AlertDialog open={!!ruleToDelete} onOpenChange={() => setRuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{ruleToDelete?.name}"? This cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRule} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
