import { useState, useEffect } from 'react';
import { Plus, Edit, Trash, Check, X, Zap, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ChannelIcon } from '@/components/ui/channel-icon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { API_BASE_URL } from '@/config/api';

const planSchema = z.object({
  name: z.string().min(2, "Plan name must be at least 2 characters"),
  price: z.number().min(0, "Price cannot be negative"),
  monthly_credits: z.number().min(0, "Monthly credits cannot be negative"),
  client_count: z.number().min(1, "At least 1 client required"),
  channels_allowed: z.array(z.string()).min(1, "Select at least one channel"),
  automation_limit: z.number().int("Must be a valid number"),
  campaign_limit: z.number().int("Must be a valid number"),
  api_access: z.boolean(),
});

type PlanFormValues = z.infer<typeof planSchema>;

type Plan = {
  id: string;
  name: string;
  price: number;
  monthlyCredits: number;
  clientCount: number;
  channelsAllowed: string[];
  automationLimit: number;
  campaignLimit: number;
  apiAccess: boolean;
  status: 'active' | 'inactive';
};

const channelsList = ['whatsapp', 'rcs', 'sms'];

export default function SuperAdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      price: 0,
      monthly_credits: 0,
      client_count: 1,
      channels_allowed: [],
      automation_limit: -1,
      campaign_limit: -1,
      api_access: false,
    },
  });

  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = form;
  const watchedChannels = watch('channels_allowed');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/plans?admin=true`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Map backend camelCase (from routes/plans.js) → frontend camelCase
      const mappedPlans: Plan[] = data.map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        monthlyCredits: Number(p.monthlyCredits || 0),
        clientCount: Number(p.clientCount || 1),
        channelsAllowed: Array.isArray(p.channelsAllowed) ? p.channelsAllowed : [],
        automationLimit: Number(p.automationLimit ?? -1),
        campaignLimit: Number(p.campaignLimit ?? -1),
        apiAccess: Boolean(p.apiAccess),
        status: p.status || 'active',
      }));

      setPlans(mappedPlans);
    } catch (err) {
      console.error("Fetch plans failed:", err);
      toast({
        variant: "destructive",
        title: "Failed to load plans",
        description: "Please check your connection or try again later.",
      });
    }
  };

  const onSubmit = async (data: PlanFormValues) => {
    try {
      const url = isCreating
        ? `${API_BASE_URL}/api/plans`
        : `${API_BASE_URL}/api/plans/${form.getValues('id') || ''}`;

      const method = isCreating ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || errData.error || `HTTP ${res.status}`);
      }

      const result = await res.json();

      // map new/updated plan
      const updatedPlan: Plan = {
        id: result.id || form.getValues('id'),
        name: result.name,
        price: Number(result.price),
        monthlyCredits: Number(result.monthlyCredits),
        clientCount: Number(result.clientCount),
        channelsAllowed: result.channelsAllowed || [],
        automationLimit: Number(result.automationLimit),
        campaignLimit: Number(result.campaignLimit),
        apiAccess: Boolean(result.apiAccess),
        status: result.status || 'active',
      };

      setPlans((prev) =>
        isCreating
          ? [...prev, updatedPlan]
          : prev.map((p) => (p.id === updatedPlan.id ? updatedPlan : p))
      );

      toast({
        title: isCreating ? "New Plan Created" : "Plan Updated",
        description: isCreating
          ? `Plan "${data.name}" has been successfully created.`
          : `Plan "${data.name}" has been updated successfully.`,
        variant: "default",
      });

      setIsEditing(false);
      setIsCreating(false);
      reset();
    } catch (err: any) {
      console.error("Submit failed:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to save plan. Please try again.",
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!planToDelete) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/plans/${planToDelete}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setPlans((prev) => prev.filter((p) => p.id !== planToDelete));

      toast({
        title: "Plan Deleted",
        description: "The plan has been successfully removed.",
      });
    } catch (err) {
      console.error("Delete failed:", err);
      toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete the plan. Please try again.",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setPlanToDelete(null);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/plans/${id}/toggle`, {
        method: 'PATCH',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const { status } = await res.json();

      setPlans((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status } : p))
      );

      toast({
        title: "Status Updated",
        description: `Plan status changed to ${status}.`,
      });
    } catch (err) {
      console.error("Toggle failed:", err);
      toast({
        variant: "destructive",
        title: "Toggle Failed",
        description: "Could not update status. Please try again.",
      });
    }
  };

  const openCreate = () => {
    reset();
    setIsCreating(true);
    setIsEditing(true);
  };

  const openEdit = (plan: Plan) => {
    reset({
      name: plan.name,
      price: plan.price,
      monthly_credits: plan.monthlyCredits,
      client_count: plan.clientCount,
      channels_allowed: plan.channelsAllowed,
      automation_limit: plan.automationLimit,
      campaign_limit: plan.campaignLimit,
      api_access: plan.apiAccess,
    });
    setValue('id', plan.id);
    setIsCreating(false);
    setIsEditing(true);
  };

  const toggleChannel = (channel: string) => {
    const current = watchedChannels || [];
    const updated = current.includes(channel)
      ? current.filter((c) => c !== channel)
      : [...current, channel];
    setValue('channels_allowed', updated, { shouldValidate: true });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Plans</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Configure pricing plans and limits
          </p>
        </div>
        <Button className="gradient-primary w-full sm:w-auto" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      {/* Plans Grid - Fully Responsive */}
      {plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No plans found. Create your first plan!
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative overflow-hidden transition-all hover:shadow-lg",
                plan.status === 'inactive' && "opacity-60"
              )}
            >
              {plan.name === 'Professional' && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg">
                  Popular
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <Badge variant={plan.status === 'active' ? 'default' : 'secondary'}>
                    {plan.status}
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  <span className="text-2xl sm:text-3xl font-bold text-foreground">
                    ${Number(plan.price).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  <span>
                    {(plan.monthlyCredits ?? 0).toLocaleString()} credits/month
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{plan.clientCount ?? 1} clients</span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Channels</div>
                  <div className="flex flex-wrap gap-2">
                    {plan.channelsAllowed.filter(c => ['whatsapp', 'sms', 'rcs'].includes(c)).map((channel) => (
                      <div
                        key={channel}
                        className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs"
                      >
                        <ChannelIcon channel={channel as any} className="w-4 h-4" />
                        <span className="capitalize">{channel}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t space-y-2">
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
                    <span>
                      {plan.apiAccess ? (
                        <Check className="inline w-4 h-4 text-green-500" />
                      ) : (
                        <X className="inline w-4 h-4 text-muted-foreground" />
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[80px]"
                    onClick={() => openEdit(plan)}
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

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive/90"
                    onClick={() => {
                      setPlanToDelete(plan.id);
                      setDeleteConfirmOpen(true);
                    }}
                  >
                    <Trash className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog - Responsive */}
      <Dialog open={isEditing} onOpenChange={(open) => {
        if (!open) {
          setIsEditing(false);
          setIsCreating(false);
          reset();
        }
      }}>
        <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Create New Plan' : 'Edit Plan'}</DialogTitle>
            <DialogDescription>
              {isCreating
                ? 'Fill in the details to create a new pricing plan.'
                : 'Update the plan details below.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">Price ($/month)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                />
                {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monthly_credits">Monthly Credits</Label>
              <Input
                id="monthly_credits"
                type="number"
                {...register('monthly_credits', { valueAsNumber: true })}
              />
              {errors.monthly_credits && (
                <p className="text-sm text-destructive">{errors.monthly_credits.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client_count">Max Clients</Label>
              <Input
                id="client_count"
                type="number"
                {...register('client_count', { valueAsNumber: true })}
              />
              {errors.client_count && (
                <p className="text-sm text-destructive">{errors.client_count.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Channels Allowed</Label>
              <div className="flex flex-wrap gap-2">
                {channelsList.map((channel) => (
                  <Button
                    key={channel}
                    type="button"
                    variant={watchedChannels?.includes(channel) ? 'default' : 'outline'}
                    size="sm"
                    className="gap-2"
                    onClick={() => toggleChannel(channel)}
                  >
                    <ChannelIcon channel={channel as any} className="w-4 h-4" />
                    <span className="capitalize">{channel}</span>
                  </Button>
                ))}
              </div>
              {errors.channels_allowed && (
                <p className="text-sm text-destructive">{errors.channels_allowed.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="automation_limit">Automation Limit (-1 = unlimited)</Label>
                <Input
                  id="automation_limit"
                  type="number"
                  {...register('automation_limit', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="campaign_limit">Campaign Limit (-1 = unlimited)</Label>
                <Input
                  id="campaign_limit"
                  type="number"
                  {...register('campaign_limit', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <Label htmlFor="api_access">API Access</Label>
              <Switch
                id="api_access"
                checked={watch('api_access')}
                onCheckedChange={(checked) => setValue('api_access', checked)}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button type="submit" className="gradient-primary min-w-[120px]">
                {isCreating ? 'Create Plan' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this plan? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}