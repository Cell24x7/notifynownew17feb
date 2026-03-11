import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageSquare, Copy, Check, ExternalLink, CheckCircle2,
  Building2, Phone, Webhook, FileText, Shield, Loader2,
  AlertCircle, RefreshCw, Save, Globe, Key, Hash
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_BASE_URL } from '@/config/api';
import axios from 'axios';
import { cn } from '@/lib/utils';

interface WhatsAppConfigurationProps {
  onSave?: (config: any) => void;
  onCancel?: () => void;
}

export function WhatsAppConfiguration({ onSave, onCancel }: WhatsAppConfigurationProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Live config state
  const [liveConfig, setLiveConfig] = useState<any>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookHeaders, setWebhookHeaders] = useState('');
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);

  const getToken = () => localStorage.getItem('authToken');

  // Fetch live WhatsApp status
  useEffect(() => {
    const fetchStatus = async () => {
      setLoadingStatus(true);
      try {
        const res = await axios.get(`${API_BASE_URL}/api/whatsapp/status`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        if (res.data.success) setLiveConfig(res.data);
      } catch (err) {
        console.error('WhatsApp status fetch failed', err);
      } finally {
        setLoadingStatus(false);
      }
    };
    fetchStatus();
  }, []);

  // Fetch current webhook when user has Pinbot
  useEffect(() => {
    if (liveConfig?.provider === 'pinbot') {
      fetchWebhook();
    }
  }, [liveConfig]);

  const fetchWebhook = async () => {
    setLoadingWebhook(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/whatsapp/get-webhook`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (res.data.success) {
        setWebhookUrl(res.data.data?.webhook_url || '');
        const hdrs = res.data.data?.headers;
        if (hdrs && Object.keys(hdrs).length > 0) {
          setWebhookHeaders(JSON.stringify(hdrs, null, 2));
        }
      }
    } catch (err: any) {
      console.error('Webhook fetch error:', err.response?.data);
    } finally {
      setLoadingWebhook(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrl) {
      toast({ title: 'Webhook URL required', variant: 'destructive' });
      return;
    }
    setSavingWebhook(true);
    try {
      let headersObj = {};
      if (webhookHeaders.trim()) {
        try { headersObj = JSON.parse(webhookHeaders); } catch {
          toast({ title: 'Invalid JSON in headers', variant: 'destructive' });
          return;
        }
      }

      const res = await axios.post(`${API_BASE_URL}/api/whatsapp/set-webhook`, {
        webhook_url: webhookUrl,
        headers: headersObj
      }, { headers: { Authorization: `Bearer ${getToken()}` } });

      if (res.data.success) {
        toast({ title: '✅ Webhook Updated', description: 'Successfully set on Pinbot.' });
      }
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.response?.data?.message || err.message, variant: 'destructive' });
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast({ title: 'Copied!', description: 'Copied to clipboard' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const CopyBtn = ({ text, field }: { text: string; field: string }) => (
    <Button variant="outline" size="icon" onClick={() => handleCopy(text, field)} className="h-9 w-9 shrink-0">
      {copiedField === field ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </Button>
  );

  return (
    <ScrollArea className="h-[calc(100vh-200px)]">
      <div className="space-y-6 pr-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-green-500/10">
            <MessageSquare className="h-6 w-6 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">WhatsApp Business</h2>
            <p className="text-sm text-muted-foreground">
              View your connection status and manage webhook settings
            </p>
          </div>
        </div>

        {/* Live Connection Status */}
        <Card className={cn(
          'border-2 transition-colors',
          !loadingStatus && liveConfig ? 'border-green-400/60 bg-green-500/5' : 'border-border'
        )}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Connection Status</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingStatus ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking connection...
              </div>
            ) : liveConfig ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-xl">
                  <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-700">Connected</p>
                    <p className="text-xs text-muted-foreground">
                      Provider: <span className="font-semibold capitalize">{liveConfig.providerLabel}</span>
                    </p>
                  </div>
                  <Badge className="ml-auto bg-green-600 text-white text-xs">
                    {liveConfig.provider === 'pinbot' ? '🟠 Pinbot' : '🔵 Meta'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  {liveConfig.config?.chatbot_name && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> Chatbot Name
                      </Label>
                      <Input value={liveConfig.config.chatbot_name} readOnly className="bg-muted h-8 text-sm" />
                    </div>
                  )}
                  {liveConfig.config?.wanumber && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                        <Phone className="h-3 w-3" /> WhatsApp Number
                      </Label>
                      <Input value={liveConfig.config.wanumber} readOnly className="bg-muted h-8 text-sm font-mono" />
                    </div>
                  )}
                  {liveConfig.config?.ph_no_id && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                        <Hash className="h-3 w-3" /> Phone Number ID
                      </Label>
                      <div className="flex gap-1">
                        <Input value={liveConfig.config.ph_no_id} readOnly className="bg-muted h-8 text-xs font-mono flex-1" />
                        <CopyBtn text={liveConfig.config.ph_no_id} field="ph_no_id" />
                      </div>
                    </div>
                  )}
                  {liveConfig.config?.wa_biz_accnt_id && (
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold flex items-center gap-1">
                        <Key className="h-3 w-3" /> WABA ID
                      </Label>
                      <div className="flex gap-1">
                        <Input value={liveConfig.config.wa_biz_accnt_id} readOnly className="bg-muted h-8 text-xs font-mono flex-1" />
                        <CopyBtn text={liveConfig.config.wa_biz_accnt_id} field="waba_id" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  WhatsApp is not configured for your account. Please contact your administrator to set up a WhatsApp configuration.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Webhook Manager — Pinbot only */}
        {liveConfig?.provider === 'pinbot' && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-base">Webhook Manager</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={fetchWebhook} disabled={loadingWebhook}>
                  <RefreshCw className={cn("h-3 w-3", loadingWebhook && "animate-spin")} />
                  Refresh
                </Button>
              </div>
              <CardDescription>
                Set the URL where Pinbot sends incoming messages and delivery reports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {loadingWebhook ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading current webhook...
                </div>
              ) : (
                <>
                  {/* Current Webhook Display */}
                  {webhookUrl && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-orange-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-orange-700 font-bold uppercase">Current Webhook</p>
                        <p className="text-xs font-mono text-orange-800 truncate">{webhookUrl}</p>
                      </div>
                      <CopyBtn text={webhookUrl} field="current_webhook" />
                    </div>
                  )}

                  <Separator />

                  {/* Update Webhook Form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="wh_url" className="text-xs font-bold uppercase text-muted-foreground tracking-wide">
                        Webhook URL *
                      </Label>
                      <Input
                        id="wh_url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://your-domain.com/api/webhooks/whatsapp"
                        className="font-mono text-xs"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Pinbot will POST all incoming messages and status updates to this URL.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="wh_headers" className="text-xs font-bold uppercase text-muted-foreground tracking-wide">
                        Custom Headers <span className="font-normal normal-case">(JSON, optional)</span>
                      </Label>
                      <Textarea
                        id="wh_headers"
                        value={webhookHeaders}
                        onChange={(e) => setWebhookHeaders(e.target.value)}
                        placeholder={'{\n  "Authorization": "Bearer your-secret-token",\n  "X-Custom-Header": "value"\n}'}
                        className="font-mono text-xs min-h-[100px]"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Optional. Pinbot will include these custom headers in every webhook request.
                      </p>
                    </div>

                    <Alert className="bg-orange-50/50 border-orange-200">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      <AlertDescription className="text-xs">
                        Your webhook server must return a <code className="bg-muted px-1 rounded">200 OK</code> response to acknowledge receipt.
                      </AlertDescription>
                    </Alert>

                    <Button
                      onClick={handleSaveWebhook}
                      disabled={savingWebhook || !webhookUrl}
                      className="w-full bg-orange-600 hover:bg-orange-700 text-white gap-2"
                    >
                      {savingWebhook ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</>
                      ) : (
                        <><Save className="h-4 w-4" /> Update Webhook on Pinbot</>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Meta Webhook Info — Meta only */}
        {liveConfig?.provider === 'graph' && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Webhook className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Webhook Configuration</CardTitle>
              </div>
              <CardDescription>Meta Graph API Webhook Setup</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  For Meta Graph API, webhooks are configured in your{' '}
                  <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-primary underline">
                    Facebook Developer Console
                  </a>{' '}
                  → Your App → WhatsApp → Configuration.
                </AlertDescription>
              </Alert>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" asChild className="justify-start h-auto py-3">
                  <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10"><ExternalLink className="h-4 w-4 text-blue-500" /></div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Open Developer Console</p>
                      <p className="text-xs text-muted-foreground">Manage webhook settings</p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
              </div>
              <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Required webhook fields to subscribe:</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {['messages', 'message_template_status_update'].map(f => (
                    <code key={f} className="bg-background border px-2 py-0.5 rounded">{f}</code>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        {liveConfig && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button variant="outline" className="justify-start h-auto py-3" onClick={onCancel}>
                  <div className="flex items-center gap-3 w-full">
                    <div className="p-2 rounded-lg bg-blue-500/10"><FileText className="h-4 w-4 text-blue-500" /></div>
                    <div className="text-left">
                      <p className="font-medium">Message Templates</p>
                      <p className="text-xs text-muted-foreground">Create and manage templates</p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                  </div>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <a href="https://developers.facebook.com/docs/whatsapp" target="_blank" rel="noreferrer" className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-500/10"><Shield className="h-4 w-4 text-orange-500" /></div>
                    <div className="text-left">
                      <p className="font-medium">API Documentation</p>
                      <p className="text-xs text-muted-foreground">WhatsApp Cloud API docs</p>
                    </div>
                    <ExternalLink className="h-4 w-4 ml-auto" />
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pb-6">
          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
