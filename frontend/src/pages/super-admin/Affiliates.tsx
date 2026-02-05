import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Copy, 
  DollarSign, 
  Users, 
  Link2, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { affiliateApi, type Affiliate } from '@/services/affiliateApi';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminAffiliates() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Dialog States
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    referral_code: '',
  });

  // Scroll functionality
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const fetchAffiliates = async () => {
    setIsLoading(true);
    try {
      const data = await affiliateApi.getAll();
      setAffiliates(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch affiliates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await affiliateApi.create(formData);
      toast({ title: 'Success', description: 'Affiliate added successfully' });
      setIsAddOpen(false);
      setFormData({ name: '', email: '', referral_code: '' });
      fetchAffiliates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAffiliate) return;
    setIsLoading(true);
    try {
      await affiliateApi.update(selectedAffiliate.id, formData);
      toast({ title: 'Success', description: 'Affiliate updated successfully' });
      setIsEditOpen(false);
      fetchAffiliates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this affiliate?')) return;
    setIsDeleting(true);
    try {
      await affiliateApi.delete(id);
      toast({ title: 'Deleted', description: 'Affiliate removed successfully' });
      fetchAffiliates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePayoutStatusAction = async (affiliate: Affiliate, newStatus: Affiliate['payout_status']) => {
    try {
      await affiliateApi.update(affiliate.id, { payout_status: newStatus });
      toast({ title: 'Status Updated', description: `Payout status marked as ${newStatus}` });
      fetchAffiliates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const scrollAmount = 400;
      tableContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (!tableContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - tableContainerRef.current.offsetLeft);
    setScrollLeft(tableContainerRef.current.scrollLeft);
  };

  const onMouseUp = () => setIsDragging(false);

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !tableContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - tableContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    tableContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const filteredAffiliates = (affiliates || []).filter(affiliate => 
    affiliate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    affiliate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    affiliate.referral_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
      case 'pending': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      case 'processing': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const totalSignups = affiliates.reduce((acc, a) => acc + (a.signups || 0), 0);
  const totalActiveClients = affiliates.reduce((acc, a) => acc + (a.active_clients || 0), 0);
  const totalEarnings = affiliates.reduce((acc, a) => acc + (Number(a.commission_earned) || 0), 0);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-muted/20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Affiliate Network</h1>
          <p className="text-muted-foreground mt-1">Manage, track and payout your strategic partners</p>
        </div>
        <Button 
          className="gradient-primary shadow-lg shadow-primary/20 h-11 px-6 font-bold"
          onClick={() => {
            setFormData({ name: '', email: '', referral_code: '' });
            setIsAddOpen(true);
          }}
        >
          <Plus className="w-5 h-5 mr-2" />
          Add New Partner
        </Button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Partners', val: affiliates.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Signups', val: totalSignups, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Clients', val: totalActiveClients, icon: Link2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Payouts', val: `₹${totalEarnings.toLocaleString()}`, icon: CreditCard, color: 'text-amber-600', bg: 'bg-amber-50' }
        ].map((stat, i) => (
          <Card key={i} className="border-none shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</p>
                  <div className={cn("text-3xl font-black", stat.color)}>{stat.val}</div>
                </div>
                <div className={cn("p-3 rounded-2xl group-hover:scale-110 transition-transform", stat.bg)}>
                  <stat.icon className={cn("w-6 h-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search partners, emails, or codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-11 h-12 bg-card border-none shadow-sm rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl border border-border/50">
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-background" onClick={() => handleScroll('left')}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-background" onClick={() => handleScroll('right')}>
            <ChevronRight className="h-5 w-5" />
          </Button>
          <div className="w-[1px] h-4 bg-border mx-1" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-10 px-4 font-semibold" 
            onClick={fetchAffiliates}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <Card className="border-none shadow-xl shadow-black/[0.03] overflow-hidden rounded-3xl">
        <div 
          ref={tableContainerRef}
          className={cn(
            "overflow-x-auto scrollbar-hide scroll-smooth",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onMouseMove={onMouseMove}
        >
          <table className="w-full text-sm text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border/50">
                <th className="px-6 py-5 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Partner Details</th>
                <th className="px-6 py-5 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Referral ID</th>
                <th className="px-6 py-5 font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-center">Signups</th>
                <th className="px-6 py-5 font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-center">Active</th>
                <th className="px-6 py-5 font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-right">Commission</th>
                <th className="px-6 py-5 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Payout Status</th>
                <th className="px-6 py-5 font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Member Since</th>
                <th className="px-6 py-5 font-bold text-muted-foreground uppercase tracking-wider text-[10px] sticky right-0 bg-muted/90 backdrop-blur-md border-l text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && affiliates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary opacity-20" />
                  </td>
                </tr>
              ) : filteredAffiliates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-20 text-center">
                    <p className="text-muted-foreground font-medium">No partners found matching your search</p>
                  </td>
                </tr>
              ) : (
                filteredAffiliates.map((affiliate) => (
                  <tr key={affiliate.id} className="group hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground text-sm">{affiliate.name}</span>
                        <span className="text-xs text-muted-foreground">{affiliate.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <code className="px-2.5 py-1 bg-primary/5 text-primary rounded-lg text-xs font-mono font-bold">
                          {affiliate.referral_code}
                        </code>
                        <button 
                          className="text-muted-foreground hover:text-primary transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(affiliate.referral_code);
                            toast({ title: 'Copied', description: 'Referral code copied' });
                          }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center font-bold">{affiliate.signups || 0}</td>
                    <td className="px-6 py-5 text-center">
                       <Badge variant="secondary" className="bg-muted text-muted-foreground">
                         {affiliate.active_clients || 0} Clients
                       </Badge>
                    </td>
                    <td className="px-6 py-5 text-right font-black text-primary">
                      ₹{Number(affiliate.commission_earned).toLocaleString()}
                    </td>
                    <td className="px-6 py-5">
                      <Badge className={cn("text-[10px] font-black tracking-widest uppercase border", getPayoutStatusColor(affiliate.payout_status))}>
                        {affiliate.payout_status}
                      </Badge>
                    </td>
                    <td className="px-6 py-5 text-muted-foreground text-xs">
                      {format(new Date(affiliate.created_at), 'dd MMM, yyyy')}
                    </td>
                    <td className="px-6 py-5 sticky right-0 bg-background/95 backdrop-blur-md group-hover:bg-muted/10 transition-colors border-l shadow-[-10px_0_15px_-10px_rgba(0,0,0,0.05)] text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5 hover:text-primary">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl shadow-2xl border-none">
                          <DropdownMenuItem className="rounded-xl h-11" onClick={() => {
                            setSelectedAffiliate(affiliate);
                            setIsViewOpen(true);
                          }}>
                            <Eye className="w-4 h-4 mr-3" />
                            View Performance
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl h-11" onClick={() => {
                            setSelectedAffiliate(affiliate);
                            setFormData({ name: affiliate.name, email: affiliate.email, referral_code: affiliate.referral_code });
                            setIsEditOpen(true);
                          }}>
                            <Edit className="w-4 h-4 mr-3" />
                            Edit Details
                          </DropdownMenuItem>
                          <div className="h-[1px] bg-muted my-1 mx-2" />
                          <DropdownMenuItem className="rounded-xl h-11 text-emerald-600" onClick={() => handlePayoutStatusAction(affiliate, 'paid')}>
                            <DollarSign className="w-4 h-4 mr-3" />
                            Mark as Paid
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-xl h-11 text-destructive" onClick={() => handleDelete(affiliate.id)}>
                            <Trash2 className="w-4 h-4 mr-3" />
                            Remove Partner
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Add New Partner</DialogTitle>
            <DialogDescription>Create a new affiliate partnership and generate a unique referral link.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="John Doe" 
                  required 
                  className="h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="john@example.com" 
                  required 
                  className="h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Custom Referral Code (Optional)</Label>
                <Input 
                  id="code" 
                  placeholder="JOHNS20" 
                  className="h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary font-mono"
                  value={formData.referral_code}
                  onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" className="h-11 px-6 rounded-2xl font-bold" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-11 px-6 rounded-2xl font-black gradient-primary shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Partnership
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-[32px] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Edit Partner Details</DialogTitle>
            <DialogDescription>Update affiliate information. Changing the referral code may break existing links.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-6 pt-4">
             <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Full Name</Label>
                <Input 
                  id="edit-name" 
                  required 
                  className="h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email Address</Label>
                <Input 
                  id="edit-email" 
                  type="email" 
                  required 
                  className="h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-code" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Referral Code</Label>
                <Input 
                  id="edit-code" 
                  className="h-12 bg-muted/30 border-none rounded-2xl focus-visible:ring-primary font-mono"
                  value={formData.referral_code}
                  onChange={(e) => setFormData({ ...formData, referral_code: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
            <DialogFooter className="sm:justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" className="h-11 px-6 rounded-2xl font-bold" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-11 px-6 rounded-2xl font-black gradient-primary shadow-lg shadow-primary/20" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Update Partner
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View/Details Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl rounded-[32px] border-none shadow-2xl overflow-hidden p-0">
          {selectedAffiliate && (
            <div className="flex flex-col">
              <div className="bg-primary p-8 text-primary-foreground relative">
                <div className="flex justify-between items-start relative z-10">
                  <div>
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none mb-4 tracking-widest uppercase text-[10px] font-black">
                      Affiliate Partner
                    </Badge>
                    <h2 className="text-4xl font-black tracking-tight">{selectedAffiliate.name}</h2>
                    <p className="opacity-80 mt-1 font-medium">{selectedAffiliate.email}</p>
                  </div>
                  <div className="bg-white/10 p-4 rounded-[24px] backdrop-blur-xl border border-white/20">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                </div>
                <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Commission Earned</p>
                    <p className="text-3xl font-black text-primary">₹{Number(selectedAffiliate.commission_earned).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1 text-center border-x border-border/50">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Signups</p>
                    <p className="text-3xl font-black">{selectedAffiliate.signups || 0}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active Clients</p>
                    <p className="text-3xl font-black">{selectedAffiliate.active_clients || 0}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Referral Performance</Label>
                   {/* Performance Bars Placeholder/Visual */}
                   <div className="space-y-3">
                      {[
                        { label: 'Conversion Rate', val: '12.4%', progress: 65, color: 'bg-blue-500' },
                        { label: 'Renewal Rate', val: '88.0%', progress: 88, color: 'bg-emerald-500' },
                        { label: 'Avg Sale Value', val: '₹4,500', progress: 45, color: 'bg-amber-500' }
                      ].map((item, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span>{item.label}</span>
                            <span className="text-muted-foreground">{item.val}</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div className={cn("h-full rounded-full transition-all duration-1000", item.color)} style={{ width: `${item.progress}%` }} />
                          </div>
                        </div>
                      ))}
                   </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-muted/30 rounded-[28px] border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="p-4 rounded-2xl bg-white shadow-sm">
                      <CreditCard className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Payout Status</p>
                      <Badge className={cn("mt-1 text-xs font-bold uppercase tracking-widest px-3", getPayoutStatusColor(selectedAffiliate.payout_status))}>
                        {selectedAffiliate.payout_status}
                      </Badge>
                    </div>
                  </div>
                  {selectedAffiliate.payout_status !== 'paid' && (
                    <Button 
                      className="rounded-2xl h-12 px-6 font-black gradient-primary shadow-lg shadow-primary/20"
                      onClick={() => handlePayoutStatusAction(selectedAffiliate, 'paid')}
                    >
                      Process Payout
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-6 bg-muted/10 border-t border-border/50 flex justify-end">
                <Button variant="ghost" className="h-11 px-8 rounded-2xl font-bold" onClick={() => setIsViewOpen(false)}>Close Overview</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
