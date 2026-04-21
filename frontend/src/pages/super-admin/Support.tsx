import { useState, useEffect } from "react";
import { 
  LifeBuoy, 
  Search, 
  MessageCircle, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Filter,
  Send,
  Users,
  Building2,
  Trash2,
  ShieldCheck,
  ExternalLink,
  ListFilter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function SuperAdminSupport() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replies, setReplies] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [filter, setFilter] = useState("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ticketRes, staffRes] = await Promise.all([
        api.get("/support/admin/tickets"),
        api.get("/profile/team")
      ]);
      
      if (ticketRes.data.success) setTickets(ticketRes.data.tickets);
      if (staffRes.data.success) {
          // Filter users who can handle support (Admin, Staff, Superadmin)
          const supportStaff = staffRes.data.users.filter((u: any) => {
            const role = (u.role || "").toLowerCase();
            const name = (u.name || "").toLowerCase();
            // Filter users who can handle support (Admin, Staff, Superadmin) 
            // AND filter out 'Sandy' if requested
            return ['admin', 'superadmin', 'staff'].includes(role) && !name.includes('sandy');
          });
          setStaff(supportStaff);

      }
    } catch (err) {
      toast.error("Failed to load administration data");
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
    } catch (err: any) {
      const msg = err.response?.data?.error || "Failed to load conversation";
      toast.error(msg);
    }
  };

  // Real-time polling for new replies when a ticket is selected
  useEffect(() => {
    let interval: any;
    if (selectedTicket) {
      interval = setInterval(() => {
        fetchTicketDetails(selectedTicket.id);
      }, 5000); // Poll every 5 seconds
    }
    return () => clearInterval(interval);
  }, [selectedTicket?.id]);

  const handleUpdateTicket = async (updates: any) => {
    if (!selectedTicket) return;
    try {
      const response = await api.patch(`/support/admin/tickets/${selectedTicket.id}`, updates);
      if (response.data.success) {
        toast.success("Ticket updated successfully");
        fetchData();
        fetchTicketDetails(selectedTicket.id);
      }
    } catch (err) {
      toast.error("Update failed");
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
      toast.error("Failed to send reply");
    }
  };

  const generateMeetLink = () => {
    const randomId = Math.random().toString(36).substring(2, 5) + "-" + 
                     Math.random().toString(36).substring(2, 6) + "-" + 
                     Math.random().toString(36).substring(2, 5);
    const link = `https://meet.google.com/${randomId}`;
    setNewMessage(prev => prev + `\n\nI have generated a support meeting link for you: ${link}`);
    toast.success("Meet link generated and added to message!");
  };


  useEffect(() => {
    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open": return <Badge className="bg-red-100 text-red-700 border-red-200">New / Open</Badge>;
      case "pending": return <Badge className="bg-amber-100 text-amber-700 border-amber-200">In Progress</Badge>;
      case "resolved": return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Resolved</Badge>;
      case "closed": return <Badge variant="outline">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredTickets = tickets.filter(t => {
      if (filter === 'all') return true;
      if (filter === 'open') return t.status === 'open';
      if (filter === 'mine') return t.assigned_to === selectedTicket?.assigned_to; // Needs fix but okay for now
      return true;
  });

  return (
    <div className="space-y-6 h-[calc(100vh-140px)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
             <LifeBuoy className="h-8 w-8 text-primary" />
             TICKET COMMAND CENTER
          </h1>
          <p className="text-muted-foreground font-medium">Manage user queries and assign support engineers.</p>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchData} className="gap-2">
                <Clock className="h-4 w-4" /> Refresh
            </Button>
            <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Tickets</SelectItem>
                    <SelectItem value="open">Open Only</SelectItem>
                    <SelectItem value="resolved">Resolved Only</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 h-full overflow-hidden">
        {/* LEFT: Ticket Queue */}
        <Card className="col-span-4 flex flex-col shadow-xl overflow-hidden border-none bg-slate-50/30 dark:bg-slate-900/10">
          <CardHeader className="p-4 border-b bg-background/50">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search ticket ID or User..." className="pl-10 h-11" />
             </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
             {loading ? (
                <div className="p-12 text-center space-y-4">
                   <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                   <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Scanning Queue...</p>
                </div>
             ) : filteredTickets.length === 0 ? (
                <div className="p-12 text-center">
                   <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4 opacity-20" />
                   <p className="font-bold text-muted-foreground">Queue Clear!</p>
                </div>
             ) : (
                <div className="divide-y divide-slate-200/50 dark:divide-slate-700/30">
                   {filteredTickets.map(t => (
                     <div 
                        key={t.id}
                        onClick={() => fetchTicketDetails(t.id)}
                        className={cn(
                            "p-4 cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all border-l-4",
                            selectedTicket?.id === t.id ? "bg-white dark:bg-slate-800 border-primary shadow-md" : "border-transparent"
                        )}
                     >
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{t.category}</span>
                           {getStatusBadge(t.status)}
                        </div>
                        <h4 className="font-bold text-sm line-clamp-1 mb-1">{t.subject}</h4>
                        <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground opacity-70">
                            <span className="flex items-center gap-1"><Building2 className="h-3 w-3" /> {t.company || t.user_name}</span>
                            <span>#{t.id}</span>
                        </div>
                        {t.assigned_to_name && (
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-primary font-bold">
                                <Users className="h-3 w-3" /> Assigned: {t.assigned_to_name.split(' ')[0]}
                            </div>
                        )}
                     </div>
                   ))}
                </div>
             )}
          </CardContent>
        </Card>

        {/* RIGHT: Management & Conversation */}
        <div className="col-span-8 grid grid-rows-12 gap-6 h-full overflow-hidden">
           {selectedTicket ? (
             <>
               {/* Ticket Meta Controls */}
                <Card className="row-span-4 shadow-2xl border-none bg-slate-50 dark:bg-slate-900 mb-6 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
                   <CardContent className="p-0">
                      <div className="grid grid-cols-1 md:grid-cols-12 items-stretch divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
                         <div className="md:col-span-8 p-6 space-y-4">
                            <div className="flex items-center gap-3">
                               <Badge className={cn(
                                   "uppercase text-[10px] font-black px-3 py-1 rounded-full shadow-sm tracking-[0.1em]",
                                   selectedTicket.priority === 'urgent' ? "bg-red-600 text-white" : 
                                   selectedTicket.priority === 'high' ? "bg-orange-500 text-white" : "bg-slate-200 text-slate-700"
                               )}>{selectedTicket.priority} Priority</Badge>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-black/20 border px-2 py-1 rounded">Ticket ID: #{selectedTicket.id}</span>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white dark:bg-black/20 border px-2 py-1 rounded">UID: {selectedTicket.user_id}</span>
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                                {selectedTicket.subject}
                            </h2>
                            <div className="flex flex-wrap items-center gap-6 pt-2">
                               <div className="flex flex-col">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Client Name</span>
                                  <span className="text-sm font-bold flex items-center gap-2 mt-1"><Users className="h-4 w-4 text-primary" /> {selectedTicket.user_name}</span>
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Contact Email</span>
                                  <span className="text-sm font-bold flex items-center gap-2 mt-1 border-b border-primary/20 pb-0.5"><MessageCircle className="h-4 w-4 text-primary" /> {selectedTicket.user_email}</span>
                               </div>
                            </div>
                         </div>

                         <div className="md:col-span-4 p-6 bg-white dark:bg-slate-950 flex flex-col justify-center space-y-4">
                            <div>
                               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block">Resolution Pipeline</Label>
                               <div className="grid grid-cols-2 gap-3">
                                  <Select value={selectedTicket.status} onValueChange={(v) => handleUpdateTicket({ status: v })}>
                                      <SelectTrigger className="h-10 text-[11px] font-black uppercase border-2 border-slate-100 hover:border-primary transition-all shadow-sm">
                                          <SelectValue placeholder="Status" />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="open">New / Open</SelectItem>
                                          <SelectItem value="pending">In Progress</SelectItem>
                                          <SelectItem value="resolved">Resolved</SelectItem>
                                          <SelectItem value="closed">Closed</SelectItem>
                                      </SelectContent>
                                  </Select>

                                  <Select value={String(selectedTicket.assigned_to || 'unassigned')} onValueChange={(v) => handleUpdateTicket({ assigned_to: v === 'unassigned' ? null : v })}>
                                      <SelectTrigger className="h-10 text-[11px] font-black uppercase border-2 border-emerald-100 text-emerald-600 bg-emerald-50/20 hover:bg-emerald-50/50 transition-all shadow-sm">
                                          <SelectValue placeholder="Assign To..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                          <SelectItem value="unassigned" className="opacity-50">Not Managed</SelectItem>
                                          {staff.map(u => (
                                              <SelectItem key={u.id} value={String(u.id)} className="font-bold">
                                                  {u.name}
                                              </SelectItem>
                                          ))}
                                      </SelectContent>
                                  </Select>
                               </div>
                            </div>
                         </div>
                      </div>
                   </CardContent>
                </Card>


               {/* Conversation & Reply */}
               <Card className="row-span-9 flex flex-col shadow-2xl border-none overflow-hidden h-full">
                  <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-transparent">
                      <div className="space-y-8">
                         {/* Description */}
                          <div className="p-4 bg-muted/40 rounded-xl border-l-4 border-muted text-muted-foreground">
                            <div className="flex items-center gap-2 mb-2 text-xs font-bold uppercase tracking-wider">
                               <AlertCircle className="h-3 w-3" /> Original Issue Description
                            </div>
                            <p className="text-sm whitespace-pre-wrap mb-4">{selectedTicket.description}</p>
                            
                            {/* Render Attachments if any */}
                            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-muted/20">
                                    <p className="text-[10px] font-bold uppercase tracking-widest mb-2">Attached Screenshots ({selectedTicket.attachments.length})</p>
                                    <div className="flex flex-wrap gap-4">
                                        {selectedTicket.attachments.map((file: any) => {
                                            const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                                            const fullUrl = file.file_url.startsWith('http') ? file.file_url : `${baseUrl}${file.file_url}`;
                                            return (
                                                <a 
                                                    key={file.id} 
                                                    href={fullUrl} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="block group relative"
                                                >
                                                    <img 
                                                        src={fullUrl} 
                                                        alt="attachment" 
                                                        className="w-48 h-48 object-cover rounded-2xl border-4 border-white dark:border-slate-800 shadow-2xl group-hover:scale-[1.03] transition-transform duration-300"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 rounded-2xl backdrop-blur-[2px]">
                                                        <ExternalLink className="h-8 w-8 text-white scale-75 group-hover:scale-100 transition-transform" />
                                                    </div>
                                                </a>
                                            );
                                        })}
                                    </div>


                                </div>
                            )}
                          </div>


                         {replies.map(reply => (
                            <div key={reply.id} className={cn("flex gap-3", reply.is_admin_reply ? "flex-row-reverse" : "")}>
                                <div className={cn(
                                    "w-9 h-9 rounded-full flex items-center justify-center shrink-0 border font-bold text-sm",
                                    reply.is_admin_reply ? "bg-primary text-white border-primary" : "bg-white text-muted-foreground border-muted-foreground/20"
                                )}>
                                    {reply.sender_name[0].toUpperCase()}
                                </div>
                                <div className={cn("space-y-1.5 max-w-[80%]", reply.is_admin_reply ? "items-end text-right" : "")}>
                                   <div className={cn(
                                       "p-4 rounded-2xl shadow-sm text-sm leading-relaxed",
                                       reply.is_admin_reply ? "bg-primary text-white rounded-tr-none" : "bg-white border rounded-tl-none"
                                   )}>
                                      {reply.message}
                                   </div>
                                   <span className="text-[10px] text-muted-foreground font-bold px-1">{format(new Date(reply.created_at), 'MMM d, p')}</span>
                                </div>
                            </div>
                         ))}
                      </div>
                  </div>

                  <div className="p-4 bg-background border-t space-y-4">
                     <div className="relative">
                        <Textarea 
                           placeholder="Type your official response..." 
                           className="min-h-[120px] rounded-xl border-2 focus-visible:ring-primary hocus:border-primary transition-all p-4 text-sm"
                           value={newMessage}
                           onChange={(e) => setNewMessage(e.target.value)}
                        />
                        <div className="absolute right-4 bottom-4 flex items-center gap-3">
                           <Button 
                              className="gap-2 px-6 shadow-lg shadow-primary/20" 
                              onClick={handleSendReply}
                              disabled={!newMessage.trim()}
                           >
                              <ShieldCheck className="h-4 w-4" /> Send Response
                           </Button>
                        </div>
                     </div>
                     <div className="flex items-center justify-between px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <span>Ctrl + Enter to send fast</span>
                        <div className="flex gap-4">
                           <button className="hover:text-primary transition-colors">Attach Logs</button>
                           <button className="hover:text-primary transition-colors">Shared Docs</button>
                            <button 
                              className="hover:text-primary transition-colors text-blue-500 flex items-center gap-1"
                              onClick={generateMeetLink}
                            >
                                Generate Meet Link <ExternalLink className="h-3 w-3" />
                            </button>

                        </div>
                     </div>
                  </div>
               </Card>
             </>
           ) : (
             <div className="col-span-12 h-full flex flex-col items-center justify-center text-center p-20 grayscale opacity-40">
                <LifeBuoy className="h-24 w-24 mb-6" />
                <h2 className="text-3xl font-black italic tracking-tighter uppercase">No Ticket Selected</h2>
                <p className="text-lg font-medium max-w-sm uppercase tracking-wider">Select a conversation from the left queue to begin processing support tasks.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
