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
  Instagram, 
  Copy, 
  Check,
  ExternalLink,
  CheckCircle2,
  Building2,
  Users,
  Webhook,
  FileText,
  Image,
  Loader2,
  AlertCircle,
  MessageCircle,
  Heart,
  AtSign
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface InstagramConfig {
  // Business Account Info (populated after embedded signup)
  instagramAccountId: string;
  instagramUsername: string;
  pageId: string;
  pageName: string;
  accessToken: string;
  followersCount: number;
  
  // Webhook Configuration
  webhookUrl: string;
  webhookVerifyToken: string;
}

interface InstagramConfigurationProps {
  onSave?: (config: InstagramConfig) => void;
  onCancel?: () => void;
}

export function InstagramConfiguration({ onSave, onCancel }: InstagramConfigurationProps) {
  const { toast } = useToast();
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const [config, setConfig] = useState<InstagramConfig>({
    instagramAccountId: '',
    instagramUsername: '',
    pageId: '',
    pageName: '',
    accessToken: '',
    followersCount: 0,
    webhookUrl: '',
    webhookVerifyToken: '',
  });

  // Auto-generated webhook URLs (mock)
  const webhookBaseUrl = 'https://api.yourplatform.com/webhooks/instagram';
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
    
    // Simulate Facebook/Instagram Business Login flow
    toast({
      title: 'Opening Instagram Business Login',
      description: 'Please complete the Instagram authorization in the popup window.',
    });

    // Mock the signup process
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock successful signup response
    const mockFollowers = Math.floor(Math.random() * 50000) + 1000;
    setConfig({
      ...config,
      instagramAccountId: 'IG_' + Math.random().toString(36).substring(7).toUpperCase(),
      instagramUsername: '@yourbusiness',
      pageId: '1234567890123456',
      pageName: 'Your Business Page',
      accessToken: 'EAA' + Math.random().toString(36).substring(2, 30) + '...',
      followersCount: mockFollowers,
      webhookUrl: incomingWebhookUrl,
      webhookVerifyToken: verifyToken,
    });
    
    setIsSigningUp(false);
    setSignupComplete(true);
    
    toast({
      title: '✅ Instagram Account Connected',
      description: 'Your Instagram Business Account has been successfully linked.',
    });
  };

  const handleSave = () => {
    if (!signupComplete) {
      toast({
        title: 'Login Required',
        description: 'Please complete the Instagram Business Login first.',
        variant: 'destructive',
      });
      return;
    }

    onSave?.(config);
    toast({
      title: '✅ Instagram DM Channel activated',
      description: 'Instagram Direct Messages is now ready to use.',
    });
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M';
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K';
    return count.toString();
  };

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400">
            <Instagram className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Connect Instagram Direct Messages</h2>
            <p className="text-sm text-muted-foreground">
              Connect your Instagram Business Account using Facebook Business Login
            </p>
          </div>
        </div>

        {/* Embedded Signup Section */}
        <Card className={signupComplete ? 'border-pink-500/50 bg-pink-500/5' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-500" />
                <CardTitle className="text-base">Instagram Business Login</CardTitle>
              </div>
              {signupComplete && (
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              )}
            </div>
            <CardDescription>
              Use Facebook's Business Login to connect your Instagram Professional Account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!signupComplete ? (
              <>
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Instagram Business Login allows you to connect an Instagram Professional Account 
                    (Business or Creator) and receive direct messages through the Instagram API.
                  </AlertDescription>
                </Alert>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h4 className="font-medium text-sm">Requirements:</h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                      An Instagram Professional Account (Business or Creator)
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                      A Facebook Page connected to your Instagram account
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                      Admin access to the connected Facebook Page
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                      Instagram account must have "Allow access to messages" enabled
                    </li>
                  </ul>
                </div>

                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <h4 className="font-medium text-sm">Permissions requested:</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      <MessageCircle className="h-3 w-3 mr-1" />
                      instagram_manage_messages
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <AtSign className="h-3 w-3 mr-1" />
                      instagram_basic
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      pages_manage_metadata
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Image className="h-3 w-3 mr-1" />
                      instagram_manage_comments
                    </Badge>
                  </div>
                </div>

                <Button 
                  onClick={handleEmbeddedSignup}
                  disabled={isSigningUp}
                  className="w-full bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500 text-white"
                  size="lg"
                >
                  {isSigningUp ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Connecting to Instagram...
                    </>
                  ) : (
                    <>
                      <Instagram className="h-5 w-5 mr-2" />
                      Continue with Instagram
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By continuing, you agree to Instagram's{' '}
                  <a href="#" className="text-primary hover:underline">Terms of Use</a>
                  {' '}and{' '}
                  <a href="#" className="text-primary hover:underline">Platform Policy</a>
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg">
                  <CheckCircle2 className="h-8 w-8 text-pink-500" />
                  <div>
                    <p className="font-medium">Successfully Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Your Instagram Business Account is linked and ready to receive DMs
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Info - Only show after signup */}
        {signupComplete && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Instagram className="h-5 w-5 text-pink-500" />
                  <CardTitle className="text-base">Instagram Account Info</CardTitle>
                </div>
                <CardDescription>Your connected Instagram Business Account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Account Preview Card */}
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center">
                    <Instagram className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{config.instagramUsername}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {formatFollowers(config.followersCount)} followers
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Business Account
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
                    <Label>Instagram Account ID</Label>
                    <div className="flex gap-2">
                      <Input value={config.instagramAccountId} readOnly className="bg-muted font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleCopy(config.instagramAccountId, 'igId')}
                      >
                        {copiedField === 'igId' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <div className="flex items-center gap-2">
                      <AtSign className="h-4 w-4 text-pink-500" />
                      <Input value={config.instagramUsername.replace('@', '')} readOnly className="bg-muted" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Connected Facebook Page</Label>
                    <Input value={config.pageName} readOnly className="bg-muted" />
                  </div>
                  
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
                    This token is used to authenticate Instagram API requests
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
                    Add this URL to your Meta App's Instagram webhook configuration
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
                    Subscribe to the following webhook fields: <code className="bg-muted px-1 rounded">messages</code>, <code className="bg-muted px-1 rounded">messaging_postbacks</code>, <code className="bg-muted px-1 rounded">messaging_seen</code>
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
                <CardDescription>Available Instagram messaging capabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Direct Messages</p>
                      <p className="text-xs text-muted-foreground">Send and receive DMs</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-pink-500/10">
                      <Heart className="h-4 w-4 text-pink-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Story Mentions</p>
                      <p className="text-xs text-muted-foreground">Respond to story replies</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Image className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Media Messages</p>
                      <p className="text-xs text-muted-foreground">Send images & videos</p>
                    </div>
                    <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="p-2 rounded-lg bg-orange-500/10">
                      <AtSign className="h-4 w-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Comment Replies</p>
                      <p className="text-xs text-muted-foreground">Private replies to comments</p>
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
                      <div className="p-2 rounded-lg bg-pink-500/10">
                        <Instagram className="h-4 w-4 text-pink-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Instagram Settings</p>
                        <p className="text-xs text-muted-foreground">Manage account settings</p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-3" asChild>
                    <a href="#" className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <Building2 className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Meta Business Suite</p>
                        <p className="text-xs text-muted-foreground">Manage connected pages</p>
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
                        <p className="font-medium">Ice Breakers</p>
                        <p className="text-xs text-muted-foreground">Set up conversation starters</p>
                      </div>
                      <ExternalLink className="h-4 w-4 ml-auto" />
                    </a>
                  </Button>
                  
                  <Button variant="outline" className="justify-start h-auto py-3" asChild>
                    <a href="https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login" target="_blank" className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gray-500/10">
                        <FileText className="h-4 w-4 text-gray-500" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">API Documentation</p>
                        <p className="text-xs text-muted-foreground">Instagram Graph API docs</p>
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
            className="flex-1 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 hover:from-purple-700 hover:via-pink-600 hover:to-orange-500 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save & Activate Instagram
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
