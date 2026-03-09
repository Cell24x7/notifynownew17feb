import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, ShieldCheck, MoreVertical, Loader2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api/whatsapp-configs`;

export default function WhatsappConfigs() {
    const { toast } = useToast();
    const [configs, setConfigs] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedConfig, setSelectedConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);

    const [formData, setFormData] = useState({
        chatbot_name: '',
        provider: 'vendor1',
        wanumber: '',
        domain: '',
        customer_id: '',
        wa_token: '',
        api_key: '',
        ph_no_id: '',
        wa_biz_accnt_id: '',
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
                description: err.response?.data?.message || 'Could not fetch WhatsApp configurations',
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
            chatbot_name: config.chatbot_name || '',
            provider: config.provider || 'vendor1',
            wanumber: config.wanumber || '',
            domain: config.domain || '',
            customer_id: config.customer_id || '',
            wa_token: config.wa_token || '',
            api_key: config.api_key || '',
            ph_no_id: config.ph_no_id || '',
            wa_biz_accnt_id: config.wa_biz_accnt_id || '',
            is_active: config.is_active !== undefined ? config.is_active : true
        } : {
            chatbot_name: '',
            provider: 'vendor1',
            wanumber: '',
            domain: '',
            customer_id: '',
            wa_token: '',
            api_key: '',
            ph_no_id: '',
            wa_biz_accnt_id: '',
            is_active: true
        });
        setDialogOpen(true);
    };

    const validateForm = () => {
        if (!formData.chatbot_name.trim()) {
            toast({ variant: 'destructive', title: 'Chatbot Name is required' });
            return false;
        }
        if (formData.provider === 'vendor1' && !formData.wa_token.trim()) {
            toast({ variant: 'destructive', title: 'WhatsApp Token is required' });
            return false;
        }
        if (formData.provider === 'vendor2' && !formData.api_key.trim()) {
            toast({ variant: 'destructive', title: 'API Key is required' });
            return false;
        }
        if (!formData.ph_no_id.trim()) {
            toast({ variant: 'destructive', title: 'Phone Number ID is required' });
            return false;
        }
        if (!formData.wa_biz_accnt_id.trim()) {
            toast({ variant: 'destructive', title: 'Business Account ID is required' });
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
        c.chatbot_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.wanumber && c.wanumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.provider && c.provider.toLowerCase().includes(searchQuery.toLowerCase())) ||
        c.ph_no_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">WhatsApp Configurations</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Manage Facebook Graph API credentials for WhatsApp integration</p>
                </div>
                <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700" onClick={() => handleOpenDialog()}>
                    <Plus className="w-4 h-4 mr-2" /> Add Configuration
                </Button>
            </div>

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
                        <div className="flex justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : filteredConfigs.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No WhatsApp configurations found.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-full">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Chatbot Name</TableHead>
                                        <TableHead>Provider</TableHead>
                                        <TableHead>WA Number</TableHead>
                                        <TableHead>Phone No ID</TableHead>
                                        <TableHead>Biz Account ID</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredConfigs.map((config: any) => (
                                        <TableRow key={config.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <MessageCircle className="w-4 h-4 text-green-500" />
                                                        {config.chatbot_name}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "capitalize",
                                                        config.provider === 'vendor1' ? "border-blue-200 text-blue-700 bg-blue-50" : "border-orange-200 text-orange-700 bg-orange-50"
                                                    )}
                                                >
                                                    {config.provider === 'vendor1' ? 'Vendor 1' : 'Vendor 2'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm">
                                                {config.wanumber || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono">{config.ph_no_id}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-mono text-muted-foreground">
                                                {config.wa_biz_accnt_id}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                {config.customer_id || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={config.is_active ? 'bg-green-500/10 text-green-600' : 'bg-gray-500/10 text-gray-600'}>
                                                    {config.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
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
                <DialogContent className="sm:max-w-xl w-[95vw] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedConfig ? 'Edit WhatsApp Config' : 'Add New WhatsApp Config'}</DialogTitle>
                        <DialogDescription>
                            Enter the Facebook Graph API credentials for WhatsApp.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                            <Label htmlFor="provider" className="text-left sm:text-right font-semibold w-full">Provider</Label>
                            <div className="flex items-center gap-2 col-span-3">
                                <Button
                                    type="button"
                                    variant={formData.provider === 'vendor1' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFormData({ ...formData, provider: 'vendor1' })}
                                    className={formData.provider === 'vendor1' ? 'bg-blue-600' : ''}
                                >
                                    Vendor 1
                                </Button>
                                <Button
                                    type="button"
                                    variant={formData.provider === 'vendor2' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFormData({ ...formData, provider: 'vendor2' })}
                                    className={formData.provider === 'vendor2' ? 'bg-orange-600' : ''}
                                >
                                    Vendor 2
                                </Button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                            <Label htmlFor="chatbot_name" className="text-left sm:text-right w-full">Chatbot Name</Label>
                            <Input
                                id="chatbot_name"
                                className="col-span-3"
                                value={formData.chatbot_name}
                                onChange={(e) => setFormData({ ...formData, chatbot_name: e.target.value })}
                                placeholder="e.g. My Business WA"
                            />
                        </div>

                        <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                            <Label htmlFor="wanumber" className="text-left sm:text-right w-full">WA Number</Label>
                            <Input
                                id="wanumber"
                                className="col-span-3"
                                value={formData.wanumber}
                                onChange={(e) => setFormData({ ...formData, wanumber: e.target.value })}
                                placeholder="e.g. +917208195276"
                            />
                        </div>

                        {formData.provider === 'vendor1' && (
                            <>
                                <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label htmlFor="domain" className="text-left sm:text-right w-full">Domain</Label>
                                    <Input
                                        id="domain"
                                        className="col-span-3"
                                        value={formData.domain}
                                        onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                        placeholder="e.g. example.com"
                                    />
                                </div>

                                <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label htmlFor="customer_id" className="text-left sm:text-right w-full">Customer ID</Label>
                                    <Input
                                        id="customer_id"
                                        className="col-span-3"
                                        value={formData.customer_id}
                                        onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                                        placeholder="e.g. CPV001"
                                    />
                                </div>

                                <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                    <Label htmlFor="wa_token" className="text-left sm:text-right w-full">WA Token</Label>
                                    <Input
                                        id="wa_token"
                                        className="col-span-3"
                                        value={formData.wa_token}
                                        onChange={(e) => setFormData({ ...formData, wa_token: e.target.value })}
                                        placeholder="Permanent Access Token"
                                    />
                                </div>
                            </>
                        )}

                        {formData.provider === 'vendor2' && (
                            <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                                <Label htmlFor="api_key" className="text-left sm:text-right w-full">API Key</Label>
                                <Input
                                    id="api_key"
                                    className="col-span-3"
                                    value={formData.api_key}
                                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                    placeholder="Enter your Vendor 2 API Key"
                                />
                            </div>
                        )}

                        <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                            <Label htmlFor="ph_no_id" className="text-left sm:text-right w-full">Phone No ID</Label>
                            <Input
                                id="ph_no_id"
                                className="col-span-3"
                                value={formData.ph_no_id}
                                onChange={(e) => setFormData({ ...formData, ph_no_id: e.target.value })}
                                placeholder="15-digit Phone Number ID"
                            />
                        </div>

                        <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                            <Label htmlFor="wa_biz_accnt_id" className="text-left sm:text-right w-full">Biz Account ID</Label>
                            <Input
                                id="wa_biz_accnt_id"
                                className="col-span-3"
                                value={formData.wa_biz_accnt_id}
                                onChange={(e) => setFormData({ ...formData, wa_biz_accnt_id: e.target.value })}
                                placeholder="WhatsApp Biz Account ID"
                            />
                        </div>

                        <div className="flex flex-col sm:grid sm:grid-cols-4 items-start sm:items-center gap-2 sm:gap-4">
                            <Label className="text-left sm:text-right w-full">Status</Label>
                            <div className="flex items-center gap-2 col-span-3">
                                <Button
                                    type="button"
                                    variant={formData.is_active ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFormData({ ...formData, is_active: true })}
                                >
                                    Active
                                </Button>
                                <Button
                                    type="button"
                                    variant={!formData.is_active ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setFormData({ ...formData, is_active: false })}
                                >
                                    Inactive
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveConfig} disabled={formLoading} className="bg-green-600 hover:bg-green-700">
                            {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {selectedConfig ? 'Update' : 'Save'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
