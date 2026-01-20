import { useState } from 'react';
import { Shield, Check, X, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { mockRolePermissions, mockPlans } from '@/lib/superAdminMockData';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function SuperAdminRoles() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>('plan-3');
  const [permissions, setPermissions] = useState(mockRolePermissions);

  const handleTogglePermission = (feature: string, role: 'admin' | 'manager' | 'agent') => {
    setPermissions(prev => prev.map(p => 
      p.feature === feature ? { ...p, [role]: !p[role] } : p
    ));
    toast({
      title: 'Permission Updated',
      description: `${feature} - ${role} permission changed`,
    });
  };

  const selectedPlanData = mockPlans.find(p => p.id === selectedPlan);

  const groupedPermissions = {
    'Chat': permissions.filter(p => p.feature.startsWith('Chat')),
    'Campaign': permissions.filter(p => p.feature.startsWith('Campaign')),
    'Automation': permissions.filter(p => p.feature.startsWith('Automation')),
    'Integration': permissions.filter(p => p.feature.startsWith('Integration')),
    'Reports': permissions.filter(p => p.feature.startsWith('Reports')),
    'Settings': permissions.filter(p => p.feature.startsWith('Settings')),
    'Users': permissions.filter(p => p.feature.startsWith('Users')),
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground">Configure role-based access per plan</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Viewing for:</span>
          <Select value={selectedPlan} onValueChange={setSelectedPlan}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {mockPlans.filter(p => p.status === 'active').map(plan => (
                <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plan Info */}
      {selectedPlanData && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="font-semibold">{selectedPlanData.name} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    ${selectedPlanData.price}/month • {selectedPlanData.clientCount} clients using this plan
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                <Info className="w-3 h-3 mr-1" />
                Permissions are plan-specific
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Legend */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span className="text-sm font-medium">Admin</span>
          <span className="text-xs text-muted-foreground">Full access</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-secondary"></div>
          <span className="text-sm font-medium">Manager</span>
          <span className="text-xs text-muted-foreground">Team lead access</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-muted-foreground"></div>
          <span className="text-sm font-medium">Agent</span>
          <span className="text-xs text-muted-foreground">Basic access</span>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([group, perms]) => (
          <Card key={group}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{group}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Feature</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    <TableHead className="text-center">Manager</TableHead>
                    <TableHead className="text-center">Agent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perms.map((perm) => (
                    <TableRow key={perm.feature}>
                      <TableCell className="font-medium">
                        {perm.feature.split(' - ')[1] || perm.feature}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch 
                            checked={perm.admin} 
                            onCheckedChange={() => handleTogglePermission(perm.feature, 'admin')}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch 
                            checked={perm.manager} 
                            onCheckedChange={() => handleTogglePermission(perm.feature, 'manager')}
                            className="data-[state=checked]:bg-secondary"
                          />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <Switch 
                            checked={perm.agent} 
                            onCheckedChange={() => handleTogglePermission(perm.feature, 'agent')}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
