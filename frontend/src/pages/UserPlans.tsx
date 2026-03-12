import { useState, useEffect } from 'react';
import { Check, X, Zap, Users, Loader2 } from 'lucide-react';
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
import { ChannelIcon } from '@/components/ui/channel-icon';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { API_BASE_URL } from '@/config/api';

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

export default function UserPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/api/plans`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();

        // Safe mapping from backend camelCase (as returned by routes/plans.js) to frontend
        const mapped = data.map((p: any) => ({
          id: p.id,
          name: p.name || 'Unnamed Plan',
          price: Number(p.price || 0),
          monthlyCredits: Number(p.monthlyCredits || 0),
          clientCount: Number(p.clientCount || 1),
          channelsAllowed: Array.isArray(p.channelsAllowed) ? p.channelsAllowed : [],
          automationLimit: Number(p.automationLimit ?? -1),
          campaignLimit: Number(p.campaignLimit ?? -1),
          apiAccess: Boolean(p.apiAccess),
          status: p.status || 'active',
        }));

        setPlans(mapped);
      } catch (err) {
        console.error('Failed to load plans:', err);
        toast({
          variant: "destructive",
          title: "Cannot load plans",
          description: "Please check your connection or try again later.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [toast]);

  const handleViewDetails = (plan: Plan) => {
    setSelectedPlan(plan);
    setDetailsOpen(true);
  };

  const handleBuyNow = () => {
    if (!selectedPlan) return;

    toast({
      title: "Redirecting to Payment",
      description: `Proceeding with ${selectedPlan.name} plan...`,
    });

    setDetailsOpen(false);

    // TODO: Integrate real payment gateway (Stripe / Razorpay)
    // Example:
    // window.location.href = `/payment?planId=${selectedPlan.id}`;
  };

  return (
    <div className="w-full h-full flex flex-col flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-full min-h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Available Plans</h1>
          <p className="text-muted-foreground text-base mt-1.5">
            Choose a plan that scales with your business needs.
          </p>
        </div>
      </div>

      {/* Loading / Empty / Error State */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-3 text-muted-foreground">Loading plans...</span>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No active plans available at the moment.
        </div>
      ) : (
        /* Responsive Grid - Optimized for all devices */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch pt-2">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md border",
                plan.name?.toLowerCase() === 'professional' ? "border-primary shadow-sm bg-primary/[0.02]" : "border-border hover:border-primary/40"
              )}
            >
              {plan.name?.toLowerCase() === 'professional' && (
                <div className="absolute top-0 right-0 bg-primary leading-none text-primary-foreground text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-bl-lg z-10">
                  Popular
                </div>
              )}

              <CardHeader className="pb-4 pt-6 px-5">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                  <CardTitle className="text-lg sm:text-xl font-bold capitalize text-primary">{plan.name}</CardTitle>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                    {"\u20B9"}{Number(plan.price).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground text-sm font-medium">/ mo</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-4 text-sm pb-6 px-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5 text-[14px]">
                    <Zap className="w-4 h-4 text-primary opacity-80" />
                    <span>
                      <strong className="font-semibold text-foreground">{(plan.monthlyCredits ?? 0).toLocaleString()}</strong> credits / mo
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-[14px]">
                    <Users className="w-4 h-4 text-muted-foreground opacity-80" />
                    <span><strong className="font-semibold text-foreground">{plan.clientCount ?? 1}</strong> clients included</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Channels</div>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.channelsAllowed.length === 0 ? (
                      <span className="text-muted-foreground/70 text-xs italic">No channels assigned</span>
                    ) : (
                      plan.channelsAllowed.filter((c: any) => ['whatsapp', 'sms', 'rcs'].includes(c)).map((channel) => (
                        <div
                          key={channel}
                          className="flex items-center gap-1 bg-secondary/40 border border-secondary/60 px-2 py-1 rounded text-xs font-medium text-slate-800 dark:text-slate-200"
                        >
                          <ChannelIcon channel={channel as any} className="w-3 h-3" />
                          <span className="capitalize">{channel}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/60 space-y-2">
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-muted-foreground">Automations</span>
                    <span className="font-medium">{plan.automationLimit === -1 ? 'Unlimited' : plan.automationLimit}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-muted-foreground">Campaigns</span>
                    <span className="font-medium">{plan.campaignLimit === -1 ? 'Unlimited' : plan.campaignLimit}</span>
                  </div>
                  <div className="flex justify-between items-center text-[13px]">
                    <span className="text-muted-foreground">API Access</span>
                    <span className="font-medium">
                      {plan.apiAccess ? (
                        <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded text-[11px]"><Check className="w-3 h-3" /> Yes</span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[11px]"><X className="w-3 h-3" /> No</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <Button
                    className={cn("w-full shadow-sm active:scale-[0.98] transition-all",
                      plan.name?.toLowerCase() === 'professional' ? "gradient-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    )}
                    variant={plan.name?.toLowerCase() === 'professional' ? 'default' : 'secondary'}
                    onClick={() => handleViewDetails(plan)}
                  >
                    View Details & Buy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Plan Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.name || 'Plan'} Details</DialogTitle>
            <DialogDescription>
              All features and limits included in this plan.
            </DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-5 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <p className="font-bold text-lg">
                    {"\u20B9"}{Number(selectedPlan.price).toFixed(2)}/month
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Monthly Credits</span>
                  <p className="font-medium">
                    {(selectedPlan.monthlyCredits ?? 0).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-sm text-muted-foreground">Max Clients</span>
                <p className="font-medium">{selectedPlan.clientCount ?? 1}</p>
              </div>

              <div className="pt-2 border-t">
                <div className="text-xs text-muted-foreground mb-2">Channels Allowed</div>
                <div className="flex flex-wrap gap-2">
                  {selectedPlan.channelsAllowed.length === 0 ? (
                    <span className="text-muted-foreground text-sm">None</span>
                  ) : (
                    selectedPlan.channelsAllowed.filter((c: any) => ['whatsapp', 'sms', 'rcs'].includes(c)).map((ch) => (
                      <div
                        key={ch}
                        className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full text-sm"
                      >
                        <ChannelIcon channel={ch as any} className="w-4 h-4" />
                        <span className="capitalize">{ch}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-2 border-t space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Automations</span>
                  <span className="font-medium">
                    {selectedPlan.automationLimit === -1 ? 'Unlimited' : selectedPlan.automationLimit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Campaigns</span>
                  <span className="font-medium">
                    {selectedPlan.campaignLimit === -1 ? 'Unlimited' : selectedPlan.campaignLimit}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">API Access</span>
                  <span>
                    {selectedPlan.apiAccess ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <X className="w-5 h-5 text-muted-foreground" />
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            <Button className="gradient-primary" onClick={handleBuyNow}>
              Buy Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}