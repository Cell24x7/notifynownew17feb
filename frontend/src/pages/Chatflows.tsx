import { useState, useEffect } from 'react';
import { Plus, Search, MessageSquare, Zap, Play, Pause, Copy, Trash2, MoreVertical, Settings, Bot, ArrowRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/status-badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getEndpoint } from '@/config/api';
import FlowBuilderWizard from '@/components/chatflows/FlowBuilderWizard';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Flow {
    id: string;
    name: string;
    keywords: string[];
    category: string;
    status: 'active' | 'paused' | 'draft';
    triggers: number;
    lastUsed?: string;
}

export default function Chatflows() {
    const [flows, setFlows] = useState<Flow[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null);
    const { toast } = useToast();

    const fetchFlows = async () => {
        try {
            setLoading(true);
            const response = await fetch(getEndpoint('/api/chatflows'), {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            const data = await response.json();
            setFlows(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Fetch flows error:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch conversation flows',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlows();
    }, []);

    const filteredFlows = Array.isArray(flows) ? flows.filter((flow) =>
        flow.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        flow.keywords?.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    ) : [];

    const handleCreateFlow = () => {
        setSelectedFlow(null);
        setIsWizardOpen(true);
    };

    const handleEditFlow = (flow: Flow) => {
        setSelectedFlow(flow);
        setIsWizardOpen(true);
    };

    const handleStatusChange = async (flowId: string, newStatus: Flow['status']) => {
        try {
            const response = await fetch(getEndpoint(`/api/chatflows/${flowId}/status`), {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (response.ok) {
                setFlows(flows.map((f) => (f.id === flowId ? { ...f, status: newStatus } : f)));
                toast({
                    title: 'Flow updated',
                    description: `Flow is now ${newStatus}.`,
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update status');
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
        }
    };

    const handleDelete = async (flowId: string) => {
        if (!confirm('Are you sure you want to delete this flow?')) return;

        try {
            const response = await fetch(getEndpoint(`/api/chatflows/${flowId}`), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                setFlows(flows.filter((f) => f.id !== flowId));
                toast({
                    title: 'Flow deleted',
                    description: 'The flow has been removed.',
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete flow');
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to delete flow', variant: 'destructive' });
        }
    };

    const handleWizardComplete = async (data: any) => {
        try {
            const payload = {
                id: selectedFlow?.id,
                name: data.step1.name,
                category: data.step1.category,
                keywords: data.step1.keywords,
                header_type: data.step1.headerType,
                header_value: data.step1.headerValue,
                body: data.step2.body,
                track_url: data.step2.trackUrl,
                api_config: data.step2.apiIntegration,
                footer_config: data.step3,
                logic_config: data.step4
            };

            const method = selectedFlow ? 'PUT' : 'POST';
            const url = selectedFlow ? getEndpoint(`/api/chatflows/${selectedFlow.id}`) : getEndpoint('/api/chatflows');

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                fetchFlows(); // Re-fetch flows to update the list
                setIsWizardOpen(false);
                toast({
                    title: 'Flow saved',
                    description: 'The conversation flow has been saved and activated.',
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to save flow');
            }
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to save flow', variant: 'destructive' });
        }
    };

    return (
        <div className="p-4 md:p-6 space-y-6 animate-fade-in w-full max-w-[100vw] overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
                        <Bot className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                        Chatflows
                    </h1>
                    <p className="text-sm md:text-base text-muted-foreground">Build keyword-based conversational flows and auto-responses</p>
                </div>
                <Button onClick={handleCreateFlow} className="gradient-primary shadow-md hover:shadow-lg transition-all duration-300 font-bold border-none">
                    <Plus className="h-5 w-5 mr-2" />
                    Add New Flow
                </Button>
            </div>

            {/* Search and Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by name or keyword..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-card"
                    />
                </div>
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3 flex items-center justify-between">
                        <div className="text-sm font-medium text-primary">Active Flows</div>
                        <div className="text-2xl font-bold text-primary">{Array.isArray(flows) ? flows.filter(f => f.status === 'active').length : 0}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Flows Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredFlows.map((flow) => (
                    <Card key={flow.id} className="card-elevated group flex flex-col h-full hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-3 flex flex-row items-start justify-between space-y-0">
                            <div className="space-y-1">
                                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">
                                    {flow.name}
                                </CardTitle>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {flow.keywords.map((k, i) => (
                                        <span key={i} className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-medium text-muted-foreground">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <StatusBadge status={flow.status} />
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="flex items-center justify-between text-sm py-2 px-3 bg-muted/30 rounded-lg border">
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Category</span>
                                    <span className="font-semibold">{flow.category}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Triggers</span>
                                    <span className="font-semibold">{flow.triggers.toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <Button
                                    className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border-none shadow-none"
                                    size="sm"
                                    onClick={() => handleEditFlow(flow)}
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Configure
                                </Button>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="w-10 p-0">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => handleStatusChange(flow.id, flow.status === 'active' ? 'paused' : 'active')}>
                                            {flow.status === 'active' ? (
                                                <><Pause className="mr-2 h-4 w-4" /> Pause</>
                                            ) : (
                                                <><Play className="mr-2 h-4 w-4" /> Activate</>
                                            )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => { }}>
                                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDelete(flow.id)} className="text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Flow
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredFlows.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border-2 border-dashed border-muted shadow-inner">
                    <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center mb-6 ring-8 ring-primary/5">
                        <Layers className="h-10 w-10 text-primary/40" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No flows created yet</h3>
                    <p className="text-muted-foreground text-center max-w-sm mb-8 px-4">
                        Start building your intelligent chatbot flows to automate your conversations and business processes.
                    </p>
                    <Button onClick={handleCreateFlow} size="lg" className="gradient-primary">
                        <Plus className="h-5 w-5 mr-2" />
                        Build Your First Flow
                    </Button>
                </div>
            )}

            {/* Flow Builder Wizard Dialog */}
            <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
                <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 flex flex-col border-none shadow-2xl">
                    <DialogDescription className="sr-only">Configure your conversation flow step by step</DialogDescription>
                    <FlowBuilderWizard
                        initialData={selectedFlow}
                        onSave={handleWizardComplete}
                        onCancel={() => setIsWizardOpen(false)}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}

