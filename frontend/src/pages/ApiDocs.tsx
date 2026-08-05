import React, { useState, useEffect } from 'react';
import { 
  Terminal, Copy, Check, ChevronRight, 
  MessageSquare, Zap, Hash, ShieldCheck, 
  Smartphone, Activity, PhoneCall
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Custom Syntax Highlighter component for simple JSON formatting
const JsonHighlighter = ({ code }: { code: string }) => {
  return (
    <pre className="text-sm font-mono text-gray-300 overflow-x-auto p-4 bg-[#1e1e1e] rounded-lg custom-scrollbar">
      <code>{code}</code>
    </pre>
  );
};

export default function ApiDocs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('authentication');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: "Copied!", description: "Snippet copied to clipboard." });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // -------------------------------------------------------------
  // ALL API DOCUMENTATION DATA IS CONFIGURED HERE
  // You can easily add new sections and APIs by extending this array.
  // -------------------------------------------------------------
  const apiData = [
    {
      category: "Getting Started",
      icon: <ShieldCheck className="w-5 h-5 text-indigo-500" />,
      items: [
        {
          id: "authentication",
          title: "Authentication",
          method: "",
          url: "",
          description: "All API requests to NotifyNow require authentication. You authenticate by providing your API `username` (your registered email) and `password` (your API key/password) in the JSON payload of your POST requests, or as query parameters for GET requests.",
          parameters: [
            { name: "username", type: "string", required: true, desc: "Your registered email address." },
            { name: "password", type: "string", required: true, desc: "Your secret API password (this is different from your login password, check Settings)." }
          ],
          codeSnippet: {
            lang: "JSON Payload Example",
            code: `{\n  "username": "${user?.email || 'your-email@example.com'}",\n  "password": "your_api_password"\n}`
          },
          responseSnippet: null
        }
      ]
    },
    {
      category: "WhatsApp APIs",
      icon: <MessageSquare className="w-5 h-5 text-green-500" />,
      items: [
        {
          id: "wa-send-single",
          title: "Send WhatsApp Message",
          method: "POST",
          url: "https://notifynow.in/api/whatsapp/api/send-single",
          description: "Send a single WhatsApp message. This endpoint intelligently handles template messages and variables (including Media Headers).",
          parameters: [
            { name: "username", type: "string", required: true, desc: "API Username" },
            { name: "password", type: "string", required: true, desc: "API Password" },
            { name: "to", type: "string", required: true, desc: "Recipient mobile number with country code (e.g. 919876543210)" },
            { name: "templateName", type: "string", required: true, desc: "The exact name of the approved WhatsApp template." },
            { name: "variables", type: "object", required: false, desc: "JSON object mapping sequential variables to their values. e.g. {\"1\": \"Sandeep\", \"2\": \"https://link.pdf\"}" }
          ],
          codeSnippet: {
            lang: "cURL",
            code: `curl --location 'https://notifynow.in/api/whatsapp/api/send-single' \\\n--header 'Content-Type: application/json' \\\n--data-raw '{\n    "username": "your_email@example.com",\n    "password": "your_api_password",\n    "to": "919876543210",\n    "templateName": "indianprincess_invoice",\n    "variables": {\n        "1": "Sandeep Yadav",\n        "2": "http://demo.retailpos.in/BillPDF/DEA260.pdf"\n    }\n}'`
          },
          responseSnippet: {
            lang: "200 OK Response",
            code: `{\n    "success": true,\n    "messageId": "wa_1785909155848_919876543210",\n    "isFallbacked": false\n}`
          }
        },
        {
          id: "wa-send-bulk",
          title: "Send WhatsApp Bulk",
          method: "POST",
          url: "https://notifynow.in/api/whatsapp/api/send-bulk",
          description: "Send personalized WhatsApp messages to multiple recipients in a single API call.",
          parameters: [
            { name: "username", type: "string", required: true, desc: "API Username" },
            { name: "password", type: "string", required: true, desc: "API Password" },
            { name: "templateName", type: "string", required: true, desc: "Name of the approved template" },
            { name: "campaignName", type: "string", required: true, desc: "Name of the campaign for reporting" },
            { name: "numbers", type: "array", required: true, desc: "Array of recipient objects containing 'to' and 'variables'" }
          ],
          codeSnippet: {
            lang: "cURL",
            code: `curl --location 'https://notifynow.in/api/whatsapp/api/send-bulk' \\\n--header 'Content-Type: application/json' \\\n--data-raw '{\n    "username": "your_email@example.com",\n    "password": "your_api_password",\n    "templateName": "promo_offer",\n    "campaignName": "Diwali Sale",\n    "numbers": [\n        {\n            "to": "919876543210",\n            "variables": { "1": "John", "2": "50%" }\n        }\n    ]\n}'`
          },
          responseSnippet: {
            lang: "200 OK Response",
            code: `{\n    "success": true,\n    "message": "Bulk campaign 'Diwali Sale' queued for sending."\n}`
          }
        },
        {
          id: "wa-status",
          title: "Check Delivery Status",
          method: "GET",
          url: "https://notifynow.in/api/whatsapp/api/status/:id",
          description: "Check the delivery status of a single message ID or a bulk campaign ID.",
          parameters: [
            { name: "id", type: "path", required: true, desc: "The messageId or campaign_id returned in the send response." },
            { name: "username", type: "query", required: true, desc: "API Username" },
            { name: "password", type: "query", required: true, desc: "API Password" }
          ],
          codeSnippet: {
            lang: "cURL",
            code: `curl --location 'https://notifynow.in/api/whatsapp/api/status/wa_1785909155848_919876543210?username=your_email@example.com&password=your_api_password'`
          },
          responseSnippet: {
            lang: "200 OK Response",
            code: `{\n    "success": true,\n    "status": "delivered",\n    "read": true,\n    "sent_at": "2024-10-15T10:30:00Z"\n}`
          }
        }
      ]
    },
    {
      category: "RCS APIs",
      icon: <Smartphone className="w-5 h-5 text-blue-500" />,
      items: [
        {
          id: "rcs-send-single",
          title: "Send RCS Message",
          method: "POST",
          url: "https://notifynow.in/api/rcs/api/send-single",
          description: "Send a rich communication message to an Android device. Automatically falls back to SMS if the device does not support RCS.",
          parameters: [
            { name: "username", type: "string", required: true, desc: "API Username" },
            { name: "password", type: "string", required: true, desc: "API Password" },
            { name: "to", type: "string", required: true, desc: "Recipient mobile number" },
            { name: "templateName", type: "string", required: true, desc: "Approved RCS template name" },
            { name: "variables", type: "object", required: false, desc: "JSON object mapping variables" }
          ],
          codeSnippet: {
            lang: "cURL",
            code: `curl --location 'https://notifynow.in/api/rcs/api/send-single' \\\n--header 'Content-Type: application/json' \\\n--data-raw '{\n    "username": "...",\n    "password": "...",\n    "to": "919876543210",\n    "templateName": "rcs_welcome_msg",\n    "variables": { "1": "Sandeep" }\n}'`
          },
          responseSnippet: {
            lang: "200 OK Response",
            code: `{\n    "success": true,\n    "messageId": "rcs_898912_919876543210"\n}`
          }
        }
      ]
    },
    {
      category: "SMS & Voice APIs",
      icon: <PhoneCall className="w-5 h-5 text-purple-500" />,
      items: [
        {
          id: "sms-send",
          title: "Send SMS Message",
          method: "POST",
          url: "https://notifynow.in/api/sms/api/send-single",
          description: "Send traditional SMS using DLT approved templates.",
          parameters: [
            { name: "username", type: "string", required: true, desc: "API Username" },
            { name: "password", type: "string", required: true, desc: "API Password" },
            { name: "to", type: "string", required: true, desc: "Recipient mobile number" },
            { name: "templateId", type: "string", required: true, desc: "DLT Template ID" },
            { name: "message", type: "string", required: true, desc: "Exact text message matching the DLT template" }
          ],
          codeSnippet: {
            lang: "cURL",
            code: `curl --location 'https://notifynow.in/api/sms/api/send-single' \\\n--header 'Content-Type: application/json' \\\n--data-raw '{\n    "username": "...",\n    "password": "...",\n    "to": "919876543210",\n    "templateId": "1201159...', \n    "message": "Dear Sandeep, Your OTP is 123456."\n}'`
          },
          responseSnippet: {
            lang: "200 OK Response",
            code: `{\n    "success": true,\n    "messageId": "sms_90192_919876543210"\n}`
          }
        }
      ]
    },
    {
      category: "Webhooks",
      icon: <Activity className="w-5 h-5 text-orange-500" />,
      items: [
        {
          id: "webhook-delivery",
          title: "Delivery Report Webhook",
          method: "POST",
          url: "Your Configured URL",
          description: "Receive real-time push notifications to your server whenever a message is Delivered, Read, or Failed. Configure your webhook URL in Settings.",
          parameters: [
            { name: "messageId", type: "string", required: true, desc: "The ID of the message." },
            { name: "status", type: "string", required: true, desc: "sent, delivered, read, or failed" },
            { name: "recipient", type: "string", required: true, desc: "The mobile number" },
            { name: "timestamp", type: "string", required: true, desc: "ISO 8601 Timestamp" }
          ],
          codeSnippet: {
            lang: "Webhook Payload you will receive",
            code: `{\n    "event": "message_status",\n    "messageId": "wa_1785909155848_919876543210",\n    "status": "read",\n    "recipient": "919876543210",\n    "timestamp": "2024-05-20T14:32:01Z",\n    "channel": "whatsapp"\n}`
          },
          responseSnippet: null
        }
      ]
    }
  ];

  // Intersection Observer for scroll spy
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    }, { rootMargin: '-20% 0px -80% 0px' });

    apiData.forEach(cat => {
      cat.items.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) observer.observe(el);
      });
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* 1. LEFT SIDEBAR NAVIGATION */}
      <div className="w-64 flex-shrink-0 border-r bg-gray-50/50 overflow-y-auto hidden md:block">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 text-indigo-600">
            <Terminal className="w-6 h-6" />
            <h1 className="text-xl font-bold">API Reference</h1>
          </div>
          
          <div className="space-y-8">
            {apiData.map((category, idx) => (
              <div key={idx}>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">
                  {category.icon}
                  {category.category}
                </h2>
                <ul className="space-y-1.5 border-l-2 border-gray-100 ml-2">
                  {category.items.map((item) => (
                    <li key={item.id}>
                      <button
                        onClick={() => scrollToSection(item.id)}
                        className={cn(
                          "w-full text-left pl-4 py-1.5 text-sm transition-colors",
                          activeSection === item.id 
                            ? "text-indigo-600 border-l-2 border-indigo-600 -ml-[2px] font-medium bg-indigo-50/50 rounded-r-md" 
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-r-md"
                        )}
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 overflow-y-auto relative scroll-smooth custom-scrollbar">
        <div className="max-w-6xl mx-auto px-4 py-10 lg:px-12">
          
          {/* Header Banner */}
          <div className="mb-16 pb-8 border-b">
            <Badge variant="outline" className="mb-4 bg-indigo-50 text-indigo-700 border-indigo-200">v1.0 API Documentation</Badge>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-4">NotifyNow API Reference</h1>
            <p className="text-xl text-gray-600 max-w-2xl">
              Integrate WhatsApp, RCS, SMS, and Voice capabilities directly into your application using our robust REST APIs.
            </p>
          </div>

          {/* Render Sections dynamically */}
          {apiData.map((category) => (
            <div key={category.category} className="mb-16">
              {category.items.map((item) => (
                <div key={item.id} id={item.id} className="scroll-mt-12 mb-24 border-b border-gray-100 pb-16 last:border-0">
                  
                  {/* Two-Column Layout for each Endpoint Block */}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                    
                    {/* Left Column: Description & Parameters */}
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        {item.method && (
                          <Badge variant="secondary" className={cn(
                            "px-2.5 py-0.5 rounded text-xs font-bold uppercase",
                            item.method === 'POST' ? "bg-blue-100 text-blue-700" :
                            item.method === 'GET' ? "bg-emerald-100 text-emerald-700" :
                            "bg-gray-100 text-gray-700"
                          )}>
                            {item.method}
                          </Badge>
                        )}
                        <h2 className="text-2xl font-bold text-gray-900">{item.title}</h2>
                      </div>
                      
                      {item.url && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 bg-gray-50 p-2 rounded-md border border-gray-100 break-all font-mono">
                          <span className="text-gray-400 select-none">URL:</span>
                          <span className="text-gray-800">{item.url}</span>
                        </div>
                      )}

                      <p className="text-gray-600 mb-8 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Parameters Table */}
                      {item.parameters && item.parameters.length > 0 && (
                        <div className="mt-8">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-4 border-b pb-2">Parameters</h3>
                          <div className="space-y-4">
                            {item.parameters.map((param, pIdx) => (
                              <div key={pIdx} className="grid grid-cols-[140px_1fr] gap-4">
                                <div>
                                  <div className="font-mono text-sm font-semibold text-gray-900">{param.name}</div>
                                  <div className="text-xs text-gray-500 mt-1">{param.type}</div>
                                </div>
                                <div>
                                  {param.required ? (
                                    <span className="text-xs font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded mr-2">Required</span>
                                  ) : (
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mr-2">Optional</span>
                                  )}
                                  <span className="text-sm text-gray-600 leading-snug">{param.desc}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Code Snippets (Dark Theme) */}
                    <div className="space-y-6">
                      {item.codeSnippet && (
                        <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
                          <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-800">
                            <span className="text-xs font-medium text-gray-300">{item.codeSnippet.lang}</span>
                            <button 
                              onClick={() => copyToClipboard(item.codeSnippet.code, `${item.id}-req`)}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                            >
                              {copiedId === `${item.id}-req` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <JsonHighlighter code={item.codeSnippet.code} />
                        </div>
                      )}

                      {item.responseSnippet && (
                        <div className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
                          <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-800">
                            <span className="text-xs font-medium text-gray-300">{item.responseSnippet.lang}</span>
                            <button 
                              onClick={() => copyToClipboard(item.responseSnippet.code, `${item.id}-res`)}
                              className="text-gray-400 hover:text-white transition-colors p-1"
                            >
                              {copiedId === `${item.id}-res` ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <JsonHighlighter code={item.responseSnippet.code} />
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          ))}
          
        </div>
      </div>
    </div>
  );
}
