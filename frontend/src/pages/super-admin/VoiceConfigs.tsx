import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function VoiceConfigs() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    provider: 'edpl',
    api_user: '',
    api_password: '',
    base_url: 'https://callcenter-edpl.onrender.com',
    api_key: '',
    status: 'active'
  });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/voice/configs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setConfigs(res.data.configs || []);
      }
    } catch (err: any) {
      toast({
        title: 'Error fetching configs',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleOpenDialog = (config?: any) => {
    setEditingConfig(config || null);
    setFormData(config ? {
      name: config.name || '',
      provider: config.provider || 'edpl',
      api_user: config.api_user || '',
      api_password: config.api_password || '',
      base_url: config.base_url || '',
      api_key: config.api_key || '',
      status: config.status || 'active'
    } : {
      name: '',
      provider: 'edpl',
      api_user: '',
      api_password: '',
      base_url: 'https://callcenter-edpl.onrender.com',
      api_key: '',
      status: 'active'
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Validation Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      
      const payload = { ...formData };
      
      if (editingConfig) {
        await axios.put(`${API_BASE_URL}/api/voice/configs/${editingConfig.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: 'Success', description: 'Voice configuration updated successfully' });
      } else {
        await axios.post(`${API_BASE_URL}/api/voice/configs`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: 'Success', description: 'Voice configuration created successfully' });
      }
      
      setDialogOpen(false);
      fetchConfigs();
    } catch (err: any) {
      toast({
        title: 'Error saving config',
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    }
  };

  const filteredConfigs = configs.filter(config => 
    config.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    config.provider?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Voice Gateways</h1>
          <p className="text-muted-foreground mt-2">Manage AI Voice & IVR gateway configurations</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" /> Add Gateway
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search gateways..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Base URL</TableHead>
                  <TableHead>API User / Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">Loading gateways...</TableCell>
                  </TableRow>
                ) : filteredConfigs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No gateways found. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConfigs.map((config) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{config.provider?.toUpperCase() || 'UNKNOWN'}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate" title={config.base_url}>
                        {config.base_url || 'N/A'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {config.provider === 'edpl' ? 'Bearer API Key' : config.api_user || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={config.status === 'active' ? 'default' : 'secondary'}>
                          {config.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(config)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingConfig ? 'Edit Voice Gateway' : 'Add Voice Gateway'}</DialogTitle>
            <DialogDescription>
              Configure the connection details for the Voice/IVR Gateway provider.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Configuration Name</Label>
              <Input
                placeholder="e.g. Primary EDPL Bulk"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Provider Type</Label>
              <Select
                value={formData.provider}
                onValueChange={(v) => setFormData({ 
                  ...formData, 
                  provider: v,
                  // Auto-fill base URL if switching to edpl
                  base_url: v === 'edpl' && !formData.base_url ? 'https://callcenter-edpl.onrender.com' : formData.base_url
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="edpl">EDPL (Bulk Voice)</SelectItem>
                  <SelectItem value="cell24x7">Cell24x7 (Standard Queue)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label>Base API URL</Label>
              <Input
                placeholder="https://api.example.com"
                value={formData.base_url}
                onChange={(e) => setFormData({ ...formData, base_url: e.target.value })}
              />
            </div>

            {formData.provider === 'edpl' ? (
              <div className="space-y-2 col-span-2">
                <Label>API Key (Bearer Token)</Label>
                <Input
                  type="password"
                  placeholder="Enter Bearer token for authentication"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>API Username</Label>
                  <Input
                    placeholder="Username"
                    value={formData.api_user}
                    onChange={(e) => setFormData({ ...formData, api_user: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Password</Label>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={formData.api_password}
                    onChange={(e) => setFormData({ ...formData, api_password: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
