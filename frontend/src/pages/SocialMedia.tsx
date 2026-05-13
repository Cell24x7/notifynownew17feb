import React, { useState } from 'react';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Facebook, Instagram, Linkedin, Twitter, 
  Plus, Calendar, BarChart3, Send, 
  Settings2, Image as ImageIcon, Video, 
  MessageCircle, Zap, Globe, Clock, 
  ShieldCheck, ArrowUpRight, TrendingUp
} from 'lucide-react';
import { cn } from "@/lib/utils";

const SocialMedia = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const platforms = [
    { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-50', status: 'connected' },
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'text-pink-600', bg: 'bg-pink-50', status: 'connected' },
    { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-50', status: 'disconnected' },
    { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'text-sky-500', bg: 'bg-sky-50', status: 'disconnected' },
  ];

  const recentPosts = [
    { id: 1, content: 'Our new summer collection is live! Check it out now. #SummerVibes', platform: 'instagram', status: 'published', engagement: 1245, date: '2 hours ago' },
    { id: 2, content: 'Exciting news! We just launched our new API hub for developers.', platform: 'facebook', status: 'scheduled', engagement: 0, date: 'Tomorrow, 10:00 AM' },
    { id: 3, content: 'Join our upcoming webinar on marketing automation strategies.', platform: 'linkedin', status: 'published', engagement: 450, date: '1 day ago' },
  ];

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Globe className="w-6 h-6" />
            </div>
            Social Media Marketing
          </h1>
          <p className="text-muted-foreground font-medium mt-1">Manage, schedule, and analyze your social presence across platforms.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="font-bold rounded-xl border-2">
            <Calendar className="w-4 h-4 mr-2" />
            Post Planner
          </Button>
          <Button className="font-bold rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            Create New Post
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-8" onValueChange={setActiveTab}>
        <div className="bg-white/50 backdrop-blur-sm p-1.5 rounded-2xl border w-fit inline-flex shadow-sm">
          <TabsList className="bg-transparent h-10 gap-1">
            <TabsTrigger value="overview" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="accounts" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Accounts</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Insights</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Settings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-8">
          {/* Platform Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {platforms.map((platform) => (
              <Card key={platform.id} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 rounded-3xl border-slate-100">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner", platform.bg)}>
                      <platform.icon className={cn("w-6 h-6", platform.color)} />
                    </div>
                    <Badge variant={platform.status === 'connected' ? 'secondary' : 'outline'} className={cn(
                      "rounded-full font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider",
                      platform.status === 'connected' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "text-slate-400"
                    )}>
                      {platform.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">12.4K</h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{platform.name} Followers</p>
                  </div>
                  <div className="mt-4 flex items-center text-xs font-bold text-emerald-600">
                    <TrendingUp className="w-3 h-3 mr-1" /> +12.5% vs last month
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Posts List */}
            <Card className="lg:col-span-2 rounded-[32px] border-slate-100 shadow-sm bg-white overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Recent Activity</CardTitle>
                    <CardDescription className="font-medium">Recent posts across all connected channels</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="font-bold text-primary">View All Posts</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-50">
                  {recentPosts.map((post) => (
                    <div key={post.id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-400 overflow-hidden border">
                         <ImageIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-2">
                              {post.platform === 'facebook' && <Facebook className="w-4 h-4 text-blue-600" />}
                              {post.platform === 'instagram' && <Instagram className="w-4 h-4 text-pink-600" />}
                              {post.platform === 'linkedin' && <Linkedin className="w-4 h-4 text-blue-700" />}
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{post.platform}</span>
                           </div>
                           <Badge className={cn(
                             "rounded-full font-bold px-3 py-0.5 text-[10px] uppercase",
                             post.status === 'published' ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-50" : "bg-amber-50 text-amber-600 hover:bg-amber-50"
                           )}>
                             {post.status}
                           </Badge>
                        </div>
                        <p className="text-sm font-semibold text-slate-700 line-clamp-2 leading-relaxed">
                          {post.content}
                        </p>
                        <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-tight">
                           <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {post.date}</span>
                           {post.engagement > 0 && <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {post.engagement} Engagements</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="rounded-xl text-slate-300 hover:text-primary">
                        <ArrowUpRight className="w-5 h-5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions / Integration Status */}
            <div className="space-y-6">
               <Card className="rounded-[32px] border-slate-100 shadow-sm bg-gradient-to-br from-primary to-indigo-600 text-white overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                     <Zap className="w-32 h-32" />
                  </div>
                  <CardContent className="p-8 space-y-6 relative z-10">
                    <h3 className="text-2xl font-black leading-tight tracking-tight">Power Up Your Social Reach</h3>
                    <p className="text-sm font-medium text-primary-foreground/80 leading-relaxed">
                      Connect more platforms and use AI to generate engaging content for your audience.
                    </p>
                    <Button className="w-full bg-white text-primary hover:bg-slate-50 font-black rounded-2xl h-12 shadow-xl shadow-black/10">
                      Explore AI Tools
                    </Button>
                  </CardContent>
               </Card>

               <Card className="rounded-[32px] border-slate-100 shadow-sm bg-white overflow-hidden">
                  <CardHeader className="p-6">
                     <CardTitle className="text-lg font-black tracking-tight">Channel Health</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 space-y-4">
                     {platforms.slice(0, 3).map(p => (
                       <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-3">
                             <p.icon className={cn("w-5 h-5", p.color)} />
                             <span className="text-sm font-black text-slate-700">{p.name}</span>
                          </div>
                          {p.status === 'connected' ? (
                            <div className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                               <ShieldCheck className="w-3.5 h-3.5" /> Online
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="h-8 rounded-lg font-bold text-[10px] px-3 uppercase">Reconnect</Button>
                          )}
                       </div>
                     ))}
                  </CardContent>
               </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="accounts" className="animate-in slide-in-from-bottom-10 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {platforms.map(p => (
                <Card key={p.id} className="rounded-[32px] overflow-hidden border-slate-100 group">
                   <div className={cn("h-32 p-8 flex items-end", p.bg)}>
                      <p.icon className={cn("w-12 h-12", p.color)} />
                   </div>
                   <CardContent className="p-8 space-y-6">
                      <div className="space-y-1">
                         <h3 className="text-xl font-black text-slate-800 tracking-tight">{p.name}</h3>
                         <p className="text-sm text-slate-400 font-bold">Connect your {p.name} business account</p>
                      </div>
                      <div className="space-y-4 pt-2">
                         <div className="flex items-center justify-between py-2 border-b border-slate-50 text-xs font-bold">
                            <span className="text-slate-400 uppercase tracking-widest">Status</span>
                            <span className={cn(p.status === 'connected' ? "text-emerald-500" : "text-slate-300")}>
                               {p.status === 'connected' ? 'Connected' : 'Not Connected'}
                            </span>
                         </div>
                         <Button 
                            className={cn(
                               "w-full h-12 rounded-2xl font-black text-sm transition-all",
                               p.status === 'connected' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-primary text-white shadow-lg shadow-primary/20"
                            )}
                         >
                            {p.status === 'connected' ? 'Manage Account' : `Connect ${p.name}`}
                         </Button>
                      </div>
                   </CardContent>
                </Card>
              ))}
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SocialMedia;
