import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Settings, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export const conditionTypes = [
  { value: 'any_message', label: 'Any Message' },
  { value: 'contains_keyword', label: 'Contains Keyword' },
  { value: 'exact_match', label: 'Exact Match' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'regex_match', label: 'Regex Match' },
  { value: 'contact_attribute', label: 'Contact Attribute' },
  { value: 'time_based', label: 'Time Based' },
];

interface ConditionNodeData {
  label: string;
  conditionType: string;
  keywords: string[];
  isCaseSensitive: boolean;
  onUpdate: (data: Partial<ConditionNodeData>) => void;
}

const ConditionNode = ({ data, selected }: NodeProps<ConditionNodeData>) => {
  const showKeywordInput = ['contains_keyword', 'exact_match', 'starts_with', 'ends_with', 'regex_match'].includes(data.conditionType);

  const addKeyword = () => {
    data.onUpdate({ keywords: [...(data.keywords || []), ''] });
  };

  const updateKeyword = (index: number, value: string) => {
    const newKeywords = [...(data.keywords || [])];
    newKeywords[index] = value;
    data.onUpdate({ keywords: newKeywords });
  };

  const removeKeyword = (index: number) => {
    const newKeywords = (data.keywords || []).filter((_, i) => i !== index);
    data.onUpdate({ keywords: newKeywords });
  };

  return (
    <div
      className={`min-w-[280px] bg-card rounded-xl border-2 shadow-lg transition-all ${
        selected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-purple-500/60'
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-card"
      />
      
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-purple-500/10">
            <Settings className="h-5 w-5 text-purple-500" />
          </div>
          <div>
            <span className="font-semibold text-foreground">Condition</span>
            <p className="text-xs text-muted-foreground">Check if...</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Select
            value={data.conditionType}
            onValueChange={(value) => data.onUpdate({ conditionType: value })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select condition type" />
            </SelectTrigger>
            <SelectContent>
              {conditionTypes.map((condition) => (
                <SelectItem key={condition.value} value={condition.value}>
                  {condition.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {showKeywordInput && (
            <>
              <div className="space-y-2">
                {(data.keywords || ['']).map((keyword, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder="Enter keyword..."
                      value={keyword}
                      onChange={(e) => updateKeyword(index, e.target.value)}
                      className="flex-1"
                    />
                    {(data.keywords?.length || 0) > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeKeyword(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={addKeyword}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Keyword
              </Button>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="caseSensitive"
                  checked={data.isCaseSensitive}
                  onCheckedChange={(checked) => data.onUpdate({ isCaseSensitive: !!checked })}
                />
                <Label htmlFor="caseSensitive" className="text-sm">
                  Case Sensitive
                </Label>
              </div>
            </>
          )}
        </div>
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-purple-500 !w-3 !h-3 !border-2 !border-card"
      />
    </div>
  );
};

export default memo(ConditionNode);
