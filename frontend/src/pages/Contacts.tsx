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
import { contactService, Contact } from '@/services/contactService';

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

const channelFilters = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'sms', label: 'SMS', icon: Phone },
];

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
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
    channel: 'whatsapp' as Contact['channel'],
    labels: '',
  });

  const { toast } = useToast();

  const tableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContacts();
  }, [selectedView, selectedCategory, selectedChannel]);

  // Reset selection when filters change
  useEffect(() => {
    setSelectedContacts([]);
  }, [searchQuery, selectedView, selectedCategory, selectedChannel]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const data = await contactService.getContacts({
        view: selectedView === 'all' ? undefined : selectedView,
        category: selectedCategory,
        channel: selectedChannel,
      });
      setContacts(data);
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
            await contactService.importContacts(contactsToImport);
            toast({ title: 'Success', description: `Imported ${contactsToImport.length} contacts.` });
            fetchContacts();
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
      await contactService.createContact(newContact);
      toast({
        title: 'Success',
        description: 'Contact created successfully.',
      });
      setIsAddOpen(false);
      setNewContact({ name: '', phone: '', email: '', category: 'lead', channel: 'whatsapp', labels: '' });
      fetchContacts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create contact.',
        variant: 'destructive',
      });
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
    switch (channel) {
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'sms': return <Phone className="h-4 w-4 text-purple-500" />;
      default: return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
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
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      (contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
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
                onClick={() => { setSelectedView(view.id); setIsFilterOpen(false); }}
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
            {channelFilters.map((channel) => (
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
                  <channel.icon className="h-4 w-4" />
                  <span>{channel.label}</span>
                </div>
              </button>
            ))}
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
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
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
                              {contact.starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
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
