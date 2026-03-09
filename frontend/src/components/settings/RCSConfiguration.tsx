import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Smartphone, 
  Upload, 
  Plus, 
  Trash2, 
  Mail, 
  Phone, 
  FileText, 
  Shield, 
  Languages,
  Loader2,
  Database,
  Building2,
  Globe,
  MapPin,
  Bot,
  Layout,
  Lock,
  Image as ImageIcon,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { RCSPreview } from './RCSPreview';
import { RCSBotsList } from './RCSBotsList';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api/bots`;

interface PhoneEntry {
  id: string;
  countryCode: string;
  number: string;
}

interface EmailEntry {
  id: string;
  email: string;
}

interface RCSConfig {
  botType: 'domestic' | 'international' | '';
  messageType: 'OTP' | 'TRANSACTIONAL' | 'PROMOTIONAL' | '';
  billingCategory: string;
  botName: string;
  brandName: string;
  shortDescription: string;
  brandColor: string;
  primaryPhone: string;
  primaryPhoneLabel: string;
  primaryEmail: string;
  primaryEmailLabel: string;
  primaryWebsite: string;
  primaryWebsiteLabel: string;
  otherWebsite: string;
  otherWebsiteLabel: string;
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
  rcsApi: string;
  webhookUrl: string;
  languagesSupported: string;
  agreeToLaunch: boolean;
  botLogoFile: File | null;
  botLogoUrl: string | null;
  bannerFile: File | null;
  bannerUrl: string | null;
  // Legacy/Compatibility fields
  industryType?: string;
  address?: string;
  phoneNumbers?: PhoneEntry[];
  emails?: EmailEntry[];
  websiteUrl?: string;
}

const countryCodes = [
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
];

export function RCSConfiguration() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<RCSConfig>({
    botType: 'domestic',
    messageType: 'PROMOTIONAL',
    billingCategory: 'Conversational',
    botName: '',
    brandName: '',
    shortDescription: '',
    brandColor: '#000000',
    primaryPhone: '',
    primaryPhoneLabel: 'Customer Service',
    primaryEmail: '',
    primaryEmailLabel: 'Email Us',
    primaryWebsite: '',
    primaryWebsiteLabel: 'Visit Us',
    otherWebsite: '',
    otherWebsiteLabel: 'Other Link',
    termsOfUseUrl: '',
    privacyPolicyUrl: '',
    rcsApi: 'Google API',
    webhookUrl: '',
    languagesSupported: 'English, Hindi, Marathi, Telugu, Kannada, Malayalam, Tamil, Gujarati, Bengali',
    agreeToLaunch: true,
    botLogoFile: null,
    botLogoUrl: null,
    bannerFile: null,
    bannerUrl: null,
    industryType: 'Telecom',
    address: '',
    phoneNumbers: [],
    emails: [],
    websiteUrl: '',
    countryCode: '+91',
  });

  const [activeTab, setActiveTab] = useState('create');
  const [bots, setBots] = useState<any[]>([]);
  const [verifyConfig, setVerifyConfig] = useState({
    bot_id: '',
    brand_name: '',
    brand_address: 'India',
    screenImagesFile: null as File | null,
    brandLogoImageFile: null as File | null,
    carrier_list: [97, 77, 98],
  });

  const fetchBots = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(API_URL, { headers: { Authorization: `Bearer ${token}` } });
      setBots(res.data);
    } catch (err) {
      console.error('Failed to fetch bots');
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Premium dimensions check
    const expectedWidth = type === 'logo' ? 224 : 1440;
    const expectedHeight = type === 'logo' ? 224 : 448;

    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      if (img.width !== expectedWidth || img.height !== expectedHeight) {
        toast({ 
          title: "Invalid Dimensions", 
          description: `${type === 'logo' ? 'Logo' : 'Banner'} must be exactly ${expectedWidth}x${expectedHeight} px.`, 
          variant: "destructive" 
        });
      } else {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (type === 'logo') {
            setConfig({ ...config, botLogoFile: file, botLogoUrl: event.target?.result as string });
          } else {
            setConfig({ ...config, bannerFile: file, bannerUrl: event.target?.result as string });
          }
        };
        reader.readAsDataURL(file);
        toast({ title: 'Success', description: `${type === 'logo' ? 'Logo' : 'Banner'} uploaded.` });
      }
    };
  };

  const handleSubmit = async () => {
    // Form Validation logic
    if (!config.botName.trim()) {
      toast({ title: 'Validation Error', description: 'Bot Name is required.', variant: 'destructive' });
      return;
    }
    if (!config.brandName.trim()) {
      toast({ title: 'Validation Error', description: 'Brand Name is required.', variant: 'destructive' });
      return;
    }
    if (!config.botLogoFile) {
      toast({ title: 'Validation Error', description: 'Bot Logo is required.', variant: 'destructive' });
      return;
    }
    if (!config.shortDescription.trim()) {
      toast({ title: 'Validation Error', description: 'Short Description is required.', variant: 'destructive' });
      return;
    }
    if (!config.primaryPhone.trim()) {
      toast({ title: 'Validation Error', description: 'Phone number is required.', variant: 'destructive' });
      return;
    }
    if (!config.primaryEmail.trim()) {
      toast({ title: 'Validation Error', description: 'Official Email is required.', variant: 'destructive' });
      return;
    }
    if (!config.webhookUrl.trim()) {
      toast({ title: 'Validation Error', description: 'Webhook URL is required.', variant: 'destructive' });
      return;
    }
    if (!config.primaryWebsite.trim()) {
      toast({ title: 'Validation Error', description: 'Official Website is required.', variant: 'destructive' });
      return;
    }
    if (!config.termsOfUseUrl.trim()) {
      toast({ title: 'Validation Error', description: 'Terms of Use URL is required.', variant: 'destructive' });
      return;
    }
    if (!config.privacyPolicyUrl.trim()) {
      toast({ title: 'Validation Error', description: 'Privacy Policy URL is required.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      
      // Constructing detailed creation data
      const payload = {
        region: config.botType === 'domestic' ? 'India' : 'Rest of World',
        message_type: config.messageType,
        billing_category: config.billingCategory || 'Conversational',
        bot_name: config.botName,
        brand_name: config.brandName,
        short_description: config.shortDescription,
        brand_color: config.brandColor,
        primary_phone: `${config.countryCode}${config.primaryPhone.startsWith('+') ? config.primaryPhone.substring(1) : config.primaryPhone}`,
        primary_phone_label: config.primaryPhoneLabel,
        primary_email: config.primaryEmail,
        primary_email_label: config.primaryEmailLabel,
        primary_website: config.primaryWebsite,
        primary_website_label: config.primaryWebsiteLabel,
        other_website: config.otherWebsite,
        other_website_label: config.otherWebsiteLabel,
        terms_url: config.termsOfUseUrl,
        privacy_url: config.privacyPolicyUrl,
        rcs_api: config.rcsApi,
        webhook_url: config.webhookUrl,
        languages_supported: config.languagesSupported
      };

      formData.append('data', JSON.stringify(payload));
      if (config.botLogoFile) formData.append('botLogo', config.botLogoFile);
      if (config.bannerFile) formData.append('bannerImage', config.bannerFile);

      const res = await axios.post(`${API_URL}/submit`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        toast({ 
          title: 'Bot Created Successfully!', 
          description: `Your bot ID is ${res.data.bot_id} and Brand ID is ${res.data.brand_id}`,
          className: 'bg-green-500 text-white border-none'
        });
        // Transition to view tab
        document.querySelector('[value="view"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    } catch (err: any) {
      toast({ 
        title: 'Submission Error', 
        description: err.response?.data?.message || 'Something went wrong while creating the bot.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyConfig.bot_id) {
      toast({ title: 'Validation Error', description: 'Please select a bot to verify.', variant: 'destructive' });
      return;
    }
    if (!verifyConfig.brand_name.trim()) {
      toast({ title: 'Validation Error', description: 'Brand Name is required for verification.', variant: 'destructive' });
      return;
    }
    if (!verifyConfig.brand_address.trim()) {
      toast({ title: 'Validation Error', description: 'Business Address is required.', variant: 'destructive' });
      return;
    }
    if (!verifyConfig.screenImagesFile) {
      toast({ title: 'Validation Error', description: 'Screenshots are required for verification.', variant: 'destructive' });
      return;
    }
    if (!verifyConfig.brandLogoImageFile) {
      toast({ title: 'Validation Error', description: 'Verification Logo is required.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      
      const payload = {
        bot_id: verifyConfig.bot_id,
        brand_details: {
          brand_name: verifyConfig.brand_name,
          brand_address: verifyConfig.brand_address,
        },
        carrier_details: { carrier_list: verifyConfig.carrier_list }
      };

      formData.append('data', JSON.stringify(payload));
      if (verifyConfig.screenImagesFile) formData.append('screenImages', verifyConfig.screenImagesFile);
      if (verifyConfig.brandLogoImageFile) formData.append('brandLogoImage', verifyConfig.brandLogoImageFile);

      const res = await axios.post(`${API_URL}/verify`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data.success) {
        toast({ title: 'Success', description: res.data.message });
        setActiveTab('view');
        fetchBots();
      }
    } catch (err: any) {
      toast({ 
        title: 'Verification Error', 
        description: err.response?.data?.message || 'Verification submission failed.', 
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 h-12 p-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
          <TabsTrigger value="create" className="rounded-xl transition-all duration-300">
            <Plus className="h-4 w-4 mr-2" /> Create Bot
          </TabsTrigger>
          <TabsTrigger value="verify" className="rounded-xl transition-all duration-300">
            <ShieldCheck className="h-4 w-4 mr-2" /> Verify Bot
          </TabsTrigger>
          <TabsTrigger value="view" className="rounded-xl transition-all duration-300">
            <Database className="h-4 w-4 mr-2" /> Manage Bots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-10 px-10 bg-slate-50/50 border-b border-slate-100">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-primary/10 shadow-sm ring-1 ring-primary/20">
                  <Smartphone className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Official Bot Onboarding</CardTitle>
                  <CardDescription className="text-base text-slate-500 font-medium italic">Create and refine your premium RCS business presence.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 bg-white">
              <div className="flex flex-col xl:flex-row gap-10">
                {/* 3-Column Grid Container */}
                <div className="flex-1">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Column 1: Bot Identity */}
                    <div className="space-y-6 p-6 rounded-3xl border border-slate-200 bg-slate-50/30 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                          <Bot className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold text-lg tracking-tight text-slate-800">Bot Identity</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Region</Label>
                          <RadioGroup 
                            value={config.botType} 
                            onValueChange={(val: any) => setConfig({...config, botType: val})}
                            className="flex gap-2"
                          >
                            <div className="flex-1 flex items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-primary/50 transition-all cursor-pointer">
                              <RadioGroupItem value="domestic" id="l-reg-india" className="mr-2" />
                              <Label htmlFor="l-reg-india" className="font-bold text-xs cursor-pointer text-slate-700">India</Label>
                            </div>
                            <div className="flex-1 flex items-center justify-center p-3 rounded-xl bg-white border border-slate-200 hover:border-primary/50 transition-all cursor-pointer">
                              <RadioGroupItem value="international" id="l-reg-row" className="mr-2" />
                              <Label htmlFor="l-reg-row" className="font-bold text-xs cursor-pointer text-slate-700">Global</Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Message Type</Label>
                          <Select value={config.messageType} onValueChange={(val: any) => setConfig({...config, messageType: val})}>
                            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 focus:ring-primary/20 font-bold text-slate-700">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 bg-white shadow-2xl">
                              <SelectItem value="PROMOTIONAL">Promotional</SelectItem>
                              <SelectItem value="OTP">OTP</SelectItem>
                              <SelectItem value="TRANSACTIONAL">Transactional</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Billing Category</Label>
                          <Select value={config.billingCategory} onValueChange={(val) => setConfig({...config, billingCategory: val})}>
                            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 focus:ring-primary/20 font-bold text-slate-700">
                              <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-200 bg-white shadow-2xl">
                              <SelectItem value="Conversational">Conversational</SelectItem>
                              <SelectItem value="Non-Conversational">Non-Conversational</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Bot Name</Label>
                          <Input 
                            placeholder="Acme Assistant" 
                            value={config.botName}
                            onChange={(e) => setConfig({...config, botName: e.target.value})}
                            className="h-12 rounded-xl bg-white border-slate-200 focus:border-primary font-bold text-slate-700 placeholder:font-normal"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Brand Name</Label>
                          <Input 
                            placeholder="Acme Corp" 
                            value={config.brandName}
                            onChange={(e) => setConfig({...config, brandName: e.target.value})}
                            className="h-12 rounded-xl bg-white border-slate-200 focus:border-primary font-bold text-slate-700 placeholder:font-normal"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Short Description</Label>
                          <Textarea 
                            placeholder="Bot purpose..." 
                            value={config.shortDescription}
                            onChange={(e) => setConfig({...config, shortDescription: e.target.value})}
                            className="min-h-[100px] rounded-xl bg-white border-slate-200 focus:border-primary font-medium resize-none text-slate-700"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Media & Configuration */}
                    <div className="space-y-6 p-6 rounded-3xl border border-slate-200 bg-slate-50/30 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                        <div className="p-2 rounded-xl bg-indigo-50 text-purple-600 border border-purple-100">
                          <Layout className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold text-lg tracking-tight text-slate-800">Media & Tech</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Bot Logo</Label>
                            <div className="relative h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-all cursor-pointer overflow-hidden group">
                              {config.botLogoUrl ? (
                                <img src={config.botLogoUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Plus className="h-5 w-5 text-primary/60" />
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">224 x 224</span>
                                </div>
                              )}
                              <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'logo')} />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Banner</Label>
                            <div className="relative h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-all cursor-pointer overflow-hidden group">
                              {config.bannerUrl ? (
                                <img src={config.bannerUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <Plus className="h-5 w-5 text-purple-500/60" />
                                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">1440 x 448</span>
                                </div>
                              )}
                              <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'banner')} />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Brand Color</Label>
                          <div className="flex gap-2">
                            <Input 
                              type="color" 
                              value={config.brandColor}
                              onChange={(e) => setConfig({...config, brandColor: e.target.value})}
                              className="w-12 h-12 p-1 rounded-xl bg-white border-slate-200 cursor-pointer overflow-hidden"
                            />
                            <Input 
                              value={config.brandColor}
                              onChange={(e) => setConfig({...config, brandColor: e.target.value})}
                              className="h-12 flex-1 rounded-xl bg-white border-slate-200 font-mono text-center font-bold text-slate-700"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Webhook URL</Label>
                          <Input 
                            placeholder="https://..." 
                            value={config.webhookUrl}
                            onChange={(e) => setConfig({...config, webhookUrl: e.target.value})}
                            className="h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-700"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Languages</Label>
                          <Input 
                            placeholder="Eng, Hindi, etc." 
                            value={config.languagesSupported}
                            onChange={(e) => setConfig({...config, languagesSupported: e.target.value})}
                            className="h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-700"
                          />
                        </div>

                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 space-y-2">
                           <div className="flex items-center gap-2 text-primary">
                             <Shield className="h-4 w-4" />
                             <span className="text-[10px] font-bold">API Provider</span>
                           </div>
                           <p className="text-xs font-bold text-slate-700">{config.rcsApi}</p>
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Contacts & Legal */}
                    <div className="space-y-6 p-6 rounded-3xl border border-slate-200 bg-slate-50/30 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
                        <div className="p-2 rounded-xl bg-indigo-50 text-emerald-600 border border-emerald-100">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <h3 className="font-bold text-lg tracking-tight text-slate-800">Business & Legal</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Phone Number</Label>
                          <div className="flex gap-0">
                            <Select 
                              value={config.countryCode} 
                              onValueChange={(val) => setConfig({...config, countryCode: val})}
                            >
                              <SelectTrigger className="w-[100px] h-12 rounded-l-xl rounded-r-none bg-white border-slate-200 border-r-0 focus:ring-0 font-bold text-slate-700">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl border-slate-200 bg-white">
                                {countryCodes.map(c => (
                                  <SelectItem key={c.code} value={c.code}>
                                    <span className="mr-2">{c.flag}</span>
                                    {c.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input 
                              placeholder="98765 43210" 
                              value={config.primaryPhone}
                              onChange={(e) => setConfig({...config, primaryPhone: e.target.value})}
                              className="h-12 flex-1 rounded-l-none rounded-r-xl bg-white border-slate-200 font-bold text-slate-700"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Official Email</Label>
                          <Input 
                            placeholder="support@acme.com" 
                            value={config.primaryEmail}
                            onChange={(e) => setConfig({...config, primaryEmail: e.target.value})}
                            className="h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-700"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Official Website</Label>
                          <Input 
                            placeholder="https://acme.corp" 
                            value={config.primaryWebsite}
                            onChange={(e) => setConfig({...config, primaryWebsite: e.target.value})}
                            className="h-12 rounded-xl bg-white border-slate-200 font-bold text-slate-700"
                          />
                        </div>

                        <div className="space-y-2 pt-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Terms URL</Label>
                          <Input 
                            placeholder="Terms of use" 
                            value={config.termsOfUseUrl}
                            onChange={(e) => setConfig({...config, termsOfUseUrl: e.target.value})}
                            className="h-12 rounded-xl bg-white border-slate-200 text-xs font-medium text-slate-600 italic"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Privacy URL</Label>
                          <Input 
                            placeholder="Privacy policy" 
                            value={config.privacyPolicyUrl}
                            onChange={(e) => setConfig({...config, privacyPolicyUrl: e.target.value})}
                            className="h-12 rounded-xl bg-white border-slate-200 text-xs font-medium text-slate-600 italic"
                          />
                        </div>

                        {/* Agreement & Action */}
                        <div className="pt-4 space-y-4">
                          <div className="flex items-start space-x-3">
                            <Checkbox 
                              id="light-agree" 
                              checked={config.agreeToLaunch}
                              onCheckedChange={(val: boolean) => setConfig({...config, agreeToLaunch: val})}
                              className="mt-1 border-slate-300"
                            />
                            <Label htmlFor="light-agree" className="text-[10px] font-semibold text-slate-500 leading-relaxed cursor-pointer">
                              I certify that all branding assets and legal URLs provided are legitimate and comply with international RCS standards.
                            </Label>
                          </div>
                          <Button 
                            className="w-full h-14 text-sm font-bold rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-[0.98]" 
                            onClick={handleSubmit}
                            disabled={isLoading || !config.agreeToLaunch}
                          >
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Plus className="h-5 w-5 mr-2" />}
                            Deploy RCS Bot
                          </Button>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Light-Themed Preview Sidebar */}
                <div className="hidden xl:block w-[360px] flex-shrink-0 animate-in fade-in zoom-in-95 duration-700">
                   <div className="sticky top-8 p-4 rounded-[2.5rem] bg-slate-50 border border-slate-100 shadow-inner">
                      <div className="flex items-center gap-2 mb-4 px-4 overflow-hidden">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Live Preview</h3>
                      </div>
                      <RCSPreview 
                        botName={config.botName}
                        brandName={config.brandName}
                        shortDescription={config.shortDescription}
                        brandColor={config.brandColor}
                        botLogo={config.botLogoUrl}
                        bannerImage={config.bannerUrl}
                        phoneNumber={config.primaryPhone}
                        email={config.primaryEmail}
                      />
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-none shadow-xl bg-white rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-4 pt-10 px-10 bg-indigo-50/30 border-b border-indigo-100">
              <div className="flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-indigo-600 shadow-md shadow-indigo-200">
                  <ShieldCheck className="h-7 w-7 text-white" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold tracking-tight text-indigo-900">Official Verification</CardTitle>
                  <CardDescription className="text-base text-indigo-500 font-medium italic">Submit your bot for carrier-grade approval and status verification.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-10 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6 p-8 rounded-3xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-xl tracking-tight text-slate-800">Context</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Select Bot</Label>
                       <Select value={verifyConfig.bot_id} onValueChange={(val) => {
                         const selected = bots.find(b => b.bot_id === val);
                         setVerifyConfig({...verifyConfig, bot_id: val, brand_name: selected?.brand_name || ''});
                       }}>
                         <SelectTrigger className="h-12 rounded-xl bg-slate-50/50 border-slate-200 font-bold text-slate-700">
                           <SelectValue placeholder="Choose a bot" />
                         </SelectTrigger>
                         <SelectContent className="rounded-xl border-slate-200 bg-white shadow-2xl">
                           {bots.map(bot => (
                             <SelectItem key={bot.bot_id} value={bot.bot_id}>{bot.bot_name} ({bot.bot_id})</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Brand Name</Label>
                      <Input 
                        placeholder="Brand Name" 
                        value={verifyConfig.brand_name}
                        onChange={(e) => setVerifyConfig({...verifyConfig, brand_name: e.target.value})}
                        className="h-12 rounded-xl bg-slate-50/50 border-slate-200 font-bold text-slate-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Business Address</Label>
                      <Textarea 
                        placeholder="Full business address..." 
                        value={verifyConfig.brand_address}
                        onChange={(e) => setVerifyConfig({...verifyConfig, brand_address: e.target.value})}
                        className="min-h-[100px] rounded-xl bg-slate-50/50 border-slate-200 font-medium resize-none text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 p-8 rounded-3xl border border-slate-200 bg-white">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <Upload className="h-5 w-5 text-indigo-600" />
                    <h3 className="font-bold text-xl tracking-tight text-slate-800">Assets</h3>
                  </div>

                   <div className="grid grid-cols-2 gap-6 pb-4">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Screenshots</Label>
                      <div className="relative h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-slate-50/30 hover:bg-slate-50 transition-all cursor-pointer overflow-hidden group">
                         {verifyConfig.screenImagesFile ? (
                           <div className="flex flex-col items-center gap-1">
                             <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                             <span className="text-[9px] font-bold text-slate-600">{verifyConfig.screenImagesFile.name.substring(0, 12)}...</span>
                           </div>
                         ) : (
                           <div className="flex flex-col items-center gap-2">
                             <Plus className="h-5 w-5 text-slate-300" />
                           </div>
                         )}
                         <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setVerifyConfig({...verifyConfig, screenImagesFile: e.target.files?.[0] || null})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-semibold text-slate-500 mb-1.5">Verification Logo</Label>
                      <div className="relative h-32 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-slate-50/30 hover:bg-slate-50 transition-all cursor-pointer overflow-hidden group">
                         {verifyConfig.brandLogoImageFile ? (
                           <div className="flex flex-col items-center gap-1">
                             <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                             <span className="text-[9px] font-bold text-slate-600">{verifyConfig.brandLogoImageFile.name.substring(0, 12)}...</span>
                           </div>
                         ) : (
                           <div className="flex flex-col items-center gap-2">
                             <Plus className="h-5 w-5 text-slate-300" />
                           </div>
                         )}
                         <Input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => setVerifyConfig({...verifyConfig, brandLogoImageFile: e.target.files?.[0] || null})} />
                      </div>
                    </div>
                  </div>

                  <Button 
                    size="lg"
                    className="w-full h-14 text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 bg-indigo-600 hover:bg-indigo-700 transition-all" 
                    onClick={handleVerify}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                    Submit for Verification
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="animate-in fade-in duration-500 pt-4">
          <RCSBotsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}