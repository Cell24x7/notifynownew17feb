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

  const enabledChannels = user?.channels_enabled || [];
  const channels = [
    { label: 'All Channels', value: 'all' },
    ...['WhatsApp', 'SMS', 'RCS'].filter(c => enabledChannels.includes(c)).map(c => ({
        label: c,
        value: c.toLowerCase() as Channel
    }))
  ];

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
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const filteredConversations = conversations.filter((conv) => {
    if (!conv) return false;
    const phone = conv.contact_phone || '';
    const name = conv.name || '';
    const matchesSearch = phone.includes(searchQuery) || (name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
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
    <div className="flex h-screen overflow-hidden">
      <div className={cn(
        "border-r border-border flex flex-col bg-card transition-all duration-300",
        "w-full md:w-80 md:flex",
        selectedConversation && !showConversationList ? "hidden md:flex" : "flex"
      )}>
        <div className="p-3 md:p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="p-3 md:p-4 border-b border-border overflow-x-auto">
          <div className="flex items-center gap-2 flex-nowrap md:flex-wrap min-w-max md:min-w-0">
            {channels.map((channel) => (
              <Button
                key={channel.value}
                variant={selectedChannel === channel.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChannel(channel.value as any)}
                className={cn(
                  'h-8 whitespace-nowrap',
                  selectedChannel === channel.value && 'gradient-primary'
                )}
              >
                {channel.label}
              </Button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.contact_phone}
                onClick={() => {
                  setSelectedConversation(conv);
                  setShowConversationList(false);
                }}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-all duration-200 mb-1',
                  selectedConversation?.contact_phone === conv.contact_phone
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {(conv.name || conv.contact_phone || '?').charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{conv.name || conv.contact_phone || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {conv.last_message_time ? formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true }) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {conv.last_message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={conv.status as any} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {selectedConversation ? (
        <div className={cn(
          "flex-1 flex flex-col",
          !showConversationList ? "flex" : "hidden md:flex"
        )}>
          <div className="h-14 md:h-16 px-3 md:px-6 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-center gap-2 md:gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setShowConversationList(true)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center">
                <span className="font-medium text-sm md:text-base">
                  {(selectedConversation.name || selectedConversation.contact_phone || '?').charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="font-semibold text-sm md:text-base">{selectedConversation.name || selectedConversation.contact_phone || 'Unknown'}</h2>
                <ChannelBadge channel={(selectedConversation.channel as any) || 'rcs'} />
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 p-6 bg-muted/30">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={cn(
                    'flex',
                    message.sender === 'System' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-3',
                      message.sender === 'System'
                        ? 'gradient-primary text-primary-foreground'
                        : 'bg-card border border-border'
                    )}
                  >
                    <p className="text-sm">{message.message_content}</p>
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <span className="text-xs opacity-70">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="px-4 py-2 border-t border-border bg-card flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Zap className="h-4 w-4 mr-1" />
                  Quick
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-popover border shadow-lg z-50" align="start">
                <ScrollArea className="max-h-64">
                  <div className="p-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => setNewMessage(reply.content)}
                        className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <p className="text-sm font-medium">{reply.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{reply.content}</p>
                      </button>
                    ))}
                    {quickReplies.length === 0 && <p className="p-2 text-xs text-muted-foreground">No quick replies found</p>}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  Templates
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-popover border shadow-lg z-50" align="start">
                <ScrollArea className="max-h-72">
                  <div className="p-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => setNewMessage(template.body)}
                        className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{template.name}</p>
                          <Badge variant="secondary" className="text-xs">{template.category || 'Standard'}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{template.body}</p>
                      </button>
                    ))}
                    {templates.length === 0 && <p className="p-4 text-xs text-muted-foreground">No templates found</p>}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>

          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center gap-3 max-w-3xl mx-auto">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} size="icon" className="gradient-primary rounded-full">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-muted/30">
          <p className="text-muted-foreground">Select a conversation to start chatting</p>
        </div>
      )}
    </div>
  );
}
