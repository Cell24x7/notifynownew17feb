import { useState } from 'react';
import { 
  Terminal, 
  Copy, 
  Check, 
  Code2, 
  MessageSquare, 
  Zap, 
  Cpu, 
  Globe, 
  Key,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Info
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ApiDocs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copiedKey, setCopiedKey] = useState(false);
  const [activeLang, setActiveLang] = useState<'curl' | 'nodejs' | 'python'>('curl');

  const copyToClipboard = (text: string, isKey = false) => {
    navigator.clipboard.writeText(text);
    if (isKey) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
    toast({
      title: "Copied!",
      description: "Code snippet copied to clipboard.",
    });
  };

  const API_KEY = "Your API Password from Profile"; // Ideally mask this or fetch if available

  const endpoints = {
    whatsapp: {
      single: {
        title: "WhatsApp Single Message",
        description: "Optimized for millisecond delivery of OTPs and transactional notifications.",
        url: "/api/whatsapp/api/send-single",
        method: "POST",
        payload: {
          username: user?.email || "your-email@example.com",
          password: "your_api_password",
          to: "919004207813",
          templateName: "transaction_otp",
          variables: { "1": "992105" }
        }
      },
      bulk: {
        title: "WhatsApp Bulk Campaign",
        description: "Personalized broadcasts for marketing and dynamic alerts.",
        url: "/api/whatsapp/api/send-bulk",
        method: "POST",
        payload: {
          username: user?.email || "your-email@example.com",
          password: "your_api_password",
          templateName: "promo_event_2024",
          campaignName: "Spring Sale",
          numbers: [
            {
              to: "919004207813",
              variables: { "1": "Sandeep", "2": "SALE50" },
              mediaUrl: "https://yourcloud.com/offer.png"
            }
          ]
        }
      }
    },
    rcs: {
      single: {
        title: "RCS Instant Dispatch",
        description: "Rich messaging (images, buttons) for high-engagement transactional alerts.",
        url: "/api/rcs/api/send-single",
        method: "POST",
        payload: {
          username: user?.email || "your-email@example.com",
          password: "your_api_password",
          to: "919004207813",
          templateName: "welcome_rcs_v3",
          params: ["Developer"]
        }
      }
    },
    sms: {
      single: {
        title: "SMS Transactional",
        description: "Universal fallback and lightweight transactional messaging.",
        url: "/api/sms/api/send-single",
        method: "POST",
        payload: {
          username: user?.email || "your-email@example.com",
          password: "your_api_password",
          to: "919004207813",
          message: "Your OTP is 123456. Regards, NotifyNow.",
          peid: "1201159XXXXX",
          tempid: "1207161XXXXX"
        }
      }
    }
  };

  const generateCode = (lang: string, endpoint: any) => {
    const jsonStr = JSON.stringify(endpoint.payload, null, 2);
    const fullUrl = `https://notifynow.in${endpoint.url}`;

    switch (lang) {
      case 'curl':
        return `curl -X POST "${fullUrl}" \\
     -H "Content-Type: application/json" \\
     -d '${jsonStr}'`;
      case 'nodejs':
        return `const axios = require('axios');

const data = ${jsonStr};

axios.post('${fullUrl}', data)
  .then(res => console.log(res.data))
  .catch(err => console.error(err));`;
      case 'python':
        return `import requests
import json

url = "${fullUrl}"
payload = ${jsonStr}
headers = {'Content-Type': 'application/json'}

response = requests.post(url, data=json.dumps(payload), headers=headers)
print(response.json())`;
      default:
        return '';
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-12">
      {/* Header Section */}
      <div className="mb-10 p-10 rounded-[2rem] bg-gradient-to-br from-indigo-50/50 via-white to-emerald-50/50 border border-indigo-100/50 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 animate-in fade-in zoom-in duration-500">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-4 py-1.5 font-bold text-[11px] tracking-widest uppercase">
              API V3.0 STABLE
            </Badge>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight mb-5 leading-tight">
            Developer API Hub
          </h1>
          <p className="text-slate-600 text-xl max-w-4xl leading-relaxed font-medium">
            Integrate the power of <span className="text-indigo-600 font-bold">NotifyNow</span> into your own systems. Use our enterprise-grade RESTful APIs to trigger 
            messages across WhatsApp, RCS, and SMS with real-time tracking.
          </p>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full -mr-48 -mt-48 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full -ml-32 -mb-32 blur-[80px]" />
      </div>

      {/* Authentication Section - LIGHT THEME */}
      <Card className="mb-12 rounded-[2.5rem] bg-white border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden ring-1 ring-slate-100">
        <div className="bg-slate-50/50 px-10 py-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <ShieldCheck className="w-7 h-7 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Security & Authentication</h2>
              <p className="text-slate-500 font-medium mt-1">Authenticate your requests using your platform credentials.</p>
            </div>
          </div>
        </div>

        <CardContent className="p-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="group p-6 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-100/50">
                <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mb-3 px-1">API Authentication Username</p>
                <div className="flex items-center justify-between gap-6">
                  <code className="text-lg font-mono text-slate-700 font-bold truncate">
                    {user?.email || 'user@example.com'}
                  </code>
                  <Button
                    variant="ghost" 
                    size="icon"
                    className="h-11 w-11 hover:bg-indigo-600 hover:text-white text-indigo-600 rounded-xl shrink-0 transition-all shadow-sm hover:shadow-md"
                    onClick={() => copyToClipboard(user?.email || '')}
                  >
                    <Copy className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </div>

              <div className="group p-6 rounded-3xl bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-100/50">
                <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest mb-3 px-1">Global Endpoint Base</p>
                <div className="flex items-center justify-between gap-6">
                  <code className="text-lg font-mono text-slate-700 font-bold truncate">
                    https://notifynow.in/api
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 hover:bg-emerald-600 hover:text-white text-emerald-600 rounded-xl shrink-0 transition-all shadow-sm hover:shadow-md"
                    onClick={() => copyToClipboard('https://notifynow.in/api')}
                  >
                    <Copy className="h-4.5 w-4.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="relative group overflow-hidden bg-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-200 transition-transform hover:scale-[1.01] duration-300">
               <div className="absolute top-0 right-0 p-12 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                  <Key className="w-48 h-48" />
               </div>
               <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                       <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-md">
                          <Info className="w-5 h-5 text-white" />
                       </div>
                       <h3 className="text-lg font-bold text-white uppercase tracking-wider text-[12px]">Integration Notice</h3>
                    </div>
                    <ul className="space-y-3 text-indigo-50/90 text-[14px] leading-relaxed list-none">
                      <li className="flex items-center gap-2 leading-snug">
                        <Check className="w-4 h-4 text-emerald-300 shrink-0" /> Use your registered email as <span className="font-black text-white">username</span>
                      </li>
                      <li className="flex items-center gap-2 leading-snug">
                        <Check className="w-4 h-4 text-emerald-300 shrink-0" /> Use your API Password as <span className="font-black text-white">password</span>
                      </li>
                      <li className="flex items-center gap-2 leading-snug">
                        <Check className="w-4 h-4 text-emerald-300 shrink-0" /> Never share credentials in client-side code
                      </li>
                    </ul>
                  </div>
                  <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                     <p className="text-[12px] font-bold text-indigo-100 italic">Security is our top priority.</p>
                     <a href="/settings" className="text-[12px] font-black underline underline-offset-4 hover:text-emerald-300 transition-colors">Rotate Password →</a>
                  </div>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-2xl mb-8 space-x-1 border border-border/50">
          <TabsTrigger value="whatsapp" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold gap-2">
            <MessageSquare className="w-4 h-4" /> WhatsApp
          </TabsTrigger>
          <TabsTrigger value="rcs" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold gap-2">
            <Smartphone className="w-4 h-4" /> RCS Business
          </TabsTrigger>
          <TabsTrigger value="sms" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-md font-bold gap-2">
            <Zap className="w-4 h-4" /> SMS API
          </TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Navigation for specific tab */}
          <div className="lg:col-span-3 space-y-1 sticky top-24">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 mb-3">Methods</h4>
            <a href="#single-api" className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted text-foreground transition-all border-l-2 border-transparent hover:border-primary group">
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /> Single Dispatch
            </a>
            <a href="#bulk-api" className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium hover:bg-muted text-foreground transition-all border-l-2 border-transparent hover:border-primary group">
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" /> Bulk Dynamic
            </a>
          </div>

          <div className="lg:col-span-9 space-y-16">
            <TabsContent value="whatsapp" className="space-y-16 m-0">
              <ApiSection id="single-api" config={endpoints.whatsapp.single} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
              <ApiSection id="bulk-api" config={endpoints.whatsapp.bulk} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
            </TabsContent>

            <TabsContent value="rcs" className="space-y-16 m-0">
              <ApiSection id="single-api" config={endpoints.rcs.single} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
            </TabsContent>

            <TabsContent value="sms" className="space-y-16 m-0">
              <ApiSection id="single-api" config={endpoints.sms.single} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      {/* Footer */}
      <footer className="pt-16 pb-12 border-t text-center space-y-4">
        <p className="text-sm text-muted-foreground">Looking for more? Download our full Postman Collection.</p>
        <Button variant="outline" className="rounded-full px-8 hover:bg-primary hover:text-white transition-all shadow-sm">
          Download Collection (.json)
        </Button>
        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Powered by Cell24x7 Enterprise Engine</p>
      </footer>
    </div>
  );
}

function ApiSection({ id, config, activeLang, setLang, onCopy, generateCode }: any) {
  return (
    <div id={id} className="scroll-mt-24 space-y-6">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          {config.title} <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </h3>
        <p className="text-muted-foreground leading-relaxed">{config.description}</p>
      </div>

      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl border border-border/50">
        <Badge className="bg-emerald-500 hover:bg-emerald-600 font-black text-[10px]">POST</Badge>
        <code className="text-sm font-mono flex-1 overflow-x-auto whitespace-nowrap">https://notifynow.in{config.url}</code>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onCopy(`https://notifynow.in${config.url}`)}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Card className="border shadow-lg overflow-hidden">
        <div className="flex bg-muted/40 p-1">
          {['curl', 'nodejs', 'python'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l as any)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all",
                activeLang === l ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {l === 'nodejs' ? 'Node.js' : l}
            </button>
          ))}
        </div>
        <CardContent className="p-0 bg-[#0f172a] relative">
          <pre className="p-6 text-sm font-mono text-slate-300 overflow-x-auto leading-loose">
            {generateCode(activeLang, config)}
          </pre>
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute top-4 right-4 h-8 w-8 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
            onClick={() => onCopy(generateCode(activeLang, config))}
          >
            <Copy className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <h4 className="text-sm font-bold flex items-center gap-2">
          <Cpu className="w-4 h-4 text-primary" /> Key Parameters
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ParamCard name="username" type="string" required desc="Your NotifyNow account email." />
          <ParamCard name="password" type="string" required desc="Your unique API Password." />
          <ParamCard name="to" type="string" required desc="Recipient phone number with country code." />
          <ParamCard name="templateName" type="string" required desc="Design ID of the message template." />
        </div>
      </div>
    </div>
  );
}

function ParamCard({ name, type, required, desc }: any) {
  return (
    <div className="p-4 rounded-xl border bg-muted/10 space-y-2">
      <div className="flex items-center justify-between">
        <code className="text-primary font-bold text-sm">{name}</code>
        <div className="flex gap-2">
          <Badge variant="outline" className="text-[8px] h-4">{type}</Badge>
          {required && <Badge className="bg-red-500/10 text-red-500 border-red-200 text-[8px] h-4">REQ</Badge>}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
