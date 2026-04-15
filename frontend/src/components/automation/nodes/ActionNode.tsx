import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { useNavigate } from 'react-router-dom';
import { 
  Play, MessageSquare, Users, Tag, Clock, 
  Send, Bot, UserPlus, Shield, Webhook, 
  CreditCard, ShoppingCart, Sparkles, Mail,
  Phone, FileText, Link, Bell, Database, 
  ChevronRight, X, MoreVertical, Rss,
  PhoneCall, PhoneOff, UserX, Eye, EyeOff,
  Code, Table, Star, CircleStop, Smile, List,
  Plus
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// Real services
import { campaignService, Campaign } from '@/services/campaignService';
import { templateService, MessageTemplate } from '@/services/templateService';
import { contactService } from '@/services/contactService';
import { useEffect } from 'react';

export const actionCategories = [
  {
    name: 'Starting Point',
    color: 'text-warning',
    bg: 'bg-warning/10',
    actions: [
      { value: 'trigger_node', label: 'Trigger Node', icon: Play },
    ],
  },
  {
    name: 'Workflow',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    actions: [
      { value: 'criteria_router', label: 'Criteria Router', icon: Link },
      { value: 'jump_to_automation', label: 'Jump To Automation', icon: Code },
      { value: 'delay', label: 'Delay Execution', icon: Clock },
    ],
  },
  {
    name: 'Messaging',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    actions: [
      { value: 'auto_reply_template', label: 'Auto Reply Template Message', icon: MessageSquare },
      { value: 'auto_reply_buttons', label: 'Auto Reply Buttons/Options/Products', icon: List },
      { value: 'auto_reply_collect_inputs', label: 'Auto Reply and Collect User Inputs', icon: FileText },
      { value: 'send_sms', label: 'Send SMS', icon: Send },
    ],
  },
  {
    name: 'Customer Interaction',
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    actions: [
      { value: 'add_to_campaign', label: 'Add To Campaign', icon: Rss },
      { value: 'remove_from_campaign', label: 'Remove From Campaign', icon: Rss },
      { value: 'create_whatsapp_payment', label: 'Create Whatsapp Payment', icon: CreditCard },
      { value: 'add_contact_to_list', label: 'Add Contact to List', icon: Users },
      { value: 'set_contact_attribute', label: 'Set Contact Attribute', icon: Database },
      { value: 'set_conversation_status', label: 'Set Conversation Status', icon: Eye },
      { value: 'send_email_notification', label: 'Send Email Notification', icon: Mail },
      { value: 'mark_blacklisted', label: 'Mark Blacklisted', icon: UserX },
      { value: 'forward_call', label: 'Forward Call', icon: PhoneCall },
      { value: 'terminate_call', label: 'Terminate Call', icon: PhoneOff },
      { value: 'assign_to_team_member', label: 'Assign To Team Member', icon: UserPlus },
      { value: 'unassign_from_team', label: 'Unassign From Team', icon: Users },
    ],
  },
  {
    name: 'Technical',
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
    actions: [
      { value: 'call_rest_api', label: 'Call REST API', icon: Webhook },
      { value: 'eval', label: 'Eval', icon: Code },
    ],
  },
  {
    name: 'Tagging',
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    actions: [
      { value: 'add_tags', label: 'Add Tags', icon: Tag },
      { value: 'remove_tags', label: 'Remove Tags', icon: X },
    ],
  },
  {
    name: 'WhatsApp Chat Commerce',
    color: 'text-teal-500',
    bg: 'bg-teal-500/10',
    actions: [
      { value: 'send_cart_confirmation', label: 'Send Cart Confirmation Message', icon: ShoppingCart },
      { value: 'send_whatsapp_notification', label: 'Send WhatsApp Notification', icon: Bell },
    ],
  },
  {
    name: 'Zoho CRM',
    color: 'text-indigo-500',
    bg: 'bg-indigo-500/10',
    actions: [
      { value: 'create_zoho_lead', label: 'Create a Zoho CRM Lead', icon: Database },
      { value: 'send_attachment_zoho', label: 'Send Attachment To Zoho CRM', icon: FileText },
      { value: 'set_zoho_file_attributes', label: 'Set Zoho Lead File Upload Attributes', icon: Database },
    ],
  },
  {
    name: 'Google Sheets',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    actions: [
      { value: 'add_google_sheet_row', label: 'Add new row in google sheet', icon: Table },
    ],
  },
  {
    name: 'ChatGPT',
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    actions: [
      { value: 'ask_chatgpt', label: 'Ask ChatGPT Assistant', icon: Sparkles },
    ],
  },
  {
    name: 'CSAT',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    actions: [
      { value: 'start_csat_flow', label: 'Start CSAT Flow', icon: Star },
      { value: 'end_csat_flow', label: 'End CSAT Flow', icon: CircleStop },
      { value: 'capture_csat', label: 'Capture CSAT', icon: Smile },
    ],
  },
];

const allActions = actionCategories.flatMap((cat) => cat.actions.map(a => ({ ...a, category: cat.name, color: cat.color, bg: cat.bg })));

const messageTypes = [
  { value: 'text', label: 'Text' },
  { value: 'button_flow', label: 'Button/Flow' },
  { value: 'list', label: 'List' },
  { value: 'address', label: 'Address' },
  { value: 'location', label: 'Location' },
  { value: 'call_permission', label: 'Call Permission Request' },
  { value: 'single_product', label: 'Single Product' },
  { value: 'multi_products', label: 'Multi Products' },
];

interface ActionNodeData {
  label: string;
  actionType: string;
  config: Record<string, any>;
  onUpdate: (data: Partial<ActionNodeData>) => void;
}

const ActionNode = ({ data, selected, isConnectable }: NodeProps) => {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [realTemplates, setRealTemplates] = useState<MessageTemplate[]>([]);
  const [realCampaigns, setRealCampaigns] = useState<Campaign[]>([]);
  const [realLists, setRealLists] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isSheetOpen) {
      loadRealData();
    }
  }, [isSheetOpen]);

  const loadRealData = async () => {
    setIsLoading(true);
    try {
      const [tplRes, campRes, contacts] = await Promise.all([
        templateService.getTemplates(1, 100),
        campaignService.getCampaigns(1, 100),
        contactService.getContacts()
      ]);
      setRealTemplates(tplRes.templates || []);
      setRealCampaigns(campRes.campaigns || []);
      
      // Extract unique categories as lists
      const categories = Array.from(new Set(contacts.map((c: any) => c.category).filter(Boolean))) as string[];
      setRealLists(categories.length > 0 ? categories : ['guest', 'lead', 'customer', 'vip']);
    } catch (err) {
      console.error('Failed to load automation node data:', err);
    } finally {
      setIsLoading(false);
    }
  };
  const navigate = useNavigate();
  const selectedAction = allActions.find((a) => a.value === data.actionType);
  const Icon = selectedAction?.icon || Play;

  const handleCreateTemplate = () => {
    setIsSheetOpen(false);
    navigate('/campaigns?createTemplate=true');
  };

  const renderActionConfig = () => {
    switch (data.actionType) {
      case 'auto_reply_template':
        return (
          <div className="space-y-4">
            {/* Template Selection */}
            <div className="space-y-2">
              <Label>Select Template</Label>
              <Select
                value={data.config?.templateId || ''}
                onValueChange={(value) => data.onUpdate({ config: { ...data.config, templateId: value } })}
              >
                <SelectTrigger className="border-primary">
                  <SelectValue placeholder={isLoading ? "Loading..." : "Select a template"} />
                </SelectTrigger>
                <SelectContent>
                  {realTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        <Badge 
                          variant={template.status === 'approved' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {template.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                  {realTemplates.length === 0 && !isLoading && <SelectItem value="none" disabled>No templates found</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {/* Create Template Button */}
            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={handleCreateTemplate}
              >
                <Plus className="h-4 w-4" />
                Create New Template
              </Button>
            </div>

            {/* Selected Template Info */}
            {data.config?.templateId && (
              <div className="p-3 bg-muted rounded-lg space-y-1">
                <p className="text-sm font-medium">
                  {realTemplates.find(t => t.id === data.config?.templateId)?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  This template will be sent when the automation triggers.
                </p>
              </div>
            )}

            {/* Reporting & Fallback */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Enable Reporting</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center cursor-help">
                          <Info className="h-3 w-3 text-white" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Track and measure the performance of this automation action</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  checked={data.config?.enableReporting || false}
                  onCheckedChange={(checked) => data.onUpdate({ config: { ...data.config, enableReporting: checked } })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Enable Fallback Setting</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="h-5 w-5 rounded-full bg-blue-500 flex items-center justify-center cursor-help">
                          <Info className="h-3 w-3 text-white" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Set a fallback action if user doesn't respond within specified time</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  checked={data.config?.enableFallback || false}
                  onCheckedChange={(checked) => data.onUpdate({ config: { ...data.config, enableFallback: checked } })}
                />
              </div>
              
              {data.config?.enableFallback && (
                <div className="flex items-center gap-2 pl-4">
                  <Label className="text-sm text-muted-foreground">After</Label>
                  <Input
                    type="number"
                    value={data.config?.fallbackAfter || 20}
                    onChange={(e) => data.onUpdate({ config: { ...data.config, fallbackAfter: e.target.value } })}
                    className="w-16"
                  />
                  <Select
                    value={data.config?.fallbackUnit || 'minutes'}
                    onValueChange={(value) => data.onUpdate({ config: { ...data.config, fallbackUnit: value } })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seconds">Seconds</SelectItem>
                      <SelectItem value="minutes">Minutes</SelectItem>
                      <SelectItem value="hours">Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        );
      case 'send_sms':
        const smsTemplates = realTemplates.filter(t => t.channel === 'sms');
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select SMS Template</Label>
              <Select
                value={data.config?.templateId || ''}
                onValueChange={(value) => {
                  const tpl = smsTemplates.find(t => t.id === value);
                  data.onUpdate({ 
                    config: { 
                      ...data.config, 
                      templateId: value,
                      body: tpl?.body || '',
                      label: tpl?.name || ''
                    } 
                  });
                }}
              >
                <SelectTrigger className="border-primary">
                  <SelectValue placeholder={isLoading ? "Loading..." : "Select Template"} />
                </SelectTrigger>
                <SelectContent>
                  {smsTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                  {smsTemplates.length === 0 && !isLoading && <SelectItem value="none" disabled>No SMS templates found</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {data.config?.body && (
              <div className="p-3 bg-muted rounded-lg space-y-2 border">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-xs font-semibold">Message Preview</Label>
                </div>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{data.config.body}</div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Sender ID (Optional)</Label>
              <Input 
                 placeholder="e.g., NOTIFY"
                 value={data.config?.sender || ''}
                 onChange={(e) => data.onUpdate({ config: { ...data.config, sender: e.target.value } })}
              />
            </div>
          </div>
        );
      case 'auto_reply_buttons':
      case 'auto_reply_collect_inputs':
        return (
          <div className="space-y-4">
            {/* Message Type Selection */}
            <div className="space-y-2">
              <Label>Message Type</Label>
              <div className="flex flex-wrap gap-2">
                {messageTypes.map((type) => (
                  <Button
                    key={type.value}
                    variant={data.config?.messageType === type.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => data.onUpdate({ config: { ...data.config, messageType: type.value } })}
                  >
                    {type.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Header Type */}
            <div className="space-y-2">
              <Label>Header Type</Label>
              <Select
                value={data.config?.headerType || 'none'}
                onValueChange={(value) => data.onUpdate({ config: { ...data.config, headerType: value } })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Body *</Label>
                <Select value={data.config?.bodyPlaceholder || ''} onValueChange={(v) => {}}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Insert Body PlaceHolder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Contact Name</SelectItem>
                    <SelectItem value="phone">Phone Number</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Type your message..."
                value={data.config?.body || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, body: e.target.value } })}
                className="min-h-[100px]"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="h-6 px-2">B</Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 italic">I</Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2 line-through">S</Button>
                  <Button variant="ghost" size="sm" className="h-6 px-2">😊</Button>
                </div>
                <span>{(data.config?.body?.length || 0)}/1024</span>
              </div>
            </div>

            {/* Footer */}
            <div className="space-y-2">
              <Label>Footer (Optional)</Label>
              <Input
                placeholder="Footer text..."
                value={data.config?.footer || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, footer: e.target.value } })}
                maxLength={60}
              />
              <span className="text-xs text-muted-foreground">{(data.config?.footer?.length || 0)}/60</span>
            </div>

            {/* List CTA Label */}
            {data.config?.messageType === 'list' && (
              <div className="space-y-2">
                <Label>List CTA Label *</Label>
                <Input
                  placeholder="Main Menu"
                  value={data.config?.ctaLabel || ''}
                  onChange={(e) => data.onUpdate({ config: { ...data.config, ctaLabel: e.target.value } })}
                  maxLength={20}
                />
                <span className="text-xs text-muted-foreground">List CTA Label should be less than 20 characters.</span>
              </div>
            )}

            {/* Buttons for Button/Flow type */}
            {data.config?.messageType === 'button_flow' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-semibold">Buttons (Max 3)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>WhatsApp officially allows a maximum of 3 buttons. To offer more options (up to 10), please use the 'List' message type above.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {(data.config?.buttons?.length || 0) < 3 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const config = data.config || {};
                        const btns = [...(config.buttons || [])];
                        btns.push({ id: `btn_${Date.now()}`, label: `Button ${btns.length + 1}` });
                        data.onUpdate({ config: { ...config, buttons: btns } });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Button
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {(data.config?.buttons || []).map((btn: any, index: number) => (
                    <div key={btn.id || index} className="flex gap-2">
                      <Input
                        placeholder="Button Label"
                        value={btn.label || ''}
                        onChange={(e) => {
                          const config = data.config || {};
                          const btns = [...(config.buttons || [])];
                          btns[index] = { ...btns[index], label: e.target.value };
                          data.onUpdate({ config: { ...config, buttons: btns } });
                        }}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive h-9 w-9"
                        onClick={() => {
                          const config = data.config || {};
                          const btns = (config.buttons || []).filter((_: any, i: number) => i !== index);
                          data.onUpdate({ config: { ...config, buttons: btns } });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(data.config?.buttons?.length || 0) === 0 && (
                    <p className="text-xs text-muted-foreground italic">No buttons added yet. Click 'Add Button' above.</p>
                  )}
                </div>
              </div>
            )}

            {/* Sections for List type */}
            {data.config?.messageType === 'list' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>List Options (Max 10)</Label>
                  {(data.config?.listOptions?.length || 0) < 10 && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        const config = data.config || {};
                        const options = [...(config.listOptions || [])];
                        options.push({ 
                          id: `opt_${Date.now()}`, 
                          title: `Option ${options.length + 1}`, 
                          description: '', 
                          callbackId: `cb_${Date.now()}` 
                        });
                        data.onUpdate({ config: { ...config, listOptions: options } });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Option
                    </Button>
                  )}
                </div>
                <div className="space-y-4">
                  {(data.config?.listOptions || []).map((opt: any, index: number) => (
                    <div key={opt.id || index} className="p-3 border rounded-lg space-y-2 relative bg-muted/20">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 text-destructive"
                        onClick={() => {
                          const config = data.config || {};
                          const options = (config.listOptions || []).filter((_: any, i: number) => i !== index);
                          data.onUpdate({ config: { ...config, listOptions: options } });
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Title *</Label>
                          <Input
                            placeholder="Option Title"
                            value={opt.title || ''}
                            onChange={(e) => {
                              const config = data.config || {};
                              const options = [...(config.listOptions || [])];
                              options[index] = { ...options[index], title: e.target.value };
                              data.onUpdate({ config: { ...config, listOptions: options } });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Callback ID *</Label>
                          <Input
                            placeholder="ID"
                            value={opt.callbackId || ''}
                            onChange={(e) => {
                              const config = data.config || {};
                              const options = [...(config.listOptions || [])];
                              options[index] = { ...options[index], callbackId: e.target.value };
                              data.onUpdate({ config: { ...config, listOptions: options } });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px]">Description (Optional)</Label>
                        <Input
                          placeholder="Description"
                          value={opt.description || ''}
                          onChange={(e) => {
                            const config = data.config || {};
                            const options = [...(config.listOptions || [])];
                            options[index] = { ...options[index], description: e.target.value };
                            data.onUpdate({ config: { ...config, listOptions: options } });
                          }}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                  {(data.config?.listOptions?.length || 0) === 0 && (
                    <p className="text-xs text-muted-foreground italic">No list options added yet. Click 'Add Option' above.</p>
                  )}
                </div>
              </div>
            )}

            {/* Collect Input Configuration */}
            {data.actionType === 'auto_reply_collect_inputs' && (
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-semibold">Save Response To Attribute *</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>The user's reply will be saved to this contact attribute (e.g., user_hobbies) for later use.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  placeholder="e.g., user_interest, lead_score"
                  value={data.config?.saveToAttribute || ''}
                  onChange={(e) => data.onUpdate({ config: { ...data.config, saveToAttribute: e.target.value } })}
                />
              </div>
            )}

            {/* Reporting & Fallback */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label>Enable Reporting</Label>
                  <Badge variant="outline" className="text-xs">ℹ</Badge>
                </div>
                <Switch
                  checked={data.config?.enableReporting || false}
                  onCheckedChange={(checked) => data.onUpdate({ config: { ...data.config, enableReporting: checked } })}
                />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Enable Fallback Setting</Label>
                  <Badge variant="outline" className="text-xs">ℹ</Badge>
                </div>
                <Switch
                  checked={data.config?.enableFallback || false}
                  onCheckedChange={(checked) => data.onUpdate({ config: { ...data.config, enableFallback: checked } })}
                />
                {data.config?.enableFallback && (
                  <>
                    <Input
                      type="number"
                      value={data.config?.fallbackAfter || 20}
                      onChange={(e) => data.onUpdate({ config: { ...data.config, fallbackAfter: e.target.value } })}
                      className="w-16"
                    />
                    <Select
                      value={data.config?.fallbackUnit || 'minutes'}
                      onValueChange={(value) => data.onUpdate({ config: { ...data.config, fallbackUnit: value } })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seconds">Seconds</SelectItem>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 'criteria_router':
        return (
          <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold">Branches (Criteria)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Define multiple branches (max 10). Each branch will have its own output point on the right of the node.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {(data.config?.branches?.length || 0) < 10 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const config = data.config || {};
                    const branches = [...(config.branches || [])];
                    branches.push({ id: `branch_${Date.now()}`, name: `Branch ${branches.length + 1}`, criteria: 'contains', value: '' });
                    data.onUpdate({ config: { ...config, branches } });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Branch
                </Button>
              )}
            <div className="space-y-3">
              {(data.config?.branches || []).map((branch: any, index: number) => (
                <div key={branch.id || index} className="p-3 border rounded-lg space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Input
                      placeholder="Branch Name (e.g., Sales, Support)"
                      value={branch.name || ''}
                      onChange={(e) => {
                        const config = data.config || {};
                        const branches = [...(config.branches || [])];
                        branches[index] = { ...branches[index], name: e.target.value };
                        data.onUpdate({ config: { ...config, branches } });
                      }}
                      className="h-8 font-medium bg-transparent border-none focus-visible:ring-0 p-0"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive"
                      onClick={() => {
                          const config = data.config || {};
                          const branches = (config.branches || []).filter((_: any, i: number) => i !== index);
                          data.onUpdate({ config: { ...config, branches } });
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={branch.criteria || 'contains'}
                      onValueChange={(val) => {
                        const config = data.config || {};
                        const branches = [...(config.branches || [])];
                        branches[index] = { ...branches[index], criteria: val };
                        data.onUpdate({ config: { ...config, branches } });
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="exact">Exact Match</SelectItem>
                        <SelectItem value="starts_with">Starts With</SelectItem>
                        <SelectItem value="exists">Is Set</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value to match"
                      value={branch.value || ''}
                      onChange={(e) => {
                        const config = data.config || {};
                        const branches = [...(config.branches || [])];
                        branches[index] = { ...branches[index], value: e.target.value };
                        data.onUpdate({ config: { ...config, branches } });
                      }}
                      className="h-8"
                    />
                  </div>
                </div>
              ))}
              {(data.config?.branches?.length || 0) === 0 && (
                <p className="text-xs text-muted-foreground italic">No branches added yet. Routes based on message content.</p>
              )}
            </div>
          </div>
        );

      case 'jump_to_automation':
        return (
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Select Target Automation</Label>
            <Select
              value={data.config?.targetAutomationId || ''}
              onValueChange={(val) => data.onUpdate({ config: { ...data.config, targetAutomationId: val } })}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : "Select an automation"} />
              </SelectTrigger>
              <SelectContent>
                {realCampaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                {realCampaigns.length === 0 && !isLoading && <SelectItem value="none" disabled>No automations found</SelectItem>}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground italic">
              When this node is reached, the contact will be moved to the start of the selected automation.
            </p>
          </div>
        );

      case 'create_whatsapp_payment':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Amount *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={data.config?.amount || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, amount: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Currency</Label>
              <Select
                value={data.config?.currency || 'INR'}
                onValueChange={(val) => data.onUpdate({ config: { ...data.config, currency: val } })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Description</Label>
              <Input
                placeholder="Payment for services..."
                value={data.config?.description || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, description: e.target.value } })}
              />
            </div>
          </div>
        );

      case 'delay':
        return (
          <div className="space-y-4">
            <Label>Delay Duration</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="5"
                value={data.config?.duration || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, duration: e.target.value } })}
                className="w-24"
              />
              <Select
                value={data.config?.unit || 'minutes'}
                onValueChange={(value) => data.onUpdate({ config: { ...data.config, unit: value } })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="seconds">Seconds</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'add_tags':
      case 'remove_tags':
        return (
          <div className="space-y-4">
            <Label>Tag Name</Label>
            <Input
              placeholder="Enter tag name..."
              value={data.config?.tagName || ''}
              onChange={(e) => data.onUpdate({ config: { ...data.config, tagName: e.target.value } })}
            />
          </div>
        );

      case 'assign_to_team_member':
        return (
          <div className="space-y-4">
            <Label>Select Team Member</Label>
            <Select
              value={data.config?.memberId || ''}
              onValueChange={(value) => data.onUpdate({ config: { ...data.config, memberId: value } })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member_1">John Doe</SelectItem>
                <SelectItem value="member_2">Jane Smith</SelectItem>
                <SelectItem value="member_3">Mike Johnson</SelectItem>
                <SelectItem value="round_robin">Round Robin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      case 'call_rest_api':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>API URL</Label>
              <Input
                placeholder="https://api.example.com/endpoint"
                value={data.config?.url || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, url: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Method</Label>
              <Select
                value={data.config?.method || 'POST'}
                onValueChange={(value) => data.onUpdate({ config: { ...data.config, method: value } })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Headers (JSON)</Label>
              <Textarea
                placeholder='{"Authorization": "Bearer token"}'
                value={data.config?.headers || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, headers: e.target.value } })}
                className="min-h-[60px] font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Body (JSON)</Label>
              <Textarea
                placeholder='{"key": "value"}'
                value={data.config?.body || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, body: e.target.value } })}
                className="min-h-[80px] font-mono text-sm"
              />
            </div>
          </div>
        );

      case 'ask_chatgpt':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                placeholder="You are a helpful assistant..."
                value={data.config?.systemPrompt || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, systemPrompt: e.target.value } })}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Temperature</Label>
              <Input
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={data.config?.temperature || '0.7'}
                onChange={(e) => data.onUpdate({ config: { ...data.config, temperature: e.target.value } })}
                className="w-24"
              />
            </div>
          </div>
        );

      case 'send_email_notification':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>To Email</Label>
              <Input
                placeholder="email@example.com"
                value={data.config?.toEmail || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, toEmail: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Email subject..."
                value={data.config?.subject || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, subject: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Body</Label>
              <Textarea
                placeholder="Email content..."
                value={data.config?.emailBody || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, emailBody: e.target.value } })}
                className="min-h-[100px]"
              />
            </div>
          </div>
        );

      case 'set_contact_attribute':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Attribute Name</Label>
              <Input
                placeholder="e.g., customer_type"
                value={data.config?.attributeName || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, attributeName: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Attribute Value</Label>
              <Input
                placeholder="e.g., premium"
                value={data.config?.attributeValue || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, attributeValue: e.target.value } })}
              />
            </div>
          </div>
        );

      case 'add_google_sheet_row':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Spreadsheet ID</Label>
              <Input
                placeholder="Enter spreadsheet ID..."
                value={data.config?.spreadsheetId || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, spreadsheetId: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Sheet Name</Label>
              <Input
                placeholder="Sheet1"
                value={data.config?.sheetName || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, sheetName: e.target.value } })}
              />
            </div>
            <div className="space-y-2">
              <Label>Row Data (JSON Array)</Label>
              <Textarea
                placeholder='["value1", "value2", "value3"]'
                value={data.config?.rowData || ''}
                onChange={(e) => data.onUpdate({ config: { ...data.config, rowData: e.target.value } })}
                className="min-h-[60px] font-mono text-sm"
              />
            </div>
          </div>
        );

      case 'add_to_campaign':
      case 'remove_from_campaign':
        return (
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Select Campaign</Label>
            <Select 
              value={data.config?.campaignId || ''} 
              onValueChange={(val) => data.onUpdate({ config: { ...data.config, campaignId: val } })}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : "Select Campaign"} />
              </SelectTrigger>
              <SelectContent>
                {realCampaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
                {realCampaigns.length === 0 && !isLoading && <SelectItem value="none" disabled>No campaigns found</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        );

      case 'add_contact_to_list':
        return (
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Select Contact List</Label>
            <Select 
              value={data.config?.listId || ''} 
              onValueChange={(val) => data.onUpdate({ config: { ...data.config, listId: val } })}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoading ? "Loading..." : "Select List"} />
              </SelectTrigger>
              <SelectContent>
                {realLists.map(l => (
                  <SelectItem key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
                ))}
                {realLists.length === 0 && !isLoading && <SelectItem value="none" disabled>No lists found</SelectItem>}
              </SelectContent>
            </Select>
          </div>
        );

      case 'set_conversation_status':
        return (
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Set Status To</Label>
            <Select
              value={data.config?.status || 'open'}
              onValueChange={(val) => data.onUpdate({ config: { ...data.config, status: val } })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg">
            Configure this action using the settings above.
          </div>
        );
    }
  };

  const getNodePreview = () => {
    const config = data.config || {};
    
    switch (data.actionType) {
      case 'auto_reply_buttons':
      case 'auto_reply_template':
      case 'auto_reply_collect_inputs':
        return (
          <div className="space-y-2">
            {/* Message Preview */}
            {config.body && (
              <div className="p-2.5 bg-gray-50 rounded-lg text-xs text-gray-700 border border-gray-100">
                {config.body}
              </div>
            )}
            {/* Buttons Preview */}
            {config.buttons && config.buttons.length > 0 && (
              <div className="space-y-1.5">
                {config.buttons.slice(0, 3).map((btn: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between bg-indigo-500 text-white px-3 py-2 rounded-md text-[10px] font-medium"
                  >
                    <span>{btn.label || `Button ${idx + 1}`}</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'criteria_router':
        return config.branches && config.branches.length > 0 ? (
          <div className="space-y-1.5">
            {config.branches.slice(0, 3).map((branch: any, idx: number) => (
              <div 
                key={idx} 
                className="flex items-center justify-between bg-purple-500 text-white px-3 py-2 rounded-md text-[10px] font-medium"
              >
                <span>{branch.name || `Branch ${idx + 1}`}</span>
                <ChevronRight className="h-3 w-3" />
              </div>
            ))}
            {config.branches.length > 3 && (
              <p className="text-[10px] text-center text-muted-foreground">+{config.branches.length - 3} more branches</p>
            )}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground italic">No branches configured</p>
        );

        ) : null;

      case 'send_sms':
        return config.body ? (
          <div className="p-2.5 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100 flex items-center justify-between">
            <span className="truncate flex-1">{config.body}</span>
            <Send className="h-3 w-3 flex-shrink-0 ml-1" />
          </div>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <>
      {/* Left handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-md !-left-1"
      />
      
      <div
        className={`min-w-[220px] max-w-[280px] bg-white rounded-lg shadow-md transition-all cursor-pointer ${
          selected ? 'ring-2 ring-primary/50 shadow-lg border-2 border-primary' : 'border-2 border-primary/30'
        }`}
        onDoubleClick={() => setIsSheetOpen(true)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
          <span className="font-semibold text-gray-800 text-sm truncate flex-1 pr-2">
            {selectedAction?.label || 'Action'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsSheetOpen(true);
            }}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content Preview */}
        <div className="p-3">
          {getNodePreview() || (
            <p className="text-xs text-gray-400">Double-click to configure</p>
          )}
        </div>
      </div>
      
      {/* Bottom handle for single flow */}
      {!(data.actionType === 'criteria_router' || (data.actionType === 'auto_reply_buttons' && data.config?.messageType === 'button_flow')) && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-md"
        />
      )}

      {/* Right handles for branching */}
      {data.actionType === 'criteria_router' && data.config?.branches?.map((branch: any, idx: number) => (
        <Handle
          key={branch.id}
          type="source"
          position={Position.Right}
          id={branch.id}
          style={{ top: `${(idx + 1) * (100 / (data.config.branches.length + 1))}%` }}
          className="!bg-purple-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-md"
        />
      ))}

      {data.actionType === 'auto_reply_buttons' && data.config?.messageType === 'button_flow' && data.config?.buttons?.map((btn: any, idx: number) => (
        <Handle
          key={btn.id}
          type="source"
          position={Position.Right}
          id={btn.id}
          style={{ top: `${(idx + 1) * (100 / (data.config.buttons.length + 1))}%` }}
          className="!bg-indigo-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-md"
        />
      ))}

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[600px] sm:max-w-[600px] p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Icon className={`h-5 w-5 ${selectedAction?.color || 'text-primary'}`} />
              {selectedAction?.label || 'Configure Action'}
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Action Type Selection */}
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select
                  value={data.actionType}
                  onValueChange={(value) => data.onUpdate({ actionType: value, config: {} })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[400px]">
                    {actionCategories.map((category) => (
                      <div key={category.name}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted sticky top-0">
                          {category.name}
                        </div>
                        {category.actions.map((action) => (
                          <SelectItem key={action.value} value={action.value}>
                            <div className="flex items-center gap-2">
                              <action.icon className={`h-4 w-4 ${category.color}`} />
                              {action.label}
                            </div>
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Action Configuration */}
              {renderActionConfig()}
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" className="text-destructive" onClick={() => setIsSheetOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsSheetOpen(false)}>
                Update Node
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default memo(ActionNode);
