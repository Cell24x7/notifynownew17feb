import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Bot, 
  Copy, 
  Check,
  CheckCircle2,
  Phone,
  Mic,
  Volume2,
  Loader2,
  AlertCircle,
  Settings,
  PlayCircle,
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VoiceBotConfig {
  // Provider Settings
  providerType: string;
  apiKey: string;
  apiSecret: string;
  
  // Phone Settings
  phoneNumber: string;
  callerId: string;
  
  // Voice Settings
  voiceId: string;
  language: string;
  speechRate: number;
  
  // IVR Settings
  welcomeMessage: string;
  fallbackMessage: string;
  maxRetries: number;
  
  // Call Settings
  maxCallDuration: number;
  recordCalls: boolean;
  enableTranscription: boolean;
  
  // Webhook
  webhookUrl: string;
}

interface VoiceBotConfigurationProps {
  onSave?: (config: VoiceBotConfig) => void;
  onCancel?: () => void;
}

export function VoiceBotConfiguration({ onSave, onCancel }: VoiceBotConfigurationProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  
  const [config, setConfig] = useState<VoiceBotConfig>({
    providerType: 'twilio',
    apiKey: '',
    apiSecret: '',
    phoneNumber: '',
    callerId: '',
    voiceId: 'alloy',
    language: 'en-US',
    speechRate: 1.0,
    welcomeMessage: 'Hello! Thank you for calling. How can I help you today?',
    fallbackMessage: 'I\'m sorry, I didn\'t understand. Could you please repeat that?',
    maxRetries: 3,
    maxCallDuration: 30,
    recordCalls: true,
    enableTranscription: true,
    webhookUrl: '',
  });

  // Auto-generated webhook URLs (mock)
  const webhookBaseUrl = 'https://api.yourplatform.com/webhooks/voice';
  const incomingWebhookUrl = `${webhookBaseUrl}/incoming/${Math.random().toString(36).substring(7)}`;
  const statusWebhookUrl = `${webhookBaseUrl}/status/${Math.random().toString(36).substring(7)}`;

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied!', description: 'Copied to clipboard' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTestConnection = async () => {
    if (!config.apiKey || !config.apiSecret) {
      toast({
        title: 'Missing Configuration',
        description: 'Please fill in API credentials before testing.',
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
        ? 'Voice provider connection verified.' 
        : 'Failed to connect. Please check your credentials.',
      variant: success ? 'default' : 'destructive',
    });
    
    setIsTesting(false);
  };

  const handleTestVoice = async () => {
    toast({
      title: '🔊 Playing Sample',
      description: 'Playing voice sample with current settings...',
    });
    
    // Simulate voice playback
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: '✅ Sample Complete',
      description: 'Voice sample finished playing.',
    });
  };

  const handleSave = () => {
    if (!config.apiKey || !config.phoneNumber) {
      toast({
        title: 'Missing Configuration',
        description: 'Please fill in required API and phone settings.',
        variant: 'destructive',
      });
      return;
    }

    onSave?.(config);
    toast({
      title: '✅ Voice BOT Channel activated',
      description: 'Voice BOT is now ready to use.',
    });
  };

  const voiceOptions = [
    { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced' },
    { id: 'echo', name: 'Echo', description: 'Warm, friendly' },
    { id: 'fable', name: 'Fable', description: 'Expressive, dynamic' },
    { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative' },
    { id: 'nova', name: 'Nova', description: 'Soft, gentle' },
    { id: 'shimmer', name: 'Shimmer', description: 'Clear, professional' },
  ];

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-cyan-500/10">
            <Bot className="h-6 w-6 text-cyan-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Connect Voice BOT</h2>
            <p className="text-sm text-muted-foreground">
              Configure AI-powered voice calls with speech recognition and synthesis
            </p>
          </div>
        </div>

        {/* Provider Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-cyan-500" />
              <CardTitle className="text-base">Voice Provider Settings</CardTitle>
            </div>
            <CardDescription>Configure your telephony provider</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Provider Type</Label>
              <Select 
                value={config.providerType}
                onValueChange={(value) => setConfig({...config, providerType: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="vonage">Vonage (Nexmo)</SelectItem>
                  <SelectItem value="plivo">Plivo</SelectItem>
                  <SelectItem value="bandwidth">Bandwidth</SelectItem>
                  <SelectItem value="telnyx">Telnyx</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>API Key / Account SID *</Label>
                <div className="relative">
                  <Input 
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="Enter API key"
                    value={config.apiKey}
                    onChange={(e) => setConfig({...config, apiKey: e.target.value})}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>API Secret / Auth Token *</Label>
                <div className="relative">
                  <Input 
                    type={showApiSecret ? 'text' : 'password'}
                    placeholder="Enter API secret"
                    value={config.apiSecret}
                    onChange={(e) => setConfig({...config, apiSecret: e.target.value})}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiSecret(!showApiSecret)}
                  >
                    {showApiSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
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
                  <Phone className="h-4 w-4 mr-2" />
                  Test Provider Connection
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Phone Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Phone Configuration</CardTitle>
            </div>
            <CardDescription>Configure your phone number for voice calls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input 
                  placeholder="+1 234 567 8900"
                  value={config.phoneNumber}
                  onChange={(e) => setConfig({...config, phoneNumber: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Your voice-enabled phone number
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Caller ID Display</Label>
                <Input 
                  placeholder="Your Company"
                  value={config.callerId}
                  onChange={(e) => setConfig({...config, callerId: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                  Name shown on outgoing calls
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Volume2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Voice Settings</CardTitle>
            </div>
            <CardDescription>Configure text-to-speech voice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select 
                  value={config.voiceId}
                  onValueChange={(value) => setConfig({...config, voiceId: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voiceOptions.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div className="flex flex-col">
                          <span>{voice.name}</span>
                          <span className="text-xs text-muted-foreground">{voice.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Language</Label>
                <Select 
                  value={config.language}
                  onValueChange={(value) => setConfig({...config, language: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en-US">English (US)</SelectItem>
                    <SelectItem value="en-GB">English (UK)</SelectItem>
                    <SelectItem value="es-ES">Spanish (Spain)</SelectItem>
                    <SelectItem value="es-MX">Spanish (Mexico)</SelectItem>
                    <SelectItem value="fr-FR">French</SelectItem>
                    <SelectItem value="de-DE">German</SelectItem>
                    <SelectItem value="it-IT">Italian</SelectItem>
                    <SelectItem value="pt-BR">Portuguese (Brazil)</SelectItem>
                    <SelectItem value="hi-IN">Hindi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Speech Rate: {config.speechRate.toFixed(1)}x</Label>
                <Button variant="outline" size="sm" onClick={handleTestVoice}>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Test Voice
                </Button>
              </div>
              <Slider
                value={[config.speechRate]}
                onValueChange={([value]) => setConfig({...config, speechRate: value})}
                min={0.5}
                max={2.0}
                step={0.1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slower (0.5x)</span>
                <span>Faster (2.0x)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IVR Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">IVR Messages</CardTitle>
            </div>
            <CardDescription>Configure automated voice responses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Welcome Message</Label>
              <Textarea 
                placeholder="Hello! Thank you for calling..."
                value={config.welcomeMessage}
                onChange={(e) => setConfig({...config, welcomeMessage: e.target.value})}
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Fallback Message</Label>
              <Textarea 
                placeholder="I'm sorry, I didn't understand..."
                value={config.fallbackMessage}
                onChange={(e) => setConfig({...config, fallbackMessage: e.target.value})}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Max Retries Before Transfer</Label>
              <Select 
                value={config.maxRetries.toString()}
                onValueChange={(value) => setConfig({...config, maxRetries: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 retry</SelectItem>
                  <SelectItem value="2">2 retries</SelectItem>
                  <SelectItem value="3">3 retries</SelectItem>
                  <SelectItem value="5">5 retries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Call Settings */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Call Settings</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Maximum Call Duration (minutes)</Label>
              <Select 
                value={config.maxCallDuration.toString()}
                onValueChange={(value) => setConfig({...config, maxCallDuration: parseInt(value)})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Record Calls</p>
                <p className="text-xs text-muted-foreground">Save call recordings for quality assurance</p>
              </div>
              <Switch
                checked={config.recordCalls}
                onCheckedChange={(checked) => setConfig({...config, recordCalls: checked})}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Enable Transcription</p>
                <p className="text-xs text-muted-foreground">Automatically transcribe call conversations</p>
              </div>
              <Switch
                checked={config.enableTranscription}
                onCheckedChange={(checked) => setConfig({...config, enableTranscription: checked})}
              />
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
            <CardDescription>Configure webhooks for call events</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Voice Webhook URL</Label>
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
            
            <div className="space-y-2">
              <Label>Status Callback URL</Label>
              <div className="flex gap-2">
                <Input
                  value={statusWebhookUrl}
                  readOnly
                  className="bg-muted font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy(statusWebhookUrl, 'statusWebhook')}
                >
                  {copiedField === 'statusWebhook' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Capabilities */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Voice BOT Capabilities</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-lg bg-cyan-500/10">
                  <PhoneIncoming className="h-4 w-4 text-cyan-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Inbound Calls</p>
                  <p className="text-xs text-muted-foreground">Handle incoming calls</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <PhoneOutgoing className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Outbound Calls</p>
                  <p className="text-xs text-muted-foreground">Make automated calls</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Mic className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Speech Recognition</p>
                  <p className="text-xs text-muted-foreground">Understand spoken words</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Volume2 className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="font-medium text-sm">Text-to-Speech</p>
                  <p className="text-xs text-muted-foreground">AI voice synthesis</p>
                </div>
                <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Voice calls may incur per-minute charges based on your telephony provider's pricing.
          </AlertDescription>
        </Alert>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 sticky bottom-0 bg-background pb-4">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Save & Activate Voice BOT
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
