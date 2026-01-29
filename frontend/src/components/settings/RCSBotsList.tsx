import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { rcsApi } from '@/services/rcsApi';
import { 
  Trash2, 
  Edit2, 
  Eye,
  Plus,
  Loader2,
  Check,
  X,
  Clock,
  Database
} from 'lucide-react';

interface Bot {
  id: string;
  bot_name: string;
  brand_name: string;
  short_description: string;
  bot_type: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'SUSPENDED';
  message_type: string;
  languages_supported: string;
  bot_logo_url?: string;
  brand_color?: string;
  created_at: string;
  submission_date?: string;
}

const API_URL = `http://${window.location.hostname}:5000`;

export function RCSBotsList() {
  const { toast } = useToast();
  const [bots, setBots] = useState<Bot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedBot, setSelectedBot] = useState<Bot | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<string>('ALL');

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
      const allBots = await rcsApi.getAllBots();
      setBots(allBots);
      if (allBots.length === 0) {
        toast({ 
          title: 'No Data', 
          description: 'No RCS bot configurations found. Create one first!',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to fetch bot configurations from database.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bot configuration?')) {
      return;
    }

    try {
      await rcsApi.deleteBot(id);
      toast({ 
        title: 'Deleted', 
        description: 'Bot configuration deleted successfully.'
      });
      fetchBots(); // Refresh list
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to delete bot configuration.',
        variant: 'destructive'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-200 text-gray-800';
      case 'SUBMITTED':
        return 'bg-blue-200 text-blue-800';
      case 'APPROVED':
        return 'bg-green-200 text-green-800';
      case 'REJECTED':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const getMessageTypeColor = (type: string) => {
    switch (type) {
      case 'OTP':
        return 'bg-purple-100 text-purple-700';
      case 'TRANSACTIONAL':
        return 'bg-blue-100 text-blue-700';
      case 'PROMOTIONAL':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-500/10">
            <Database className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">RCS Bot Configurations</h2>
            <p className="text-sm text-muted-foreground">View all submitted bot configurations from database</p>
          </div>
        </div>
        <Button onClick={fetchBots} disabled={isLoading} variant="outline">
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>

      {/* Content */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading bot configurations...</span>
          </CardContent>
        </Card>
      ) : bots.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No RCS bot configurations found</p>
              <p className="text-sm text-muted-foreground mt-1">Create one using the form above</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="w-full rounded-lg border">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-foreground">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Bot Name</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Brand Name</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Languages</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bots.map((bot) => (
                  <tr key={bot.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{bot.id}</td>
                    <td className="px-4 py-3 font-semibold">{bot.bot_name}</td>
                    <td className="px-4 py-3">{bot.brand_name}</td>
                    <td className="px-4 py-3 text-muted-foreground truncate max-w-xs">{bot.short_description}</td>
                    <td className="px-4 py-3">
                      <Badge className={getMessageTypeColor(bot.message_type)}>
                        {bot.message_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(bot.status)}>
                        {bot.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{bot.languages_supported}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(bot.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(bot.id)}
                          title="Delete"
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      )}

      {/* Statistics */}
      {bots.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Bots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bots.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {bots.filter(b => b.status === 'DRAFT').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {bots.filter(b => b.status === 'APPROVED').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Submitted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {bots.filter(b => b.status === 'SUBMITTED').length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
