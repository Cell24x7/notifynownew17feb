import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, RefreshCw } from 'lucide-react';
import { smsApi } from '@/services/smsApi';

interface SenderRecord {
  id: number;
  sender_id: string;
  company_name: string;
  entity_type: string;
  status: string;
  created_at: string;
}

export function SMSList() {
  const { toast } = useToast();
  const [senders, setSenders] = useState<SenderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSenders();
  }, []);

  const fetchSenders = async () => {
    setIsLoading(true);
    try {
      const allSenders = await smsApi.getAllSenders();
      setSenders(allSenders);
      if (allSenders.length === 0) {
        toast({ 
          title: 'No Data', 
          description: 'No SMS sender configurations found. Create one first!',
          variant: 'default'
        });
      }
    } catch (error) {
      console.error('Error fetching senders:', error);
      toast({ 
        title: 'Error', 
        description: 'Failed to fetch sender configurations.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this sender configuration?')) {
      return;
    }

    try {
      await smsApi.deleteSender(id);
      toast({ 
        title: 'Deleted', 
        description: 'Sender configuration deleted successfully.'
      });
      fetchSenders();
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'Failed to delete sender configuration.',
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

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/10">
            <Database className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">SMS Sender Configurations</h2>
            <p className="text-sm text-muted-foreground">View all submitted sender configurations</p>
          </div>
        </div>
        <Button onClick={fetchSenders} disabled={isLoading} variant="outline">
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

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading sender configurations...</span>
          </CardContent>
        </Card>
      ) : senders.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Database className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No SMS sender configurations found</p>
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
                  <th className="px-4 py-3 text-left font-medium text-foreground">Sender ID</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Company</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Entity Type</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {senders.map((sender) => (
                  <tr key={sender.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{sender.id}</td>
                    <td className="px-4 py-3 font-semibold uppercase">{sender.sender_id}</td>
                    <td className="px-4 py-3">{sender.company_name}</td>
                    <td className="px-4 py-3">{sender.entity_type}</td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(sender.status)}>
                        {sender.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(sender.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete"
                          onClick={() => handleDelete(sender.id)}
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
    </div>
  );
}