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
  CheckCircle2,
  Zap
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
  countryCode: string;
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
            <CardContent className="p-6 md:p-10 bg-white">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 md:gap-10 items-start">
                
                {/* Form Sections Area - 8 Columns */}
                <div className="space-y-8 xl:col-span-8">
                  
                  {/* Section 1: Bot Identity */}
                  <div className="space-y-6 p-6 md:p-8 rounded-[2rem] border border-slate-200 bg-slate-50/20 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                      <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
                        <Bot className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl tracking-tight text-slate-800">Bot Identity</h3>
                        <p className="text-xs text-slate-400 font-medium">Define your bot's core identity and region</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="space-y-2.5 lg:col-span-1">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Region</Label>
                        <RadioGroup 
                          value={config.botType} 
                          onValueChange={(val: any) => setConfig({...config, botType: val})}
                          className="flex gap-3"
                        >
                          <div className="flex-1 flex items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                            <RadioGroupItem value="domestic" id="l-reg-india" className="mr-2" />
                            <Label htmlFor="l-reg-india" className="font-bold text-sm cursor-pointer text-slate-700 group-hover:text-primary transition-colors">India</Label>
                          </div>
                          <div className="flex-1 flex items-center justify-center p-4 rounded-2xl bg-white border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group">
                            <RadioGroupItem value="international" id="l-reg-row" className="mr-2" />
                            <Label htmlFor="l-reg-row" className="font-bold text-sm cursor-pointer text-slate-700 group-hover:text-primary transition-colors">Global</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="space-y-2.5 lg:col-span-1">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Message Type</Label>
                        <Select value={config.messageType} onValueChange={(val: any) => setConfig({...config, messageType: val})}>
                          <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm focus:ring-primary/20 font-bold text-slate-700 text-base">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-slate-200 bg-white shadow-2xl">
                            <SelectItem value="PROMOTIONAL">Promotional</SelectItem>
                            <SelectItem value="OTP">OTP</SelectItem>
                            <SelectItem value="TRANSACTIONAL">Transactional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2.5 lg:col-span-1">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Billing Category</Label>
                        <div className="relative">
                          <Input 
                            value="Conversational" 
                            readOnly 
                            className="h-14 rounded-2xl bg-slate-100/80 border-slate-200 font-bold text-slate-500 cursor-not-allowed pr-12 shadow-sm border-dashed"
                          />
                          <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold ml-1 mt-1.5 flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Pre-selected for your enterprise account.
                        </p>
                      </div>

                      <div className="space-y-2.5 md:col-span-1">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Bot Name</Label>
                        <Input 
                          placeholder="Acme Assistant" 
                          value={config.botName}
                          onChange={(e) => setConfig({...config, botName: e.target.value})}
                          className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm focus:border-primary font-bold text-slate-700 placeholder:font-normal text-base px-5"
                        />
                      </div>

                      <div className="space-y-2.5 md:col-span-1">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Brand Name</Label>
                        <Input 
                          placeholder="Acme Corp" 
                          value={config.brandName}
                          onChange={(e) => setConfig({...config, brandName: e.target.value})}
                          className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm focus:border-primary font-bold text-slate-700 placeholder:font-normal text-base px-5"
                        />
                      </div>

                      <div className="space-y-2.5 md:col-span-2 lg:col-span-1">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Short Description</Label>
                        <Input 
                          placeholder="Bot purpose..." 
                          value={config.shortDescription}
                          onChange={(e) => setConfig({...config, shortDescription: e.target.value})}
                          className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm focus:border-primary font-medium text-slate-700 text-base px-5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Media & Tech */}
                  <div className="space-y-6 p-6 md:p-8 rounded-[2rem] border border-slate-200 bg-slate-50/20 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                      <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 shadow-sm">
                        <Layout className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl tracking-tight text-slate-800">Media & Tech</h3>
                        <p className="text-xs text-slate-400 font-medium">Configure visuals and technical endpoints</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                      <div className="space-y-10 lg:col-span-7">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Bot Logo (224x224)</Label>
                            <label className="relative h-48 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-all cursor-pointer overflow-hidden group shadow-sm hover:border-indigo-400 active:scale-[0.98]">
                              {config.botLogoUrl ? (
                                <img src={config.botLogoUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center gap-4 text-slate-400 group-hover:text-indigo-600 transition-colors">
                                  <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 group-hover:shadow-lg transition-all">
                                    <ImageIcon className="h-7 w-7" />
                                  </div>
                                  <span className="text-[11px] font-black tracking-widest text-slate-400/80">UPLOAD LOGO</span>
                                </div>
                              )}
                              <Input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'logo')} />
                            </label>
                          </div>
                          <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Banner (1440x448)</Label>
                            <label className="relative h-48 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center bg-white hover:bg-slate-50 transition-all cursor-pointer overflow-hidden group shadow-sm hover:border-purple-400 active:scale-[0.98]">
                              {config.bannerUrl ? (
                                <img src={config.bannerUrl} className="w-full h-full object-cover" />
                              ) : (
                                <div className="flex flex-col items-center gap-4 text-slate-400 group-hover:text-purple-600 transition-colors">
                                  <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 group-hover:bg-purple-50 group-hover:border-purple-100 group-hover:shadow-lg transition-all">
                                    <Smartphone className="h-7 w-7" />
                                  </div>
                                  <span className="text-[11px] font-black tracking-widest text-slate-400/80">UPLOAD BANNER</span>
                                </div>
                              )}
                              <Input type="file" className="hidden" onChange={(e) => handleFileUpload(e, 'banner')} />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2">
                          <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Brand Theme Color</Label>
                          <div className="flex gap-5 p-2 rounded-2xl bg-white border border-slate-200 shadow-sm items-center h-16 px-4">
                            <div className="relative group/color">
                                <Input 
                                  type="color" 
                                  value={config.brandColor}
                                  onChange={(e) => setConfig({...config, brandColor: e.target.value})}
                                  className="w-12 h-12 p-0.5 rounded-xl bg-slate-100 border-none cursor-pointer overflow-hidden shadow-inner"
                                />
                                <div className="absolute inset-0 rounded-xl pointer-events-none border border-slate-200/50" />
                            </div>
                            <div className="flex-1 flex items-center justify-between">
                                <span className="font-mono font-black text-lg text-slate-700 tracking-tight">{config.brandColor.toUpperCase()}</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: config.brandColor }} />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Hue</span>
                                </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8 lg:col-span-5 flex flex-col justify-between">
                        <div className="space-y-3">
                          <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Webhook Endpoint</Label>
                          <div className="relative">
                            <Input 
                              placeholder="https://your-api.com/rcs/webhook" 
                              value={config.webhookUrl}
                              onChange={(e) => setConfig({...config, webhookUrl: e.target.value})}
                              className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-slate-700 pl-14 text-base"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-50 text-indigo-500">
                                <Globe className="h-4 w-4" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Capability Languages</Label>
                          <div className="relative">
                            <Input 
                              placeholder="English, Hindi, etc..." 
                              value={config.languagesSupported}
                              onChange={(e) => setConfig({...config, languagesSupported: e.target.value})}
                              className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-slate-700 pl-14 text-base"
                            />
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-emerald-50 text-emerald-500">
                                <Languages className="h-4 w-4" />
                            </div>
                          </div>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-indigo-900 border border-indigo-800 shadow-lg shadow-indigo-100 flex justify-between items-center group relative overflow-hidden mt-2">
                           {/* Decorative background element */}
                           <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                           
                           <div className="relative z-10">
                              <div className="flex items-center gap-2 text-indigo-300 mb-1.5">
                                <Shield className="h-4 w-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Provider</span>
                              </div>
                              <p className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                {config.rcsApi}
                                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                              </p>
                           </div>
                           <div className="p-3 rounded-2xl bg-white/10 border border-white/20 text-white shadow-xl backdrop-blur-sm group-hover:bg-white/20 transition-all">
                              <Zap className="h-6 w-6 fill-white/10" />
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Business & Legal */}
                  <div className="space-y-6 p-6 md:p-8 rounded-[2rem] border border-slate-200 bg-slate-50/20 shadow-sm hover:shadow-md transition-all duration-300">
                    <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                      <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                        <Building2 className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl tracking-tight text-slate-800">Business & Legal</h3>
                        <p className="text-xs text-slate-400 font-medium">Verify your business details and legal links</p>
                      </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 items-end">
                      <div className="space-y-3 lg:col-span-4">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Phone Access</Label>
                        <div className="flex gap-3">
                          <Select 
                            value={config.countryCode} 
                            onValueChange={(val) => setConfig({...config, countryCode: val})}
                          >
                            <SelectTrigger className="w-[110px] h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-slate-700 text-base">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-slate-200 bg-white shadow-2xl">
                              {countryCodes.map(c => (
                                <SelectItem key={c.code} value={c.code} className="py-3">
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
                            className="h-14 flex-1 rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-slate-700 text-base px-5"
                          />
                        </div>
                      </div>

                      <div className="space-y-3 lg:col-span-4">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Official Contact Email</Label>
                        <div className="relative">
                          <Input 
                            placeholder="support@acme.com" 
                            value={config.primaryEmail}
                            onChange={(e) => setConfig({...config, primaryEmail: e.target.value})}
                            className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-slate-700 pl-14 text-base"
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-50 text-indigo-500">
                             <Mail className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 lg:col-span-4">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Official Portal Website</Label>
                        <div className="relative">
                          <Input 
                            placeholder="https://acme.corp" 
                            value={config.primaryWebsite}
                            onChange={(e) => setConfig({...config, primaryWebsite: e.target.value})}
                            className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-bold text-slate-700 pl-14 text-base"
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-emerald-50 text-emerald-500">
                             <Globe className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 lg:col-span-4">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Terms of Service URL</Label>
                        <div className="relative">
                          <Input 
                            placeholder="https://acme.corp/terms" 
                            value={config.termsOfUseUrl}
                            onChange={(e) => setConfig({...config, termsOfUseUrl: e.target.value})}
                            className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-medium text-slate-600 pl-14 text-base"
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-50 text-slate-400">
                             <FileText className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3 lg:col-span-4">
                        <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 mb-2 ml-1">Privacy Compliance URL</Label>
                        <div className="relative">
                          <Input 
                            placeholder="https://acme.corp/privacy" 
                            value={config.privacyPolicyUrl}
                            onChange={(e) => setConfig({...config, privacyPolicyUrl: e.target.value})}
                            className="h-14 rounded-2xl bg-white border-slate-200 shadow-sm font-medium text-slate-600 pl-14 text-base"
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-50 text-slate-400">
                             <ShieldCheck className="h-4 w-4" />
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-4 pb-0.5">
                        <div className="p-4 rounded-2xl bg-slate-100/50 border border-slate-200/60 mb-3 hover:bg-slate-100 transition-colors cursor-pointer group/agree" onClick={() => setConfig({...config, agreeToLaunch: !config.agreeToLaunch})}>
                            <div className="flex items-start space-x-3">
                              <Checkbox 
                                id="light-agree" 
                                checked={config.agreeToLaunch}
                                onCheckedChange={(val: boolean) => setConfig({...config, agreeToLaunch: val})}
                                className="mt-1 border-slate-400 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600 h-5 w-5 rounded-md"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <Label htmlFor="light-agree" className="text-[11px] font-bold text-slate-600 leading-relaxed cursor-pointer group-hover/agree:text-slate-900 transition-colors">
                                I certify that all assets and legal URLs provided are legitimate and comply with international RCS standards.
                              </Label>
                            </div>
                        </div>
                        <Button 
                          className="w-full h-14 text-base font-black rounded-2xl shadow-xl shadow-indigo-100 bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 transition-all active:scale-[0.98] group relative overflow-hidden" 
                          onClick={handleSubmit}
                          disabled={isLoading || !config.agreeToLaunch}
                        >
                          {isLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            <div className="flex items-center justify-center gap-3 relative z-10">
                              <span>DEPLOY OFFICIAL RCS BOT</span>
                              <div className="bg-white/20 p-1 rounded-lg group-hover:rotate-90 transition-transform duration-500">
                                <Plus className="h-5 w-5" />
                              </div>
                            </div>
                          )}
                          {/* Button shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                        </Button>
                      </div>
                    </div>                  </div>
                  </div>

                </div>

                {/* Preview Sidebar Area - 4 Columns */}
                <div className="xl:block w-full xl:col-span-4 flex-shrink-0">
                   <div className="xl:sticky xl:top-8 space-y-4">
                      <div className="p-4 md:p-6 rounded-[2.5rem] bg-slate-50 border border-slate-100 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] overflow-hidden">
                        <div className="flex items-center justify-between mb-6 px-2 md:px-4">
                          <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Preview</h3>
                          </div>
                          <Badge variant="outline" className="text-[9px] font-bold bg-white text-slate-400 border-slate-100 px-3 py-0.5 rounded-full whitespace-nowrap">Device Mockup</Badge>
                        </div>
                        
                        {/* Improved Preview Wrapper with proper height management */}
                        <div className="relative w-full flex justify-center py-2" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                          <div className="w-full max-w-full flex justify-center transition-all duration-500 hover:scale-[1.02] origin-center">
                            <div className="transform-gpu scale-[0.75] sm:scale-[0.85] md:scale-[0.9] lg:scale-100 xl:scale-[0.88] 2xl:scale-100 h-[650px] flex items-start justify-center">
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
                      </div>
                      <div className="px-6 py-4 bg-primary/5 rounded-2xl border border-primary/10 shadow-sm">
                        <p className="text-[10px] font-bold text-primary/70 text-center leading-relaxed italic">
                          "This interactive mockup shows exactly how your brand will appear on modern Android devices."
                        </p>
                      </div>
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