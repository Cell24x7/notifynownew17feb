import { useState, useEffect } from "react";
import { 
  LifeBuoy, 
  Search, 
  Plus, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  Filter,
  Send,
  Paperclip,
  ImageIcon,
  ListFilter,
  Users,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRef } from "react";


export default function Support() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const { user } = useAuth();

  // Create Ticket State
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "General",
    priority: "medium",
    description: ""
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);


  const fetchTickets = async () => {
    try {
      const response = await api.get("/support/tickets");
      if (response.data.success) {
        setTickets(response.data.tickets);
      }
    } catch (err) {
      toast.error("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (id: number) => {
    try {
      const response = await api.get(`/support/tickets/${id}`);
      if (response.data.success) {
        setSelectedTicket({
            ...response.data.ticket,
            attachments: response.data.attachments || []
        });
        setReplies(response.data.replies);
      }
    } catch (err) {
      toast.error("Failed to load conversation");
    }
  };

  // Poll for replies
  useEffect(() => {
    let interval: any;
    if (selectedTicket) {
      interval = setInterval(() => {
        fetchTicketDetails(selectedTicket.id);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [selectedTicket?.id]);


  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      return toast.error("Please fill all required fields");
    }

    try {
      const formData = new FormData();
      formData.append('subject', newTicket.subject);
      formData.append('category', newTicket.category);
      formData.append('priority', newTicket.priority);
      formData.append('description', newTicket.description);
      
      attachments.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await api.post("/support/tickets", formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data.success) {
        toast.success("Support ticket raised successfully!");
        setIsCreateOpen(false);
        setNewTicket({ subject: "", category: "General", priority: "medium", description: "" });
        setAttachments([]);
        fetchTickets();
      }
    } catch (err) {
      toast.error("Failed to raise ticket");
    }
  };


  const handleSendReply = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      const response = await api.post(`/support/tickets/${selectedTicket.id}/replies`, {
        message: newMessage
      });
      if (response.data.success) {
        setNewMessage("");
        fetchTicketDetails(selectedTicket.id);
      }
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Smart URL Resolver for Attachments (Handles legacy and new paths)
  const resolveImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    let cleanPath = path;
    
    // Ensure /api/ prefix if missing for internal paths
    if (!cleanPath.startsWith('/api/') && !cleanPath.startsWith('/uploads/')) {
      cleanPath = `/api${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
    }
    
    return cleanPath.startsWith('http') ? cleanPath : `${baseUrl}${cleanPath}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 uppercase text-[10px] font-bold">Open</Badge>;
      case "pending": return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 uppercase text-[10px] font-bold">Pending</Badge>;
      case "resolved": return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 uppercase text-[10px] font-bold">Resolved</Badge>;
      case "closed": return <Badge variant="outline" className="text-gray-500 uppercase text-[10px] font-bold">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 lg:p-0">
      
      {/* 📘 Knowledge Base Promo */}
      <div className="bg-gradient-to-r from-primary to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
          <div className="relative z-10 space-y-1.5">
             <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-white/20 text-white border-none font-bold px-2 py-0.5 text-[9px] uppercase tracking-widest rounded-full">Self-Service Hub</Badge>
             </div>
             <h2 className="text-xl md:text-2xl font-black tracking-tight">Need Instant Solutions?</h2>
             <p className="text-white/80 font-medium max-w-lg text-sm">Search our extensive Knowledge Base for quick answers before raising a ticket.</p>
          </div>
          <Button asChild className="h-11 px-8 rounded-xl bg-white text-primary hover:bg-slate-100 font-bold relative z-10 shadow-lg text-sm group/btn">
             <Link to="/support/help" className="flex items-center gap-2">
                Search Documentation 
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
             </Link>
          </Button>

          {/* Decorative Orbs */}
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:scale-125 transition-transform duration-1000" />
          <div className="absolute left-1/4 -top-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-[80px]" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-10 border-t border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground uppercase tracking-widest">Active Tickets</h1>
          <p className="text-muted-foreground mt-1 text-lg font-medium">Manage your existing support conversations</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="h-12 px-6 gap-2 text-base font-semibold shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5">
              <Plus className="h-5 w-5" />
              New Support Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
            <DialogHeader className="p-6 bg-slate-50 border-b">
              <DialogTitle className="text-2xl font-bold">Raise a New Ticket</DialogTitle>
              <DialogDescription className="text-base text-muted-foreground">
                Provide details about your issue. We aim to respond within 2-4 hours.
              </DialogDescription>
            </DialogHeader>

            <div className="overflow-y-auto max-h-[70vh] p-6 space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="subject" className="text-sm font-bold uppercase tracking-widest text-slate-500">Subject</Label>
                <Input 
                  id="subject" 
                  placeholder="e.g., API is returning 500 error" 
                  className="h-11 rounded-xl border-2 focus-visible:ring-primary"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="category" className="text-sm font-bold uppercase tracking-widest text-slate-500">Category</Label>
                  <Select 
                    value={newTicket.category} 
                    onValueChange={(v) => setNewTicket({...newTicket, category: v})}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-2">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General Inquiry</SelectItem>
                      <SelectItem value="API">API & Integration</SelectItem>
                      <SelectItem value="WhatsApp">WhatsApp Channel</SelectItem>
                      <SelectItem value="RCS">RCS Messaging</SelectItem>
                      <SelectItem value="Billing">Billing & Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority" className="text-sm font-bold uppercase tracking-widest text-slate-500">Priority Level</Label>
                  <Select 
                    value={newTicket.priority} 
                    onValueChange={(v) => setNewTicket({...newTicket, priority: v})}
                  >
                    <SelectTrigger className="h-11 rounded-xl border-2">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-sm font-bold uppercase tracking-widest text-slate-500">Describe your issue</Label>
                <Textarea 
                  id="description" 
                  placeholder="Please provide as much detail as possible..."
                  className="min-h-[120px] text-base resize-none rounded-xl border-2 focus-visible:ring-primary"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                />
              </div>
              <div 
                className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border-2 border-dashed border-primary/20 text-sm font-bold text-primary cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="h-5 w-5" />
                <span>{attachments.length > 0 ? `${attachments.length} files selected` : "Attach screenshots (Optional)"}</span>
              </div>
              <input 
                type="file" 
                multiple 
                hidden 
                ref={fileInputRef} 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files) setAttachments(Array.from(e.target.files));
                }}
              />
            </div>

            <DialogFooter className="p-6 bg-slate-50 border-t items-center sm:justify-between">
              <Button variant="ghost" className="font-bold text-slate-500" onClick={() => setIsCreateOpen(false)}>Discard</Button>
              <Button className="h-11 px-8 font-bold rounded-xl shadow-lg shadow-primary/20" onClick={handleCreateTicket}>Create Ticket</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar: Ticket List */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="shadow-lg border-muted/20">
            <CardHeader className="pb-3 border-b border-muted/10 bg-muted/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Your Tickets
                </CardTitle>
                <Badge variant="outline" className="font-semibold">{tickets.length} Total</Badge>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search your tickets..." className="pl-9 bg-background/50 h-10" />
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[700px] overflow-y-auto">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-4 font-medium">Loading your tickets...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LifeBuoy className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-foreground font-semibold">No active tickets</p>
                  <p className="text-muted-foreground text-sm mt-1">If you have a problem, raise your first ticket above.</p>
                </div>
              ) : (
                <div className="divide-y divide-muted/10">
                  {tickets.map((ticket) => (
                    <div 
                      key={ticket.id}
                      onClick={() => fetchTicketDetails(ticket.id)}
                      className={cn(
                        "p-5 cursor-pointer hover:bg-muted/50 transition-all group relative",
                        selectedTicket?.id === ticket.id ? "bg-primary/5 after:absolute after:left-0 after:top-0 after:bottom-0 after:w-1 after:bg-primary" : ""
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs font-bold text-muted-foreground tracking-widest uppercase truncate max-w-[150px]">
                          {ticket.category}
                        </span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <h4 className={cn(
                          "font-bold text-lg leading-snug line-clamp-2 pr-4",
                          selectedTicket?.id === ticket.id ? "text-primary" : "text-foreground"
                      )}>
                        {ticket.subject}
                      </h4>
                      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {format(new Date(ticket.created_at), 'MMM d, h:mm a')}
                        </span>
                        <span>#{ticket.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content: Conversation View */}
        <div className="lg:col-span-7 h-full min-h-[500px]">
          {selectedTicket ? (
            <Card className="h-full flex flex-col shadow-2xl border-primary/10 overflow-hidden">
              <CardHeader className="border-b bg-muted/5 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(selectedTicket.status)}
                      <span className="text-xs font-semibold text-muted-foreground tracking-wider">#{selectedTicket.id}</span>
                    </div>
                    <CardTitle className="text-2xl font-black leading-tight text-foreground">{selectedTicket.subject}</CardTitle>
                    <div className="flex items-center gap-6 mt-3 text-sm text-muted-foreground font-medium">
                      <span className="flex items-center gap-1.5"><ListFilter className="h-4 w-4" /> {selectedTicket.category}</span>
                      <span className="flex items-center gap-1.5 capitalize"><AlertCircle className="h-4 w-4" /> {selectedTicket.priority} Priority</span>
                      {selectedTicket.assistant_name && (
                         <span className="flex items-center gap-1.5 text-primary"><Users className="h-4 w-4" /> Assigned to: {selectedTicket.assistant_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-y-auto p-0 bg-slate-50/50 dark:bg-slate-950/20">
                 <div className="p-6 space-y-8">
                    {/* The Initial Issue */}
                    <div className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                            <span className="text-primary font-bold">{user?.name ? user.name[0].toUpperCase() : 'U'}</span>
                        </div>
                        <div className="space-y-2 max-w-[85%]">
                            <div className="bg-card p-4 rounded-2xl rounded-tl-none shadow-sm border border-muted/20">
                                <p className="text-foreground whitespace-pre-wrap leading-relaxed mb-4">{selectedTicket.description}</p>
                                
                                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-muted/20">
                                        <p className="text-[10px] font-bold uppercase tracking-widest mb-2">My Attachments ({selectedTicket.attachments.length})</p>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedTicket.attachments.map((file: any) => (
                                                <a 
                                                    key={file.id} 
                                                    href={resolveImageUrl(file.file_url)} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                >
                                                    <img 
                                                        src={resolveImageUrl(file.file_url)} 
                                                        alt="attachment" 
                                                        className="w-24 h-24 object-cover rounded-lg border shadow-sm hover:opacity-80 transition-opacity"
                                                    />
                                                </a>
                                            ))}
                                        </div>

                                    </div>
                                )}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-semibold px-2">{format(new Date(selectedTicket.created_at), 'MMM d, h:mm a')}</span>
                        </div>

                    </div>

                    {/* Conversation Replies */}
                    {replies.map((reply) => (
                        <div key={reply.id} className={cn(
                            "flex gap-4",
                            reply.is_admin_reply ? "flex-row-reverse" : ""
                        )}>
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
                                reply.is_admin_reply ? "bg-emerald-500 border-emerald-600 text-white" : "bg-primary/10 border-primary/20 text-primary"
                            )}>
                                <span className={cn("font-bold")}>{reply.sender_name[0].toUpperCase()}</span>
                            </div>
                            <div className={cn(
                                "space-y-2 max-w-[85%]",
                                reply.is_admin_reply ? "items-end" : ""
                            )}>
                                <div className={cn(
                                    "p-4 rounded-2xl shadow-sm border leading-relaxed",
                                    reply.is_admin_reply 
                                        ? "bg-emerald-500 text-white rounded-tr-none border-emerald-600" 
                                        : "bg-card text-foreground rounded-tl-none border-muted/20"
                                )}>
                                    <p className="whitespace-pre-wrap">{reply.message}</p>
                                </div>
                                <div className={cn(
                                    "flex items-center gap-2 px-2",
                                    reply.is_admin_reply ? "justify-end" : ""
                                )}>
                                    {reply.is_admin_reply && <Badge variant="outline" className="text-[9px] py-0 h-4 uppercase tracking-tighter bg-emerald-50 border-emerald-200 text-emerald-700">Staff</Badge>}
                                    <span className="text-[11px] text-muted-foreground font-semibold">{format(new Date(reply.created_at), 'MMM d, h:mm a')}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
              </CardContent>

              <div className="p-4 bg-background border-t">
                {selectedTicket.status === 'closed' ? (
                   <div className="p-4 bg-muted/50 rounded-xl text-center text-muted-foreground font-medium border border-dashed">
                      This ticket has been closed. Please raise a new ticket if you still need help.
                   </div>
                ) : (
                  <div className="relative group">
                    <Textarea 
                      placeholder="Type your response here..." 
                      className="min-h-[100px] pr-20 pt-4 pb-12 rounded-xl focus-visible:ring-primary shadow-inner bg-slate-50/50 resize-none transition-all focus:bg-background"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) handleSendReply();
                      }}
                    />
                    <div className="absolute right-3 bottom-3 flex items-center gap-2">
                       <Button size="icon" variant="ghost" className="h-10 w-10 text-muted-foreground hover:text-primary transition-colors">
                          <Paperclip className="h-5 w-5" />
                       </Button>
                       <Button 
                        size="icon" 
                        className="h-10 w-10 shadow-lg hover:shadow-primary/20 transition-all hover:-translate-y-0.5"
                        onClick={handleSendReply}
                        disabled={!newMessage.trim()}
                       >
                          <Send className="h-5 w-5" />
                       </Button>
                    </div>
                    <div className="absolute left-3 bottom-4 text-[10px] text-muted-foreground font-bold uppercase tracking-widest pointer-events-none opacity-0 group-focus-within:opacity-100 transition-opacity">
                      Ctrl + Enter to send
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="h-full border-dashed flex flex-col items-center justify-center p-12 text-center bg-muted/5">
              <div className="bg-primary/10 w-24 h-24 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <MessageCircle className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-foreground">View Conversation</h3>
              <p className="text-muted-foreground text-lg mt-2 max-w-sm">
                Select a ticket from the left list to see the full conversation and updates from our team.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-sm">
                 <div className="p-4 bg-background rounded-xl border flex flex-col items-center gap-2 shadow-sm">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                    <span className="text-xs font-bold text-muted-foreground">Expert Team</span>
                 </div>
                 <div className="p-4 bg-background rounded-xl border flex flex-col items-center gap-2 shadow-sm">
                    <Clock className="h-6 w-6 text-blue-500" />
                    <span className="text-xs font-bold text-muted-foreground">24/7 Support</span>
                 </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
