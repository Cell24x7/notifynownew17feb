import { useState } from 'react';
import { Search, Check, X, Settings, ExternalLink } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/ui/status-badge';
import { mockIntegrations, type Integration } from '@/lib/mockData';
import { useToast } from '@/hooks/use-toast';

const categories = [
  { value: 'all', label: 'All' },
  { value: 'ecommerce', label: '🛒 Ecommerce' },
  { value: 'payments', label: '💳 Payments' },
  { value: 'inventory', label: '📦 Inventory' },
  { value: 'crm', label: '📊 CRM & Support' },
  { value: 'scheduling', label: '📅 Scheduling' },
  { value: 'ai', label: '🤖 AI & Bots' },
  { value: 'utilities', label: '📄 Utilities' },
];

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleConnect = (integration: Integration) => {
    setSelectedIntegration(integration);
    setApiKey('');
    setIsSettingsOpen(true);
  };

  const handleDisconnect = (integrationId: string) => {
    setIntegrations(integrations.map((i) => 
      i.id === integrationId ? { ...i, connected: false } : i
    ));
    toast({
      title: 'Integration disconnected',
      description: 'The integration has been disconnected.',
    });
  };

  const handleSaveSettings = () => {
    if (selectedIntegration) {
      setIntegrations(integrations.map((i) => 
        i.id === selectedIntegration.id ? { ...i, connected: true } : i
      ));
      setIsSettingsOpen(false);
      toast({
        title: 'Integration connected',
        description: `${selectedIntegration.name} has been connected successfully.`,
      });
    }
  };

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">
            Connect your favorite tools • {connectedCount} of {integrations.length} connected
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-2 bg-transparent p-0">
          {categories.map((category) => (
            <TabsTrigger
              key={category.value}
              value={category.value}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-4"
            >
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {/* Integrations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredIntegrations.map((integration) => (
              <Card 
                key={integration.id} 
                className="card-elevated animate-slide-up hover:shadow-lg transition-all duration-200 cursor-pointer group"
                onClick={() => handleConnect(integration)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                      {integration.logo}
                    </div>
                    <StatusBadge status={integration.connected ? 'connected' : 'disconnected'} />
                  </div>
                  <h3 className="font-semibold text-lg mb-1">{integration.name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{integration.description}</p>
                  <div className="mt-4 flex gap-2">
                    {integration.connected ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleConnect(integration);
                          }}
                        >
                          <Settings className="h-4 w-4 mr-1" />
                          Settings
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDisconnect(integration.id);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button 
                        className="flex-1 gradient-primary" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleConnect(integration);
                        }}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-1">No integrations found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Integration Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-3xl">{selectedIntegration?.logo}</span>
              {selectedIntegration?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{selectedIntegration?.description}</p>
            
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can find your API key in your {selectedIntegration?.name} dashboard.
              </p>
            </div>

            {selectedIntegration?.connected && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-2 text-success">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-medium">Currently connected</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <Button variant="link" className="text-muted-foreground p-0">
                <ExternalLink className="h-4 w-4 mr-1" />
                View documentation
              </Button>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} className="gradient-primary">
                {selectedIntegration?.connected ? 'Save Settings' : 'Connect'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
