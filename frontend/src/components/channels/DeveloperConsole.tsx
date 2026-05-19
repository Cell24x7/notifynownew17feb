import React, { useState, useEffect } from 'react';
import { 
  Terminal, 
  Play, 
  Send, 
  Users, 
  Activity, 
  RefreshCw, 
  Trash2, 
  Globe, 
  QrCode,
  Code2,
  Database,
  Cpu,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Save,
  Plus,
  Eye,
  FileText,
  Clock,
  Sparkles,
  Link
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [sessionName, setSessionName] = useState(`session${channel.id || 1}`);
  const [campaignId, setCampaignId] = useState('camp_001');
  const [userId, setUserId] = useState('1');
  const [contacts, setContacts] = useState('919876543210, 919876543211');
  const [messageTemplate, setMessageTemplate] = useState('Hello! Check out our offers today!');
  const [statusCampaignId, setStatusCampaignId] = useState('camp_001');
  const [jobId, setJobId] = useState('JOB_12345');
  
  // Templates tab state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isTemplateMode, setIsTemplateMode] = useState<boolean>(false); // false = plainText, true = templateId
  const [newTemplate, setNewTemplate] = useState<Template>({
    user_id: 1,
    template_name: 'Welcome Promo',
    template_type: 'plainText',
    template_content: 'Hello {name}, welcome to our store!',
    variables: ['name'],
    preview_text: 'Hello {{name}}, welcome to our store!',
    template_data: {}
  });

  const [logs, setLogs] = useState<{ type: 'req' | 'res' | 'err', text: string, time: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sessions');

  const addLog = (type: 'req' | 'res' | 'err', text: any) => {
    const time = new Date().toLocaleTimeString();
    const stringText = typeof text === 'object' ? JSON.stringify(text, null, 2) : text;
    setLogs(prev => [{ type, text: stringText, time }, ...prev].slice(0, 50));
  };

  const PROXY_BASE = '/api/proero/proxy';

  // Load templates on mount or when user ID changes
  useEffect(() => {
    fetchTemplates();
  }, [userId]);

  const fetchTemplates = async () => {
    try {
      addLog('req', `GET /api/campaign/templates/user/${userId}`);
      const response = await api.get(`${PROXY_BASE}/api/campaign/templates/user/${userId}`);
      addLog('res', response.data);
      if (Array.isArray(response.data)) {
        setTemplates(response.data);
      } else if (response.data?.templates) {
        setTemplates(response.data.templates);
      } else if (response.data?.data) {
        setTemplates(response.data.data);
      }
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      addLog('req', `POST /api/whatsapp/connect - ${JSON.stringify({ sessionName })}`);
      const response = await api.post(`${PROXY_BASE}/api/whatsapp/connect`, { sessionName });
      addLog('res', response.data);
      
      const qrData = response.data.qr || response.data.data?.qr;
      if (qrData) {
        setQrCode(qrData);
        toast.success("QR Code received! Scan now.");
      } else {
        toast.success("Connection request sent successfully");
      }
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Failed to connect WhatsApp");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      addLog('req', `POST /api/whatsapp/logout - ${JSON.stringify({ sessionName })}`);
      const response = await api.post(`${PROXY_BASE}/api/whatsapp/logout`, { sessionName });
      addLog('res', response.data);
      setQrCode(null);
      toast.success("Logged out from WhatsApp session");
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Failed to log out");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncStatus = async () => {
    try {
      setIsLoading(true);
      addLog('req', `POST /api/proero/channels/${channel.id}/sync`);
      const response = await api.post(`/api/proero/channels/${channel.id}/sync`);
      addLog('res', response.data);
      
      if (response.data.success) {
        toast.success(`Session synced! Status: ${response.data.status}`);
      } else {
        toast.error("Sync failed");
      }
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Sync failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSessions = async () => {
    try {
      setIsLoading(true);
      addLog('req', `GET /api/whatsapp/sessions`);
      const response = await api.get(`${PROXY_BASE}/api/whatsapp/sessions`);
      addLog('res', response.data);
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setIsLoading(true);
      const payload = {
        ...newTemplate,
        user_id: parseInt(userId)
      };
      addLog('req', `POST /api/campaign/templates/save - ${JSON.stringify(payload)}`);
      const response = await api.post(`${PROXY_BASE}/api/campaign/templates/save`, payload);
      addLog('res', response.data);
      toast.success("Template created successfully");
      fetchTemplates();
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Failed to save template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateIdToDelete: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      setIsLoading(true);
      addLog('req', `DELETE /api/campaign/templates/${templateIdToDelete} - ${JSON.stringify({ user_id: parseInt(userId) })}`);
      const response = await api.delete(`${PROXY_BASE}/api/campaign/templates/${templateIdToDelete}`, {
        data: { user_id: parseInt(userId) }
      });
      addLog('res', response.data);
      toast.success("Template deleted successfully");
      fetchTemplates();
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Failed to delete template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddContacts = async () => {
    try {
      setIsLoading(true);
      const contactList = contacts.split(',').map(c => c.trim()).filter(c => c);
      const payload = {
        campaign_id: campaignId,
        user_id: parseInt(userId),
        contacts: contactList
      };
      addLog('req', `POST /api/campaign/add-contacts - ${JSON.stringify(payload)}`);
      const response = await api.post(`${PROXY_BASE}/api/campaign/add-contacts`, payload);
      addLog('res', response.data);
      toast.success("Contacts staged to campaign");
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Failed to stage contacts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCampaign = async () => {
    try {
      setIsLoading(true);
      let payload = {};
      if (isTemplateMode) {
        if (!selectedTemplateId) {
          toast.error("Please select a template first");
          return;
        }
        payload = { templateId: parseInt(selectedTemplateId) };
      } else {
        payload = { messageTemplate };
      }
      
      addLog('req', `POST /api/campaign/start/${campaignId} - ${JSON.stringify(payload)}`);
      const response = await api.post(`${PROXY_BASE}/api/campaign/start/${campaignId}`, payload);
      addLog('res', response.data);
      toast.success("Campaign triggered successfully!");
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Failed to trigger campaign");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetCampaignStatus = async () => {
    try {
      setIsLoading(true);
      addLog('req', `GET /api/campaign/${statusCampaignId}/status`);
      const response = await api.get(`${PROXY_BASE}/api/campaign/${statusCampaignId}/status`);
      addLog('res', response.data);
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetJobStatus = async () => {
    try {
      setIsLoading(true);
      addLog('req', `GET /api/campaign/job/${jobId}/status`);
      const response = await api.get(`${PROXY_BASE}/api/campaign/job/${jobId}/status`);
      addLog('res', response.data);
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 max-h-[80vh] overflow-y-auto no-scrollbar">
      {/* Left Column: Config Panel */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Universal Settings Bar */}
        <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex-1 space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">User Context ID</Label>
              <div className="relative">
                <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={userId} 
                  onChange={e => setUserId(e.target.value)} 
                  className="pl-10 h-10 bg-background/50 border-border/50 font-bold"
                  placeholder="1"
                />
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Channel Session ID</Label>
              <div className="relative">
                <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  value={sessionName} 
                  onChange={e => setSessionName(e.target.value)} 
                  className="pl-10 h-10 bg-background/50 border-border/50 font-mono font-bold"
                  placeholder="session1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Controls */}
        <Tabs defaultValue="sessions" onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 bg-muted h-11 p-1 rounded-lg">
            <TabsTrigger value="sessions" className="font-bold flex items-center gap-1.5 text-sm">
              <Globe className="w-4 h-4" /> Session QR
            </TabsTrigger>
            <TabsTrigger value="templates" className="font-bold flex items-center gap-1.5 text-sm">
              <FileText className="w-4 h-4" /> Templates
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="font-bold flex items-center gap-1.5 text-sm">
              <Play className="w-4 h-4" /> Campaigns
            </TabsTrigger>
          </TabsList>

          {/* Session Tab */}
          <TabsContent value="sessions" className="mt-4 space-y-4">
            <Card className="border border-border/50 bg-card/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    WhatsApp Session Controller
                  </CardTitle>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    Active Channel: {channel.name}
                  </Badge>
                </div>
                <CardDescription>
                  Pair, check, or disconnect this channel session using unofficial QR scan.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button 
                    onClick={handleConnect} 
                    disabled={isLoading}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 shadow-lg shadow-emerald-500/10"
                  >
                    <QrCode className="w-4 h-4 mr-2" /> Connect QR
                  </Button>
                  <Button 
                    onClick={handleSyncStatus} 
                    disabled={isLoading}
                    variant="outline" 
                    className="flex-1 border-2 border-primary/20 hover:bg-primary/5 text-primary font-bold h-11"
                  >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} /> Sync DB
                  </Button>
                  <Button 
                    onClick={handleLogout} 
                    disabled={isLoading}
                    variant="destructive"
                    className="flex-1 font-bold h-11"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Logout
                  </Button>
                </div>

                <div className="flex justify-center pt-2">
                  <Button 
                    variant="ghost" 
                    onClick={handleGetSessions} 
                    className="text-xs text-muted-foreground font-mono font-bold"
                  >
                    Fetch All Active Sessions Raw List
                  </Button>
                </div>

                {qrCode && (
                  <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="p-3 bg-white rounded-2xl shadow-xl border border-emerald-100 relative group">
                      <img 
                        src={qrCode.startsWith('data:') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} 
                        className="w-36 h-36 object-contain"
                        alt="WhatsApp QR"
                      />
                    </div>
                    <div className="flex-1 text-center md:text-left space-y-2">
                      <h4 className="font-bold text-emerald-800 flex items-center gap-2 justify-center md:justify-start">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> WhatsApp QR Scanner
                      </h4>
                      <p className="text-xs text-emerald-700/80 leading-relaxed font-medium">
                        Open WhatsApp on your phone &rarr; Linked Devices &rarr; Link a Device. Scan this code to establish session connection.
                      </p>
                      <Button variant="link" size="sm" onClick={() => setQrCode(null)} className="h-7 text-xs font-bold text-red-600 p-0">
                        Discard QR View
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="mt-4 space-y-4">
            {/* Create Template Form */}
            <Card className="border border-border/50 bg-card/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  Create WhatsApp Message Template
                </CardTitle>
                <CardDescription>
                  Templates can include variables mapping (e.g. &#123;name&#125;).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Template Name</Label>
                    <Input 
                      value={newTemplate.template_name}
                      onChange={e => setNewTemplate(prev => ({ ...prev, template_name: e.target.value }))}
                      placeholder="Welcome Promo"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Template Type</Label>
                    <Input 
                      value={newTemplate.template_type}
                      onChange={e => setNewTemplate(prev => ({ ...prev, template_type: e.target.value }))}
                      placeholder="plainText"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Template Body Content</Label>
                  <Textarea 
                    value={newTemplate.template_content}
                    onChange={e => setNewTemplate(prev => ({ ...prev, template_content: e.target.value }))}
                    placeholder="Hello {name}, welcome to our store!"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Variables (Comma separated)</Label>
                    <Input 
                      value={newTemplate.variables.join(', ')}
                      onChange={e => setNewTemplate(prev => ({ ...prev, variables: e.target.value.split(',').map(s => s.trim()) }))}
                      placeholder="name"
                      className="h-10 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Preview Text</Label>
                    <Input 
                      value={newTemplate.preview_text}
                      onChange={e => setNewTemplate(prev => ({ ...prev, preview_text: e.target.value }))}
                      placeholder="Hello {{name}}, welcome to our store!"
                      className="h-10"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSaveTemplate} 
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground font-bold h-11 shadow-md hover:scale-[1.01]"
                >
                  <Plus className="w-4 h-4 mr-2" /> Save & Register Template
                </Button>
              </CardContent>
            </Card>

            {/* List Templates */}
            <Card className="border border-border/50 bg-card/40 backdrop-blur-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold">Registered Templates</CardTitle>
                  <CardDescription>Templates stored on the unofficial WhatsApp dashboard.</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={fetchTemplates} className="h-8 font-bold text-xs text-primary">
                  <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground py-6">No templates found for this user.</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {templates.map((tpl: any) => (
                      <div key={tpl.id || tpl.template_id} className="p-3 rounded-lg border border-border bg-background/50 flex items-start justify-between gap-3 text-xs">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground truncate">{tpl.template_name}</span>
                            <Badge variant="secondary" className="text-[9px] scale-95">{tpl.template_type}</Badge>
                            <Badge variant="outline" className="text-[9px] scale-95 text-indigo-600 font-mono">ID: {tpl.id || tpl.template_id}</Badge>
                          </div>
                          <p className="text-muted-foreground font-mono truncate">{tpl.template_content}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteTemplate(tpl.id || tpl.template_id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Campaign Tab */}
          <TabsContent value="campaigns" className="mt-4 space-y-4">
            <Card className="border border-border/50 bg-card/40 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  Launch WhatsApp Bulk Campaign
                </CardTitle>
                <CardDescription>
                  Stage contacts and initiate campaign messaging.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Campaign Identifier</Label>
                    <Input 
                      value={campaignId}
                      onChange={e => setCampaignId(e.target.value)}
                      placeholder="camp_001"
                      className="h-10 font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Staging Format</Label>
                    <Badge className="bg-primary/10 text-primary border-none text-[10px] w-fit mt-1 h-6">API_BULK</Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                    Recipient Numbers (Comma Separated)
                    <Badge variant="secondary" className="text-[9px] font-mono">{contacts.split(',').filter(c => c.trim()).length} numbers</Badge>
                  </Label>
                  <Textarea 
                    value={contacts} 
                    onChange={e => setContacts(e.target.value)} 
                    className="min-h-[80px] font-mono text-xs"
                    placeholder="919876543210, 919876543211"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddContacts} disabled={isLoading} variant="outline" className="flex-1 font-bold h-11 border-2">
                    <Users className="w-4 h-4 mr-2" /> Stage Contacts
                  </Button>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold">Message Content Source</Label>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant={!isTemplateMode ? 'default' : 'outline'} 
                        onClick={() => setIsTemplateMode(false)}
                        className="text-xs h-8 font-bold"
                      >
                        Plain Text
                      </Button>
                      <Button 
                        size="sm" 
                        variant={isTemplateMode ? 'default' : 'outline'} 
                        onClick={() => setIsTemplateMode(true)}
                        className="text-xs h-8 font-bold"
                      >
                        Template ID
                      </Button>
                    </div>
                  </div>

                  {!isTemplateMode ? (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Plain Text Message Content</Label>
                      <Input 
                        value={messageTemplate} 
                        onChange={e => setMessageTemplate(e.target.value)} 
                        className="h-11 bg-background/50"
                        placeholder="Hello! Check out our offers today!"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Select Registered Template ID</Label>
                      <select 
                        value={selectedTemplateId} 
                        onChange={e => setSelectedTemplateId(e.target.value)}
                        className="w-full h-11 px-3 rounded-md border border-input bg-background/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">-- Choose Template --</option>
                        {templates.map((tpl: any) => (
                          <option key={tpl.id || tpl.template_id} value={tpl.id || tpl.template_id}>
                            {tpl.template_name} (ID: {tpl.id || tpl.template_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Button onClick={handleStartCampaign} disabled={isLoading} className="w-full h-11 bg-primary text-primary-foreground font-bold shadow-lg">
                    <Play className="w-4 h-4 mr-2" /> Start Campaign Sendout
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Campaign/Job Status Monitoring */}
            <Card className="border border-border/50 bg-card/40 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Campaign Verification Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Campaign Status Check</Label>
                    <div className="flex gap-1">
                      <Input 
                        value={statusCampaignId} 
                        onChange={e => setStatusCampaignId(e.target.value)} 
                        className="h-9 font-mono text-xs" 
                        placeholder="camp_001"
                      />
                      <Button size="sm" variant="secondary" onClick={handleGetCampaignStatus} className="h-9 font-bold px-3">
                        Query
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground">Job Status Check</Label>
                    <div className="flex gap-1">
                      <Input 
                        value={jobId} 
                        onChange={e => setJobId(e.target.value)} 
                        className="h-9 font-mono text-xs" 
                        placeholder="JOB_12345"
                      />
                      <Button size="sm" variant="secondary" onClick={handleGetJobStatus} className="h-9 font-bold px-3">
                        Query
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Column: Console Output */}
      <div className="lg:col-span-5 flex flex-col h-full min-h-[450px]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
             <div className="p-1.5 rounded bg-zinc-800 text-zinc-400">
               <Terminal className="w-4 h-4" />
             </div>
             <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Live Traffic Logs</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearLogs} className="h-8 text-[10px] font-bold hover:bg-red-50 hover:text-red-600 transition-colors">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Purge Logs
          </Button>
        </div>

        <div className="flex-1 bg-[#09090b] rounded-xl border border-border p-4 font-mono text-[11px] overflow-y-auto shadow-2xl relative group min-h-[380px] max-h-[550px] no-scrollbar">
          {/* Subtle Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.01] to-transparent bg-[length:100%_4px]" />
          
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-4 opacity-50">
              <Code2 className="w-12 h-12 stroke-[1px]" />
              <div className="text-center">
                <p className="font-bold text-xs uppercase tracking-widest mb-1">Waiting for Signal...</p>
                <p className="text-[10px]">Execute any command to display request traffic</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 relative z-10">
              {logs.map((log, i) => (
                <div key={i} className="animate-in slide-in-from-left-2 duration-300">
                  <div className="flex items-center gap-3 mb-2 opacity-80">
                    <span className="text-[10px] text-zinc-500 tabular-nums">[{log.time}]</span>
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      log.type === 'req' ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : 
                      log.type === 'res' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                      "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                    )} />
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-tighter",
                      log.type === 'req' ? "text-blue-400" : log.type === 'res' ? "text-emerald-400" : "text-red-400"
                    )}>
                      {log.type === 'req' ? 'Outbound Request' : log.type === 'res' ? 'Inbound Response' : 'Exception/Error'}
                    </span>
                  </div>
                  <div className={cn(
                    "p-3 rounded-lg border-l-2 font-mono text-[11px] leading-relaxed",
                    log.type === 'req' ? "bg-blue-500/5 border-blue-500/50 text-blue-100/90" : 
                    log.type === 'res' ? "bg-emerald-500/5 border-emerald-500/50 text-emerald-100/90" : 
                    "bg-red-500/5 border-red-500/50 text-red-100/90"
                  )}>
                    <pre className="whitespace-pre-wrap break-all">{log.text}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-3 flex items-center justify-between px-2 opacity-50">
          <div className="flex gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-bold uppercase tracking-widest">WhatsApp Console Active</span>
          </div>
          <span className="text-[9px] font-mono">V2.0.0-UNOFFICIAL</span>
        </div>
      </div>
    </div>
  );
}
