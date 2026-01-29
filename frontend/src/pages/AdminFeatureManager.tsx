import { useState } from 'react';
import { Smartphone, Phone, Mail, MessageSquare, Facebook, Instagram, Bot, Settings2, Users, Shield, Eye, EyeOff, Save } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRole, defaultFeatureAccess, type FeatureAccess, UserRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';

interface FeatureConfig {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: 'channel' | 'management' | 'settings';
}

const features: FeatureConfig[] = [
  {
    id: 'rcs',
    name: 'RCS Messaging',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Rich Communication Services',
    category: 'channel',
  },
  {
    id: 'sms',
    name: 'SMS Gateway',
    icon: <Phone className="h-5 w-5" />,
    description: 'SMS messaging service',
    category: 'channel',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'WhatsApp integration',
    category: 'channel',
  },
  {
    id: 'email',
    name: 'Email',
    icon: <Mail className="h-5 w-5" />,
    description: 'Email messaging',
    category: 'channel',
  },
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    icon: <Facebook className="h-5 w-5" />,
    description: 'Facebook integration',
    category: 'channel',
  },
  {
    id: 'instagram',
    name: 'Instagram DM',
    icon: <Instagram className="h-5 w-5" />,
    description: 'Instagram direct messages',
    category: 'channel',
  },
  {
    id: 'voicebot',
    name: 'Voice BOT',
    icon: <Bot className="h-5 w-5" />,
    description: 'Voice bot service',
    category: 'channel',
  },
  {
    id: 'users',
    name: 'User Management',
    icon: <Users className="h-5 w-5" />,
    description: 'Manage team members',
    category: 'management',
  },
  {
    id: 'roles',
    name: 'Role Management',
    icon: <Shield className="h-5 w-5" />,
    description: 'Manage roles and permissions',
    category: 'management',
  },
  {
    id: 'wallet',
    name: 'Wallet & Billing',
    icon: <Settings2 className="h-5 w-5" />,
    description: 'Manage wallet and payments',
    category: 'management',
  },
  {
    id: 'security',
    name: 'Security Settings',
    icon: <Shield className="h-5 w-5" />,
    description: 'Security configuration',
    category: 'settings',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    icon: <Settings2 className="h-5 w-5" />,
    description: 'Notification preferences',
    category: 'settings',
  },
  {
    id: 'theme',
    name: 'Theme Settings',
    icon: <Settings2 className="h-5 w-5" />,
    description: 'Customize theme',
    category: 'settings',
  },
  {
    id: 'language',
    name: 'Language Settings',
    icon: <Settings2 className="h-5 w-5" />,
    description: 'Language preferences',
    category: 'settings',
  },
  {
    id: 'files',
    name: 'File Manager',
    icon: <Settings2 className="h-5 w-5" />,
    description: 'Manage files',
    category: 'settings',
  },
];

type RoleFeatureAccess = {
  [role in UserRole]: FeatureAccess;
};

export default function AdminFeatureManager() {
  const { userRole } = useRole();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole>('agent');
  const [roleFeatureAccess, setRoleFeatureAccess] = useState<RoleFeatureAccess>({
    admin: {
      ...defaultFeatureAccess,
      // Admin gets everything
      rcs: true,
      sms: true,
      whatsapp: true,
      email: true,
      facebook: true,
      instagram: true,
      voicebot: true,
      users: true,
      roles: true,
      wallet: true,
      security: true,
      notifications: true,
      theme: true,
      language: true,
      files: true,
    },
    manager: {
      ...defaultFeatureAccess,
      // Manager gets channels + some management
      rcs: true,
      sms: true,
      whatsapp: true,
      email: true,
      facebook: true,
      instagram: true,
      wallet: true,
    },
    agent: {
      ...defaultFeatureAccess,
      // Agent only gets RCS for now
      rcs: true,
    },
  });

  if (userRole !== 'admin') {
    return (
      <div className="p-6 space-y-6 animate-fade-in">
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <Shield className="h-5 w-5 text-destructive" />
          <div>
            <h2 className="font-semibold text-destructive">Access Denied</h2>
            <p className="text-sm text-destructive/80">Only admin users can access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  const toggleFeature = (role: UserRole, featureId: string) => {
    setRoleFeatureAccess({
      ...roleFeatureAccess,
      [role]: {
        ...roleFeatureAccess[role],
        [featureId]: !roleFeatureAccess[role][featureId],
      },
    });
  };

  const handleSave = () => {
    // In a real app, this would save to the database
    toast({
      title: 'Settings Saved',
      description: 'Role-based feature access has been updated.',
    });
  };

  const getEnabledCount = (role: UserRole) => {
    return Object.values(roleFeatureAccess[role]).filter(Boolean).length;
  };

  const getFeaturesByCategory = (category: FeatureConfig['category']) => {
    return features.filter(f => f.category === category);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in overflow-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Feature Access Control</h1>
        <p className="text-muted-foreground">
          Manage which features are available to different user roles
        </p>
      </div>

      {/* Role Selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['admin', 'manager', 'agent'] as UserRole[]).map((role) => (
          <button
            key={role}
            onClick={() => setSelectedRole(role)}
            className={`p-4 rounded-lg border-2 transition-all text-left cursor-pointer ${
              selectedRole === role
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold capitalize">{role}</h3>
                <p className="text-sm text-muted-foreground">
                  {getEnabledCount(role)} features enabled
                </p>
              </div>
              {selectedRole === role && (
                <Badge className="gradient-primary">Active</Badge>
              )}
            </div>
            <div className="flex gap-1 flex-wrap">
              {features.slice(0, 3).map((f) => (
                <Badge
                  key={f.id}
                  variant={roleFeatureAccess[role][f.id] ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {f.name.split(' ')[0]}
                </Badge>
              ))}
              {getEnabledCount(role) > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{getEnabledCount(role) - 3}
                </Badge>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Feature Access by Category */}
      <Tabs defaultValue="channel" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channel">Messaging Channels</TabsTrigger>
          <TabsTrigger value="management">Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {['channel', 'management', 'settings'].map((category) => (
          <TabsContent key={category} value={category} className="space-y-4">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category === 'channel' && <Smartphone className="h-5 w-5" />}
                  {category === 'management' && <Users className="h-5 w-5" />}
                  {category === 'settings' && <Settings2 className="h-5 w-5" />}
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </CardTitle>
                <CardDescription>
                  Configure {category} feature access for {selectedRole}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {getFeaturesByCategory(category as any).map((feature) => (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="text-primary mt-0.5">
                        {feature.icon}
                      </div>
                      <div>
                        <h4 className="font-medium">{feature.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {roleFeatureAccess[selectedRole][feature.id] ? (
                        <Eye className="h-4 w-4 text-green-500" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Switch
                        checked={roleFeatureAccess[selectedRole][feature.id]}
                        onCheckedChange={() =>
                          toggleFeature(selectedRole, feature.id)
                        }
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Role Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['admin', 'manager', 'agent'] as UserRole[]).map((role) => (
          <Card key={role} className="card-elevated">
            <CardHeader>
              <CardTitle className="capitalize text-lg">{role}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Access Level</p>
                <Badge
                  variant={role === 'admin' ? 'default' : 'secondary'}
                  className="capitalize"
                >
                  {role === 'admin' ? 'Full Access' : role === 'manager' ? 'Limited Access' : 'Restricted'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Features Enabled</p>
                <p className="text-2xl font-bold text-primary">
                  {getEnabledCount(role)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Enabled Features</p>
                <div className="flex flex-wrap gap-1">
                  {features
                    .filter((f) => roleFeatureAccess[role][f.id])
                    .slice(0, 4)
                    .map((f) => (
                      <Badge key={f.id} variant="outline" className="text-xs">
                        {f.name.split(' ')[0]}
                      </Badge>
                    ))}
                  {getEnabledCount(role) > 4 && (
                    <Badge variant="outline" className="text-xs">
                      +{getEnabledCount(role) - 4}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2 sticky bottom-0 bg-background/95 backdrop-blur-sm p-4 rounded-lg border border-border">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave} className="gradient-primary gap-2">
          <Save className="h-4 w-4" />
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
