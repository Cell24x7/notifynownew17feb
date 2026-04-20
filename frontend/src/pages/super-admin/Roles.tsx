import { useState, useEffect } from 'react';
import { Shield, Check, X, Info, User, Building, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Plan } from '@/types/plan';
import { Permission, PlanPermissions, USER_PERMISSIONS, RESELLER_PERMISSIONS } from '@/types/permissions';
import { API_BASE_URL } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

export default function SuperAdminRoles() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  
  // Role Selection State
  const [selectedRoleType, setSelectedRoleType] = useState<'user' | 'reseller' | null>(null);

  // Set default role type for resellers
  useEffect(() => {
    if (user?.role === 'reseller' && !selectedRoleType) {
      setSelectedRoleType('user');
    }
  }, [user, selectedRoleType]);
  const [entities, setEntities] = useState<any[]>([]);
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  // Permissions State
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch Plans on Mount
  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/plans?admin=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setPlans(data);
      if (data.length > 0) {
        setSelectedPlanId(data[0].id);
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to fetch plans', error);
      toast({ title: 'Error', description: 'Failed to load plans', variant: 'destructive' });
      setIsLoading(false);
    }
  };

  // Fetch Entities (Users/Resellers) when Role Type changes
  useEffect(() => {
    if (!selectedRoleType) {
      setEntities([]);
      setPermissions([]); // Clear permissions if no role type selected
      return;
    }

    const fetchEntities = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const endpoint = selectedRoleType === 'user' ? '/api/clients' : '/api/resellers';
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (selectedRoleType === 'user') {
           const users = data.clients || [];
           const filtered = selectedPlanId 
             ? users.filter((u: any) => String(u.plan_id) === String(selectedPlanId)) 
             : users;
           setEntities(filtered);
        } else {
           const resellers = data.resellers || [];
           // Prevent reseller from seeing self 
           const baseResellers = resellers.filter((r: any) => r.email !== user?.email);
           const filtered = selectedPlanId 
             ? baseResellers.filter((r: any) => String(r.plan_id) === String(selectedPlanId)) 
             : baseResellers;
           setEntities(filtered);
        }
      } catch (error) {
        console.error('Failed to fetch entities', error);
        toast({ title: 'Error', description: `Failed to load ${selectedRoleType}s`, variant: 'destructive' });
      }
    };

    fetchEntities();
  }, [selectedRoleType, selectedPlanId]);

  // Load Permissions when Plan or Entity changes
  useEffect(() => {
    if (!selectedPlanId || !selectedRoleType) return;

    // Determine the base set of permissions to ensure valid structure
    const basePermissions = selectedRoleType === 'user' ? USER_PERMISSIONS : RESELLER_PERMISSIONS;

    const plan = plans.find(p => p.id === selectedPlanId);
    const entity = selectedEntityId ? entities.find(e => e.id === selectedEntityId) : null;

    let loadedPermissions: Permission[] = [];
    const entityPermissions = entity?.permissions;

    // Check if permissions exists (can be empty array)
    if (entityPermissions !== undefined && entityPermissions !== null && Array.isArray(entityPermissions)) {
      // Entity-specific permissions (Even if empty array, respect it!)
      loadedPermissions = entityPermissions;
    } else if (plan && plan.permissions && Array.isArray(plan.permissions) && plan.permissions.length > 0) {
      // Plan default permissions
      loadedPermissions = plan.permissions;
    } else {
      loadedPermissions = basePermissions;
    }

    // Merge loaded permissions with basePermissions to ensure all features are present
    // BUT! If we are in entity-specific mode and loadedPermissions is empty, we should keep it empty IF it was intended.
    // However, for the UI to be usable, we should show the features but as unchecked.
    const mergedPermissions = basePermissions.map(basePerm => {
        const existing = loadedPermissions.find(p => p.feature === basePerm.feature);
        if (existing) return existing;
        
        // If we are editing a specific entity and they have an explicit (possibly empty) permission set,
        // we should default NEW features to 'false' (unchecked).
        // If they have NO custom permissions (null), we'll eventually fallback to plan above.
        return { ...basePerm, admin: false, manager: false, agent: false };
    });

    setPermissions(mergedPermissions);

  }, [selectedPlanId, selectedEntityId, plans, entities, selectedRoleType]);


  const handleTogglePermission = (feature: string, role: 'admin' | 'manager' | 'agent') => {
    // SECURITY: If reseller is managing roles, prevent editing self
    if (user?.role === 'reseller' && selectedEntityId === user?.id) {
       toast({ title: 'Security', description: 'You cannot edit your own permissions', variant: 'destructive' });
       return;
    }
    setPermissions(prev => prev.map(p => {
      if (p.feature === feature) {
         const newValue = !p[role];
         // If editing a specific entity (User/Reseller), sync all role flags to avoid hidden access
         if (selectedEntityId) {
           return { ...p, admin: newValue, manager: newValue, agent: newValue };
         }
         return { ...p, [role]: newValue };
      }
      return p;
    }));
  };

  const handleMasterToggle = (group: string, role: 'admin' | 'manager' | 'agent', isChecked: boolean) => {
    setPermissions(prev => prev.map(p => {
      if (p.feature.startsWith(group)) {
         if (selectedEntityId) {
            // Sync all roles for this feature set in entity mode
            return { ...p, admin: isChecked, manager: isChecked, agent: isChecked };
         }
         return { ...p, [role]: isChecked };
      }
      return p;
    }));
  };

  const handleSavePermissions = async () => {
    // If saving for a specific entity (User/Reseller)
    if (selectedEntityId && selectedRoleType) {
      setIsSaving(true);
      try {
        const token = localStorage.getItem('authToken');
        const endpoint = selectedRoleType === 'user' 
          ? `/api/clients/${selectedEntityId}` 
          : `/api/resellers/${selectedEntityId}`;
        
        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ permissions })
        });

        if (!res.ok) throw new Error(`Failed to update ${selectedRoleType}`);

        // Update local entity state
        setEntities(prev => prev.map(e => e.id === selectedEntityId ? { ...e, permissions } : e));

        toast({
          title: 'Success',
          description: `Permissions updated for this ${selectedRoleType}.`,
        });
      } catch (error) {
        console.error('Save failed', error);
        toast({ title: 'Error', description: 'Failed to save permissions', variant: 'destructive' });
      } finally {
        setIsSaving(false);
      }
      return;
    }

    // Default: Save for Plan
    if (!selectedPlanId) return;
    setIsSaving(true);
    
    try {
      // Find the plan object to get other fields required for PUT
      const plan = plans.find(p => p.id === selectedPlanId);
      if (!plan) return;

      const updatedPlan = {
        ...plan,
        permissions: permissions,
        // Ensure other required fields are present and correctly formatted for backend
        channels_allowed: plan.channelsAllowed,
        monthly_credits: plan.monthlyCredits,
        client_count: plan.clientCount,
        automation_limit: plan.automationLimit,
        campaign_limit: plan.campaignLimit,
        api_access: plan.apiAccess
      };
      
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${API_BASE_URL}/api/plans/${selectedPlanId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedPlan)
      });

      if (!res.ok) throw new Error('Failed to update plan');

      // Update local state
      setPlans(prev => prev.map(p => p.id === selectedPlanId ? { ...p, permissions } : p));

      toast({
        title: 'Success',
        description: 'Permissions updated successfully for this plan.',
      });
    } catch (error) {
      console.error('Save failed', error);
      toast({ title: 'Error', description: 'Failed to save permissions', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const selectedEntity = entities.find(e => e.id === selectedEntityId);

  // Group Permissions by Feature Prefix (e.g., "Chat", "Campaign")
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const group = perm.feature.split(' - ')[0];
    if (!acc[group]) acc[group] = [];
    acc[group].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles & Permissions</h1>
          <p className="text-muted-foreground">Configure role-based access per plan</p>
        </div>
        <Button onClick={handleSavePermissions} disabled={isSaving || !selectedPlanId}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Selection Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Plan Selection */}
        <Card>
           <CardHeader className="py-3">
             <CardTitle className="text-sm font-medium">1. Select Plan</CardTitle>
           </CardHeader>
           <CardContent>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a Plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </CardContent>
        </Card>

        {/* 2. Role Type Selection */}
        <Card>
           <CardHeader className="py-3">
             <CardTitle className="text-sm font-medium">2. Select Role Type</CardTitle>
           </CardHeader>
           <CardContent>
              <Select 
                value={selectedRoleType || ''} 
                onValueChange={(v: any) => { setSelectedRoleType(v); setSelectedEntityId(''); }}
                disabled={user?.role === 'reseller'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="User or Reseller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  {user?.role !== 'reseller' && <SelectItem value="reseller">Reseller</SelectItem>}
                </SelectContent>
              </Select>
           </CardContent>
        </Card>

        {/* 3. Entity Selection */}
        <Card>
           <CardHeader className="py-3">
             <CardTitle className="text-sm font-medium">3. Select {selectedRoleType ? (selectedRoleType === 'user' ? 'User' : 'Reseller') : 'Entity'}</CardTitle>
           </CardHeader>
           <CardContent>
              <Select value={selectedEntityId} onValueChange={setSelectedEntityId} disabled={!selectedRoleType}>
                <SelectTrigger>
                  <SelectValue placeholder={`Search ${selectedRoleType || '...'}`} />
                </SelectTrigger>
                <SelectContent>
                  {entities.length === 0 && <div className="p-2 text-sm text-muted-foreground">No records found</div>}
                  {entities.map(entity => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name || entity.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
           </CardContent>
        </Card>
      </div>

      {/* Entity Details View */}
      {selectedEntity && (
        <Card className="bg-muted/30 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
               <div className="flex gap-4">
                 <div className="p-2 bg-primary/10 rounded-lg h-fit">
                    {selectedRoleType === 'user' ? <User className="w-6 h-6 text-primary" /> : <Building className="w-6 h-6 text-primary" />}
                 </div>
                 <div>
                    <h3 className="font-bold text-lg">{selectedEntity.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedEntity.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{selectedEntity.status || 'Active'}</Badge>
                      {selectedRoleType === 'user' && selectedPlan && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                           Plan: {selectedPlan.name}
                        </Badge>
                      )}
                      
                      {selectedEntity.company_name && (
                         <Badge variant="outline">{selectedEntity.company_name}</Badge>
                      )}
                      
                      {/* Show if custom permissions are active */}
                      {selectedEntity.permissions && selectedEntity.permissions.length > 0 && (
                        <Badge variant="destructive" className="bg-amber-100 text-amber-800 border-amber-200">
                           Custom Permissions Active
                        </Badge>
                      )}
                    </div>
                 </div>
               </div>
               <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-2">ID: {selectedEntity.id}</div>
                  {/* Reset Button */}
                  {selectedEntity.permissions && selectedEntity.permissions.length > 0 && (
                     <Button 
                       variant="outline" 
                       size="sm" 
                       className="text-destructive hover:bg-destructive/10"
                       onClick={async () => {
                         if (!confirm('Are you sure you want to reset to Plan defaults?')) return;
                         // Save empty permissions to reset
                         const token = localStorage.getItem('authToken');
                         const endpoint = selectedRoleType === 'user' 
                           ? `/api/clients/${selectedEntity.id}` 
                           : `/api/resellers/${selectedEntity.id}`;
                         
                         await fetch(`${API_BASE_URL}${endpoint}`, {
                           method: 'PUT',
                           headers: { 
                             'Content-Type': 'application/json',
                             Authorization: `Bearer ${token}`
                           },
                           body: JSON.stringify({ permissions: [] }) // Empty array or null to reset
                         });
                         
                         // Update local state
                         setEntities(prev => prev.map(e => e.id === selectedEntity.id ? { ...e, permissions: null } : e));
                         toast({ title: 'Reset', description: 'Permissions reset to Plan defaults.' });
                       }}
                     >
                       <X className="w-4 h-4 mr-1" /> Reset to Defaults
                     </Button>
                  )}
               </div>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
               <Info className="w-4 h-4" />
               {selectedEntity.permissions && selectedEntity.permissions.length > 0 ? (
                 <span><strong>Custom Permissions</strong> are currently active for this user. These override the plan defaults.</span>
               ) : (
                 <span>Current permissions below are controlled by the <strong>{selectedPlan?.name}</strong> plan.</span>
               )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Plan Info (if no entity selected) */}
      {!selectedEntity && selectedPlan && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-primary" />
                <div>
                  <h3 className="font-semibold">{selectedPlan.name} Plan</h3>
                  <p className="text-sm text-muted-foreground">
                    ${selectedPlan.price}/month • {selectedPlan.clientCount} clients using this plan
                  </p>
                </div>
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                <Info className="w-3 h-3 mr-1" />
                Modifying these permissions affects ALL users on this plan
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Role Legend - Only show for Plan view */}
      {!selectedEntityId && (
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
      )}

      {/* Permissions Header with Actions */}
      <div className="flex items-center justify-between mb-4 mt-6">
        <div>
          <h3 className="text-lg font-bold text-primary">Features & Permissions</h3>
          <p className="text-sm text-muted-foreground">Manage granular access to specific features</p>
        </div>
        
        {permissions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                onClick={() => setPermissions(prev => prev.map(p => ({ ...p, admin: true, manager: true, agent: true })))}
            >
              <Check className="w-3.5 h-3.5 mr-1.5" />
              Enable All
            </Button>
            <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-3 text-xs bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200"
                onClick={() => setPermissions(prev => prev.map(p => ({ ...p, admin: false, manager: false, agent: false })))}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />
              Disable All
            </Button>
          </div>
        )}
      </div>

      {/* Permission Matrix */}
      <div className="space-y-6">
        {Object.entries(groupedPermissions).map(([group, perms]) => {
          // Calculate if all items in this group are checked for a specific role
          const allAdmin = perms.every(p => p.admin);
          const allManager = perms.every(p => p.manager);
          const allAgent = perms.every(p => p.agent);

          return (
            <Card key={group} className="overflow-hidden border-border/50 shadow-sm">
              <CardHeader className="py-3 bg-muted/40 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-primary">{group}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/10 hover:bg-muted/10">
                       <TableHead className="w-[40%] font-medium">Feature</TableHead>
                       {selectedEntityId ? (
                         <TableHead className="text-center font-medium">
                           <div className="flex flex-col items-center gap-1">
                             <span>Enabled</span>
                             <Switch 
                               checked={allAdmin}
                               onCheckedChange={(c) => handleMasterToggle(group, 'admin', c)}
                               className="scale-75 data-[state=checked]:bg-primary"
                             />
                           </div>
                         </TableHead>
                       ) : (
                         <>
                          <TableHead className="text-center font-medium">
                            <div className="flex flex-col items-center gap-1">
                              <span>Admin</span>
                              <Switch 
                                checked={allAdmin}
                                onCheckedChange={(c) => handleMasterToggle(group, 'admin', c)}
                                className="scale-75 data-[state=checked]:bg-blue-600 border border-muted-foreground/20"
                              />
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-medium">
                            <div className="flex flex-col items-center gap-1">
                              <span>Manager</span>
                              <Switch 
                                checked={allManager}
                                onCheckedChange={(c) => handleMasterToggle(group, 'manager', c)}
                                className="scale-75 data-[state=checked]:bg-secondary"
                              />
                            </div>
                          </TableHead>
                          <TableHead className="text-center font-medium">
                            <div className="flex flex-col items-center gap-1">
                              <span>Agent</span>
                              <Switch 
                                checked={allAgent}
                                onCheckedChange={(c) => handleMasterToggle(group, 'agent', c)}
                                className="scale-75 data-[state=checked]:bg-slate-600 border border-muted-foreground/20"
                              />
                            </div>
                          </TableHead>
                         </>
                       )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {perms.map((perm) => (
                      <TableRow key={perm.feature} className="border-b-0 hover:bg-transparent">
                        <TableCell className="text-sm text-muted-foreground py-2 pl-6 relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-border"></div>
                          {perm.feature.split(' - ')[1] || perm.feature}
                        </TableCell>
                        
                        {selectedEntityId ? (
                          <TableCell className="text-center py-2">
                            <div className="flex justify-center">
                              <Switch 
                                checked={perm.admin} 
                                onCheckedChange={() => handleTogglePermission(perm.feature, 'admin')}
                                className="scale-90 data-[state=checked]:bg-blue-600 border border-muted-foreground/20 shadow-sm"
                              />
                            </div>
                          </TableCell>
                        ) : (
                          <>
                            <TableCell className="text-center py-2">
                              <div className="flex justify-center">
                                <Switch 
                                  checked={perm.admin} 
                                  onCheckedChange={() => handleTogglePermission(perm.feature, 'admin')}
                                  className="scale-90 data-[state=checked]:bg-blue-600 border border-muted-foreground/20 shadow-sm"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <div className="flex justify-center">
                                <Switch 
                                  checked={perm.manager} 
                                  onCheckedChange={() => handleTogglePermission(perm.feature, 'manager')}
                                  className="scale-90 data-[state=checked]:bg-indigo-600 border border-muted-foreground/20 shadow-sm"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-2">
                              <div className="flex justify-center">
                                <Switch 
                                  checked={perm.agent} 
                                  onCheckedChange={() => handleTogglePermission(perm.feature, 'agent')}
                                  className="scale-90 data-[state=checked]:bg-slate-600 border border-muted-foreground/20 shadow-sm"
                                />
                              </div>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
