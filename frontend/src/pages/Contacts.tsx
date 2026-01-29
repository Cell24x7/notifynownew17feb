import { useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Upload, 
  Download, 
  Users, 
  Star, 
  Ban, 
  UserCheck, 
  Crown,
  MessageSquare,
  Mail,
  Phone,
  Instagram,
  Globe,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Mock data for contacts
const mockContacts = [
  {
    id: '1',
    name: 'Sarah Johnson',
    phone: '+1 555 123 4567',
    email: 'sarah.johnson@email.com',
    category: 'guest',
    status: 'active',
    rating: 4.5,
    channel: 'whatsapp',
    labels: ['VIP Lounge', 'Returning'],
    starred: true,
  },
  {
    id: '2',
    name: 'Michael Chen',
    phone: '+86 138 1234 5678',
    email: 'michael.chen@business.com',
    category: 'vip',
    status: 'active',
    rating: 5.0,
    channel: 'email',
    labels: ['Corporate', 'Suite'],
    starred: true,
  },
  {
    id: '3',
    name: 'Emma Williams',
    phone: '+44 7911 123456',
    email: 'emma.w@gmail.com',
    category: 'lead',
    status: 'inactive',
    rating: null,
    channel: 'instagram',
    labels: ['Inquiry', 'Wedding'],
    starred: false,
  },
  {
    id: '4',
    name: 'Carlos Rodriguez',
    phone: '+34 612 345 678',
    email: 'carlos@hotel-partner.es',
    category: 'customer',
    status: 'active',
    rating: 4.0,
    channel: 'whatsapp',
    labels: ['Partner', 'Returning'],
    starred: false,
  },
  {
    id: '5',
    name: 'Aisha Patel',
    phone: '+91 98765 43210',
    email: 'aisha.patel@corp.in',
    category: 'customer',
    status: 'active',
    rating: 3.0,
    channel: 'instagram',
    labels: ['Loyalty Member', 'Premium'],
    starred: false,
  },
  {
    id: '6',
    name: 'James Wilson',
    phone: '+1 555 987 6543',
    email: 'j.wilson@example.com',
    category: 'guest',
    status: 'active',
    rating: 2.0,
    channel: 'email',
    labels: ['Business Travel'],
    starred: false,
  },
  {
    id: '7',
    name: 'Lisa Thompson',
    phone: '+1 555 456 7890',
    email: 'lisa.t@company.com',
    category: 'lead',
    status: 'pending',
    rating: null,
    channel: 'sms',
    labels: ['Event Planning', 'Conference'],
    starred: true,
  },
];

const viewFilters = [
  { id: 'all', label: 'All Contacts', icon: Users, count: 12 },
  { id: 'starred', label: 'Starred', icon: Star, count: 5 },
  { id: 'blacklisted', label: 'Blacklisted', icon: Ban, count: 1 },
];

const categoryFilters = [
  { id: 'guest', label: 'Guest', color: 'bg-emerald-500' },
  { id: 'lead', label: 'Lead', color: 'bg-amber-500' },
  { id: 'customer', label: 'Customer', color: 'bg-green-500' },
  { id: 'vip', label: 'VIP', color: 'bg-purple-500' },
];

const channelFilters = [
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'sms', label: 'SMS', icon: Phone },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'web', label: 'Web Widget', icon: Globe },
];

export default function Contacts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'lead',
    channel: 'whatsapp',
    labels: '',
  });
  const { toast } = useToast();

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'email': return <Mail className="h-4 w-4 text-blue-500" />;
      case 'sms': return <Phone className="h-4 w-4 text-purple-500" />;
      case 'instagram': return <Instagram className="h-4 w-4 text-pink-500" />;
      default: return <Globe className="h-4 w-4 text-gray-500" />;
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

  const handleAddContact = () => {
    toast({
      title: 'Contact Added',
      description: `${newContact.name} has been added to your contacts.`,
    });
    setIsAddOpen(false);
    setNewContact({ name: '', phone: '', email: '', category: 'lead', channel: 'whatsapp', labels: '' });
  };

  const filteredContacts = mockContacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesView = selectedView === 'all' || 
      (selectedView === 'starred' && contact.starred) ||
      (selectedView === 'blacklisted' && contact.status === 'blocked');
    const matchesCategory = !selectedCategory || contact.category === selectedCategory;
    const matchesChannel = !selectedChannel || contact.channel === selectedChannel;
    return matchesSearch && matchesView && matchesCategory && matchesChannel;
  });

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-background">
      {/* Left Sidebar - Filters (Desktop) / Sheet (Mobile) */}
      <div className={cn(
        "border-r border-border p-4 space-y-6 bg-card",
        "hidden lg:block lg:w-56"
      )}>
        {/* Views */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Views</h3>
          <div className="space-y-1">
            {viewFilters.map((view) => (
              <button
                key={view.id}
                onClick={() => setSelectedView(view.id)}
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
                <Badge variant="secondary" className="text-xs">{view.count}</Badge>
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
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
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
                <Badge variant="secondary" className="text-xs">3</Badge>
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
                onClick={() => setSelectedChannel(selectedChannel === channel.id ? null : channel.id)}
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
                <Badge variant="secondary" className="text-xs">4</Badge>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Filter Sheet */}
      <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filters</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Views */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Views</h3>
              <div className="space-y-1">
                {viewFilters.map((view) => (
                  <button
                    key={view.id}
                    onClick={() => {
                      setSelectedView(view.id);
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
                    <Badge variant="secondary" className="text-xs">{view.count}</Badge>
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
                    onClick={() => {
                      setSelectedCategory(selectedCategory === category.id ? null : category.id);
                      setIsFilterOpen(false);
                    }}
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
                    <Badge variant="secondary" className="text-xs">3</Badge>
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
                    onClick={() => {
                      setSelectedChannel(selectedChannel === channel.id ? null : channel.id);
                      setIsFilterOpen(false);
                    }}
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
                    <Badge variant="secondary" className="text-xs">4</Badge>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl font-bold">Contacts</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" className="gap-2 text-sm" size="sm">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import CSV</span>
              </Button>
              <Button variant="outline" className="gap-2 text-sm" size="sm">
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
                          onValueChange={(value) => setNewContact({ ...newContact, category: value })}
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
                          onValueChange={(value) => setNewContact({ ...newContact, channel: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="sms">SMS</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
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

        {/* Mobile Card View */}
        <div className="flex-1 overflow-auto p-4 md:hidden">
          <div className="space-y-3">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox />
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium truncate">{contact.name}</span>
                      {contact.starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 shrink-0" />}
                    </div>
                    <span className="text-sm text-muted-foreground block truncate">{contact.phone}</span>
                    <span className="text-sm text-muted-foreground block truncate">{contact.email}</span>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="outline" className={cn('capitalize text-xs', getCategoryBadge(contact.category))}>
                        {contact.category}
                      </Badge>
                      {getChannelIcon(contact.channel)}
                      {contact.labels.slice(0, 1).map((label) => (
                        <Badge key={label} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Desktop Table */}
        <div className="flex-1 overflow-auto p-4 md:p-6 hidden md:block">
          <div className="rounded-lg border border-border overflow-hidden overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-10 p-3">
                    <Checkbox />
                  </th>
                  <th className="text-left p-3 font-medium text-sm">Contact</th>
                  <th className="text-left p-3 font-medium text-sm hidden lg:table-cell">Email</th>
                  <th className="text-left p-3 font-medium text-sm">Category</th>
                  <th className="text-left p-3 font-medium text-sm hidden xl:table-cell">Rating</th>
                  <th className="text-left p-3 font-medium text-sm">Channel</th>
                  <th className="text-left p-3 font-medium text-sm hidden lg:table-cell">Labels</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <Checkbox />
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
                    <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{contact.email}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={cn('capitalize', getCategoryBadge(contact.category))}>
                        {contact.category}
                      </Badge>
                    </td>
                    <td className="p-3 hidden xl:table-cell">
                      {contact.rating ? (
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={cn(
                                'h-3 w-3',
                                star <= contact.rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                              )}
                            />
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No rating</span>
                      )}
                    </td>
                    <td className="p-3">
                      {getChannelIcon(contact.channel)}
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex items-center gap-1 flex-wrap">
                        {contact.labels.map((label) => (
                          <Badge key={label} variant="secondary" className="text-xs">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        {/* Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 md:p-6 border-t">
          <p className="text-sm text-muted-foreground">
            Showing 1-{filteredContacts.length} of {filteredContacts.length} contacts
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Previous</span>
            </Button>
            <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
              1
            </Button>
            <Button variant="outline" size="sm">
              2
            </Button>
            <Button variant="outline" size="sm">
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
