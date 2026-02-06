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
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Available Plans</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Choose a plan that suits your needs
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
        /* Responsive Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className="relative overflow-hidden hover:shadow-lg transition-all duration-200"
            >
              {plan.name === 'Professional' && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                  Popular
                </div>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg sm:text-xl">{plan.name}</CardTitle>
                  <Badge variant="secondary">Active</Badge>
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
                  <Zap className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>
                    {(plan.monthlyCredits ?? 0).toLocaleString()} credits/month
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span>{plan.clientCount ?? 1} clients</span>
                </div>

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-2">Channels</div>
                  <div className="flex flex-wrap gap-2">
                    {plan.channelsAllowed.length === 0 ? (
                      <span className="text-muted-foreground text-xs">None</span>
                    ) : (
                      plan.channelsAllowed.map((channel) => (
                        <div
                          key={channel}
                          className="flex items-center gap-1 bg-muted px-2 py-1 rounded-full text-xs"
                        >
                          <ChannelIcon channel={channel as any} className="w-4 h-4" />
                          <span className="capitalize">{channel}</span>
                        </div>
                      ))
                    )}
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
                    <span>
                      {plan.apiAccess ? (
                        <Check className="inline w-4 h-4 text-green-500" />
                      ) : (
                        <X className="inline w-4 h-4 text-muted-foreground" />
                      )}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full gradient-primary mt-4"
                  onClick={() => handleViewDetails(plan)}
                >
                  View Details & Buy
                </Button>
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
                    ${Number(selectedPlan.price).toFixed(2)}/month
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
                    selectedPlan.channelsAllowed.map((ch) => (
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