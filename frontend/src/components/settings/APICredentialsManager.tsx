import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle,
  AlertCircle,
  Lock,
  Key,
  Shield,
  Download,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';

interface APICredential {
  id: string;
  environment: 'UAT' | 'PRODUCTION';
  rcsAgentId: string;
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  ipWhitelist: string[];
  rateLimitPerSecond: number;
  rateLimitPerDay: number;
  createdAt: string;
  createdBy: string;
  expiresAt?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'ROTATED' | 'REVOKED';
  rotationHistory?: Array<{
    rotatedAt: string;
    rotatedBy: string;
    reason: string;
  }>;
}

const ENDPOINTS = {
  UAT: {
    sendMessage: 'https://uat.rcs-api.operator.com/v1/messages/send',
    campaign: 'https://uat.rcs-api.operator.com/v1/campaigns',
    deliveryReport: 'https://uat.rcs-api.operator.com/v1/reports/delivery',
    capabilities: 'https://uat.rcs-api.operator.com/v1/capabilities/check',
  },
  PRODUCTION: {
    sendMessage: 'https://api.rcs-operator.com/v1/messages/send',
    campaign: 'https://api.rcs-operator.com/v1/campaigns',
    deliveryReport: 'https://api.rcs-operator.com/v1/reports/delivery',
    capabilities: 'https://api.rcs-operator.com/v1/capabilities/check',
  },
};

export function APICredentialsManager() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState<{ [key: string]: boolean }>({});
  const [showNewCredentialDialog, setShowNewCredentialDialog] =
    useState(false);
  const [showRotateDialog, setShowRotateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedCredentialId, setSelectedCredentialId] = useState<string | null>(
    null
  );

  const [credentials, setCredentials] = useState<APICredential[]>([
    {
      id: '1',
      environment: 'UAT',
      rcsAgentId: 'AGENT_UAT_001',
      apiKey: 'rcs_key_uat_a7f8b2c9d4e1f5g3h6',
      apiSecret: 'rcs_secret_uat_x9y8z7w6v5u4t3s2r1',
      webhookSecret: 'webhook_secret_uat_q1w2e3r4t5y6',
      ipWhitelist: ['203.0.113.0/24', '198.51.100.5', '192.0.2.10'],
      rateLimitPerSecond: 50,
      rateLimitPerDay: 100000,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      createdBy: 'admin@company.com',
      status: 'ACTIVE',
    },
  ]);

  const [newCredential, setNewCredential] = useState({
    environment: 'UAT' as 'UAT' | 'PRODUCTION',
    rateLimitPerSecond: 50,
    rateLimitPerDay: 100000,
    ipWhitelist: '',
  });

  const generateApiKey = () => {
    return `rcs_key_${newCredential.environment.toLowerCase()}_${Math.random()
      .toString(36)
      .substr(2, 20)}`;
  };

  const generateSecret = () => {
    return `rcs_secret_${newCredential.environment.toLowerCase()}_${Math.random()
      .toString(36)
      .substr(2, 20)}`;
  };

  const generateWebhookSecret = () => {
    return `webhook_secret_${Math.random()
      .toString(36)
      .substr(2, 20)}`;
  };

  const handleCreateCredential = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const credential: APICredential = {
        id: Date.now().toString(),
        environment: newCredential.environment,
        rcsAgentId: `AGENT_${newCredential.environment}_${Math.random()
          .toString(36)
          .substr(2, 3)
          .toUpperCase()}`,
        apiKey: generateApiKey(),
        apiSecret: generateSecret(),
        webhookSecret: generateWebhookSecret(),
        ipWhitelist: newCredential.ipWhitelist
          .split(',')
          .map((ip) => ip.trim())
          .filter((ip) => ip),
        rateLimitPerSecond: newCredential.rateLimitPerSecond,
        rateLimitPerDay: newCredential.rateLimitPerDay,
        createdAt: new Date().toISOString(),
        createdBy: 'admin@company.com',
        status: 'ACTIVE',
      };

      setCredentials([...credentials, credential]);
      setNewCredential({
        environment: 'UAT',
        rateLimitPerSecond: 50,
        rateLimitPerDay: 100000,
        ipWhitelist: '',
      });
      setShowNewCredentialDialog(false);

      toast({
        title: 'Credentials Generated',
        description: `${newCredential.environment} credentials created successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Failed',
        description: 'Failed to generate credentials. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRotateCredential = async () => {
    if (!selectedCredentialId) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setCredentials(
        credentials.map((cred) =>
          cred.id === selectedCredentialId
            ? {
                ...cred,
                apiKey: generateApiKey(),
                apiSecret: generateSecret(),
                webhookSecret: generateWebhookSecret(),
                status: 'ACTIVE',
                rotationHistory: [
                  ...(cred.rotationHistory || []),
                  {
                    rotatedAt: new Date().toISOString(),
                    rotatedBy: 'admin@company.com',
                    reason: 'Periodic rotation',
                  },
                ],
              }
            : cred
        )
      );

      setShowRotateDialog(false);
      setSelectedCredentialId(null);

      toast({
        title: 'Rotated Successfully',
        description: 'API keys have been rotated. Old keys are now inactive.',
      });
    } catch (error) {
      toast({
        title: 'Failed',
        description: 'Failed to rotate credentials. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeCredential = async () => {
    if (!selectedCredentialId) return;

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setCredentials(
        credentials.map((cred) =>
          cred.id === selectedCredentialId
            ? { ...cred, status: 'REVOKED' }
            : cred
        )
      );

      setShowRevokeDialog(false);
      setSelectedCredentialId(null);

      toast({
        title: 'Credentials Revoked',
        description:
          'API keys have been revoked and are no longer valid.',
        variant: 'destructive',
      });
    } catch (error) {
      toast({
        title: 'Failed',
        description: 'Failed to revoke credentials. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard.`,
    });
  };

  const toggleShowSecret = (id: string) => {
    setShowSecrets({
      ...showSecrets,
      [id]: !showSecrets[id],
    });
  };

  const downloadCredentials = (credential: APICredential) => {
    const env = ENDPOINTS[credential.environment];
    const content = `
RCS API Credentials - ${credential.environment} Environment
Generated: ${new Date(credential.createdAt).toLocaleString()}

AGENT DETAILS:
Agent ID: ${credential.rcsAgentId}

API KEYS:
API Key: ${credential.apiKey}
API Secret: ${credential.apiSecret}
Webhook Secret: ${credential.webhookSecret}

ENDPOINTS:
Send Message: ${env.sendMessage}
Campaign: ${env.campaign}
Delivery Report: ${env.deliveryReport}
Capabilities: ${env.capabilities}

RATE LIMITS:
Per Second: ${credential.rateLimitPerSecond}
Per Day: ${credential.rateLimitPerDay}

IP WHITELIST:
${credential.ipWhitelist.join('\n')}

STATUS: ${credential.status}

⚠️ Keep these credentials secure. Do not share in public repositories.
`;

    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/plain;charset=utf-8,' + encodeURIComponent(content)
    );
    element.setAttribute(
      'download',
      `rcs-credentials-${credential.environment}-${Date.now()}.txt`
    );
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    toast({
      title: 'Downloaded',
      description: 'Credentials file downloaded successfully.',
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="credentials" className="w-full">
        <TabsList>
          <TabsTrigger value="credentials">API Credentials</TabsTrigger>
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          {/* Create New Credential */}
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">API Credentials</h2>
            <Dialog
              open={showNewCredentialDialog}
              onOpenChange={setShowNewCredentialDialog}
            >
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Generate New Credentials
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Generate API Credentials</DialogTitle>
                  <DialogDescription>
                    Create new API credentials for your RCS integration
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="environment">Environment *</Label>
                    <Select
                      value={newCredential.environment}
                      onValueChange={(value) =>
                        setNewCredential({
                          ...newCredential,
                          environment: value as 'UAT' | 'PRODUCTION',
                        })
                      }
                    >
                      <SelectTrigger id="environment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UAT">UAT (Testing)</SelectItem>
                        <SelectItem value="PRODUCTION">
                          Production (Live)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-600 mt-1">
                      {newCredential.environment === 'UAT'
                        ? 'For testing and development'
                        : 'For live production traffic'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rps">Rate Limit (Per Second)</Label>
                      <Input
                        id="rps"
                        type="number"
                        min="1"
                        max="500"
                        value={newCredential.rateLimitPerSecond}
                        onChange={(e) =>
                          setNewCredential({
                            ...newCredential,
                            rateLimitPerSecond: parseInt(e.target.value) || 50,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="rpd">Rate Limit (Per Day)</Label>
                      <Input
                        id="rpd"
                        type="number"
                        min="1000"
                        value={newCredential.rateLimitPerDay}
                        onChange={(e) =>
                          setNewCredential({
                            ...newCredential,
                            rateLimitPerDay: parseInt(e.target.value) || 100000,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="ips">IP Whitelist (comma-separated)</Label>
                    <Textarea
                      id="ips"
                      placeholder="203.0.113.0/24, 198.51.100.5"
                      value={newCredential.ipWhitelist}
                      onChange={(e) =>
                        setNewCredential({
                          ...newCredential,
                          ipWhitelist: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Production credentials require additional verification and
                      approval
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowNewCredentialDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateCredential}
                      disabled={isLoading}
                    >
                      Generate Credentials
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Credentials List */}
          <div className="space-y-4">
            {credentials.length === 0 ? (
              <Card>
                <CardContent className="pt-8 text-center">
                  <Key className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-600">No credentials generated yet</p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowNewCredentialDialog(true)}
                  >
                    Generate First Credentials
                  </Button>
                </CardContent>
              </Card>
            ) : (
              credentials.map((credential) => (
                <Card key={credential.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">
                            {credential.environment} Environment
                          </h3>
                          <Badge
                            variant={
                              credential.status === 'ACTIVE'
                                ? 'default'
                                : credential.status === 'REVOKED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {credential.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Agent ID: {credential.rcsAgentId}
                        </p>
                      </div>

                      {credential.status === 'ACTIVE' && (
                        <div className="flex gap-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadCredentials(credential)}
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                Download Credentials
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedCredentialId(credential.id);
                              setShowRotateDialog(true);
                            }}
                            disabled={isLoading}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Rotate
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            onClick={() => {
                              setSelectedCredentialId(credential.id);
                              setShowRevokeDialog(true);
                            }}
                            disabled={isLoading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* API Keys */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">API Key</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={
                            showSecrets[`${credential.id}-apikey`]
                              ? credential.apiKey
                              : '•'.repeat(40)
                          }
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleShowSecret(`${credential.id}-apikey`)
                          }
                        >
                          {showSecrets[`${credential.id}-apikey`] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(credential.apiKey, 'API Key')
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* API Secret */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">API Secret</Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={
                            showSecrets[`${credential.id}-secret`]
                              ? credential.apiSecret
                              : '•'.repeat(40)
                          }
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleShowSecret(`${credential.id}-secret`)
                          }
                        >
                          {showSecrets[`${credential.id}-secret`] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(credential.apiSecret, 'API Secret')
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Webhook Secret */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Webhook Secret
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={
                            showSecrets[`${credential.id}-webhook`]
                              ? credential.webhookSecret
                              : '•'.repeat(40)
                          }
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            toggleShowSecret(`${credential.id}-webhook`)
                          }
                        >
                          {showSecrets[`${credential.id}-webhook`] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(
                              credential.webhookSecret,
                              'Webhook Secret'
                            )
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Rate Limits & IP Whitelist */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs text-gray-600">Per Second</p>
                        <p className="font-semibold">
                          {credential.rateLimitPerSecond}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Per Day</p>
                        <p className="font-semibold">
                          {credential.rateLimitPerDay.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {credential.ipWhitelist.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">
                          IP Whitelist
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {credential.ipWhitelist.map((ip) => (
                            <Badge key={ip} variant="outline">
                              {ip}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Meta Info */}
                    <div className="text-xs text-gray-600 pt-2 border-t">
                      <p>Created: {new Date(credential.createdAt).toLocaleString()}</p>
                      <p>By: {credential.createdBy}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="endpoints" className="space-y-4">
          {credentials
            .filter((c) => c.status === 'ACTIVE')
            .map((credential) => (
              <Card key={`endpoints-${credential.id}`}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {credential.environment} API Endpoints
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(
                    ENDPOINTS[credential.environment]
                  ).map(([key, url]) => (
                    <div key={key} className="space-y-1">
                      <p className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1')}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          readOnly
                          value={url}
                          className="font-mono text-xs"
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(url, key)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Best Practices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">API Key Management</p>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Never commit API keys to version control</li>
                    <li>Use environment variables for sensitive data</li>
                    <li>Rotate keys every 90 days</li>
                    <li>Revoke immediately if exposed</li>
                    <li>Use separate keys for UAT and Production</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">IP Whitelist</p>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Always use IP whitelisting for production</li>
                    <li>Only add IPs of your servers</li>
                    <li>Review whitelist regularly</li>
                    <li>Use CIDR notation for ranges</li>
                    <li>Monitor for unauthorized access</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold mb-2">
                    Webhook Secret Verification
                  </p>
                  <ul className="text-sm list-disc pl-5 space-y-1">
                    <li>Always verify webhook signatures</li>
                    <li>Use HMAC-SHA256 for verification</li>
                    <li>Implement rate limiting for webhooks</li>
                    <li>Log all webhook events</li>
                    <li>Set timeout for webhook processing</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Rotation Confirmation Dialog */}
      <AlertDialog open={showRotateDialog} onOpenChange={setShowRotateDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Rotate API Keys?</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-3">
              <p>
                This will generate new API keys and invalidate the old ones.
              </p>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Make sure you have updated your application with the new keys
                  before rotating. Old keys will become inactive immediately.
                </AlertDescription>
              </Alert>
            </div>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRotateCredential}
              disabled={isLoading}
            >
              {isLoading ? 'Rotating...' : 'Rotate Keys'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogTitle>Revoke Credentials?</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-3">
              <p className="font-medium">
                This action cannot be undone. All API calls using these
                credentials will fail immediately.
              </p>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  This will completely revoke the credentials. You will need to
                  generate new ones.
                </AlertDescription>
              </Alert>
            </div>
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeCredential}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Revoking...' : 'Revoke Credentials'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
