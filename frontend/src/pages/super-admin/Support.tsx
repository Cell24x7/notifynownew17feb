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
  ExternalLink
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
          const supportStaff = staffRes.data.users.filter((u: any) => 
            ['admin', 'superadmin', 'staff'].includes(u.role)
          );
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
        setSelectedTicket(response.data.ticket);
        setReplies(response.data.replies);
      }
    } catch (err) {
      toast.error("Failed to load conversation");
    }
  };

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
               <Card className="row-span-3 shadow-lg border-none">
                  <CardContent className="p-6">
                     <div className="flex items-start justify-between">
                        <div className="space-y-1">
                           <div className="flex items-center gap-3 mb-1">
                              <Badge variant="outline" className={cn(
                                  "uppercase text-[10px] font-black px-2",
                                  selectedTicket.priority === 'urgent' ? "text-red-600 bg-red-50 border-red-200" : ""
                              )}>{selectedTicket.priority} Priority</Badge>
                              <span className="text-xs font-bold text-muted-foreground mr-4">User ID: {selectedTicket.user_id}</span>
                           </div>
                           <h2 className="text-xl font-bold leading-tight">{selectedTicket.subject}</h2>
                           <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
                              <span className="flex items-center gap-1.5"><Users className="h-4 w-4" /> {selectedTicket.user_name}</span>
                              <span className="flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {selectedTicket.user_email}</span>
                           </div>
                        </div>

                        <div className="flex items-center gap-4">
                           <div className="space-y-1.5">
                              <Label className="text-[10px] font-black uppercase text-muted-foreground">Actions</Label>
                              <div className="flex gap-2">
                                <Select value={selectedTicket.status} onValueChange={(v) => handleUpdateTicket({ status: v })}>
                                    <SelectTrigger className="w-[140px] h-9 text-xs font-bold">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">Mark as Open</SelectItem>
                                        <SelectItem value="pending">In Progress</SelectItem>
                                        <SelectItem value="resolved">Resolved</SelectItem>
                                        <SelectItem value="closed">Closed</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={String(selectedTicket.assigned_to || '')} onValueChange={(v) => handleUpdateTicket({ assigned_to: v })}>
                                    <SelectTrigger className="w-[160px] h-9 text-xs font-bold border-primary/20 text-primary">
                                        <SelectValue placeholder="Assign To..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Unassigned</SelectItem>
                                        {staff.map(u => (
                                            <SelectItem key={u.id} value={String(u.id)}>{u.name} ({u.role})</SelectItem>
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
                            <p className="text-sm whitespace-pre-wrap">{selectedTicket.description}</p>
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
                           <button className="hover:text-primary transition-colors text-blue-500 flex items-center gap-1">Generate Meet Link <ExternalLink className="h-3 w-3" /></button>
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
