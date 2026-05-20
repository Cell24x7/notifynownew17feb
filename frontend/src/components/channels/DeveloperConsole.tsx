import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Users, 
  RefreshCw, 
  Trash2, 
  QrCode,
  CheckCircle2,
  LogOut,
  Plus,
  FileText,
  Sparkles,
  MessageSquare,
  Zap,
  Phone,
  ArrowRight,
  Copy,
  Check,
  Loader2,
  CircleDot,
  Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '../../config/axios';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeveloperConsoleProps {
  channel: any;
}

interface Template {
  id?: number;
  template_id?: number;
  user_id: number;
  template_name: string;
  template_type: string;
  template_content: string;
  variables: string[];
  preview_text: string;
  template_data?: any;
}

export default function DeveloperConsole({ channel }: DeveloperConsoleProps) {
  const sessionName = `session${channel.id || 1}`;
  const [userId] = useState('1');
  
  // Campaign state
  const [campaignId, setCampaignId] = useState(`camp_${Date.now().toString().slice(-6)}`);
  const [contacts, setContacts] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [sendMode, setSendMode] = useState<'text' | 'template'>('text');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    template_name: '',
    template_type: 'plainText',
    template_content: '',
    variables: [] as string[],
    preview_text: '',
  });
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [lastResult, setLastResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  const PROXY_BASE = '/api/proero/proxy';

  // Parse contact count
  const contactCount = contacts.split(',').map(c => c.trim()).filter(c => c && c.length >= 10).length;

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await api.get(`${PROXY_BASE}/api/campaign/templates/user/${userId}`);
      if (Array.isArray(response.data)) {
        setTemplates(response.data);
      } else if (response.data?.templates) {
        setTemplates(response.data.templates);
      } else if (response.data?.data) {
        setTemplates(response.data.data);
      }
    } catch (err) {
      // Silent fail on initial load
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setActiveAction('connect');
      const response = await api.post(`${PROXY_BASE}/api/whatsapp/connect`, { sessionName });
      
      const qrData = response.data.qr || response.data.data?.qr;
      if (qrData) {
        setQrCode(qrData);
        toast.success("QR Code ready! Scan with WhatsApp");
      } else {
        setConnectionStatus('connected');
        toast.success("Already connected!");
      }
      setLastResult({ type: 'success', message: 'Connection initiated' });
    } catch (err: any) {
      toast.error("Failed to connect");
      setLastResult({ type: 'error', message: err.response?.data?.message || 'Connection failed' });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setActiveAction('logout');
      await api.post(`${PROXY_BASE}/api/whatsapp/logout`, { sessionName });
      setQrCode(null);
      setConnectionStatus('disconnected');
      toast.success("Logged out successfully");
    } catch (err: any) {
      toast.error("Failed to log out");
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleSyncStatus = async () => {
    try {
      setIsLoading(true);
      setActiveAction('sync');
      const response = await api.post(`/api/proero/channels/${channel.id}/sync`);
      if (response.data.success) {
        setConnectionStatus(response.data.status === 'connected' ? 'connected' : 'disconnected');
        toast.success(`Status: ${response.data.status}`);
      }
    } catch (err: any) {
      toast.error("Sync failed");
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleAddContacts = async () => {
    const contactList = contacts.split(',').map(c => c.trim()).filter(c => c && c.length >= 10);
    if (contactList.length === 0) {
      toast.error("Enter at least one valid phone number");
      return;
    }
    try {
      setIsLoading(true);
      setActiveAction('stage');
      await api.post(`${PROXY_BASE}/api/campaign/add-contacts`, {
        campaign_id: campaignId,
        user_id: parseInt(userId),
        contacts: contactList
      });
      toast.success(`${contactList.length} contacts staged ✓`);
      setLastResult({ type: 'success', message: `${contactList.length} contacts added to campaign` });
    } catch (err: any) {
      toast.error("Failed to stage contacts");
      setLastResult({ type: 'error', message: err.response?.data?.message || 'Failed to add contacts' });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleStartCampaign = async () => {
    if (sendMode === 'text' && !messageContent.trim()) {
      toast.error("Enter a message to send");
      return;
    }
    if (sendMode === 'template' && !selectedTemplateId) {
      toast.error("Select a template first");
      return;
    }
    try {
      setIsLoading(true);
      setActiveAction('send');
      const payload = sendMode === 'template' 
        ? { templateId: parseInt(selectedTemplateId) }
        : { messageTemplate: messageContent };
      
      const response = await api.post(`${PROXY_BASE}/api/campaign/start/${campaignId}`, payload);
      toast.success("🚀 Campaign triggered!");
      setLastResult({ type: 'success', message: response.data?.message || 'Campaign started successfully' });
    } catch (err: any) {
      toast.error("Failed to trigger campaign");
      setLastResult({ type: 'error', message: err.response?.data?.message || 'Campaign trigger failed' });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.template_name.trim() || !newTemplate.template_content.trim()) {
      toast.error("Template name and content are required");
      return;
    }
    try {
      setIsLoading(true);
      await api.post(`${PROXY_BASE}/api/campaign/templates/save`, {
        ...newTemplate,
        user_id: parseInt(userId)
      });
      toast.success("Template saved!");
      setShowCreateTemplate(false);
      setNewTemplate({ template_name: '', template_type: 'plainText', template_content: '', variables: [], preview_text: '' });
      fetchTemplates();
    } catch (err: any) {
      toast.error("Failed to save template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateIdToDelete: number) => {
    if (!window.confirm('Delete this template?')) return;
    try {
      await api.delete(`${PROXY_BASE}/api/campaign/templates/${templateIdToDelete}`, {
        data: { user_id: parseInt(userId) }
      });
      toast.success("Template deleted");
      fetchTemplates();
    } catch (err: any) {
      toast.error("Failed to delete");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const StepBadge = ({ num, active }: { num: number; active?: boolean }) => (
    <div className={cn(
      "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300",
      active 
        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-110" 
        : "bg-muted text-muted-foreground"
    )}>
      {num}
    </div>
  );

  return (
    <div className="space-y-5 p-1 max-h-[75vh] overflow-y-auto no-scrollbar">
      
      {/* ═══════════════ STEP 1: CONNECTION ═══════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <StepBadge num={1} active />
          <div>
            <h3 className="text-sm font-bold text-foreground">WhatsApp Connection</h3>
            <p className="text-[11px] text-muted-foreground">Scan QR to link your WhatsApp device</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {connectionStatus === 'connected' && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 animate-in fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </Badge>
            )}
            {connectionStatus === 'disconnected' && (
              <Badge variant="destructive" className="gap-1 animate-in fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-red-300" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>

        <Card className="border border-border/60 bg-gradient-to-br from-card to-muted/20 overflow-hidden">
          <CardContent className="p-4 space-y-4">
            {/* QR Code Display */}
            {qrCode && (
              <div className="flex flex-col items-center py-4 animate-in slide-in-from-top-4 duration-500">
                <div className="p-3 bg-white rounded-2xl shadow-2xl border-2 border-emerald-200 mb-4">
                  <img 
                    src={qrCode.startsWith('data:') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode)}`} 
                    className="w-44 h-44 object-contain"
                    alt="WhatsApp QR"
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-bold text-emerald-700 flex items-center gap-2 justify-center">
                    <Sparkles className="w-4 h-4" /> Scan with WhatsApp
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Open WhatsApp → Linked Devices → Link a Device
                  </p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setQrCode(null)} 
                  className="mt-2 text-xs text-muted-foreground hover:text-red-500"
                >
                  Hide QR
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button 
                onClick={handleConnect} 
                disabled={isLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {activeAction === 'connect' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4 mr-2" />
                )}
                {qrCode ? 'Refresh QR' : 'Get QR'}
              </Button>
              
              <Button 
                onClick={handleSyncStatus} 
                disabled={isLoading}
                variant="outline" 
                className="font-bold h-11 border-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all"
              >
                {activeAction === 'sync' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Check Status
              </Button>
              
              <Button 
                onClick={handleLogout} 
                disabled={isLoading}
                variant="outline"
                className="font-bold h-11 border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400 transition-all"
              >
                {activeAction === 'logout' ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <LogOut className="w-4 h-4 mr-2" />
                )}
                Logout
              </Button>
            </div>

            {/* Session Info */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Session:</span>
              <code className="text-xs font-mono font-bold text-foreground">{sessionName}</code>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ STEP 2: ADD CONTACTS ═══════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <StepBadge num={2} />
          <div>
            <h3 className="text-sm font-bold text-foreground">Add Recipients</h3>
            <p className="text-[11px] text-muted-foreground">Enter phone numbers to send messages to</p>
          </div>
        </div>

        <Card className="border border-border/60 bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4 space-y-3">
            {/* Campaign ID */}
            <div className="flex items-center gap-2 p-2.5 bg-muted/40 rounded-lg">
              <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold uppercase text-muted-foreground block leading-tight">Campaign ID</span>
                <Input 
                  value={campaignId}
                  onChange={e => setCampaignId(e.target.value)}
                  className="h-7 border-0 bg-transparent p-0 text-sm font-mono font-bold shadow-none focus-visible:ring-0"
                />
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 hover:bg-primary/10"
                onClick={() => copyToClipboard(campaignId)}
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>

            {/* Phone Numbers */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone Numbers
                </Label>
                <Badge variant="secondary" className="text-[10px] font-mono h-5">
                  {contactCount} {contactCount === 1 ? 'number' : 'numbers'}
                </Badge>
              </div>
              <Textarea 
                value={contacts} 
                onChange={e => setContacts(e.target.value)} 
                className="min-h-[80px] font-mono text-sm resize-none"
                placeholder="919876543210, 919876543211, 918765432109"
              />
              <p className="text-[10px] text-muted-foreground">Separate multiple numbers with commas. Include country code (91 for India).</p>
            </div>

            <Button 
              onClick={handleAddContacts} 
              disabled={isLoading || contactCount === 0} 
              className="w-full font-bold h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              {activeAction === 'stage' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Users className="w-4 h-4 mr-2" />
              )}
              Stage {contactCount} Contact{contactCount !== 1 ? 's' : ''} to Campaign
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ STEP 3: SEND MESSAGE ═══════════════ */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <StepBadge num={3} />
          <div>
            <h3 className="text-sm font-bold text-foreground">Send Message</h3>
            <p className="text-[11px] text-muted-foreground">Choose message type and launch your campaign</p>
          </div>
        </div>

        <Card className="border border-border/60 bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-4 space-y-4">
            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-lg">
              <button
                onClick={() => setSendMode('text')}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-bold transition-all",
                  sendMode === 'text' 
                    ? "bg-white text-foreground shadow-md" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <MessageSquare className="w-4 h-4" />
                Plain Text
              </button>
              <button
                onClick={() => setSendMode('template')}
                className={cn(
                  "flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-bold transition-all",
                  sendMode === 'template' 
                    ? "bg-white text-foreground shadow-md" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <FileText className="w-4 h-4" />
                Template
              </button>
            </div>

            {sendMode === 'text' ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Message Content</Label>
                <Textarea
                  value={messageContent}
                  onChange={e => setMessageContent(e.target.value)}
                  className="min-h-[90px] text-sm resize-none"
                  placeholder="Hello! Welcome to our service. We have amazing offers for you today! 🎉"
                />
                <p className="text-[10px] text-muted-foreground">
                  {messageContent.length} characters
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">Select Template</Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-[11px] font-bold text-primary gap-1"
                    onClick={() => setShowCreateTemplate(!showCreateTemplate)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {showCreateTemplate ? 'Cancel' : 'New Template'}
                  </Button>
                </div>

                {/* Create Template Inline Form */}
                {showCreateTemplate && (
                  <div className="p-3 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Name</Label>
                        <Input 
                          value={newTemplate.template_name}
                          onChange={e => setNewTemplate(prev => ({ ...prev, template_name: e.target.value }))}
                          placeholder="Welcome Promo"
                          className="h-9 text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Variables (comma sep)</Label>
                        <Input 
                          value={newTemplate.variables.join(', ')}
                          onChange={e => setNewTemplate(prev => ({ ...prev, variables: e.target.value.split(',').map(s => s.trim()) }))}
                          placeholder="name, offer"
                          className="h-9 text-sm font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Template Body</Label>
                      <Textarea 
                        value={newTemplate.template_content}
                        onChange={e => setNewTemplate(prev => ({ ...prev, template_content: e.target.value }))}
                        placeholder="Hello {name}, check out {offer}!"
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                    <Button 
                      onClick={handleSaveTemplate} 
                      disabled={isLoading}
                      size="sm"
                      className="w-full h-9 font-bold bg-primary"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1.5" />
                      Save Template
                    </Button>
                  </div>
                )}

                {/* Template List */}
                {templates.length > 0 ? (
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto no-scrollbar">
                    {templates.map((tpl) => {
                      const tplId = String(tpl.id || tpl.template_id);
                      const isSelected = selectedTemplateId === tplId;
                      return (
                        <button
                          key={tplId}
                          onClick={() => setSelectedTemplateId(tplId)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border-2 transition-all flex items-start gap-3",
                            isSelected 
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30" 
                              : "border-border/50 hover:border-primary/40 hover:bg-muted/30"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all",
                            isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold truncate">{tpl.template_name}</span>
                              <Badge variant="secondary" className="text-[9px] h-4 shrink-0">ID: {tplId}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tpl.template_content}</p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 opacity-0 group-hover:opacity-100"
                            onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id || tpl.template_id || 0); }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold">No templates yet</p>
                    <p className="text-[10px]">Create one using the button above</p>
                  </div>
                )}

                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchTemplates} 
                  className="w-full h-8 text-xs text-muted-foreground font-bold"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Refresh Templates
                </Button>
              </div>
            )}

            {/* SEND BUTTON */}
            <Button 
              onClick={handleStartCampaign} 
              disabled={isLoading || (sendMode === 'text' && !messageContent.trim()) || (sendMode === 'template' && !selectedTemplateId)} 
              className={cn(
                "w-full h-12 font-bold text-base shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]",
                "bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white"
              )}
            >
              {activeAction === 'send' ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              🚀 Start Campaign
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════ STATUS RESULT ═══════════════ */}
      {lastResult && (
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border animate-in slide-in-from-bottom-2 duration-300",
          lastResult.type === 'success' 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-red-50 border-red-200 text-red-800"
        )}>
          {lastResult.type === 'success' 
            ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> 
            : <CircleDot className="w-5 h-5 text-red-600 shrink-0" />
          }
          <p className="text-sm font-medium flex-1">{lastResult.message}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0" 
            onClick={() => setLastResult(null)}
          >
            ×
          </Button>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-2 py-1 opacity-40">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3" />
          <span className="text-[9px] font-bold uppercase tracking-widest">Proero Console</span>
        </div>
        <span className="text-[9px] font-mono">Channel: {channel.name || 'N/A'}</span>
      </div>
    </div>
  );
}
