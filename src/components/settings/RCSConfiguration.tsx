import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Smartphone, 
  Upload, 
  Plus, 
  Trash2, 
  Globe, 
  Mail, 
  Phone, 
  FileText, 
  Shield, 
  Webhook, 
  Languages,
  Info,
  Loader2,
  Database
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RCSPreview } from './RCSPreview';
import { RCSBotsList } from './RCSBotsList';
import { rcsApi } from '@/services/rcsApi';

interface PhoneEntry {
  id: string;
  countryCode: string;
  number: string;
  label: string;
}

interface EmailEntry {
  id: string;
  email: string;
  label: string;
}

// interface WebsiteEntry {
//   id: string;
//   url: string;
//   label: string;
// }

interface RCSConfig {
  botType: 'domestic' | 'international' | '';
  messageType: 'otp' | 'transactional' | 'promotional' | '';
  // billingCategory: string;
  botName: string;
  brandName: string;
  botLogo: string | null;
  botLogoFile: File | null;
  bannerImage: string | null;
  bannerImageFile: File | null;
  shortDescription: string;
  // brandColor: string;
  phoneNumbers: PhoneEntry[];
  emails: EmailEntry[];
  // websites: WebsiteEntry[];
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
  // developmentPlatform: string;
  // chatbotWebhook: string;
  // callbackUrl: string;
  languagesSupported: string;
  agreeToLaunch: boolean;
}

const countryCodes = [
  { code: '+91', country: 'IN', flag: '🇮🇳' },
  { code: '+1', country: 'US', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+971', country: 'AE', flag: '🇦🇪' },
  { code: '+65', country: 'SG', flag: '🇸🇬' },
  { code: '+61', country: 'AU', flag: '🇦🇺' },
];

// const billingCategories = [
//   'Conversational',
//   'Single Message',
//   'Basic Message',
// ];

// const developmentPlatforms = [
//   { value: 'gsma', label: 'GSMA API' },
//   { value: 'google', label: 'Google styled API' },
// ];

export function RCSConfiguration() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<RCSConfig>({
    botType: '',
    messageType: '',
    // billingCategory: '',
    botName: '',
    brandName: '',
    botLogo: null,
    botLogoFile: null,
    bannerImage: null,
    bannerImageFile: null,
    shortDescription: '',
    // brandColor: '#7C3AED',
    phoneNumbers: [{ id: '1', countryCode: '+91', number: '', label: '' }],
    emails: [{ id: '1', email: '', label: '' }],
    // websites: [{ id: '1', url: '', label: '' }],
    termsOfUseUrl: '',
    privacyPolicyUrl: '',
    // developmentPlatform: '',
    // chatbotWebhook: '',
    // callbackUrl: '',
    languagesSupported: '',
    agreeToLaunch: false,
  });

  // Only letters and spaces allowed
  const isValidText = (text: string) => /^[a-zA-Z\s]*$/.test(text);

  const validateImage = (file: File, type: 'logo' | 'banner'): boolean => {
    const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024;
    const allowedFormats = ['image/png', 'image/jpeg', 'image/jpg'];

    if (!allowedFormats.includes(file.type)) {
      toast({
        title: 'Invalid Format',
        description: 'Only PNG, JPG, JPEG formats are allowed.',
        variant: 'destructive'
      });
      return false;
    }

    if (file.size > maxSize) {
      const maxSizeMB = type === 'logo' ? 2 : 5;
      toast({
        title: 'File Too Large',
        description: `Maximum file size is ${maxSizeMB}MB.`,
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (validateImage(file, 'logo')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setConfig({ 
          ...config, 
          botLogo: event.target?.result as string,
          botLogoFile: file 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (validateImage(file, 'banner')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setConfig({ 
          ...config, 
          bannerImage: event.target?.result as string,
          bannerImageFile: file 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const addPhoneNumber = () => {
    setConfig({
      ...config,
      phoneNumbers: [...config.phoneNumbers, { id: Date.now().toString(), countryCode: '+91', number: '', label: '' }],
    });
  };

  const removePhoneNumber = (id: string) => {
    if (config.phoneNumbers.length > 1) {
      setConfig({
        ...config,
        phoneNumbers: config.phoneNumbers.filter(p => p.id !== id),
      });
    }
  };

  const addEmail = () => {
    setConfig({
      ...config,
      emails: [...config.emails, { id: Date.now().toString(), email: '', label: '' }],
    });
  };

  const removeEmail = (id: string) => {
    if (config.emails.length > 1) {
      setConfig({
        ...config,
        emails: config.emails.filter(e => e.id !== id),
      });
    }
  };

  // const addWebsite = () => {
  //   setConfig({
  //     ...config,
  //     websites: [...config.websites, { id: Date.now().toString(), url: '', label: '' }],
  //   });
  // };

  // const removeWebsite = (id: string) => {
  //   if (config.websites.length > 1) {
  //     setConfig({
  //       ...config,
  //       websites: config.websites.filter(w => w.id !== id),
  //     });
  //   }
  // };

  const handleSubmit = async () => {
    const errors: string[] = [];

    // Required fields
    if (!config.botType) errors.push('Bot Type is required (Domestic or International)');
    if (!config.messageType) errors.push('Message Type is required');
    // if (!config.billingCategory) errors.push('Billing Category is required');

    // Bot Name validation
    if (!config.botName.trim()) {
      errors.push('Bot Name is required');
    } else if (!isValidText(config.botName)) {
      errors.push('Bot Name can only contain letters and spaces (no numbers or symbols)');
    } else if (config.botName.length > 40) {
      errors.push('Bot Name must be maximum 40 characters');
    }

    // Brand Name validation
    if (!config.brandName.trim()) {
      errors.push('Brand Name is required');
    } else if (!isValidText(config.brandName)) {
      errors.push('Brand Name can only contain letters and spaces (no numbers or symbols)');
    } else if (config.brandName.length > 40) {
      errors.push('Brand Name must be maximum 40 characters');
    }

    // Images
    if (!config.botLogo) errors.push('Bot Logo is required');
    if (!config.bannerImage) errors.push('Banner Image is required');

    // Short Description
    if (!config.shortDescription.trim()) {
      errors.push('Short Description is required');
    } else if (config.shortDescription.length > 100) {
      errors.push('Short Description must be maximum 100 characters');
    }

    // At least one valid phone
    const hasValidPhone = config.phoneNumbers.some(p => 
      p.number.trim() && /^\d{7,15}$/.test(p.number.trim())
    );
    if (!hasValidPhone) errors.push('At least one valid phone number (7-15 digits) is required');

    // At least one valid email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const hasValidEmail = config.emails.some(e => e.email.trim() && emailRegex.test(e.email));
    if (!hasValidEmail) errors.push('At least one valid email address is required');

    // At least one valid website
    // const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    // const hasValidWebsite = config.websites.some(w => w.url.trim() && urlRegex.test(w.url));
    // if (!hasValidWebsite) errors.push('At least one valid website URL is required');

    // Other required fields
    if (!config.termsOfUseUrl.trim()) errors.push('Terms of Use URL is required');
    if (!config.privacyPolicyUrl.trim()) errors.push('Privacy Policy URL is required');
    // if (!config.developmentPlatform) errors.push('Development Platform is required');
    // if (!config.chatbotWebhook.trim()) errors.push('Chatbot Webhook URL is required');
    if (!config.languagesSupported.trim()) errors.push('Languages Supported is required');

    if (!config.agreeToLaunch) {
      errors.push('You must agree to launch the bot on all carriers');
    }

    // Show first error
    if (errors.length > 0) {
      toast({
        title: 'Validation Error',
        description: errors[0],
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const contacts = [
        ...config.phoneNumbers.filter(p => p.number.trim()).map(p => ({
          contact_type: 'PHONE' as const,
          contact_value: p.countryCode + p.number,
          label: p.label
        })),
        ...config.emails.filter(e => e.email.trim()).map(e => ({
          contact_type: 'EMAIL' as const,
          contact_value: e.email,
          label: e.label
        })),
        // ...config.websites.filter(w => w.url.trim()).map(w => ({
        //   contact_type: 'WEBSITE' as const,
        //   contact_value: w.url,
        //   label: w.label
        // }))
      ];

      const messageTypeMap: Record<string, 'OTP' | 'TRANSACTIONAL' | 'PROMOTIONAL'> = {
        'otp': 'OTP',
        'transactional': 'TRANSACTIONAL',
        'promotional': 'PROMOTIONAL'
      };

      const botData = {
        bot_name: config.botName,
        brand_name: config.brandName,
        short_description: config.shortDescription,
        // brand_color: config.brandColor,
        bot_logo_url: config.botLogo || '',
        banner_image_url: config.bannerImage || '',
        terms_url: config.termsOfUseUrl,
        privacy_url: config.privacyPolicyUrl,
        route_type: (config.botType === 'domestic' ? 'DOMESTIC' : 'INTERNATIONAL') as const,
        bot_type: (config.botType === 'domestic' ? 'DOMESTIC' : 'INTERNATIONAL') as const,
        message_type: messageTypeMap[config.messageType] || 'TRANSACTIONAL' as const,
        // billing_category: config.billingCategory.toUpperCase() as any,
        // // development_platform: (config.developmentPlatform === 'gsma' ? 'GSMA_API' : 'GOOGLE_API') as const,
        // // webhook_url: config.chatbotWebhook,
        // callback_url: config.callbackUrl,
        languages_supported: config.languagesSupported,
        agree_all_carriers: config.agreeToLaunch,
        status: 'DRAFT' as const,
        contacts,
      };

      const response = await rcsApi.createBot(botData);
      
      toast({ 
        title: 'Success', 
        description: 'RCS Bot configuration has been saved successfully.',
      });
      
      console.log('Bot created with ID:', response.id);
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to save configuration.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const InfoTooltip = ({ content }: { content: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 text-muted-foreground cursor-help ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Create Bot</span>
            <span className="sm:hidden">Create</span>
          </TabsTrigger>
          <TabsTrigger value="view" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">View Bots</span>
            <span className="sm:hidden">View</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <div className="flex gap-6">
            <div className="flex-1 min-w-0">
              <ScrollArea className="h-[calc(100vh-200px)]">
                <div className="space-y-6 pr-4">

                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-purple-500/10">
                      <Smartphone className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">RCS Bot Configuration</h2>
                      <p className="text-sm text-muted-foreground">Configure your RCS Business Messaging bot details</p>
                    </div>
                  </div>

                  {/* Bot Type */}
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">Bot Type <span className="text-destructive">*</span></CardTitle>
                      </div>
                      <CardDescription>
                        Carrier decides domestic/international classification.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup
                        value={config.botType}
                        onValueChange={(value: 'domestic' | 'international') => 
                          setConfig({ ...config, botType: value })
                        }
                        className="flex gap-8"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="domestic" id="domestic" />
                          <Label htmlFor="domestic">Domestic</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="international" id="international" />
                          <Label htmlFor="international">International</Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>

                  {/* Message Type */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Message Type <span className="text-destructive">*</span></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup
                        value={config.messageType}
                        onValueChange={(value: 'otp' | 'transactional' | 'promotional') => 
                          setConfig({ ...config, messageType: value })
                        }
                        className="flex gap-6 flex-wrap"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="otp" id="otp" />
                          <Label htmlFor="otp">OTP</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="transactional" id="transactional" />
                          <Label htmlFor="transactional">Transactional</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="promotional" id="promotional" />
                          <Label htmlFor="promotional">Promotional</Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>

                  {/* Billing Category */}
                  {/* <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Billing Category <span className="text-destructive">*</span></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={config.billingCategory}
                        onValueChange={(value) => setConfig({ ...config, billingCategory: value })}
                      >
                        <SelectTrigger className="w-full md:w-1/2">
                          <SelectValue placeholder="Select billing category" />
                        </SelectTrigger>
                        <SelectContent>
                          {billingCategories.map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card> */}

                  {/* Bot Name */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Bot Name <span className="text-destructive">*</span></CardTitle>
                      <CardDescription>Letters and spaces only, max 40 characters</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Input
                          value={config.botName}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || isValidText(val)) {
                              setConfig({ ...config, botName: val.slice(0, 40) });
                            }
                          }}
                          placeholder="Enter bot name"
                          maxLength={40}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {40 - config.botName.length} characters left
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Brand Name */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Brand Name <span className="text-destructive">*</span></CardTitle>
                      <CardDescription>Letters and spaces only, max 40 characters</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Input
                          value={config.brandName}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || isValidText(val)) {
                              setConfig({ ...config, brandName: val.slice(0, 40) });
                            }
                          }}
                          placeholder="Enter brand name"
                          maxLength={40}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {40 - config.brandName.length} characters left
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Bot Logo */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Bot Logo <span className="text-destructive">*</span></CardTitle>
                      <CardDescription>224px × 224px recommended</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <label 
                          htmlFor="logo-upload"
                          className={`w-32 h-32 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                            config.botLogo ? 'border-green-400 bg-green-50' : 'border-purple-300 hover:border-purple-400 bg-purple-50'
                          }`}
                        >
                          {config.botLogo ? (
                            <img src={config.botLogo} alt="preview" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-purple-400 mb-2" />
                              <span className="text-xs text-purple-500 font-medium">Upload Logo</span>
                            </>
                          )}
                        </label>
                        <input 
                          id="logo-upload" 
                          type="file" 
                          accept="image/png,image/jpeg,image/jpg" 
                          className="hidden" 
                          onChange={handleLogoUpload}
                        />
                        <div className="text-sm text-muted-foreground">
                          <p>PNG or JPG</p>
                          <p>Max 2MB</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Banner Image */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Banner Image <span className="text-destructive">*</span></CardTitle>
                      <CardDescription>1440px × 448px recommended</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-start gap-4">
                        <label 
                          htmlFor="banner-upload"
                          className={`w-64 h-24 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer transition-colors relative ${
                            config.bannerImage ? 'border-green-400 bg-green-50' : 'border-purple-300 hover:border-purple-400 bg-purple-50'
                          }`}
                        >
                          {config.bannerImage ? (
                            <img src={config.bannerImage} alt="preview" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <>
                              <Upload className="h-6 w-6 text-purple-400 mr-2" />
                              <span className="text-xs text-purple-500 font-medium">Upload Banner</span>
                            </>
                          )}
                        </label>
                        <input 
                          id="banner-upload" 
                          type="file" 
                          accept="image/png,image/jpeg,image/jpg" 
                          className="hidden" 
                          onChange={handleBannerUpload}
                        />
                        <div className="text-sm text-muted-foreground">
                          <p>PNG or JPG</p>
                          <p>Max 5MB</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Short Description */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Short Description <span className="text-destructive">*</span></CardTitle>
                      <CardDescription>Max 100 characters</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Textarea
                          value={config.shortDescription}
                          onChange={(e) => setConfig({ ...config, shortDescription: e.target.value.slice(0, 100) })}
                          placeholder="Enter a short description of your bot"
                          maxLength={100}
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground text-right">
                          {100 - config.shortDescription.length} characters left
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Brand Color */}
                  {/* <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Brand Color <span className="text-destructive">*</span></CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={config.brandColor}
                          onChange={(e) => setConfig({ ...config, brandColor: e.target.value })}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                        <Input
                          value={config.brandColor}
                          onChange={(e) => setConfig({ ...config, brandColor: e.target.value })}
                          placeholder="#7C3AED"
                          className="w-32"
                        />
                      </div>
                    </CardContent>
                  </Card> */}

                  <Separator />

                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Contact Information
                  </h3>

                  {/* Phone Numbers */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Numbers
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {config.phoneNumbers.map((phone, index) => (
                        <div key={phone.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          <div className="md:col-span-5">
                            <Label className="text-sm">{index === 0 ? 'Primary phone number *' : `Phone number ${index + 1}`}</Label>
                            <div className="flex gap-2 mt-1.5">
                              <Select
                                value={phone.countryCode}
                                onValueChange={(value) => {
                                  const updated = [...config.phoneNumbers];
                                  updated[index].countryCode = value;
                                  setConfig({ ...config, phoneNumbers: updated });
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {countryCodes.map((cc) => (
                                    <SelectItem key={cc.code} value={cc.code}>
                                      {cc.flag} {cc.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={phone.number}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^0-9]/g, '');
                                  const updated = [...config.phoneNumbers];
                                  updated[index].number = val;
                                  setConfig({ ...config, phoneNumbers: updated });
                                }}
                                placeholder="Phone number"
                                className="flex-1"
                              />
                            </div>
                          </div>
                          {/* <div className="md:col-span-5">
                            <Label className="text-sm">Label for phone number</Label>
                            <div className="mt-1.5">
                              <Input
                                value={phone.label}
                                onChange={(e) => {
                                  const updated = [...config.phoneNumbers];
                                  updated[index].label = e.target.value.slice(0, 25);
                                  setConfig({ ...config, phoneNumbers: updated });
                                }}
                                placeholder="e.g. Support"
                                maxLength={25}
                              />
                              <p className="text-xs text-muted-foreground text-right mt-1">
                                {25 - phone.label.length} characters left
                              </p>
                            </div>
                          </div> */}
                          <div className="md:col-span-2 flex items-end pb-6">
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removePhoneNumber(phone.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button variant="link" onClick={addPhoneNumber} className="text-primary p-0 h-auto">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Phone Number
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Email Addresses */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email Addresses
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {config.emails.map((email, index) => (
                        <div key={email.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          <div className="md:col-span-5">
                            <Label className="text-sm">{index === 0 ? 'Primary email id *' : `Email ${index + 1}`}</Label>
                            <Input
                              value={email.email}
                              onChange={(e) => {
                                const updated = [...config.emails];
                                updated[index].email = e.target.value;
                                setConfig({ ...config, emails: updated });
                              }}
                              placeholder="abc@xyz.com"
                              className="mt-1.5"
                            />
                          </div>
                          {/* <div className="md:col-span-5">
                            <Label className="text-sm">Label for email id</Label>
                            <div className="mt-1.5">
                              <Input
                                value={email.label}
                                onChange={(e) => {
                                  const updated = [...config.emails];
                                  updated[index].label = e.target.value.slice(0, 25);
                                  setConfig({ ...config, emails: updated });
                                }}
                                placeholder="e.g. Support"
                                maxLength={25}
                              />
                              <p className="text-xs text-muted-foreground text-right mt-1">
                                {25 - email.label.length} characters left
                              </p>
                            </div>
                          </div> */}
                          <div className="md:col-span-2 flex items-end pb-6">
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeEmail(email.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button variant="link" onClick={addEmail} className="text-primary p-0 h-auto">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Email ID
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Websites */}
                  {/* <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Websites
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {config.websites.map((website, index) => (
                        <div key={website.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                          <div className="md:col-span-5">
                            <Label className="text-sm">{index === 0 ? 'Primary website *' : `Website ${index + 1}`}</Label>
                            <Input
                              value={website.url}
                              onChange={(e) => {
                                const updated = [...config.websites];
                                updated[index].url = e.target.value;
                                setConfig({ ...config, websites: updated });
                              }}
                              placeholder="https://"
                              className="mt-1.5"
                            />
                          </div>
                          <div className="md:col-span-5">
                            <Label className="text-sm">Label for website</Label>
                            <div className="mt-1.5">
                              <Input
                                value={website.label}
                                onChange={(e) => {
                                  const updated = [...config.websites];
                                  updated[index].label = e.target.value.slice(0, 25);
                                  setConfig({ ...config, websites: updated });
                                }}
                                placeholder="e.g. Main Website"
                                maxLength={25}
                              />
                              <p className="text-xs text-muted-foreground text-right mt-1">
                                {25 - website.label.length} characters left
                              </p>
                            </div>
                          </div>
                          <div className="md:col-span-2 flex items-end pb-6">
                            {index > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeWebsite(website.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      <Button variant="link" onClick={addWebsite} className="text-primary p-0 h-auto">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Website
                      </Button>
                    </CardContent>
                  </Card> */}

                  <Separator />

                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Legal & Compliance
                  </h3>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Terms of Use URL <span className="text-destructive ml-1">*</span>
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={config.termsOfUseUrl}
                        onChange={(e) => setConfig({ ...config, termsOfUseUrl: e.target.value })}
                        placeholder="https://example.com/terms"
                      />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Shield className="h-4 w-4" />
                          Privacy Policy URL <span className="text-destructive ml-1">*</span>
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={config.privacyPolicyUrl}
                        onChange={(e) => setConfig({ ...config, privacyPolicyUrl: e.target.value })}
                        placeholder="https://example.com/privacy"
                      />
                    </CardContent>
                  </Card>

                  <Separator />

                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Webhook className="h-5 w-5" />
                    Technical Configuration
                  </h3>

                  {/* <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <CardTitle className="text-base">Development Platform <span className="text-destructive">*</span></CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={config.developmentPlatform}
                        onValueChange={(value) => setConfig({ ...config, developmentPlatform: value })}
                      >
                        <SelectTrigger className="w-full md:w-1/2">
                          <SelectValue placeholder="Development platform" />
                        </SelectTrigger>
                        <SelectContent>
                          {developmentPlatforms.map((platform) => (
                            <SelectItem key={platform.value} value={platform.value}>
                              {platform.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card> */}

                  {/* <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Webhook className="h-4 w-4" />
                        Chatbot Webhook <span className="text-destructive ml-1">*</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={config.chatbotWebhook}
                        onChange={(e) => setConfig({ ...config, chatbotWebhook: e.target.value })}
                        placeholder="https://your-server.com/webhook"
                      />
                    </CardContent>
                  </Card> */}

                  {/* <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Callback URL</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={config.callbackUrl}
                        onChange={(e) => setConfig({ ...config, callbackUrl: e.target.value })}
                        placeholder="https://your-server.com/callback"
                      />
                    </CardContent>
                  </Card> */}

                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Languages className="h-4 w-4" />
                          Languages Supported <span className="text-destructive ml-1">*</span>
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Input
                        value={config.languagesSupported}
                        onChange={(e) => setConfig({ ...config, languagesSupported: e.target.value })}
                        placeholder="English, Hindi, Tamil..."
                      />
                    </CardContent>
                  </Card>

                  <Separator />

                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="agree"
                          checked={config.agreeToLaunch}
                          onCheckedChange={(checked) => setConfig({ ...config, agreeToLaunch: checked as boolean })}
                        />
                        <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                          I agree to Submit the bot.
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end gap-3 pb-6">
                    <Button variant="outline" disabled={isLoading}>Back</Button>
                    <Button 
                      onClick={handleSubmit} 
                      disabled={isLoading}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {isLoading ? 'Saving...' : 'Submit'}
                    </Button>
                  </div>

                </div>
              </ScrollArea>
            </div>

            <div className="hidden lg:block w-[320px] flex-shrink-0">
              <RCSPreview
                botName={config.botName}
                brandName={config.brandName}
                shortDescription={config.shortDescription}
                brandColor={config.brandColor}
                botLogo={config.botLogo}
                bannerImage={config.bannerImage}
                phoneNumber={config.phoneNumbers[0]?.number}
                email={config.emails[0]?.email}
                // website={config.websites[0]?.url}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="view" className="space-y-4">
          <RCSBotsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}