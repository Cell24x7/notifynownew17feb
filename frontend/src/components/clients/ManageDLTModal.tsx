import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Loader2, Trash2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

interface ManageDLTModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any | null;
}

export function ManageDLTModal({ isOpen, onClose, client }: ManageDLTModalProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    sender: '',
    template_text: '',
    temp_id: '',
    temp_name: '',
    temp_type: 'Transactional',
    status: 'Y',
    pe_id: '',
    hash_id: ''
  });

  useEffect(() => {
    if (isOpen && client) {
      fetchTemplates();
      setIsAdding(false);
      setEditingId(null);
    }
  }, [isOpen, client]);

  const fetchTemplates = async () => {
    if (!client) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/dlt-templates?userId=${client.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sender || !formData.template_text || !formData.temp_id) {
      return toast.error('Sender, Template ID, and Message Text are required');
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingId ? `/api/dlt-templates/${editingId}` : '/api/dlt-templates';
      const method = editingId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ ...formData, userId: client.id })
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Template ${editingId ? 'updated' : 'added'} successfully`);
        setIsAdding(false);
        setEditingId(null);
        fetchTemplates();
      } else {
        toast.error(data.message || 'Failed to save template');
      }
    } catch (error) {
      console.error('Save template error:', error);
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/dlt-templates/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Template deleted successfully');
        fetchTemplates();
      } else {
        toast.error(data.message || 'Failed to delete template');
      }
    } catch (error) {
      console.error('Delete template error:', error);
      toast.error('An error occurred');
    }
  };

  const startEdit = (t: any) => {
    setFormData({
      sender: t.sender,
      template_text: t.template_text,
      temp_id: t.temp_id,
      temp_name: t.temp_name || '',
      temp_type: t.temp_type || 'Transactional',
      status: t.status || 'Y',
      pe_id: t.pe_id || '',
      hash_id: t.hash_id || ''
    });
    setEditingId(t.id);
    setIsAdding(true);
  };

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Manage DLT Templates - {client.name}
            </DialogTitle>
            <DialogDescription>
              Add, edit, or remove DLT templates for this client account.
            </DialogDescription>
          </div>
          {!isAdding && (
            <Button onClick={() => {
              setFormData({ sender: '', template_text: '', temp_id: '', temp_name: '', temp_type: 'Transactional', status: 'Y', pe_id: '', hash_id: '' });
              setEditingId(null);
              setIsAdding(true);
            }}>
              <Plus className="w-4 h-4 mr-2" /> Add Template
            </Button>
          )}
        </DialogHeader>

        {isAdding ? (
          <form onSubmit={handleSave} className="space-y-4 p-4 border rounded-md bg-muted/20">
            <h3 className="font-semibold">{editingId ? 'Edit Template' : 'Add New Template'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sender ID <span className="text-red-500">*</span></Label>
                <Input value={formData.sender} onChange={e => setFormData({...formData, sender: e.target.value})} maxLength={6} required />
              </div>
              <div className="space-y-2">
                <Label>Template ID <span className="text-red-500">*</span></Label>
                <Input value={formData.temp_id} onChange={e => setFormData({...formData, temp_id: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={formData.temp_name} onChange={e => setFormData({...formData, temp_name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={formData.temp_type} onValueChange={v => setFormData({...formData, temp_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Transactional">Transactional</SelectItem>
                    <SelectItem value="Promotional">Promotional</SelectItem>
                    <SelectItem value="Service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PE ID (Optional)</Label>
                <Input value={formData.pe_id} onChange={e => setFormData({...formData, pe_id: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Y">Active</SelectItem>
                    <SelectItem value="N">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Message Text <span className="text-red-500">*</span></Label>
              <Textarea 
                value={formData.template_text} 
                onChange={e => setFormData({...formData, template_text: e.target.value})}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button type="submit">Save Template</Button>
            </div>
          </form>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow>
                  <TableHead>Sender</TableHead>
                  <TableHead>Template ID</TableHead>
                  <TableHead className="w-[40%]">Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading templates...
                    </TableCell>
                  </TableRow>
                ) : templates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No templates found for this client.
                    </TableCell>
                  </TableRow>
                ) : (
                  templates.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.sender}</TableCell>
                      <TableCell className="font-mono text-xs">{t.temp_id}</TableCell>
                      <TableCell className="text-xs">
                        <div className="max-w-xs truncate" title={t.template_text}>
                          {t.template_text}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.status === 'Y' ? 'default' : 'secondary'} className="text-[10px]">
                          {t.status === 'Y' ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(t)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
