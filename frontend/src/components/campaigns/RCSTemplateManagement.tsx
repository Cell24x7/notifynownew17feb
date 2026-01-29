import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Copy, Trash2, Eye, CheckCircle, Clock, XCircle, Filter, Download, Share2, Loader, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/hooks/use-toast';
import { rcsTemplatesService } from '@/services/rcsTemplatesService';
import { type RCSTemplate, type RCSButton, type RCSVariable } from '@/lib/mockData';

interface RCSTemplateFormData {
  name: string;
  language: string;
  category: 'Utility' | 'Marketing' | 'Authentication';
  headerType: 'none' | 'text' | 'image' | 'video' | 'document';
  headerContent: string;
  body: string;
  footer: string;
}

export default function RCSTemplateManagement() {
  const [templates, setTemplates] = useState<RCSTemplate[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending_approval' | 'draft' | 'rejected'>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | 'Utility' | 'Marketing' | 'Authentication'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RCSTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RCSTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  const [formData, setFormData] = useState<RCSTemplateFormData>({
    name: '',
    language: 'English',
    category: 'Marketing',
    headerType: 'none',
    headerContent: '',
    body: '',
    footer: '',
  });

  const { toast } = useToast();

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setIsLoading(true);
      const data = await rcsTemplatesService.getAllTemplates();
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    if (!template) return false; // Filter out null/undefined templates
    const matchesSearch = template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.body?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || template.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || template.category === filterCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.body) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      const templateData = {
        name: formData.name,
        language: formData.language,
        category: formData.category,
        body: formData.body,
        header_type: formData.headerType,
        header_content: formData.headerContent || null,
        footer: formData.footer || null,
        created_by: 'current_user',
        buttons: [],
        variables: [],
      };

      const newTemplate = await rcsTemplatesService.createTemplate(templateData);
      
      setTemplates([...templates, newTemplate]);
      setIsCreateOpen(false);
      setFormData({
        name: '',
        language: 'English',
        category: 'Marketing',
        headerType: 'none',
        headerContent: '',
        body: '',
        footer: '',
      });

      toast({
        title: 'Success',
        description: 'RCS template created and saved to database successfully! ✅',
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await rcsTemplatesService.deleteTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending_approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RCS Templates</h1>
          <p className="text-muted-foreground mt-1">Manage and create RCS message templates</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary gap-2">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create RCS Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Template Name *</Label>
                  <Input
                    placeholder="e.g., promotional_banner"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Language</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Utility">Utility</SelectItem>
                      <SelectItem value="Marketing">Marketing</SelectItem>
                      <SelectItem value="Authentication">Authentication</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Header Type</Label>
                  <Select value={formData.headerType} onValueChange={(value: any) => setFormData({ ...formData, headerType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.headerType !== 'none' && (
                <div>
                  <Label>Header Content</Label>
                  <Input
                    placeholder="URL or text for header"
                    value={formData.headerContent}
                    onChange={(e) => setFormData({ ...formData, headerContent: e.target.value })}
                  />
                </div>
              )}

              <div>
                <Label>Body *</Label>
                <Textarea
                  placeholder="Template body with {{variables}}"
                  rows={4}
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                />
              </div>

              <div>
                <Label>Footer</Label>
                <Input
                  placeholder="Optional footer text"
                  value={formData.footer}
                  onChange={(e) => setFormData({ ...formData, footer: e.target.value })}
                />
              </div>

              <div className="flex gap-2 pt-4 justify-end">
                <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isCreating}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate} className="gradient-primary" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Template'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px]">
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending_approval">Pending</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={(value: any) => setFilterCategory(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Utility">Utility</SelectItem>
            <SelectItem value="Marketing">Marketing</SelectItem>
            <SelectItem value="Authentication">Authentication</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-muted-foreground">Loading templates from database...</p>
          </div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">No templates found</h3>
          <p className="text-muted-foreground">Create your first RCS template to get started</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="card-elevated hover:shadow-lg transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription>{template.language}</CardDescription>
                </div>
                <Badge variant={template.status === 'approved' ? 'default' : 'secondary'} className={getStatusColor(template.status)}>
                  <span className="flex items-center gap-1">
                    {getStatusIcon(template.status)}
                    {template.status.replace('_', ' ')}
                  </span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Template Preview */}
              <div className="bg-muted p-3 rounded-lg text-sm max-h-24 overflow-hidden">
                <p className="font-medium mb-1">{template.headerType !== 'none' && `[${template.headerType.toUpperCase()}]`}</p>
                <p className="text-muted-foreground line-clamp-3">{template.body}</p>
              </div>

              {/* Info */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-primary/10 p-2 rounded">
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{template.category}</p>
                </div>
                <div className="bg-primary/10 p-2 rounded">
                  <p className="text-muted-foreground">Used</p>
                  <p className="font-medium">{template.usageCount} times</p>
                </div>
                <div className="bg-primary/10 p-2 rounded">
                  <p className="text-muted-foreground">Buttons</p>
                  <p className="font-medium">{template.buttons.length}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedTemplate(template);
                    setIsPreviewOpen(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {/* Preview Dialog */}
      {selectedTemplate && (
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Template Preview: {selectedTemplate.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Header */}
              {selectedTemplate.headerType !== 'none' && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">{selectedTemplate.headerType.toUpperCase()}</p>
                  {selectedTemplate.headerType === 'image' && (
                    <img src="/placeholder.svg" alt="header" className="w-full h-32 object-cover rounded" />
                  )}
                  {(selectedTemplate.headerType === 'text' || selectedTemplate.headerType === 'video') && (
                    <p className="font-medium">{selectedTemplate.headerContent}</p>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="bg-primary/5 p-4 rounded-lg whitespace-pre-wrap text-sm">
                {selectedTemplate.body}
              </div>

              {/* Buttons */}
              {selectedTemplate.buttons.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Buttons:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedTemplate.buttons.map((btn) => (
                      <Button
                        key={btn.id}
                        variant={btn.type === 'action' ? 'default' : 'outline'}
                        size="sm"
                        className="w-full"
                      >
                        {btn.displayText}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              {selectedTemplate.footer && (
                <div className="text-xs text-muted-foreground text-center border-t pt-2">
                  {selectedTemplate.footer}
                </div>
              )}

              {/* Analytics */}
              {selectedTemplate.analytics && (
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-sm font-medium mb-2">Performance</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>Sent: {selectedTemplate.analytics.sentCount}</div>
                    <div>Delivered: {selectedTemplate.analytics.deliveredRate}%</div>
                    <div>Opened: {selectedTemplate.analytics.openedRate}%</div>
                    <div>Clicked: {selectedTemplate.analytics.clickedRate}%</div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
