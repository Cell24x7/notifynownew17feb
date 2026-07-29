import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Upload, 
  Download, 
  Users, 
  Star, 
  Ban, 
  MessageSquare,
  Mail,
  Phone,
  Instagram,
  Globe,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { contactService, Contact, ContactList } from '@/services/contactService';
import { useAuth } from '@/contexts/AuthContext';
import { channelConfig } from '@/components/ui/channel-icon';

const viewFilters = [
  { id: 'all', label: 'All Contacts', icon: Users },
  { id: 'starred', label: 'Starred', icon: Star },
  { id: 'blacklisted', label: 'Blacklisted', icon: Ban },
];

const categoryFilters = [
  { id: 'guest', label: 'Guest', color: 'bg-emerald-500' },
  { id: 'lead', label: 'Lead', color: 'bg-amber-500' },
  { id: 'customer', label: 'Customer', color: 'bg-green-500' },
  { id: 'vip', label: 'VIP', color: 'bg-purple-500' },
];

// Frontend Cache variables to make tab navigation instant
let contactsCacheOwnerId: string | null = null;
let cachedContactsList: Contact[] | null = null;

export default function Contacts() {
  const { user } = useAuth();
  const enabledChannels = user?.channels_enabled || [];

  // Invalidate cache if user changes
  if (contactsCacheOwnerId !== user?.id) {
    cachedContactsList = null;
    contactsCacheOwnerId = user?.id || null;
  }

  const dynamicChannelFilters = enabledChannels.map(id => {
    const config = (channelConfig as any)[id.toLowerCase()] || { 
      label: id, 
      icon: MessageSquare,
      color: 'text-gray-500'
    };
    return { 
      id: id.toLowerCase(), 
      label: config.label, 
      icon: config.icon,
      color: config.color
    };
  });

  const [contacts, setContacts] = useState<Contact[]>(cachedContactsList || []);
  const [loading, setLoading] = useState(!cachedContactsList);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  // Selection State
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  
  // New Contact State
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'lead' as Contact['category'],
    channel: (enabledChannels[0]?.toLowerCase() || 'whatsapp') as Contact['channel'],
    labels: '',
  });

  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [contactLists, setContactLists] = useState<ContactList[]>([]);
  const [selectedList, setSelectedList] = useState<string | null>(null);
  const [isListDialogOpen, setIsListDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [addToListId, setAddToListId] = useState<string>('none');

  const { toast } = useToast();

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContactLists();
  }, []);

  const fetchContactLists = async () => {
    try {
      const lists = await contactService.getContactLists();
      setContactLists(lists);
    } catch (error) {
      console.error('Error fetching contact lists:', error);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, [selectedView, selectedCategory, selectedChannel, selectedList]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedContacts([]);
  }, [searchQuery, selectedView, selectedCategory, selectedChannel, selectedList]);

  const fetchContacts = async () => {
    try {
      if (!cachedContactsList) {
        setLoading(true);
      }
      const data = await contactService.getContacts({
        view: selectedView === 'all' ? undefined : selectedView,
        category: selectedCategory,
        channel: selectedChannel,
        list_id: selectedList,
      });
      setContacts(data);
      if (selectedView === 'all' && !selectedCategory && !selectedChannel && !selectedList) {
        cachedContactsList = data;
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load contacts.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (tableContainerRef.current) {
      const scrollAmount = 300;
      tableContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        const contactsToImport = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim());
          const contact: any = {};
          headers.forEach((header, index) => {
            if (header === 'phone' || header === 'name' || header === 'email' || header === 'category' || header === 'channel') {
               contact[header] = values[index];
            }
          });
          return contact;
        });

        if (contactsToImport.length > 0) {
            await contactService.importContacts(contactsToImport, addToListId !== 'none' ? addToListId : undefined);
            toast({ title: 'Success', description: `Imported ${contactsToImport.length} contacts.` });
            fetchContacts();
            if (addToListId !== 'none') fetchContactLists();
        } else {
             toast({ title: 'Error', description: 'No valid contacts found in CSV.', variant: 'destructive' });
        }
      } catch (error) {
        console.error('Import error:', error);
        toast({ title: 'Error', description: 'Failed to import contacts.', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const handleExport = () => {
    if (contacts.length === 0) {
      toast({ title: 'Info', description: 'No contacts to export.' });
      return;
    }

    const headers = ['Name', 'Phone', 'Email', 'Category', 'Channel', 'Status', 'Labels'];
    const csvContent = [
      headers.join(','),
      ...contacts.map(c => [
        `"${c.name}"`,
        `"${c.phone}"`,
        `"${c.email || ''}"`,
        c.category,
        c.channel,
        c.status,
        `"${c.labels || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'contacts_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddContact = async () => {
    // Validate Name
    if (!newContact.name.trim()) {
        toast({
            title: 'Validation Error',
            description: 'Name is required.',
            variant: 'destructive',
        });
        return;
    }

    // Validate Phone (Digits only, 10-15 chars)
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!newContact.phone.trim() || !phoneRegex.test(newContact.phone.replace(/\s/g, ''))) {
       toast({
        title: 'Validation Error',
        description: 'Please enter a valid phone number (10-15 digits).',
        variant: 'destructive',
      });
      return;
    }

    // Validate Email (if provided)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (newContact.email && !emailRegex.test(newContact.email)) {
        toast({
            title: 'Validation Error',
            description: 'Please enter a valid email address.',
            variant: 'destructive',
        });
        return;
    }

    try {
      await contactService.createContact({
          ...newContact,
          list_id: addToListId !== 'none' ? addToListId : undefined
      });
      toast({
        title: 'Success',
        description: 'Contact created successfully.',
      });
      setIsAddOpen(false);
      setNewContact({ name: '', phone: '', email: '', category: 'lead', channel: 'whatsapp', labels: '' });
      fetchContacts();
      if (addToListId !== 'none') fetchContactLists();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create contact.',
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditOpen(false); // Close add if open
    setIsEditOpen(true);
  };

  const handleUpdateContact = async () => {
    if (!editingContact) return;
    if (!editingContact.name.trim() || !editingContact.phone.trim()) {
      toast({ title: 'Validation Error', description: 'Name and Phone are required.', variant: 'destructive' });
      return;
    }

    try {
      await contactService.updateContact(editingContact.id, editingContact);
      toast({ title: 'Success', description: 'Contact updated successfully.' });
      setIsEditOpen(false);
      setEditingContact(null);
      
      // Optimistic update
      setContacts(prev => prev.map(c => c.id === editingContact.id ? editingContact : c));
    } catch (error: any) {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update contact.', variant: 'destructive' });
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await contactService.deleteContact(id);
      toast({
        title: 'Deleted',
        description: 'Contact deleted successfully.',
      });
      fetchContacts();
      // Remove from selection if selected
      if (selectedContacts.includes(id)) {
        setSelectedContacts(prev => prev.filter(c => c !== id));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete contact.',
        variant: 'destructive',
      });
    }
  };
  
  const handleToggleStar = async (contact: Contact) => {
    try {
        const updatedContact = { ...contact, starred: !contact.starred };
        // Optimistic update
        setContacts(prev => prev.map(c => c.id === contact.id ? updatedContact : c));
        
        await contactService.updateContact(contact.id, { starred: !contact.starred });
        
        toast({
            title: updatedContact.starred ? 'Starred' : 'Unstarred',
            description: `Contact ${updatedContact.starred ? 'added to' : 'removed from'} favorites.`,
        });
    } catch (error: any) {
        // Revert optimization
        setContacts(prev => prev.map(c => c.id === contact.id ? contact : c));
        toast({
            title: 'Error',
            description: error.response?.data?.error || error.response?.data?.message || 'Failed to update contact.',
            variant: 'destructive',
        });
    }
  };

  const handleToggleBlacklist = async (contact: Contact) => {
      const isBlocked = contact.status === 'blocked';
      const newStatus = isBlocked ? 'active' : 'blocked';
      
      try {
          const updatedContact = { ...contact, status: newStatus as any }; // Casting for now if types are strict
          // Optimistic update
          setContacts(prev => prev.map(c => c.id === contact.id ? updatedContact : c));
          
          await contactService.updateContact(contact.id, { status: newStatus });
          
          toast({
              title: isBlocked ? 'Unblocked' : 'Blacklisted',
              description: `Contact ${isBlocked ? 'removed from' : 'added to'} blacklist.`,
              // Using default variant to avoid confusing user thinking it's an error
              variant: 'default',
          });
      } catch (error: any) {
           // Revert optimization
           setContacts(prev => prev.map(c => c.id === contact.id ? contact : c));
           toast({
              title: 'Error',
              description: error.response?.data?.error || error.response?.data?.message || 'Failed to update contact status.',
              variant: 'destructive',
           });
      }
  };

  const getChannelIcon = (channel: string) => {
    const config = (channelConfig as any)[(channel || '').toLowerCase()];
    if (config) {
      const Icon = config.icon;
      return <Icon className={cn("h-4 w-4", config.color)} />;
    }
    return <MessageSquare className="h-4 w-4 text-gray-500" />;
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      guest: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      lead: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      customer: 'bg-green-500/10 text-green-500 border-green-500/20',
      vip: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };
    return colors[category] || 'bg-muted text-muted-foreground';
  };

  const filteredContacts = (contacts || []).filter(contact => {
    const nameStr = contact.name || '';
    const phoneStr = contact.phone || '';
    const emailStr = contact.email || '';
    const search = (searchQuery || '').toLowerCase();
    
    const matchesSearch = nameStr.toLowerCase().includes(search) ||
      phoneStr.includes(searchQuery) ||
      emailStr.toLowerCase().includes(search);
    return matchesSearch;
  });
  
  // Selection Logic
  const handleSelectAll = (checked: boolean) => {
      if (checked) {
          const allIds = filteredContacts.map(c => c.id);
          setSelectedContacts(allIds);
      } else {
          setSelectedContacts([]);
      }
  };
  
  const handleSelectOne = (id: string, checked: boolean) => {
      if (checked) {
          setSelectedContacts(prev => [...prev, id]);
      } else {
          setSelectedContacts(prev => prev.filter(c => c !== id));
      }
  };
  
  const isAllSelected = filteredContacts.length > 0 && selectedContacts.length === filteredContacts.length;
  const isIndeterminate = selectedContacts.length > 0 && selectedContacts.length < filteredContacts.length;

  const SidebarContent = () => (
      <div className="space-y-6">
        {/* Views */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Views</h3>
          <div className="space-y-1">
            {viewFilters.map((view) => (
              <button
                key={view.id}
                onClick={() => { 
                  setSelectedView(view.id); 
                  if (view.id === 'all') {
                    setSelectedCategory(null);
                    setSelectedChannel(null);
                    setSelectedList(null);
                    setSearchQuery('');
                  }
                  setIsFilterOpen(false); 
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  selectedView === view.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <view.icon className="h-4 w-4" />
                  <span>{view.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Category */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Category</h3>
          <div className="space-y-1">
            {categoryFilters.map((category) => (
              <button
                key={category.id}
                onClick={() => { setSelectedCategory(selectedCategory === category.id ? null : category.id); setIsFilterOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', category.color)} />
                  <span>{category.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Channels */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Channels</h3>
          <div className="space-y-1">
            {dynamicChannelFilters.map((channel) => (
              <button
                key={channel.id}
                onClick={() => { setSelectedChannel(selectedChannel === channel.id ? null : channel.id); setIsFilterOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  selectedChannel === channel.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-2">
                  <channel.icon className={cn("h-4 w-4", selectedChannel === channel.id ? "text-primary-foreground" : channel.color)} />
                  <span>{channel.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Contact Lists */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">My Lists</h3>
            <Button variant="ghost" size="icon" className="h-4 w-4 rounded-full" onClick={() => setIsListDialogOpen(true)}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {contactLists.map((list) => (
              <button
                key={list.id}
                onClick={() => { setSelectedList(selectedList === list.id ? null : list.id); setIsFilterOpen(false); }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors',
                  selectedList === list.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground'
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{list.name}</span>
                </div>
                <Badge variant="secondary" className={cn(selectedList === list.id ? 'bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20' : 'bg-muted-foreground/10')}>{list.contact_count}</Badge>
              </button>
            ))}
            {contactLists.length === 0 && (
              <div className="text-xs text-muted-foreground px-3 py-2 text-center border border-dashed rounded-lg">No lists created</div>
            )}
          </div>
        </div>
      </div>
  );

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background">
      {/* Left Sidebar - Filters (Desktop) */}
      <div className={cn(
        "border-r border-border p-4 bg-card",
        "hidden lg:block lg:w-56"
      )}>
        <SidebarContent />
      </div>

       {/* Mobile Filter Sheet */}
       <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <SheetContent side="left" className="w-[80%] sm:w-[385px] pt-10">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
                <h1 className="text-2xl md:text-3xl font-bold">Contacts</h1>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                    Total: {contacts.length}
                </Badge>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={addToListId} onValueChange={setAddToListId}>
                <SelectTrigger className="w-[150px] h-9 text-sm">
                  <SelectValue placeholder="Add to List..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No List (Default)</SelectItem>
                  {contactLists.map(list => (
                    <SelectItem key={list.id} value={list.id}>{list.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative">
                <input
                    type="file"
                    accept=".csv"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleImport}
                />
                <Button variant="outline" className="gap-2 text-sm" size="sm">
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Import CSV</span>
                </Button>
              </div>
              <Button variant="outline" className="gap-2 text-sm" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New List</DialogTitle>
                    <DialogDescription>
                      Create a new list to group your contacts.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>List Name</Label>
                      <Input
                        placeholder="e.g. VIP Customers, Diwali Campaign"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsListDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button className="gradient-primary" onClick={async () => {
                        if (!newListName.trim()) return toast({title: 'Error', description: 'Name required', variant: 'destructive'});
                        try {
                          await contactService.createContactList(newListName);
                          toast({title: 'Success', description: 'List created'});
                          setNewListName('');
                          setIsListDialogOpen(false);
                          fetchContactLists();
                        } catch (e: any) {
                          toast({title: 'Error', description: e.response?.data?.message || 'Failed', variant: 'destructive'});
                        }
                      }}>
                        Create List
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger asChild>
                  <Button className="gradient-primary gap-2" size="sm">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Add Contact</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>
                      Fill in the details below to add a new contact to your list.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="Contact name"
                        value={newContact.name}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+1 234 567 890"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={newContact.category}
                          onValueChange={(value: any) => setNewContact({ ...newContact, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="guest">Guest</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Channel</Label>
                        <Select
                          value={newContact.channel}
                          onValueChange={(value: any) => setNewContact({ ...newContact, channel: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {enabledChannels.map(channel => (
                              <SelectItem key={channel} value={channel.toLowerCase()}>
                                {channel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Labels (comma separated)</Label>
                      <Input
                        placeholder="VIP, Premium, Returning"
                        value={newContact.labels}
                        onChange={(e) => setNewContact({ ...newContact, labels: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddContact} className="gradient-primary">
                        Add Contact
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              {/* EDIT DIALOG */}
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Contact</DialogTitle>
                    <DialogDescription>
                      Update the contact details.
                    </DialogDescription>
                  </DialogHeader>
                  {editingContact && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        placeholder="Contact name"
                        value={editingContact.name}
                        onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+1 234 567 890"
                        value={editingContact.phone}
                        onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={editingContact.email || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={editingContact.category}
                          onValueChange={(value: any) => setEditingContact({ ...editingContact, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="guest">Guest</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="customer">Customer</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Channel</Label>
                        <Select
                          value={editingContact.channel}
                          onValueChange={(value: any) => setEditingContact({ ...editingContact, channel: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {enabledChannels.map((channel: string) => (
                              <SelectItem key={channel} value={channel.toLowerCase()}>
                                {channel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Labels (comma separated)</Label>
                      <Input
                        placeholder="VIP, Premium, Returning"
                        value={editingContact.labels || ''}
                        onChange={(e) => setEditingContact({ ...editingContact, labels: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateContact} className="gradient-primary">
                        Save Changes
                      </Button>
                    </div>
                  </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Scroll Buttons */}
            <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => handleScroll('left')}>
                   <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleScroll('right')}>
                   <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <Button
              variant="outline"
              className="gap-2 lg:hidden"
              onClick={() => setIsFilterOpen(true)}
            >
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Users className="h-12 w-12 mb-4 opacity-20" />
              <p>No contacts found</p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-x-auto" ref={tableContainerRef}>
              <table className="w-full min-w-[800px]">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-10 p-3">
                      <Checkbox 
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="text-left p-3 font-medium text-sm">Contact</th>
                    <th className="text-left p-3 font-medium text-sm hidden lg:table-cell">Email</th>
                    <th className="text-left p-3 font-medium text-sm">Category</th>
                    <th className="text-left p-3 font-medium text-sm">Channel</th>
                    <th className="text-left p-3 font-medium text-sm hidden lg:table-cell">Labels</th>
                    <th className="text-right p-3 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact) => (
                    <tr key={contact.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <Checkbox 
                            checked={selectedContacts.includes(contact.id)}
                            onCheckedChange={(checked) => handleSelectOne(contact.id, checked as boolean)}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {contact.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <span className="font-medium">{contact.name}</span>
                              {!!contact.starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
                            </div>
                            <span className="text-sm text-muted-foreground">{contact.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{contact.email || '-'}</td>
                      <td className="p-3">
                        <Badge variant="outline" className={cn('capitalize', getCategoryBadge(contact.category))}>
                          {contact.category}
                        </Badge>
                      </td>
                      <td className="p-3">
                        {getChannelIcon(contact.channel)}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="flex items-center gap-1 flex-wrap">
                          {contact.labels ? contact.labels.split(',').map((label) => (
                            <Badge key={label} variant="secondary" className="text-xs">
                              {label.trim()}
                            </Badge>
                          )) : null}
                        </div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn("hover:bg-yellow-100 dark:hover:bg-yellow-900/20", contact.starred ? "text-yellow-400" : "text-muted-foreground")}
                                onClick={() => handleToggleStar(contact)}
                            >
                                <Star className={cn("h-4 w-4", contact.starred && "fill-current")} />
                            </Button>
                            
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn("hover:bg-red-100 dark:hover:bg-red-900/20", contact.status === 'blocked' ? "text-red-500" : "text-muted-foreground")}
                                onClick={() => handleToggleBlacklist(contact)}
                            >
                                <Ban className="h-4 w-4" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-muted-foreground hover:bg-blue-100 dark:hover:bg-blue-900/20"
                              onClick={() => handleEditClick(contact)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>

                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteContact(contact.id)}
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
          )}
        </div>
      </div>
    </div>
  );
}
