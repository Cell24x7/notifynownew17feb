import React, { useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '../../config/axios';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeveloperConsoleProps {
  channel: any;
}

export default function DeveloperConsole({ channel }: DeveloperConsoleProps) {
  const [sessionName, setSessionName] = useState(`session${channel.id || 1}`);
  const [campaignId, setCampaignId] = useState('1');
  const [userId, setUserId] = useState('1');
  const [contacts, setContacts] = useState('9876543210, 9876543211');
  const [messageTemplate, setMessageTemplate] = useState('Hello from NotifyNow');
  const [statusCampaignId, setStatusCampaignId] = useState('CAMP123456');
  
  const [logs, setLogs] = useState<{ type: 'req' | 'res' | 'err', text: string, time: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);

  const addLog = (type: 'req' | 'res' | 'err', text: any) => {
    const time = new Date().toLocaleTimeString();
    const stringText = typeof text === 'object' ? JSON.stringify(text, null, 2) : text;
    setLogs(prev => [{ type, text: stringText, time }, ...prev].slice(0, 50));
  };

  const PROXY_BASE = '/api/proero/proxy';

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
        toast.success("Connection request sent");
      }
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Failed to connect");
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

  const handleAddContacts = async () => {
    try {
      setIsLoading(true);
      const contactList = contacts.split(',').map(c => c.trim()).filter(c => c);
      const payload = {
        campaign_id: parseInt(campaignId),
        user_id: parseInt(userId),
        contacts: contactList
      };
      addLog('req', `POST /api/campaign/add-contacts - ${JSON.stringify(payload)}`);
      const response = await api.post(`${PROXY_BASE}/api/campaign/add-contacts`, payload);
      addLog('res', response.data);
      toast.success("Contacts added successfully");
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Failed to add contacts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCampaign = async () => {
    try {
      setIsLoading(true);
      const payload = { messageTemplate };
      addLog('req', `POST /api/campaign/start/${campaignId} - ${JSON.stringify(payload)}`);
      const response = await api.post(`${PROXY_BASE}/api/campaign/start/${campaignId}`, payload);
      addLog('res', response.data);
      toast.success("Campaign started");
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
      toast.error("Failed to start campaign");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetStatus = async () => {
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

  const clearLogs = () => setLogs([]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 p-1 max-h-[75vh] overflow-y-auto no-scrollbar">
      {/* Left Column: API Controls */}
      <div className="xl:col-span-7 space-y-6">
        
        {/* Connection Management Card */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden border border-border/50">
          <CardHeader className="pb-3 space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                  <Globe className="w-5 h-5" />
                </div>
                Session Control
              </CardTitle>
              <Badge variant="secondary" className="font-mono text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                WHATSAPP-API-V2
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Session Identifier</Label>
                <div className="relative group">
                  <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-emerald-500" />
                  <Input 
                    value={sessionName} 
                    onChange={e => setSessionName(e.target.value)} 
                    className="pl-10 h-11 bg-background/50 focus:border-emerald-500/50"
                    placeholder="session1"
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button 
                  onClick={handleConnect} 
                  disabled={isLoading} 
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  <Send className="w-4 h-4 mr-2" /> Connect
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleGetSessions} 
                  disabled={isLoading} 
                  className="h-11 border-2 font-bold px-4 hover:bg-emerald-50"
                >
                  <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </Button>
              </div>
            </div>

            {/* QR Result Box */}
            {qrCode && (
              <div className="mt-4 p-4 rounded-xl border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 flex flex-col md:flex-row items-center gap-6 animate-in slide-in-from-top-4 duration-500">
                <div className="p-3 bg-white rounded-2xl shadow-xl border border-emerald-100 relative group">
                  <img 
                    src={qrCode.startsWith('data:') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`} 
                    className="w-32 h-32 object-contain"
                    alt="WhatsApp QR"
                  />
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                    <Badge className="bg-emerald-600 text-white border-none shadow-lg">LIVE QR</Badge>
                  </div>
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <h4 className="font-bold text-emerald-800 flex items-center gap-2 justify-center md:justify-start">
                    <CheckCircle2 className="w-4 h-4" /> Ready to Scan
                  </h4>
                  <p className="text-xs text-emerald-700/70 leading-relaxed font-medium">
                    Open WhatsApp on your phone → Linked Devices → Link a Device. Scan this code to establish connection.
                  </p>
                  <Button variant="ghost" size="sm" onClick={() => setQrCode(null)} className="h-7 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100">
                    <Trash2 className="w-3 h-3 mr-1" /> DISCARD QR
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Campaign Automation Card */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm border border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600">
                <Activity className="w-5 h-5" />
              </div>
              Automation Suite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground">Campaign Index</Label>
                <div className="relative">
                  <Code2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={campaignId} onChange={e => setCampaignId(e.target.value)} className="pl-10 h-10" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase text-muted-foreground">User Context</Label>
                <div className="relative">
                  <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={userId} onChange={e => setUserId(e.target.value)} className="pl-10 h-10" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground flex items-center justify-between">
                Recipients (Comma Separated)
                <Badge variant="outline" className="text-[9px] font-bold">{contacts.split(',').filter(c => c.trim()).length} CONTACTS</Badge>
              </Label>
              <Textarea 
                value={contacts} 
                onChange={e => setContacts(e.target.value)} 
                className="min-h-[80px] font-mono text-xs bg-background/30 resize-none"
                placeholder="91xxxxxxxxxx, 91xxxxxxxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Message Template</Label>
              <Input 
                value={messageTemplate} 
                onChange={e => setMessageTemplate(e.target.value)} 
                className="h-10 bg-background/30"
                placeholder="Type your test message here..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={handleAddContacts} disabled={isLoading} variant="secondary" className="h-11 font-bold">
                <Users className="w-4 h-4 mr-2" /> Stage Contacts
              </Button>
              <Button onClick={handleStartCampaign} disabled={isLoading} className="h-11 font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
                <Play className="w-4 h-4 mr-2" /> Launch Test
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Monitoring Card */}
        <Card className="border-none shadow-sm bg-card/50 backdrop-blur-sm border border-border/50">
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <Label className="text-[11px] font-bold uppercase text-muted-foreground mb-1 block">Live Status Check</Label>
              <Input 
                value={statusCampaignId} 
                onChange={e => setStatusCampaignId(e.target.value)} 
                placeholder="CAMP-xxxxxx"
                className="h-10"
              />
            </div>
            <Button variant="outline" onClick={handleGetStatus} disabled={isLoading} className="h-10 mt-5 w-full md:w-auto font-bold px-6 border-2">
              Verify Processing
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Right Column: Console Output */}
      <div className="xl:col-span-5 flex flex-col h-full min-h-[500px]">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
             <div className="p-1.5 rounded bg-zinc-800 text-zinc-400">
               <Terminal className="w-4 h-4" />
             </div>
             <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">Live Traffic Logs</span>
          </div>
          <Button variant="ghost" size="sm" onClick={clearLogs} className="h-8 text-[10px] font-bold hover:bg-red-50 hover:text-red-600 transition-colors">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> PURGE LOGS
          </Button>
        </div>

        <div className="flex-1 bg-[#0d0d0d] rounded-2xl border border-white/5 p-4 font-mono text-[12px] overflow-y-auto shadow-2xl relative group">
          {/* Subtle Scanline Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white/[0.02] to-transparent bg-[length:100%_4px]" />
          
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-4 opacity-50">
              <Code2 className="w-12 h-12 stroke-[1px]" />
              <div className="text-center">
                <p className="font-bold text-xs uppercase tracking-widest mb-1">Waiting for Signal...</p>
                <p className="text-[10px]">Execute any API command to begin monitoring</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 relative z-10">
              {logs.map((log, i) => (
                <div key={i} className="animate-in slide-in-from-left-2 duration-300">
                  <div className="flex items-center gap-3 mb-2 opacity-80">
                    <span className="text-[10px] text-zinc-600 tabular-nums">[{log.time}]</span>
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
                      {log.type === 'req' ? 'Outbound' : log.type === 'res' ? 'Inbound' : 'Exception'}
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
            <span className="text-[9px] font-bold uppercase tracking-widest">System Operational</span>
          </div>
          <span className="text-[9px] font-mono">V1.0.4-STABLE</span>
        </div>
      </div>
    </div>
  );
}
