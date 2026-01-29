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
  Facebook, 
  Copy, 
  Check,
  ExternalLink,
  CheckCircle2,
  Building2,
  Users,
  Webhook,
  FileText,
  Loader2,
  AlertCircle,
  MessageCircle,
  Zap,
  Bot,
  Settings
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface MessengerConfig {
  // Page Info (populated after embedded signup)
  pageId: string;
  pageName: string;
  pageCategory: string;
  accessToken: string;
  appId: string;
  
  // Webhook Configuration
  webhookUrl: string;
  webhookVerifyToken: string;
}

interface MessengerConfigurationProps {
  onSave?: (config: MessengerConfig) => void;
  onCancel?: () => void;
}

export function MessengerConfiguration({ onSave, onCancel }: MessengerConfigurationProps) {
  const { toast } = useToast();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [config, setConfig] = useState<MessengerConfig>({
    pageId: '',
    pageName: '',
    pageCategory: '',
    accessToken: '',
    appId: '',
    webhookUrl: '',
    webhookVerifyToken: '',
  });

  // Auto-generated webhook URLs (mock)
  const webhookBaseUrl = 'https://api.yourplatform.com/webhooks/messenger';
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
    
    // Simulate Facebook Login flow
    toast({
      title: 'Opening Facebook Login',
      description: 'Please complete the Facebook Page authorization in the popup window.',
    });

    // Mock the signup process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock successful signup response
    setConfig({
      ...config,
      pageId: '1234567890123456',
      pageName: 'Your Business Page',
      pageCategory: 'Business',
      accessToken: 'EAA' + Math.random().toString(36).substring(2, 30) + '...',
      appId: 'APP_' + Math.random().toString(36).substring(7).toUpperCase(),
      webhookUrl: incomingWebhookUrl,
      webhookVerifyToken: verifyToken,
    });
    
    setIsSigningUp(false);
    setSignupComplete(true);
    
    toast({
      title: '✅ Facebook Page Connected',
      description: 'Your Facebook Page has been successfully linked for Messenger.',
    });
  };

  const handleSave = () => {
    if (!signupComplete) {
      toast({
        title: 'Login Required',
        description: 'Please complete the Facebook Login first.',
        variant: 'destructive',
      });
      return;
    }

    onSave?.(config);
    toast({
      title: '✅ Messenger Channel activated',
      description: 'Facebook Messenger is now ready to use.',
    });
  };

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#0866FF]">
            <Facebook className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Connect Facebook Messenger</h2>
            <p className="text-sm text-muted-foreground">
              Connect your Facebook Page to send and receive Messenger messages
            </p>
          </div>
        </div>

        {/* Embedded Signup Section */}
        <Card className={signupComplete ? 'border-[#0866FF]/50 bg-[#0866FF]/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Facebook className="h-5 w-5 text-[#0866FF]" />
                <CardTitle className="text-base">Facebook Page Login</CardTitle>
              </div>
              {signupComplete && (
                <Badge className="bg-[#0866FF] text-white border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
            <CardDescription>
              Use Facebook Login to connect your Page for Messenger integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!signupComplete ? (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Facebook Messenger integration allows you to receive and respond to messages 
                    from customers who contact your Facebook Page through Messenger.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Requirements:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#0866FF] mt-0.5 flex-shrink-0" />
                      A Facebook Page for your business
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#0866FF] mt-0.5 flex-shrink-0" />
                      Admin access to the Facebook Page
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#0866FF] mt-0.5 flex-shrink-0" />
                      Messaging enabled on your Page
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm">Permissions requested:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      pages_messaging
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Building2 className="h-3 w-3 mr-1" />
                      pages_manage_metadata
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      pages_read_engagement
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      pages_read_user_content
                    </Badge>
                  </div>
                </div>

                <Button 
                  onClick={handleEmbeddedSignup}
                  disabled={isSigningUp}
                  className="w-full bg-[#0866FF] hover:bg-[#0756d4] text-white"
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
                  By continuing, you agree to Facebook's{' '}
                  <a href="#" className="text-primary hover:underline">Terms of Service</a>
                  {' '}and{' '}
                  <a href="#" className="text-primary hover:underline">Platform Policy</a>
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-[#0866FF]/10 rounded-lg">
                  <CheckCircle2 className="h-8 w-8 text-[#0866FF]" />
                  <div>
                    <p className="font-medium">Successfully Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Your Facebook Page is linked and ready to receive Messenger messages
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Page Info - Only show after signup */}
        {signupComplete && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Facebook Page Info</CardTitle>
                </div>
                <CardDescription>Your connected Facebook Page details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Page Preview Card */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-[#0866FF] flex items-center justify-center">
                    <Facebook className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{config.pageName}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        {config.pageCategory}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        Messenger Enabled
                      </span>
                    </div>
                  </div>
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Page ID</Label>
                    <div className="flex gap-2">
                      <Input value={config.pageId} readOnly className="bg-muted font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(config.pageId, 'pageId')}
                      >
                        {copiedField === 'pageId' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Page Name</Label>
                    <Input value={config.pageName} readOnly className="bg-muted" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>App ID</Label>
                    <div className="flex gap-2">
                      <Input value={config.appId} readOnly className="bg-muted font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(config.appId, 'appId')}
                      >
                        {copiedField === 'appId' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Input value={config.pageCategory} readOnly className="bg-muted" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Page Access Token</Label>
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
                    This token is used to authenticate Messenger API requests
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
                    Add this URL to your Meta App's Messenger webhook configuration
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
                    Subscribe to the following webhook fields: <code className="bg-muted px-1 rounded">messages</code>, <code className="bg-muted px-1 rounded">messaging_postbacks</code>, <code className="bg-muted px-1 rounded">messaging_optins</code>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Messaging Features */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base">Messaging Features</CardTitle>
                </div>
                <CardDescription>Available Messenger capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Text Messages</p>
                      <p className="text-xs text-muted-foreground">Send and receive texts</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Zap className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Quick Replies</p>
                      <p className="text-xs text-muted-foreground">Interactive buttons</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Bot className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Persistent Menu</p>
                      <p className="text-xs text-muted-foreground">Always-visible menu</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <Settings className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Templates</p>
                      <p className="text-xs text-muted-foreground">Generic & receipt templates</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                </div>
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
                      <div className="p-2 rounded-lg bg-[#0866FF]/10">
                        <Facebook className="h-4 w-4 text-[#0866FF]" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Page Settings</p>
                        <p className="text-xs text-muted-foreground">Manage page settings</p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-3" asChild>
                    <a href="#" className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <MessageCircle className="h-4 w-4 text-purple-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Messenger Settings</p>
                        <p className="text-xs text-muted-foreground">Configure messaging</p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-3" asChild>
                    <a href="#" className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Bot className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Automated Responses</p>
                        <p className="text-xs text-muted-foreground">Set up auto-replies</p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-3" asChild>
                    <a href="https://developers.facebook.com/docs/messenger-platform" target="_blank" className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-500/10">
                        <FileText className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">API Documentation</p>
                        <p className="text-xs text-muted-foreground">Messenger Platform docs</p>
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
        <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!signupComplete}
            className="flex-1 bg-[#0866FF] hover:bg-[#0756d4] text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save & Activate Messenger
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
