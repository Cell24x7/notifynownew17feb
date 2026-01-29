import { useState } from 'react';
import { Bell, Volume2, MessageSquare, Users, Send, Zap, AlertCircle, CheckCircle, Play } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const notificationEvents = [
  { id: 'new_message', label: 'New Message Received', icon: MessageSquare, description: 'When a new chat message arrives' },
  { id: 'new_contact', label: 'New Contact Added', icon: Users, description: 'When a new contact is created' },
  { id: 'campaign_complete', label: 'Campaign Completed', icon: Send, description: 'When a campaign finishes sending' },
  { id: 'automation_triggered', label: 'Automation Triggered', icon: Zap, description: 'When an automation workflow runs' },
  { id: 'error_alert', label: 'Error Alerts', icon: AlertCircle, description: 'When an error occurs in the system' },
  { id: 'success_alert', label: 'Success Notifications', icon: CheckCircle, description: 'When an action completes successfully' },
];

const notificationSounds = [
  { id: 'default', name: 'Default', file: 'default.mp3' },
  { id: 'chime', name: 'Chime', file: 'chime.mp3' },
  { id: 'bell', name: 'Bell', file: 'bell.mp3' },
  { id: 'pop', name: 'Pop', file: 'pop.mp3' },
  { id: 'ding', name: 'Ding', file: 'ding.mp3' },
  { id: 'none', name: 'No Sound', file: null },
];

interface NotificationPreference {
  enabled: boolean;
  chrome: boolean;
  sound: boolean;
}

export function NotificationSettings() {
  const { toast } = useToast();
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState('default');
  const [preferences, setPreferences] = useState<Record<string, NotificationPreference>>(() => {
    const initial: Record<string, NotificationPreference> = {};
    notificationEvents.forEach(event => {
      initial[event.id] = { enabled: true, chrome: true, sound: true };
    });
    return initial;
  });

  const handlePreferenceChange = (eventId: string, key: keyof NotificationPreference, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [eventId]: { ...prev[eventId], [key]: value }
    }));
  };

  const requestChromePermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive browser notifications.',
        });
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Please enable notifications in your browser settings.',
          variant: 'destructive',
        });
      }
    }
  };

  const playTestSound = () => {
    // In a real app, this would play the actual sound file
    toast({
      title: 'Sound Test',
      description: `Playing "${notificationSounds.find(s => s.id === selectedSound)?.name}" sound`,
    });
  };

  const handleSave = () => {
    toast({
      title: 'Settings Saved',
      description: 'Your notification preferences have been updated.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Control how and when you receive notifications
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="master-toggle" className="text-sm text-muted-foreground">
                {masterEnabled ? 'Enabled' : 'Disabled'}
              </Label>
              <Switch
                id="master-toggle"
                checked={masterEnabled}
                onCheckedChange={setMasterEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={requestChromePermission}
              disabled={!masterEnabled}
            >
              <Bell className="h-4 w-4 mr-2" />
              Enable Browser Notifications
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sound Settings */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Sound Settings</CardTitle>
              <CardDescription>
                Choose the notification sound you prefer
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="sound-select" className="mb-2 block">Notification Sound</Label>
              <Select value={selectedSound} onValueChange={setSelectedSound} disabled={!masterEnabled}>
                <SelectTrigger id="sound-select">
                  <SelectValue placeholder="Select a sound" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border">
                  {notificationSounds.map((sound) => (
                    <SelectItem key={sound.id} value={sound.id}>
                      {sound.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={playTestSound}
              disabled={!masterEnabled || selectedSound === 'none'}
              className="mt-6 sm:mt-0"
            >
              <Play className="h-4 w-4 mr-2" />
              Test Sound
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Event Preferences */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle>Event Notifications</CardTitle>
          <CardDescription>
            Choose which events trigger notifications and how you want to be notified
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Header */}
            <div className="hidden md:grid md:grid-cols-[1fr,80px,80px,80px] gap-4 pb-2 border-b border-border text-sm text-muted-foreground font-medium">
              <div>Event</div>
              <div className="text-center">Enabled</div>
              <div className="text-center">Browser</div>
              <div className="text-center">Sound</div>
            </div>

            {/* Events */}
            {notificationEvents.map((event) => {
              const pref = preferences[event.id];
              return (
                <div
                  key={event.id}
                  className={cn(
                    'grid grid-cols-1 md:grid-cols-[1fr,80px,80px,80px] gap-4 p-4 rounded-lg border border-border transition-opacity',
                    !masterEnabled && 'opacity-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <event.icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{event.label}</p>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-center">
                    <span className="md:hidden text-sm text-muted-foreground">Enabled</span>
                    <Switch
                      checked={pref.enabled}
                      onCheckedChange={(v) => handlePreferenceChange(event.id, 'enabled', v)}
                      disabled={!masterEnabled}
                    />
                  </div>

                  <div className="flex items-center justify-between md:justify-center">
                    <span className="md:hidden text-sm text-muted-foreground">Browser</span>
                    <Switch
                      checked={pref.chrome}
                      onCheckedChange={(v) => handlePreferenceChange(event.id, 'chrome', v)}
                      disabled={!masterEnabled || !pref.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between md:justify-center">
                    <span className="md:hidden text-sm text-muted-foreground">Sound</span>
                    <Switch
                      checked={pref.sound}
                      onCheckedChange={(v) => handlePreferenceChange(event.id, 'sound', v)}
                      disabled={!masterEnabled || !pref.enabled}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <Button onClick={handleSave} className="gradient-primary" disabled={!masterEnabled}>
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
