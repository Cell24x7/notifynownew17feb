import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, Plus, X, ChevronRight, MoreVertical } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

export const triggerEvents = [
  { value: 'new_outgoing_message', label: 'New Outgoing Message', channel: 'all' },
  { value: 'new_incoming_message', label: 'New Incoming Message', channel: 'all' },
  { value: 'user_lands_on_bot', label: 'User Lands on Bot (Welcome Event)', channel: 'all' },
  { value: 'new_incoming_from_new_contact', label: 'New Incoming Message From New Contact', channel: 'all' },
  { value: 'conversation_closed', label: 'Conversation Closed', channel: 'all' },
  { value: 'tag_added', label: 'When A Tag is Added', channel: 'all' },
  { value: 'tag_removed', label: 'When A Tag is Removed', channel: 'all' },
  { value: 'webhook_received', label: 'Webhook Received', channel: 'all' },
  { value: 'new_voice_call', label: 'New Voice Call', channel: 'voicebot' },
  { value: 'payment_received_whatsapp', label: 'Payment Received on WhatsApp', channel: 'whatsapp' },
  { value: 'comment_received_post', label: 'Comment Received On A Post', channel: 'instagram' },
  { value: 'razorpay_payment_success', label: 'Razorpay Payment Successful', channel: 'all' },
  { value: 'story_mention', label: 'Story Mention', channel: 'instagram' },
  { value: 'story_reply', label: 'Story Reply', channel: 'instagram' },
  { value: 'order_placed', label: 'Order Placed', channel: 'whatsapp' },
  { value: 'cart_abandoned', label: 'Cart Abandoned', channel: 'whatsapp' },
  { value: 'order_delivered', label: 'Order Delivered', channel: 'whatsapp' },
];

export const triggerConditions = [
  { value: 'exact_match_keywords', label: 'Message text exactly matches any of keywords' },
  { value: 'includes_keywords', label: 'Message text include any of keywords' },
  { value: 'received_individual_chat', label: 'Message Received in Individual Chat' },
  { value: 'excludes_keywords', label: 'Message text exclude any of keywords' },
  { value: 'callback_id_matches', label: 'List/Button Callback ID matches' },
  { value: 'outside_business_hours', label: 'Received outside business hours' },
  { value: 'inside_business_hours', label: 'Received Inside Business Hours' },
  { value: 'new_catalog_order', label: 'New Catalog Order Received' },
  { value: 'first_message_24hrs', label: 'Very first message or message after 24hrs of last message' },
  { value: 'all_messages', label: 'All Messages / No Condition' },
  { value: 'custom_condition', label: 'Custom Condition' },
  { value: 'file_type_matches', label: 'File Type Matches' },
  { value: 'regex_matches', label: 'Message Text Regex Matches' },
  { value: 'message_type', label: 'Message Type' },
  { value: 'template_message', label: 'Template Message' },
];

interface TriggerCondition {
  id: string;
  type: string;
  keywords: string[];
  isCaseSensitive: boolean;
}

interface TriggerNodeData {
  label: string;
  triggerType: string;
  channel: string;
  conditions: TriggerCondition[];
  onUpdate: (data: Partial<TriggerNodeData>) => void;
}

const TriggerNode = ({ data, selected }: NodeProps<TriggerNodeData>) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');

  const conditions = data.conditions || [];
  const selectedTrigger = triggerEvents.find(t => t.value === data.triggerType);

  const addCondition = () => {
    const newCondition: TriggerCondition = {
      id: `cond-${Date.now()}`,
      type: 'exact_match_keywords',
      keywords: [],
      isCaseSensitive: false,
    };
    data.onUpdate({ conditions: [...conditions, newCondition] });
  };

  const removeCondition = (condId: string) => {
    data.onUpdate({ conditions: conditions.filter(c => c.id !== condId) });
  };

  const updateCondition = (condId: string, updates: Partial<TriggerCondition>) => {
    data.onUpdate({
      conditions: conditions.map(c => c.id === condId ? { ...c, ...updates } : c)
    });
  };

  const addKeyword = (condId: string) => {
    if (!newKeyword.trim()) return;
    const condition = conditions.find(c => c.id === condId);
    if (condition) {
      updateCondition(condId, { keywords: [...condition.keywords, newKeyword.trim()] });
      setNewKeyword('');
    }
  };

  const removeKeyword = (condId: string, keyword: string) => {
    const condition = conditions.find(c => c.id === condId);
    if (condition) {
      updateCondition(condId, { keywords: condition.keywords.filter(k => k !== keyword) });
    }
  };

  // Get first condition for preview
  const firstCondition = conditions[0];
  const conditionLabel = firstCondition 
    ? triggerConditions.find(c => c.value === firstCondition.type)?.label 
    : null;

  return (
    <>
      {/* Left handle for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-md !-left-1"
      />
      
      <div
        className={`min-w-[200px] max-w-[280px] bg-white rounded-lg shadow-md transition-all cursor-pointer ${
          selected ? 'ring-2 ring-primary/50 shadow-lg' : ''
        }`}
        onDoubleClick={() => setIsEditorOpen(true)}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
          <span className="font-semibold text-gray-800 text-sm">Trigger</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsEditorOpen(true);
            }}
            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Content Preview */}
        <div className="px-3 py-2 space-y-1">
          {conditionLabel && (
            <div className="text-xs text-gray-500">
              <span className="text-gray-400">Condition:</span>
              <p className="text-gray-700 font-medium truncate">{conditionLabel}</p>
            </div>
          )}
          {firstCondition?.keywords && firstCondition.keywords.length > 0 && (
            <div className="text-xs text-gray-500">
              <span className="text-gray-400">Keywords: </span>
              <span className="text-gray-700">{firstCondition.keywords.join(', ')}</span>
            </div>
          )}
          {!conditionLabel && (
            <p className="text-xs text-gray-400">Double-click to configure</p>
          )}
        </div>
        
        {/* Add button */}
        <div className="absolute -right-2 top-1/2 -translate-y-1/2">
          <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm cursor-pointer hover:bg-primary/90 transition-colors">
            <Plus className="h-3 w-3 text-white" />
          </div>
        </div>
      </div>
      
      {/* Bottom handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-2.5 !h-2.5 !border-2 !border-white !shadow-md"
      />

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] p-0">
          <SheetHeader className="p-6 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-warning" />
              Trigger Node
            </SheetTitle>
          </SheetHeader>
          
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Trigger Event Selection */}
              <div className="space-y-2">
                <Label>Trigger Event</Label>
                <Select
                  value={data.triggerType}
                  onValueChange={(value) => data.onUpdate({ triggerType: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select trigger event" />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerEvents.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trigger Conditions */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Trigger Conditions</Label>
                </div>

                {conditions.map((condition, index) => (
                  <div key={condition.id} className="p-4 bg-muted/50 rounded-lg space-y-3 border">
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium">Condition {index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(condition.id)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <Select
                      value={condition.type}
                      onValueChange={(value) => updateCondition(condition.id, { type: value })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select condition type" />
                      </SelectTrigger>
                      <SelectContent>
                        {triggerConditions.map((tc) => (
                          <SelectItem key={tc.value} value={tc.value}>
                            {tc.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Keywords Input for keyword-based conditions */}
                    {['exact_match_keywords', 'includes_keywords', 'excludes_keywords'].includes(condition.type) && (
                      <div className="space-y-2">
                        <Label className="text-xs">Text keywords</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter keyword..."
                            value={newKeyword}
                            onChange={(e) => setNewKeyword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addKeyword(condition.id)}
                            className="flex-1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addKeyword(condition.id)}
                          >
                            Add
                          </Button>
                        </div>
                        {condition.keywords.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {condition.keywords.map((keyword) => (
                              <Badge
                                key={keyword}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => removeKeyword(condition.id, keyword)}
                              >
                                {keyword}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Checkbox
                            id={`case-${condition.id}`}
                            checked={condition.isCaseSensitive}
                            onCheckedChange={(checked) =>
                              updateCondition(condition.id, { isCaseSensitive: checked as boolean })
                            }
                          />
                          <Label htmlFor={`case-${condition.id}`} className="text-sm">
                            Is Case Sensitive
                          </Label>
                        </div>
                      </div>
                    )}

                    {/* Callback ID input */}
                    {condition.type === 'callback_id_matches' && (
                      <Input
                        placeholder="Enter callback ID..."
                        value={condition.keywords[0] || ''}
                        onChange={(e) => updateCondition(condition.id, { keywords: [e.target.value] })}
                      />
                    )}

                    {/* Regex input */}
                    {condition.type === 'regex_matches' && (
                      <Input
                        placeholder="Enter regex pattern..."
                        value={condition.keywords[0] || ''}
                        onChange={(e) => updateCondition(condition.id, { keywords: [e.target.value] })}
                      />
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                  className="w-full border-dashed text-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Trigger Condition
                </Button>
              </div>
            </div>
          </ScrollArea>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsEditorOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsEditorOpen(false)}>
                Update Node
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default memo(TriggerNode);
