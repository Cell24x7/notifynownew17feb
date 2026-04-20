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
      {/* Compact Header */}
      <div className="mb-6 p-6 rounded-2xl bg-slate-50 border border-indigo-100/40 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg shadow-sm">
              <Terminal className="w-4 h-4 text-white" />
            </div>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 h-5 px-2 font-bold text-[9px] tracking-tighter uppercase">
              v3.0 STABLE
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">API Developer Hub</h1>
          <p className="text-slate-500 text-sm max-w-3xl leading-relaxed">
            Integrate NotifyNow REST APIs into your core systems for reliable, high-volume messaging.
          </p>
        </div>
      </div>

      {/* Modern Compact Authentication Card */}
      <Card className="mb-8 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-700">Authentication Credentials</h2>
          </div>
          <a href="/settings" className="text-[10px] font-bold text-indigo-600 hover:underline">Rotate Password →</a>
        </div>

        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
              <span className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">Username</span>
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono text-slate-700 font-bold">{user?.email || 'admin@example.com'}</code>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white" onClick={() => copyToClipboard(user?.email || '')}><Copy className="w-3 h-3" /></Button>
              </div>
            </div>

            <div className="flex flex-col gap-1 p-3 rounded-xl bg-slate-50/50 border border-slate-100">
              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">API Endpoint</span>
              <div className="flex items-center justify-between">
                <code className="text-xs font-mono text-slate-700 font-bold">https://notifynow.in/api</code>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-white" onClick={() => copyToClipboard('https://notifynow.in/api')}><Copy className="w-3 h-3" /></Button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
              <div className="flex items-start gap-2">
                <Info className="w-3 h-3 text-indigo-600 mt-0.5" />
                <p className="text-[10px] text-indigo-800 leading-tight">
                  <span className="font-bold">Notice:</span> Valid account credentials are required for all secure endpoint calls.
                </p>
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
