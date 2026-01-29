import { useState } from 'react';
import { Search, Plus, Copy, DollarSign, Users, Link2, MoreVertical, Eye, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { mockAffiliates, Affiliate } from '@/lib/superAdminMockData';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminAffiliates() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [affiliates] = useState<Affiliate[]>(mockAffiliates);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const filteredAffiliates = affiliates.filter(affiliate => 
    affiliate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    affiliate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    affiliate.referralCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPayoutStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-primary/10 text-primary';
      case 'pending': return 'bg-warning/10 text-warning';
      case 'processing': return 'bg-secondary/10 text-secondary';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: `Referral code ${code} copied to clipboard`,
    });
  };

  const totalSignups = affiliates.reduce((acc, a) => acc + a.signups, 0);
  const totalActiveClients = affiliates.reduce((acc, a) => acc + a.activeClients, 0);
  const totalEarnings = affiliates.reduce((acc, a) => acc + a.commissionEarned, 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Affiliates</h1>
          <p className="text-muted-foreground">Manage affiliate partners and referrals</p>
        </div>
        <Button className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Add Affiliate
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Link2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Affiliates</div>
                <div className="text-xl font-bold">{affiliates.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Signups</div>
                <div className="text-xl font-bold">{totalSignups}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Active Clients</div>
                <div className="text-xl font-bold">{totalActiveClients}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total Earnings</div>
                <div className="text-xl font-bold">${totalEarnings.toLocaleString()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search affiliates or referral codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Affiliates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Referral Code</TableHead>
                <TableHead className="text-right">Signups</TableHead>
                <TableHead className="text-right">Active Clients</TableHead>
                <TableHead className="text-right">Earnings</TableHead>
                <TableHead>Payout Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAffiliates.map((affiliate) => (
                <TableRow key={affiliate.id}>
                  <TableCell className="font-medium">{affiliate.name}</TableCell>
                  <TableCell className="text-muted-foreground">{affiliate.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {affiliate.referralCode}
                      </code>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6"
                        onClick={() => handleCopyCode(affiliate.referralCode)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{affiliate.signups}</TableCell>
                  <TableCell className="text-right">{affiliate.activeClients}</TableCell>
                  <TableCell className="text-right font-medium text-primary">
                    ${affiliate.commissionEarned.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', getPayoutStatusColor(affiliate.payoutStatus))}>
                      {affiliate.payoutStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(affiliate.createdAt), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedAffiliate(affiliate);
                          setIsViewOpen(true);
                        }}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <DollarSign className="w-4 h-4 mr-2" />
                          Process Payout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Affiliate Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              {selectedAffiliate?.name}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAffiliate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <div className="font-medium">{selectedAffiliate.email}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Referral Code</Label>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                      {selectedAffiliate.referralCode}
                    </code>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleCopyCode(selectedAffiliate.referralCode)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{selectedAffiliate.signups}</div>
                    <div className="text-xs text-muted-foreground">Signups</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold">{selectedAffiliate.activeClients}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <div className="text-2xl font-bold text-primary">${selectedAffiliate.commissionEarned.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Earned</div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="text-sm text-muted-foreground">Payout Status</div>
                  <Badge className={cn('mt-1', getPayoutStatusColor(selectedAffiliate.payoutStatus))}>
                    {selectedAffiliate.payoutStatus}
                  </Badge>
                </div>
                {selectedAffiliate.payoutStatus === 'pending' && (
                  <Button variant="outline" className="text-primary border-primary hover:bg-primary/10">
                    Process Payout
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
