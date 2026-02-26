import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, ShieldCheck, MoreVertical, Check, X, Loader2, Key, Globe, Layout } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api/rcs-configs`;

export default function RcsConfigs() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    auth_url: 'https://auth.dotgo.com/auth/oauth/token',
    api_base_url: 'https://api.dotgo.com/rcs/v1',
    client_id: '',
    client_secret: '',
    bot_id: '',
    is_active: true
  });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setConfigs(res.data.configs || []);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.response?.data?.message || 'Could not fetch RCS configurations',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleOpenDialog = (config: any = null) => {
    setSelectedConfig(config);
    setFormData(config ? {
      name: config.name || '',
      auth_url: config.auth_url || 'https://auth.dotgo.com/auth/oauth/token',
      api_base_url: config.api_base_url || 'https://api.dotgo.com/rcs/v1',
      client_id: config.client_id || '',
      client_secret: config.client_secret || '',
      bot_id: config.bot_id || '',
      is_active: config.is_active !== undefined ? config.is_active : true
    } : {
      name: '',
      auth_url: 'https://auth.dotgo.com/auth/oauth/token',
      api_base_url: 'https://api.dotgo.com/rcs/v1',
      client_id: '',
      client_secret: '',
      bot_id: '',
      is_active: true
    });
    setDialogOpen(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast({ variant: 'destructive', title: 'Config Name is required' });
      return false;
    }
    if (!formData.client_id.trim()) {
      toast({ variant: 'destructive', title: 'Client ID is required' });
      return false;
    }
    if (!formData.client_secret.trim()) {
      toast({ variant: 'destructive', title: 'Client Secret is required' });
      return false;
    }
    if (!formData.bot_id.trim()) {
      toast({ variant: 'destructive', title: 'Bot ID is required' });
      return false;
    }
    return true;
  };

  const handleSaveConfig = async () => {
    if (!validateForm()) return;

    setFormLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const config = {
          headers: { Authorization: `Bearer ${token}` }
      };
      let res;
      if (selectedConfig) {
        res = await axios.put(`${API_URL}/${selectedConfig.id}`, formData, config);
      } else {
        res = await axios.post(API_URL, formData, config);
      }

      if (res.data.success) {
        toast({
          title: 'Success',
          description: selectedConfig ? 'Configuration updated' : 'Configuration added',
        });
        fetchConfigs();
        setDialogOpen(false);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.response?.data?.message || 'Something went wrong',
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteConfig = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this configuration?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast({ title: 'Success', description: 'Configuration deleted' });
        fetchConfigs();
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err.response?.data?.message || 'Could not delete configuration. It might be in use.',
      });
    }
  };

  const filteredConfigs = configs.filter((c: any) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.bot_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">RCS Configurations</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage Dotgo RCS credentials for multi-tenant support</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Add Configuration
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or Bot ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredConfigs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No RCS configurations found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Config Name</TableHead>
                    <TableHead>Bot ID</TableHead>
                    <TableHead>Client ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConfigs.map((config: any) => (
                    <TableRow key={config.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-primary" />
                          {config.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{config.bot_id}</Badge>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-muted-foreground">
                        {config.client_id}
                      </TableCell>
                      <TableCell>
                        <Badge className={config.is_active ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}>
                          {config.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(config.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenDialog(config)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive font-medium"
                              onClick={() => handleDeleteConfig(config.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedConfig ? 'Edit Configuration' : 'Add New Configuration'}</DialogTitle>
            <DialogDescription>
              Enter the Dotgo RCS credentials below. These will be used for users assigned to this config.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Config Name</Label>
              <Input
                id="name"
                className="col-span-3"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Acme Corp RCS"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bot_id" className="text-right">Bot ID</Label>
              <Input
                id="bot_id"
                className="col-span-3"
                value={formData.bot_id}
                onChange={(e) => setFormData({ ...formData, bot_id: e.target.value })}
                placeholder="Dotgo Bot ID"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client_id" className="text-right">Client ID</Label>
              <Input
                id="client_id"
                className="col-span-3"
                value={formData.client_id}
                onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                placeholder="OAuth Client ID"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="client_secret" className="text-right">Client Secret</Label>
              <Input
                id="client_secret"
                type="password"
                className="col-span-3"
                value={formData.client_secret}
                onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                placeholder="OAuth Client Secret"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="auth_url" className="text-right text-xs">Auth URL</Label>
              <Input
                id="auth_url"
                className="col-span-3"
                value={formData.auth_url}
                onChange={(e) => setFormData({ ...formData, auth_url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="api_url" className="text-right text-xs">API Base URL</Label>
              <Input
                id="api_url"
                className="col-span-3"
                value={formData.api_base_url}
                onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Status</Label>
              <div className="flex items-center gap-2 col-span-3">
                <Button 
                  type="button" 
                  variant={formData.is_active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({...formData, is_active: true})}
                >
                  Active
                </Button>
                <Button 
                  type="button" 
                  variant={!formData.is_active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData({...formData, is_active: false})}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig} disabled={formLoading}>
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedConfig ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

