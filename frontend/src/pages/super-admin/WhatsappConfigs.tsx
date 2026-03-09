import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, MoreVertical, Loader2, MessageCircle, CheckCircle2, XCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { cn } from '@/lib/utils';

const API_URL = `${API_BASE_URL}/api/whatsapp-configs`;

// Provider definitions
const PROVIDERS = {
    vendor1: {
        id: 'vendor1',
        label: 'Meta Graph API',
        description: 'Official Facebook / Meta WhatsApp Business Cloud API',
        color: 'border-blue-200 text-blue-700 bg-blue-50',
        badgeClass: 'bg-blue-600',
        icon: '🔵',
    },
    vendor2: {
        id: 'vendor2',
        label: 'Pinbot (Pinnacle)',
        description: 'Pinnacle Teleservices Partners API v3 (partnersv1.pinbot.ai)',
        color: 'border-orange-200 text-orange-700 bg-orange-50',
        badgeClass: 'bg-orange-600',
        icon: '🟠',
    },
};

const emptyForm = {
    chatbot_name: '',
    provider: 'vendor1',
    wanumber: '',
    domain: '',
    customer_id: '',
    wa_token: '',
    api_key: '',
    ph_no_id: '',
    wa_biz_accnt_id: '',
    is_active: true,
};

export default function WhatsappConfigs() {
    const { toast } = useToast();
    const [configs, setConfigs] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [testLoading, setTestLoading] = useState(false);
    const [formData, setFormData] = useState({ ...emptyForm });

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await axios.get(API_URL, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) setConfigs(res.data.configs || []);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Could not fetch WhatsApp configurations' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchConfigs(); }, []);

    const handleOpenDialog = (config: any = null) => {
        setSelectedConfig(config);
        setFormData(config ? {
            chatbot_name: config.chatbot_name || '',
            provider: config.provider || 'vendor1',
            wanumber: config.wanumber || '',
            domain: config.domain || '',
            customer_id: config.customer_id || '',
            wa_token: config.wa_token || '',
            api_key: config.api_key || '',
            ph_no_id: config.ph_no_id || '',
            wa_biz_accnt_id: config.wa_biz_accnt_id || '',
            is_active: config.is_active !== undefined ? config.is_active : true,
        } : { ...emptyForm });
        setDialogOpen(true);
    };

    const validateForm = () => {
        if (!formData.chatbot_name.trim()) {
            toast({ variant: 'destructive', title: 'Chatbot Name is required' }); return false;
        }
        if (formData.provider === 'vendor1' && !formData.wa_token.trim()) {
            toast({ variant: 'destructive', title: 'WhatsApp Token (Access Token) is required for Meta Graph API' }); return false;
        }
        if (formData.provider === 'vendor2' && !formData.api_key.trim()) {
            toast({ variant: 'destructive', title: 'API Key is required for Pinbot (Pinnacle)' }); return false;
        }
        if (!formData.ph_no_id.trim()) {
            toast({ variant: 'destructive', title: 'Phone Number ID is required' }); return false;
        }
        if (!formData.wa_biz_accnt_id.trim()) {
            toast({ variant: 'destructive', title: 'Business Account ID (WABA ID) is required' }); return false;
        }
        return true;
    };

    const handleSaveConfig = async () => {
        if (!validateForm()) return;
        setFormLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const headers = { Authorization: `Bearer ${token}` };
            let res;
            if (selectedConfig) {
                res = await axios.put(`${API_URL}/${selectedConfig.id}`, formData, { headers });
            } else {
                res = await axios.post(API_URL, formData, { headers });
            }
            if (res.data.success) {
                toast({ title: '✅ Success', description: selectedConfig ? 'Configuration updated' : 'New WhatsApp configuration added' });
                fetchConfigs();
                setDialogOpen(false);
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.response?.data?.message || 'Something went wrong' });
        } finally {
            setFormLoading(false);
        }
    };

    const handleTestConnection = async () => {
        if (!selectedConfig) return;
        setTestLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await axios.get(`${API_BASE_URL}/api/whatsapp-pinbot/status`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                toast({ title: '✅ Connection Successful', description: `Connected to ${res.data.config?.chatbot_name}` });
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Connection Failed', description: err.response?.data?.message || 'Could not connect' });
        } finally {
            setTestLoading(false);
        }
    };

    const handleDeleteConfig = async (id: number) => {
        if (!window.confirm('Are you sure you want to delete this configuration?')) return;
        try {
            const token = localStorage.getItem('authToken');
            const res = await axios.delete(`${API_URL}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (res.data.success) {
                toast({ title: 'Deleted', description: 'Configuration deleted successfully' });
                fetchConfigs();
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: err.response?.data?.message || 'Could not delete. It might be in use.' });
        }
    };

    const filteredConfigs = configs.filter((c: any) =>
        c.chatbot_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.wanumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.provider?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.ph_no_id?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const currentProvider = PROVIDERS[formData.provider as keyof typeof PROVIDERS];

    return (
        <TooltipProvider>
            <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold">WhatsApp Configurations</h1>
                        <p className="text-muted-foreground text-sm sm:text-base mt-1">
                            Manage credentials for Meta Graph API and Pinbot (Pinnacle Partners API v3)
                        </p>
                    </div>
                    <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700" onClick={() => handleOpenDialog()}>
                        <Plus className="w-4 h-4 mr-2" /> Add Configuration
                    </Button>
                </div>

                {/* Provider Info Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Object.values(PROVIDERS).map((p) => (
                        <div key={p.id} className={cn('rounded-lg border-2 p-4', p.color)}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xl">{p.icon}</span>
                                <span className="font-semibold">{p.label}</span>
                            </div>
                            <p className="text-xs opacity-80">{p.description}</p>
                        </div>
                    ))}
                </div>

                {/* Table */}
                <Card>
                    <CardHeader>
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or Phone ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                        ) : filteredConfigs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">No WhatsApp configurations found.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table className="min-w-full">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Chatbot Name</TableHead>
                                            <TableHead>Provider</TableHead>
                                            <TableHead>WA Number</TableHead>
                                            <TableHead>Phone No ID</TableHead>
                                            <TableHead>WABA ID</TableHead>
                                            <TableHead>Customer</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredConfigs.map((config: any) => {
                                            const prov = PROVIDERS[config.provider as keyof typeof PROVIDERS];
                                            return (
                                                <TableRow key={config.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <MessageCircle className="w-4 h-4 text-green-500" />
                                                            {config.chatbot_name}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className={cn('text-xs', prov?.color)}>
                                                            {prov?.icon} {prov?.label || config.provider}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-sm">{config.wanumber || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary" className="font-mono text-xs">{config.ph_no_id}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono text-muted-foreground max-w-[120px] truncate">
                                                        <Tooltip>
                                                            <TooltipTrigger>{config.wa_biz_accnt_id}</TooltipTrigger>
                                                            <TooltipContent>{config.wa_biz_accnt_id}</TooltipContent>
                                                        </Tooltip>
                                                    </TableCell>
                                                    <TableCell className="text-sm">{config.customer_id || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge className={config.is_active ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}>
                                                            {config.is_active ? (
                                                                <><CheckCircle2 className="w-3 h-3 mr-1" /> Active</>
                                                            ) : (
                                                                <><XCircle className="w-3 h-3 mr-1" /> Inactive</>
                                                            )}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => handleOpenDialog(config)}>
                                                                    <Edit className="w-4 h-4 mr-2" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-destructive font-medium" onClick={() => handleDeleteConfig(config.id)}>
                                                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Add/Edit Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>{selectedConfig ? 'Edit WhatsApp Config' : 'Add New WhatsApp Config'}</DialogTitle>
                            <DialogDescription>
                                Configure credentials for your WhatsApp Business integration.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-5 py-4">
                            {/* Provider Selection */}
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Provider *</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {Object.values(PROVIDERS).map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, provider: p.id })}
                                            className={cn(
                                                'text-left rounded-lg border-2 p-3 transition-all',
                                                formData.provider === p.id
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                                                    : 'border-border hover:border-muted-foreground'
                                            )}
                                        >
                                            <div className="flex items-center gap-2 font-semibold text-sm">
                                                <span>{p.icon}</span> {p.label}
                                                {formData.provider === p.id && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t pt-4 grid gap-4">
                                {/* Chatbot Name */}
                                <div className="grid sm:grid-cols-4 items-center gap-2">
                                    <Label htmlFor="chatbot_name" className="sm:text-right text-sm font-medium">Chatbot Name *</Label>
                                    <Input id="chatbot_name" className="col-span-3" value={formData.chatbot_name}
                                        onChange={(e) => setFormData({ ...formData, chatbot_name: e.target.value })}
                                        placeholder="e.g. My Business WA Bot" />
                                </div>

                                {/* WA Number */}
                                <div className="grid sm:grid-cols-4 items-center gap-2">
                                    <Label htmlFor="wanumber" className="sm:text-right text-sm">WA Number</Label>
                                    <Input id="wanumber" className="col-span-3" value={formData.wanumber}
                                        onChange={(e) => setFormData({ ...formData, wanumber: e.target.value })}
                                        placeholder="+917208195276" />
                                </div>

                                {/* Phone Number ID — required for both */}
                                <div className="grid sm:grid-cols-4 items-center gap-2">
                                    <div className="sm:text-right flex sm:justify-end items-center gap-1">
                                        <Label htmlFor="ph_no_id" className="text-sm font-medium">Phone No ID *</Label>
                                        <Tooltip>
                                            <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                                            <TooltipContent>15-digit Phone Number ID from Meta / Pinbot dashboard</TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input id="ph_no_id" className="col-span-3" value={formData.ph_no_id}
                                        onChange={(e) => setFormData({ ...formData, ph_no_id: e.target.value })}
                                        placeholder="e.g. 110212648672931" />
                                </div>

                                {/* WABA ID — required for both */}
                                <div className="grid sm:grid-cols-4 items-center gap-2">
                                    <div className="sm:text-right flex sm:justify-end items-center gap-1">
                                        <Label htmlFor="wa_biz_accnt_id" className="text-sm font-medium">WABA ID *</Label>
                                        <Tooltip>
                                            <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                                            <TooltipContent>WhatsApp Business Account ID (e.g. 110044651693467)</TooltipContent>
                                        </Tooltip>
                                    </div>
                                    <Input id="wa_biz_accnt_id" className="col-span-3" value={formData.wa_biz_accnt_id}
                                        onChange={(e) => setFormData({ ...formData, wa_biz_accnt_id: e.target.value })}
                                        placeholder="e.g. 110044651693467" />
                                </div>

                                {/* ── VENDOR 1 (Meta Graph) specific fields ── */}
                                {formData.provider === 'vendor1' && (
                                    <>
                                        <div className="col-span-full">
                                            <div className="rounded-md bg-blue-50 dark:bg-blue-950 border border-blue-200 p-3 text-xs text-blue-700 dark:text-blue-300">
                                                🔵 <strong>Meta Graph API:</strong> Get these from <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="underline">developers.facebook.com</a> → WhatsApp → API Setup
                                            </div>
                                        </div>
                                        <div className="grid sm:grid-cols-4 items-center gap-2">
                                            <Label htmlFor="wa_token" className="sm:text-right text-sm font-medium">Access Token *</Label>
                                            <Textarea id="wa_token" className="col-span-3 text-xs font-mono min-h-[80px]" value={formData.wa_token}
                                                onChange={(e) => setFormData({ ...formData, wa_token: e.target.value })}
                                                placeholder="Permanent Access Token from Meta Business Suite" />
                                        </div>
                                        <div className="grid sm:grid-cols-4 items-center gap-2">
                                            <Label htmlFor="domain" className="sm:text-right text-sm">Domain</Label>
                                            <Input id="domain" className="col-span-3" value={formData.domain}
                                                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                                placeholder="e.g. yourbusiness.com" />
                                        </div>
                                        <div className="grid sm:grid-cols-4 items-center gap-2">
                                            <Label htmlFor="customer_id" className="sm:text-right text-sm">Customer ID</Label>
                                            <Input id="customer_id" className="col-span-3" value={formData.customer_id}
                                                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                                placeholder="e.g. CPV001" />
                                        </div>
                                    </>
                                )}

                                {/* ── VENDOR 2 (Pinbot/Pinnacle) specific fields ── */}
                                {formData.provider === 'vendor2' && (
                                    <>
                                        <div className="col-span-full">
                                            <div className="rounded-md bg-orange-50 dark:bg-orange-950 border border-orange-200 p-3 text-xs text-orange-700 dark:text-orange-300">
                                                🟠 <strong>Pinbot (Pinnacle):</strong> Get your API Key and WABA ID from your Pinnacle Partners dashboard at partnersv1.pinbot.ai
                                            </div>
                                        </div>
                                        <div className="grid sm:grid-cols-4 items-center gap-2">
                                            <div className="sm:text-right flex sm:justify-end items-center gap-1">
                                                <Label htmlFor="api_key" className="text-sm font-medium">API Key *</Label>
                                                <Tooltip>
                                                    <TooltipTrigger><Info className="w-3 h-3 text-muted-foreground" /></TooltipTrigger>
                                                    <TooltipContent>Your Pinnacle API key (UUID format, e.g. 68bd0be4-c0fd-11ee-...)</TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <Input id="api_key" className="col-span-3 font-mono text-xs" value={formData.api_key}
                                                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                                placeholder="e.g. 68bd0be4-c0fd-11ee-b22d-92672d2d0c2d" />
                                        </div>
                                        <div className="grid sm:grid-cols-4 items-center gap-2">
                                            <Label htmlFor="customer_id" className="sm:text-right text-sm">Customer ID</Label>
                                            <Input id="customer_id" className="col-span-3" value={formData.customer_id}
                                                onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                                placeholder="Optional customer reference ID" />
                                        </div>
                                    </>
                                )}

                                {/* Status */}
                                <div className="grid sm:grid-cols-4 items-center gap-2">
                                    <Label className="sm:text-right text-sm">Status</Label>
                                    <div className="flex items-center gap-2 col-span-3">
                                        <Button type="button" variant={formData.is_active ? 'default' : 'outline'} size="sm"
                                            onClick={() => setFormData({ ...formData, is_active: true })}
                                            className={formData.is_active ? 'bg-green-600 hover:bg-green-700' : ''}>
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                                        </Button>
                                        <Button type="button" variant={!formData.is_active ? 'default' : 'outline'} size="sm"
                                            onClick={() => setFormData({ ...formData, is_active: false })}>
                                            <XCircle className="w-3 h-3 mr-1" /> Inactive
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="flex flex-col sm:flex-row gap-2">
                            {selectedConfig && formData.provider === 'vendor2' && (
                                <Button variant="outline" onClick={handleTestConnection} disabled={testLoading} className="sm:mr-auto">
                                    {testLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '🔌'}  Test Pinbot Connection
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleSaveConfig} disabled={formLoading} className="bg-green-600 hover:bg-green-700">
                                {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {selectedConfig ? 'Update' : 'Save Configuration'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
