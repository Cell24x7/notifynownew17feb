import React, { useState } from 'react';
import { Terminal, Play, Send, Users, Activity, RefreshCw, Trash2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeveloperConsoleProps {
  channel: any;
}

export default function DeveloperConsole({ channel }: DeveloperConsoleProps) {
  const [sessionName, setSessionName] = useState('session1');
  const [campaignId, setCampaignId] = useState('1');
  const [userId, setUserId] = useState('1');
  const [contacts, setContacts] = useState('9876543210, 9876543211');
  const [messageTemplate, setMessageTemplate] = useState('Hello from NotifyNow');
  const [statusCampaignId, setStatusCampaignId] = useState('CAMP123456');
  
  const [logs, setLogs] = useState<{ type: 'req' | 'res' | 'err', text: string, time: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addLog = (type: 'req' | 'res' | 'err', text: any) => {
    const time = new Date().toLocaleTimeString();
    const stringText = typeof text === 'object' ? JSON.stringify(text, null, 2) : text;
    setLogs(prev => [{ type, text: stringText, time }, ...prev].slice(0, 50));
  };

  const BASE_URL = 'https://wa.notifynow.in';

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      addLog('req', `POST /api/whatsapp/connect - ${JSON.stringify({ sessionName })}`);
      const response = await axios.post(`${BASE_URL}/api/whatsapp/connect`, { sessionName });
      addLog('res', response.data);
      toast.success("Connection request sent");
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
      const response = await axios.get(`${BASE_URL}/api/whatsapp/sessions`);
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
      const response = await axios.post(`${BASE_URL}/api/campaign/add-contacts`, payload);
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
      const response = await axios.post(`${BASE_URL}/api/campaign/start/${campaignId}`, payload);
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
      const response = await axios.get(`${BASE_URL}/api/campaign/${statusCampaignId}/status`);
      addLog('res', response.data);
    } catch (err: any) {
      addLog('err', err.response?.data || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
      {/* Left Side: Controls */}
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
            <Globe className="w-4 h-4" />
            Session Management
          </div>
          <Card className="bg-muted/30 border-none">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Session Name</Label>
                <div className="flex gap-2">
                  <Input 
                    value={sessionName} 
                    onChange={e => setSessionName(e.target.value)} 
                    placeholder="session1"
                    className="h-10 bg-background"
                  />
                  <Button onClick={handleConnect} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700">
                    <Send className="w-4 h-4 mr-2" /> Connect
                  </Button>
                </div>
              </div>
              <Button variant="outline" onClick={handleGetSessions} disabled={isLoading} className="w-full h-10 border-2">
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> List Sessions
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
            <Activity className="w-4 h-4" />
            Campaign Automation
          </div>
          <Card className="bg-muted/30 border-none">
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase">Campaign ID</Label>
                  <Input value={campaignId} onChange={e => setCampaignId(e.target.value)} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase">User ID</Label>
                  <Input value={userId} onChange={e => setUserId(e.target.value)} className="h-9" />
                </div>
              </div>
              
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Contacts (CSV)</Label>
                <Textarea 
                  value={contacts} 
                  onChange={e => setContacts(e.target.value)} 
                  className="min-h-[60px] text-xs font-mono"
                  placeholder="9876543210, 9876543211"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Message Template</Label>
                <Input value={messageTemplate} onChange={e => setMessageTemplate(e.target.value)} className="h-10" />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleAddContacts} disabled={isLoading} variant="secondary" className="flex-1 font-bold">
                  <Users className="w-4 h-4 mr-2" /> Add Contacts
                </Button>
                <Button onClick={handleStartCampaign} disabled={isLoading} className="flex-1 font-bold gradient-primary">
                  <Play className="w-4 h-4 mr-2" /> Start Campaign
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
            <Terminal className="w-4 h-4" />
            Status Check
          </div>
          <Card className="bg-muted/30 border-none">
            <CardContent className="p-4 flex gap-2">
              <Input 
                value={statusCampaignId} 
                onChange={e => setStatusCampaignId(e.target.value)} 
                placeholder="CAMP123456"
                className="h-10 bg-background"
              />
              <Button variant="outline" onClick={handleGetStatus} disabled={isLoading} className="border-2 font-bold whitespace-nowrap">
                Check Status
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Right Side: Log Console */}
      <div className="flex flex-col h-full min-h-[400px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-muted-foreground font-bold uppercase tracking-wider text-xs">
            <Terminal className="w-4 h-4" />
            Real-time Console Output
          </div>
          <Button variant="ghost" size="sm" onClick={clearLogs} className="h-7 text-xs hover:bg-red-50 hover:text-red-600 font-bold">
            <Trash2 className="w-3 h-3 mr-1" /> Clear
          </Button>
        </div>
        <div className="flex-1 bg-[#1e1e1e] rounded-xl p-4 font-mono text-[11px] overflow-y-auto border-2 border-primary/20 shadow-inner no-scrollbar">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
              <Terminal className="w-8 h-8 opacity-20" />
              <p>Execute an action to see logs...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log, i) => (
                <div key={i} className="animate-in slide-in-from-left-2 duration-300">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-zinc-500">[{log.time}]</span>
                    <Badge 
                      className={cn(
                        "text-[9px] px-1 py-0 border-none h-4",
                        log.type === 'req' ? "bg-blue-500/20 text-blue-400" : 
                        log.type === 'res' ? "bg-emerald-500/20 text-emerald-400" : 
                        "bg-red-500/20 text-red-400"
                      )}
                    >
                      {log.type.toUpperCase()}
                    </Badge>
                  </div>
                  <pre className={cn(
                    "whitespace-pre-wrap break-all p-2 rounded bg-black/20",
                    log.type === 'err' ? "text-red-300" : log.type === 'res' ? "text-emerald-300" : "text-blue-200"
                  )}>
                    {log.text}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

