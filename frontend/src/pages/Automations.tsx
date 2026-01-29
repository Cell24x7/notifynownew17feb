import { useState } from 'react';
import { Plus, Search, Play, Pause, Copy, Trash2, Zap, MoreVertical, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { mockAutomations, type Automation } from '@/lib/mockData';
import { formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import AutomationBuilder from '@/components/automation/AutomationBuilder';

const triggerTypes = [
  { value: 'new_message', label: 'New Message' },
  { value: 'new_contact', label: 'New Contact' },
  { value: 'keyword', label: 'Keyword Match' },
  { value: 'order_placed', label: 'Order Placed' },
  { value: 'cart_abandoned', label: 'Cart Abandoned' },
  { value: 'order_delivered', label: 'Order Delivered' },
];

const channels = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook Messenger' },
  { value: 'sms', label: 'SMS' },
  { value: 'email', label: 'Email' },
  { value: 'rcs', label: 'RCS' },
  { value: 'voicebot', label: 'Voice Bot' },
];

export default function Automations() {
  const [automations, setAutomations] = useState<Automation[]>(mockAutomations);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [newAutomation, setNewAutomation] = useState({
    name: '',
    trigger: 'new_message',
    channel: 'whatsapp',
  });
  const { toast } = useToast();

  const filteredAutomations = automations.filter((automation) =>
    automation.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateAutomation = () => {
    const automation: Automation = {
      id: Date.now().toString(),
      name: newAutomation.name,
      trigger: triggerTypes.find((t) => t.value === newAutomation.trigger)?.label || 'New Message',
      status: 'draft',
      triggerCount: 0,
      createdAt: new Date(),
    };
    setAutomations([automation, ...automations]);
    setIsCreateOpen(false);
    setSelectedAutomation(automation);
    setIsBuilderOpen(true);
    toast({
      title: 'Automation created',
      description: 'Now configure your automation workflow.',
    });
  };

  const handleStatusChange = (automationId: string, newStatus: Automation['status']) => {
    setAutomations(automations.map((a) => (a.id === automationId ? { ...a, status: newStatus } : a)));
    toast({
      title: 'Automation updated',
      description: `Automation is now ${newStatus}.`,
    });
  };

  const handleDuplicate = (automation: Automation) => {
    const duplicate: Automation = {
      ...automation,
      id: Date.now().toString(),
      name: `${automation.name} (Copy)`,
      status: 'draft',
      triggerCount: 0,
      createdAt: new Date(),
    };
    setAutomations([duplicate, ...automations]);
    toast({
      title: 'Automation duplicated',
      description: 'A copy has been created.',
    });
  };

  const handleDelete = (automationId: string) => {
    setAutomations(automations.filter((a) => a.id !== automationId));
    toast({
      title: 'Automation deleted',
      description: 'The automation has been removed.',
    });
  };

  const handleBuilderSave = (data: { name: string; channel: string; nodes: any[]; edges: any[] }) => {
    if (selectedAutomation) {
      setAutomations(automations.map((a) => 
        a.id === selectedAutomation.id 
          ? { ...a, name: data.name, status: 'active' as const }
          : a
      ));
    }
    setIsBuilderOpen(false);
    setSelectedAutomation(null);
  };

  // Show full-screen builder when active
  if (isBuilderOpen) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <AutomationBuilder
          automationId={selectedAutomation?.id}
          automationName={selectedAutomation?.name || newAutomation.name}
          onClose={() => {
            setIsBuilderOpen(false);
            setSelectedAutomation(null);
          }}
          onSave={handleBuilderSave}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Automations</h1>
          <p className="text-muted-foreground">Create and manage automated workflows</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Automation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Automation Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Welcome New Customers"
                  value={newAutomation.name}
                  onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Channel / Service Integration</Label>
                <Select
                  value={newAutomation.channel}
                  onValueChange={(value) => setNewAutomation({ ...newAutomation, channel: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {channels.map((channel) => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="trigger">Trigger Event</Label>
                <Select
                  value={newAutomation.trigger}
                  onValueChange={(value) => setNewAutomation({ ...newAutomation, trigger: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {triggerTypes.map((trigger) => (
                      <SelectItem key={trigger.value} value={trigger.value}>
                        {trigger.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateAutomation} 
                  className="gradient-primary"
                  disabled={!newAutomation.name}
                >
                  Create
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Automations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAutomations.map((automation) => (
          <Card key={automation.id} className="card-elevated animate-slide-up">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{automation.name}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4 text-warning" />
                    {automation.trigger}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setSelectedAutomation(automation);
                      setIsBuilderOpen(true);
                    }}>
                      <Settings className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDuplicate(automation)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(automation.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <StatusBadge status={automation.status} />
                <div className="text-sm text-muted-foreground">
                  {automation.triggerCount.toLocaleString()} triggers
                </div>
              </div>

              {automation.lastTriggered && (
                <p className="text-xs text-muted-foreground">
                  Last triggered {formatDistanceToNow(automation.lastTriggered, { addSuffix: true })}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                {automation.status === 'active' ? (
                  <Button
                    variant="outline"
                    className="flex-1"
                    size="sm"
                    onClick={() => handleStatusChange(automation.id, 'paused')}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                ) : (
                  <Button
                    className="flex-1 gradient-primary"
                    size="sm"
                    onClick={() => handleStatusChange(automation.id, 'active')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Activate
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAutomation(automation);
                    setIsBuilderOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAutomations.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Zap className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No automations found</h3>
          <p className="text-muted-foreground">Create your first automation to get started</p>
        </div>
      )}
    </div>
  );
}
