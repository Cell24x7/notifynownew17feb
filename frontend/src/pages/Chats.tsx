import { useState, useEffect, useRef } from 'react';
import { Search, Send, X, Zap, FileText, Smile, Paperclip, Download, Check, CheckCheck, AlertCircle, Tag, Plus, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChannelBadge } from '@/components/ui/channel-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { priorityLevels, type Channel } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { io, Socket } from 'socket.io-client';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Conversation {
    contact_phone: string;
    last_message: string;
    last_message_time: string;
    status: string;
    channel?: string;
    name?: string;
}

interface Message {
    id: number;
    sender: string;
    recipient: string;
    message_content: string;
    media_url?: string;
    created_at: string;
    status: string;
    type?: string;
}

interface QuickReply {
    id: number;
    title: string;
    content: string;
}

interface Template {
    id: string;
    name: string;
    body: string;
    category?: string;
}

export default function Chats() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const { toast } = useToast();
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Tags State ────────────────────────────────────────────────────────────
  const [contactTags, setContactTags] = useState<{id: number, tag_name: string}[]>([]);
  const [allUserTags, setAllUserTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);
  // ─────────────────────────────────────────────────────────────────────────────

  // ── Smart filters & Sidebar states ──────────────────────────────────────────
  const [selectedDomainFilter, setSelectedDomainFilter] = useState('All Domains');
  const [userDomains, setUserDomains] = useState<string[]>(['All Domains', 'CreateYourOwn']);
  const [startDate, setStartDate] = useState('2024-02-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().substring(0, 10));
  const [agents, setAgents] = useState<{ id: number, name: string, email: string }[]>([]);
  const [assignedAgentEmail, setAssignedAgentEmail] = useState('');
  const [autoReplyStatus, setAutoReplyStatus] = useState<number>(1);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [officialTemplates, setOfficialTemplates] = useState<{ name: string, language: string, status: string }[]>([]);
  const [templateSending, setTemplateSending] = useState(false);

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/chats/agents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setAgents(res.data.agents || []);
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  const handleAssignAgent = async (email: string) => {
    if (!selectedConversation) return;
    setAssignedAgentEmail(email);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${API_BASE_URL}/api/chats/assign`, {
        contact_phone: selectedConversation.contact_phone,
        agent_email: email || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Agent Assigned', description: email ? `Assigned to ${email}` : 'Unassigned agent' });
      fetchConversations();
    } catch {
      toast({ title: 'Failed to assign agent', variant: 'destructive' });
    }
  };

  const handleToggleAutoReply = async (checked: boolean) => {
    if (!selectedConversation) return;
    const newVal = checked ? 1 : 0;
    setAutoReplyStatus(newVal);
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${API_BASE_URL}/api/chats/auto-reply`, {
        contact_phone: selectedConversation.contact_phone,
        auto_reply: checked
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Auto-Reply Status Updated', description: `Auto-reply is now ${checked ? 'enabled' : 'disabled'}` });
      fetchConversations();
    } catch {
      toast({ title: 'Failed to update auto-reply status', variant: 'destructive' });
    }
  };

  const fetchOfficialTemplates = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/whatsapp/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setOfficialTemplates(res.data.templates || []);
      }
    } catch (err) {
      console.error('Error fetching official templates:', err);
    }
  };

  const handleSendOfficialTemplate = async (templateName: string, language: string) => {
    if (!selectedConversation) return;
    setTemplateSending(true);
    try {
      const token = localStorage.getItem('authToken');
      const recipient = selectedConversation.contact_phone.replace(/\D/g, '');
      const res = await axios.post(`${API_BASE_URL}/api/whatsapp/send-template`, {
        to: recipient,
        templateName,
        languageCode: language || 'en_US'
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (res.data.success) {
        toast({ title: 'Template Sent', description: `Successfully sent template "${templateName}"` });
        setIsTemplateModalOpen(false);
        fetchMessages(selectedConversation.contact_phone);
      }
    } catch (err: any) {
      toast({
        title: 'Failed to send template',
        description: err.response?.data?.message || err.message,
        variant: 'destructive'
      });
    } finally {
      setTemplateSending(false);
    }
  };

  const maskPhone = (phone: string) => {
    const clean = (phone || '').replace(/\D/g, '');
    if (clean.length > 8) {
      return clean.substring(0, 8) + '****';
    }
    return clean;
  };

  const [showConversationList, setShowConversationList] = useState(true);

  const enabledChannels = Array.isArray(user?.channels_enabled) 
    ? user.channels_enabled.map((c: string) => c.toLowerCase())
    : [];

  const ALL_CHANNELS = [
    { label: 'WhatsApp', value: 'whatsapp', configured: !!user?.whatsapp_config_id },
    { label: 'RCS', value: 'rcs', configured: !!user?.rcs_config_id },
    { label: 'SMS', value: 'sms', configured: true }, // SMS usually doesn't need specific bot config here
    { label: 'Email', value: 'email', configured: true },
  ];

  const channels = [
    { label: 'All', value: 'all' },
    ...ALL_CHANNELS.filter(c => 
      enabledChannels.includes(c.value) && c.configured
    )
  ];

  const getChannelColor = (channel?: string) => {
    const ch = (channel || '').toLowerCase();
    if (ch === 'whatsapp') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (ch === 'rcs') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (ch === 'sms') return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    if (ch === 'email') return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
  };

  const fetchUserDomains = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/chats/user-domains`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.domains) {
        const fetched = res.data.domains;
        const list = ['All Domains', ...fetched.filter((d: string) => d !== 'All Domains')];
        setUserDomains(list);
        setSelectedDomainFilter('All Domains');
      }
    } catch (err) {
      console.error('Error fetching user domains:', err);
    }
  };

  const fetchConversations = async () => {
    try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get(`${API_BASE_URL}/api/chats/conversations`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
            setConversations(res.data.data);
        }
    } catch (err) {
        console.error('Error fetching conversations:', err);
    }
  };

  const fetchMessages = async (phone: string) => {
    try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get(`${API_BASE_URL}/api/chats/messages/${phone}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
            setMessages(res.data.data);
        }
    } catch (err) {
        console.error('Error fetching messages:', err);
    }
  };

  const fetchQuickReplies = async () => {
    try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get(`${API_BASE_URL}/api/chats/quick-replies`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
            setQuickReplies(res.data.data);
        }
    } catch (err) {
        console.error('Error fetching quick replies:', err);
    }
  };

  const fetchTemplates = async () => {
    try {
        const token = localStorage.getItem('authToken');
        const res = await axios.get(`${API_BASE_URL}/api/chats/templates`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) {
            setTemplates(res.data.data);
        }
    } catch (err) {
        console.error('Error fetching templates:', err);
    }
  };

  // ── Tags Functions ──────────────────────────────────────────────────────────
  const fetchContactTags = async (phone: string) => {
    try {
      const token = localStorage.getItem('authToken');
      const cleaned = phone.replace(/\D/g, '');
      const res = await axios.get(`${API_BASE_URL}/api/chats/tags/${cleaned}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setContactTags(res.data.tags || []);
    } catch { setContactTags([]); }
  };

  const fetchAllUserTags = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/chats/tags/list`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setAllUserTags(res.data.tags || []);
    } catch { setAllUserTags([]); }
  };

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim() || !selectedConversation) return;
    setTagsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_BASE_URL}/api/chats/tags`, {
        contact_phone: selectedConversation.contact_phone,
        tag_name: tagName.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast({ title: '✔ Tag added', description: tagName });
        await fetchContactTags(selectedConversation.contact_phone);
        await fetchAllUserTags();
        setSelectedTag('');
        setNewTagInput('');
        setShowNewTagInput(false);
      }
    } catch {
      toast({ title: 'Failed to add tag', variant: 'destructive' });
    } finally { setTagsLoading(false); }
  };

  const handleRemoveTag = async (tagId: number) => {
    setTagsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      await axios.delete(`${API_BASE_URL}/api/chats/tags/${tagId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'Tag removed' });
      if (selectedConversation) await fetchContactTags(selectedConversation.contact_phone);
    } catch {
      toast({ title: 'Failed to remove tag', variant: 'destructive' });
    } finally { setTagsLoading(false); }
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const selectedConvRef = useRef<Conversation | null>(null);
  useEffect(() => {
      selectedConvRef.current = selectedConversation;
  }, [selectedConversation]);

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(API_BASE_URL);
    socketRef.current.on('connect', () => {
        socketRef.current?.emit('join', user.id);
    });

    socketRef.current.on('new_message', (msg) => {
        const selected = selectedConvRef.current;
        if (selected && (msg.sender === selected.contact_phone || msg.recipient === selected.contact_phone)) {
            setMessages(prev => [...prev, msg]);
        }
        fetchConversations();
    });

    socketRef.current.on('link_click', (data) => {
        const selected = selectedConvRef.current;
        if (selected && data.mobile === selected.contact_phone) {
            fetchMessages(selected.contact_phone);
        }
        fetchConversations();
        toast({ 
            title: "Engagement Detected", 
            description: `User ${data.mobile} clicked on a link!`
        });
    });

    return () => {
        socketRef.current?.disconnect();
    };
  }, [user]);

  useEffect(() => {
    fetchUserDomains();
    fetchConversations();
    fetchQuickReplies();
    fetchTemplates();
    fetchAllUserTags();
    fetchAgents();
    fetchOfficialTemplates();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
        fetchMessages(selectedConversation.contact_phone);
        fetchContactTags(selectedConversation.contact_phone);
        setSelectedTag('');
        setShowNewTagInput(false);
        setAssignedAgentEmail((selectedConversation as any).assigned_agent || '');
        setAutoReplyStatus((selectedConversation as any).auto_reply !== undefined ? Number((selectedConversation as any).auto_reply) : 1);
    }
  }, [selectedConversation]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTo({
            top: scrollRef.current.scrollHeight,
            behavior: messages.length <= 1 ? 'auto' : 'smooth'
        });
    }
  }, [messages, selectedConversation]);

  const filteredConversations = conversations.filter((conv) => {
    if (!conv) return false;
    const phone = conv.contact_phone || '';
    const name = conv.name || '';
    const matchesSearch = phone.includes(searchQuery) || (name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filter by selected channel
    let matchesChannel = true;
    if (selectedChannel && selectedChannel !== 'all') {
      const convChannel = (conv.channel || '').toLowerCase();
      matchesChannel = convChannel === selectedChannel.toLowerCase();
    }

    // Filter by date range locally
    let matchesDate = true;
    if (conv.last_message_time) {
      const msgDateStr = new Date(conv.last_message_time).toISOString().substring(0, 10);
      if (startDate && msgDateStr < startDate) matchesDate = false;
      if (endDate && msgDateStr > endDate) matchesDate = false;
    }

    // Filter by selected domain configuration
    let matchesDomain = true;
    if (selectedDomainFilter && selectedDomainFilter !== 'All Domains') {
      const convDomain = ((conv as any).domain || '').toLowerCase();
      matchesDomain = convDomain === selectedDomainFilter.toLowerCase();
    }
    
    return matchesSearch && matchesChannel && matchesDate && matchesDomain;
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
        const token = localStorage.getItem('authToken');
        
        // Smart Channel Logic: Use the conversation's own channel first, fallback to filter, then fallback to first enabled
        let channel = (selectedConversation.channel || '').toLowerCase();
        if (!channel || channel === 'all') {
            channel = selectedChannel === 'all' ? (enabledChannels[0]?.toLowerCase() || 'rcs') : selectedChannel;
        }
        
        const res = await axios.post(`${API_BASE_URL}/api/chats/send`, {
            recipient: selectedConversation.contact_phone,
            message: newMessage,
            channel: channel
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
            setNewMessage('');
            toast({ title: "Message sent via " + channel.toUpperCase() });
        }
    } catch (err: any) {
        toast({ 
            title: "Failed to send", 
            description: err.response?.data?.message || err.message,
            variant: "destructive" 
        });
    }
  };

  const handleDownloadChat = async () => {
    if (!selectedConversation) return;
    try {
        const token = localStorage.getItem('authToken');
        const phone = selectedConversation.contact_phone;
        const response = await axios.get(`${API_BASE_URL}/api/chats/export/${phone}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `chat_history_${phone}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast({ title: "Report downloaded successfully" });
    } catch (err) {
        toast({ title: "Download failed", variant: "destructive" });
    }
  };

  const handleExportAll = async () => {
    try {
        const token = localStorage.getItem('authToken');
        const channelQuery = selectedChannel && selectedChannel !== 'all' ? `?channel=${selectedChannel}` : '';
        const response = await axios.get(`${API_BASE_URL}/api/chats/export-all${channelQuery}`, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: 'blob'
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        const filename = selectedChannel !== 'all' ? `responders_${selectedChannel}.csv` : 'all_responders.csv';
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast({ title: "Contacts exported successfully" });
    } catch (err: any) {
        toast({ 
            title: "Export failed", 
            description: err.response?.data?.message || "Internal server error",
            variant: "destructive" 
        });
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full h-[calc(100vh-140px)] animate-fade-in">
      {/* Top Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border border-border bg-card rounded-xl shadow-sm shrink-0">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Domain :</span>
            <select
              value={selectedDomainFilter}
              onChange={(e) => setSelectedDomainFilter(e.target.value)}
              className="text-xs font-semibold px-2 py-1.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {userDomains.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">From :</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 border border-border rounded-lg bg-background text-foreground w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">To :</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 border border-border rounded-lg bg-background text-foreground w-36 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchConversations} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 px-4 flex gap-1.5 text-xs rounded-lg shadow-sm"
          >
            Filter 🔍
          </Button>
          <Button 
            onClick={handleExportAll} 
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 px-4 flex gap-1.5 text-xs rounded-lg shadow-sm"
          >
            Export To Excel 📊
          </Button>
        </div>
      </div>

      {/* Main 3-Column Chat UI */}
      <div className="flex-1 flex h-full overflow-hidden bg-background rounded-xl border border-border shadow-sm min-h-0">
        <div className={cn(
          "grid w-full h-full min-h-0",
          "grid-cols-[1fr]",
          selectedConversation ? "md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr_270px]" : "md:grid-cols-[300px_1fr] lg:grid-cols-[320px_1fr]"
        )}>
          {/* LEFT COLUMN: Sidebar */}
          <div className={cn(
            "border-r border-border flex flex-col bg-card transition-all duration-300 h-full min-h-0",
            selectedConversation && !showConversationList ? "hidden md:flex" : "flex"
          )}>
            <div className="p-4 border-b border-border shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-muted/50 border-transparent focus-visible:ring-1"
                />
              </div>
            </div>

            <div className="p-3 border-b border-border shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Channels</span>
                  <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 px-2 text-[10px] text-primary hover:bg-primary/5"
                      onClick={handleExportAll}
                  >
                      <Download className="h-3 w-3 mr-1" /> Export All
                  </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {channels.map((channel) => (
                  <button
                    key={channel.value}
                    onClick={() => setSelectedChannel(channel.value as any)}
                    className={cn(
                      'px-3 py-1 rounded-full text-[11px] font-medium transition-colors border',
                      selectedChannel === channel.value 
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' 
                        : 'bg-background text-foreground border-border hover:bg-muted'
                    )}
                  >
                    {channel.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 scrollbar-custom">
              <div className="p-2 space-y-1">
                {filteredConversations.map((conv) => (
                  <button
                    key={conv.contact_phone}
                    onClick={() => {
                      setSelectedConversation(conv);
                      setShowConversationList(false);
                    }}
                    className={cn(
                      'w-full p-3 rounded-xl text-left transition-all duration-200 border bg-card hover:bg-muted/50 max-w-full overflow-hidden',
                      selectedConversation?.contact_phone === conv.contact_phone
                        ? 'border-primary/40 shadow-sm ring-1 ring-primary/20 bg-muted/30'
                        : 'border-transparent'
                    )}
                  >
                    <div className="flex items-start gap-3 w-full overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
                        <span className="text-base font-medium text-slate-600 dark:text-slate-300">
                          {(conv.name || conv.contact_phone || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-[13px] truncate">{conv.name || conv.contact_phone || 'Unknown'}</span>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 flex-shrink-0">
                            {conv.last_message_time ? formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true }) : ''}
                          </span>
                        </div>
                        <p className="text-[12px] text-muted-foreground truncate mb-1">
                          {conv.last_message}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <StatusBadge status={conv.status as any} />
                          {conv.channel && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${getChannelColor(conv.channel)}`}>
                              {conv.channel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredConversations.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    No conversations found
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* MIDDLE COLUMN: Chat Window */}
          {selectedConversation ? (
            <div className={cn(
              "flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 relative border-r border-border overflow-hidden min-h-0",
              !showConversationList ? "flex" : "hidden md:flex"
            )}>
              <div className="h-[70px] px-6 border-b border-border flex items-center justify-between bg-card shrink-0">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden -ml-2 shrink-0"
                    onClick={() => setShowConversationList(true)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {(selectedConversation.name || selectedConversation.contact_phone || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-sm">{selectedConversation.name || selectedConversation.contact_phone || 'Unknown'}</h2>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {selectedConversation.channel && selectedConversation.channel !== 'all' ? (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${getChannelColor(selectedConversation.channel)}`}>
                          {selectedConversation.channel}
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Chat</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                      variant="outline" 
                      size="sm" 
                      title="Refresh Chat"
                      className="h-9 px-3 text-xs hidden sm:flex"
                      onClick={() => fetchMessages(selectedConversation.contact_phone)}
                  >
                      <Zap className="h-3.5 w-3.5 mr-2" /> Refresh
                  </Button>
                  <Button 
                      variant="outline" 
                      size="sm" 
                      title="Download Report"
                      className="h-9 px-3 text-xs"
                      onClick={handleDownloadChat}
                  >
                      <Download className="h-3.5 w-3.5 mr-2" /> Download
                  </Button>
                </div>
              </div>

              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-[#f0f2f5] dark:bg-[#0b141a] min-h-0 scrollbar-custom"
              >
                <div className="space-y-4">
                  {messages.filter(m => m.message_content && m.message_content.trim() !== '').map((message, index) => {
                    const isSystem = message.sender === 'System';
                    return (
                      <div
                        key={message.id || index}
                        className={cn(
                          'flex w-full',
                          isSystem ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm relative animate-slide-up',
                            isSystem
                              ? 'bg-[#dcf8c6] dark:bg-[#005c4b] text-[#303030] dark:text-[#e9edef] rounded-tr-none'
                              : 'bg-white dark:bg-[#202c33] text-[#303030] dark:text-[#e9edef] border border-transparent dark:border-[#233138] rounded-tl-none'
                          )}
                        >
                          {message.media_url && (
                            <div className="mb-2 overflow-hidden rounded-lg border border-border/50 max-w-full">
                              {message.media_url.match(/\.(mp4|3gp|m4v)$/i) ? (
                                <video 
                                  src={`${API_BASE_URL}${message.media_url}`} 
                                  controls 
                                  className="max-h-[300px] w-full object-contain bg-black"
                                />
                              ) : message.media_url.match(/\.pdf$/i) ? (
                                  <a 
                                    href={`${API_BASE_URL}${message.media_url}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 p-3 bg-muted/50 hover:bg-muted transition-colors text-xs font-semibold"
                                  >
                                    <FileText className="h-5 w-5 text-rose-500" />
                                    <span>Download PDF Document</span>
                                  </a>
                              ) : (
                                <img 
                                  src={`${API_BASE_URL}${message.media_url}`} 
                                  alt="Shared media" 
                                  className="max-h-[300px] w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(`${API_BASE_URL}${message.media_url}`, '_blank')}
                                  onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x300?text=Media+Not+Found';
                                  }}
                                />
                              )}
                            </div>
                          )}
                          <p className="text-[14.5px] leading-normal break-words whitespace-pre-wrap">{message.message_content}</p>
                          <div className={cn(
                            "flex items-center justify-end gap-1.5 mt-1.5", 
                            isSystem ? "text-[#667781] dark:text-[#8696a0]" : "text-[#667781] dark:text-[#8696a0]"
                          )}>
                            <span className="text-[10px] uppercase font-semibold tracking-tight">
                              {formatDistanceToNow(new Date(message.created_at), { addSuffix: false })}
                            </span>
                            {isSystem && (
                              <>
                                {message.status === 'read' || message.status === 'displayed' ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                                ) : message.status === 'delivered' ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-[#667781]" />
                                ) : message.status === 'failed' ? (
                                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 text-[#667781]" />
                                )}
                              </>
                            )}
                            {!isSystem && message.type && (
                              <span className="text-[9px] font-bold opacity-70 ml-1 uppercase">
                                  {message.type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="h-2" />
                </div>
              </div>

              {/* Input Area */}
              <div className="bg-card border-t border-border shrink-0">
                <div className="px-4 py-2 flex gap-2 border-b border-border/50 bg-slate-50 dark:bg-slate-900/20 overflow-x-auto no-scrollbar">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] font-medium shrink-0">
                        <Zap className="h-3 w-3 mr-1.5" /> Quick
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <ScrollArea className="h-[300px]">
                        <div className="p-2 space-y-1">
                          {quickReplies.map((reply) => (
                            <button
                              key={reply.id}
                              onClick={() => setNewMessage(reply.content)}
                              className="w-full text-left p-2.5 rounded-lg hover:bg-muted transition-colors"
                            >
                              <p className="text-sm font-medium">{reply.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{reply.content}</p>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 text-[11px] font-medium shrink-0">
                        <FileText className="h-3 w-3 mr-1.5" /> Templates
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[350px] p-0" align="start">
                      <ScrollArea className="h-[350px]">
                        <div className="p-2 space-y-1">
                          {templates.map((template) => (
                            <button
                              key={template.id}
                              onClick={() => setNewMessage(template.body)}
                              className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors border border-transparent hover:border-border"
                            >
                              <p className="text-sm font-medium mb-1">{template.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{template.body}</p>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="p-3">
                  <div className="flex items-end gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-1.5 shadow-sm focus-within:ring-1 focus-within:ring-green-500/50 focus-within:border-green-500/50 transition-all">
                    <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-slate-400 hover:text-slate-600 rounded-full">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <textarea
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="w-full bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-[14px] py-2 max-h-[120px] min-h-[40px] scrollbar-hide flex-1"
                      rows={1}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!newMessage.trim()}
                      className="h-10 w-10 shrink-0 rounded-full bg-green-500 hover:bg-green-600 text-white ml-1 shadow-sm"
                    >
                      <Send className="h-4 w-4 ml-0.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="hidden md:flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 h-full border-r border-border">
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-4">
                <span className="text-2xl text-slate-400">💬</span>
              </div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">NotifyNow Chat</h3>
              <p className="text-muted-foreground text-sm max-w-xs text-center">Select a conversation from the left to start messaging.</p>
            </div>
          )}

          {/* RIGHT COLUMN: Contact Info */}
          {selectedConversation ? (
            <div className="hidden lg:flex flex-col h-full bg-card overflow-y-auto w-full min-h-0 border-r border-border">
              <div className="p-6 flex flex-col items-center border-b border-border bg-slate-50/50 dark:bg-slate-900/20">
                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 border border-slate-200 dark:border-slate-700 shadow-inner">
                  <span className="text-xl font-bold text-slate-600 dark:text-slate-300">
                    {(selectedConversation.name || selectedConversation.contact_phone || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 text-center truncate w-full">{selectedConversation.name || 'Unknown Visitor'}</h2>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">+{maskPhone(selectedConversation.contact_phone)}</p>
                <div className="flex flex-col items-center mt-3 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Conversation on</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">
                    {selectedConversation.last_message_time 
                      ? new Date(selectedConversation.last_message_time).toISOString().replace('T', ' ').substring(0, 16) 
                      : 'Unknown'}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 scrollbar-hide">
                {/* ── TAGS SECTION ──────────────────────────── */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> Tags
                  </h3>

                  {/* Applied tags as colored badges */}
                  {contactTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {contactTags.map((t) => (
                        <span
                          key={t.id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300 border border-green-200 dark:border-green-800"
                        >
                          {t.tag_name}
                          <button
                            onClick={() => handleRemoveTag(t.id)}
                            className="ml-0.5 hover:text-red-600 transition-colors"
                            title="Remove tag"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Select Tag dropdown and ADD TAG button */}
                  <div className="flex gap-2">
                    <select
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      className="flex-1 text-[11px] font-semibold px-2 py-1.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">--Select Tag--</option>
                      {allUserTags.filter(t => !contactTags.find(ct => ct.tag_name === t)).map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => { if (selectedTag) handleAddTag(selectedTag); }}
                      disabled={!selectedTag || tagsLoading}
                      className="h-8 px-3 text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold shrink-0 rounded-lg shadow-sm"
                    >
                      ADD TAG
                    </Button>
                  </div>
                </div>

                {/* ── PERSON (Agent Assignment) SECTION ─────────────────── */}
                <div className="space-y-2">
                  <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Person</h3>
                  <select
                    value={assignedAgentEmail}
                    onChange={(e) => handleAssignAgent(e.target.value)}
                    className="w-full text-[11px] font-semibold px-2 py-1.5 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">--Select Agent--</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.email}>
                        {agent.name} ({agent.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── AUTO-REPLY STATUS SECTION ──────────────────────── */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Auto-Reply Status</span>
                  <Switch
                    checked={autoReplyStatus === 1}
                    onCheckedChange={handleToggleAutoReply}
                    className="data-[state=checked]:bg-emerald-500"
                  />
                </div>

                {/* ── SEND TEMPLATE BUTTON ─────────────────────────── */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-10 text-xs rounded-xl shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Send className="h-3.5 w-3.5" /> Send Template Message
                  </Button>
                </div>

                {/* Conversation Properties */}
                <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Active Channel</span>
                    <div className="flex items-center gap-1.5">
                      <div className={cn("w-2 h-2 rounded-full", selectedConversation.channel === 'whatsapp' ? "bg-green-500" : "bg-blue-500")} />
                      <span className="font-semibold capitalize">{selectedConversation.channel || 'Standard'}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Phone Number</span>
                    <span className="font-semibold select-all">+{(selectedConversation.contact_phone || '').replace(/\D/g,'')}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Session Status</span>
                    <StatusBadge status={selectedConversation.status as any} />
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="hidden lg:flex" /> 
          )}
        </div>
      </div>

      {/* Official WhatsApp Template Selection Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Send Official WhatsApp Template</DialogTitle>
            <DialogDescription>
              Select a Meta-approved template to initiate a session with {selectedConversation?.name || selectedConversation?.contact_phone}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 pr-1 space-y-3">
            {officialTemplates.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No official templates found. Check your WhatsApp Business configuration.</p>
            ) : (
              officialTemplates.map((tpl) => (
                <div key={tpl.name} className="flex justify-between items-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{tpl.name}</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold px-2 py-0.5 bg-slate-50">{tpl.language || 'en'}</Badge>
                      <Badge className={`text-[10px] uppercase font-bold px-2 py-0.5 ${tpl.status === 'APPROVED' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{tpl.status || 'APPROVED'}</Badge>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleSendOfficialTemplate(tpl.name, tpl.language)}
                    disabled={templateSending}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-9 text-xs"
                  >
                    Send
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="shrink-0 pt-3 border-t">
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

}
