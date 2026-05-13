import React, { useState } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Facebook, Instagram, Linkedin, Twitter, 
  Plus, Calendar, BarChart3, Send, 
  Settings2, Image as ImageIcon, Video, 
  MessageCircle, Zap, Globe, Clock, 
  ShieldCheck, ArrowUpRight, TrendingUp,
  X, Check, ExternalLink, MoreHorizontal
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const SocialMedia = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string[]>([]);
  const [postContent, setPostContent] = useState('');
  const [activeAccount, setActiveAccount] = useState<any>(null);

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600', border: 'border-blue-100', bg: 'bg-blue-50', status: 'connected', followers: '12.4K' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600', border: 'border-pink-100', bg: 'bg-pink-50', status: 'connected', followers: '8.2K' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', border: 'border-blue-100', bg: 'bg-blue-50/50', status: 'disconnected', followers: '3.1K' },
    { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'text-sky-500', border: 'border-sky-100', bg: 'bg-sky-50', status: 'disconnected', followers: '1.5K' },
    { id: 'whatsapp', name: 'WhatsApp', icon: MessageCircle, color: 'text-emerald-600', border: 'border-emerald-100', bg: 'bg-emerald-50', status: 'connected', followers: 'Channels' },
  ];

  const recentPosts = [
    { id: 1, content: 'Our new summer collection is live! Check it out now. #SummerVibes', platform: 'instagram', status: 'published', engagement: 1245, date: '2 hours ago' },
    { id: 2, content: 'Exciting news! We just launched our new API hub for developers.', platform: 'facebook', status: 'scheduled', engagement: 0, date: 'Tomorrow, 10:00 AM' },
    { id: 3, content: 'Join our upcoming webinar on marketing automation strategies.', platform: 'linkedin', status: 'published', engagement: 450, date: '1 day ago' },
  ];

  const togglePlatformSelection = (id: string) => {
    setSelectedPlatform(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleCreatePost = () => {
    if (selectedPlatform.length === 0) {
      toast({ title: "Select Platform", description: "Please select at least one platform to post.", variant: "destructive" });
      return;
    }
    if (!postContent.trim()) {
      toast({ title: "Empty Content", description: "Post content cannot be empty.", variant: "destructive" });
      return;
    }
    
    toast({
      title: "Post Scheduled!",
      description: `Successfully scheduled for ${selectedPlatform.join(', ')}`,
      className: "bg-emerald-50 border-emerald-200 text-emerald-800"
    });
    setIsPostModalOpen(false);
    setPostContent('');
    setSelectedPlatform([]);
  };

  const handleManageAccount = (platform: any) => {
    setActiveAccount(platform);
    setIsAccountModalOpen(true);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
              <Globe className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Social Media Marketing</h1>
          </div>
          <p className="text-slate-500 font-medium ml-1">Centralized hub for cross-platform audience engagement.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="font-bold rounded-2xl border-2 hover:bg-slate-50 h-12 px-6">
            <Calendar className="w-4 h-4 mr-2" />
            Post Planner
          </Button>
          <Button 
            onClick={() => setIsPostModalOpen(true)}
            className="font-bold rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 h-12 px-8"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Post
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-8" onValueChange={setActiveTab}>
        <div className="bg-slate-100/50 p-1.5 rounded-2xl w-fit inline-flex border border-slate-200/60 shadow-inner">
          <TabsList className="bg-transparent h-10 gap-1">
            <TabsTrigger value="overview" className="rounded-xl font-bold px-6 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all">Overview</TabsTrigger>
            <TabsTrigger value="accounts" className="rounded-xl font-bold px-6 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all">Manage Accounts</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl font-bold px-6 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-md transition-all">Insights</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
          {/* Platform Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {platforms.map((platform) => (
              <Card key={platform.id} className="relative overflow-hidden group hover:shadow-xl transition-all duration-500 rounded-[32px] border-slate-100/80 bg-white/80 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110", platform.bg)}>
                      <platform.icon className={cn("w-7 h-7", platform.color)} />
                    </div>
                    <div className={cn(
                        "w-2 h-2 rounded-full",
                        platform.status === 'connected' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-300"
                    )} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">{platform.followers}</h3>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{platform.name}</p>
                  </div>
                </CardContent>
                <div className={cn("absolute bottom-0 left-0 w-full h-1 transition-opacity", platform.status === 'connected' ? "bg-emerald-500" : "bg-transparent")} />
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Posts List */}
            <Card className="lg:col-span-2 rounded-[40px] border-slate-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="p-8 pb-4 border-b border-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight text-slate-800">Recent Activity</CardTitle>
                    <p className="text-sm font-medium text-slate-400">Track your latest interactions</p>
                  </div>
                  <Button variant="ghost" className="font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl">
                    View All <ArrowUpRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {recentPosts.map((post) => (
                    <div key={post.id} className="p-8 hover:bg-slate-50/50 transition-all flex items-start gap-6 group">
                      <div className="w-16 h-16 rounded-[20px] bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-300 overflow-hidden border-2 border-white shadow-sm group-hover:border-indigo-100">
                         <ImageIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              {platforms.find(p => p.id === post.platform)?.icon && (
                                 React.createElement(platforms.find(p => p.id === post.platform)!.icon, { 
                                    className: cn("w-4 h-4", platforms.find(p => p.id === post.platform)?.color) 
                                 })
                              )}
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{post.platform}</span>
                           </div>
                           <Badge className={cn(
                             "rounded-full font-black px-4 py-1 text-[10px] uppercase shadow-none border-0",
                             post.status === 'published' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                           )}>
                             {post.status}
                           </Badge>
                        </div>
                        <p className="text-base font-bold text-slate-700 leading-relaxed">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                           <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {post.date}</span>
                           {post.engagement > 0 && <span className="flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> {post.engagement} Interactions</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Assistant Card */}
            <div className="space-y-6">
               <Card className="rounded-[40px] border-0 shadow-2xl shadow-indigo-200 bg-indigo-600 text-white overflow-hidden relative group">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
                  <CardContent className="p-8 space-y-6 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black leading-tight tracking-tight">AI Content Genius</h3>
                      <p className="text-sm font-medium text-indigo-100 leading-relaxed">
                        Generate high-engagement captions and hashtags for any niche in seconds.
                      </p>
                    </div>
                    <Button className="w-full bg-white text-indigo-600 hover:bg-white/90 font-black rounded-2xl h-14 text-base shadow-lg transition-all active:scale-95">
                      Launch AI Writer
                    </Button>
                  </CardContent>
               </Card>

               <Card className="rounded-[40px] border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-8 pb-4">
                     <CardTitle className="text-lg font-black tracking-tight text-slate-800">Linked Platforms</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 pt-0 space-y-4">
                     {platforms.filter(p => p.status === 'connected').map(p => (
                       <div key={p.id} className="flex items-center justify-between p-4 rounded-[24px] bg-slate-50 border border-slate-100 hover:border-indigo-100 transition-colors">
                          <div className="flex items-center gap-4">
                             <p.icon className={cn("w-6 h-6", p.color)} />
                             <span className="text-sm font-black text-slate-700">{p.name}</span>
                          </div>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                       </div>
                     ))}
                  </CardContent>
               </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="animate-in slide-in-from-bottom-10 duration-700">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {platforms.map(p => (
                <Card key={p.id} className="rounded-[40px] overflow-hidden border-slate-100/80 bg-white shadow-sm group hover:shadow-xl transition-all duration-500">
                   <div className={cn("h-40 p-10 flex items-end relative overflow-hidden", p.bg)}>
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-2xl" />
                      <p.icon className={cn("w-14 h-14 relative z-10", p.color)} />
                   </div>
                   <CardContent className="p-10 space-y-8">
                      <div className="space-y-2">
                         <h3 className="text-2xl font-black text-slate-800 tracking-tight">{p.name}</h3>
                         <p className="text-sm text-slate-400 font-bold leading-relaxed">Official {p.name} API integration for safe, bulk marketing.</p>
                      </div>
                      <div className="space-y-6">
                         <div className="flex items-center justify-between py-4 border-b border-slate-50">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Status</span>
                            <Badge variant="outline" className={cn(
                              "font-black text-[10px] uppercase border-0 rounded-full px-3 py-1",
                              p.status === 'connected' ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
                            )}>
                               {p.status === 'connected' ? 'Connected' : 'Ready to Link'}
                            </Badge>
                         </div>
                         <Button 
                            onClick={() => handleManageAccount(p)}
                            className={cn(
                               "w-full h-14 rounded-2xl font-black text-base shadow-sm transition-all active:scale-95",
                               p.status === 'connected' 
                                 ? "bg-slate-900 text-white hover:bg-slate-800" 
                                 : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100"
                            )}
                         >
                            {p.status === 'connected' ? 'Manage Settings' : `Link ${p.name}`}
                         </Button>
                      </div>
                   </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>

      {/* --- CREATE POST MODAL --- */}
      <Dialog open={isPostModalOpen} onOpenChange={setIsPostModalOpen}>
        <DialogContent className="max-w-2xl rounded-[40px] p-0 overflow-hidden border-0 shadow-2xl">
           <DialogHeader className="p-8 pb-6 bg-slate-50/80 border-b">
              <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">Create New Social Campaign</DialogTitle>
              <DialogDescription className="font-bold text-slate-400 text-sm">Select platforms and draft your message content.</DialogDescription>
           </DialogHeader>
           
           <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Platform Selector */}
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Select Target Platforms</label>
                 <div className="grid grid-cols-5 gap-3">
                    {platforms.map(p => (
                       <button
                          key={p.id}
                          onClick={() => togglePlatformSelection(p.id)}
                          className={cn(
                             "flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all gap-2",
                             selectedPlatform.includes(p.id) 
                               ? "border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-50" 
                               : "border-slate-100 hover:border-slate-200 grayscale opacity-60"
                          )}
                       >
                          <p.icon className={cn("w-6 h-6", p.color)} />
                          <span className="text-[10px] font-black uppercase text-slate-600">{p.name}</span>
                       </button>
                    ))}
                 </div>
              </div>

              {/* Content Area */}
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Message Content</label>
                 <Textarea 
                    placeholder="Write something engaging..."
                    className="min-h-[140px] rounded-3xl border-slate-100 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all font-bold text-slate-700 resize-none p-6"
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                 />
              </div>

              {/* Media Upload Area */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-6 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 hover:bg-slate-50/50 cursor-pointer transition-colors text-slate-400">
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-black uppercase">Add Photos</span>
                 </div>
                 <div className="p-6 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 hover:bg-slate-50/50 cursor-pointer transition-colors text-slate-400">
                    <Video className="w-6 h-6" />
                    <span className="text-xs font-black uppercase">Add Videos</span>
                 </div>
              </div>
           </div>

           <DialogFooter className="p-8 pt-4 bg-slate-50/80 border-t flex-row items-center justify-between sm:justify-between">
              <Button variant="ghost" onClick={() => setIsPostModalOpen(false)} className="font-black text-slate-400 rounded-2xl h-12">Cancel</Button>
              <Button 
                onClick={handleCreatePost}
                className="bg-indigo-600 hover:bg-indigo-700 font-black rounded-2xl h-14 px-10 shadow-xl shadow-indigo-100"
              >
                Launch Post <Send className="w-4 h-4 ml-2" />
              </Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- ACCOUNT SETTINGS MODAL --- */}
      <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
         <DialogContent className="rounded-[40px] p-10 max-w-md border-0 shadow-2xl">
            {activeAccount && (
               <div className="space-y-8 text-center">
                  <div className={cn("w-20 h-20 rounded-[30px] mx-auto flex items-center justify-center shadow-xl", activeAccount.bg)}>
                     <activeAccount.icon className={cn("w-10 h-10", activeAccount.color)} />
                  </div>
                  <div className="space-y-2">
                     <h2 className="text-3xl font-black tracking-tight text-slate-800">{activeAccount.name}</h2>
                     <p className="text-sm font-bold text-slate-400">Account Configuration & Integration</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-6 rounded-[28px] bg-slate-50 border border-slate-100 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Status</p>
                        <p className="text-sm font-black text-emerald-600">Active</p>
                     </div>
                     <div className="p-6 rounded-[28px] bg-slate-50 border border-slate-100 text-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Followers</p>
                        <p className="text-sm font-black text-slate-700">{activeAccount.followers}</p>
                     </div>
                  </div>

                  <div className="space-y-3 pt-4">
                     <Button variant="outline" className="w-full h-14 rounded-2xl font-black border-2 hover:bg-slate-50">Sync Data</Button>
                     <Button variant="ghost" className="w-full h-14 rounded-2xl font-black text-red-500 hover:bg-red-50">Disconnect Account</Button>
                  </div>
               </div>
            )}
         </DialogContent>
      </Dialog>
    </div>
  );
};

export default SocialMedia;
