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
  Edit2,
  ShieldCheck,
  ExternalLink,
  ListFilter,
  UserCircle,
  Mail,
  Terminal,
  Activity,
  CheckCircle,
  Eye
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
      const [ticksRes, clientsRes] = await Promise.all([
        api.get("/support/admin/tickets"),
        api.get("/clients")
      ]);
      setTickets(ticksRes.data.tickets || []);
      const allClients = clientsRes.data.clients || [];
      // Filter for staff/admin to assign tickets
      setStaff(allClients.filter((u: any) => u.role === "admin" || u.role === "staff" || u.role === "superadmin"));
    } catch (error: any) {
      console.error("Fetch Error:", error);
      const status = error.response?.status;
      const msg = error.response?.data?.message || error.message;
      toast.error(`Sync failure (${status || 'Network'}): ${msg}`);
    } finally {

      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTicketDetails = async (id: number) => {
    try {
      const res = await api.get(`/support/tickets/${id}`);
      const ticketData = res.data.ticket || res.data.data;
      if (ticketData) {
        setSelectedTicket({
          ...ticketData,
          attachments: res.data.attachments || []
        });
      }
      setReplies(res.data.replies || res.data.data?.replies || []);
    } catch (error) {
      toast.error("Error loading conversation");
    }
  };


  const handleUpdateTicket = async (updates: any) => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/support/admin/tickets/${selectedTicket.id}`, updates);
      toast.success("Updated");
      fetchData();
      fetchTicketDetails(selectedTicket.id);
    } catch (error) {
      toast.error("Update failed");
    }
  };

  const handleSendReply = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    try {
      await api.post(`/support/tickets/${selectedTicket.id}/replies`, { message: newMessage });
      setNewMessage("");
      fetchTicketDetails(selectedTicket.id);
      toast.success("Sent");
    } catch (error) {
      toast.error("Failed to post");
    }
  };

  const filteredTickets = (tickets || []).filter(t => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    resolved: tickets.filter(t => t.status === 'resolved').length
  };

  if (loading) return <div className="p-8 text-center font-bold animate-pulse text-slate-400">CONNECTING TO SUPPORT SERVER...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50/50 dark:bg-black/10 overflow-hidden">
      
      {/* 🚀 Header Area */}
      <div className="p-5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                    <LifeBuoy className="h-6 w-6 text-primary" /> Support Command Center
                </h1>
                <p className="text-slate-400 font-semibold text-[9px] uppercase tracking-[0.15em] mt-0.5">Real-time Resolution Pipeline</p>
            </div>

            <div className="flex items-center gap-6 w-full lg:w-auto">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                   {[
                       { id: 'all', label: 'All', icon: ListFilter },
                       { id: 'open', label: 'Open', icon: Activity },
                       { id: 'resolved', label: 'Closed', icon: CheckCircle }
                   ].map((f) => (
                       <button 
                         key={f.id}
                         onClick={() => setFilter(f.id)}
                         className={cn(
                           "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                           filter === f.id ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-slate-500 hover:text-slate-700"
                         )}
                       >
                            {f.label}
                       </button>
                   ))}
                </div>
                
                <div className="flex gap-6 border-l pl-6 border-slate-200 dark:border-slate-800">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Pending</span>
                        <span className="text-lg font-bold text-rose-500">{stats.open}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Success</span>
                        <span className="text-lg font-bold text-emerald-500">{stats.resolved}</span>
                    </div>
                </div>
                
                <Button onClick={fetchData} size="sm" variant="outline" className="rounded-xl h-9 font-bold px-4">
                  <Clock className="h-3.5 w-3.5 mr-2" /> Sync
                </Button>
            </div>
        </div>
      </div>


      {/* 🧩 Container Shell */}
      <div className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full">
         
         {/* 📋 Left Sidebar: Ticket List */}
         <div className="w-full lg:w-[400px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                        placeholder="Search tickets..." 
                        className="h-11 pl-11 rounded-xl bg-slate-50 dark:bg-slate-800 border-none font-bold text-sm" 
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {filteredTickets.map(t => (
                    <div 
                        key={t.id} 
                        onClick={() => fetchTicketDetails(t.id)}
                        className={cn(
                            "px-4 py-2.5 cursor-pointer transition-all border-b border-slate-50 dark:border-slate-900 hover:bg-slate-50/50 relative",
                            selectedTicket?.id === t.id 
                                ? "bg-white dark:bg-slate-800 border-l-[3px] border-l-primary ring-1 ring-slate-100 dark:ring-slate-800" 
                                : ""
                        )}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <Badge className={cn(
                                "text-[7px] font-medium px-1.5 py-0 rounded uppercase tracking-tighter",
                                t.priority === 'urgent' ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500"
                            )}>{t.priority}</Badge>
                            <span className="text-[9px] font-medium text-slate-300">#{t.id}</span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-100 mb-1.5 leading-tight line-clamp-1">{t.subject}</h4>
                        <div className="flex items-center justify-between opacity-80">
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-medium text-slate-500 truncate max-w-[120px]">{t.user_name}</span>
                            </div>
                            <span className="text-[9px] font-medium text-slate-400 uppercase">{format(new Date(t.created_at), 'MMM dd')}</span>
                        </div>
                    </div>
                ))}
            </div>
         </div>

         <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-transparent overflow-hidden">
            {selectedTicket ? (
                <>
                    {/* 🏷️ Streamlined Header Strip (Single Row) */}
                    <div className="px-5 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-20">
                       <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Badge className="bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded">#{selectedTicket.id}</Badge>
                          <h2 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-md" title={selectedTicket.subject}>
                              {selectedTicket.subject}
                          </h2>
                          <div className="hidden xl:flex items-center gap-4 ml-4 border-l pl-4 border-slate-200 dark:border-slate-800">
                             <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                <UserCircle className="h-3.5 w-3.5 text-primary/60" /> {selectedTicket.user_name}
                             </div>
                             <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
                                <Mail className="h-3.5 w-3.5 text-primary/60" /> {selectedTicket.user_email}
                             </div>
                          </div>
                       </div>

                       <div className="flex items-center gap-3">
                           <div className="flex items-center gap-2 pr-3 border-r border-slate-200 dark:border-slate-800">
                               <Select value={selectedTicket.status} onValueChange={(v) => handleUpdateTicket({ status: v })}>
                                   <SelectTrigger className="h-8 w-[100px] bg-slate-50 dark:bg-slate-800 border-none font-bold text-[10px] uppercase">
                                       <SelectValue />
                                   </SelectTrigger>
                                   <SelectContent>
                                       {['open', 'pending', 'resolved', 'closed'].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                                   </SelectContent>
                               </Select>
                               <Select value={String(selectedTicket.assigned_to || 'unassigned')} onValueChange={(v) => handleUpdateTicket({ assigned_to: v === 'unassigned' ? null : v })}>
                                   <SelectTrigger className="h-8 w-[120px] bg-emerald-50 dark:bg-emerald-900/20 border-none text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase">
                                       <SelectValue placeholder="Agent" />
                                   </SelectTrigger>
                                   <SelectContent>
                                       <SelectItem value="unassigned">UNASSIGNED</SelectItem>
                                       {staff.map(st => <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>)}
                                   </SelectContent>
                               </Select>
                           </div>

                           <div className="flex items-center gap-1">
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-8 w-8 p-0 text-slate-400 hover:text-primary transition-colors"
                                 onClick={() => {
                                    const newSub = prompt("Edit Subject", selectedTicket.subject);
                                    if (newSub) handleUpdateTicket({ subject: newSub });
                                 }}
                               >
                                 <Edit2 className="h-3.5 w-3.5" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-8 w-8 p-0 text-slate-400 hover:text-rose-500 transition-colors"
                                 onClick={async () => {
                                   if (confirm("Delete this ticket permanently?")) {
                                     try {
                                       await api.delete(`/support/admin/tickets/${selectedTicket.id}`);
                                       toast.success("Deleted");
                                       setSelectedTicket(null);
                                       fetchData();
                                     } catch (e) { toast.error("Delete failed"); }
                                   }
                                 }}
                               >
                                 <Trash2 className="h-3.5 w-3.5" />
                               </Button>
                           </div>
                       </div>
                    </div>

                   <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-6">
                            <Badge variant="outline" className="uppercase text-[9px] font-bold">Issue Statement</Badge>
                         </div>
                         <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-lg">
                                {selectedTicket.user_name?.charAt(0)}
                            </div>
                            <div>
                                <p className="text-lg font-bold text-slate-900 dark:text-white leading-none mb-1">{selectedTicket.user_name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reported on {format(new Date(selectedTicket.created_at), 'PPPp')}</p>
                            </div>
                         </div>
                          <div className="relative">
                             <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full opacity-20" />
                             <p className="text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 leading-relaxed">
                                {selectedTicket.description}
                             </p>
                          </div>

                         {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                            <div className="mt-10 pt-10 border-t-2 border-slate-50 dark:border-slate-900">
                                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 block">Evidence Documentation ({selectedTicket.attachments.length})</Label>
                                <div className="flex flex-wrap gap-6">
                                    {selectedTicket.attachments.map((file: any) => {
                                        const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
                                        let path = file.file_url;
                                        if (!path.startsWith('http') && !path.startsWith('/api/')) path = `/api${path}`;
                                        const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
                                        return (
                                            <a key={file.id} href={fullUrl} target="_blank" rel="noreferrer" className="group rounded-2xl overflow-hidden border-[3px] border-white dark:border-slate-700 shadow-xl block w-64 aspect-video relative">
                                                <img src={fullUrl} alt="attach" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                    <Eye className="h-8 w-8 text-white scale-75 group-hover:scale-100 transition-transform" />
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                         )}
                      </div>

                      <div className="space-y-8 relative pl-6">
                        <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />
                        {replies.map(r => (
                           <div key={r.id} className={cn("flex gap-8", r.user_role === 'admin' ? "flex-row-reverse" : "")}>
                               <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center font-bold flex-shrink-0 z-10 shadow-md border-4 border-slate-50 dark:border-slate-900">
                                    {r.user_name?.charAt(0)}
                               </div>
                                <div className={cn("max-w-[85%] space-y-1", r.user_role === 'admin' ? "items-end text-right" : "")}>
                                   <div className={cn(
                                       "p-4 rounded-2xl font-bold text-xs leading-relaxed shadow-sm",
                                       r.user_role === 'admin' ? "bg-primary text-white" : "bg-white dark:bg-slate-800 border"
                                   )}>
                                       {r.message}
                                   </div>
                                   <p className="text-[9px] font-bold text-slate-400 tracking-widest uppercase px-2">
                                       Replied by {r.user_name} • {format(new Date(r.created_at), 'p')}
                                   </p>
                               </div>
                           </div>
                        ))}
                      </div>
                   </div>

                   {/* ✍️ Action Bar (Compact & Decent) */}
                   <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex gap-3 max-w-[1200px] mx-auto items-end">
                        <div className="flex-1 relative group">
                            <Textarea 
                                placeholder="Write your response... (CTRL + ENTER)" 
                                className="w-full rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 px-4 py-3 min-h-[50px] max-h-[150px] font-semibold text-sm focus-visible:ring-primary/30 transition-all resize-none overflow-y-auto"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && handleSendReply()}
                            />
                        </div>
                        <Button 
                            className="h-[50px] px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-500/20 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-2"
                            onClick={handleSendReply}
                        >
                            <Send className="h-3.5 w-3.5" /> POST
                        </Button>
                      </div>
                   </div>
                </>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white/50 dark:bg-transparent rounded-[40px] m-12 border-4 border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-32 h-32 bg-slate-100 dark:bg-slate-800 rounded-[48px] flex items-center justify-center mb-10 rotate-12 transition-all hover:rotate-0 hover:scale-110 shadow-2xl">
                        <ShieldCheck className="h-16 w-16 text-slate-400" />
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900 dark:text-white mb-4 italic tracking-tight">System Ready.</h3>
                    <p className="text-slate-400 font-bold max-w-sm text-lg leading-relaxed">Select an active ticket from the sidebar to engage. Your response is critical to our SLAs.</p>
                </div>
            )}
         </div>
      </div>
    </div>
  );
}
