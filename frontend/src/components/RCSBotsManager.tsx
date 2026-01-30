import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  Trash2, 
  Edit2, 
  Eye,
  Plus,
  Loader2,
  Check,
  X,
  Send,
  RefreshCw
} from 'lucide-react';

const API_URL = `http://${window.location.hostname}:5000`;

interface Bot {
  id: string;
  bot_name: string;
  brand_name: string;
  short_description: string;
  bot_type: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'SUSPENDED';
  message_type: string;
  languages_supported: string;
  billing_category: string;
  development_platform: string;
  bot_logo_url?: string;
  banner_image_url?: string;
  brand_color?: string;
  callback_url?: string;
  webhook_url?: string;
  privacy_url?: string;
  terms_url?: string;
  agree_all_carriers?: boolean;
  contacts?: any[];
  rejection_reason?: string;
  created_at: string;
  submitted_at?: string;
}

export function RCSBotsManager() {
  const { toast } = useToast();
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    bot_name: '',
    brand_name: '',
    short_description: '',
    bot_type: 'DOMESTIC',
    route_type: 'DOMESTIC',
    message_type: 'OTP',
    languages_supported: 'English',
    billing_category: 'SINGLE MESSAGE',
    development_platform: 'GOOGLE_API',
    brand_color: '#7C3AED',
    callback_url: '',
    webhook_url: '',
    privacy_url: '',
    terms_url: '',
    agree_all_carriers: false,
    bot_logo_url: '',
    banner_image_url: '',
    contacts: []
  });

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/rcs/bots`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch bots');
      const data = await response.json();
      setBots(data.bots || []);
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch bots',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBot = async () => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/rcs/bots`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create bot');
      
      toast({
        title: 'Success',
        description: 'Bot created successfully'
      });

      setShowCreateDialog(false);
      setFormData({
        bot_name: '',
        brand_name: '',
        short_description: '',
        bot_type: 'DOMESTIC',
        route_type: 'DOMESTIC',
        message_type: 'OTP',
        languages_supported: 'English',
        billing_category: 'SINGLE MESSAGE',
        development_platform: 'GOOGLE_API',
        brand_color: '#7C3AED',
        callback_url: '',
        webhook_url: '',
        privacy_url: '',
        terms_url: '',
        agree_all_carriers: false,
        bot_logo_url: '',
        banner_image_url: '',
        contacts: []
      });

      fetchBots();
    } catch (error) {
      console.error('Error creating bot:', error);
      toast({
        title: 'Error',
        description: 'Failed to create bot',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitBot = async (botId: string) => {
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/rcs/bots/${botId}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to submit bot');

      toast({
        title: 'Success',
        description: 'Bot submitted for approval'
      });

      setShowDetailDialog(false);
      fetchBots();
    } catch (error) {
      console.error('Error submitting bot:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit bot',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBot = async (botId: string) => {
    if (!window.confirm('Are you sure you want to delete this bot?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/rcs/bots/${botId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to delete bot');

      toast({
        title: 'Success',
        description: 'Bot deleted successfully'
      });

      fetchBots();
    } catch (error) {
      console.error('Error deleting bot:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete bot',
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'DRAFT': 'bg-gray-200 text-gray-800',
      'SUBMITTED': 'bg-blue-200 text-blue-800',
      'APPROVED': 'bg-green-200 text-green-800',
      'REJECTED': 'bg-red-200 text-red-800',
      'ACTIVE': 'bg-green-500 text-white',
      'SUSPENDED': 'bg-yellow-600 text-white'
    };

    return (
      <Badge className={variants[status] || 'bg-gray-200 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RCS Bots</h1>
          <p className="text-muted-foreground mt-1">Manage your RCS bot configurations</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchBots} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Bot
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New RCS Bot</DialogTitle>
                <DialogDescription>Configure your RCS bot for onboarding approval</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                {/* Basic Info */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Basic Information</h3>
                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="bot_name" className="text-xs">Bot Name *</Label>
                      <Input
                        id="bot_name"
                        placeholder="Enter bot name"
                        value={formData.bot_name}
                        onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="brand_name" className="text-xs">Brand Name *</Label>
                      <Input
                        id="brand_name"
                        placeholder="Enter brand name"
                        value={formData.brand_name}
                        onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="short_description" className="text-xs">Description</Label>
                      <Textarea
                        id="short_description"
                        placeholder="Enter bot description"
                        value={formData.short_description}
                        onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Configuration */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Configuration</h3>
                  <div className="grid gap-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="bot_type" className="text-xs">Bot Type</Label>
                        <select
                          id="bot_type"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          value={formData.bot_type}
                          onChange={(e) => setFormData({ ...formData, bot_type: e.target.value })}
                        >
                          <option value="DOMESTIC">Domestic</option>
                          <option value="INTERNATIONAL">International</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="message_type" className="text-xs">Message Type</Label>
                        <select
                          id="message_type"
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          value={formData.message_type}
                          onChange={(e) => setFormData({ ...formData, message_type: e.target.value })}
                        >
                          <option value="OTP">OTP</option>
                          <option value="TRANSACTIONAL">Transactional</option>
                          <option value="PROMOTIONAL">Promotional</option>
                          <option value="ALERT">Alert</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="languages_supported" className="text-xs">Languages</Label>
                        <Input
                          id="languages_supported"
                          placeholder="e.g., English, Hindi"
                          value={formData.languages_supported}
                          onChange={(e) => setFormData({ ...formData, languages_supported: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="brand_color" className="text-xs">Brand Color</Label>
                        <Input
                          id="brand_color"
                          type="color"
                          value={formData.brand_color}
                          onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* URLs */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">URLs</h3>
                  <div className="grid gap-3">
                    <div>
                      <Label htmlFor="callback_url" className="text-xs">Callback URL</Label>
                      <Input
                        id="callback_url"
                        type="url"
                        placeholder="https://example.com/callback"
                        value={formData.callback_url}
                        onChange={(e) => setFormData({ ...formData, callback_url: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhook_url" className="text-xs">Webhook URL</Label>
                      <Input
                        id="webhook_url"
                        type="url"
                        placeholder="https://example.com/webhook"
                        value={formData.webhook_url}
                        onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="privacy_url" className="text-xs">Privacy URL</Label>
                      <Input
                        id="privacy_url"
                        type="url"
                        placeholder="https://example.com/privacy"
                        value={formData.privacy_url}
                        onChange={(e) => setFormData({ ...formData, privacy_url: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="terms_url" className="text-xs">Terms URL</Label>
                      <Input
                        id="terms_url"
                        type="url"
                        placeholder="https://example.com/terms"
                        value={formData.terms_url}
                        onChange={(e) => setFormData({ ...formData, terms_url: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateBot}
                    disabled={isSubmitting || !formData.bot_name || !formData.brand_name}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Bot
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Bots List */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading bots...</span>
          </CardContent>
        </Card>
      ) : bots.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <p className="text-muted-foreground text-lg">No bots created yet</p>
              <p className="text-sm text-muted-foreground mt-1">Click "New Bot" to create your first RCS bot</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {bots.map((bot) => (
            <Card key={bot.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold text-lg">{bot.bot_name}</h3>
                        <p className="text-sm text-muted-foreground">{bot.brand_name}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{bot.short_description}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {getStatusBadge(bot.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(bot.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Message Type</p>
                    <p className="font-medium">{bot.message_type}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Languages</p>
                    <p className="font-medium">{bot.languages_supported}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Billing</p>
                    <p className="font-medium">{bot.billing_category}</p>
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs">Type</p>
                    <p className="font-medium">{bot.bot_type}</p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t">
                  <Dialog open={showDetailDialog && selectedBot?.id === bot.id} onOpenChange={setShowDetailDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBot(bot)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{selectedBot?.bot_name}</DialogTitle>
                        <DialogDescription>{selectedBot?.brand_name}</DialogDescription>
                      </DialogHeader>

                      <div className="grid gap-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-3">Bot Details</h4>
                          <div className="grid gap-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ID:</span>
                              <span className="font-mono text-xs">{selectedBot?.id}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Status:</span>
                              <span>{getStatusBadge(selectedBot?.status || 'DRAFT')}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Type:</span>
                              <span>{selectedBot?.bot_type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Message Type:</span>
                              <span>{selectedBot?.message_type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Languages:</span>
                              <span>{selectedBot?.languages_supported}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Created:</span>
                              <span>{selectedBot && new Date(selectedBot.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {selectedBot?.rejection_reason && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm font-medium text-red-800">Rejection Reason:</p>
                            <p className="text-sm text-red-700 mt-1">{selectedBot.rejection_reason}</p>
                          </div>
                        )}

                        {selectedBot?.status === 'DRAFT' && (
                          <div className="flex gap-2 justify-end pt-4">
                            <Button
                              variant="outline"
                              onClick={() => setShowDetailDialog(false)}
                            >
                              Close
                            </Button>
                            <Button
                              onClick={() => selectedBot && handleSubmitBot(selectedBot.id)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Submitting...
                                </>
                              ) : (
                                <>
                                  <Send className="h-4 w-4 mr-2" />
                                  Submit for Approval
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {bot.status === 'DRAFT' && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => handleSubmitBot(bot.id)}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Submit
                    </Button>
                  )}

                  {bot.status === 'DRAFT' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteBot(bot.id)}
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Statistics */}
      {bots.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Bots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bots.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{bots.filter(b => b.status === 'DRAFT').length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{bots.filter(b => b.status === 'SUBMITTED').length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{bots.filter(b => b.status === 'APPROVED').length}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
