import { useState } from 'react';
import { 
  Zap, Settings, Play, MessageSquare, Clock, 
  Tag, UserPlus, Webhook, CreditCard, ShoppingCart, 
  Sparkles, Bot, Users, Shield, Mail, Phone,
  FileText, Database, Send, Link, Bell, X,
  Search, Rss, PhoneCall, PhoneOff, UserX,
  Eye, EyeOff, Code, Table, Star, CircleStop, Smile, List
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface NodePanelProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
  onClose?: () => void;
}

const nodeCategories: { name: string; nodes: { type: string; subType?: string; label: string; icon: any; color: string; bg: string; description?: string }[] }[] = [
  {
    name: 'Starting Point',
    nodes: [
      { type: 'trigger', label: 'Trigger Node', icon: Play, color: 'text-warning', bg: 'bg-warning/10', description: 'Start the automation' },
    ],
  },
  {
    name: 'Workflow',
    nodes: [
      { type: 'condition', subType: 'criteria_router', label: 'Criteria Router', icon: Link, color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { type: 'action', subType: 'jump_to_automation', label: 'Jump To Automation', icon: Code, color: 'text-purple-500', bg: 'bg-purple-500/10' },
      { type: 'action', subType: 'delay', label: 'Delay Execution', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    ],
  },
  {
    name: 'Messaging',
    nodes: [
      { type: 'action', subType: 'auto_reply_template', label: 'Auto Reply Template Message', icon: MessageSquare, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { type: 'action', subType: 'auto_reply_buttons', label: 'Auto Reply Buttons/Options/Products', icon: List, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      { type: 'action', subType: 'auto_reply_collect_inputs', label: 'Auto Reply and Collect User Inputs', icon: FileText, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    ],
  },
  {
    name: 'Customer Interaction',
    nodes: [
      { type: 'action', subType: 'add_to_drip', label: 'Add To Drip Campaign', icon: Rss, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'remove_from_drip', label: 'Remove From Drip Campaign', icon: Rss, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'add_to_campaign', label: 'Add To Campaign', icon: Rss, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'remove_from_campaign', label: 'Remove From Campaign', icon: Rss, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'create_whatsapp_payment', label: 'Create Whatsapp Payment', icon: CreditCard, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'add_contact_to_list', label: 'Add Contact to List', icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'set_contact_attribute', label: 'Set Contact Attribute', icon: Database, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'set_conversation_status', label: 'Set Conversation Status', icon: Eye, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'send_email_notification', label: 'Send Email Notification', icon: Mail, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'mark_blacklisted', label: 'Mark Blacklisted', icon: UserX, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'forward_call', label: 'Forward Call', icon: PhoneCall, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'terminate_call', label: 'Terminate Call', icon: PhoneOff, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'assign_to_team_member', label: 'Assign To Team Member', icon: UserPlus, color: 'text-green-500', bg: 'bg-green-500/10' },
      { type: 'action', subType: 'unassign_from_team', label: 'Unassign From Team', icon: Users, color: 'text-green-500', bg: 'bg-green-500/10' },
    ],
  },
  {
    name: 'Security',
    nodes: [
      { type: 'action', subType: 'hide_file', label: 'Hide The File', icon: EyeOff, color: 'text-red-500', bg: 'bg-red-500/10' },
      { type: 'action', subType: 'mask_text_regex', label: 'Mask The Text Messages As Per Regex', icon: Shield, color: 'text-red-500', bg: 'bg-red-500/10' },
    ],
  },
  {
    name: 'Technical',
    nodes: [
      { type: 'action', subType: 'call_rest_api', label: 'Call REST API', icon: Webhook, color: 'text-gray-500', bg: 'bg-gray-500/10' },
      { type: 'action', subType: 'eval', label: 'Eval', icon: Code, color: 'text-gray-500', bg: 'bg-gray-500/10' },
    ],
  },
  {
    name: 'Tagging',
    nodes: [
      { type: 'action', subType: 'add_tags', label: 'Add Tags', icon: Tag, color: 'text-orange-500', bg: 'bg-orange-500/10' },
      { type: 'action', subType: 'remove_tags', label: 'Remove Tags', icon: X, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    ],
  },
  {
    name: 'WhatsApp Chat Commerce',
    nodes: [
      { type: 'action', subType: 'send_cart_confirmation', label: 'Send Cart Confirmation Message', icon: ShoppingCart, color: 'text-teal-500', bg: 'bg-teal-500/10' },
      { type: 'action', subType: 'send_whatsapp_notification', label: 'Send WhatsApp Notification', icon: Bell, color: 'text-teal-500', bg: 'bg-teal-500/10' },
    ],
  },
  {
    name: 'Zoho CRM',
    nodes: [
      { type: 'action', subType: 'create_zoho_lead', label: 'Create a Zoho CRM Lead', icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { type: 'action', subType: 'send_attachment_zoho', label: 'Send Attachment To Zoho CRM', icon: FileText, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
      { type: 'action', subType: 'set_zoho_file_attributes', label: 'Set Zoho Lead File Upload Attributes', icon: Database, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    ],
  },
  {
    name: 'Google Sheets',
    nodes: [
      { type: 'action', subType: 'add_google_sheet_row', label: 'Add new row in google sheet', icon: Table, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ],
  },
  {
    name: 'ChatGPT',
    nodes: [
      { type: 'action', subType: 'ask_chatgpt', label: 'Ask ChatGPT Assistant', icon: Sparkles, color: 'text-pink-500', bg: 'bg-pink-500/10' },
    ],
  },
  {
    name: 'CSAT',
    nodes: [
      { type: 'action', subType: 'start_csat_flow', label: 'Start CSAT Flow', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
      { type: 'action', subType: 'end_csat_flow', label: 'End CSAT Flow', icon: CircleStop, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
      { type: 'action', subType: 'capture_csat', label: 'Capture CSAT', icon: Smile, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    ],
  },
];

export default function NodePanel({ onDragStart, onClose }: NodePanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = nodeCategories.map(category => ({
    ...category,
    nodes: category.nodes.filter(node => 
      node.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.nodes.length > 0);

  return (
    <div className="w-72 bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Nodes</h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search node..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {filteredCategories.map((category) => (
            <div key={category.name}>
              <div className="text-xs font-semibold text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                {category.name}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {category.nodes.map((node) => (
                  <Card
                    key={`${node.type}-${node.subType || 'default'}-${node.label}`}
                    className="p-2.5 cursor-grab hover:shadow-md transition-all hover:border-primary/50 active:cursor-grabbing"
                    draggable
                    onDragStart={(e) => onDragStart(e, JSON.stringify({ type: node.type, subType: node.subType }))}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={`p-2 rounded-lg ${node.bg}`}>
                        <node.icon className={`h-4 w-4 ${node.color}`} />
                      </div>
                      <span className="text-xs font-medium leading-tight line-clamp-2">
                        {node.label}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
