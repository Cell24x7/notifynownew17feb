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
  Image as ImageIcon,
  ShieldCheck
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
  botName: string;
  brandName: string;
  shortDescription: string;
  webhookUrl: string;
  industryType: string;
  address: string;
  phoneNumbers: PhoneEntry[];
  emails: EmailEntry[];
  websiteUrl: string;
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
  languagesSupported: string;
  agreeToLaunch: boolean;
  botLogoFile: File | null;
  botLogoUrl: string | null;
  bannerFile: File | null;
  bannerUrl: string | null;
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
    botName: '',
    brandName: '',
    shortDescription: '',
    webhookUrl: '',
    industryType: 'Telecom',
    address: '',
    phoneNumbers: [{ id: '1', countryCode: '+91', number: '' }],
    emails: [{ id: '1', email: '' }],
    websiteUrl: '',
    termsOfUseUrl: '',
    privacyPolicyUrl: '',
    languagesSupported: 'English',
    agreeToLaunch: false,
    botLogoFile: null,
    botLogoUrl: null,
    bannerFile: null,
    bannerUrl: null,
  });

  const isValidText = (text: string) => /^[a-zA-Z\s]*$/.test(text);

  const validateImage = (file: File, type: 'logo' | 'banner'): Promise<boolean> => {
    return new Promise((resolve) => {
      const maxSize = type === 'logo' ? 1024 * 1024 : 2 * 1024 * 1024; // 1MB or 2MB
      const expectedWidth = type === 'logo' ? 224 : 1440;
      const expectedHeight = type === 'logo' ? 224 : 448;

      if (file.size > maxSize) {
        toast({ 
          title: "File Too Large", 
          description: `Max size for ${type} is ${type === 'logo' ? '1MB' : '2MB'}.`, 
          variant: "destructive" 
        });
        resolve(false);
        return;
      }

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
          resolve(false);
        } else {
          resolve(true);
        }
      };
      img.onerror = () => {
        toast({ title: "Error", description: "Invalid image file.", variant: "destructive" });
        resolve(false);
      };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValid = await validateImage(file, type);
    if (!isValid) {
      e.target.value = ''; // Reset input
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'logo') {
        setConfig({ ...config, botLogoFile: file, botLogoUrl: event.target?.result as string });
      } else {
        setConfig({ ...config, bannerFile: file, bannerUrl: event.target?.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const addPhoneNumber = () => {
    setConfig({
      ...config,
      phoneNumbers: [...config.phoneNumbers, { id: Date.now().toString(), countryCode: '+91', number: '' }],
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
      emails: [...config.emails, { id: Date.now().toString(), email: '' }],
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

  const handleSubmit = async () => {
    // Basic validation
    if (!config.botName || !config.brandName || !config.botLogoFile) {
      toast({ title: 'Missing Info', description: 'Bot Name, Brand Name, and Logo are required.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');

      // 1. Submit Bot Details (Step 1)
      const creationData: any = {
        data: {
          bot: {
            privacy_url: config.privacyPolicyUrl,
            term_and_condition_url: config.termsOfUseUrl,
            platform: 'GSMA API',
            phone_list: config.phoneNumbers.filter(p => p.number).map(p => ({ value: p.countryCode + p.number, label: 'Support' })),
            email_list: config.emails.filter(e => e.email).map(e => ({ value: e.email, label: 'Support' })),
            website_list: config.websiteUrl ? [{ value: config.websiteUrl, label: 'Website' }] : []
          },
          rcs_bot: {
            lang_supported: config.languagesSupported,
            agent_msg_type: config.messageType === 'OTP' ? 'OTP' : 
                             config.messageType === 'TRANSACTIONAL' ? 'Transactional' : 
                             config.messageType === 'PROMOTIONAL' ? 'Promotional' : config.messageType,
            billing_category: 'Non_Conversational',
            webhook_url: config.webhookUrl
          },
          bot_desc: [{ bot_name: config.botName, bot_summary: config.shortDescription }],
          agent_color: '#000000'
        },
        brand_details: { 
          brand_name: config.brandName,
          brand_address: config.address,
          brand_industry: config.industryType
        },
        carrier_details: { carrier_list: [97, 77, 98], global_reach: false },
        region: config.botType === 'domestic' ? 'India' : 'International'
      };

      const formData = new FormData();
      formData.append('creation_data', JSON.stringify(creationData));
      
      if (config.botLogoFile) {
        formData.append('botLogoFile', config.botLogoFile);
      }
      if (config.bannerFile) {
        formData.append('bannerFile', config.bannerFile);
      }

      const submitRes = await axios.post(`${API_URL}/submit`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (!submitRes.data.success) throw new Error(submitRes.data.message || 'Step 1 failed');

      const { bot_id, brand_id } = submitRes.data;

      // 2. Submit Verification (Step 2)
      const verifyData = {
        bot_id,
        webhook_url: config.webhookUrl,
        trigger_action: 'Initial contact via campaign or opt-in.',
        opt_in_message: 'User opt-in via portal.',
        video_url: '',
        bot_access_instructions: 'Standard access.',
        bot_interaction_types: 'Promotional/Transactional.',
        is_carrier_edited: true,
        carrier_list: [97, 77, 98],
        is_opt_out_by_platform: true,
        opt_out_keyword: 'STOP',
        opt_out_message: 'Unsubscribed successfully.',
        revoke_opt_out: 'START',
        revoke_opt_out_message: 'Resubscribed successfully.',
        is_conversational_supported: false,
        brand_details: {
          brand_name: config.brandName,
          brand_id,
          industry_id: 5,
          industry_type: config.industryType,
          address: {
            address_line_1: config.address,
            address_line_2: '',
            city: config.address.split(',')[0] || '',
            state: config.address.split(',')[1] || '',
            zip_code: '',
            country_id: 1
          },
          brand_emails_json: [{
            contact_first_name: 'Admin',
            contact_last_name: 'User',
            contact_designation: 'Owner',
            email: config.emails[0].email,
            mobile: config.phoneNumbers[0].number
          }],
          brand_website: ''
        }
      };

      const verifyFormData = new FormData();
      verifyFormData.append('data', JSON.stringify(verifyData));
      if (config.botLogoFile) verifyFormData.append('brandLogoImage', config.botLogoFile);
      if (config.bannerFile) verifyFormData.append('screenImages', config.bannerFile);

      await axios.post(`${API_URL}/verify`, verifyFormData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      toast({ title: 'Success', description: 'RCS Bot created and submitted for verification!' });
      // Reset or redirect?
    } catch (error: any) {
      console.error('Submission Error:', error);
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to onboard bot.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>Create Bot</span>
          </TabsTrigger>
          <TabsTrigger value="view" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span>View Bots</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Form Column */}
            <div className="flex-1 min-w-0 order-2 lg:order-1">
              <ScrollArea className="h-[calc(100vh-280px)] pr-4">
                <div className="space-y-6">
                  {/* Basic Branding */}
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        Brand & Bot Identity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Brand Name *</Label>
                          <Input 
                            placeholder="e.g. Acme Corp" 
                            value={config.brandName}
                            onChange={(e) => setConfig({...config, brandName: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Bot Name *</Label>
                          <Input 
                            placeholder="e.g. Acme Support" 
                            value={config.botName}
                            onChange={(e) => setConfig({...config, botName: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Short Description</Label>
                        <Textarea 
                          placeholder="Brief summary of your bot..." 
                          value={config.shortDescription}
                          onChange={(e) => setConfig({...config, shortDescription: e.target.value})}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Classification */}
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        Classification
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-3">
                        <Label>Bot Type</Label>
                        <RadioGroup 
                          value={config.botType} 
                          onValueChange={(val: any) => setConfig({...config, botType: val})}
                          className="flex gap-6"
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
                      </div>
                      <div className="space-y-3">
                        <Label>Default Message Type</Label>
                        <RadioGroup 
                          value={config.messageType} 
                          onValueChange={(val: any) => setConfig({...config, messageType: val})}
                          className="flex gap-6 flex-wrap"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="OTP" id="otp" />
                            <Label htmlFor="otp">OTP</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="TRANSACTIONAL" id="trans" />
                            <Label htmlFor="trans">Transactional</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="PROMOTIONAL" id="promo" />
                            <Label htmlFor="promo">Promotional</Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Media */}
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Media Assets
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="flex justify-between items-center">
                          <span>Bot Logo *</span>
                          <span className="text-[10px] text-muted-foreground font-normal">224x224 px | Max 1MB</span>
                        </Label>
                        <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-xl transition-all hover:border-primary/50">
                          {config.botLogoUrl ? (
                            <img src={config.botLogoUrl} className="w-24 h-24 rounded-lg object-cover shadow-md" alt="Logo" />
                          ) : (
                            <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                              No Logo
                            </div>
                          )}
                          <Button variant="outline" size="sm" className="relative cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" /> Upload Logo
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'logo')} />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="flex justify-between items-center">
                          <span>Banner Image</span>
                          <span className="text-[10px] text-muted-foreground font-normal">1440x448 px | Max 2MB</span>
                        </Label>
                        <div className="flex flex-col items-center gap-4 p-4 border-2 border-dashed rounded-xl transition-all hover:border-primary/50">
                          {config.bannerUrl ? (
                            <img src={config.bannerUrl} className="w-full h-24 rounded-lg object-cover shadow-md" alt="Banner" />
                          ) : (
                            <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                              No Banner
                            </div>
                          )}
                          <Button variant="outline" size="sm" className="relative cursor-pointer">
                            <Upload className="h-4 w-4 mr-2" /> Upload Banner
                            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleFileUpload(e, 'banner')} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Technical & Verification */}
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Verification & Tech Specs
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Webhook URL</Label>
                          <Input 
                            placeholder="https://..." 
                            value={config.webhookUrl}
                            onChange={(e) => setConfig({...config, webhookUrl: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Website URL</Label>
                          <Input 
                            placeholder="https://yourwebsite.com" 
                            value={config.websiteUrl}
                            onChange={(e) => setConfig({...config, websiteUrl: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Industry Type</Label>
                          <Select 
                            value={config.industryType} 
                            onValueChange={(val) => setConfig({...config, industryType: val})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Telecom">Telecom</SelectItem>
                              <SelectItem value="Retail">Retail</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="Healthcare">Healthcare</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Brand Address</Label>
                        <Input 
                          placeholder="City, State, Country" 
                          value={config.address}
                          onChange={(e) => setConfig({...config, address: e.target.value})}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Contacts */}
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary" />
                        Support Contacts
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        {config.phoneNumbers.map((phone, idx) => (
                          <div key={phone.id} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-2">
                              {idx === 0 && <Label>Phone Numbers *</Label>}
                              <div className="flex gap-2">
                                <Select value={phone.countryCode} onValueChange={(val) => {
                                  const list = [...config.phoneNumbers];
                                  list[idx].countryCode = val;
                                  setConfig({...config, phoneNumbers: list});
                                }}>
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {countryCodes.map(cc => <SelectItem key={cc.code} value={cc.code}>{cc.flag} {cc.code}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Input 
                                  placeholder="Number" 
                                  value={phone.number}
                                  onChange={(e) => {
                                    const list = [...config.phoneNumbers];
                                    list[idx].number = e.target.value;
                                    setConfig({...config, phoneNumbers: list});
                                  }}
                                />
                              </div>
                            </div>
                            <Button variant="ghost" size="icon" className="text-destructive mb-0.5" onClick={() => removePhoneNumber(phone.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addPhoneNumber} className="w-full border-dashed">
                          <Plus className="h-4 w-4 mr-2" /> Add Phone
                        </Button>
                      </div>

                      <div className="space-y-4">
                        {config.emails.map((email, idx) => (
                          <div key={email.id} className="flex gap-2 items-end">
                            <div className="flex-1 space-y-2">
                              {idx === 0 && <Label>Emails *</Label>}
                              <Input 
                                placeholder="Email" 
                                value={email.email}
                                onChange={(e) => {
                                  const list = [...config.emails];
                                  list[idx].email = e.target.value;
                                  setConfig({...config, emails: list});
                                }}
                              />
                            </div>
                            <Button variant="ghost" size="icon" className="text-destructive mb-0.5" onClick={() => removeEmail(email.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addEmail} className="w-full border-dashed">
                          <Plus className="h-4 w-4 mr-2" /> Add Email
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Legal */}
                  <Card className="card-elevated">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Legal & Compliance
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Terms URL *</Label>
                          <Input 
                            placeholder="https://..." 
                            value={config.termsOfUseUrl}
                            onChange={(e) => setConfig({...config, termsOfUseUrl: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Privacy URL *</Label>
                          <Input 
                            placeholder="https://..." 
                            value={config.privacyPolicyUrl}
                            onChange={(e) => setConfig({...config, privacyPolicyUrl: e.target.value})}
                          />
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 pt-2">
                        <Checkbox 
                          id="agree" 
                          checked={config.agreeToLaunch}
                          onCheckedChange={(val: boolean) => setConfig({...config, agreeToLaunch: val})}
                        />
                        <Label htmlFor="agree" className="text-sm font-normal cursor-pointer">
                          I agree to launch the bot on all registered carriers.
                        </Label>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="pb-10 pt-4">
                    <Button 
                      className="w-full h-12 text-lg shadow-lg shadow-primary/20" 
                      onClick={handleSubmit}
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                      Onboard Bot Now
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </div>

            {/* Preview Column */}
            <div className="hidden lg:block w-[340px] shrink-0 order-1 lg:order-2">
              <RCSPreview 
                botName={config.botName}
                brandName={config.brandName}
                shortDescription={config.shortDescription}
                botLogo={config.botLogoUrl}
                bannerImage={config.bannerUrl}
                phoneNumber={config.phoneNumbers[0].number}
                email={config.emails[0].email}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="view">
          <RCSBotsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}