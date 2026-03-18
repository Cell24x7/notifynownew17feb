import { useState, useEffect, useRef } from 'react';
import { Search, Send, X, Zap, FileText, Smile, Paperclip } from 'lucide-react';
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

  useEffect(() => {
    if (!user) return;

    socketRef.current = io(API_BASE_URL);
    socketRef.current.on('connect', () => {
        socketRef.current?.emit('join', user.id);
    });

    socketRef.current.on('new_message', (msg) => {
        if (selectedConversation && (msg.sender === selectedConversation.contact_phone || msg.recipient === selectedConversation.contact_phone)) {
            setMessages(prev => [...prev, msg]);
        }
        fetchConversations();
    });

    return () => {
        socketRef.current?.disconnect();
    };
  }, [user, selectedConversation]);

  useEffect(() => {
    fetchConversations();
    fetchQuickReplies();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
        fetchMessages(selectedConversation.contact_phone);
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
    
    return matchesSearch && matchesChannel;
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
        const token = localStorage.getItem('authToken');
        const channel = selectedChannel === 'all' ? (enabledChannels[0]?.toLowerCase() || 'rcs') : selectedChannel;
        
        const res = await axios.post(`${API_BASE_URL}/api/chats/send`, {
            recipient: selectedConversation.contact_phone,
            message: newMessage,
            channel: channel
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
            setNewMessage('');
            toast({ title: "Message sent" });
        }
    } catch (err) {
        toast({ title: "Failed to send", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-[calc(100vh-180px)] sm:h-[calc(100vh-160px)] md:h-[calc(100vh-140px)] w-full overflow-hidden bg-background rounded-xl border border-border shadow-sm">
      <div className={cn(
        "grid w-full h-full min-h-0",
        "grid-cols-[1fr]",
        selectedConversation ? "md:grid-cols-[280px_1fr] lg:grid-cols-[300px_1fr_270px]" : "md:grid-cols-[300px_1fr] lg:grid-cols-[320px_1fr]"
      )}>
        {/* LEFT COLUMN: Sidebar */}
        <div className={cn(
          "border-r border-border flex-col bg-card transition-all duration-300 h-full",
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

          <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
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
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize ${getChannelColor(conv.channel)}`}>
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
            </div>

            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-[#f0f2f5] dark:bg-[#0b141a] min-h-0"
            >
              <div className="space-y-4">
                {messages.map((message, index) => {
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
                        <p className="text-[14.5px] leading-normal break-words whitespace-pre-wrap">{message.message_content}</p>
                        <div className={cn(
                          "flex items-center justify-end gap-1.5 mt-1.5", 
                          isSystem ? "text-[#667781] dark:text-[#8696a0]" : "text-[#667781] dark:text-[#8696a0]"
                        )}>
                          <span className="text-[10px] uppercase font-semibold tracking-tight">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: false })}
                          </span>
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
            <div className="p-8 flex flex-col items-center border-b border-border">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 border border-slate-200 dark:border-slate-700">
                <span className="text-2xl font-medium text-primary">
                  {(selectedConversation.name || selectedConversation.contact_phone || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <h2 className="text-base font-semibold text-center">{selectedConversation.name || selectedConversation.contact_phone || 'Unknown Visitor'}</h2>
              <p className="text-[13px] text-muted-foreground mt-0.5">+{(selectedConversation.contact_phone || '').replace(/\D/g,'')}</p>
              <div className="mt-3">
                <StatusBadge status={selectedConversation.status as any} />
              </div>
            </div>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6 scrollbar-hide">
                <div>
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 text-[11px] h-9 shadow-sm hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all">
                      <Zap className="h-3 w-3 mr-1.5 text-yellow-500" /> Mark Resolved
                    </Button>
                    <Button variant="outline" className="flex-1 text-[11px] h-9 shadow-sm hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-all">
                      <X className="h-3 w-3 mr-1.5 text-destructive" /> Block
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Conversation Properties</h3>
                  
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

                    <div className="flex justify-between items-center text-xs pt-2 border-t border-border/50">
                      <span className="text-muted-foreground">First Contact</span>
                      <span className="font-medium text-slate-500">
                        {selectedConversation.last_message_time ? new Date(selectedConversation.last_message_time).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-transparent border border-primary/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-primary" />
                    <h4 className="text-xs font-bold text-primary italic">Pro Tip</h4>
                  </div>
                  <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                    Use <span className="font-bold underline">Quick Replies</span> to respond 3x faster to common customer inquiries.
                  </p>
                </div>
              </div>
            </div>
        ) : (
          <div className="hidden lg:flex" /> 
        )}

      </div>
    </div>
  );
}
