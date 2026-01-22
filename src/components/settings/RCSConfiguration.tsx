// import { useState } from 'react';
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Label } from '@/components/ui/label';
// import { Textarea } from '@/components/ui/textarea';
// import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { Checkbox } from '@/components/ui/checkbox';
// import { Badge } from '@/components/ui/badge';
// import { Separator } from '@/components/ui/separator';
// import { ScrollArea } from '@/components/ui/scroll-area';
// import { useToast } from '@/hooks/use-toast';
// import { 
//   Smartphone, 
//   Upload, 
//   Plus, 
//   Trash2, 
//   Globe, 
//   Mail, 
//   Phone, 
//   FileText, 
//   Shield, 
//   Webhook, 
//   Languages,
//   Info
// } from 'lucide-react';
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from '@/components/ui/tooltip';
// import { RCSPreview } from './RCSPreview';

// interface PhoneEntry {
//   id: string;
//   countryCode: string;
//   number: string;
//   label: string;
// }

// interface EmailEntry {
//   id: string;
//   email: string;
//   label: string;
// }

// interface WebsiteEntry {
//   id: string;
//   url: string;
//   label: string;
// }

// interface RCSConfig {
//   botType: 'domestic' | 'international';
//   messageType: 'otp' | 'transactional' | 'promotional';
//   billingCategory: string;
//   botName: string;
//   brandName: string;
//   botLogo: string | null;
//   bannerImage: string | null;
//   shortDescription: string;
//   brandColor: string;
//   phoneNumbers: PhoneEntry[];
//   emails: EmailEntry[];
//   websites: WebsiteEntry[];
//   termsOfUseUrl: string;
//   privacyPolicyUrl: string;
//   developmentPlatform: string;
//   chatbotWebhook: string;
//   callbackUrl: string;
//   languagesSupported: string;
//   agreeToLaunch: boolean;
// }

// const countryCodes = [
//   { code: '+91', country: 'IN', flag: '🇮🇳' },
//   { code: '+1', country: 'US', flag: '🇺🇸' },
//   { code: '+44', country: 'UK', flag: '🇬🇧' },
//   { code: '+971', country: 'AE', flag: '🇦🇪' },
//   { code: '+65', country: 'SG', flag: '🇸🇬' },
//   { code: '+61', country: 'AU', flag: '🇦🇺' },
// ];

// const billingCategories = [
//   'Conversational',
//   'Single Message',
//   'Basic Message',
// ];

// const developmentPlatforms = [
//   { value: 'gsma', label: 'GSMA API' },
//   { value: 'google', label: 'Google styled API' },
// ];

// export function RCSConfiguration() {
//   const { toast } = useToast();
//   const [config, setConfig] = useState<RCSConfig>({
//     botType: 'domestic',
//     messageType: 'otp',
//     billingCategory: 'Conversational',
//     botName: '',
//     brandName: '',
//     botLogo: null,
//     bannerImage: null,
//     shortDescription: '',
//     brandColor: '#7C3AED',
//     phoneNumbers: [{ id: '1', countryCode: '+91', number: '', label: '' }],
//     emails: [{ id: '1', email: '', label: '' }],
//     websites: [{ id: '1', url: '', label: '' }],
//     termsOfUseUrl: '',
//     privacyPolicyUrl: '',
//     developmentPlatform: '',
//     chatbotWebhook: '',
//     callbackUrl: '',
//     languagesSupported: '',
//     agreeToLaunch: false,
//   });

//   const handleLogoUpload = () => {
//     toast({ title: 'Logo Upload', description: 'Logo upload functionality will be integrated with File Manager.' });
//   };

//   const handleBannerUpload = () => {
//     toast({ title: 'Banner Upload', description: 'Banner upload functionality will be integrated with File Manager.' });
//   };

//   const addPhoneNumber = () => {
//     setConfig({
//       ...config,
//       phoneNumbers: [...config.phoneNumbers, { id: Date.now().toString(), countryCode: '+91', number: '', label: '' }],
//     });
//   };

//   const removePhoneNumber = (id: string) => {
//     if (config.phoneNumbers.length > 1) {
//       setConfig({
//         ...config,
//         phoneNumbers: config.phoneNumbers.filter(p => p.id !== id),
//       });
//     }
//   };

//   const addEmail = () => {
//     setConfig({
//       ...config,
//       emails: [...config.emails, { id: Date.now().toString(), email: '', label: '' }],
//     });
//   };

//   const removeEmail = (id: string) => {
//     if (config.emails.length > 1) {
//       setConfig({
//         ...config,
//         emails: config.emails.filter(e => e.id !== id),
//       });
//     }
//   };

//   const addWebsite = () => {
//     setConfig({
//       ...config,
//       websites: [...config.websites, { id: Date.now().toString(), url: '', label: '' }],
//     });
//   };

//   const removeWebsite = (id: string) => {
//     if (config.websites.length > 1) {
//       setConfig({
//         ...config,
//         websites: config.websites.filter(w => w.id !== id),
//       });
//     }
//   };

//   const handleSubmit = () => {
//     if (!config.botName || !config.brandName || !config.shortDescription) {
//       toast({ 
//         title: 'Validation Error', 
//         description: 'Please fill in all required fields.',
//         variant: 'destructive'
//       });
//       return;
//     }
//     if (!config.agreeToLaunch) {
//       toast({ 
//         title: 'Agreement Required', 
//         description: 'Please agree to launch the bot on all carriers.',
//         variant: 'destructive'
//       });
//       return;
//     }
//     toast({ title: 'Configuration Saved', description: 'RCS Bot configuration has been submitted successfully.' });
//   };

//   const InfoTooltip = ({ content }: { content: string }) => (
//     <TooltipProvider>
//       <Tooltip>
//         <TooltipTrigger asChild>
//           <Info className="h-4 w-4 text-muted-foreground cursor-help ml-1" />
//         </TooltipTrigger>
//         <TooltipContent className="max-w-xs">
//           <p>{content}</p>
//         </TooltipContent>
//       </Tooltip>
//     </TooltipProvider>
//   );

//   return (
//     <div className="flex gap-6">
//       {/* Configuration Form */}
//       <div className="flex-1 min-w-0">
//         <ScrollArea className="h-[calc(100vh-200px)]">
//           <div className="space-y-6 pr-4">
//             {/* Header */}
//             <div className="flex items-center gap-3">
//               <div className="p-3 rounded-xl bg-purple-500/10">
//                 <Smartphone className="h-6 w-6 text-purple-500" />
//               </div>
//               <div>
//                 <h2 className="text-xl font-semibold">RCS Bot Configuration</h2>
//                 <p className="text-sm text-muted-foreground">Configure your RCS Business Messaging bot details</p>
//               </div>
//             </div>

//         {/* Bot Type */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center gap-2">
//               <CardTitle className="text-base">Bot Type</CardTitle>
//               <Badge variant="outline" className="text-primary">
//                 {config.botType === 'domestic' ? 'Domestic' : 'International'}
//               </Badge>
//             </div>
//             <CardDescription>
//               Please note that it is the sole discretion of the carrier to mark a bot as domestic or international. 
//               In case the carrier marks the bot as international, you will need to onboard the bot from your international account.
//             </CardDescription>
//           </CardHeader>
//         </Card>

//         {/* Bot Message Type */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base">Bot Message Type</CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <RadioGroup
//               value={config.messageType}
//               onValueChange={(value: 'otp' | 'transactional' | 'promotional') => 
//                 setConfig({ ...config, messageType: value })
//               }
//               className="flex gap-6"
//             >
//               <div className="flex items-center space-x-2">
//                 <RadioGroupItem value="otp" id="otp" />
//                 <Label htmlFor="otp" className="flex items-center cursor-pointer">
//                   OTP
//                   <InfoTooltip content="One-Time Password messages for authentication" />
//                 </Label>
//               </div>
//               <div className="flex items-center space-x-2">
//                 <RadioGroupItem value="transactional" id="transactional" />
//                 <Label htmlFor="transactional" className="flex items-center cursor-pointer">
//                   Transactional
//                   <InfoTooltip content="Order updates, booking confirmations, etc." />
//                 </Label>
//               </div>
//               <div className="flex items-center space-x-2">
//                 <RadioGroupItem value="promotional" id="promotional" />
//                 <Label htmlFor="promotional" className="flex items-center cursor-pointer">
//                   Promotional
//                   <InfoTooltip content="Marketing and promotional messages" />
//                 </Label>
//               </div>
//             </RadioGroup>
//           </CardContent>
//         </Card>

//         {/* Bot Billing Category */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base">Bot Billing Category</CardTitle>
//               <span className="text-destructive ml-1">*</span>
//               <InfoTooltip content="Select the billing category for your chatbot" />
//             </div>
//             <CardDescription>Select the billing category for your chatbot.</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Select
//               value={config.billingCategory}
//               onValueChange={(value) => setConfig({ ...config, billingCategory: value })}
//             >
//               <SelectTrigger className="w-full md:w-1/2">
//                 <SelectValue placeholder="Select billing category" />
//               </SelectTrigger>
//               <SelectContent>
//                 {billingCategories.map((category) => (
//                   <SelectItem key={category} value={category}>
//                     {category}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </CardContent>
//         </Card>

//         {/* Bot Name */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base">Bot Name</CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//             <CardDescription>
//               Enter the name of the chatbot that the user will see at the top of the message thread (40 chars. max)
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2">
//               <Input
//                 value={config.botName}
//                 onChange={(e) => setConfig({ ...config, botName: e.target.value.slice(0, 40) })}
//                 placeholder="Enter bot name"
//                 maxLength={40}
//               />
//               <p className="text-xs text-muted-foreground text-right">
//                 {40 - config.botName.length} characters left
//               </p>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Brand Name */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base">Brand Name</CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//             <CardDescription>
//               Enter the brand name with which your chatbot will be associated.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2">
//               <Input
//                 value={config.brandName}
//                 onChange={(e) => setConfig({ ...config, brandName: e.target.value.slice(0, 100) })}
//                 placeholder="Enter brand name"
//                 maxLength={100}
//               />
//               <p className="text-xs text-muted-foreground text-right">
//                 {100 - config.brandName.length} characters left
//               </p>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Bot Logo */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base">Bot Logo</CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//             <CardDescription>
//               Provide a logo for your bot that will be displayed in connection with the bot's name.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="flex items-start gap-4">
//               <div 
//                 onClick={handleLogoUpload}
//                 className="w-32 h-32 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 transition-colors"
//               >
//                 <Upload className="h-8 w-8 text-purple-400 mb-2" />
//                 <span className="text-xs text-purple-500 font-medium">Upload</span>
//               </div>
//               <div className="text-sm text-muted-foreground">
//                 <p className="font-medium">224px × 224px</p>
//                 <p>Square logo image</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Banner Image */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base">Banner Image</CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//             <CardDescription>
//               Provide a brand image for your bot that will be displayed in the bot's 'Info & options' screen.
//               Note: Your logo will be overlaid on the Banner Image (bottom centre) so be careful with your design.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="flex items-start gap-4">
//               <div 
//                 onClick={handleBannerUpload}
//                 className="w-64 h-24 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 transition-colors relative overflow-hidden"
//               >
//                 <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-purple-300/50" />
//                 <Upload className="h-6 w-6 text-purple-400 mb-1" />
//                 <span className="text-xs text-purple-500 font-medium">Upload</span>
//               </div>
//               <div className="text-sm text-muted-foreground">
//                 <p className="font-medium">1440px × 448px</p>
//                 <p>Banner with logo overlay area</p>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Short Description */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base">Short Description</CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2">
//               <Textarea
//                 value={config.shortDescription}
//                 onChange={(e) => setConfig({ ...config, shortDescription: e.target.value.slice(0, 100) })}
//                 placeholder="Enter a short description of your bot"
//                 maxLength={100}
//                 rows={3}
//               />
//               <p className="text-xs text-muted-foreground text-right">
//                 {100 - config.shortDescription.length} characters left
//               </p>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Brand Color */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base">Brand Color</CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//             <CardDescription>
//               Specify a color for your agent with a minimum 4.5 : 1 contrast ratio relative to white.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="flex items-center gap-3">
//               <input
//                 type="color"
//                 value={config.brandColor}
//                 onChange={(e) => setConfig({ ...config, brandColor: e.target.value })}
//                 className="w-12 h-10 rounded border cursor-pointer"
//               />
//               <Input
//                 value={config.brandColor}
//                 onChange={(e) => setConfig({ ...config, brandColor: e.target.value })}
//                 placeholder="#7C3AED"
//                 className="w-32"
//               />
//             </div>
//           </CardContent>
//         </Card>

//         <Separator />

//         {/* Contact Information */}
//         <h3 className="text-lg font-semibold flex items-center gap-2">
//           <Phone className="h-5 w-5" />
//           Contact Information
//         </h3>

//         {/* Phone Numbers */}
//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-base flex items-center gap-2">
//               <Phone className="h-4 w-4" />
//               Phone Numbers
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {config.phoneNumbers.map((phone, index) => (
//               <div key={phone.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
//                 <div className="md:col-span-5">
//                   <Label className="text-sm">{index === 0 ? 'Primary phone number' : `Phone number ${index + 1}`}</Label>
//                   <div className="flex gap-2 mt-1.5">
//                     <Select
//                       value={phone.countryCode}
//                       onValueChange={(value) => {
//                         const updated = [...config.phoneNumbers];
//                         updated[index].countryCode = value;
//                         setConfig({ ...config, phoneNumbers: updated });
//                       }}
//                     >
//                       <SelectTrigger className="w-24">
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         {countryCodes.map((cc) => (
//                           <SelectItem key={cc.code} value={cc.code}>
//                             {cc.flag} {cc.code}
//                           </SelectItem>
//                         ))}
//                       </SelectContent>
//                     </Select>
//                     <Input
//                       value={phone.number}
//                       onChange={(e) => {
//                         const updated = [...config.phoneNumbers];
//                         updated[index].number = e.target.value;
//                         setConfig({ ...config, phoneNumbers: updated });
//                       }}
//                       placeholder="Phone number"
//                       className="flex-1"
//                     />
//                   </div>
//                 </div>
//                 <div className="md:col-span-5">
//                   <Label className="text-sm">Label for phone number</Label>
//                   <div className="mt-1.5">
//                     <Input
//                       value={phone.label}
//                       onChange={(e) => {
//                         const updated = [...config.phoneNumbers];
//                         updated[index].label = e.target.value.slice(0, 25);
//                         setConfig({ ...config, phoneNumbers: updated });
//                       }}
//                       placeholder="e.g. Support"
//                       maxLength={25}
//                     />
//                     <p className="text-xs text-muted-foreground text-right mt-1">
//                       {25 - phone.label.length} characters left
//                     </p>
//                   </div>
//                 </div>
//                 <div className="md:col-span-2 flex items-end pb-6">
//                   {index > 0 && (
//                     <Button
//                       variant="ghost"
//                       size="icon"
//                       onClick={() => removePhoneNumber(phone.id)}
//                       className="text-destructive hover:text-destructive"
//                     >
//                       <Trash2 className="h-4 w-4" />
//                     </Button>
//                   )}
//                 </div>
//               </div>
//             ))}
//             <Button variant="link" onClick={addPhoneNumber} className="text-primary p-0 h-auto">
//               <Plus className="h-4 w-4 mr-1" />
//               Add Phone Number
//             </Button>
//           </CardContent>
//         </Card>

//         {/* Email Addresses */}
//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-base flex items-center gap-2">
//               <Mail className="h-4 w-4" />
//               Email Addresses
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {config.emails.map((email, index) => (
//               <div key={email.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
//                 <div className="md:col-span-5">
//                   <Label className="text-sm">{index === 0 ? 'Primary email id' : `Email ${index + 1}`}</Label>
//                   <Input
//                     value={email.email}
//                     onChange={(e) => {
//                       const updated = [...config.emails];
//                       updated[index].email = e.target.value;
//                       setConfig({ ...config, emails: updated });
//                     }}
//                     placeholder="abc@xyz.com"
//                     className="mt-1.5"
//                   />
//                 </div>
//                 <div className="md:col-span-5">
//                   <Label className="text-sm">Label for email id</Label>
//                   <div className="mt-1.5">
//                     <Input
//                       value={email.label}
//                       onChange={(e) => {
//                         const updated = [...config.emails];
//                         updated[index].label = e.target.value.slice(0, 25);
//                         setConfig({ ...config, emails: updated });
//                       }}
//                       placeholder="e.g. Support"
//                       maxLength={25}
//                     />
//                     <p className="text-xs text-muted-foreground text-right mt-1">
//                       {25 - email.label.length} characters left
//                     </p>
//                   </div>
//                 </div>
//                 <div className="md:col-span-2 flex items-end pb-6">
//                   {index > 0 && (
//                     <Button
//                       variant="ghost"
//                       size="icon"
//                       onClick={() => removeEmail(email.id)}
//                       className="text-destructive hover:text-destructive"
//                     >
//                       <Trash2 className="h-4 w-4" />
//                     </Button>
//                   )}
//                 </div>
//               </div>
//             ))}
//             <Button variant="link" onClick={addEmail} className="text-primary p-0 h-auto">
//               <Plus className="h-4 w-4 mr-1" />
//               Add Email ID
//             </Button>
//           </CardContent>
//         </Card>

//         {/* Websites */}
//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-base flex items-center gap-2">
//               <Globe className="h-4 w-4" />
//               Websites
//             </CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             {config.websites.map((website, index) => (
//               <div key={website.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
//                 <div className="md:col-span-5">
//                   <Label className="text-sm">{index === 0 ? 'Primary website' : `Website ${index + 1}`}</Label>
//                   <Input
//                     value={website.url}
//                     onChange={(e) => {
//                       const updated = [...config.websites];
//                       updated[index].url = e.target.value;
//                       setConfig({ ...config, websites: updated });
//                     }}
//                     placeholder="https://"
//                     className="mt-1.5"
//                   />
//                 </div>
//                 <div className="md:col-span-5">
//                   <Label className="text-sm">Label for website</Label>
//                   <div className="mt-1.5">
//                     <Input
//                       value={website.label}
//                       onChange={(e) => {
//                         const updated = [...config.websites];
//                         updated[index].label = e.target.value.slice(0, 25);
//                         setConfig({ ...config, websites: updated });
//                       }}
//                       placeholder="e.g. Main Website"
//                       maxLength={25}
//                     />
//                     <p className="text-xs text-muted-foreground text-right mt-1">
//                       {25 - website.label.length} characters left
//                     </p>
//                   </div>
//                 </div>
//                 <div className="md:col-span-2 flex items-end pb-6">
//                   {index > 0 && (
//                     <Button
//                       variant="ghost"
//                       size="icon"
//                       onClick={() => removeWebsite(website.id)}
//                       className="text-destructive hover:text-destructive"
//                     >
//                       <Trash2 className="h-4 w-4" />
//                     </Button>
//                   )}
//                 </div>
//               </div>
//             ))}
//             <Button variant="link" onClick={addWebsite} className="text-primary p-0 h-auto">
//               <Plus className="h-4 w-4 mr-1" />
//               Add Website
//             </Button>
//           </CardContent>
//         </Card>

//         <Separator />

//         {/* Legal & Compliance */}
//         <h3 className="text-lg font-semibold flex items-center gap-2">
//           <Shield className="h-5 w-5" />
//           Legal & Compliance
//         </h3>

//         {/* Terms of Use URL */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <FileText className="h-4 w-4" />
//                 Terms of Use URL
//               </CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//             <CardDescription>Enter the URL of the website</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Input
//               value={config.termsOfUseUrl}
//               onChange={(e) => setConfig({ ...config, termsOfUseUrl: e.target.value })}
//               placeholder="https://example.com/terms"
//             />
//           </CardContent>
//         </Card>

//         {/* Privacy Policy URL */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <Shield className="h-4 w-4" />
//                 Privacy Policy URL
//               </CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//             <CardDescription>Enter the URL of the website</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Input
//               value={config.privacyPolicyUrl}
//               onChange={(e) => setConfig({ ...config, privacyPolicyUrl: e.target.value })}
//               placeholder="https://example.com/privacy"
//             />
//           </CardContent>
//         </Card>

//         <Separator />

//         {/* Technical Configuration */}
//         <h3 className="text-lg font-semibold flex items-center gap-2">
//           <Webhook className="h-5 w-5" />
//           Technical Configuration
//         </h3>

//         {/* Development Platform */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base">Development Platform</CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//             <CardDescription>
//               Select the development platform that you will use to create your bot (GSMA API or Google styled API)
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Select
//               value={config.developmentPlatform}
//               onValueChange={(value) => setConfig({ ...config, developmentPlatform: value })}
//             >
//               <SelectTrigger className="w-full md:w-1/2">
//                 <SelectValue placeholder="Development platform" />
//               </SelectTrigger>
//               <SelectContent>
//                 {developmentPlatforms.map((platform) => (
//                   <SelectItem key={platform.value} value={platform.value}>
//                     {platform.label}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </CardContent>
//         </Card>

//         {/* Chatbot Webhook */}
//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-base flex items-center gap-2">
//               <Webhook className="h-4 w-4" />
//               Chatbot Webhook
//             </CardTitle>
//             <CardDescription>
//               Enter the webhook that your bot will receive messages from the agent.
//               NOTE: The webhook needs to be active and be able to respond with a 200 OK to POST requests.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Input
//               value={config.chatbotWebhook}
//               onChange={(e) => setConfig({ ...config, chatbotWebhook: e.target.value })}
//               placeholder="https://your-server.com/webhook"
//             />
//           </CardContent>
//         </Card>

//         {/* Callback URL */}
//         <Card>
//           <CardHeader className="pb-3">
//             <CardTitle className="text-base">Callback URL</CardTitle>
//             <CardDescription>
//               This URL will be invoked by the API, for sending the Bot & template related updates.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Input
//               value={config.callbackUrl}
//               onChange={(e) => setConfig({ ...config, callbackUrl: e.target.value })}
//               placeholder="https://your-server.com/callback"
//             />
//           </CardContent>
//         </Card>

//         {/* Languages Supported */}
//         <Card>
//           <CardHeader className="pb-3">
//             <div className="flex items-center">
//               <CardTitle className="text-base flex items-center gap-2">
//                 <Languages className="h-4 w-4" />
//                 Languages Supported
//               </CardTitle>
//               <span className="text-destructive ml-1">*</span>
//             </div>
//             <CardDescription>Please specify the languages supported by the bot</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Input
//               value={config.languagesSupported}
//               onChange={(e) => setConfig({ ...config, languagesSupported: e.target.value })}
//               placeholder="English, Hindi, Tamil..."
//             />
//           </CardContent>
//         </Card>

//         <Separator />

//         {/* Agreement & Submit */}
//         <Card>
//           <CardContent className="pt-6">
//             <div className="flex items-start space-x-3">
//               <Checkbox
//                 id="agree"
//                 checked={config.agreeToLaunch}
//                 onCheckedChange={(checked) => setConfig({ ...config, agreeToLaunch: checked as boolean })}
//               />
//               <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
//                 I agree to launch the bot on all Indian carriers.
//               </Label>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Action Buttons */}
//         <div className="flex justify-end gap-3 pb-6">
//           <Button variant="outline">Back</Button>
//           <Button 
//             onClick={handleSubmit} 
//             className="bg-red-500 hover:bg-red-600 text-white"
//           >
//             Submit
//           </Button>
//         </div>
//           </div>
//         </ScrollArea>
//       </div>

//       {/* Preview Panel */}
//       <div className="hidden lg:block w-[320px] flex-shrink-0">
//         <RCSPreview
//           botName={config.botName}
//           brandName={config.brandName}
//           shortDescription={config.shortDescription}
//           brandColor={config.brandColor}
//           botLogo={config.botLogo}
//           bannerImage={config.bannerImage}
//           phoneNumber={config.phoneNumbers[0]?.number}
//           email={config.emails[0]?.email}
//           website={config.websites[0]?.url}
//         />
//       </div>
//     </div>
//   );
// }



import { useState, useRef } from 'react';
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
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RCSPreview } from './RCSPreview';

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

interface WebsiteEntry {
  id: string;
  url: string;
  label: string;
}

interface RCSConfig {
  botType: 'domestic' | 'international' | '';
  messageType: 'otp' | 'transactional' | 'promotional' | '';
  billingCategory: string;
  botName: string;
  brandName: string;
  botLogo: File | null;
  botLogoPreview: string | null;
  bannerImage: File | null;
  bannerImagePreview: string | null;
  shortDescription: string;
  brandColor: string;
  phoneNumbers: PhoneEntry[];
  emails: EmailEntry[];
  websites: WebsiteEntry[];
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
  developmentPlatform: string;
  chatbotWebhook: string;
  callbackUrl: string;
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

const billingCategories = [
  'Conversational',
  'Single Message',
  'Basic Message',
];

const developmentPlatforms = [
  
];

// ────────────────────────────────────────────────

// ────────────────────────────────────────────────

export function RCSConfiguration() {
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const [config, setConfig] = useState<RCSConfig>({
    botType: '',
    messageType: '',
    billingCategory: 'Conversational',
    botName: '',
    brandName: '',
    botLogo: null,
    botLogoPreview: null,
    bannerImage: null,
    bannerImagePreview: null,
    shortDescription: '',
    brandColor: '#7C3AED',
    phoneNumbers: [{ id: '1', countryCode: '+91', number: '', label: '' }],
    emails: [{ id: '1', email: '', label: '' }],
    websites: [{ id: '1', url: '', label: '' }],
    termsOfUseUrl: '',
    privacyPolicyUrl: '',
    developmentPlatform: '',
    chatbotWebhook: '',
    callbackUrl: '',
    languagesSupported: '',
    agreeToLaunch: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateName = (value: string) => /^[A-Za-z\s]*$/.test(value);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Logo must be under 2MB.', variant: 'destructive' });
      return;
    }

    const preview = URL.createObjectURL(file);
    setConfig({ ...config, botLogo: file, botLogoPreview: preview });
    setErrors((prev) => ({ ...prev, botLogo: '' }));
  };

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid File', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File Too Large', description: 'Banner must be under 5MB.', variant: 'destructive' });
      return;
    }

    const preview = URL.createObjectURL(file);
    setConfig({ ...config, bannerImage: file, bannerImagePreview: preview });
    setErrors((prev) => ({ ...prev, bannerImage: '' }));
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

  const addWebsite = () => {
    setConfig({
      ...config,
      websites: [...config.websites, { id: Date.now().toString(), url: '', label: '' }],
    });
  };

  const removeWebsite = (id: string) => {
    if (config.websites.length > 1) {
      setConfig({
        ...config,
        websites: config.websites.filter(w => w.id !== id),
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!config.botType) newErrors.botType = 'Please select Domestic or International';
    if (!config.messageType) newErrors.messageType = 'Please select a message type';
    if (!config.billingCategory) newErrors.billingCategory = 'Please select billing category';
    if (!config.botName.trim()) newErrors.botName = 'Bot name is required';
    else if (!validateName(config.botName)) newErrors.botName = 'Only letters and spaces allowed';
    if (!config.brandName.trim()) newErrors.brandName = 'Brand name is required';
    else if (!validateName(config.brandName)) newErrors.brandName = 'Only letters and spaces allowed';
    if (!config.botLogo) newErrors.botLogo = 'Bot logo is required';
    if (!config.bannerImage) newErrors.bannerImage = 'Banner image is required';
    if (!config.shortDescription.trim()) newErrors.shortDescription = 'Short description is required';
    if (config.phoneNumbers[0]?.number === '') newErrors.primaryPhone = 'Primary phone number is required';
    else if (!/^\d+$/.test(config.phoneNumbers[0].number)) newErrors.primaryPhone = 'Only numbers allowed';

    config.emails.forEach((email, i) => {
      if (email.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.email)) {
        newErrors[`email-${i}`] = 'Invalid email format';
      }
    });

    config.websites.forEach((site, i) => {
      if (site.url && !/^https?:\/\//i.test(site.url)) {
        newErrors[`website-${i}`] = 'URL must start with http:// or https://';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please fix the errors in the form.',
        variant: 'destructive'
      });
      return;
    }

    if (!config.agreeToLaunch) {
      toast({ 
        title: 'Agreement Required', 
        description: 'Please agree to launch the bot on all carriers.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();

      // JSON payload without files & previews
      const jsonPayload = {
        ...config,
        botLogo: undefined,
        botLogoPreview: undefined,
        bannerImage: undefined,
        bannerImagePreview: undefined,
      };

      // Change 'payload' if backend expects different name (data, config, json, body, etc.)
      formData.append('payload', JSON.stringify(jsonPayload));

      if (config.botLogo) {
        formData.append('botLogo', config.botLogo);
      }
      if (config.bannerImage) {
        formData.append('bannerImage', config.bannerImage);
      }

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          [API_KEY_HEADER]: API_KEY_VALUE,
          // If it's Bearer token instead, uncomment below and comment above line
          // 'Authorization': `Bearer ${API_KEY_VALUE}`,
        },
        body: formData,
      });

      if (!response.ok) {
        let errorText = await response.text().catch(() => 'Unknown error');
        try {
          const errJson = await response.json();
          errorText = errJson.message || errJson.error || errorText;
        } catch {}
        throw new Error(`Server responded with ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: result.message || 'RCS configuration submitted successfully!',
      });

      // Optional: clear form after success
      // setConfig({ ...initial empty config state });

    } catch (err: any) {
      console.error('API submission error:', err);
      toast({
        title: 'Error',
        description: err.message || 'Failed to submit configuration. Please check connection or try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
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
            <Card className={errors.botType ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Bot Type <span className="text-destructive">*</span></CardTitle>
                  {config.botType && (
                    <Badge variant="outline" className="text-primary">
                      {config.botType === 'domestic' ? 'Domestic' : 'International'}
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  Carrier decides final classification. International may require separate account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={config.botType}
                  onValueChange={(value: 'domestic' | 'international') => {
                    setConfig({ ...config, botType: value });
                    setErrors((prev) => ({ ...prev, botType: '' }));
                  }}
                  className="flex gap-8"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="domestic" id="domestic" />
                    <Label htmlFor="domestic">Domestic (India)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="international" id="international" />
                    <Label htmlFor="international">International</Label>
                  </div>
                </RadioGroup>
                {errors.botType && <p className="text-sm text-destructive mt-2">{errors.botType}</p>}
              </CardContent>
            </Card>

            {/* Bot Message Type */}
            <Card className={errors.messageType ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base">Bot Message Type <span className="text-destructive">*</span></CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup
                  value={config.messageType}
                  onValueChange={(value: 'otp' | 'transactional' | 'promotional') => {
                    setConfig({ ...config, messageType: value });
                    setErrors((prev) => ({ ...prev, messageType: '' }));
                  }}
                  className="flex gap-6 flex-wrap"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="otp" id="otp" />
                    <Label htmlFor="otp" className="flex items-center cursor-pointer">
                      OTP
                      <InfoTooltip content="One-Time Password messages for authentication" />
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="transactional" id="transactional" />
                    <Label htmlFor="transactional" className="flex items-center cursor-pointer">
                      Transactional
                      <InfoTooltip content="Order updates, booking confirmations, etc." />
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="promotional" id="promotional" />
                    <Label htmlFor="promotional" className="flex items-center cursor-pointer">
                      Promotional
                      <InfoTooltip content="Marketing and promotional messages" />
                    </Label>
                  </div>
                </RadioGroup>
                {errors.messageType && <p className="text-sm text-destructive mt-2">{errors.messageType}</p>}
              </CardContent>
            </Card>

            {/* Billing Category */}
            <Card className={errors.billingCategory ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base">Bot Billing Category <span className="text-destructive">*</span></CardTitle>
                  <InfoTooltip content="Select the billing category for your chatbot" />
                </div>
              </CardHeader>
              <CardContent>
                <Select
                  value={config.billingCategory}
                  onValueChange={(value) => {
                    setConfig({ ...config, billingCategory: value });
                    setErrors((prev) => ({ ...prev, billingCategory: '' }));
                  }}
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
                {errors.billingCategory && <p className="text-sm text-destructive mt-2">{errors.billingCategory}</p>}
              </CardContent>
            </Card>

            {/* Bot Name */}
            <Card className={errors.botName ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base">Bot Name <span className="text-destructive">*</span></CardTitle>
                </div>
                <CardDescription>Max 40 characters — letters and spaces only</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    value={config.botName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (validateName(val) || val === '') {
                        setConfig({ ...config, botName: val.slice(0, 40) });
                        setErrors((prev) => ({ ...prev, botName: '' }));
                      }
                    }}
                    placeholder="Enter bot name"
                    maxLength={40}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {40 - config.botName.length} characters left
                  </p>
                  {errors.botName && <p className="text-sm text-destructive">{errors.botName}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Brand Name */}
            <Card className={errors.brandName ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base">Brand Name <span className="text-destructive">*</span></CardTitle>
                </div>
                <CardDescription>Max 100 characters — letters and spaces only</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    value={config.brandName}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (validateName(val) || val === '') {
                        setConfig({ ...config, brandName: val.slice(0, 100) });
                        setErrors((prev) => ({ ...prev, brandName: '' }));
                      }
                    }}
                    placeholder="Enter brand name"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {100 - config.brandName.length} characters left
                  </p>
                  {errors.brandName && <p className="text-sm text-destructive">{errors.brandName}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Bot Logo */}
            <Card className={errors.botLogo ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base">Bot Logo <span className="text-destructive">*</span></CardTitle>
                </div>
                <CardDescription>224px × 224px recommended — square image</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div 
                    onClick={() => logoInputRef.current?.click()}
                    className="w-32 h-32 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 transition-colors overflow-hidden"
                  >
                    {config.botLogoPreview ? (
                      <img src={config.botLogoPreview} alt="Logo preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-purple-400 mb-2" />
                        <span className="text-xs text-purple-500 font-medium">Upload Logo</span>
                      </>
                    )}
                  </div>
                  <input
                    type="file"
                    ref={logoInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">Click box to select file</p>
                    <p>PNG, JPG, max 2MB</p>
                  </div>
                </div>
                {errors.botLogo && <p className="text-sm text-destructive mt-2">{errors.botLogo}</p>}
              </CardContent>
            </Card>

            {/* Banner Image */}
            <Card className={errors.bannerImage ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base">Banner Image <span className="text-destructive">*</span></CardTitle>
                </div>
                <CardDescription>1440px × 448px recommended — logo overlays bottom center</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div 
                    onClick={() => bannerInputRef.current?.click()}
                    className="w-64 h-24 border-2 border-dashed border-purple-300 rounded-xl bg-purple-50 dark:bg-purple-950/20 flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 transition-colors relative overflow-hidden"
                  >
                    {config.bannerImagePreview ? (
                      <img src={config.bannerImagePreview} alt="Banner preview" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <Upload className="h-6 w-6 text-purple-400 mb-1" />
                        <span className="text-xs text-purple-500 font-medium">Upload Banner</span>
                      </>
                    )}
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-purple-300/50" />
                  </div>
                  <input
                    type="file"
                    ref={bannerInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleBannerChange}
                  />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">Click box to select file</p>
                    <p>PNG, JPG, max 5MB</p>
                  </div>
                </div>
                {errors.bannerImage && <p className="text-sm text-destructive mt-2">{errors.bannerImage}</p>}
              </CardContent>
            </Card>

            {/* Short Description */}
            <Card className={errors.shortDescription ? 'border-destructive' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base">Short Description <span className="text-destructive">*</span></CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    value={config.shortDescription}
                    onChange={(e) => {
                      setConfig({ ...config, shortDescription: e.target.value.slice(0, 100) });
                      setErrors((prev) => ({ ...prev, shortDescription: '' }));
                    }}
                    placeholder="Enter a short description of your bot"
                    maxLength={100}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {100 - config.shortDescription.length} characters left
                  </p>
                  {errors.shortDescription && <p className="text-sm text-destructive">{errors.shortDescription}</p>}
                </div>
              </CardContent>
            </Card>

            {/* Brand Color */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base">Brand Color <span className="text-destructive">*</span></CardTitle>
                </div>
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
            </Card>

            <Separator />

            {/* Contact Information */}
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Contact Information
            </h3>

            {/* Phone Numbers */}
            <Card className={errors.primaryPhone ? 'border-destructive' : ''}>
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
                      <Label className="text-sm">
                        {index === 0 ? 'Primary phone number *' : `Phone number ${index + 1}`}
                      </Label>
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
                            const val = e.target.value;
                            if (/^\d*$/.test(val) || val === '') {
                              const updated = [...config.phoneNumbers];
                              updated[index].number = val;
                              setConfig({ ...config, phoneNumbers: updated });
                              if (index === 0) setErrors((prev) => ({ ...prev, primaryPhone: '' }));
                            }
                          }}
                          placeholder="Phone number"
                          className="flex-1"
                        />
                      </div>
                      {index === 0 && errors.primaryPhone && (
                        <p className="text-sm text-destructive mt-1">{errors.primaryPhone}</p>
                      )}
                    </div>
                    <div className="md:col-span-5">
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
                    </div>
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
                      <Label className="text-sm">
                        {index === 0 ? 'Primary email id' : `Email ${index + 1}`}
                      </Label>
                      <Input
                        value={email.email}
                        onChange={(e) => {
                          const updated = [...config.emails];
                          updated[index].email = e.target.value;
                          setConfig({ ...config, emails: updated });
                          setErrors((prev) => ({ ...prev, [`email-${index}`]: '' }));
                        }}
                        placeholder="abc@xyz.com"
                        className="mt-1.5"
                      />
                      {errors[`email-${index}`] && (
                        <p className="text-sm text-destructive mt-1">{errors[`email-${index}`]}</p>
                      )}
                    </div>
                    <div className="md:col-span-5">
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
                    </div>
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
            <Card>
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
                      <Label className="text-sm">
                        {index === 0 ? 'Primary website' : `Website ${index + 1}`}
                      </Label>
                      <Input
                        value={website.url}
                        onChange={(e) => {
                          const updated = [...config.websites];
                          updated[index].url = e.target.value;
                          setConfig({ ...config, websites: updated });
                          setErrors((prev) => ({ ...prev, [`website-${index}`]: '' }));
                        }}
                        placeholder="https://example.com"
                        className="mt-1.5"
                      />
                      {errors[`website-${index}`] && (
                        <p className="text-sm text-destructive mt-1">{errors[`website-${index}`]}</p>
                      )}
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
            </Card>

            <Separator />

            {/* Legal & Compliance */}
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Legal & Compliance
            </h3>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Terms of Use URL
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
                    Privacy Policy URL
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

            {/* Technical Configuration */}
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Technical Configuration
            </h3>

            <Card>
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
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Chatbot Webhook
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Input
                  value={config.chatbotWebhook}
                  onChange={(e) => setConfig({ ...config, chatbotWebhook: e.target.value })}
                  placeholder="https://your-server.com/webhook"
                />
              </CardContent>
            </Card>

            <Card>
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
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    Languages Supported <span className="text-destructive">*</span>
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

            {/* Agreement */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agree"
                    checked={config.agreeToLaunch}
                    onCheckedChange={(checked) => setConfig({ ...config, agreeToLaunch: checked as boolean })}
                  />
                  <Label htmlFor="agree" className="text-sm leading-relaxed cursor-pointer">
                    I agree to launch the bot on all Indian carriers.
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pb-6">
              <Button variant="outline" disabled={isSubmitting}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-red-500 hover:bg-red-600 text-white min-w-[140px]"
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>

          </div>
        </ScrollArea>
      </div>

      {/* Preview Panel */}
      <div className="hidden lg:block w-[320px] flex-shrink-0">
        <RCSPreview
          botName={config.botName}
          brandName={config.brandName}
          shortDescription={config.shortDescription}
          brandColor={config.brandColor}
          botLogo={config.botLogoPreview}
          bannerImage={config.bannerImagePreview}
          phoneNumber={config.phoneNumbers[0]?.number}
          email={config.emails[0]?.email}
          website={config.websites[0]?.url}
        />
      </div>
    </div>
  );
}