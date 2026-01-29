import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Phone, Smartphone, Instagram, Facebook, Check, Users, Shield, Building, Wallet, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, History, Mail, Bot, Palette, FolderOpen, Settings2, Globe, Bell, Lock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { mockUsers, type User } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ThemeSettings } from '@/components/settings/ThemeSettings';
import { FileManager } from '@/components/files/FileManager';
import { RCSConfiguration } from '@/components/settings/RCSConfiguration';
import { SMSConfiguration } from '@/components/settings/SMSConfiguration';
import { WhatsAppConfiguration } from '@/components/settings/WhatsAppConfiguration';
import { InstagramConfiguration } from '@/components/settings/InstagramConfiguration';
import { MessengerConfiguration } from '@/components/settings/MessengerConfiguration';
import { EmailConfiguration } from '@/components/settings/EmailConfiguration';
import { VoiceBotConfiguration } from '@/components/settings/VoiceBotConfiguration';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

interface ChannelConfig {
  smsChannelName?: string;
  smsLastTested?: string;
  whatsappBusinessName?: string;
  whatsappPhoneNumber?: string;
  instagramUsername?: string;
  instagramFollowers?: number;
  messengerPageName?: string;
  messengerPageId?: string;
  emailSenderName?: string;
  emailSenderEmail?: string;
  voiceBotPhoneNumber?: string;
  voiceBotProvider?: string;
}

const channelsList = [
  { id: 'whatsapp', name: 'WhatsApp Business', icon: MessageSquare, color: 'text-green-500', connected: false },
  { id: 'sms', name: 'SMS Gateway', icon: Phone, color: 'text-blue-500', connected: false },
  { id: 'rcs', name: 'RCS Messaging', icon: Smartphone, color: 'text-purple-500', connected: false },
  { id: 'instagram', name: 'Instagram DM', icon: Instagram, color: 'text-pink-500', connected: false },
  { id: 'facebook', name: 'Facebook Messenger', icon: Facebook, color: 'text-blue-600', connected: false },
  { id: 'email', name: 'Email', icon: Mail, color: 'text-orange-500', connected: false },
  { id: 'voicebot', name: 'Voice BOT', icon: Bot, color: 'text-cyan-500', connected: false },
];

const permissions = [
  { id: 'view_chats', label: 'View Chats' },
  { id: 'reply_chats', label: 'Reply to Chats' },
  { id: 'manage_campaigns', label: 'Manage Campaigns' },
  { id: 'edit_automations', label: 'Edit Automations' },
  { id: 'manage_integrations', label: 'Manage Integrations' },
  { id: 'access_billing', label: 'Access Billing' },
  { id: 'manage_settings', label: 'Manage Settings' },
];

const rolePermissions: Record<string, string[]> = {
  admin: permissions.map(p => p.id),
  manager: ['view_chats', 'reply_chats', 'manage_campaigns', 'edit_automations'],
  agent: ['view_chats', 'reply_chats'],
};

const walletTransactions = [
  { id: '1', type: 'credit', amount: 500, description: 'Wallet Recharge', date: '2024-01-15', status: 'completed' },
  { id: '2', type: 'debit', amount: 50, description: 'WhatsApp Messages (1000)', date: '2024-01-14', status: 'completed' },
  { id: '3', type: 'debit', amount: 25, description: 'SMS Campaign', date: '2024-01-13', status: 'completed' },
  { id: '4', type: 'credit', amount: 200, description: 'Bonus Credits', date: '2024-01-10', status: 'completed' },
  { id: '5', type: 'debit', amount: 75, description: 'WhatsApp Messages (1500)', date: '2024-01-08', status: 'completed' },
];

export default function Settings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') || 'channels';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };
  const [channels, setChannels] = useState(channelsList);
  const [users, setUsers] = useState<User[]>([]);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ email: '', role: 'agent' as User['role'], department: '' });
  const [showRCSConfig, setShowRCSConfig] = useState(false);
  const [showSMSConfig, setShowSMSConfig] = useState(false);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [showInstagramConfig, setShowInstagramConfig] = useState(false);
  const [showMessengerConfig, setShowMessengerConfig] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showVoiceBotConfig, setShowVoiceBotConfig] = useState(false);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig>({});
  const { toast } = useToast();

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'wallet') {
      fetchWallet();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/profile/team', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchWallet = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch transactions
      const resTx = await fetch('http://localhost:5000/api/wallet/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataTx = await resTx.json();
      if (dataTx.success) {
        setTransactions(dataTx.transactions);
      }
      
      // Fetch profile for balance
      const resProfile = await fetch('http://localhost:5000/api/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataProfile = await resProfile.json();
      if (dataProfile.success) {
        setWalletBalance(dataProfile.user.credits_available || 0);
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const handleRecharge = () => {
    const amount = parseFloat(rechargeAmount);
    if (amount > 0) {
      toast({
        title: 'Recharge Successful',
        description: `₹${amount} has been added to your wallet.`,
      });
      setIsRechargeOpen(false);
      setRechargeAmount('');
    }
  };

  const handleChannelToggle = (channelId: string) => {
    setChannels(channels.map(c => 
      c.id === channelId ? { ...c, connected: !c.connected } : c
    ));
    const channel = channels.find(c => c.id === channelId);
    toast({
      title: channel?.connected ? 'Channel disconnected' : 'Channel connected',
      description: `${channel?.name} has been ${channel?.connected ? 'disconnected' : 'connected'}.`,
    });
  };

  const handleInviteUser = () => {
    const user: User = {
      id: Date.now().toString(),
      name: newUser.email.split('@')[0],
      email: newUser.email,
      role: newUser.role,
      status: 'offline',
      department: newUser.department,
    };
    setUsers([...users, user]);
    setIsInviteOpen(false);
    setNewUser({ email: '', role: 'agent', department: '' });
    toast({
      title: 'Invitation sent',
      description: `An invitation has been sent to ${newUser.email}.`,
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in overflow-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm md:text-base">Manage your channels, users, and permissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 md:space-y-6">
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0">
          <TabsList className="inline-flex w-auto min-w-full md:w-auto md:min-w-0 gap-1">
            <TabsTrigger value="channels" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Channels</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Users</span>
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Shield className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Roles</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Wallet className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Globe className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Language</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Lock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Bell className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="theme" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Palette className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Theme</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <FolderOpen className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Files</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-4">
          {showRCSConfig ? (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => setShowRCSConfig(false)}
                className="mb-4"
              >
                ← Back to Channels
              </Button>
              <RCSConfiguration />
            </div>
          ) : showSMSConfig ? (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => setShowSMSConfig(false)}
                className="mb-4"
              >
                ← Back to Channels
              </Button>
              <SMSConfiguration 
                onSave={(config) => {
                  setChannels(channels.map(c => 
                    c.id === 'sms' ? { ...c, connected: true } : c
                  ));
                  setChannelConfigs({
                    ...channelConfigs,
                    smsChannelName: config.channelName,
                    smsLastTested: new Date().toLocaleString(),
                  });
                  setShowSMSConfig(false);
                }}
                onCancel={() => setShowSMSConfig(false)}
              />
            </div>
          ) : showWhatsAppConfig ? (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => setShowWhatsAppConfig(false)}
                className="mb-4"
              >
                ← Back to Channels
              </Button>
              <WhatsAppConfiguration 
                onSave={(config) => {
                  setChannels(channels.map(c => 
                    c.id === 'whatsapp' ? { ...c, connected: true } : c
                  ));
                  setChannelConfigs({
                    ...channelConfigs,
                    whatsappBusinessName: config.businessName,
                    whatsappPhoneNumber: config.phoneNumber,
                  });
                  setShowWhatsAppConfig(false);
                }}
                onCancel={() => setShowWhatsAppConfig(false)}
              />
            </div>
          ) : showInstagramConfig ? (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => setShowInstagramConfig(false)}
                className="mb-4"
              >
                ← Back to Channels
              </Button>
              <InstagramConfiguration 
                onSave={(config) => {
                  setChannels(channels.map(c => 
                    c.id === 'instagram' ? { ...c, connected: true } : c
                  ));
                  setChannelConfigs({
                    ...channelConfigs,
                    instagramUsername: config.instagramUsername,
                    instagramFollowers: config.followersCount,
                  });
                  setShowInstagramConfig(false);
                }}
                onCancel={() => setShowInstagramConfig(false)}
              />
            </div>
          ) : showMessengerConfig ? (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => setShowMessengerConfig(false)}
                className="mb-4"
              >
                ← Back to Channels
              </Button>
              <MessengerConfiguration 
                onSave={(config) => {
                  setChannels(channels.map(c => 
                    c.id === 'facebook' ? { ...c, connected: true } : c
                  ));
                  setChannelConfigs({
                    ...channelConfigs,
                    messengerPageName: config.pageName,
                    messengerPageId: config.pageId,
                  });
                  setShowMessengerConfig(false);
                }}
                onCancel={() => setShowMessengerConfig(false)}
              />
            </div>
          ) : showEmailConfig ? (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => setShowEmailConfig(false)}
                className="mb-4"
              >
                ← Back to Channels
              </Button>
              <EmailConfiguration 
                onSave={(config) => {
                  setChannels(channels.map(c => 
                    c.id === 'email' ? { ...c, connected: true } : c
                  ));
                  setChannelConfigs({
                    ...channelConfigs,
                    emailSenderName: config.senderName,
                    emailSenderEmail: config.senderEmail,
                  });
                  setShowEmailConfig(false);
                }}
                onCancel={() => setShowEmailConfig(false)}
              />
            </div>
          ) : showVoiceBotConfig ? (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => setShowVoiceBotConfig(false)}
                className="mb-4"
              >
                ← Back to Channels
              </Button>
              <VoiceBotConfiguration 
                onSave={(config) => {
                  setChannels(channels.map(c => 
                    c.id === 'voicebot' ? { ...c, connected: true } : c
                  ));
                  setChannelConfigs({
                    ...channelConfigs,
                    voiceBotPhoneNumber: config.phoneNumber,
                    voiceBotProvider: config.providerType,
                  });
                  setShowVoiceBotConfig(false);
                }}
                onCancel={() => setShowVoiceBotConfig(false)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {channels.map((channel) => (
                <Card key={channel.id} className="card-elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-muted`}>
                          <channel.icon className={`h-6 w-6 ${channel.color}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">{channel.name}</h3>
                          {channel.id === 'sms' && channel.connected && channelConfigs.smsChannelName && (
                            <p className="text-xs text-muted-foreground">{channelConfigs.smsChannelName}</p>
                          )}
                          {channel.id === 'whatsapp' && channel.connected && channelConfigs.whatsappBusinessName && (
                            <p className="text-xs text-muted-foreground">{channelConfigs.whatsappBusinessName}</p>
                          )}
                          {channel.id === 'instagram' && channel.connected && channelConfigs.instagramUsername && (
                            <p className="text-xs text-muted-foreground">{channelConfigs.instagramUsername}</p>
                          )}
                          {channel.id === 'facebook' && channel.connected && channelConfigs.messengerPageName && (
                            <p className="text-xs text-muted-foreground">{channelConfigs.messengerPageName}</p>
                          )}
                          {channel.id === 'email' && channel.connected && channelConfigs.emailSenderName && (
                            <p className="text-xs text-muted-foreground">{channelConfigs.emailSenderName}</p>
                          )}
                          {channel.id === 'voicebot' && channel.connected && channelConfigs.voiceBotProvider && (
                            <p className="text-xs text-muted-foreground capitalize">{channelConfigs.voiceBotProvider}</p>
                          )}
                          <StatusBadge status={channel.connected ? 'connected' : 'disconnected'} />
                          {channel.id === 'sms' && channel.connected && channelConfigs.smsLastTested && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last tested: {channelConfigs.smsLastTested}
                            </p>
                          )}
                          {channel.id === 'whatsapp' && channel.connected && channelConfigs.whatsappPhoneNumber && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {channelConfigs.whatsappPhoneNumber}
                            </p>
                          )}
                          {channel.id === 'instagram' && channel.connected && channelConfigs.instagramFollowers && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {channelConfigs.instagramFollowers >= 1000 
                                ? (channelConfigs.instagramFollowers / 1000).toFixed(1) + 'K' 
                                : channelConfigs.instagramFollowers} followers
                            </p>
                          )}
                          {channel.id === 'facebook' && channel.connected && channelConfigs.messengerPageId && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Page ID: {channelConfigs.messengerPageId}
                            </p>
                          )}
                          {channel.id === 'email' && channel.connected && channelConfigs.emailSenderEmail && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {channelConfigs.emailSenderEmail}
                            </p>
                          )}
                          {channel.id === 'voicebot' && channel.connected && channelConfigs.voiceBotPhoneNumber && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {channelConfigs.voiceBotPhoneNumber}
                            </p>
                          )}
                        </div>
                      </div>
                      <Switch
                        checked={channel.connected}
                        onCheckedChange={() => {
                          if (channel.id === 'sms' && !channel.connected) {
                            setShowSMSConfig(true);
                          } else if (channel.id === 'rcs' && !channel.connected) {
                            setShowRCSConfig(true);
                          } else if (channel.id === 'whatsapp' && !channel.connected) {
                            setShowWhatsAppConfig(true);
                          } else if (channel.id === 'instagram' && !channel.connected) {
                            setShowInstagramConfig(true);
                          } else if (channel.id === 'facebook' && !channel.connected) {
                            setShowMessengerConfig(true);
                          } else if (channel.id === 'email' && !channel.connected) {
                            setShowEmailConfig(true);
                          } else if (channel.id === 'voicebot' && !channel.connected) {
                            setShowVoiceBotConfig(true);
                          } else {
                            handleChannelToggle(channel.id);
                          }
                        }}
                      />
                    </div>
                    {channel.connected && (
                      <div className="mt-4 pt-4 border-t border-border flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (channel.id === 'rcs') {
                              setShowRCSConfig(true);
                            } else if (channel.id === 'sms') {
                              setShowSMSConfig(true);
                            } else if (channel.id === 'whatsapp') {
                              setShowWhatsAppConfig(true);
                            } else if (channel.id === 'instagram') {
                              setShowInstagramConfig(true);
                            } else if (channel.id === 'facebook') {
                              setShowMessengerConfig(true);
                            } else if (channel.id === 'email') {
                              setShowEmailConfig(true);
                            } else if (channel.id === 'voicebot') {
                              setShowVoiceBotConfig(true);
                            } else {
                              toast({
                                title: 'Configure ' + channel.name,
                                description: 'Configuration panel will open here.',
                              });
                            }
                          }}
                        >
                          <Settings2 className="h-4 w-4 mr-2" />
                          Manage
                        </Button>
                        {(channel.id === 'sms' || channel.id === 'whatsapp' || channel.id === 'rcs' || channel.id === 'instagram' || channel.id === 'facebook' || channel.id === 'email' || channel.id === 'voicebot') && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleChannelToggle(channel.id)}
                          >
                            Disable
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Team Members</h2>
              <p className="text-sm text-muted-foreground">{users.length} members in your team</p>
            </div>
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Users className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: User['role']) => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select
                      value={newUser.department}
                      onValueChange={(value) => setNewUser({ ...newUser, department: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Support">Support</SelectItem>
                        <SelectItem value="Sales">Sales</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleInviteUser} className="gradient-primary">
                      Send Invitation
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {users.map((user) => (
              <Card key={user.id} className="card-elevated">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-medium text-primary">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.name}</span>
                          <Badge variant={user.status === 'online' ? 'default' : 'secondary'} className="text-xs">
                            {user.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge variant="outline" className="capitalize">{user.role}</Badge>
                        {user.department && (
                          <p className="text-xs text-muted-foreground mt-1">{user.department}</p>
                        )}
                      </div>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
              <CardDescription>Configure what each role can access and modify</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium">Permission</th>
                      <th className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          Admin
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Building className="h-4 w-4 text-secondary" />
                          Manager
                        </div>
                      </th>
                      <th className="text-center py-3 px-4 font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          Agent
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map((permission) => (
                      <tr key={permission.id} className="border-b border-border/50">
                        <td className="py-3 px-4">{permission.label}</td>
                        {['admin', 'manager', 'agent'].map((role) => (
                          <td key={role} className="text-center py-3 px-4">
                            <div className="flex justify-center">
                              <Checkbox
                                checked={rolePermissions[role].includes(permission.id)}
                                disabled={role === 'admin'}
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <Button className="gradient-primary">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Wallet Tab */}
        <TabsContent value="wallet" className="space-y-6">
          {/* Wallet Balance Card */}
          <Card className="card-elevated bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <h2 className="text-4xl font-bold text-primary">₹{walletBalance.toLocaleString()}</h2>
                  <p className="text-sm text-muted-foreground mt-1">≈ {Math.floor(walletBalance * 20)} WhatsApp messages</p>
                </div>
                <Dialog open={isRechargeOpen} onOpenChange={setIsRechargeOpen}>
                  <DialogTrigger asChild>
                    <Button className="gradient-primary" size="lg">
                      <Plus className="h-4 w-4 mr-2" />
                      Recharge Wallet
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Recharge Wallet</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Amount (₹)</Label>
                        <Input
                          type="number"
                          placeholder="Enter amount"
                          value={rechargeAmount}
                          onChange={(e) => setRechargeAmount(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[100, 250, 500, 1000].map((amount) => (
                          <Button
                            key={amount}
                            variant="outline"
                            onClick={() => setRechargeAmount(amount.toString())}
                            className={rechargeAmount === amount.toString() ? 'border-primary bg-primary/10' : ''}
                          >
                            ₹{amount}
                          </Button>
                        ))}
                      </div>
                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-2">Payment Method</h4>
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" className="justify-start gap-2">
                            <CreditCard className="h-4 w-4" />
                            Credit/Debit Card
                          </Button>
                          <Button variant="outline" className="justify-start gap-2">
                            <Wallet className="h-4 w-4" />
                            UPI
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsRechargeOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleRecharge} className="gradient-primary" disabled={!rechargeAmount}>
                          Pay ₹{rechargeAmount || '0'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <ArrowDownLeft className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Credited</p>
                    <p className="text-xl font-bold">₹700</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-500/10">
                    <ArrowUpRight className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                    <p className="text-xl font-bold">₹150</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="card-elevated">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <History className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Transactions</p>
                    <p className="text-xl font-bold">{walletTransactions.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transaction History */}
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Transaction History
              </CardTitle>
              <CardDescription>Your recent wallet transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2 rounded-full',
                        transaction.type === 'adjustment' ? 'bg-green-500/10' : 'bg-red-500/10'
                      )}>
                        {transaction.type === 'adjustment' ? (
                          <ArrowDownLeft className="h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(transaction.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      'font-semibold',
                      transaction.type === 'adjustment' ? 'text-green-500' : 'text-red-500'
                    )}>
                      {transaction.type === 'adjustment' ? '+' : '-'}₹{transaction.credits}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Language Tab */}
        <TabsContent value="language">
          <LanguageSettings />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme">
          <ThemeSettings />
        </TabsContent>

        {/* File Manager Tab */}
        <TabsContent value="files">
          <FileManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}