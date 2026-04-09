import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Layout, Code, Sparkles, Plus, Image as ImageIcon, Link as LinkIcon, Trash2, Zap } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmailTemplateFormProps {
  data: any;
  onChange: (data: any) => void;
}

const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Welcome to our platform!',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 8px;">
        <h1 style="color: #00a884; text-align: center;">Welcome aboard!</h1>
        <p>Hi [custom_param_name],</p>
        <p>We're thrilled to have you with us. Our platform is designed to help you communicate better with your customers across all channels.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="#" style="background-color: #00a884; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get Started Now</a>
        </div>
        <p>If you have any questions, just reply to this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #666; text-align: center;">© 2026 NotifyNow. All rights reserved.</p>
      </div>
    `
  },
  marketing: {
    subject: 'Special Offer Just for You! 🚀',
    body: `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #000; padding: 40px; text-align: center; border-radius: 10px 10px 0 0;">
          <h2 style="color: #fff; margin: 0; font-size: 28px;">LIMIT-TIME OFFER</h2>
          <p style="color: #00a884; font-weight: bold; font-size: 48px; margin: 10px 0;">50% OFF</p>
        </div>
        <div style="background-color: #fff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
          <h3 style="margin-top: 0;">Hi [custom_param_name],</h3>
          <p>Don't miss out on our biggest sale of the year. Upgrade your plan today and save big!</p>
          <ul style="padding-left: 20px; color: #444;">
            <li>Unlimited RCS Messaging</li>
            <li>Premium WhatsApp Templates</li>
            <li>Priority Support</li>
          </ul>
          <div style="margin-top: 30px;">
            <a href="#" style="display: block; background-color: #00a884; color: white; padding: 15px; text-decoration: none; border-radius: 8px; text-align: center; font-weight: bold; font-size: 18px;">CLAIM YOUR DISCOUNT</a>
          </div>
        </div>
      </div>
    `
  },
  alert: {
    subject: 'Action Required: Your Account Security',
    body: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 20px auto; padding: 25px; border: 2px solid #ff4d4f; border-radius: 12px;">
        <h2 style="color: #ff4d4f; margin-top: 0;">Security Alert</h2>
        <p>We noticed a login to your NotifyNow account from a new device.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px;"><strong>Time:</strong> [custom_param_time]</p>
          <p style="margin: 5px 0 0 0; font-size: 13px;"><strong>Device:</strong> [custom_param_device]</p>
        </div>
        <p>If this was you, you can ignore this email. If not, please secure your account immediately.</p>
        <a href="#" style="display: inline-block; background-color: #ff4d4f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Secure Account</a>
      </div>
    `
  }
};

export const EmailTemplateForm: React.FC<EmailTemplateFormProps> = ({ data, onChange }) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');

  const handleChange = (field: string, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const applyTemplate = (type: keyof typeof EMAIL_TEMPLATES) => {
    const template = EMAIL_TEMPLATES[type];
    onChange({
      ...data,
      subject: template.subject,
      body: template.body
    });
  };

  const insertParam = () => {
    const param = '[custom_param]';
    if (activeTab === 'visual') {
        const currentBody = data.body || '';
        handleChange('body', currentBody + param);
    } else {
        handleChange('body', (data.body || '') + param);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      ['link', 'image', 'video'],
      [{ 'color': [] }, { 'background': [] }],
      ['clean'],
      ['code-block']
    ],
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Template Chooser */}
      <div className="space-y-3">
        <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Layout className="w-4 h-4 text-primary" /> Choose a Quick Design
        </Label>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(EMAIL_TEMPLATES).map(([key, template]) => (
            <div 
              key={key}
              onClick={() => applyTemplate(key as any)}
              className="group cursor-pointer p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-primary/30 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-primary/10 flex items-center justify-center text-slate-500 group-hover:text-primary transition-colors">
                 <Mail className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="space-y-6">
        <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700">Template Name</Label>
            <Input 
                placeholder="e.g. welcome_email_v1"
                value={data.name || ''}
                onChange={(e) => handleChange('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                className="rounded-xl h-12 bg-white shadow-sm border-slate-100"
            />
        </div>

        <div className="space-y-3">
            <Label className="text-sm font-bold text-slate-700">Email Subject Line</Label>
            <Input 
                placeholder="Enter a catchy subject line..."
                value={data.subject || ''}
                onChange={(e) => handleChange('subject', e.target.value)}
                className="rounded-xl h-12 bg-white shadow-sm border-slate-100"
            />
        </div>

        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label className="text-sm font-bold text-slate-700">Email Body Content</Label>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={insertParam} className="h-7 text-[10px] font-bold text-primary hover:bg-primary/5">
                        <Plus className="w-3 h-3 mr-1" /> Add Personalization
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-xl mb-3">
                    <TabsTrigger value="visual" className="rounded-lg px-4 font-bold text-[11px]"><Sparkles className="w-3 h-3 mr-1.5" /> Visual Editor</TabsTrigger>
                    <TabsTrigger value="code" className="rounded-lg px-4 font-bold text-[11px]"><Code className="w-3 h-3 mr-1.5" /> HTML Code</TabsTrigger>
                </TabsList>

                <TabsContent value="visual" className="mt-0">
                    <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm h-[400px]">
                        <ReactQuill 
                            theme="snow" 
                            value={data.body || ''} 
                            onChange={(content) => handleChange('body', content)}
                            modules={quillModules}
                            className="h-[350px] visual-email-editor"
                        />
                    </div>
                </TabsContent>

                <TabsContent value="code" className="mt-0">
                    <textarea 
                        className="w-full h-[400px] p-4 rounded-2xl border border-slate-100 bg-slate-900 text-emerald-400 font-mono text-sm focus:ring-primary focus:border-primary outline-none resize-none"
                        value={data.body || ''}
                        onChange={(e) => handleChange('body', e.target.value)}
                        placeholder="<!-- Enter custom HTML here -->"
                    />
                </TabsContent>
            </Tabs>
        </div>
      </div>

      {/* Advanced Footer Settings */}
      <div className="p-6 rounded-2xl bg-indigo-50/30 border border-indigo-100 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Compliance & Footer
        </h4>
        <p className="text-[11px] text-slate-500 leading-relaxed italic">
            Automated unsubscribe links and your business physical address will be appended to the bottom of the email for CAN-SPAM compliance.
        </p>
      </div>
    </div>
  );
};
