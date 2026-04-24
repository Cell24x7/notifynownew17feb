import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Globe, Palette, Mail, Phone, Image as ImageIcon, CreditCard, Lock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';
import { useBranding } from '@/contexts/BrandingContext';

export default function ResellerBranding() {
    const { toast } = useToast();
    const { refreshBranding } = useBranding();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [settings, setSettings] = useState({
        brand_name: '',
        logo_url: '',
        favicon_url: '',
        primary_color: '#3b82f6',
        secondary_color: '#1d4ed8',
        support_email: '',
        support_phone: '',
        domain: '',
        payment_gateway_type: 'none',
        ccavenue_merchant_id: '',
        ccavenue_access_code: '',
        ccavenue_working_key: ''
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await axios.get(`${API_BASE_URL}/api/resellers/my-branding`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    setSettings(res.data.branding);
                }
            } catch (err) {
                console.error('Failed to load branding settings', err);
                toast({ title: 'Error', description: 'Failed to load branding settings', variant: 'destructive' });
            } finally {
                setFetching(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            // We use the resellers update API but the backend needs to handle it.
            // Actually, I should add a specific route for this or reuse the PUT /resellers/:id
            // But a reseller knows their email, so we can find them.

            // For now, let's assume we use a dedicated route PUT /api/resellers/my-branding
            const res = await axios.put(`${API_BASE_URL}/api/resellers/my-branding`, settings, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.data.success) {
                toast({ title: 'Success', description: 'Branding settings updated successfully!' });
                // Refresh context to apply changes (logo, title etc)
                await refreshBranding();
            }
        } catch (err: any) {
            toast({
                title: 'Error',
                description: err.response?.data?.message || 'Failed to update settings',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!settings) {
        return (
            <div className="p-6 text-center">
                <p className="text-muted-foreground">No branding settings found.</p>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold">White-Label Settings</h1>
                <p className="text-muted-foreground">Customize your platform branding and support information.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General Info */}
                <Card shadow-sm>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-primary" />
                            General Information
                        </CardTitle>
                        <CardDescription>Basic platform identify</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Brand Name</Label>
                            <Input
                                value={settings.brand_name}
                                onChange={e => setSettings({ ...settings, brand_name: e.target.value })}
                                placeholder="e.g. MyMessaging"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Custom Domain</Label>
                            <Input
                                value={settings.domain}
                                disabled
                                className="bg-muted"
                                placeholder="Request admin to change domain"
                            />
                            <p className="text-xs text-muted-foreground">Contact super-admin to change your domain mapping.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Assets */}
                <Card shadow-sm>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ImageIcon className="w-5 h-5 text-primary" />
                            Visual Assets
                        </CardTitle>
                        <CardDescription>Logo and Favicon URLs</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Logo URL</Label>
                            <Input
                                value={settings.logo_url}
                                onChange={e => setSettings({ ...settings, logo_url: e.target.value })}
                                placeholder="https://example.com/logo.png"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Favicon URL</Label>
                            <Input
                                value={settings.favicon_url}
                                onChange={e => setSettings({ ...settings, favicon_url: e.target.value })}
                                placeholder="https://example.com/favicon.ico"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Colors */}
                <Card shadow-sm className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Palette className="w-5 h-5 text-primary" />
                            Theme Colors
                        </CardTitle>
                        <CardDescription>Match the platform to your brand</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Primary Color</Label>
                                <div className="flex gap-3">
                                    <div
                                        className="w-12 h-10 rounded border"
                                        style={{ backgroundColor: settings.primary_color }}
                                    />
                                    <Input
                                        value={settings.primary_color}
                                        onChange={e => setSettings({ ...settings, primary_color: e.target.value })}
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Secondary Color</Label>
                                <div className="flex gap-3">
                                    <div
                                        className="w-12 h-10 rounded border"
                                        style={{ backgroundColor: settings.secondary_color }}
                                    />
                                    <Input
                                        value={settings.secondary_color}
                                        onChange={e => setSettings({ ...settings, secondary_color: e.target.value })}
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Support */}
                <Card shadow-sm className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" />
                            Support Details
                        </CardTitle>
                        <CardDescription>Displayed to your clients</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Support Email</Label>
                                <Input
                                    type="email"
                                    value={settings.support_email}
                                    onChange={e => setSettings({ ...settings, support_email: e.target.value })}
                                    placeholder="support@yourbrand.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Support Phone</Label>
                                <Input
                                    value={settings.support_phone}
                                    onChange={e => setSettings({ ...settings, support_phone: e.target.value })}
                                    placeholder="+91..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Gateway */}
                <Card shadow-sm className="md:col-span-2 border-primary/20">
                    <CardHeader className="bg-primary/5">
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-primary" />
                            Payment Gateway Configuration
                        </CardTitle>
                        <CardDescription>Configure how your clients pay for wallet top-ups. If "None" is selected, the platform's default gateway will be used.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Gateway Type</Label>
                                <Select 
                                    value={settings.payment_gateway_type} 
                                    onValueChange={val => setSettings({ ...settings, payment_gateway_type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Gateway" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None (Use Platform Default)</SelectItem>
                                        <SelectItem value="ccavenue">CCAvenue</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {settings.payment_gateway_type === 'ccavenue' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-muted/30 rounded-lg border border-dashed animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Merchant ID
                                    </Label>
                                    <Input
                                        value={settings.ccavenue_merchant_id}
                                        onChange={e => setSettings({ ...settings, ccavenue_merchant_id: e.target.value })}
                                        placeholder="CCAvenue Merchant ID"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Access Code
                                    </Label>
                                    <Input
                                        value={settings.ccavenue_access_code}
                                        onChange={e => setSettings({ ...settings, ccavenue_access_code: e.target.value })}
                                        placeholder="CCAvenue Access Code"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Working Key
                                    </Label>
                                    <Input
                                        type="password"
                                        value={settings.ccavenue_working_key}
                                        onChange={e => setSettings({ ...settings, ccavenue_working_key: e.target.value })}
                                        placeholder="CCAvenue Working Key"
                                    />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end pt-4">
                <Button
                    size="lg"
                    className="gradient-primary"
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                    Save Brannding Settings
                </Button>
            </div>
        </div>
    );
}
