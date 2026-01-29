import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, 
  Copy, 
  Check,
  ExternalLink,
  CheckCircle2,
  Building2,
  Phone,
  Webhook,
  FileText,
  Shield,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface WhatsAppConfig {
  // Business Account Info (populated after embedded signup)
  businessName: string;
  phoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  
  // Webhook Configuration
  webhookUrl: string;
  webhookVerifyToken: string;
}

interface WhatsAppConfigurationProps {
  onSave?: (config: WhatsAppConfig) => void;
  onCancel?: () => void;
}

export function WhatsAppConfiguration({ onSave, onCancel }: WhatsAppConfigurationProps) {
  const { toast } = useToast();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [config, setConfig] = useState<WhatsAppConfig>({
    businessName: '',
    phoneNumber: '',
    phoneNumberId: '',
    wabaId: '',
    accessToken: '',
    webhookUrl: '',
    webhookVerifyToken: '',
  });

  // Auto-generated webhook URLs (mock)
  const webhookBaseUrl = 'https://api.yourplatform.com/webhooks/whatsapp';
  const incomingWebhookUrl = `${webhookBaseUrl}/incoming/${Math.random().toString(36).substring(7)}`;
  const verifyToken = `verify_${Math.random().toString(36).substring(2, 15)}`;

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied!', description: 'Copied to clipboard' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleEmbeddedSignup = async () => {
    setIsSigningUp(true);
    
    // Simulate Facebook Embedded Signup flow
    // In real implementation, this would open Facebook's OAuth popup
    toast({
      title: 'Opening Facebook Login',
      description: 'Please complete the WhatsApp Business signup in the popup window.',
    });

    // Mock the signup process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock successful signup response
    setConfig({
      ...config,
      businessName: 'Your Business Name',
      phoneNumber: '+1 234 567 8900',
      phoneNumberId: '1234567890123456',
      wabaId: 'WABA_' + Math.random().toString(36).substring(7).toUpperCase(),
      accessToken: 'EAA' + Math.random().toString(36).substring(2, 30) + '...',
      webhookUrl: incomingWebhookUrl,
      webhookVerifyToken: verifyToken,
    });
    
    setIsSigningUp(false);
    setSignupComplete(true);
    
    toast({
      title: '✅ WhatsApp Business Connected',
      description: 'Your WhatsApp Business Account has been successfully linked.',
    });
  };

  const handleSave = () => {
    if (!signupComplete) {
      toast({
        title: 'Signup Required',
        description: 'Please complete the Embedded Signup first.',
        variant: 'destructive',
      });
      return;
    }

    onSave?.(config);
    toast({
      title: '✅ WhatsApp Channel activated',
      description: 'WhatsApp Business is now ready to use.',
    });
  };

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-green-500/10">
            <MessageSquare className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Connect WhatsApp Business</h2>
            <p className="text-sm text-muted-foreground">
              Connect your WhatsApp Business Account using Facebook Embedded Signup
            </p>
          </div>
        </div>

        {/* Embedded Signup Section */}
        <Card className={signupComplete ? 'border-green-500/50 bg-green-500/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">WhatsApp Embedded Signup</CardTitle>
              </div>
              {signupComplete && (
                <Badge className="bg-green-500 text-white">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
            <CardDescription>
              Use Facebook's Embedded Signup to quickly connect your WhatsApp Business Account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!signupComplete ? (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Embedded Signup allows you to create or connect a WhatsApp Business Account, 
                    register a phone number, and generate access tokens — all in one streamlined flow.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">What you'll need:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      A Facebook Business account (or create one during signup)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      A phone number not already registered with WhatsApp
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      Business verification documents (for verified badge)
                    </li>
                  </ul>
                </div>

                <Button 
                  onClick={handleEmbeddedSignup}
                  disabled={isSigningUp}
                  className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white"
                  size="lg"
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Connecting to Facebook...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                      Continue with Facebook
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By continuing, you agree to WhatsApp's{' '}
                  <a href="#" className="text-primary hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-primary hover:underline">Business Policy</a>
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <div>
                    <p className="font-medium">Successfully Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Your WhatsApp Business Account is linked and ready to use
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Account Info - Only show after signup */}
        {signupComplete && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Business Account Info</CardTitle>
                </div>
                <CardDescription>Your connected WhatsApp Business Account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input value={config.businessName} readOnly className="bg-muted" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-500" />
                      <Input value={config.phoneNumber} readOnly className="bg-muted" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Phone Number ID</Label>
                    <div className="flex gap-2">
                      <Input value={config.phoneNumberId} readOnly className="bg-muted font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(config.phoneNumberId, 'phoneId')}
                      >
                        {copiedField === 'phoneId' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>WhatsApp Business Account ID</Label>
                    <div className="flex gap-2">
                      <Input value={config.wabaId} readOnly className="bg-muted font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(config.wabaId, 'wabaId')}
                      >
                        {copiedField === 'wabaId' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Access Token</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={config.accessToken} 
                      readOnly 
                      type="password"
                      className="bg-muted font-mono text-sm" 
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(config.accessToken, 'token')}
                    >
                      {copiedField === 'token' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This token is used to authenticate API requests
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Webhook Configuration */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Webhook Configuration</CardTitle>
                </div>
                <CardDescription>
                  Configure these webhooks in your Meta App Dashboard to receive messages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Callback URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={incomingWebhookUrl}
                      readOnly
                      className="bg-muted font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(incomingWebhookUrl, 'webhook')}
                    >
                      {copiedField === 'webhook' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add this URL to your Meta App's WhatsApp webhook configuration
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Verify Token</Label>
                  <div className="flex gap-2">
                    <Input
                      value={verifyToken}
                      readOnly
                      className="bg-muted font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(verifyToken, 'verifyToken')}
                    >
                      {copiedField === 'verifyToken' ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use this token to verify webhook ownership
                  </p>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Subscribe to the following webhook fields: <code className="bg-muted px-1 rounded">messages</code>, <code className="bg-muted px-1 rounded">message_template_status_update</code>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Quick Actions</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button variant="outline" className="justify-start h-auto py-3" asChild>
                    <a href="#" className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <FileText className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Message Templates</p>
                        <p className="text-xs text-muted-foreground">Create and manage templates</p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-3" asChild>
                    <a href="#" className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Building2 className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Business Profile</p>
                        <p className="text-xs text-muted-foreground">Update business details</p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-3" asChild>
                    <a href="#" className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Shield className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Business Verification</p>
                        <p className="text-xs text-muted-foreground">Get verified badge</p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-3" asChild>
                    <a 
                      href="https://developers.facebook.com/docs/whatsapp" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3"
                    >
                      <div className="p-2 rounded-lg bg-orange-500/10">
                        <ExternalLink className="h-4 w-4 text-orange-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">API Documentation</p>
                        <p className="text-xs text-muted-foreground">View WhatsApp API docs</p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pb-6">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="gradient-primary"
            disabled={!signupComplete}
          >
            Save & Activate WhatsApp
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
