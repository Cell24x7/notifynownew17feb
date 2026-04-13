import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useBranding } from '@/contexts/BrandingContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Building, Phone, Mail, Globe, Save } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

export function ProfileSettings() {
    const { user, updateUser, refreshUser } = useAuth();
    const { refreshBranding } = useBranding();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [fetchingBranding, setFetchingBranding] = useState(false);
    const [profile, setProfile] = useState({
        name: user?.name || '',
        company: user?.company || '',
        contact_phone: user?.contact_phone || '',
        email: user?.email || '',
        brand_name: '', // For resellers
        logo_url: ''    // For resellers
    });

    useEffect(() => {
        if (user) {
            setProfile(prev => ({
                ...prev,
                name: user.name,
                company: user.company || '',
                contact_phone: user.contact_phone || '',
                email: user.email
            }));

            if (user.role === 'reseller') {
                fetchResellerBranding();
            }
        }
    }, [user]);

    const fetchResellerBranding = async () => {
        setFetchingBranding(true);
        try {
            const token = localStorage.getItem('authToken');
            const res = await axios.get(`${API_BASE_URL}/api/resellers/my-branding`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                setProfile(prev => ({
                    ...prev,
                    brand_name: res.data.branding.brand_name || '',
                    logo_url: res.data.branding.logo_url || ''
                }));
            }
        } catch (err) {
            console.error('Failed to fetch reseller branding:', err);
        } finally {
            setFetchingBranding(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            
            // 1. Update User Profile
            const profileRes = await axios.put(`${API_BASE_URL}/api/profile`, {
                name: profile.name,
                company: profile.company,
                contact_phone: profile.contact_phone
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // 2. If Reseller, update Branding too
            if (user?.role === 'reseller') {
                await axios.put(`${API_BASE_URL}/api/resellers/my-branding`, {
                    brand_name: profile.brand_name,
                    logo_url: profile.logo_url
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            if (profileRes.data.success) {
                toast({
                    title: 'Profile Updated',
                    description: 'Your profile settings have been saved.',
                });
                await refreshUser();
                // If brand name changed, refresh branding context to update sidebar
                if (user?.role === 'reseller') {
                   await refreshBranding();
                }
            }
        } catch (err: any) {
            toast({
                title: 'Update Failed',
                description: err.response?.data?.message || 'Something went wrong',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="card-elevated border-none shadow-sm overflow-hidden">
                <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Personal Information</CardTitle>
                            <CardDescription>Update your basic account details</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    className="pl-9"
                                    value={profile.name}
                                    onChange={e => setProfile({...profile, name: e.target.value})}
                                    placeholder="Your full name"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    className="pl-9 bg-muted"
                                    value={profile.email}
                                    disabled
                                    placeholder="your-email@example.com"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">To change email, please use the Security tab.</p>
                        </div>
                        <div className="space-y-2">
                            <Label>Company Name</Label>
                            <div className="relative">
                                <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    className="pl-9"
                                    value={profile.company}
                                    onChange={e => setProfile({...profile, company: e.target.value})}
                                    placeholder="Your company name"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Contact Phone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    className="pl-9"
                                    value={profile.contact_phone}
                                    onChange={e => setProfile({...profile, contact_phone: e.target.value})}
                                    placeholder="+91..."
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {user?.role === 'reseller' && (
                <Card className="card-elevated border-none shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50/50 dark:bg-zinc-900/50 border-b">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Globe className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                                <CardTitle>Platform Branding</CardTitle>
                                <CardDescription>Customize how your platform appears to your clients</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        {fetchingBranding ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Brand Name (Platform Display Name)</Label>
                                    <Input 
                                        value={profile.brand_name}
                                        onChange={e => setProfile({...profile, brand_name: e.target.value})}
                                        placeholder="e.g., NotifyNow or YourBrand"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        This name will appear in the sidebar and emails as your platform name.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Logo URL</Label>
                                    <Input 
                                        value={profile.logo_url}
                                        onChange={e => setProfile({...profile, logo_url: e.target.value})}
                                        placeholder="https://example.com/logo.png"
                                    />
                                    <p className="text-[10px] text-muted-foreground">
                                        URL for your 32x32px logo icon.
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30">
                            <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                💡 Tip: You can find advanced white-labeling options (colors, custom domain, support info) 
                                in the <strong>White-labeling</strong> menu in the sidebar.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="flex justify-end pt-2">
                <Button 
                    className="gradient-primary h-11 px-8 font-bold shadow-lg" 
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Save Profile Changes
                </Button>
            </div>
        </div>
    );
}
