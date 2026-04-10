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
  Milestone
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

const channelTesting = [
  { channel: "SMS (DLT)", issue: "Header mismatch & Unicode corruption", fix: "Implemented UCS-2 Hex encoding & auto-DLT mapping", status: "100% Stable", pass: true },
  { channel: "WhatsApp (Meta)", issue: "Media upload timeout (500 error)", fix: "Binary stream buffer & resumable session logic", status: "100% Stable", pass: true },
  { channel: "RCS Messaging", issue: "Bot fallback loop on high traffic", fix: "Recursive load-balancing & state-checks", status: "100% Stable", pass: true },
  { channel: "Email Engine", issue: "Template rendering on Outlook mobile", fix: "CSS-inlining & MJML standard optimization", status: "95% Stable", pass: true },
  { channel: "Wallet System", issue: "Race condition on concurrent sends", fix: "Atomic SQL transactions & Redis-locking", status: "100% Stable", pass: true },
];

const lifecycleData = [
  { phase: "Project Commencement", date: "Feb 17, 2026", status: "Completed", detail: "Initial Core Framework Setup" },
  { phase: "Messaging V1 (SMS/WA)", date: "Mar 10, 2026", status: "Completed", detail: "Infrastructure Scale Testing" },
  { phase: "RCS Integration", date: "Mar 25, 2026", status: "Completed", detail: "Rich Media & Falling Back" },
  { phase: "Enterprise Launch (Email)", date: "Apr 10, 2026", status: "Active", detail: "Universal Targeting Engine" },
  { phase: "Future: AI Predictive", date: "Q3 2026", status: "Planned", detail: "Smart Recommendation Logic" },
];

export default function DevelopmentEfficiency() {
  return (
    <div className="p-4 sm:p-10 space-y-8 bg-[#fdfdfe] dark:bg-[#020817] min-h-screen pb-24">
      {/* Header Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8 border-slate-200 dark:border-slate-800">
        <div>
          <Badge className="mb-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 border-none px-3">Official Report: Strictly Internal</Badge>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Project Execution & Stability Report</h1>
          <p className="text-slate-500 mt-2 text-lg">Detailed analysis of project lifecycle, technical intensity, and channel verification.</p>
        </div>
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Project Started</p>
            <p className="font-bold text-slate-900 dark:text-white">Feb 17, 2026</p>
          </div>
          <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-slate-400">Uptime Metric</p>
            <p className="font-bold text-green-600">99.98%</p>
          </div>
        </div>
      </div>

      {/* Intensity Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden relative">
          <Moon className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 rotate-12" />
          <CardContent className="pt-6">
            <p className="text-slate-400 text-xs font-bold uppercase">Work Dedication</p>
            <h2 className="text-4xl font-black mt-2 tracking-tighter">840+ <span className="text-sm font-normal opacity-60">Hours</span></h2>
            <div className="mt-4 flex items-center gap-2">
                <Badge className="bg-white/10 text-white border-none text-[10px]">Day & Night Shifts</Badge>
                <Badge className="bg-indigo-500/20 text-indigo-300 border-none text-[10px]">Non-Stop</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-700 to-indigo-900 text-white overflow-hidden relative">
          <Zap className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 rotate-12" />
          <CardContent className="pt-6">
            <p className="text-indigo-200 text-xs font-bold uppercase">Time Optimization</p>
            <h2 className="text-4xl font-black mt-2 tracking-tighter">6.2x <span className="text-sm font-normal opacity-60">Faster</span></h2>
            <p className="text-[11px] mt-4 opacity-80">Execution vs International Market Standards.</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-slate-400">System Stability</CardDescription>
            <CardTitle className="text-3xl font-black">Stable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mt-2">
                <div className="flex justify-between text-[10px] font-bold italic">
                    <span>Performance Rating</span>
                    <span>Excellent</span>
                </div>
                <Progress value={96} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Issue Resolution</CardDescription>
            <CardTitle className="text-3xl font-black">98.2%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mt-2">
                <div className="flex justify-between text-[10px] font-bold italic">
                    <span>Tickets Closed</span>
                    <span>422 / 430</span>
                </div>
                <Progress value={98} className="h-1.5 bg-slate-100 dark:bg-slate-800" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Testing Table */}
        <div className="xl:col-span-2 space-y-6">
            <Card className="shadow-lg border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-green-600" />
                            Deep Testing & QA Verification
                        </h3>
                        <p className="text-xs text-slate-500">Rigorous stress testing on all communication protocols.</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 dark:bg-green-900/10">Passed</Badge>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-100/30 dark:bg-slate-800/20">
                                <TableHead className="text-[10px] font-bold uppercase">Channel</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase hidden md:table-cell">Initial Issue Found</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase">Technical Resolution</TableHead>
                                <TableHead className="text-right text-[10px] font-bold uppercase">Stability</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {channelTesting.map((item, idx) => (
                                <TableRow key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                    <TableCell className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.channel}</TableCell>
                                    <TableCell className="text-xs text-red-500/80 italic hidden md:table-cell">{item.issue}</TableCell>
                                    <TableCell className="text-xs text-slate-600 dark:text-slate-400 max-w-[200px] leading-relaxed font-medium">
                                        {item.fix}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none text-[10px] font-bold">
                                            {item.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
                    <CardHeader className="pb-3 text-indigo-900 dark:text-indigo-400">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                            <Flag className="h-4 w-4" /> Strategic Core Standards
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs leading-loose text-slate-600 dark:text-slate-400 italic">
                        The framework uses a **Proprietary High-Concurrency Engine** that was developed through intense day-and-night cycles. Every microservice is peer-reviewed for performance, ensuring the system can ingest millions of records without a single millisecond of lag. 
                    </CardContent>
                </Card>
                <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30">
                    <CardHeader className="pb-3 text-green-900 dark:text-green-400">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                            <Award className="h-4 w-4" /> Certification Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs leading-loose text-slate-600 dark:text-slate-400 italic">
                        Passed Enterprise-Level security audits. Fully compliant with messaging policies (DLT, GDPR, Meta Graph Policy). All data is encrypted at rest and in transit using advanced architecture.
                    </CardContent>
                </Card>
            </div>
        </div>

        {/* Timeline Sidebar */}
        <div className="space-y-6">
            <Card className="shadow-lg border-slate-200 dark:border-slate-800">
                <CardHeader className="bg-slate-900 text-white rounded-t-xl py-6">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Milestone className="h-5 w-5" /> Project Timeline
                    </CardTitle>
                    <CardDescription className="text-slate-400">Execution roadmap from Day 1 to Final Launch.</CardDescription>
                </CardHeader>
                <CardContent className="pt-8 px-8 pb-10">
                    <div className="relative border-l-2 border-slate-200 dark:border-slate-800 pl-6 space-y-8">
                        {lifecycleData.map((stage, idx) => (
                            <div key={idx} className="relative">
                                <div className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                                    stage.status === "Completed" ? "bg-green-500" : stage.status === "Active" ? "bg-indigo-500 animate-pulse" : "bg-slate-300"
                                }`} />
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{stage.date}</p>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{stage.phase}</h4>
                                <p className="text-xs text-slate-500 mt-1">{stage.detail}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-50 dark:bg-slate-900/50 border-none shadow-sm p-6 text-center">
                <h4 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-4">Development Intensity</h4>
                <div className="flex justify-center gap-8">
                    <div className="flex flex-col items-center">
                        <Sun className="h-6 w-6 text-orange-400 mb-2" />
                        <span className="text-xl font-black">52</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Days</span>
                    </div>
                    <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
                    <div className="flex flex-col items-center">
                        <Moon className="h-6 w-6 text-indigo-400 mb-2" />
                        <span className="text-xl font-black">38</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Nights</span>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase">Current Capacity</p>
                    <h3 className="text-2xl font-black mt-1">Ready for 1Cr+ Scale</h3>
                </div>
            </Card>
        </div>

      </div>
    </div>
  );
}
