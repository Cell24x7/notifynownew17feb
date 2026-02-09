import { useState } from 'react';
import { Search, Send, MoreVertical, Tag, X, Zap, FileText, StickyNote, CheckCircle, Archive, Plus, Smile, Paperclip, Users } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChannelIcon, ChannelBadge } from '@/components/ui/channel-icon';
import { StatusBadge } from '@/components/ui/status-badge';
import { mockConversations, mockMessages, mockUsers, mockTeams, mockQuickReplies, mockTemplates, priorityLevels, type Conversation, type Channel } from '@/lib/mockData';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';

const channels: { label: string; value: Channel | 'all' }[] = [
  { label: 'All Channels', value: 'all' },
  { label: 'WhatsApp', value: 'whatsapp' },
  { label: 'SMS', value: 'sms' },
  { label: 'RCS', value: 'rcs' },
  { label: 'RCS', value: 'rcs' },
];

export default function Chats() {
  const [selectedChannel, setSelectedChannel] = useState<Channel | 'all'>('all');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(mockConversations[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [assignedAgent, setAssignedAgent] = useState<string>('none');
  const [assignedTeam, setAssignedTeam] = useState<string>('none');
  const [priority, setPriority] = useState<string>('none');
  const [agentSearch, setAgentSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [labels, setLabels] = useState<string[]>(['VIP', 'Premium']);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const filteredConversations = mockConversations.filter((conv) => {
    const matchesChannel = selectedChannel === 'all' || conv.channel === selectedChannel;
    const matchesSearch = conv.contact.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesChannel && matchesSearch;
  });

  const filteredAgents = mockUsers.filter(user => 
    user.name.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const filteredTeams = mockTeams.filter(team =>
    team.name.toLowerCase().includes(teamSearch.toLowerCase())
  );

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      toast({ title: "Message sent", description: "Your message has been sent successfully." });
      setNewMessage('');
    }
  };

  const handleQuickReply = (content: string) => {
    setNewMessage(content);
  };

  const handleTemplateSelect = (content: string) => {
    setNewMessage(content);
    toast({ title: "Template loaded", description: "Template content added to message box." });
  };

  const handleResolve = () => {
    toast({ title: "Conversation resolved", description: "The conversation has been marked as resolved." });
  };

  const handleArchive = () => {
    toast({ title: "Conversation archived", description: "The conversation has been archived." });
  };

  const handleAddLabel = () => {
    toast({ title: "Add label", description: "Label dialog would open here." });
  };

  const handleSaveNotes = () => {
    toast({ title: "Notes saved", description: "Your notes have been saved successfully." });
  };

  const [showConversationList, setShowConversationList] = useState(true);
  const [showCRMPanel, setShowCRMPanel] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left Panel - Filters & List */}
      <div className={cn(
        "border-r border-border flex flex-col bg-card transition-all duration-300",
        "w-full md:w-80 md:flex",
        selectedConversation && !showConversationList ? "hidden md:flex" : "flex"
      )}>
        {/* Search */}
        <div className="p-3 md:p-4 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Channel Filters */}
        <div className="p-3 md:p-4 border-b border-border overflow-x-auto">
          <div className="flex items-center gap-2 flex-nowrap md:flex-wrap min-w-max md:min-w-0">
            {channels.map((channel) => (
              <Button
                key={channel.value}
                variant={selectedChannel === channel.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedChannel(channel.value)}
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

        {/* Conversation List */}
        <ScrollArea className="flex-1">
          <div className="p-2">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv);
                  setShowConversationList(false);
                }}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-all duration-200 mb-1',
                  selectedConversation?.id === conv.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {conv.contact.name.charAt(0)}
                      </span>
                    </div>
                    <ChannelIcon
                      channel={conv.channel}
                      size="sm"
                      className="absolute -bottom-1 -right-1"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium truncate">{conv.contact.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(conv.updatedAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {conv.contact.lastMessage}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={conv.status} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Middle Panel - Chat */}
      {selectedConversation ? (
        <div className={cn(
          "flex-1 flex flex-col",
          !showConversationList ? "flex" : "hidden md:flex"
        )}>
          {/* Chat Header */}
          <div className="h-14 md:h-16 px-3 md:px-6 border-b border-border flex items-center justify-between bg-card">
            <div className="flex items-center gap-2 md:gap-3">
              {/* Back button for mobile */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => {
                  setShowConversationList(true);
                  setShowCRMPanel(false);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="relative">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-muted flex items-center justify-center">
                  <span className="font-medium text-sm md:text-base">
                    {selectedConversation.contact.name.charAt(0)}
                  </span>
                </div>
              </div>
              <div>
                <h2 className="font-semibold text-sm md:text-base">{selectedConversation.contact.name}</h2>
                <ChannelBadge channel={selectedConversation.channel} />
              </div>
            </div>
            <div className="flex items-center gap-1 md:gap-2">
              {/* Toggle CRM panel on mobile */}
              <Button 
                variant="ghost" 
                size="icon"
                className="lg:hidden"
                onClick={() => setShowCRMPanel(!showCRMPanel)}
              >
                <Users className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border shadow-lg z-50">
                  <DropdownMenuItem>Mark as resolved</DropdownMenuItem>
                  <DropdownMenuItem>Block contact</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete conversation</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6 bg-muted/30">
            <div className="space-y-4 max-w-3xl mx-auto">
              {mockMessages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.sender === 'user' ? 'justify-start' : 'justify-end'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[70%] rounded-2xl px-4 py-3',
                      message.sender === 'user'
                        ? 'bg-card border border-border'
                        : message.sender === 'bot'
                        ? 'bg-secondary/10 border border-secondary/20'
                        : 'gradient-primary text-primary-foreground'
                    )}
                  >
                    {message.sender === 'bot' && (
                      <div className="flex items-center gap-1 text-xs text-secondary mb-1">
                        <span className="font-medium">🤖 Bot</span>
                      </div>
                    )}
                    <p className="text-sm">{message.content}</p>
                    {message.buttons && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.buttons.map((button, idx) => (
                          <Button key={idx} variant="outline" size="sm" className="text-xs">
                            {button.label}
                          </Button>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <span className="text-xs opacity-70">
                        {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Quick Actions Bar */}
          <div className="px-4 py-2 border-t border-border bg-card flex items-center gap-4">
            {/* Quick Reply */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <Zap className="h-4 w-4 mr-1" />
                  Quick
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0 bg-popover border shadow-lg z-50" align="start">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">Quick Replies</p>
                </div>
                <ScrollArea className="max-h-64">
                  <div className="p-2">
                    {mockQuickReplies.map((reply) => (
                      <button
                        key={reply.id}
                        onClick={() => handleQuickReply(reply.content)}
                        className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
                      >
                        <p className="text-sm font-medium">{reply.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{reply.content}</p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Templates */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  Templates
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 bg-popover border shadow-lg z-50" align="start">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">Message Templates</p>
                </div>
                <ScrollArea className="max-h-72">
                  <div className="p-2">
                    {mockTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template.content)}
                        className="w-full text-left p-3 rounded-md hover:bg-muted transition-colors border-b last:border-0"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{template.name}</p>
                          <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{template.content}</p>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Notes */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                  <StickyNote className="h-4 w-4 mr-1" />
                  Notes
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-3 bg-popover border shadow-lg z-50" align="start">
                <p className="text-sm font-medium mb-2">Conversation Notes</p>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this conversation..."
                  className="w-full h-24 text-sm p-2 rounded-md border bg-background resize-none"
                />
                <Button size="sm" className="w-full mt-2" onClick={handleSaveNotes}>
                  Save Notes
                </Button>
              </PopoverContent>
            </Popover>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center gap-3 max-w-3xl mx-auto">
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1"
              />
              <Button variant="ghost" size="icon" className="text-muted-foreground">
                <Smile className="h-4 w-4" />
              </Button>
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

      {/* Right Panel - Contact CRM */}
      {selectedConversation && (
        <div className={cn(
          "border-l border-border bg-card flex flex-col transition-all duration-300",
          "fixed inset-y-0 right-0 w-80 z-50 lg:relative lg:z-0",
          showCRMPanel ? "translate-x-0" : "translate-x-full lg:translate-x-0",
          "lg:flex"
        )}>
          {/* Close button for mobile */}
          <div className="lg:hidden p-3 border-b flex justify-end">
            <Button variant="ghost" size="icon" onClick={() => setShowCRMPanel(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-4 md:p-6">
              {/* Contact Info */}
              <div className="text-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                  <span className="text-xl font-bold text-primary">
                    {selectedConversation.contact.name.charAt(0)}
                  </span>
                </div>
                <h3 className="font-semibold">{selectedConversation.contact.name}</h3>
                <p className="text-xs text-muted-foreground">{selectedConversation.contact.phone}</p>
              </div>

              <StatusBadge status={selectedConversation.status} className="mx-auto block w-fit" />

              <Separator className="my-4" />

              {/* Conversation Actions */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Conversation Actions
                </p>
                <p className="text-xs font-medium mb-2">Quick Actions</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleResolve}>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Resolve
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={handleArchive}>
                    <Archive className="h-3 w-3 mr-1" />
                    Archive
                  </Button>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Assigned Agent with Search */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Assigned Agent</p>
                  <span className="text-xs text-primary cursor-pointer">→ Assign to me</span>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-sm h-9">
                      {assignedAgent !== 'none' 
                        ? mockUsers.find(u => u.id === assignedAgent)?.name 
                        : 'None'}
                      <span className="text-muted-foreground">▼</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 bg-popover border shadow-lg z-50" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="Search team members..."
                          value={agentSearch}
                          onChange={(e) => setAgentSearch(e.target.value)}
                          className="pl-7 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <ScrollArea className="max-h-48">
                      <div className="p-1">
                        <button
                          onClick={() => { setAssignedAgent('none'); setAgentSearch(''); }}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted",
                            assignedAgent === 'none' && "bg-primary/10"
                          )}
                        >
                          None
                        </button>
                        {filteredAgents.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => { 
                              setAssignedAgent(user.id); 
                              setAgentSearch('');
                              toast({ title: "Agent assigned", description: `Assigned to ${user.name}` });
                            }}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted flex items-center gap-2",
                              assignedAgent === user.id && "bg-primary/10"
                            )}
                          >
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                              {user.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.role} • {user.department}</p>
                            </div>
                            <span className={cn(
                              "w-2 h-2 rounded-full",
                              user.status === 'online' ? 'bg-green-500' : 
                              user.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                            )} />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Assigned Team */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Assigned Team</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-sm h-9">
                      {assignedTeam !== 'none' 
                        ? mockTeams.find(t => t.id === assignedTeam)?.name 
                        : 'None'}
                      <span className="text-muted-foreground">▼</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0 bg-popover border shadow-lg z-50" align="start">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="Search teams..."
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="pl-7 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <ScrollArea className="max-h-48">
                      <div className="p-1">
                        <button
                          onClick={() => { setAssignedTeam('none'); setTeamSearch(''); }}
                          className={cn(
                            "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted",
                            assignedTeam === 'none' && "bg-primary/10"
                          )}
                        >
                          None
                        </button>
                        {filteredTeams.map((team) => (
                          <button
                            key={team.id}
                            onClick={() => { 
                              setAssignedTeam(team.id); 
                              setTeamSearch('');
                              toast({ title: "Team assigned", description: `Assigned to ${team.name}` });
                            }}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded text-sm hover:bg-muted",
                              assignedTeam === team.id && "bg-primary/10"
                            )}
                          >
                            {team.name}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Priority */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Priority</p>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border shadow-lg z-50">
                    {priorityLevels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        <span className="flex items-center gap-2">
                          <span className={cn(
                            "w-2 h-2 rounded-full",
                            level.color === 'gray' && 'bg-gray-400',
                            level.color === 'blue' && 'bg-blue-500',
                            level.color === 'yellow' && 'bg-yellow-500',
                            level.color === 'orange' && 'bg-orange-500',
                            level.color === 'red' && 'bg-red-500',
                          )} />
                          {level.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Labels */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Labels</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {labels.map((label) => (
                    <Badge key={label} variant="secondary" className="text-xs">
                      {label}
                      <X 
                        className="h-3 w-3 ml-1 cursor-pointer" 
                        onClick={() => setLabels(labels.filter(l => l !== label))}
                      />
                    </Badge>
                  ))}
                </div>
                <Button variant="ghost" size="sm" className="text-xs w-full justify-start" onClick={handleAddLabel}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </Button>
              </div>

              <Separator className="my-4" />

              {/* Contact Details */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                  Contact
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="text-sm">{selectedConversation.contact.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm">{selectedConversation.contact.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Channel</p>
                    <ChannelBadge channel={selectedConversation.channel} />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
