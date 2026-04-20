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
  Info,
  Layers,
  UploadCloud,
  LayoutDashboard
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
  const [activeLang, setActiveLang] = useState<'curl' | 'nodejs' | 'python'>('curl');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code snippet copied to clipboard.",
    });
  };

  const endpoints: any = {
    whatsapp: {
      single: {
        title: "WhatsApp Single Dispatch",
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
        title: "WhatsApp Bulk campaign",
        description: "High-volume personalized broadcasts for marketing and dynamic alerts.",
        url: "/api/whatsapp/api/send-bulk",
        method: "POST",
        payload: {
          username: user?.email || "your-email@example.com",
          password: "your_api_password",
          templateName: "promo_event_2024",
          campaignName: "Spring Sale Burst",
          numbers: [
            {
              to: "919004207813",
              variables: { "1": "Sandeep", "2": "SALE50" },
              mediaUrl: "https://assets.yoursite.com/coupon.png"
            }
          ]
        }
      },
      media: {
        title: "WhatsApp Media Upload",
        description: "Upload images or documents to our cloud to generate a public URL for messages.",
        url: "/api/whatsapp/api/upload-media",
        method: "POST (form-data)",
        payload: {
          username: user?.email,
          password: "your_api_password",
          file: "(binary file)"
        }
      },
      template: {
        title: "WhatsApp Template Create",
        description: "Programmatically submit new templates for approval to Meta/Pinbot.",
        url: "/api/whatsapp/templates",
        method: "POST",
        payload: {
          name: "dynamic_promo_v1",
          category: "MARKETING",
          language: "en_US",
          components: [
            { type: "HEADER", format: "TEXT", text: "Exclusive Offer" },
            { type: "BODY", text: "Hi {{1}}, here is your code: {{2}}" }
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
      },
      bulk: {
        title: "RCS Bulk Dynamic",
        description: "Enterprise-grade RCS rich messaging for high-volume campaigns.",
        url: "/api/rcs/api/send-bulk",
        method: "POST",
        payload: {
          username: user?.email || "your-email@example.com",
          password: "your_api_password",
          templateName: "rcs_promo_v1",
          campaignName: "Spring Sale RCS",
          numbers: [ "919004207813", "919876543210" ]
        }
      },
      template: {
        title: "RCS Template Submit",
        description: "Submit rich card and carousel templates for RCS approval.",
        url: "/api/rcs/templates",
        method: "POST",
        payload: {
          template_name: "rcs_rich_offer",
          rich_template_data: {
            card_type: "standalone_card",
            title: "Claim Offer",
            description: "Click below to get 50% off.",
            media_url: "https://site.com/img.jpg"
          }
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

    if (endpoint.method.includes('form-data')) {
       return `curl -X POST "${fullUrl}" \\
     -F "username=${user?.email}" \\
     -F "password=your_api_password" \\
     -F "file=@/path/to/your/image.jpg"`;
    }

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
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-10">
      {/* Compact Header */}
      <div className="p-6 rounded-2xl bg-slate-50 border border-indigo-100/40 relative overflow-hidden">
        <div className="relative z-10 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-indigo-600 rounded-lg">
                <Terminal className="w-4 h-4 text-white" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 h-5 px-2 font-black text-[9px] uppercase">
                v3.0 STABLE
              </Badge>
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Enterprise API Hub</h1>
            <p className="text-slate-500 text-sm font-medium">Power your workflows with NotifyNow Messaging & Content APIs.</p>
          </div>
          <LayoutDashboard className="w-20 h-20 text-slate-200/50 absolute -right-4 -bottom-4 rotate-12" />
        </div>
      </div>

      {/* Modern Compact Authentication Card */}
      <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <div className="flex-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Username</p>
              <code className="text-xs font-mono font-bold text-slate-700 truncate block">{user?.email || 'admin@demo.com'}</code>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border">
            <Globe className="w-5 h-5 text-indigo-600" />
            <div className="flex-1">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">API Endpoint</p>
              <code className="text-xs font-mono font-bold text-slate-700">https://notifynow.in/api</code>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100 lg:col-span-2">
            <Info className="w-5 h-5 text-indigo-600 shrink-0" />
            <p className="text-[11px] text-indigo-800 leading-tight">
              Combine your username and API password for all requests. Never share credentials with third parties.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="whatsapp" className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-2xl mb-8 border border-border/50">
          <TabsTrigger value="whatsapp" className="rounded-xl px-4 py-2 text-xs font-bold gap-2"><MessageSquare className="w-3.5 h-3.5" /> WhatsApp</TabsTrigger>
          <TabsTrigger value="rcs" className="rounded-xl px-4 py-2 text-xs font-bold gap-2"><Smartphone className="w-3.5 h-3.5" /> RCS Business</TabsTrigger>
          <TabsTrigger value="sms" className="rounded-xl px-4 py-2 text-xs font-bold gap-2"><Zap className="w-3.5 h-3.5" /> SMS API</TabsTrigger>
        </TabsList>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-3 space-y-1 sticky top-24">
            <div className="flex items-center gap-2 px-4 mb-3">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Available Methods</h4>
            </div>
            {['Single Dispatch', 'Bulk Campaign', 'Media Upload', 'Template Create'].map((m) => (
               <a key={m} href={`#${m.toLowerCase().replace(' ', '-')}`} className="flex items-center gap-3 px-4 py-2 rounded-lg text-[13px] font-bold hover:bg-muted text-slate-600 transition-all group">
                 <ChevronRight className="w-3 h-3 opacity-30 group-hover:opacity-100" /> {m}
               </a>
            ))}
          </div>

          <div className="lg:col-span-9 space-y-12">
            <TabsContent value="whatsapp" className="space-y-12 m-0">
              <ApiSection id="single-dispatch" config={endpoints.whatsapp.single} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
              <ApiSection id="bulk-campaign" config={endpoints.whatsapp.bulk} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
              <ApiSection id="media-upload" config={endpoints.whatsapp.media} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
              <ApiSection id="template-create" config={endpoints.whatsapp.template} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
            </TabsContent>

            <TabsContent value="rcs" className="space-y-12 m-0">
              <ApiSection id="single-dispatch" config={endpoints.rcs.single} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
              <ApiSection id="bulk-campaign" config={endpoints.rcs.bulk} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
              <ApiSection id="template-create" config={endpoints.rcs.template} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
            </TabsContent>

            <TabsContent value="sms" className="space-y-12 m-0">
               <ApiSection id="single-dispatch" config={endpoints.sms.single} activeLang={activeLang} setLang={setActiveLang} onCopy={copyToClipboard} generateCode={generateCode} />
            </TabsContent>
          </div>
        </div>
      </Tabs>

      <footer className="pt-10 pb-8 border-t text-center space-y-3">
        <p className="text-xs text-muted-foreground font-medium">NotifyNow Developer Support: support@notifynow.in</p>
        <div className="flex justify-center gap-4">
           <Button variant="outline" size="sm" className="rounded-full px-6 text-[11px] font-bold">Download Postman Link</Button>
           <Button variant="outline" size="sm" className="rounded-full px-6 text-[11px] font-bold">API Status Dashboard</Button>
        </div>
      </footer>
    </div>
  );
}

function ApiSection({ id, config, activeLang, setLang, onCopy, generateCode }: any) {
  return (
    <div id={id} className="scroll-mt-24 space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-black text-slate-800">{config.title}</h3>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
      </div>
      <p className="text-[13px] text-slate-500 font-medium leading-relaxed max-w-4xl">{config.description}</p>

      <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <Badge className="bg-indigo-600 hover:bg-indigo-700 font-black text-[9px] uppercase h-5">{config.method.split(' ')[0]}</Badge>
        <code className="text-xs font-mono text-slate-600 flex-1 truncate">https://notifynow.in{config.url}</code>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-600" onClick={() => onCopy(`https://notifynow.in${config.url}`)}>
          <Copy className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Card className="border-slate-200 shadow-xl shadow-slate-100 rounded-2xl overflow-hidden">
        <div className="flex bg-slate-100/50 p-1 border-b">
          {['curl', 'nodejs', 'python'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l as any)}
              className={cn(
                "px-4 py-1.5 rounded-xl text-[11px] font-black uppercase transition-all tracking-tight",
                activeLang === l ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {l === 'nodejs' ? 'Node.js' : l}
            </button>
          ))}
        </div>
        <CardContent className="p-0 bg-[#0f172a] relative">
          <pre className="p-5 text-[12px] font-mono text-slate-300 overflow-x-auto leading-relaxed">
            {generateCode(activeLang, config)}
          </pre>
          <Button 
            size="icon" 
            variant="ghost" 
            className="absolute top-3 right-3 h-7 w-7 text-slate-500 hover:text-white bg-white/5"
            onClick={() => onCopy(generateCode(activeLang, config))}
          >
            <Copy className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
