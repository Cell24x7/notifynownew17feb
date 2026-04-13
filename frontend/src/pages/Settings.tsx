import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Phone, Smartphone, Instagram, Facebook, Plus, Mail, Bot, Settings2, Globe, Lock, CreditCard, User } from 'lucide-react';
import UserPlans from './UserPlans';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { StatusBadge } from '@/components/ui/status-badge';

import { useAuth } from '@/contexts/AuthContext';
import { API_BASE_URL } from '@/config/api';
import axios from 'axios';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

import { RCSConfiguration } from '@/components/settings/RCSConfiguration';
import { SMSConfiguration } from '@/components/settings/SMSConfiguration';
import { WhatsAppConfiguration } from '@/components/settings/WhatsAppConfiguration';
import { InstagramConfiguration } from '@/components/settings/InstagramConfiguration';
import { MessengerConfiguration } from '@/components/settings/MessengerConfiguration';
import { EmailConfiguration } from '@/components/settings/EmailConfiguration';
import { VoiceBotConfiguration } from '@/components/settings/VoiceBotConfiguration';
import { LanguageSettings } from '@/components/settings/LanguageSettings';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
import { ProfileSettings } from '@/components/settings/ProfileSettings';

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
  { id: 'voicebot', name: 'AI Voice Bot', icon: Phone, color: 'text-red-500', connected: false },
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

  const [showRCSConfig, setShowRCSConfig] = useState(false);
  const [showSMSConfig, setShowSMSConfig] = useState(false);
  const [showWhatsAppConfig, setShowWhatsAppConfig] = useState(false);
  const [showInstagramConfig, setShowInstagramConfig] = useState(false);
  const [showMessengerConfig, setShowMessengerConfig] = useState(false);
  const [showEmailConfig, setShowEmailConfig] = useState(false);
  const [showVoiceBotConfig, setShowVoiceBotConfig] = useState(false);
  const [channelConfigs, setChannelConfigs] = useState<ChannelConfig>({});
  const { toast } = useToast();
  const { user: authUser, refreshUser } = useAuth();
  const [dbUser, setDbUser] = useState<any>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const response = await axios.get(`${API_BASE_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          const user = response.data.user;
          setDbUser(user);
          
          // Parse channels_enabled
          let enabledChannels: string[] = [];
          if (user.channels_enabled) {
            try {
              enabledChannels = typeof user.channels_enabled === 'string' 
                ? JSON.parse(user.channels_enabled) 
                : user.channels_enabled;
            } catch (e) {
              console.error('Error parsing channels_enabled:', e);
            }
          }

          // Update channels list based on DB
          setChannels(prev => prev.map(c => ({
            ...c,
            connected: enabledChannels.includes(c.id)
          })));
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };
    fetchProfile();
  }, []);

  const isChannelAuthorized = (channelId: string) => {
    if (dbUser?.role === 'admin' || dbUser?.role === 'superadmin') return true;
    let enabledChannels: string[] = [];
    if (dbUser?.channels_enabled) {
      try {
        enabledChannels = typeof dbUser.channels_enabled === 'string' 
          ? JSON.parse(dbUser.channels_enabled) 
          : dbUser.channels_enabled;
      } catch (e) {
        console.error('Error parsing channels_enabled:', e);
      }
    }
    return enabledChannels.includes(channelId);
  };

  const handleChannelToggle = async (channelId: string) => {
    if (!isChannelAuthorized(channelId)) {
      toast({
        title: 'Access Denied',
        description: "You haven't purchased this service yet. Please contact support to activate this channel.",
        variant: 'destructive'
      });
      return;
    }

    const newChannels = channels.map(c => 
      c.id === channelId ? { ...c, connected: !c.connected } : c
    );
    
    const isConnecting = !channels.find(c => c.id === channelId)?.connected;
    
    try {
      const token = localStorage.getItem('authToken');
      const enabledIds = newChannels.filter(c => c.connected).map(c => c.id);
      
      await axios.put(`${API_BASE_URL}/api/auth/channels`, 
        { channels: enabledIds },
        { headers: { Authorization: `Bearer ${token}` }}
      );

      setChannels(newChannels);
      await refreshUser();

      toast({
        title: isConnecting ? 'Channel connected' : 'Channel disconnected',
        description: `${channels.find(c => c.id === channelId)?.name} has been ${isConnecting ? 'connected' : 'disconnected'}.`,
      });
    } catch (err) {
      console.error('Error toggling channel:', err);
      toast({
        title: 'Error',
        description: 'Failed to update channel status.',
        variant: 'destructive'
      });
    }
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
            <TabsTrigger value="profile" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <User className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="channels" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <MessageSquare className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Channels</span>
            </TabsTrigger>

            <TabsTrigger value="language" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Globe className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Language</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <Lock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Security</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
              <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Plans</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <ProfileSettings />
        </TabsContent>

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
                onSave={() => {
                  setChannels(channels.map(c => 
                    c.id === 'voicebot' ? { ...c, connected: true } : c
                  ));
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
                        </div>
                      </div>
                      <div 
                        className={!isChannelAuthorized(channel.id) ? "cursor-not-allowed" : ""}
                        onClick={(e) => {
                          if (!isChannelAuthorized(channel.id)) {
                            e.preventDefault();
                            toast({
                              title: 'Access Denied',
                              description: "You haven't purchased this service yet. Please contact support to activate this channel.",
                              variant: 'destructive'
                            });
                          }
                        }}
                      >
                        <Switch
                          checked={channel.connected}
                          disabled={!isChannelAuthorized(channel.id) || channel.connected}
                          style={{ pointerEvents: (!isChannelAuthorized(channel.id) || channel.connected) ? 'none' : 'auto' }}
                          onCheckedChange={() => {
                            if (!isChannelAuthorized(channel.id)) return;

                            if (channel.id === 'sms' && !channel.connected) {
                              setShowSMSConfig(true);
                            } else if (channel.id === 'rcs' && !channel.connected) {
                              setShowRCSConfig(true);
                            } else if (channel.id === 'whatsapp' && !channel.connected) {
                              setShowWhatsAppConfig(true);
                            } else if (channel.id === 'voicebot' && !channel.connected) {
                              setShowVoiceBotConfig(true);
                            } else {
                              handleChannelToggle(channel.id);
                            }
                          }}
                        />
                      </div>
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
                            } else if (channel.id === 'voicebot') {
                              setShowVoiceBotConfig(true);
                            } else {
                              toast({
                                title: 'Configure ' + channel.name,
                                description: 'Configuration panel will open here.',
                              });
                            }
                          }}
                          disabled={!isChannelAuthorized(channel.id)}
                        >
                          <Settings2 className="h-4 w-4 mr-2" />
                          Manage
                        </Button>

                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        {/* Language Tab */}
        <TabsContent value="language">
          <LanguageSettings />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <div className="pt-4">
            <UserPlans embedded={true} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}