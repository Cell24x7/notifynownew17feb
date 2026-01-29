import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  Copy, 
  Check,
  CheckCircle2,
  Server,
  Shield,
  Loader2,
  AlertCircle,
  Send,
  Inbox,
  Settings,
  FileText,
  Eye,
  EyeOff
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface EmailConfig {
  // SMTP Settings
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  smtpEncryption: string;
  
  // IMAP Settings (for receiving)
  imapHost: string;
  imapPort: string;
  imapUsername: string;
  imapPassword: string;
  imapEncryption: string;
  
  // Sender Settings
  senderName: string;
  senderEmail: string;
  replyToEmail: string;
  
  // Features
  enableTracking: boolean;
  enableUnsubscribe: boolean;
}

interface EmailConfigurationProps {
  onSave?: (config: EmailConfig) => void;
  onCancel?: () => void;
}

export function EmailConfiguration({ onSave, onCancel }: EmailConfigurationProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showImapPassword, setShowImapPassword] = useState(false);
  
  const [config, setConfig] = useState<EmailConfig>({
    smtpHost: '',
    smtpPort: '587',
    smtpUsername: '',
    smtpPassword: '',
    smtpEncryption: 'tls',
    imapHost: '',
    imapPort: '993',
    imapUsername: '',
    imapPassword: '',
    imapEncryption: 'ssl',
    senderName: '',
    senderEmail: '',
    replyToEmail: '',
    enableTracking: true,
    enableUnsubscribe: true,
  });

  // Auto-generated webhook URLs (mock)
  const webhookBaseUrl = 'https://api.yourplatform.com/webhooks/email';
  const incomingWebhookUrl = `${webhookBaseUrl}/incoming/${Math.random().toString(36).substring(7)}`;

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied!', description: 'Copied to clipboard' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTestConnection = async () => {
    if (!config.smtpHost || !config.smtpUsername || !config.smtpPassword) {
      toast({
        title: 'Missing Configuration',
        description: 'Please fill in all SMTP settings before testing.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.3;
    setTestSuccess(success);
    
    toast({
      title: success ? '✅ Connection Successful' : '❌ Connection Failed',
      description: success 
        ? 'SMTP connection verified successfully.' 
        : 'Failed to connect. Please check your credentials.',
      variant: success ? 'default' : 'destructive',
    });
    
    setIsTesting(false);
  };

  const handleSave = () => {
    if (!config.smtpHost || !config.senderEmail) {
      toast({
        title: 'Missing Configuration',
        description: 'Please fill in required SMTP and sender settings.',
        variant: 'destructive',
      });
      return;
    }

    onSave?.(config);
    toast({
      title: '✅ Email Channel activated',
      description: 'Email channel is now ready to use.',
    });
  };

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orange-500/10">
            <Mail className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Connect Email Channel</h2>
            <p className="text-sm text-muted-foreground">
              Configure SMTP/IMAP to send and receive emails
            </p>
          </div>
        </div>

        {/* SMTP Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Send className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">SMTP Settings (Outgoing)</CardTitle>
            </div>
            <CardDescription>Configure your outgoing mail server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>SMTP Host *</Label>
                <Input 
                  placeholder="smtp.example.com"
                  value={config.smtpHost}
                  onChange={(e) => setConfig({...config, smtpHost: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>SMTP Port</Label>
                <Select 
                  value={config.smtpPort}
                  onValueChange={(value) => setConfig({...config, smtpPort: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 (Standard)</SelectItem>
                    <SelectItem value="465">465 (SSL)</SelectItem>
                    <SelectItem value="587">587 (TLS)</SelectItem>
                    <SelectItem value="2525">2525 (Alternative)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Username *</Label>
                <Input 
                  placeholder="your@email.com"
                  value={config.smtpUsername}
                  onChange={(e) => setConfig({...config, smtpUsername: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Password *</Label>
                <div className="relative">
                  <Input 
                    type={showSmtpPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={config.smtpPassword}
                    onChange={(e) => setConfig({...config, smtpPassword: e.target.value})}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                  >
                    {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Encryption</Label>
                <Select 
                  value={config.smtpEncryption}
                  onValueChange={(value) => setConfig({...config, smtpEncryption: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={handleTestConnection}
              disabled={isTesting}
              className="w-full"
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing Connection...
                </>
              ) : testSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                  Connection Verified
                </>
              ) : (
                <>
                  <Server className="h-4 w-4 mr-2" />
                  Test SMTP Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* IMAP Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Inbox className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-base">IMAP Settings (Incoming)</CardTitle>
            </div>
            <CardDescription>Configure your incoming mail server to receive emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>IMAP Host</Label>
                <Input 
                  placeholder="imap.example.com"
                  value={config.imapHost}
                  onChange={(e) => setConfig({...config, imapHost: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>IMAP Port</Label>
                <Select 
                  value={config.imapPort}
                  onValueChange={(value) => setConfig({...config, imapPort: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="143">143 (Standard)</SelectItem>
                    <SelectItem value="993">993 (SSL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Username</Label>
                <Input 
                  placeholder="your@email.com"
                  value={config.imapUsername}
                  onChange={(e) => setConfig({...config, imapUsername: e.target.value})}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Password</Label>
                <div className="relative">
                  <Input 
                    type={showImapPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={config.imapPassword}
                    onChange={(e) => setConfig({...config, imapPassword: e.target.value})}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowImapPassword(!showImapPassword)}
                  >
                    {showImapPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Encryption</Label>
                <Select 
                  value={config.imapEncryption}
                  onValueChange={(value) => setConfig({...config, imapEncryption: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="ssl">SSL</SelectItem>
                    <SelectItem value="tls">TLS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sender Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Sender Information</CardTitle>
            </div>
            <CardDescription>Configure how your emails appear to recipients</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sender Name *</Label>
                <Input 
                  placeholder="Your Company"
                  value={config.senderName}
                  onChange={(e) => setConfig({...config, senderName: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Name shown in recipient's inbox
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Sender Email *</Label>
                <Input 
                  type="email"
                  placeholder="hello@yourcompany.com"
                  value={config.senderEmail}
                  onChange={(e) => setConfig({...config, senderEmail: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  From address for outgoing emails
                </p>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label>Reply-To Email</Label>
                <Input 
                  type="email"
                  placeholder="support@yourcompany.com"
                  value={config.replyToEmail}
                  onChange={(e) => setConfig({...config, replyToEmail: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Where replies should be sent
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Webhook Configuration</CardTitle>
            </div>
            <CardDescription>Webhooks for email events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Incoming Email Webhook URL</Label>
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
            </div>
          </CardContent>
        </Card>

        {/* Email Features */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Email Features</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Open & Click Tracking</p>
                <p className="text-xs text-muted-foreground">Track when emails are opened and links are clicked</p>
              </div>
              <Switch
                checked={config.enableTracking}
                onCheckedChange={(checked) => setConfig({...config, enableTracking: checked})}
              />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Unsubscribe Link</p>
                <p className="text-xs text-muted-foreground">Automatically add unsubscribe link to emails</p>
              </div>
              <Switch
                checked={config.enableUnsubscribe}
                onCheckedChange={(checked) => setConfig({...config, enableUnsubscribe: checked})}
              />
            </div>
          </CardContent>
        </Card>

        {/* Messaging Features */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Email Capabilities</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Send className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Transactional Emails</p>
                  <p className="text-xs text-muted-foreground">Order confirmations, etc.</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Mail className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Marketing Campaigns</p>
                  <p className="text-xs text-muted-foreground">Newsletters & promotions</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Inbox className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Two-way Email</p>
                  <p className="text-xs text-muted-foreground">Receive & reply to emails</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <FileText className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Email Templates</p>
                  <p className="text-xs text-muted-foreground">Reusable HTML templates</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Make sure your email domain has proper SPF, DKIM, and DMARC records configured for better deliverability.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save & Activate Email
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
