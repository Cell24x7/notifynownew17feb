import { useState, useEffect } from 'react';
import { Search, Plus, Edit2, Trash2, Loader2, RefreshCw, Eye, Tag as TagIcon, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

interface TagData {
  id: number;
  tag_name: string;
  domain: string;
  customer: string;
  created_by: string;
  created_on: string;
  status: 'active' | 'inactive';
}

export default function ManageTags() {
  const [tags, setTags] = useState<TagData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('all');
  const [domains, setDomains] = useState<string[]>(['CreateYourOwn']);
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [editTagName, setEditTagName] = useState('');
  
  // Pagination
  const [pageSize, setPageSize] = useState(7);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { toast } = useToast();

  const fetchDomains = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/chats/user-domains`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const list = (res.data.domains || []).filter(
          (d: string) => d.toLowerCase() !== 'all' && d.toLowerCase() !== 'all domains'
        );
        setDomains(list.length > 0 ? list : ['CreateYourOwn']);
      }
    } catch (err) {
      console.error('Error fetching user domains:', err);
    }
  };

  const fetchTags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.get(`${API_BASE_URL}/api/chats/tags/manage`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        setTags(res.data.tags || []);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
      toast({
        title: 'Error',
        description: 'Failed to load tags.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
    fetchDomains();
  }, []);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      toast({ title: 'Validation Error', description: 'Tag name is required.', variant: 'destructive' });
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_BASE_URL}/api/chats/tags/create-global`, {
        tag_name: newTagName.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        toast({ title: 'Success', description: `Tag "${newTagName}" created successfully.` });
        setNewTagName('');
        setIsCreateOpen(false);
        fetchTags();
        fetchDomains();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to create tag',
        description: err.response?.data?.message || 'Server error',
        variant: 'destructive'
      });
    }
  };

  const handleToggleStatus = async (tag: TagData, checked: boolean) => {
    const newStatus = checked ? 'active' : 'inactive';
    
    // Optimistic Update
    setTags(prev => prev.map(t => t.tag_name === tag.tag_name ? { ...t, status: newStatus } : t));
    
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${API_BASE_URL}/api/chats/tags/toggle`, {
        tag_name: tag.tag_name,
        status: newStatus
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast({ title: 'Status Updated', description: `Tag "${tag.tag_name}" is now ${newStatus}.` });
    } catch (err) {
      // Revert optimistic update
      setTags(prev => prev.map(t => t.tag_name === tag.tag_name ? tag : t));
      toast({ title: 'Error', description: 'Failed to toggle status.', variant: 'destructive' });
    }
  };

  const handleEditTag = async () => {
    if (!editingTag || !editTagName.trim()) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await axios.post(`${API_BASE_URL}/api/chats/tags/edit-global`, {
        old_tag_name: editingTag.tag_name,
        new_tag_name: editTagName.trim()
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (res.data.success) {
        toast({ title: 'Success', description: 'Tag renamed successfully.' });
        setIsEditOpen(false);
        setEditingTag(null);
        setEditTagName('');
        fetchTags();
        fetchDomains();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to rename tag',
        description: err.response?.data?.message || 'Server error',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteTag = async (tag: TagData) => {
    if (!window.confirm(`Are you sure you want to delete the tag "${tag.tag_name}" globally? This deletes it from all contacts.`)) return;
    try {
      const token = localStorage.getItem('authToken');
      await axios.post(`${API_BASE_URL}/api/chats/tags/delete-global`, {
        tag_name: tag.tag_name
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      toast({ title: 'Deleted', description: `Tag "${tag.tag_name}" deleted globally.` });
      fetchTags();
      fetchDomains();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete tag.', variant: 'destructive' });
    }
  };

  // Filter tags by domain and search query
  const filteredTags = tags.filter(tag => {
    const matchesDomain = selectedDomain === 'all' || tag.domain === selectedDomain;
    const matchesSearch = tag.tag_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tag.created_by.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDomain && matchesSearch;
  });

  // Pagination calculations
  const totalEntries = filteredTags.length;
  const totalPages = Math.ceil(totalEntries / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedTags = filteredTags.slice(startIndex, startIndex + pageSize);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl animate-fade-in">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <TagIcon className="h-8 w-8 text-primary" /> Manage Tags
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Configure and manage conversation tags globally.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTags} className="flex gap-2 h-9">
          <RefreshCw className={`h-4 w-4 ${loading && 'animate-spin'}`} /> Reload
        </Button>
      </div>

      {/* Domain Selection Card */}
      <Card className="shadow-sm border border-slate-200/60 dark:border-slate-800 bg-card rounded-xl">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1 max-w-xs space-y-2">
              <Label htmlFor="domain-select" className="text-xs font-bold text-slate-400 uppercase tracking-wider">Domain</Label>
              <Select value={selectedDomain} onValueChange={(val) => { setSelectedDomain(val); setCurrentPage(1); }}>
                <SelectTrigger id="domain-select" className="h-10 bg-slate-50/50 border-slate-200">
                  <SelectValue placeholder="Select Domain" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Domains</SelectItem>
                  {domains.map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-3">
              <Button onClick={fetchTags} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-10 px-5 flex gap-2">
                <Eye className="h-4 w-4" /> View Details
              </Button>
              <Button onClick={() => setIsCreateOpen(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-10 px-5 flex gap-2">
                <Plus className="h-4 w-4" /> Manage Tag
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags List Card */}
      <Card className="shadow-sm border border-slate-200/60 dark:border-slate-800 bg-card rounded-xl">
        <CardContent className="p-6 space-y-4">
          
          {/* Controls: entries list size and search filter */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>
              <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
                <SelectTrigger className="w-16 h-8 bg-slate-50/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                </SelectContent>
              </Select>
              <span>entries</span>
            </div>

            <div className="relative max-w-xs flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 h-8 bg-slate-50/50"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-100 dark:border-slate-800">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : paginatedTags.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <TagIcon className="h-12 w-12 opacity-25" />
                <p className="text-sm font-medium">No tags found matching current criteria</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <th className="p-4 w-12">#</th>
                    <th className="p-4">Domain</th>
                    <th className="p-4">Customer</th>
                    <th className="p-4">Tag Name</th>
                    <th className="p-4">Created By</th>
                    <th className="p-4">Created On</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {paginatedTags.map((tag, idx) => {
                    const rowNumber = startIndex + idx + 1;
                    return (
                      <tr key={tag.tag_name} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="p-4 font-semibold text-slate-500">{rowNumber}</td>
                        <td className="p-4 font-medium">{tag.domain}</td>
                        <td className="p-4 text-slate-500 font-semibold">{tag.customer}</td>
                        <td className="p-4">
                          <Badge variant="outline" className="px-2.5 py-0.5 rounded-full text-xs bg-slate-100 text-slate-700 font-semibold border-slate-200">
                            {tag.tag_name}
                          </Badge>
                        </td>
                        <td className="p-4 text-slate-500">{tag.created_by}</td>
                        <td className="p-4 text-slate-500">
                          {new Date(tag.created_on).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })} {new Date(tag.created_on).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Badge className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                              tag.status === 'active' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                              {tag.status}
                            </Badge>
                            <Switch
                              checked={tag.status === 'active'}
                              onCheckedChange={(checked) => handleToggleStatus(tag, checked)}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setEditingTag(tag); setEditTagName(tag.tag_name); setIsEditOpen(true); }}
                              className="h-8 w-8 hover:bg-slate-100 hover:text-slate-900"
                              title="Edit tag name"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteTag(tag)}
                              className="h-8 w-8 text-destructive hover:bg-red-50 hover:text-destructive"
                              title="Delete tag"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-sm text-slate-500">
            <div>
              Showing {startIndex + 1} to {Math.min(startIndex + pageSize, totalEntries)} of {totalEntries} entries
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="h-8 px-3"
              >
                Previous
              </Button>
              
              <div className="flex items-center justify-center h-8 w-8 rounded-md bg-emerald-500 text-white font-bold text-xs shadow-sm">
                {currentPage}
              </div>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handlePageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="h-8 px-3"
              >
                Next
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Tag</DialogTitle>
            <DialogDescription>
              Create a new tag globally. You can later assign it to any contact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="new-tag-input">Tag Name</Label>
              <Input 
                id="new-tag-input"
                value={newTagName} 
                onChange={(e) => setNewTagName(e.target.value)} 
                placeholder="Enter tag name..."
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTag} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Create Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT MODAL */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tag Name</DialogTitle>
            <DialogDescription>
              Rename the tag "{editingTag?.tag_name}" globally.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="edit-tag-input">New Tag Name</Label>
              <Input 
                id="edit-tag-input"
                value={editTagName} 
                onChange={(e) => setEditTagName(e.target.value)} 
                placeholder="Enter new name..."
                onKeyDown={(e) => { if (e.key === 'Enter') handleEditTag(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
            <Button onClick={handleEditTag} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
