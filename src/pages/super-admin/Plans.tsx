import { useState } from 'react';
import { Plus, Edit, Check, X, CreditCard, Users, Zap, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { mockPlans, Plan } from '@/lib/superAdminMockData';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>(mockPlans);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleToggleStatus = (planId: string) => {
    setPlans(prev => prev.map(p => 
      p.id === planId ? { ...p, status: p.status === 'active' ? 'inactive' : 'active' } : p
    ));
    toast({
      title: 'Plan Updated',
      description: 'Plan status has been changed.',
    });
  };

  const getChannelsList = ['whatsapp', 'rcs', 'sms', 'email', 'instagram', 'facebook'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plans</h1>
          <p className="text-muted-foreground">Configure pricing plans and limits</p>
        </div>
        <Button className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={cn(
              'relative overflow-hidden transition-all hover:shadow-lg',
              plan.status === 'inactive' && 'opacity-60'
            )}
          >
            {plan.name === 'Professional' && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg">
                Popular
              </div>
            )}
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                  {plan.status}
                </Badge>
              </div>
              <CardDescription>
                <span className="text-3xl font-bold text-foreground">${plan.price}</span>
                <span className="text-muted-foreground">/month</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="w-4 h-4 text-primary" />
                <span>{plan.monthlyCredits.toLocaleString()} credits/month</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span>{plan.clientCount} clients</span>
              </div>
              
              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Channels</div>
                <div className="flex flex-wrap gap-1">
                  {plan.channelsAllowed.map((channel) => (
                    <ChannelIcon key={channel} channel={channel as any} className="w-5 h-5" />
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Automations</span>
                  <span>{plan.automationLimit === -1 ? 'Unlimited' : plan.automationLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaigns</span>
                  <span>{plan.campaignLimit === -1 ? 'Unlimited' : plan.campaignLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API Access</span>
                  <span>{plan.apiAccess ? <Check className="w-4 h-4 text-primary" /> : <X className="w-4 h-4 text-muted-foreground" />}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedPlan(plan);
                    setIsEditing(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleToggleStatus(plan.id)}
                >
                  {plan.status === 'active' ? (
                    <ToggleRight className="w-5 h-5 text-primary" />
                  ) : (
                    <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Plan Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Plan: {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Plan Name</Label>
                  <Input defaultValue={selectedPlan.name} />
                </div>
                <div className="space-y-2">
                  <Label>Price ($/month)</Label>
                  <Input type="number" defaultValue={selectedPlan.price} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Monthly Credits</Label>
                <Input type="number" defaultValue={selectedPlan.monthlyCredits} />
              </div>

              <div className="space-y-2">
                <Label>Channels Allowed</Label>
                <div className="flex flex-wrap gap-2">
                  {getChannelsList.map((channel) => (
                    <Button
                      key={channel}
                      variant={selectedPlan.channelsAllowed.includes(channel) ? 'default' : 'outline'}
                      size="sm"
                      className="gap-2"
                    >
                      <ChannelIcon channel={channel as any} className="w-4 h-4" />
                      <span className="capitalize">{channel}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Automation Limit (-1 = unlimited)</Label>
                  <Input type="number" defaultValue={selectedPlan.automationLimit} />
                </div>
                <div className="space-y-2">
                  <Label>Campaign Limit (-1 = unlimited)</Label>
                  <Input type="number" defaultValue={selectedPlan.campaignLimit} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>API Access</Label>
                <Switch defaultChecked={selectedPlan.apiAccess} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button 
              className="gradient-primary"
              onClick={() => {
                toast({ title: 'Plan Updated', description: 'Changes have been saved.' });
                setIsEditing(false);
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
