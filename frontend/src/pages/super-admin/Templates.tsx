import { useState, useEffect } from 'react';
import { Search, Check, X, Eye, Clock, FileText, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChannelBadge } from '@/components/ui/channel-icon';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { templateService, type MessageTemplate } from '@/services/templateService';
import { format } from 'date-fns';

const templateLanguages = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  // Add more as needed
];

export default function SuperAdminTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Use admin endpoint to get ALL templates from ALL users
      const data = await templateService.getAdminTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      toast({
        title: 'Error',
        description: 'Failed to fetch templates',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveTemplate = async (templateId: string, status: 'approved' | 'rejected') => {
    console.log('🔄 Attempting to update template:', { templateId, status });
    
    try {
      const result = await templateService.updateTemplateStatus(templateId, status);
      console.log('✅ Template status update response:', result);
      
      // Refresh templates list
      await fetchTemplates();
      
      toast({
        title: status === 'approved' ? '✅ Template Approved' : '❌ Template Rejected',
        description: `Template has been ${status} successfully.`,
      });
    } catch (err: any) {
      console.error('❌ Approve template error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      toast({
        title: 'Error',
        description: err.response?.data?.message || err.message || 'Failed to update template status',
        variant: 'destructive',
      });
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = 
      activeTab === 'all' ? true :
      activeTab === 'pending' ? template.status === 'pending' :
      activeTab === 'approved' ? template.status === 'approved' :
      activeTab === 'rejected' ? template.status === 'rejected' :
      true;
    return matchesSearch && matchesTab;
  });

  const pendingCount = templates.filter(t => t.status === 'pending').length;
  const approvedCount = templates.filter(t => t.status === 'approved').length;
  const rejectedCount = templates.filter(t => t.status === 'rejected').length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Template Management
          </h1>
          <p className="text-muted-foreground">Review and approve templates from all users</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Templates</div>
            <div className="text-2xl font-bold">{templates.length}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="text-sm text-amber-700">Pending Approval</div>
            <div className="text-2xl font-bold text-amber-700">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4">
            <div className="text-sm text-green-700">Approved</div>
            <div className="text-2xl font-bold text-green-700">{approvedCount}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4">
            <div className="text-sm text-red-700">Rejected</div>
            <div className="text-2xl font-bold text-red-700">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending
            {pendingCount > 0 && (
              <Badge variant="outline" className="ml-1 bg-amber-100 text-amber-700 border-amber-200">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <Check className="h-4 w-4" />
            Approved
            <Badge variant="secondary" className="ml-1">{approvedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Rejected
            <Badge variant="secondary" className="ml-1">{rejectedCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            All Templates
            <Badge variant="secondary" className="ml-1">{templates.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* Content */}
        <TabsContent value={activeTab} className="mt-6">
          {filteredTemplates.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">No templates found</h3>
                <p className="text-muted-foreground">
                  {activeTab === 'pending' && 'No templates pending approval'}
                  {activeTab === 'approved' && 'No approved templates'}
                  {activeTab === 'rejected' && 'No rejected templates'}
                  {activeTab === 'all' && 'No templates available'}
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="card-elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      {/* Template Info */}
                      <div className="flex-1 space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold font-mono">{template.name}</h3>
                            {template.status === 'pending' && (
                              <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 animate-pulse">
                                Pending Approval
                              </Badge>
                            )}
                            {template.status === 'approved' && (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                Approved
                              </Badge>
                            )}
                            {template.status === 'rejected' && (
                              <Badge variant="destructive">
                                Rejected
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <ChannelBadge channel={template.channel} />
                            <Badge variant="outline">{template.category}</Badge>
                            <Badge variant="secondary" className="text-xs">
                              {templateLanguages.find(l => l.code === template.language)?.name || template.language}
                            </Badge>
                          </div>
                        </div>

                        {/* Template Preview */}
                        <div className="space-y-3">
                          {template.header_type !== 'none' && (
                            <div className="p-3 rounded-lg bg-muted/30 border">
                              <p className="text-xs text-muted-foreground mb-1">Header ({template.header_type})</p>
                              {template.header_type === 'text' && template.header_content && (
                                <p className="font-semibold">{template.header_content}</p>
                              )}
                              {['image', 'video', 'document'].includes(template.header_type) && (
                                <p className="text-sm text-muted-foreground italic">Media will be added when sending</p>
                              )}
                            </div>
                          )}
                          
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs text-muted-foreground mb-1">Body</p>
                            <p className="text-sm whitespace-pre-wrap">{template.body}</p>
                          </div>

                          {template.footer && (
                            <div className="p-3 rounded-lg bg-muted/30">
                              <p className="text-xs text-muted-foreground mb-1">Footer</p>
                              <p className="text-sm text-muted-foreground">{template.footer}</p>
                            </div>
                          )}

                          {template.buttons && template.buttons.length > 0 && (
                            <div className="p-3 rounded-lg bg-muted/30">
                              <p className="text-xs text-muted-foreground mb-2">Buttons ({template.buttons.length})</p>
                              <div className="flex flex-wrap gap-2">
                                {template.buttons.map((btn, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {btn.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Created: {format(new Date(template.created_at), 'MMM d, yyyy h:mm a')}</span>
                          <span>•</span>
                          <span>Type: {template.template_type}</span>
                          <span>•</span>
                          <span>Used: {template.usage_count} times</span>
                        </div>
                      </div>

                      {/* Approval Actions */}
                      {template.status === 'pending' && (
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          <Button
                            className="gradient-primary w-full"
                            onClick={() => handleApproveTemplate(template.id, 'approved')}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            className="w-full"
                            onClick={() => handleApproveTemplate(template.id, 'rejected')}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
