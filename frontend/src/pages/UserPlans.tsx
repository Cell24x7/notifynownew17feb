import { useState, useEffect } from 'react';
import { Check, X, Zap, Users, Loader2, CreditCard } from 'lucide-react';
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

export default function UserPlans({ embedded = false }: { embedded?: boolean }) {
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
    <div className={cn(
      "w-full h-full flex flex-col flex-1 max-w-full",
      !embedded && "p-4 sm:p-8 space-y-10 min-h-[calc(100vh-5rem)]"
    )}>
      {/* Header */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-5 h-5 text-primary" />
              <span className="text-xs font-bold uppercase tracking-widest text-primary">Subscription Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Plans</h1>
            <p className="text-muted-foreground text-base mt-1.5">
              Choose a plan that scales with your business needs.
            </p>
          </div>
        </div>
      )}

      {/* Plans Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary opacity-50" />
          <p className="mt-4 text-muted-foreground font-medium">Loading premium plans...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 bg-muted/20 rounded-3xl border-2 border-dashed">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">No active plans available at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "group relative flex flex-col overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border-muted/20 rounded-3xl",
                plan.name?.toLowerCase() === 'professional' ? "border-primary/30 shadow-md bg-white" : "bg-white"
              )}
            >
              {plan.name?.toLowerCase() === 'professional' && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground font-bold text-[10px] uppercase tracking-widest px-4 py-2 rounded-bl-2xl z-20">
                  Most Popular
                </div>
              )}

              <CardHeader className="pb-4 pt-8 px-8">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="px-3 py-1 rounded-full bg-primary/5 text-primary border-primary/10 text-[10px] uppercase tracking-wider font-bold">
                    Subscription
                  </Badge>
                </div>
                <CardTitle className="text-2xl font-bold capitalize mb-1">{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-black tracking-tight">
                    {"\u20B9"}{Number(plan.price).toLocaleString('en-IN')}
                  </span>
                  <span className="text-muted-foreground text-sm font-semibold">/month</span>
                </div>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col gap-8 px-8 pb-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 group/item">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 transition-colors group-hover/item:bg-emerald-100">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{(plan.monthlyCredits ?? 0).toLocaleString()} Credits</p>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-tighter">Per month included</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 group/item">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 transition-colors group-hover/item:bg-blue-100">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{plan.clientCount ?? 1} Client Accounts</p>
                      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-tighter">Maximum capacity</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-100">
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Automations</span>
                      <span className="font-bold">{plan.automationLimit === -1 ? 'Unlimited' : plan.automationLimit}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Campaigns</span>
                      <span className="font-bold">{plan.campaignLimit === -1 ? 'Unlimited' : plan.campaignLimit}</span>
                   </div>
                   <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground font-medium">Channels</span>
                      <div className="flex gap-1.5">
                        {plan.channelsAllowed?.slice(0, 6).map(c => (
                           <ChannelIcon key={c} channel={c as any} className="w-4 h-4 opacity-70" />
                        ))}
                      </div>
                   </div>
                </div>

                <div className="mt-auto">
                  <Button
                    className={cn(
                      "w-full h-12 rounded-2xl font-bold text-sm transition-all active:scale-[0.98]",
                      plan.name?.toLowerCase() === 'professional' ? "gradient-primary shadow-lg shadow-primary/20" : "bg-slate-900 hover:bg-slate-800 text-white"
                    )}
                    onClick={() => handleViewDetails(plan)}
                  >
                    Get Started
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
                    selectedPlan.channelsAllowed.filter((c: any) => ['whatsapp', 'sms', 'rcs', 'email', 'voicebot'].includes(c)).map((ch) => (
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