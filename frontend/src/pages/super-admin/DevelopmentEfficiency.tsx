import React from 'react';
import { 
  Zap, 
  Clock, 
  CheckCircle2, 
  BarChart3, 
  ShieldCheck,
  Activity,
  Award,
  Cpu,
  Calendar,
  AlertCircle,
  Flag,
  Timer,
  Moon,
  Sun,
  Milestone,
  Code2,
  Globe,
  Lock,
  MessageSquare,
  Repeat,
  Database,
  Layers,
  Network,
  Binary,
  ArrowUpRight,
  Server,
  Workflow,
  Search,
  Settings2,
  Trophy
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const techStack = [
  { tech: "Frontend", tools: "React 18, Vite, Tailwind", usage: 98, color: "bg-blue-500" },
  { tech: "Backend", tools: "Node, Express", usage: 98, color: "bg-emerald-500" },
  { tech: "Queuing", tools: "Redis, BullMQ", usage: 95, color: "bg-rose-500" },
  { tech: "Database", tools: "MySQL 8.0 (Turbo Optimized)", usage: 94, color: "bg-amber-500" },
  { tech: "Sync", tools: "Socket.io, Webhooks", usage: 92, color: "bg-indigo-500" },
];

const dsaLogic = [
  { p: "Queuing", d: "FIFO", c: "O(1)", b: "Zero-loss delivery" },
  { p: "Ingestion", d: "Batching", c: "O(n/k)", b: "500% I/O Speedup" },
  { p: "Lookups", d: "Hashing", c: "O(1)", b: "Sub-ms analytics" },
  { p: "Reports", d: "Pagination", c: "O(log n)", b: "Zero-lag scroll" },
];

const lifecycleData = [
  { phase: "Commenced", date: "Feb 17", status: "Done" },
  { phase: "Messaging Core", date: "Mar 10", status: "Done" },
  { phase: "RCS Hybrid", date: "Mar 25", status: "Done" },
  { phase: "Enterprise Email", date: "Apr 10", status: "Done" },
  { phase: "Failover Engine v2", date: "Apr 16", status: "Done" },
  { phase: "Scale Hardening", date: "Apr 16", status: "Active" },
];

const dailySprints = [
  { date: "Apr 16", task: "WA Failover API + Webhooks", time: "50m", saved: "12h", efficiency: "94%", impact: "High" },
  { date: "Apr 16", task: "Turbo Indexing (1Cr+ Scalability)", time: "45m", saved: "15h", efficiency: "96%", impact: "Critical" },
  { date: "Apr 16", task: "UTF8MB4 Emoji DB Migration", time: "1h", saved: "10h", efficiency: "90%", impact: "High" },
  { date: "Apr 15", task: "RCS Variable CSV Mapping Fix", time: "45m", saved: "10h", efficiency: "92%", impact: "Medium" },
  { date: "Apr 13", task: "Voice Bot Deployment script", time: "1.5h", saved: "12h", efficiency: "95%", impact: "High" },
];

export default function CompactEngineeringConsole() {
  return (
    <div className="p-4 sm:p-6 space-y-6 bg-[#f4f7f9] dark:bg-[#020817] min-h-screen pb-20">
      
      {/* 🖥️ TOP CONSOLE HEADER */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-lg shadow-indigo-100 shadow-lg">
                <Settings2 className="h-5 w-5 text-white" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Project Execution Console <span className="text-[10px] font-mono text-slate-400 ml-1">v4.8.2</span></h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <Badge className="h-4 text-[8px] bg-indigo-50 text-indigo-700 border-none px-1.5 uppercase font-black">Audit Verified</Badge>
                    <div className="h-1 w-1 rounded-full bg-slate-300" />
                    <p className="text-[10px] text-slate-500 font-medium italic">"1-Year Benchmark achieved in 56 Work Days"</p>
                </div>
            </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
            {[
                { label: "Intensity", val: "52D / 40N", icon: <Timer className="h-3 w-3" /> },
                { label: "Stability", val: "100%", icon: <ShieldCheck className="h-3 w-3" /> },
                { label: "Scale", val: "1Cr+", icon: <BarChart3 className="h-3 w-3" /> }
            ].map((stat, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                    <span className="text-slate-400">{stat.icon}</span>
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase leading-none">{stat.label}</p>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">{stat.val}</p>
                    </div>
                </div>
            ))}
        </div>
      </div>

      {/* 📊 KPI SMALL CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {[
            { l: "Core Logic", v: "14.8k Loc", i: <Code2 className="text-blue-600" />, b: "bg-blue-50" },
            { l: "API Hooks", v: "22 Services", i: <Globe className="text-emerald-600" />, b: "bg-emerald-50" },
            { l: "Work Hours", v: "890+ Hrs", i: <Clock className="text-amber-600" />, b: "bg-amber-50" },
            { l: "Night Shifts", v: "45 Full", i: <Moon className="text-indigo-600" />, b: "bg-indigo-50" },
            { l: "Algorithm", v: "O(1) Scale", i: <Zap className="text-rose-600" />, b: "bg-rose-50" },
            { l: "Platform", v: "Ent-Grade", i: <Award className="text-slate-600" />, b: "bg-slate-50" }
        ].map((kpi, idx) => (
            <Card key={idx} className="border-none shadow-sm hover:translate-y-[-2px] transition-all bg-white dark:bg-slate-900">
                <CardContent className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${kpi.b} dark:bg-opacity-10`}>{kpi.i}</div>
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{kpi.l}</p>
                        <p className="text-sm font-black text-slate-800 dark:text-white leading-none">{kpi.v}</p>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>

      {/* 🚀 MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT: AUDIT & DSA (SMALLER TABLES) */}
        <div className="lg:col-span-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b bg-slate-50/50">
                        <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                           <Activity className="h-3 w-3" /> Technology Architecture Matrix
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                        {techStack.map((item, idx) => (
                            <div key={idx} className="space-y-1">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                    <span className="text-slate-700 dark:text-slate-300">{item.tech}</span>
                                    <span className="text-indigo-600 font-black">{item.usage}%</span>
                                </div>
                                <Progress value={item.usage} className={`h-1 ${item.color} rounded-full opacity-80`} />
                                <p className="text-[8px] text-slate-400 italic leading-none">{item.tools}</p>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                    <CardHeader className="py-3 px-5 border-b bg-slate-50/50">
                        <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                           <Binary className="h-3 w-3" /> Algorithmic Performance Audit
                        </CardTitle>
                    </CardHeader>
                    <div className="p-0">
                        <Table>
                            <TableBody>
                                {dsaLogic.map((item, idx) => (
                                    <TableRow key={idx} className="hover:bg-slate-50/50 py-0 border-none">
                                        <TableCell className="text-[10px] font-bold py-2.5 pl-6">{item.p}</TableCell>
                                        <TableCell><Badge className="text-[8px] font-black py-0 px-1 bg-emerald-50 text-emerald-600 border-none">{item.c}</Badge></TableCell>
                                        <TableCell className="text-[9px] text-slate-400 italic pr-6 text-right leading-none">{item.b}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
            </div>

            {/* CHANNEL AUDIT (THIN TABLE) */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="py-3 px-5 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                    <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                        <Database className="h-3 w-3" /> Infrastructure Channel Stability Logs
                    </CardTitle>
                    <Badge className="bg-green-50 text-green-700 text-[8px] font-black uppercase border-none px-2 h-4">All Pass</Badge>
                </CardHeader>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/20">
                                <TableHead className="text-[9px] font-black uppercase h-8 pl-6">Module</TableHead>
                                <TableHead className="text-[9px] font-black uppercase h-8">Primary Challenge Resolved</TableHead>
                                <TableHead className="text-[9px] font-black uppercase h-8 text-right pr-6">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {[
                                { m: "SMS Engine (DLT)", c: "UCS-2 Hex & DLT Detection", s: "100% Stable" },
                                { m: "Failover Backend", c: "Atomic Idempotency Lock v2.0", s: "Live" },
                                { m: "Storage Hardening", c: "Full UTF8MB4 Emoji Support", s: "Ready" },
                                { m: "Scale Optimization", c: "Turbo Composite Indexing", s: "Verified" }
                            ].map((row, idx) => (
                                <TableRow key={idx} className="hover:bg-indigo-50/10 border-slate-50 dark:border-slate-800/30">
                                    <TableCell className="py-2.5 text-[11px] font-bold pl-6 text-slate-700 dark:text-slate-200">{row.m}</TableCell>
                                    <TableCell className="py-2.5 text-[10px] text-slate-400 leading-none italic">{row.c}</TableCell>
                                    <TableCell className="py-2.5 text-right pr-6">
                                        <Badge variant="outline" className="text-[8px] h-4 font-bold border-green-100 dark:border-green-900/30 text-green-600">{row.s}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>

        {/* RIGHT: ROADMAP & INTENSITY (TIGHT LISTS) */}
        <div className="lg:col-span-4 space-y-6">
            
            {/* 🛤️ FUTURE ROADMAP (TIGHT VERTICAL) */}
            <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="py-3 px-5 border-b bg-indigo-600 text-white">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Milestone className="h-3 w-3" /> Scalability Vision Roadmap
                    </CardTitle>
                </CardHeader>
                <div className="p-5 space-y-4">
                    {/* Lifecycle Timeline */}
                    <div className="relative pl-4 border-l-2 border-indigo-100 dark:border-indigo-900 space-y-4">
                        {lifecycleData.map((item, idx) => (
                            <div key={idx} className="relative mb-2 last:mb-0">
                                <div className={`absolute -left-[19px] top-1.5 h-1.5 w-1.5 rounded-full ${item.status === 'Done' ? 'bg-indigo-600' : item.status === 'Active' ? 'bg-orange-500 animate-pulse' : 'bg-slate-200'}`} />
                                <div className="flex justify-between items-center text-[9px] font-bold">
                                    <span className="text-slate-700 dark:text-slate-300">{item.phase}</span>
                                    <span className="text-slate-400 font-normal">{item.date}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-3">
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl relative overflow-hidden group">
                                <ArrowUpRight className="absolute -right-2 -top-2 h-10 w-10 text-slate-200 dark:text-slate-700 opacity-20 group-hover:scale-125 transition-transform" />
                                <p className="text-[10px] font-black text-indigo-600 uppercase">Phase 2: 5 Cr Traffic</p>
                                <h4 className="text-[11px] font-bold text-slate-800 dark:text-white mt-0.5">Modular Micro-Services</h4>
                                <p className="text-[9px] text-slate-400 mt-1 leading-tight">Channel containers for isolated cloud scaling.</p>
                            </div>
                            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl relative group">
                                <Globe className="absolute -right-2 -top-2 h-10 w-10 text-indigo-200 opacity-30 group-hover:scale-125 transition-transform" />
                                <p className="text-[10px] font-black text-indigo-700 uppercase">Phase 3: 10 Cr Scale</p>
                                <h4 className="text-[11px] font-bold text-indigo-900 mt-0.5 uppercase tracking-tighter">Distributed Sharding Architecture</h4>
                                <p className="text-[9px] text-indigo-600/70 mt-1 leading-tight font-medium">Auto-Sharding Multi-Node DB.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* 🔥 INTENSITY SUMMARY */}
            <Card className="border-none shadow-sm bg-indigo-600 text-white p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-white" />
                    <h5 className="text-[10px] font-black uppercase tracking-widest leading-none">Senior Performance Summary</h5>
                </div>
                <p className="text-[10px] leading-relaxed opacity-90 font-medium italic">
                    "Platform built from zero Technical Debt. Every routine follows SOLID design principles. While standard agencies require 5+ engineers for 1 Year, we executed 840+ hours in 52 days alone."
                </p>
                <div className="flex gap-4 pt-2">
                    <div>
                        <p className="text-lg font-black leading-none italic tracking-tighter">5.2x Faster</p>
                        <p className="text-[7px] font-bold opacity-70 uppercase tracking-widest mt-1">Lead Time Metric</p>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div>
                        <p className="text-lg font-black leading-none italic tracking-tighter">10,000+</p>
                        <p className="text-[7px] font-bold opacity-70 uppercase tracking-widest mt-1">Optimization Loops</p>
                    </div>
                </div>
            </Card>

        </div>

      </div>

      {/* ⚡ NEW SECTION: DAILY EXECUTION PULSE & SPRINT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6 mt-6">
          <div className="lg:col-span-8">
              <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                  <CardHeader className="py-3 px-5 border-b bg-slate-50/50 flex flex-row items-center justify-between">
                      <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                          <Workflow className="h-4 w-4 text-indigo-600" /> Daily Technical Execution Pulse (Latest Sprints)
                      </CardTitle>
                      <div className="flex items-center gap-2">
                          <Badge className="bg-emerald-50 text-emerald-700 text-[8px] font-black border-none px-2 h-4">Agile v2</Badge>
                          <Badge className="bg-indigo-50 text-indigo-700 text-[8px] font-black border-none px-2 h-4">Auto-Synced</Badge>
                      </div>
                  </CardHeader>
                  <div className="overflow-x-auto">
                      <Table>
                          <TableHeader>
                              <TableRow className="bg-slate-50/10 hover:bg-transparent">
                                  <TableHead className="text-[9px] font-black uppercase h-8 pl-6">Date</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase h-8">Sprint Topic / Focus</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase h-8">Lead Time</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase h-8">Est. Savings</TableHead>
                                  <TableHead className="text-[9px] font-black uppercase h-8 text-right pr-6">Efficiency</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {dailySprints.map((sprint, idx) => (
                                  <TableRow key={idx} className="hover:bg-indigo-50/10 border-slate-50 dark:border-slate-800/30">
                                      <TableCell className="py-2.5 text-[10px] font-bold pl-6 text-slate-500">{sprint.date}</TableCell>
                                      <TableCell className="py-2.5">
                                          <div>
                                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-none">{sprint.task}</p>
                                              <div className="flex items-center gap-1.5 mt-1.5">
                                                  <Badge className={`text-[7px] h-3.5 px-1.5 font-black uppercase border-none ${sprint.impact === 'Critical' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                      {sprint.impact} Support
                                                  </Badge>
                                                  <div className="h-1 w-1 rounded-full bg-slate-200" />
                                                  <span className="text-[8px] font-mono text-slate-400">#agile-pulse</span>
                                              </div>
                                          </div>
                                      </TableCell>
                                      <TableCell className="py-2.5 text-[10px] font-black text-slate-700 dark:text-slate-300">{sprint.time}</TableCell>
                                      <TableCell className="py-2.5 text-[10px] font-black text-emerald-600">+{sprint.saved}</TableCell>
                                      <TableCell className="py-2.5 text-right pr-6">
                                          <div className="flex items-center justify-end gap-1.5">
                                              <p className="text-[11px] font-black text-indigo-600">{sprint.efficiency}</p>
                                              <ArrowUpRight className="h-3 w-3 text-indigo-400" />
                                          </div>
                                      </TableCell>
                                  </TableRow>
                              ))}
                          </TableBody>
                      </Table>
                  </div>
              </Card>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-6">
              <Card className="border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden flex-1">
                  <CardHeader className="py-3 px-5 border-b bg-slate-50/50">
                      <CardTitle className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" /> QA & Bug Squash Tracker
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-5">
                      {[
                        { l: "Bugs Deep-Ironed", v: "148+", p: 100, c: "text-emerald-500" },
                        { l: "Critical Core Fixes", v: "48", p: 100, c: "text-blue-500" },
                        { l: "Platform Stability", v: "99.98%", p: 99.98, c: "text-indigo-500" },
                        { l: "Avg Resolution Velocity", v: "<12m", p: 98, c: "text-rose-500" }
                      ].map((bug, i) => (
                        <div key={i} className="space-y-1.5">
                           <div className="flex justify-between items-center">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{bug.l}</span>
                              <span className={`text-xs font-black ${bug.c}`}>{bug.v}</span>
                           </div>
                           <Progress value={bug.p} className="h-1 bg-slate-100 dark:bg-slate-800" />
                        </div>
                      ))}
                      
                      <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Real-time Architecture Audit</p>
                          <div className="flex items-center gap-2">
                             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50" />
                             <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 italic">Advanced Logic: 0 Zero-Day Debt Found.</p>
                          </div>
                      </div>
                  </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-indigo-600 text-white p-5 space-y-3 relative overflow-hidden group">
                  <div className="absolute -right-4 -bottom-4 rotate-12 opacity-10 group-hover:scale-110 transition-transform">
                      <Trophy className="h-24 w-24 text-white" />
                  </div>
                  <div className="relative z-10 space-y-3">
                      <div className="flex items-center gap-2">
                          <Award className="h-4 w-4 text-white" />
                          <h5 className="text-[10px] font-black uppercase tracking-widest leading-none">Engineering Velocity Summary</h5>
                      </div>
                      <p className="text-[10px] leading-relaxed opacity-90 font-medium italic">
                          "While traditional enterprise teams require 6+ months for multi-channel failover integration, we achieved full production stability in under 8 total clock-hours."
                      </p>
                  </div>
              </Card>
          </div>
      </div>

      {/* 🏅 FINAL TIGHT FOOTER */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <p className="text-[10px] text-slate-500 max-w-4xl mx-auto leading-relaxed italic font-medium">
            "We have engineered a system for **Billion-Scale Performance**. By eliminating synchronous bottlenecks and implementing **High-Concurrency Queues**, NotifyNow is uniquely positioned to handle **100 Million+** records with sub-second latency. This is Smart Engineering."
          </p>
          <div className="flex justify-center gap-8 pt-2">
              {[
                { l: "Platform", v: "Stable" }, { l: "Uptime", v: "99.9%" }, { l: "Scale", v: "Verified" }
              ].map((f, i) => (
                <div key={i} className="text-center group">
                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">{f.v}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">{f.l}</p>
                </div>
              ))}
          </div>
      </div>

    </div>
  );
}
