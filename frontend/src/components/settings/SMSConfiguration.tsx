import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Added imports
import { API_BASE_URL } from '@/config/api';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { 
  Phone, 
  Copy, 
  Check,
  Settings,
  Key,
  Webhook,
  MessageSquare,
  CreditCard,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  Plus
} from 'lucide-react';
import { SMSPreview } from './SMSPreview';
import { SMSBotsList } from './SMSBotsList'; // Added import

interface SMSConfig {
  // Basic Channel Info
  channelName: string;
  defaultSenderId: string;
  country: string;
  timezone: string;
  
  // API Credentials
  apiBaseUrl: string;
  apiKey: string;
  apiSecret: string;
  authType: string;
  
  // Message Settings
  messageType: string;
  enableLongSms: boolean;
  autoTrim: boolean;
  
  // Credit & Cost
  costPerSms: string;
  creditDeductionMode: string;
  initialCreditLimit: string;
  
  // Compliance & Safety
  optInRequired: boolean;
  optOutKeyword: string;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const countries = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];

const timezones = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'America/New_York', label: 'America/New_York (EST)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST)' },
  { value: 'Europe/London', label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST)' },
];

const authTypes = [
  { value: 'api_key', label: 'API Key' },
  { value: 'basic_auth', label: 'Basic Auth' },
  { value: 'bearer_token', label: 'Bearer Token' },
];

const messageTypes = [
  { value: 'gsm', label: 'GSM (160 chars)' },
  { value: 'unicode', label: 'Unicode (70 chars)' },
];

const creditDeductionModes = [
  { value: 'per_sms', label: 'Per SMS' },
  { value: 'per_segment', label: 'Per Segment' },
];

interface SMSConfigurationProps {
  onSave?: (config: SMSConfig) => void;
  onCancel?: () => void;
}

export function SMSConfiguration({ onSave, onCancel }: SMSConfigurationProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('create'); // State for active tab
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failure' | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [existingChannel, setExistingChannel] = useState<any>(null); // Track existing channel
  
  const [config, setConfig] = useState<SMSConfig>({
    channelName: '',
    defaultSenderId: '',
    country: '',
    timezone: '',
    apiBaseUrl: '',
    apiKey: '',
    apiSecret: '',
    authType: '',
    messageType: 'gsm',
    enableLongSms: true,
    autoTrim: false,
    costPerSms: '0.05',
    creditDeductionMode: 'per_sms',
    initialCreditLimit: '1000',
    optInRequired: true,
    optOutKeyword: 'STOP',
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
  });

  const checkExistingChannel = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get(`${API_BASE_URL}/api/sms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success && response.data.channels.length > 0) {
        setExistingChannel(response.data.channels[0]);
      } else {
        setExistingChannel(null);
      }
    } catch (error) {
      console.error('Error checking existing channels:', error);
    }
  };

  useEffect(() => {
    checkExistingChannel();
  }, []);

  // Auto-generated webhook URLs (mock)
  const webhookBaseUrl = 'https://api.yourplatform.com/webhooks/sms';
  const incomingWebhookUrl = `${webhookBaseUrl}/incoming/${Math.random().toString(36).substring(7)}`;
  const deliveryReportUrl = `${webhookBaseUrl}/delivery/${Math.random().toString(36).substring(7)}`;

  const getMaxCharacters = () => {
    if (config.messageType === 'gsm') {
      return config.enableLongSms ? '1530 (10 segments)' : '160';
    }
    return config.enableLongSms ? '670 (10 segments)' : '70';
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied!', description: 'URL copied to clipboard' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const validateConfig = () => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    if (!config.channelName.trim()) {
      newErrors.channelName = 'Channel Name is required';
      isValid = false;
    } else if (config.channelName.length > 50) {
      newErrors.channelName = 'Channel Name must be less than 50 characters';
      isValid = false;
    }

    if (!config.defaultSenderId.trim()) {
      newErrors.defaultSenderId = 'Sender ID is required';
      isValid = false;
    } else if (!/^[a-zA-Z0-9]+$/.test(config.defaultSenderId)) {
        newErrors.defaultSenderId = 'Sender ID must be alphanumeric';
        isValid = false;
    } else if (config.defaultSenderId.length > 11) {
      newErrors.defaultSenderId = 'Sender ID max 11 characters';
      isValid = false;
    }

    if (!config.apiBaseUrl.trim()) {
      newErrors.apiBaseUrl = 'API Base URL is required';
      isValid = false;
    } else {
        try {
            new URL(config.apiBaseUrl);
        } catch (_) {
            newErrors.apiBaseUrl = 'Invalid URL format';
            isValid = false;
        }
    }

    if (!config.apiKey.trim()) {
      newErrors.apiKey = 'API Key is required';
      isValid = false;
    }

    if (!config.authType) {
        newErrors.authType = 'Auth Type is required';
        isValid = false;
    }

    if (config.optInRequired && !config.optOutKeyword.trim()) {
        newErrors.optOutKeyword = 'Opt-out Keyword is required when Opt-in is enabled';
        isValid = false;
    }

    if (parseFloat(config.costPerSms) < 0) {
      newErrors.costPerSms = 'Cost cannot be negative';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleTestConnection = async () => {
    if (!config.apiBaseUrl || !config.apiKey) {
      toast({
        title: 'Missing Credentials',
        description: 'Please enter API Base URL and API Key to test connection.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    
    // Mock test - random success/failure
    await new Promise(resolve => setTimeout(resolve, 2000));
    const success = Math.random() > 0.3;
    
    setIsTesting(false);
    setTestResult(success ? 'success' : 'failure');
    
    if (success) {
      toast({
        title: 'Connection Successful',
        description: 'SMS Gateway connection verified successfully.',
      });
    } else {
      toast({
        title: 'Connection Failed',
        description: 'Unable to connect to SMS Gateway. Please check your credentials.',
        variant: 'destructive',
      });
    }
  };

  const handleSave = async () => {
    if (validateConfig()) {
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.post(`${API_BASE_URL}/api/sms`, config, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.success) {
          onSave?.(config);
          toast({
            title: '✅ SMS Channel connected successfully',
            description: `${config.channelName} has been activated and saved to database.`,
          });
        }
      } catch (error: any) {
        console.error('Save SMS channel error:', error);
        toast({
          title: 'Error',
          description: error.response?.data?.message || 'Failed to save SMS channel.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="w-full h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        <div className="flex items-center justify-between px-1 pb-4">
          <TabsList className="grid w-[400px] grid-cols-2">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Channel
            </TabsTrigger>
            <TabsTrigger value="view" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              View Channels
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="create" className="flex-1 mt-0 h-full overflow-hidden">
          {existingChannel ? (
             <div className="w-full h-full flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl bg-muted/30 m-4">
                <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 text-yellow-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Limit Reached</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  You have already configured an SMS channel. You can only have one active channel. 
                  Please view or edit your existing channel configuration.
                </p>
                <div className="p-4 bg-background border rounded-lg flex items-center gap-4 mb-6 shadow-sm w-full max-w-md">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                         <MessageSquare className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="font-bold">{existingChannel.channel_name}</p>
                        <p className="text-xs text-muted-foreground">{existingChannel.country}</p>
                    </div>
                    <div className={existingChannel.status === 'ACTIVE' ? 'text-green-600 bg-green-100 px-2 py-0.5 rounded textxs' : 'text-gray-600 bg-gray-100 px-2 py-0.5 rounded text-xs ml-auto'}>
                        {existingChannel.status}
                    </div>
                </div>
                <Button onClick={() => (document.querySelector('[value="view"]') as HTMLElement)?.click()}>
                  View Existing Channel
                </Button>
             </div>
          ) : (
          <div className="w-full h-full flex flex-col lg:flex-row gap-6">
            {/* Scrollable Form Area */}
            <div className="flex-1 min-w-0 order-2 lg:order-1">
              <ScrollArea className="h-[calc(100vh-250px)]">
                <div className="space-y-6 pr-4 pb-10">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-blue-500/10">
                      <Phone className="h-6 w-6 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">Connect SMS Channel</h2>
                      <p className="text-sm text-muted-foreground">
                        Configure your SMS gateway to send and receive text messages.
                      </p>
                    </div>
                  </div>

                  {/* Section 1: Basic Channel Info */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Settings className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Basic Channel Info</CardTitle>
                      </div>
                      <CardDescription>Configure basic settings for your SMS channel</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="channelName">
                            Channel Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="channelName"
                            value={config.channelName}
                            onChange={(e) => setConfig({ ...config, channelName: e.target.value })}
                            placeholder="e.g. Marketing SMS"
                            className={errors.channelName ? 'border-destructive' : ''}
                          />
                          {errors.channelName && <p className="text-xs text-destructive">{errors.channelName}</p>}
                          <p className="text-xs text-muted-foreground">A friendly name to identify this channel</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="senderId">
                            Default Sender ID <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="senderId"
                            value={config.defaultSenderId}
                            onChange={(e) => setConfig({ ...config, defaultSenderId: e.target.value })}
                            placeholder="e.g. MYBRND or +1234567890"
                            className={errors.defaultSenderId ? 'border-destructive' : ''}
                          />
                          {errors.defaultSenderId && <p className="text-xs text-destructive">{errors.defaultSenderId}</p>}
                          <p className="text-xs text-muted-foreground">Alphanumeric (max 11 chars) or numeric sender ID</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="country">Country</Label>
                          <Select
                            value={config.country}
                            onValueChange={(value) => setConfig({ ...config, country: value })}
                          >
                            <SelectTrigger id="country">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                            <SelectContent>
                              {countries.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">Used for country-specific rules & limits</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="timezone">Timezone</Label>
                          <Select
                            value={config.timezone}
                            onValueChange={(value) => setConfig({ ...config, timezone: value })}
                          >
                            <SelectTrigger id="timezone">
                              <SelectValue placeholder="Select timezone" />
                            </SelectTrigger>
                            <SelectContent>
                              {timezones.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">For scheduled messages and quiet hours</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 2: API Credentials */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">API Credentials</CardTitle>
                      </div>
                      <CardDescription>Enter your SMS gateway API credentials</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="apiBaseUrl">
                          API Base URL <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="apiBaseUrl"
                          value={config.apiBaseUrl}
                          onChange={(e) => setConfig({ ...config, apiBaseUrl: e.target.value })}
                          placeholder="https://api.gateway.com/v1"
                          className={errors.apiBaseUrl ? 'border-destructive' : ''}
                        />
                        {errors.apiBaseUrl && <p className="text-xs text-destructive">{errors.apiBaseUrl}</p>}
                        <p className="text-xs text-muted-foreground">The base URL of your SMS gateway API</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="apiKey">
                            API Key <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="apiKey"
                            type="password"
                            value={config.apiKey}
                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                            placeholder="Enter your API key"
                            className={errors.apiKey ? 'border-destructive' : ''}
                          />
                          {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey}</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="apiSecret">API Secret</Label>
                          <Input
                            id="apiSecret"
                            type="password"
                            value={config.apiSecret}
                            onChange={(e) => setConfig({ ...config, apiSecret: e.target.value })}
                            placeholder="Enter your API secret"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="authType">
                          Authentication Type <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={config.authType}
                          onValueChange={(value) => setConfig({ ...config, authType: value })}
                        >
                          <SelectTrigger id="authType" className={errors.authType ? 'border-destructive w-full md:w-1/2' : 'w-full md:w-1/2'}>
                            <SelectValue placeholder="Select auth type" />
                          </SelectTrigger>
                          <SelectContent>
                            {authTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.authType && <p className="text-xs text-destructive">{errors.authType}</p>}
                      </div>

                      {/* Test Connection Button */}
                      <div className="flex items-center gap-3 pt-2">
                        <Button
                          variant="outline"
                          onClick={handleTestConnection}
                          disabled={isTesting}
                        >
                          {isTesting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            'Test Connection'
                          )}
                        </Button>
                        {testResult === 'success' && (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Connection verified</span>
                          </div>
                        )}
                        {testResult === 'failure' && (
                          <div className="flex items-center gap-1 text-destructive">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">Connection failed</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 3: Webhooks */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Webhook className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Webhooks</CardTitle>
                      </div>
                      <CardDescription>Auto-generated webhook URLs for your SMS gateway</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Incoming SMS Webhook URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={incomingWebhookUrl}
                            readOnly
                            className="bg-muted font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(incomingWebhookUrl, 'incoming')}
                          >
                            {copiedField === 'incoming' ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Configure this URL in your gateway to receive incoming messages</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Delivery Report Webhook URL</Label>
                        <div className="flex gap-2">
                          <Input
                            value={deliveryReportUrl}
                            readOnly
                            className="bg-muted font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleCopy(deliveryReportUrl, 'delivery')}
                          >
                            {copiedField === 'delivery' ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Configure this URL to receive delivery status updates</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 4: Message Settings */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Message Settings</CardTitle>
                      </div>
                      <CardDescription>Configure how messages are handled</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="messageType">Message Type</Label>
                          <Select
                            value={config.messageType}
                            onValueChange={(value) => setConfig({ ...config, messageType: value })}
                          >
                            <SelectTrigger id="messageType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {messageTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">GSM for standard, Unicode for special characters</p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Max Characters</Label>
                          <Input
                            value={getMaxCharacters()}
                            readOnly
                            className="bg-muted"
                          />
                          <p className="text-xs text-muted-foreground">Auto-calculated based on message type</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Long SMS</Label>
                          <p className="text-xs text-muted-foreground">Allow multipart messages (concatenated SMS)</p>
                        </div>
                        <Switch
                          checked={config.enableLongSms}
                          onCheckedChange={(checked) => setConfig({ ...config, enableLongSms: checked })}
                        />
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Auto Trim</Label>
                          <p className="text-xs text-muted-foreground">Automatically trim message if limit exceeded</p>
                        </div>
                        <Switch
                          checked={config.autoTrim}
                          onCheckedChange={(checked) => setConfig({ ...config, autoTrim: checked })}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 5: Credit & Cost */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Credit & Cost</CardTitle>
                      </div>
                      <CardDescription>Configure pricing and credit settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="costPerSms">Cost per SMS</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                              id="costPerSms"
                              type="number"
                              step="0.01"
                              value={config.costPerSms}
                              onChange={(e) => setConfig({ ...config, costPerSms: e.target.value })}
                              className={`pl-7 ${errors.costPerSms ? 'border-destructive' : ''}`}
                            />
                          </div>
                          {errors.costPerSms && <p className="text-xs text-destructive">{errors.costPerSms}</p>}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="creditMode">Credit Deduction Mode</Label>
                          <Select
                            value={config.creditDeductionMode}
                            onValueChange={(value) => setConfig({ ...config, creditDeductionMode: value })}
                          >
                            <SelectTrigger id="creditMode">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {creditDeductionModes.map((mode) => (
                                <SelectItem key={mode.value} value={mode.value}>
                                  {mode.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="creditLimit">Initial Credit Limit</Label>
                          <Input
                            id="creditLimit"
                            type="number"
                            value={config.initialCreditLimit}
                            onChange={(e) => setConfig({ ...config, initialCreditLimit: e.target.value })}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Section 6: Compliance & Safety */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-base">Compliance & Safety</CardTitle>
                      </div>
                      <CardDescription>Configure regulatory compliance settings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Opt-in Required</Label>
                          <p className="text-xs text-muted-foreground">Require explicit consent before sending messages</p>
                        </div>
                        <Switch
                          checked={config.optInRequired}
                          onCheckedChange={(checked) => setConfig({ ...config, optInRequired: checked })}
                        />
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label htmlFor="optOutKeyword">Opt-out Keyword</Label>
                        <Input
                          id="optOutKeyword"
                          value={config.optOutKeyword}
                          onChange={(e) => setConfig({ ...config, optOutKeyword: e.target.value.toUpperCase() })}
                          placeholder="STOP"
                          className={`w-full md:w-1/3 ${errors.optOutKeyword ? 'border-destructive' : ''}`}
                        />
                        {errors.optOutKeyword && <p className="text-xs text-destructive">{errors.optOutKeyword}</p>}
                        <p className="text-xs text-muted-foreground">Keyword users can send to unsubscribe</p>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <Label>Quiet Hours</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Messages will not be sent during these hours
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">From</Label>
                            <Input
                              type="time"
                              value={config.quietHoursStart}
                              onChange={(e) => setConfig({ ...config, quietHoursStart: e.target.value })}
                              className="w-32"
                            />
                          </div>
                          <span className="text-muted-foreground mt-5">to</span>
                          <div className="space-y-1">
                            <Label className="text-xs text-muted-foreground">To</Label>
                            <Input
                              type="time"
                              value={config.quietHoursEnd}
                              onChange={(e) => setConfig({ ...config, quietHoursEnd: e.target.value })}
                              className="w-32"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pb-6">
                    <Button variant="outline" onClick={onCancel}>
                      Cancel
                    </Button>
                    <Button onClick={handleSave} className="gradient-primary">
                      Save & Activate SMS Channel
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Preview Area */}
            <div className="w-full lg:w-[320px] flex-shrink-0 order-1 lg:order-2">
                <SMSPreview 
                   channelName={config.channelName}
                   senderId={config.defaultSenderId}
                   messageType={config.messageType}
                />
            </div>
          </div>
          )}
        </TabsContent>
        
        <TabsContent value="view" className="flex-1 mt-0 h-full overflow-hidden p-1">
            <SMSBotsList onUpdate={checkExistingChannel} />
        </TabsContent>
        
      </Tabs>
    </div>
  );
}
