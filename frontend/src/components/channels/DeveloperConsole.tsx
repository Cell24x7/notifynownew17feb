import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
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
  Copy,
  Check,
  Loader2,
  CircleDot,
  Hash,
  X,
  Smartphone,
  Wifi,
  Battery,
  Signal,
  ChevronLeft,
  MoreVertical,
  Paperclip,
  Mic,
  Smile,
  Camera,
  Upload,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  const [campaignId, setCampaignId] = useState(String(Math.floor(Math.random() * 900000) + 100000));
  const [numberInput, setNumberInput] = useState('');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [messageContent, setMessageContent] = useState('');
  const [sendMode, setSendMode] = useState<'text' | 'template'>('text');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // New bulk states
  const [recipientInputMode, setRecipientInputMode] = useState<'chips' | 'textarea' | 'upload'>('chips');
  const [bulkText, setBulkText] = useState('');
  const [showViewAllModal, setShowViewAllModal] = useState(false);
  const [editNumbersText, setEditNumbersText] = useState('');
  
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
  const numberInputRef = useRef<HTMLInputElement>(null);

  const PROXY_BASE = '/api/proero/proxy';

  // Get the display message for preview
  const selectedTemplate = templates.find(t => String(t.id || t.template_id) === selectedTemplateId);
  const previewMessage = sendMode === 'template' 
    ? (selectedTemplate?.template_content || selectedTemplate?.preview_text || 'Select a template to preview...') 
    : (messageContent || 'Type a message to preview...');

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
      // Silent fail
    }
  };

  // --- Number chip management ---
  const addNumber = (raw: string) => {
    const nums = raw
      .split(/[\n,\s]+/)
      .map(n => n.trim().replace(/\D/g, ''))
      .filter(n => n.length >= 10 && !recipients.includes(n));
    if (nums.length > 0) {
      setRecipients(prev => [...prev, ...nums]);
    }
    setNumberInput('');
  };

  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (numberInput.trim()) addNumber(numberInput);
    }
    if (e.key === 'Backspace' && !numberInput && recipients.length > 0) {
      setRecipients(prev => prev.slice(0, -1));
    }
  };

  const removeRecipient = (num: string) => {
    setRecipients(prev => prev.filter(r => r !== num));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    addNumber(pasted);
  };

  // --- Bulk & File parsing logic ---
  const bulkNumbersFound = useMemo(() => {
    if (!bulkText.trim()) return [];
    return bulkText
      .split(/[\n,\s;]+/)
      .map(n => n.trim().replace(/\D/g, ''))
      .filter(n => n.length >= 10);
  }, [bulkText]);

  const handleAddBulkTextNumbers = () => {
    const uniqueFound = Array.from(new Set(bulkNumbersFound));
    const newNums = uniqueFound.filter(n => !recipients.includes(n));
    if (newNums.length > 0) {
      setRecipients(prev => [...prev, ...newNums]);
      toast.success(`Successfully added ${newNums.length} numbers (skipped ${uniqueFound.length - newNums.length} duplicates)`);
      setBulkText('');
    } else {
      toast.info("No new unique numbers were found in the text");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    const nameLower = file.name.toLowerCase();
    const isExcel = nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls');
    const isCsv = nameLower.endsWith('.csv');
    const isTxt = nameLower.endsWith('.txt');

    if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          const foundNumbers: string[] = [];
          json.forEach((row: any) => {
            if (Array.isArray(row)) {
              row.forEach(cell => {
                const cleaned = String(cell).trim().replace(/\D/g, '');
                if (cleaned.length >= 10) {
                  foundNumbers.push(cleaned);
                }
              });
            }
          });
          
          const uniqueNums = Array.from(new Set(foundNumbers));
          const newNums = uniqueNums.filter(n => !recipients.includes(n));
          
          if (newNums.length > 0) {
            setRecipients(prev => [...prev, ...newNums]);
            toast.success(`Loaded ${newNums.length} unique numbers from Excel (skipped ${uniqueNums.length - newNums.length} duplicates)`);
          } else {
            toast.info("No new phone numbers found in the Excel file");
          }
        } catch (err) {
          toast.error("Failed to parse Excel file");
        }
      };
      reader.readAsBinaryString(file);
    } else if (isCsv || isTxt) {
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const rawNums = text.split(/[\n\r,;\t\s]+/);
          const foundNumbers: string[] = [];
          rawNums.forEach(n => {
            const cleaned = n.trim().replace(/\D/g, '');
            if (cleaned.length >= 10) {
              foundNumbers.push(cleaned);
            }
          });

          const uniqueNums = Array.from(new Set(foundNumbers));
          const newNums = uniqueNums.filter(n => !recipients.includes(n));

          if (newNums.length > 0) {
            setRecipients(prev => [...prev, ...newNums]);
            toast.success(`Loaded ${newNums.length} unique numbers (skipped ${uniqueNums.length - newNums.length} duplicates)`);
          } else {
            toast.info("No new phone numbers found in the file");
          }
        } catch (err) {
          toast.error("Failed to parse file");
        }
      };
      reader.readAsText(file);
    } else {
      toast.error("Unsupported file format. Please upload CSV, Excel or TXT");
    }
    e.target.value = '';
  };

  // --- API actions ---
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
    } catch (err: any) {
      toast.error("Failed to connect");
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
    if (recipients.length === 0) {
      toast.error("Add at least one phone number");
      return;
    }
    try {
      setIsLoading(true);
      setActiveAction('stage');
      await api.post(`${PROXY_BASE}/api/campaign/add-contacts`, {
        campaign_id: campaignId,
        user_id: parseInt(userId),
        contacts: recipients
      });
      toast.success(`${recipients.length} contacts staged ✓`);
      setLastResult({ type: 'success', message: `${recipients.length} contacts added to campaign` });
    } catch (err: any) {
      toast.error("Failed to stage contacts");
      setLastResult({ type: 'error', message: err.response?.data?.message || 'Failed' });
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
      setLastResult({ type: 'success', message: response.data?.message || 'Campaign started' });
    } catch (err: any) {
      toast.error("Failed to trigger campaign");
      setLastResult({ type: 'error', message: err.response?.data?.message || 'Campaign failed' });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.template_name.trim() || !newTemplate.template_content.trim()) {
      toast.error("Name and content required");
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

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 max-h-[78vh] overflow-y-auto no-scrollbar">
      
      {/* ══════════════ LEFT: Controls ══════════════ */}
      <div className="lg:col-span-7 space-y-5">

        {/* ─── STEP 1: CONNECTION ─── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center text-[10px] font-black shadow-md">1</div>
            <span className="text-sm font-bold">WhatsApp Connection</span>
            {connectionStatus === 'connected' && (
              <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1 ml-auto text-[10px] h-5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Connected
              </Badge>
            )}
            {connectionStatus === 'disconnected' && (
              <Badge variant="destructive" className="gap-1 ml-auto text-[10px] h-5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-300" /> Offline
              </Badge>
            )}
          </div>

          <Card className="border border-border/60 overflow-hidden">
            <CardContent className="p-3 space-y-3">
              {/* QR */}
              {qrCode && (
                <div className="flex flex-col items-center py-3 animate-in slide-in-from-top-3 duration-400">
                  <div className="p-2.5 bg-white rounded-xl shadow-2xl border-2 border-emerald-200 mb-3">
                    <img 
                      src={qrCode.startsWith('data:') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`} 
                      className="w-36 h-36 object-contain" alt="QR"
                    />
                  </div>
                  <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Scan with WhatsApp
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">WhatsApp → Linked Devices → Link</p>
                  <Button variant="ghost" size="sm" onClick={() => setQrCode(null)} className="mt-1 text-[10px] text-muted-foreground h-6">Hide QR</Button>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <Button onClick={handleConnect} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 text-xs shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]">
                  {activeAction === 'connect' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5 mr-1.5" />}
                  {qrCode ? 'Refresh' : 'Get QR'}
                </Button>
                <Button onClick={handleSyncStatus} disabled={isLoading} variant="outline" className="font-bold h-10 text-xs border-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700">
                  {activeAction === 'sync' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Status
                </Button>
                <Button onClick={handleLogout} disabled={isLoading} variant="outline" className="font-bold h-10 text-xs border-2 border-red-200 text-red-600 hover:bg-red-50">
                  {activeAction === 'logout' ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5 mr-1.5" />}
                  Logout
                </Button>
              </div>

              <div className="flex items-center justify-between px-2.5 py-1.5 bg-muted/40 rounded-md text-[10px]">
                <span className="font-bold uppercase tracking-wider text-muted-foreground">Session</span>
                <code className="font-mono font-bold">{sessionName}</code>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── STEP 2: RECIPIENTS ─── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-[10px] font-black shadow-md">2</div>
            <span className="text-sm font-bold">Add Recipients</span>
            <Badge variant="secondary" className="ml-auto text-[10px] font-mono h-5">
              {recipients.length} {recipients.length === 1 ? 'number' : 'numbers'}
            </Badge>
          </div>

          <Card className="border border-border/60">
            <CardContent className="p-3 space-y-3">
              {/* Campaign ID mini */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/40 rounded-md">
                <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] font-bold uppercase text-muted-foreground">Campaign:</span>
                <Input 
                  value={campaignId}
                  onChange={e => setCampaignId(e.target.value.replace(/\D/g, ''))}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="123456"
                  className="h-6 border-0 bg-transparent p-0 text-xs font-mono font-bold shadow-none focus-visible:ring-0 flex-1"
                />
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => copyToClipboard(campaignId)}>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>

              {/* Input Mode Tabs */}
              <div className="grid grid-cols-3 gap-1 p-1 bg-muted/50 rounded-lg text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setRecipientInputMode('chips')}
                  className={cn(
                    "py-1.5 rounded-md transition-all flex items-center justify-center gap-1",
                    recipientInputMode === 'chips' ? "bg-white text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Phone className="w-3.5 h-3.5" /> Chips
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientInputMode('textarea')}
                  className={cn(
                    "py-1.5 rounded-md transition-all flex items-center justify-center gap-1",
                    recipientInputMode === 'textarea' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileText className="w-3.5 h-3.5" /> Bulk Paste
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientInputMode('upload')}
                  className={cn(
                    "py-1.5 rounded-md transition-all flex items-center justify-center gap-1",
                    recipientInputMode === 'upload' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Upload className="w-3.5 h-3.5" /> Upload File
                </button>
              </div>

              {/* Chips Input Mode */}
              {recipientInputMode === 'chips' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone Numbers
                  </Label>
                  
                  <div 
                    className="min-h-[90px] max-h-[180px] overflow-y-auto border rounded-lg p-2 bg-background cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all"
                    onClick={() => {
                      if (recipients.length <= 30) numberInputRef.current?.focus();
                    }}
                  >
                    <div className="flex flex-wrap gap-1.5">
                      {recipients.length <= 30 ? (
                        <>
                          {recipients.map((num, i) => (
                            <div 
                              key={i} 
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 text-xs font-mono font-bold text-blue-800 group hover:border-red-300 hover:bg-red-50 transition-all animate-in fade-in zoom-in-95 duration-200"
                            >
                              <Phone className="w-3 h-3 text-blue-400 group-hover:text-red-400" />
                              {num.length > 10 ? `+${num.slice(0, 2)} ${num.slice(2, 7)} ${num.slice(7)}` : num}
                              <button 
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeRecipient(num); }}
                                className="ml-0.5 w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-200 text-blue-400 group-hover:text-red-500 transition-colors"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                          <input
                            ref={numberInputRef}
                            value={numberInput}
                            onChange={e => setNumberInput(e.target.value)}
                            onKeyDown={handleNumberKeyDown}
                            onPaste={handlePaste}
                            onBlur={() => { if (numberInput.trim()) addNumber(numberInput); }}
                            placeholder={recipients.length === 0 ? "Type number & press Enter..." : "Add more..."}
                            className="flex-1 min-w-[120px] border-0 bg-transparent text-sm font-mono outline-none p-1 placeholder:text-muted-foreground/50"
                          />
                        </>
                      ) : (
                        <div className="w-full flex flex-col gap-2 p-1">
                          <div className="flex items-center justify-between bg-blue-50/50 border border-blue-100 p-2 rounded-md">
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-blue-500" />
                              <div>
                                <p className="text-[11px] font-bold text-blue-900">{recipients.length} Numbers Loaded</p>
                                <p className="text-[9px] text-muted-foreground">Showing preview of first 5 numbers below</p>
                              </div>
                            </div>
                            <div className="flex gap-1.5">
                              <Button 
                                type="button"
                                variant="outline" 
                                size="sm" 
                                className="h-6 text-[10px] font-bold border-blue-200 hover:bg-blue-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditNumbersText(recipients.join('\n'));
                                  setShowViewAllModal(true);
                                }}
                              >
                                Manage
                              </Button>
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="sm" 
                                className="h-6 text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => { e.stopPropagation(); setRecipients([]); }}
                              >
                                Clear All
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 max-h-[60px] overflow-y-auto">
                            {recipients.slice(0, 5).map((num, i) => (
                              <div key={i} className="inline-flex items-center px-2 py-0.5 rounded bg-muted border text-[10px] font-mono font-bold text-muted-foreground">
                                {num}
                              </div>
                            ))}
                            <div className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-600">
                              +{recipients.length - 5} more
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {recipients.length <= 30 && (
                    <p className="text-[10px] text-muted-foreground">
                      Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-bold">Enter</kbd> or <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-bold">,</kbd> after each number. Paste multiple numbers at once.
                    </p>
                  )}
                </div>
              )}

              {/* Bulk Paste Input Mode */}
              {recipientInputMode === 'textarea' && (
                <div className="space-y-2 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground">
                      <FileText className="w-3.5 h-3.5" /> Paste Numbers
                    </Label>
                    {recipients.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{recipients.length} staged</span>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 text-[9px] font-bold text-red-500 hover:text-red-700 p-0 px-1"
                          onClick={() => setRecipients([])}
                        >
                          Clear
                        </Button>
                      </div>
                    )}
                  </div>
                  <Textarea
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    className="min-h-[100px] text-xs font-mono resize-none focus-visible:ring-blue-500"
                    placeholder="Enter or paste numbers (one per line, comma or space separated)..."
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground">
                      Found {bulkNumbersFound.length} valid numbers in input
                    </span>
                    <Button
                      type="button"
                      onClick={handleAddBulkTextNumbers}
                      disabled={bulkNumbersFound.length === 0}
                      size="sm"
                      className="h-7 text-[10px] font-bold bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Add to Campaign List
                    </Button>
                  </div>
                </div>
              )}

              {/* Upload File Input Mode */}
              {recipientInputMode === 'upload' && (
                <div className="space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground">
                      <Upload className="w-3.5 h-3.5" /> Upload File
                    </Label>
                    {recipients.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">{recipients.length} staged</span>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-5 text-[9px] font-bold border-blue-200 hover:bg-blue-50 px-1.5"
                          onClick={() => {
                            setEditNumbersText(recipients.join('\n'));
                            setShowViewAllModal(true);
                          }}
                        >
                          Manage
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-5 text-[9px] font-bold text-red-500 hover:text-red-700 p-0 px-1"
                          onClick={() => setRecipients([])}
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 bg-muted/10 text-center hover:bg-muted/20 hover:border-blue-500/40 transition-all relative group">
                    <input 
                      type="file"
                      accept=".csv,.xlsx,.xls,.txt"
                      onChange={handleFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-7 h-7 mx-auto mb-1 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                    <p className="text-[11px] font-bold text-foreground">Click to upload or drag & drop</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Supports CSV, Excel (.xlsx, .xls) and TXT</p>
                  </div>
                  <div className="flex items-center gap-1.5 p-2 bg-blue-50/50 border border-blue-100 rounded-md text-[9px] text-blue-800 font-medium">
                    <Info className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    <span>We scan the file and extract 10+ digit numbers automatically.</span>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleAddContacts} 
                disabled={isLoading || recipients.length === 0} 
                className="w-full font-bold h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all hover:scale-[1.01]"
              >
                {activeAction === 'stage' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                Stage {recipients.length} Contact{recipients.length !== 1 ? 's' : ''} to Campaign
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ─── STEP 3: MESSAGE ─── */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-[10px] font-black shadow-md">3</div>
            <span className="text-sm font-bold">Compose & Send</span>
          </div>

          <Card className="border border-border/60">
            <CardContent className="p-3 space-y-3">
              {/* Mode Toggle */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted/50 rounded-lg">
                <button onClick={() => setSendMode('text')} className={cn(
                  "flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-all",
                  sendMode === 'text' ? "bg-white text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}>
                  <MessageSquare className="w-3.5 h-3.5" /> Plain Text
                </button>
                <button onClick={() => setSendMode('template')} className={cn(
                  "flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-bold transition-all",
                  sendMode === 'template' ? "bg-white text-foreground shadow-md" : "text-muted-foreground hover:text-foreground"
                )}>
                  <FileText className="w-3.5 h-3.5" /> Template
                </button>
              </div>

              {sendMode === 'text' ? (
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Message</Label>
                  <Textarea
                    value={messageContent}
                    onChange={e => setMessageContent(e.target.value)}
                    className="min-h-[80px] text-sm resize-none"
                    placeholder="Hello! Welcome to our service 🎉"
                  />
                  <p className="text-[10px] text-muted-foreground text-right">{messageContent.length} chars</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Select Template</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] font-bold text-primary gap-1" onClick={() => setShowCreateTemplate(!showCreateTemplate)}>
                      <Plus className="w-3 h-3" /> {showCreateTemplate ? 'Cancel' : 'New'}
                    </Button>
                  </div>

                  {showCreateTemplate && (
                    <div className="p-2.5 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5 space-y-2 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={newTemplate.template_name} onChange={e => setNewTemplate(p => ({ ...p, template_name: e.target.value }))} placeholder="Template name" className="h-8 text-xs" />
                        <Input value={newTemplate.variables.join(', ')} onChange={e => setNewTemplate(p => ({ ...p, variables: e.target.value.split(',').map(s => s.trim()) }))} placeholder="Variables: name, offer" className="h-8 text-xs font-mono" />
                      </div>
                      <Textarea value={newTemplate.template_content} onChange={e => setNewTemplate(p => ({ ...p, template_content: e.target.value }))} placeholder="Hello {name}!" className="min-h-[50px] text-xs" />
                      <Button onClick={handleSaveTemplate} disabled={isLoading} size="sm" className="w-full h-8 text-xs font-bold bg-primary"><Plus className="w-3 h-3 mr-1" /> Save</Button>
                    </div>
                  )}

                  {templates.length > 0 ? (
                    <div className="space-y-1 max-h-[160px] overflow-y-auto no-scrollbar">
                      {templates.map(tpl => {
                        const tplId = String(tpl.id || tpl.template_id);
                        const isSelected = selectedTemplateId === tplId;
                        return (
                          <button key={tplId} onClick={() => setSelectedTemplateId(tplId)} className={cn(
                            "w-full text-left p-2.5 rounded-lg border-2 transition-all flex items-start gap-2.5 group",
                            isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/50 hover:border-primary/40"
                          )}>
                            <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5", isSelected ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                              {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold truncate">{tpl.template_name}</span>
                                <Badge variant="secondary" className="text-[8px] h-3.5 shrink-0">ID:{tplId}</Badge>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">{tpl.template_content}</p>
                            </div>
                            <button className="h-6 w-6 p-0 text-red-400 hover:text-red-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id || tpl.template_id || 0); }}>
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <FileText className="w-8 h-8 mx-auto mb-1.5 opacity-20" />
                      <p className="text-[10px] font-bold">No templates yet</p>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" onClick={fetchTemplates} className="w-full h-7 text-[10px] text-muted-foreground font-bold">
                    <RefreshCw className="w-3 h-3 mr-1" /> Refresh Templates
                  </Button>
                </div>
              )}

              {/* SEND */}
              <Button 
                onClick={handleStartCampaign} 
                disabled={isLoading || (sendMode === 'text' && !messageContent.trim()) || (sendMode === 'template' && !selectedTemplateId)} 
                className="w-full h-11 font-bold text-sm shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-600 hover:via-emerald-700 hover:to-teal-700 text-white"
              >
                {activeAction === 'send' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                🚀 Start Campaign
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Status */}
        {lastResult && (
          <div className={cn(
            "flex items-center gap-2.5 p-2.5 rounded-lg border animate-in slide-in-from-bottom-2 duration-300",
            lastResult.type === 'success' ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800"
          )}>
            {lastResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <CircleDot className="w-4 h-4 text-red-600 shrink-0" />}
            <p className="text-xs font-medium flex-1">{lastResult.message}</p>
            <button className="text-lg leading-none opacity-50 hover:opacity-100" onClick={() => setLastResult(null)}>×</button>
          </div>
        )}
      </div>

      {/* ══════════════ RIGHT: Live Phone Preview ══════════════ */}
      <div className="lg:col-span-5 flex flex-col items-center">
        <div className="sticky top-0">
          {/* Phone Label */}
          <div className="text-center mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> Live Preview
            </p>
          </div>

          {/* Phone Frame */}
          <div className="w-[280px] h-[520px] bg-black rounded-[36px] p-[8px] shadow-2xl shadow-black/30 relative">
            {/* Notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[22px] bg-black rounded-b-2xl z-20" />
            
            {/* Screen */}
            <div className="w-full h-full bg-[#0b141a] rounded-[28px] overflow-hidden flex flex-col">
              
              {/* Status Bar */}
              <div className="flex items-center justify-between px-5 pt-2.5 pb-1 text-white/70">
                <span className="text-[10px] font-bold">{currentTime}</span>
                <div className="flex items-center gap-1.5">
                  <Signal className="w-3 h-3" />
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* WhatsApp Header */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-[#1f2c34]">
                <ChevronLeft className="w-5 h-5 text-[#00a884] shrink-0" />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00a884] to-[#075e54] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(channel.name || 'P')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white truncate">{channel.name || 'Proero Channel'}</p>
                  <p className="text-[10px] text-[#8696a0]">
                    {recipients.length > 0 
                      ? `${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`
                      : 'online'
                    }
                  </p>
                </div>
                <MoreVertical className="w-4 h-4 text-[#8696a0]" />
              </div>

              {/* Chat Area */}
              <div 
                className="flex-1 px-3 py-3 overflow-y-auto no-scrollbar"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
              >
                {/* Date bubble */}
                <div className="flex justify-center mb-3">
                  <span className="px-3 py-1 rounded-lg bg-[#182229] text-[9px] text-[#8696a0] font-medium shadow-sm">
                    TODAY
                  </span>
                </div>

                {/* Recipients list (small info) */}
                {recipients.length > 0 && (
                  <div className="flex justify-center mb-3">
                    <div className="px-3 py-1.5 rounded-lg bg-[#182229]/80 text-[9px] text-[#ffd279] font-medium max-w-[200px] text-center">
                      📤 Sending to {recipients.length} number{recipients.length > 1 ? 's' : ''}
                    </div>
                  </div>
                )}

                {/* Message Bubble */}
                <div className="flex justify-end mb-2">
                  <div className={cn(
                    "max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 shadow-sm relative",
                    (messageContent || selectedTemplate) 
                      ? "bg-[#005c4b]" 
                      : "bg-[#1d2b33] border border-[#2a3942]"
                  )}>
                    <p className={cn(
                      "text-[12.5px] leading-relaxed break-words whitespace-pre-wrap",
                      (messageContent || selectedTemplate) ? "text-[#e9edef]" : "text-[#8696a0] italic"
                    )}>
                      {previewMessage}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[9px] text-[#ffffff99]">{currentTime}</span>
                      <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                    </div>
                  </div>
                </div>

                {/* Recipient preview bubbles */}
                {recipients.length > 0 && recipients.slice(0, 3).map((num, i) => (
                  <div key={i} className="flex justify-start mb-1.5 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="max-w-[70%] rounded-xl rounded-tl-sm px-3 py-1.5 bg-[#1f2c34] shadow-sm">
                      <p className="text-[10px] text-[#8696a0] font-mono">
                        📱 +{num.slice(0, 2)} {num.slice(2, 7)} {num.slice(7)}
                      </p>
                    </div>
                  </div>
                ))}
                {recipients.length > 3 && (
                  <div className="flex justify-start mb-2">
                    <div className="px-3 py-1 rounded-xl bg-[#1f2c34] shadow-sm">
                      <p className="text-[10px] text-[#8696a0]">+{recipients.length - 3} more...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Input Bar */}
              <div className="px-2 py-2 flex items-center gap-2 bg-[#1f2c34]">
                <div className="flex-1 flex items-center gap-2 bg-[#2a3942] rounded-full px-3 py-2">
                  <Smile className="w-4 h-4 text-[#8696a0] shrink-0" />
                  <span className="text-[11px] text-[#8696a0] flex-1 truncate">
                    {sendMode === 'template' ? '📋 Template Mode' : (messageContent ? messageContent.slice(0, 30) + '...' : 'Type a message')}
                  </span>
                  <Paperclip className="w-4 h-4 text-[#8696a0] shrink-0" />
                  <Camera className="w-4 h-4 text-[#8696a0] shrink-0" />
                </div>
                <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center shadow-md shrink-0">
                  {recipients.length > 0 && (messageContent || selectedTemplate) 
                    ? <Send className="w-4 h-4 text-white" />
                    : <Mic className="w-4 h-4 text-white" />
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-2 mt-3 opacity-40">
            <Zap className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Proero Console</span>
          </div>
        </div>
      </div>

      {/* ══════════════ MODAL: Manage Staged Recipients ══════════════ */}
      <Dialog open={showViewAllModal} onOpenChange={setShowViewAllModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              Manage Staged Recipients
            </DialogTitle>
            <DialogDescription>
              View and edit your staged phone numbers below. Separate numbers with newlines, commas, or spaces.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Textarea
              value={editNumbersText}
              onChange={e => setEditNumbersText(e.target.value)}
              className="min-h-[200px] text-xs font-mono focus-visible:ring-blue-500"
              placeholder="List of phone numbers..."
            />
            <p className="text-[10px] text-muted-foreground mt-1.5 flex justify-between">
              <span>Original staged: <strong>{recipients.length}</strong></span>
              <span>Currently entered: <strong>{
                editNumbersText.trim()
                  ? editNumbersText.split(/[\n,\s;]+/).map(n => n.trim().replace(/\D/g, '')).filter(n => n.length >= 10).length
                  : 0
              }</strong></span>
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowViewAllModal(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const parsed = editNumbersText
                  .split(/[\n,\s;]+/)
                  .map(n => n.trim().replace(/\D/g, ''))
                  .filter(n => n.length >= 10);
                const uniqueParsed = Array.from(new Set(parsed));
                setRecipients(uniqueParsed);
                setShowViewAllModal(false);
                toast.success(`Updated campaign recipients to ${uniqueParsed.length} unique numbers.`);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
