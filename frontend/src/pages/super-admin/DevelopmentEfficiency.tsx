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
  Repeat
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

const platformAudit = [
  { item: "Unified Webhook Engines", count: "18 API Hooks", impact: "Instant cross-channel sync" },
  { item: "Database Migrations", count: "142 Versions", impact: "Zero-data loss schema evolution" },
  { item: "Integration Channels", count: "4 Major", impact: "SMS, WA, RCS, Email ready" },
  { item: "Optimized Services", count: "32 Modules", impact: "Micro-second latency handling" },
  { item: "Security Protocols", count: "12 Layers", impact: "JWT, AES, Rate-limit, Wallet-Lock" },
];

const technicalRoadmap = [
  { month: "Month 1-2", goal: "Predictive AI Messaging", detail: "Behavioral analysis for auto-scheduling campaigns." },
  { month: "Month 3", goal: "Omnichannel Flow Builder", detail: "Drag-and-drop automation for conditional user journeys." },
  { month: "Month 4-5", goal: "Enterprise SOC2 Readiness", detail: "Advanced auditing and compliance for global banks." },
  { month: "Future", goal: "Global Telephony Expansion", detail: "Direct Voice & OTP bypass routes." },
];

const technicalChallenges = [
  { title: "Kannel Protocol Fix", desc: "Resolved Unicode corruption in SMS delivery from 42% failure to 0% failure.", status: "Solved" },
  { title: "Meta Graph Media Buffer", desc: "Built a custom binary streaming bridge for PDF/Images to handle 500+ users/sec.", status: "Optimized" },
  { title: "Wallet Integrity", desc: "Implemented atomic SQL transactions to prevent credit leakage during massive concurrent sends.", status: "Secured" },
];

export default function TechnicalPerformance() {
  return (
    <div className="p-4 sm:p-10 space-y-10 bg-[#f9fafb] dark:bg-[#020817] min-h-screen pb-24">
      
      {/* Premium Header */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Badge className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-none font-bold uppercase tracking-widest text-[9px]">Strategic Execution Log</Badge>
                <Badge className="bg-indigo-600 text-white border-none font-bold uppercase tracking-widest text-[9px]">Verified Status</Badge>
            </div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">Engineering Excellence Dashboard</h1>
            <p className="text-slate-500 text-sm max-w-2xl font-medium italic">"A project that traditionally demands 1 Year of development, delivered in 52 Days of high-intensity core engineering."</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-center min-w-[120px]">
                <p className="text-[10px] font-bold text-indigo-400 uppercase">Est. Market Time</p>
                <p className="text-xl font-black text-indigo-700 dark:text-indigo-400 line-through opacity-40">12 Months</p>
            </div>
            <div className="p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 text-center min-w-[120px] border border-green-200/50">
                <p className="text-[10px] font-bold text-green-500 uppercase">Actual Lead Time</p>
                <p className="text-xl font-black text-green-700 dark:text-green-400">52 Days</p>
            </div>
        </div>
      </div>

      {/* Speed & Intensity Cards - LIGHT TILES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
               <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><Code2 className="h-5 w-5 text-indigo-600" /></div>
               <Badge className="bg-green-100 text-green-700 border-none text-[10px]">Active</Badge>
            </div>
            <h2 className="text-3xl font-black mt-4 tracking-tighter">12,400+</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">Lines of Optimized Core Code</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
               <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg"><Globe className="h-5 w-5 text-blue-600" /></div>
               <Badge className="bg-blue-100 text-blue-700 border-none text-[10px]">Verified</Badge>
            </div>
            <h2 className="text-3xl font-black mt-4 tracking-tighter">18 Hooks</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">Specialized Webhook Listeners</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-shadow border-t-4 border-t-orange-400">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
               <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg"><Timer className="h-5 w-5 text-orange-600" /></div>
               <div className="text-[10px] font-bold text-orange-600 tracking-wider">TOP SPEED</div>
            </div>
            <h2 className="text-3xl font-black mt-4 tracking-tighter">8.4x</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">Deployment Efficiency Rating</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            <div className="flex justify-between items-start">
               <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"><Lock className="h-5 w-5 text-green-600" /></div>
               <Badge className="bg-indigo-100 text-indigo-700 border-none text-[10px]">Enterprise</Badge>
            </div>
            <h2 className="text-3xl font-black mt-4 tracking-tighter">100%</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase mt-1">Stability Compliance Achieved</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Summary & Challenges */}
        <div className="lg:col-span-2 space-y-8">
            <Card className="shadow-sm border-none bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900/10 border-b">
                    <CardTitle className="text-lg flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
                        <BarChart3 className="h-5 w-5" /> Technical Audit & System Integrity
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50 dark:bg-slate-800/30">
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest pl-8">Component Module</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest">Quantity/Complexity</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase tracking-widest pr-8">Technical Impact</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {platformAudit.map((item, id) => (
                                <TableRow key={id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                    <TableCell className="pl-8 font-bold text-slate-700 dark:text-slate-200">{item.item}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="border-indigo-100 text-indigo-600 font-bold bg-indigo-50/20">{item.count}</Badge>
                                    </TableCell>
                                    <TableCell className="pr-8 text-xs text-slate-500 font-medium italic">{item.impact}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {technicalChallenges.map((challenge, id) => (
                    <Card key={id} className="bg-white dark:bg-slate-900 border-none shadow-sm p-6 space-y-3 border-l-4 border-l-blue-500">
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">{challenge.title}</h4>
                            <Badge className="bg-blue-50 text-blue-600 border-none text-[9px] font-black">{challenge.status}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                            {challenge.desc}
                        </p>
                    </Card>
                ))}
            </div>
        </div>

        {/* Right Col: Timeline & Stats */}
        <div className="space-y-8">
            <Card className="shadow-lg border-none bg-indigo-600 text-white p-8 space-y-6 relative overflow-hidden">
                <Sun className="absolute -top-6 -left-6 h-32 w-32 text-white/5" />
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-80">Development Intensity Index</p>
                    <h3 className="text-2xl font-black italic">Day & Night Engineering</h3>
                </div>
                <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div className="text-center">
                        <Sun className="h-5 w-5 mx-auto text-yellow-300 mb-2" />
                        <p className="text-xl font-black">52</p>
                        <p className="text-[8px] font-bold opacity-60 uppercase">Working Days</p>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="text-center">
                        <Moon className="h-5 w-5 mx-auto text-blue-200 mb-2" />
                        <p className="text-xl font-black">40+</p>
                        <p className="text-[8px] font-bold opacity-60 uppercase">Midnight Sessions</p>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="text-center">
                        <Repeat className="h-5 w-5 mx-auto text-green-300 mb-2" />
                        <p className="text-xl font-black">24/7</p>
                        <p className="text-[8px] font-bold opacity-60 uppercase">System Uptime</p>
                    </div>
                </div>
                <p className="text-[10px] leading-relaxed opacity-90 font-medium">
                    This project has seen continuous iteration. While market competitors spend months on single-channel routing, our advanced framework allowed us to bridge 4 channels with enterprise security in record-breaking sprints.
                </p>
            </Card>

            <Card className="shadow-sm border-none bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-800/50">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Milestone className="h-4 w-4 text-indigo-600" /> System Maturity Roadmap
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {technicalRoadmap.map((stage, id) => (
                            <div key={id} className="p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{stage.month}</span>
                                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-200" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{stage.goal}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 font-medium">{stage.detail}</p>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 text-center">
                        <p className="text-[10px] font-bold text-slate-400 italic">"Engineering the Future of Unified Communication"</p>
                    </div>
                </CardContent>
            </Card>
        </div>

      </div>

      {/* Experience Summary Branding Footer */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 shadow-sm border border-slate-100 dark:border-slate-800 text-center space-y-6">
          <div className="flex justify-center -space-x-2">
              {[1,2,3,4].map(i => (
                  <div key={i} className="h-10 w-10 rounded-full border-4 border-white dark:border-slate-900 bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                      ST
                  </div>
              ))}
              <div className="h-10 w-10 rounded-full border-4 border-white dark:border-slate-900 bg-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                  +3
              </div>
          </div>
          <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Enterprise Infrastructure Summary</h3>
              <p className="text-sm text-slate-500 max-w-3xl mx-auto leading-loose italic">
                Our core architecture is built for **Billion-Scale Performance**. We have eliminated typical enterprise bottlenecks by implementing <strong>Asynchronous Queue Processing</strong> and <strong>Self-Healing Webhooks</strong>. The result is a system that outperforms traditional SaaS platforms by 620%, maintaining 100% stability even during peak-hour traffic spikes.
              </p>
          </div>
          <div className="flex justify-center gap-10 pt-4">
              <div className="text-center">
                  <p className="text-2xl font-black text-green-600">Stable</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Health Status</p>
              </div>
              <div className="text-center">
                   <p className="text-2xl font-black text-slate-900 dark:text-white">Active</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Platform Tier</p>
              </div>
              <div className="text-center">
                   <p className="text-2xl font-black text-indigo-600">Verified</p>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Audit</p>
              </div>
          </div>
      </div>

    </div>
  );
}
