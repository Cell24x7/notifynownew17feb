import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  Eye,
  Check,
  Clock,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RCSTemplate {
  id: string;
  name: string;
  category: 'otp' | 'transactional' | 'promotional' | 'alert';
  content: string;
  variables: string[];
  richElements: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  createdDate: string;
  approvalDate?: string;
  rejectionReason?: string;
}

const mockTemplates: RCSTemplate[] = [
  {
    id: 'TPL001',
    name: 'OTP Verification',
    category: 'otp',
    content: 'Your OTP is {{otp}}. Valid for 10 minutes.',
    variables: ['otp'],
    richElements: [],
    status: 'approved',
    createdDate: '2026-01-20',
    approvalDate: '2026-01-21'
  },
  {
    id: 'TPL002',
    name: 'Order Confirmation',
    category: 'transactional',
    content: 'Order {{orderId}} confirmed. Total: {{amount}}. Delivery by {{date}}.',
    variables: ['orderId', 'amount', 'date'],
    richElements: ['buttons', 'cards'],
    status: 'submitted',
    createdDate: '2026-01-24'
  },
  {
    id: 'TPL003',
    name: 'Flash Sale',
    category: 'promotional',
    content: '🎉 Flash Sale! {{discount}}% off on {{category}}. Valid till {{time}}.',
    variables: ['discount', 'category', 'time'],
    richElements: ['carousel', 'buttons'],
    status: 'draft',
    createdDate: '2026-01-25'
  }
];

const categories = [
  { value: 'otp', label: '🔐 OTP & Authentication' },
  { value: 'transactional', label: '📦 Transactional' },
  { value: 'promotional', label: '🎯 Promotional' },
  { value: 'alert', label: '⚠️ Alert & Notification' }
];

const richElements = [
  'Text with links',
  'Buttons with actions',
  'Rich cards',
  'Carousel/Slider',
  'Images',
  'Video preview',
  'Calendar',
  'Location map'
];

export default function RCSTemplateManagement() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<RCSTemplate[]>(mockTemplates);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<RCSTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'transactional' as const,
    content: '',
    selectedRichElements: [] as string[]
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<RCSTemplate | null>(null);

  const handleCreate = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      category: 'transactional',
      content: '',
      selectedRichElements: []
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (template: RCSTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      category: template.category,
      content: template.content,
      selectedRichElements: template.richElements
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Extract variables from content ({{variable}})
      const variableMatches = formData.content.match(/{{([^}]+)}}/g) || [];
      const variables = variableMatches.map(v => v.replace(/{{|}}/g, ''));

      if (editingTemplate) {
        // Update existing
        const updated = templates.map(t =>
          t.id === editingTemplate.id
            ? {
                ...t,
                name: formData.name,
                category: formData.category,
                content: formData.content,
                variables,
                richElements: formData.selectedRichElements
              }
            : t
        );
        setTemplates(updated);
        toast({
          title: 'Updated',
          description: 'Template updated successfully'
        });
      } else {
        // Create new
        const newTemplate: RCSTemplate = {
          id: `TPL${String(templates.length + 1).padStart(3, '0')}`,
          name: formData.name,
          category: formData.category,
          content: formData.content,
          variables,
          richElements: formData.selectedRichElements,
          status: 'draft',
          createdDate: new Date().toISOString().split('T')[0]
        };
        setTemplates([...templates, newTemplate]);
        toast({
          title: 'Created',
          description: 'New template created as draft'
        });
      }

      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save template',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = (id: string) => {
    setTemplates(templates.filter(t => t.id !== id));
    toast({
      title: 'Deleted',
      description: 'Template deleted successfully'
    });
  };

  const handleSubmitForApproval = (id: string) => {
    const updated = templates.map(t =>
      t.id === id ? { ...t, status: 'submitted' as const } : t
    );
    setTemplates(updated);
    toast({
      title: 'Submitted',
      description: 'Template submitted for approval'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <Check className="w-4 h-4" />;
      case 'submitted':
        return <Clock className="w-4 h-4" />;
      case 'rejected':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'approved':
        return 'default';
      case 'submitted':
        return 'secondary';
      case 'rejected':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const draftCount = templates.filter(t => t.status === 'draft').length;
  const submittedCount = templates.filter(t => t.status === 'submitted').length;
  const approvedCount = templates.filter(t => t.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">📨 RCS Template Management</h1>
          <p className="text-gray-600">Create and manage RCS message templates</p>
        </div>
        <Button onClick={handleCreate} size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{templates.length}</div>
              <p className="text-sm text-gray-600">Total Templates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600 mb-2">{draftCount}</div>
              <p className="text-sm text-gray-600">Drafts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{submittedCount}</div>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{approvedCount}</div>
              <p className="text-sm text-gray-600">Approved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Manage your RCS message templates</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Variables</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map(template => (
                      <TableRow key={template.id}>
                        <TableCell className="font-mono text-sm">{template.id}</TableCell>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {categories.find(c => c.value === template.category)?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {template.variables.length > 0 ? (
                            <div className="flex gap-1 flex-wrap">
                              {template.variables.map(v => (
                                <Badge key={v} variant="secondary" className="text-xs">
                                  {v}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            'None'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(template.status)} className="gap-1">
                            {getStatusIcon(template.status)}
                            {template.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{template.createdDate}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPreviewTemplate(template);
                                setPreviewOpen(true);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(template)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(template.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create New Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Template Name *</Label>
                <Input
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., Order Confirmation"
                />
              </div>
              <div>
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={value => setFormData({...formData, category: value as any})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Message Content *</Label>
              <Textarea
                value={formData.content}
                onChange={e => setFormData({...formData, content: e.target.value})}
                placeholder="Write your message. Use {{variable}} for dynamic content."
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-2">Tip: Use {{variable}} for dynamic content</p>
            </div>

            <div>
              <Label>Rich Elements (Optional)</Label>
              <div className="grid grid-cols-2 gap-2">
                {richElements.map(element => (
                  <div key={element} className="flex items-center">
                    <input
                      type="checkbox"
                      id={element}
                      checked={formData.selectedRichElements.includes(element)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            selectedRichElements: [...formData.selectedRichElements, element]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            selectedRichElements: formData.selectedRichElements.filter(el => el !== element)
                          });
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor={element} className="ml-2 text-sm cursor-pointer">
                      {element}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingTemplate ? 'Update' : 'Create'} Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      {previewTemplate && (
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Template Preview - {previewTemplate.name}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm font-semibold text-blue-900 mb-3">Preview Message:</div>
                <div className="bg-white border border-blue-300 rounded-lg p-4 text-sm">
                  {previewTemplate.content}
                </div>
              </div>

              {previewTemplate.variables.length > 0 && (
                <div>
                  <Label className="text-gray-600">Variables Used:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewTemplate.variables.map(v => (
                      <Badge key={v} variant="secondary">{v}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {previewTemplate.richElements.length > 0 && (
                <div>
                  <Label className="text-gray-600">Rich Elements:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previewTemplate.richElements.map(el => (
                      <Badge key={el} variant="outline">{el}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {previewTemplate.status === 'draft' && (
                <Button onClick={() => handleSubmitForApproval(previewTemplate.id)} className="w-full">
                  Submit for Approval
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
