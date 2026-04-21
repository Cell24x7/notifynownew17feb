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
      const [ticksRes, staffRes] = await Promise.all([
        api.get("/api/support/admin/tickets"),
        api.get("/api/clients/all")
      ]);
      setTickets(ticksRes.data.tickets || []);
      setStaff((staffRes.data.data || []).filter((u: any) => u.role === "admin" || u.role === "staff"));
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Sync failure: Admin clearance required");
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
      const res = await api.get(`/api/support/tickets/${id}`);
      setSelectedTicket(res.data.ticket || res.data.data);
      setReplies(res.data.replies || res.data.data?.replies || []);
    } catch (error) {
      toast.error("Error loading conversation");
    }
  };

  const handleUpdateTicket = async (updates: any) => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/api/support/admin/tickets/${selectedTicket.id}`, updates);
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
      await api.post(`/api/support/tickets/${selectedTicket.id}/replies`, { message: newMessage });
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
                            "group p-5 rounded-2xl border-2 transition-all cursor-pointer",
                            selectedTicket?.id === t.id 
                                ? "bg-white dark:bg-slate-800 border-primary shadow-xl ring-4 ring-primary/5 scale-[1.02]" 
                                : "bg-transparent border-transparent hover:bg-white dark:hover:bg-slate-800 hover:border-slate-200 dark:hover:border-slate-700"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <Badge className={cn(
                                "text-[8px] font-bold px-2 py-1 uppercase rounded-md tracking-widest",
                                t.priority === 'urgent' ? "bg-rose-500 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                            )}>{t.priority}</Badge>
                            <span className="text-[10px] font-bold text-slate-300">#{t.id}</span>
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2 leading-tight line-clamp-2">{t.subject}</h4>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">{t.user_name?.charAt(0)}</div>
                                <span className="text-[11px] font-bold text-slate-500">{t.user_name}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-300 uppercase">{format(new Date(t.created_at), 'MMM dd')}</span>
                        </div>
                    </div>
                ))}
            </div>
         </div>

         {/* 💬 Right Pane: Conversational Detail */}
         <div className="flex-1 flex flex-col bg-slate-50/50 dark:bg-transparent overflow-hidden">
            {selectedTicket ? (
                <>
                   {/* 🏷️ Detail Strip */}
                   <div className="p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex flex-col xl:flex-row justify-between gap-8">
                         <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-4 mb-4">
                                <Badge className="bg-slate-900 text-white uppercase text-[10px] font-bold px-4 py-1 rounded-lg">Documentation</Badge>
                                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ID: {selectedTicket.id}</span>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-[1.1] mb-6">
                                {selectedTicket.subject}
                            </h2>
                            <div className="flex flex-wrap gap-6 mt-6">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Contact Person</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <UserCircle className="h-4 w-4 text-primary" /> {selectedTicket.user_name} (UID: {selectedTicket.user_id})
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Registered Email</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-primary" /> {selectedTicket.user_email}
                                    </span>
                                </div>
                            </div>
                         </div>

                         <div className="flex flex-col gap-4 min-w-[280px]">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Lifecycle</Label>
                                    <Select value={selectedTicket.status} onValueChange={(v) => handleUpdateTicket({ status: v })}>
                                        <SelectTrigger className="h-11 bg-white border-2 font-bold text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['open', 'pending', 'resolved', 'closed'].map(s => <SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Agent</Label>
                                    <Select value={String(selectedTicket.assigned_to || 'unassigned')} onValueChange={(v) => handleUpdateTicket({ assigned_to: v === 'unassigned' ? null : v })}>
                                        <SelectTrigger className="h-11 bg-emerald-50 border-emerald-500/20 text-emerald-700 font-bold text-xs uppercase">
                                            <SelectValue placeholder="staff" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="unassigned">NONE</SelectItem>
                                            {staff.map(st => <SelectItem key={st.id} value={String(st.id)}>{st.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                             </div>
                             <Button variant="outline" className="w-full h-11 border-2 font-bold uppercase text-[10px] tracking-widest rounded-xl">
                                <Activity className="h-4 w-4 mr-2" /> View Client Activity Logs
                             </Button>
                         </div>
                      </div>
                   </div>

                   {/* 🌊 Thread View */}
                   <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                      
                      {/* 🚩 The Original Case Description */}
                      <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
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
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-full opacity-20" />
                            <p className="text-xl font-bold text-slate-700 dark:text-slate-300 pl-8 leading-relaxed">
                               {selectedTicket.description}
                            </p>
                         </div>

                         {/* 🖇️ Visual Attachments */}
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

                      {/* 🔄 Timeline Replies */}
                      <div className="space-y-8 relative pl-6">
                        <div className="absolute left-1 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />
                        {replies.map(r => (
                           <div key={r.id} className={cn("flex gap-8", r.user_role === 'admin' ? "flex-row-reverse" : "")}>
                               <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center font-bold flex-shrink-0 z-10 shadow-md border-4 border-slate-50 dark:border-slate-900">
                                    {r.user_name?.charAt(0)}
                               </div>
                               <div className={cn("max-w-[80%] space-y-2", r.user_role === 'admin' ? "items-end text-right" : "")}>
                                   <div className={cn(
                                       "p-7 rounded-[28px] font-bold text-sm leading-relaxed shadow-sm",
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

                   {/* ✍️ Action Bar */}
                   <div className="p-8 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-[0_-15px_40px_rgba(0,0,0,0.03)]">
                      <div className="flex gap-6 max-w-[1200px] mx-auto">
                        <Textarea 
                            placeholder="Draft your professional response... (CTRL + ENTER to broadcast)" 
                            className="flex-1 rounded-[24px] border-2 border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 p-8 min-h-[100px] font-bold text-base focus-visible:ring-primary/50 transition-all shadow-inner"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => e.ctrlKey && e.key === 'Enter' && handleSendReply()}
                        />
                        <Button 
                            className="h-auto px-10 rounded-[28px] font-bold uppercase text-xs tracking-[0.2em] flex flex-col gap-3 shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-95"
                            onClick={handleSendReply}
                        >
                            <Send className="h-6 w-6" /> POST REPLY
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
