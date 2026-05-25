import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  Send, 
  Users, 
  RefreshCw, 
  Trash2, 
  QrCode,
  CheckCircle2,
  LogOut,
  Plus,
  FileText,
  Sparkles,
  MessageSquare,
  Zap,
  Phone,
  Copy,
  Check,
  Loader2,
  CircleDot,
  Hash,
  X,
  Smartphone,
  Wifi,
  Battery,
  Signal,
  ChevronLeft,
  MoreVertical,
  Paperclip,
  Mic,
  Smile,
  Camera,
  Upload,
  Info,
  BarChart3,
  Eye,
  AlertTriangle,
  Clock,
  UserCheck,
  Activity,
  Heart,
  Database,
  Search,
  CheckSquare,
  History,
  TrendingUp,
  Mail,
  UserX,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import api from '../../config/axios';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DeveloperConsoleProps {
  channel: any;
}

interface Template {
  id?: number;
  template_id?: number;
  user_id: number;
  template_name: string;
  template_type: string;
  template_content: string;
  variables: string[];
  preview_text: string;
  template_data?: any;
}

interface Recipient {
  phone: string;
  variables?: Record<string, string>;
}

interface UploadedFileState {
  fileName: string;
  headers: string[];
  rows: any[][];
}

export default function DeveloperConsole({ channel }: DeveloperConsoleProps) {
  const sessionName = `session${channel.id || 1}`;
  const [userId] = useState('1');
  const PROXY_BASE = '/api/proero/proxy';

  // State: Core campaign config
  const [campaignId, setCampaignId] = useState(String(Math.floor(Math.random() * 900000) + 100000));
  const [isCampaignCreated, setIsCampaignCreated] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [uploadedFile, setUploadedFile] = useState<UploadedFileState | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [messageContent, setMessageContent] = useState('');
  const [sendMode, setSendMode] = useState<'text' | 'template'>('text');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // State: Session / Health (Phases 0 & 1)
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [readinessStatus, setReadinessStatus] = useState<any>(null);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [isLoadingHealth, setIsLoadingHealth] = useState(false);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');

  // State: User Management (Phase 2)
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // State: Templates (Phase 3)
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    template_name: '',
    template_type: 'plainText',
    template_content: '',
    variables: [] as string[],
    preview_text: '',
  });

  // State: Campaigns list (Phase 4 & 6)
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignDesc, setNewCampaignDesc] = useState('');

  // State: Contacts upload (Phase 5)
  const [recipientInputMode, setRecipientInputMode] = useState<'chips' | 'textarea' | 'upload'>('chips');
  const [numberInput, setNumberInput] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [editNumbersText, setEditNumbersText] = useState('');
  const [showViewAllModal, setShowViewAllModal] = useState(false);
  const [stagedContacts, setStagedContacts] = useState<any[]>([]);
  const [isLoadingStaged, setIsLoadingStaged] = useState(false);
  const [showStagedModal, setShowStagedModal] = useState(false);
  const [stagedSearchTerm, setStagedSearchTerm] = useState('');

  // State: Reports & Analytics (Phases 7, 8 & 9)
  const [campaignStatus, setCampaignStatus] = useState<any>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [campaignMessages, setCampaignMessages] = useState<any[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [campaignAnalytics, setCampaignAnalytics] = useState<any>(null);
  const [readAnalytics, setReadAnalytics] = useState<any>(null);
  const [readSummary, setReadSummary] = useState<any>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [messageSearchTerm, setMessageSearchTerm] = useState('');

  // Selected Message detail inspector modal
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [messageHistory, setMessageHistory] = useState<any[]>([]);
  const [messageReadUsers, setMessageReadUsers] = useState<any[]>([]);
  const [messagePendingUsers, setMessagePendingUsers] = useState<any[]>([]);
  const [isLoadingMsgDetails, setIsLoadingMsgDetails] = useState(false);
  const [showMsgDetailsModal, setShowMsgDetailsModal] = useState(false);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const numberInputRef = useRef<HTMLInputElement>(null);

  // Display Message Preview configuration
  const selectedTemplate = templates.find(t => String(t.id || t.template_id) === selectedTemplateId);
  const previewMessage = useMemo(() => {
    let msg = sendMode === 'template' 
      ? (selectedTemplate?.template_content || selectedTemplate?.preview_text || 'Select a template to preview...') 
      : (messageContent || 'Type a message to preview...');
    
    // Substitute variables from the first preview recipient if available
    const firstRec = activePreviewRecipients[0];
    if (firstRec && firstRec.variables) {
      Object.entries(firstRec.variables).forEach(([key, val]) => {
        const regex = new RegExp(`{{\\s*${key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*}}`, 'g');
        msg = msg.replace(regex, val !== undefined && val !== null ? val : `[${key}]`);
      });
    }
    return msg;
  }, [sendMode, selectedTemplate, messageContent, activePreviewRecipients]);

  // Required Campaign Variables Detector
  const requiredVariables = useMemo(() => {
    if (sendMode === 'template') {
      if (!selectedTemplate) return [];
      const vars = Array.isArray(selectedTemplate.variables)
        ? selectedTemplate.variables
        : (typeof selectedTemplate.variables === 'string'
            ? (selectedTemplate.variables as string).split(',').map((s: string) => s.trim()).filter(Boolean)
            : []);
      const contentVars = [...(selectedTemplate.template_content || '').matchAll(/{{([^{}]+)}}/g)].map(m => m[1].trim());
      return Array.from(new Set([...vars, ...contentVars]));
    } else {
      return Array.from(new Set([...messageContent.matchAll(/{{([^{}]+)}}/g)].map(m => m[1].trim())));
    }
  }, [sendMode, selectedTemplate, messageContent]);

  // Active count of contacts to stage (manual chips or file upload rows)
  const activeStagingCount = useMemo(() => {
    if (recipientInputMode === 'upload' && uploadedFile) {
      return uploadedFile.rows.length;
    }
    return recipients.length;
  }, [recipientInputMode, uploadedFile, recipients]);

  // Safe helper to get number of variables in a template
  const getTemplateVarsCount = (tpl: Template) => {
    if (Array.isArray(tpl.variables)) return tpl.variables.length;
    if (typeof tpl.variables === 'string') return (tpl.variables as string).split(',').filter(Boolean).length;
    return 0;
  };

  // Mapped recipients preview for the interactive phone mockup
  const activePreviewRecipients = useMemo(() => {
    if (recipientInputMode === 'upload' && uploadedFile) {
      if (!columnMapping.phone) return [];
      const phoneColIdx = uploadedFile.headers.indexOf(columnMapping.phone);
      if (phoneColIdx === -1) return [];

      return uploadedFile.rows.slice(0, 2).map(row => {
        const rawPhone = String(row[phoneColIdx] || '').trim();
        const phone = rawPhone.replace(/\D/g, '');
        const vars: Record<string, string> = {};
        requiredVariables.forEach(v => {
          const mappedHeader = columnMapping[v];
          if (mappedHeader) {
            const colIdx = uploadedFile.headers.indexOf(mappedHeader);
            if (colIdx !== -1) {
              vars[v] = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]).trim() : '';
            }
          }
        });
        return { phone, variables: vars };
      });
    }
    return recipients.slice(0, 2);
  }, [recipientInputMode, uploadedFile, columnMapping, requiredVariables, recipients]);

  // --- Initial Data Load ---
  useEffect(() => {
    fetchHealthChecks();
    fetchActiveSessions();
    fetchUsers();
    fetchTemplates();
    fetchCampaigns();
    if (campaignId) {
      fetchCampaignStatus();
      fetchStagedContacts();
      fetchCampaignMessages();
      fetchCampaignAnalytics();
    }
  }, []);

  // Auto-map newly detected variables if a file was already uploaded
  useEffect(() => {
    if (uploadedFile) {
      setColumnMapping(prev => {
        const nextMapping = { ...prev };
        requiredVariables.forEach(v => {
          if (!nextMapping[v]) {
            const matchedHeader = uploadedFile.headers.find(h => h.toLowerCase() === v.toLowerCase()) || '';
            nextMapping[v] = matchedHeader;
          }
        });
        return nextMapping;
      });
    }
  }, [requiredVariables, uploadedFile]);

  // Poll status when active campaign runs
  useEffect(() => {
    if (!campaignStatus) return;
    const active = (campaignStatus.local?.pending || 0) + (campaignStatus.local?.in_progress || 0) + (campaignStatus.local?.staged || 0);
    const remotePending = campaignStatus.remote?.pending || 0;
    if (active === 0 && remotePending === 0) return;

    const interval = setInterval(() => {
      fetchCampaignStatus();
      fetchStagedContacts();
      fetchCampaignMessages();
      fetchCampaignAnalytics();
    }, 5000);

    return () => clearInterval(interval);
  }, [campaignStatus]);

  // Refresh data when campaignId changes
  const handleCampaignIdChange = (id: string) => {
    setCampaignId(id);
    setIsCampaignCreated(campaigns.some(c => String(c.campaign_id || c.id || c.campaignId) === id));
    
    // Trigger updates
    setTimeout(() => {
      fetchCampaignStatus();
      fetchStagedContacts();
      fetchCampaignMessages();
      fetchCampaignAnalytics();
    }, 100);
  };

  // ════════════════════════════════════════════════════════════
  // API CALLS
  // ════════════════════════════════════════════════════════════

  // --- PHASE 0: Health Checks ---
  const fetchHealthChecks = async () => {
    try {
      setIsLoadingHealth(true);
      const hRes = await api.get(`${PROXY_BASE}/health/health`);
      setHealthStatus(hRes.data);
      const rRes = await api.get(`${PROXY_BASE}/health/ready`);
      setReadinessStatus(rRes.data);
    } catch (err: any) {
      console.warn('Health check failed:', err.message);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  // --- PHASE 1: WhatsApp Connection ---
  const fetchActiveSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const response = await api.get(`${PROXY_BASE}/api/whatsapp/sessions`);
      const sessions = response.data.sessions || response.data.data?.sessions || response.data || [];
      
      let list: any[] = [];
      if (Array.isArray(sessions)) {
        list = sessions;
      } else if (typeof sessions === 'object') {
        list = Object.values(sessions);
      }
      setActiveSessions(list);

      // Check current channel status
      const current = list.find(s => s.sessionName === sessionName || s.name === sessionName || s.id === sessionName);
      if (current) {
        setConnectionStatus((current.status === 'connected' || current.state === 'CONNECTED' || current.ready === true) ? 'connected' : 'disconnected');
      }
    } catch (err: any) {
      console.warn('Fetch sessions failed:', err.message);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      setActiveAction('connect');
      const response = await api.post(`${PROXY_BASE}/api/whatsapp/connect`, { sessionName });
      const qrData = response.data.qr || response.data.qrCode || response.data.data?.qr;
      if (qrData) {
        setQrCode(qrData);
        toast.success("QR Code loaded! Scan with WhatsApp");
      } else {
        setConnectionStatus('connected');
        toast.success("WhatsApp session already connected!");
      }
      fetchActiveSessions();
    } catch (err: any) {
      toast.error("Failed to connect WhatsApp session");
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoading(true);
      setActiveAction('logout');
      await api.post(`${PROXY_BASE}/api/whatsapp/logout`, { sessionName });
      setQrCode(null);
      setConnectionStatus('disconnected');
      toast.success("WhatsApp logged out successfully");
      fetchActiveSessions();
    } catch (err: any) {
      toast.error("Failed to logout session");
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleSyncStatus = async () => {
    try {
      setIsLoading(true);
      setActiveAction('sync');
      const response = await api.post(`/api/proero/channels/${channel.id}/sync`);
      if (response.data.success) {
        setConnectionStatus(response.data.status === 'connected' ? 'connected' : 'disconnected');
        toast.success(`Session synced! Status: ${response.data.status}`);
      }
      fetchActiveSessions();
    } catch (err: any) {
      toast.error("Sync channel failed");
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // --- PHASE 2: User Management ---
  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const response = await api.get(`${PROXY_BASE}/api/user/list`);
      if (response.data?.success) {
        setUsers(response.data.data || []);
      }
    } catch (err: any) {
      console.warn('Fetch users failed:', err.message);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newEmail.trim()) {
      toast.error("Username and email are required");
      return;
    }
    try {
      setIsLoading(true);
      const response = await api.post(`${PROXY_BASE}/api/user/create`, {
        username: newUsername,
        email: newEmail
      });
      if (response.data?.success) {
        toast.success("User created successfully!");
        setNewUsername('');
        setNewEmail('');
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  // --- PHASE 3: Message Templates ---
  const fetchTemplates = async () => {
    try {
      const response = await api.get(`${PROXY_BASE}/api/campaign/templates/user/${userId}`);
      if (Array.isArray(response.data)) {
        setTemplates(response.data);
      } else if (response.data?.templates) {
        setTemplates(response.data.templates);
      } else if (response.data?.data) {
        setTemplates(response.data.data);
      }
    } catch (err) {
      console.warn('Fetch templates failed:', err);
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplate.template_name.trim() || !newTemplate.template_content.trim()) {
      toast.error("Template name and content are required");
      return;
    }
    try {
      setIsLoading(true);
      await api.post(`${PROXY_BASE}/api/campaign/templates/save`, {
        ...newTemplate,
        user_id: parseInt(userId)
      });
      toast.success("Template saved successfully!");
      setShowCreateTemplate(false);
      setNewTemplate({ template_name: '', template_type: 'plainText', template_content: '', variables: [], preview_text: '' });
      fetchTemplates();
    } catch (err: any) {
      toast.error("Failed to save template");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateIdToDelete: number) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`${PROXY_BASE}/api/campaign/templates/${templateIdToDelete}`, {
        data: { user_id: parseInt(userId) }
      });
      toast.success("Template deleted successfully");
      if (selectedTemplateId === String(templateIdToDelete)) {
        setSelectedTemplateId('');
      }
      fetchTemplates();
    } catch (err: any) {
      toast.error("Failed to delete template");
    }
  };

  // --- PHASE 4: Campaign Setup ---
  const fetchCampaigns = async () => {
    try {
      setIsLoadingCampaigns(true);
      const response = await api.get(`${PROXY_BASE}/api/campaign/list`);
      if (response.data?.success) {
        setCampaigns(response.data.data || []);
      }
    } catch (err: any) {
      console.warn('Fetch campaigns list failed:', err.message);
    } finally {
      setIsLoadingCampaigns(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampaignName.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    try {
      setIsLoading(true);
      const response = await api.post(`${PROXY_BASE}/api/campaign/create`, {
        user_id: parseInt(userId),
        campaign_name: newCampaignName,
        campaign_description: newCampaignDesc
      });
      if (response.data?.success && response.data?.data) {
        const idStr = String(response.data.data.campaign_id || response.data.data.id);
        toast.success(`Campaign "${newCampaignName}" created!`);
        setNewCampaignName('');
        setNewCampaignDesc('');
        fetchCampaigns();
        handleCampaignIdChange(idStr);
      }
    } catch (err: any) {
      toast.error("Failed to create campaign");
    } finally {
      setIsLoading(false);
    }
  };

  // --- PHASE 5: Campaign Contacts ---
  const fetchStagedContacts = async () => {
    if (!campaignId) return;
    try {
      setIsLoadingStaged(true);
      const response = await api.get(`${PROXY_BASE}/api/campaign/${campaignId}/contacts`);
      if (response.data?.success) {
        setStagedContacts(response.data.contacts || []);
      }
    } catch (err: any) {
      console.warn('Fetch staged contacts failed:', err.message);
    } finally {
      setIsLoadingStaged(false);
    }
  };

  const handleAddContacts = async () => {
    let contactsToStage: Recipient[] = [];

    if (recipientInputMode === 'upload') {
      if (!uploadedFile) {
        toast.error("Please upload a file first");
        return;
      }
      if (!columnMapping.phone) {
        toast.error("Please select the Phone Number column");
        return;
      }
      const phoneColIdx = uploadedFile.headers.indexOf(columnMapping.phone);
      if (phoneColIdx === -1) {
        toast.error("Invalid Phone Number column mapping");
        return;
      }

      uploadedFile.rows.forEach(row => {
        const rawPhone = String(row[phoneColIdx] || '').trim();
        const phone = rawPhone.replace(/\D/g, '');
        if (phone.length >= 10) {
          const vars: Record<string, string> = {};
          requiredVariables.forEach(v => {
            const mappedHeader = columnMapping[v];
            if (mappedHeader) {
              const colIdx = uploadedFile.headers.indexOf(mappedHeader);
              if (colIdx !== -1) {
                vars[v] = row[colIdx] !== undefined && row[colIdx] !== null ? String(row[colIdx]).trim() : '';
              }
            }
          });
          contactsToStage.push({ phone, variables: vars });
        }
      });

      // Filter duplicates by phone
      const uniqueMobiles = Array.from(new Set(contactsToStage.map(r => r.phone)));
      contactsToStage = uniqueMobiles.map(m => contactsToStage.find(r => r.phone === m) as Recipient);

      if (contactsToStage.length === 0) {
        toast.error("No valid phone numbers found in file");
        return;
      }
    } else {
      if (recipients.length === 0) {
        toast.error("Add at least one recipient phone number");
        return;
      }
      contactsToStage = recipients;
    }

    try {
      setIsLoading(true);
      setActiveAction('stage');

      let activeId = campaignId;
      // Auto create campaign if not yet created on backend
      if (!isCampaignCreated) {
        try {
          const createResponse = await api.post(`${PROXY_BASE}/api/campaign/create`, {
            user_id: parseInt(userId),
            campaign_name: `Console Campaign ${campaignId}`,
            campaign_description: `Console Campaign initiated via Developer Console`
          });
          if (createResponse.data?.success && createResponse.data?.data) {
            activeId = String(createResponse.data.data.campaign_id || createResponse.data.data.id);
            setCampaignId(activeId);
            setIsCampaignCreated(true);
            fetchCampaigns();
          }
        } catch (createErr: any) {
          console.warn("Dynamic campaign creation failed:", createErr.message);
        }
      }

      const response = await api.post(`${PROXY_BASE}/api/campaign/add-contacts`, {
        campaign_id: parseInt(activeId),
        user_id: parseInt(userId),
        contacts: contactsToStage
      });
      
      toast.success(`${contactsToStage.length} contacts staged successfully!`);
      if (recipientInputMode === 'upload') {
        setUploadedFile(null);
      } else {
        setRecipients([]);
      }
      setLastResult({ type: 'success', message: `${contactsToStage.length} contacts uploaded to Campaign ${activeId}` });
      
      setTimeout(() => {
        fetchStagedContacts();
        fetchCampaignStatus();
      }, 500);
    } catch (err: any) {
      toast.error("Failed to add contacts to campaign");
      setLastResult({ type: 'error', message: err.response?.data?.message || 'Upload contacts failed' });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const handleDeleteStagedContact = async (num: string) => {
    try {
      await api.post(`${PROXY_BASE}/api/campaign/delete-contacts`, {
        campaign_id: parseInt(campaignId),
        user_id: parseInt(userId),
        contacts: [num]
      });
      setStagedContacts(prev => prev.filter(c => c.number !== num));
      toast.success(`Removed staged contact +${num}`);
    } catch (err: any) {
      toast.error('Failed to remove staged contact');
    }
  };

  const handleClearAllStaged = async () => {
    if (!window.confirm(`Are you sure you want to clear ALL staged contacts for campaign ${campaignId}?`)) return;
    try {
      await api.post(`${PROXY_BASE}/api/campaign/delete-contacts`, {
        campaign_id: parseInt(campaignId),
        user_id: parseInt(userId),
        contacts: []
      });
      setStagedContacts([]);
      toast.success('Staged contacts cleared');
      fetchCampaignStatus();
    } catch (err: any) {
      toast.error('Failed to clear contacts');
    }
  };

  // --- PHASE 6: Start Campaign ---
  const handleStartCampaign = async () => {
    if (sendMode === 'text' && !messageContent.trim()) {
      toast.error("Enter a plain text message to send");
      return;
    }
    if (sendMode === 'template' && !selectedTemplateId) {
      toast.error("Please select a template to send");
      return;
    }
    try {
      setIsLoading(true);
      setActiveAction('send');
      const payload = sendMode === 'template' 
        ? { user_id: parseInt(userId), templateId: parseInt(selectedTemplateId) }
        : { user_id: parseInt(userId), messageTemplate: messageContent };
      
      const response = await api.post(`${PROXY_BASE}/api/campaign/start/${campaignId}`, payload);
      toast.success("🚀 Campaign triggered successfully!");
      setLastResult({ type: 'success', message: response.data?.message || 'Campaign execution started in background' });
      
      setTimeout(() => {
        fetchCampaignStatus();
        fetchCampaignMessages();
        fetchCampaignAnalytics();
      }, 2000);
    } catch (err: any) {
      toast.error("Failed to start campaign");
      setLastResult({ type: 'error', message: err.response?.data?.message || 'Campaign execution failed' });
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  // --- PHASE 7: Monitor Campaign Status ---
  const fetchCampaignStatus = async () => {
    if (!campaignId) return;
    try {
      setIsLoadingStatus(true);
      const response = await api.get(`${PROXY_BASE}/api/campaign/${campaignId}/status`);
      if (response.data?.success) {
        setCampaignStatus(response.data);
      }
    } catch (err: any) {
      console.warn('Fetch campaign status failed:', err.message);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // --- PHASE 8: Message Details & Inspections ---
  const fetchCampaignMessages = async () => {
    if (!campaignId) return;
    try {
      setIsLoadingMessages(true);
      const response = await api.get(`${PROXY_BASE}/api/message/campaign/${campaignId}/messages-read-status`);
      if (response.data?.success) {
        setCampaignMessages(response.data.data?.messages || []);
      }
    } catch (err: any) {
      console.warn('Fetch campaign messages failed:', err.message);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleInspectMessage = async (messageId: string) => {
    try {
      setIsLoadingMsgDetails(true);
      setShowMsgDetailsModal(true);

      // Complete status endpoint (API 8.6)
      const detailsRes = await api.get(`${PROXY_BASE}/api/message/${messageId}/complete-status`);
      if (detailsRes.data?.success) {
        setSelectedMessage(detailsRes.data.data);
      }

      // Read history timeline (API 8.5)
      try {
        const histRes = await api.get(`${PROXY_BASE}/api/message/${messageId}/read-history`);
        setMessageHistory(histRes.data?.data?.history || []);
      } catch (e) {
        setMessageHistory([]);
      }

      // Read users list (API 8.3)
      try {
        const readUsersRes = await api.get(`${PROXY_BASE}/api/message/${messageId}/read-users`);
        setMessageReadUsers(readUsersRes.data?.data?.read_users || []);
      } catch (e) {
        setMessageReadUsers([]);
      }

      // Pending users list (API 8.4)
      try {
        const pendUsersRes = await api.get(`${PROXY_BASE}/api/message/${messageId}/pending-read`);
        setMessagePendingUsers(pendUsersRes.data?.data?.pending_users || []);
      } catch (e) {
        setMessagePendingUsers([]);
      }

    } catch (err: any) {
      toast.error("Failed to load message details");
    } finally {
      setIsLoadingMsgDetails(false);
    }
  };

  const handleMarkMessageAsRead = async (messageId: string, phoneNumber?: string) => {
    try {
      const payload: any = { manual_override: true };
      if (phoneNumber) {
        payload.phone_number = phoneNumber;
      }
      const response = await api.post(`${PROXY_BASE}/api/message/${messageId}/mark-read`, payload);
      if (response.data?.success) {
        toast.success("Message manually marked as read ✓");
        // Re-inspect message and refresh campaign tables
        handleInspectMessage(messageId);
        fetchCampaignMessages();
        fetchCampaignStatus();
        fetchCampaignAnalytics();
      }
    } catch (err: any) {
      toast.error("Failed to override read status");
    }
  };

  // --- PHASE 9: Analytics & Campaign Management ---
  const fetchCampaignAnalytics = async () => {
    if (!campaignId) return;
    try {
      setIsLoadingAnalytics(true);
      // Analytics detail (API 9.1)
      const aRes = await api.get(`${PROXY_BASE}/api/campaign/${campaignId}/analytics`);
      if (aRes.data?.success) {
        setCampaignAnalytics(aRes.data.data);
      }

      // Read rates & averages (API 9.3)
      try {
        const rRes = await api.get(`${PROXY_BASE}/api/message/campaign/${campaignId}/read-analytics`);
        setReadAnalytics(rRes.data?.data);
      } catch (e) {
        setReadAnalytics(null);
      }

      // Read summary (API 9.4)
      try {
        const sRes = await api.get(`${PROXY_BASE}/api/message/campaign/${campaignId}/read-summary`);
        setReadSummary(sRes.data?.data);
      } catch (e) {
        setReadSummary(null);
      }

    } catch (err: any) {
      console.warn('Fetch campaign analytics failed:', err.message);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  const handleDeleteCampaign = async () => {
    if (!window.confirm(`CRITICAL WARNING: Are you sure you want to permanently delete Campaign ${campaignId} and all related messages from the server?`)) return;
    try {
      setIsLoading(true);
      const response = await api.delete(`${PROXY_BASE}/api/campaign/${campaignId}`);
      if (response.data?.success) {
        toast.success("Campaign deleted successfully");
        setCampaignStatus(null);
        setCampaignMessages([]);
        setCampaignAnalytics(null);
        setReadAnalytics(null);
        setReadSummary(null);
        fetchCampaigns();
        // Generate new random ID
        handleCampaignIdChange(String(Math.floor(Math.random() * 900000) + 100000));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete campaign");
    } finally {
      setIsLoading(false);
    }
  };

  // --- Number chip management (Staging UI helpers) ---
  const addNumber = (raw: string) => {
    const currentPhones = recipients.map(r => r.phone);
    const nums = raw
      .split(/[\n,\s;]+/)
      .map(n => n.trim().replace(/\D/g, ''))
      .filter(n => n.length >= 10 && !currentPhones.includes(n));
    if (nums.length > 0) {
      setRecipients(prev => [...prev, ...nums.map(n => ({ phone: n }))]);
    }
    setNumberInput('');
  };

  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (numberInput.trim()) addNumber(numberInput);
    }
    if (e.key === 'Backspace' && !numberInput && recipients.length > 0) {
      setRecipients(prev => prev.slice(0, -1));
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    addNumber(pasted);
  };

  const bulkNumbersFound = useMemo(() => {
    if (!bulkText.trim()) return [];
    return bulkText
      .split(/[\n,\s;]+/)
      .map(n => n.trim().replace(/\D/g, ''))
      .filter(n => n.length >= 10);
  }, [bulkText]);

  const handleAddBulkTextNumbers = () => {
    const uniqueFound = Array.from(new Set(bulkNumbersFound));
    const currentPhones = recipients.map(r => r.phone);
    const newNums = uniqueFound.filter(n => !currentPhones.includes(n));
    if (newNums.length > 0) {
      setRecipients(prev => [...prev, ...newNums.map(n => ({ phone: n }))]);
      toast.success(`Successfully added ${newNums.length} numbers (skipped ${uniqueFound.length - newNums.length} duplicates)`);
      setBulkText('');
    } else {
      toast.info("No new unique numbers were found in input");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    const nameLower = file.name.toLowerCase();
    const isExcel = nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls');
    const isCsv = nameLower.endsWith('.csv');
    const isTxt = nameLower.endsWith('.txt');

    if (isExcel) {
      reader.onload = (evt) => {
        try {
          const data = evt.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
          
          const rawHeaders = (json[0] || []) as any[];
          const headers = rawHeaders.map((h, idx) => h ? String(h).trim() : `Column ${idx + 1}`);
          const rows = json.slice(1).filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
          const isMultiColumn = headers.length > 1;

          if (isMultiColumn) {
            const phoneHeader = headers.find(h => /phone|mobile|number|contact|recipient/i.test(h)) || headers[0] || '';
            const initialMapping: Record<string, string> = { phone: phoneHeader };
            requiredVariables.forEach(v => {
              const matchedHeader = headers.find(h => h.toLowerCase() === v.toLowerCase()) || '';
              initialMapping[v] = matchedHeader;
            });
            
            setUploadedFile({ fileName: file.name, headers, rows });
            setColumnMapping(initialMapping);
            toast.info("Excel loaded. Please map the columns below.");
          } else {
            const foundNumbers: string[] = [];
            json.forEach((row: any) => {
              if (Array.isArray(row)) {
                row.forEach(cell => {
                  const cleaned = String(cell).trim().replace(/\D/g, '');
                  if (cleaned.length >= 10) {
                    foundNumbers.push(cleaned);
                  }
                });
              }
            });
            const uniqueNums = Array.from(new Set(foundNumbers));
            const currentPhones = recipients.map(r => r.phone);
            const newNums = uniqueNums.filter(n => !currentPhones.includes(n));
            if (newNums.length > 0) {
              setRecipients(prev => [...prev, ...newNums.map(n => ({ phone: n }))]);
              toast.success(`Loaded ${newNums.length} unique numbers from Excel.`);
            } else {
              toast.info("No new phone numbers found.");
            }
          }
        } catch (err) {
          toast.error("Failed to parse Excel file");
        }
      };
      reader.readAsBinaryString(file);
    } else if (isCsv) {
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
          const json = lines.map(line => {
            return line.split(',').map(cell => cell.replace(/^["']|["']$/g, '').trim());
          });

          const rawHeaders = (json[0] || []) as any[];
          const headers = rawHeaders.map((h, idx) => h ? String(h).trim() : `Column ${idx + 1}`);
          const rows = json.slice(1).filter(row => Array.isArray(row) && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
          const isMultiColumn = headers.length > 1;

          if (isMultiColumn) {
            const phoneHeader = headers.find(h => /phone|mobile|number|contact|recipient/i.test(h)) || headers[0] || '';
            const initialMapping: Record<string, string> = { phone: phoneHeader };
            requiredVariables.forEach(v => {
              const matchedHeader = headers.find(h => h.toLowerCase() === v.toLowerCase()) || '';
              initialMapping[v] = matchedHeader;
            });
            
            setUploadedFile({ fileName: file.name, headers, rows });
            setColumnMapping(initialMapping);
            toast.info("CSV loaded. Please map the columns below.");
          } else {
            const foundNumbers: string[] = [];
            json.forEach((row: any) => {
              if (Array.isArray(row)) {
                row.forEach(cell => {
                  const cleaned = String(cell).trim().replace(/\D/g, '');
                  if (cleaned.length >= 10) {
                    foundNumbers.push(cleaned);
                  }
                });
              }
            });
            const uniqueNums = Array.from(new Set(foundNumbers));
            const currentPhones = recipients.map(r => r.phone);
            const newNums = uniqueNums.filter(n => !currentPhones.includes(n));
            if (newNums.length > 0) {
              setRecipients(prev => [...prev, ...newNums.map(n => ({ phone: n }))]);
              toast.success(`Loaded ${newNums.length} unique numbers from CSV.`);
            } else {
              toast.info("No new phone numbers found.");
            }
          }
        } catch (err) {
          toast.error("Failed to parse CSV file");
        }
      };
      reader.readAsText(file);
    } else if (isTxt) {
      reader.onload = (evt) => {
        try {
          const text = evt.target?.result as string;
          const rawNums = text.split(/[\n\r,;\t\s]+/);
          const foundNumbers: string[] = [];
          rawNums.forEach(n => {
            const cleaned = n.trim().replace(/\D/g, '');
            if (cleaned.length >= 10) {
              foundNumbers.push(cleaned);
            }
          });

          const uniqueNums = Array.from(new Set(foundNumbers));
          const currentPhones = recipients.map(r => r.phone);
          const newNums = uniqueNums.filter(n => !currentPhones.includes(n));

          if (newNums.length > 0) {
            setRecipients(prev => [...prev, ...newNums.map(n => ({ phone: n }))]);
            toast.success(`Loaded ${newNums.length} unique numbers from TXT.`);
          } else {
            toast.info("No new phone numbers found.");
          }
        } catch (err) {
          toast.error("Failed to parse TXT file");
        }
      };
      reader.readAsText(file);
    } else {
      toast.error("Unsupported format. Please upload CSV, Excel or TXT");
    }
    e.target.value = '';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    toast.success("Campaign ID copied to clipboard!");
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // ════════════════════════════════════════════════════════════
  // RENDER UI
  // ════════════════════════════════════════════════════════════
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-1 max-h-[82vh] overflow-y-auto no-scrollbar">
      
      {/* ══════════════ LEFT: Multi-Tab Console Panel ══════════════ */}
      <div className="lg:col-span-8 flex flex-col space-y-4">
        
        {/* Global Active Campaign selector bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-muted/40 border rounded-xl shadow-inner">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-indigo-500" />
            <div>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Active Campaign</p>
              <div className="flex items-center gap-1">
                <span className="text-sm font-mono font-black text-primary">{campaignId}</span>
                <Badge variant={isCampaignCreated ? "default" : "secondary"} className="text-[8px] h-4">
                  {isCampaignCreated ? "Registered" : "Local Staging"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Switch Campaign:</Label>
            <select
              value={campaignId}
              onChange={e => handleCampaignIdChange(e.target.value)}
              className="text-xs font-mono font-bold bg-background border rounded-lg h-9 px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
            >
              <option value={campaignId}>{campaignId} (Current)</option>
              {campaigns.map((c, i) => {
                const idVal = String(c.campaign_id || c.id || c.campaignId);
                return idVal !== campaignId && (
                  <option key={i} value={idVal}>{idVal} - {c.campaign_name}</option>
                );
              })}
            </select>
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg" onClick={() => copyToClipboard(campaignId)}>
              {copiedId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Primary Tabs */}
        <Tabs defaultValue="session" className="w-full">
          <TabsList className="grid grid-cols-6 gap-1 bg-muted p-1 rounded-xl h-11 mb-4 shadow-sm">
            <TabsTrigger value="session" className="text-xs font-black rounded-lg gap-1.5 transition-all"><Zap className="w-3.5 h-3.5" /> Session</TabsTrigger>
            <TabsTrigger value="users" className="text-xs font-black rounded-lg gap-1.5 transition-all"><Users className="w-3.5 h-3.5" /> Users</TabsTrigger>
            <TabsTrigger value="templates" className="text-xs font-black rounded-lg gap-1.5 transition-all"><FileText className="w-3.5 h-3.5" /> Templates</TabsTrigger>
            <TabsTrigger value="campaigns" className="text-xs font-black rounded-lg gap-1.5 transition-all"><Plus className="w-3.5 h-3.5" /> Campaigns</TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs font-black rounded-lg gap-1.5 transition-all"><UserCheck className="w-3.5 h-3.5" /> Contacts</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs font-black rounded-lg gap-1.5 transition-all"><BarChart3 className="w-3.5 h-3.5" /> Reports</TabsTrigger>
          </TabsList>

          {/* ════════ TAB 1: SESSION & HEALTH (PHASES 0 & 1) ════════ */}
          <TabsContent value="session" className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Phase 0 Server Health Check indicators */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-border/60 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                      <Heart className={cn("w-5 h-5", healthStatus?.success && "animate-pulse")} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Server Health</p>
                      <p className="text-sm font-black flex items-center gap-1.5">
                        {healthStatus?.status === 'healthy' ? 'Healthy ✓' : 'Checking status...'}
                      </p>
                    </div>
                  </div>
                  {healthStatus?.uptime && (
                    <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">
                      Uptime: {Math.round(healthStatus.uptime)}s
                    </Badge>
                  )}
                </CardContent>
              </Card>

              <Card className="border border-border/60 hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                      <Database className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">Server Readiness</p>
                      <p className="text-sm font-black">
                        {readinessStatus?.database === 'connected' ? 'Database Connected' : 'Checking database...'}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={fetchHealthChecks} disabled={isLoadingHealth} className="h-8 px-2 rounded-lg">
                    <RefreshCw className={cn("w-3.5 h-3.5", isLoadingHealth && "animate-spin")} />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Connection Controller Card */}
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-foreground">WhatsApp Connection Control</h3>
                    <p className="text-[11px] text-muted-foreground">Scan the QR scanner below to register your device or logout.</p>
                  </div>
                  {connectionStatus === 'connected' ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1.5 h-6">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1.5 h-6">
                      <div className="w-2 h-2 rounded-full bg-red-300 animate-pulse" /> Disconnected
                    </Badge>
                  )}
                </div>

                {qrCode && (
                  <div className="flex flex-col items-center py-4 bg-muted/20 border border-dashed rounded-xl animate-in slide-in-from-top-3 duration-300">
                    <div className="p-3 bg-white rounded-2xl shadow-xl border mb-3">
                      <img 
                        src={qrCode.startsWith('data:') ? qrCode : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`} 
                        className="w-40 h-40 object-contain" alt="QR"
                      />
                    </div>
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" /> Scan QR with WhatsApp
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Settings → Linked Devices → Link Device</p>
                    <Button variant="ghost" size="sm" onClick={() => setQrCode(null)} className="mt-2 text-[10px] text-muted-foreground h-6">Hide QR Code</Button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <Button onClick={handleConnect} disabled={isLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 text-xs shadow-md transition-all hover:scale-[1.01] active:scale-[0.99]">
                    {activeAction === 'connect' ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <QrCode className="w-3.5 h-3.5 mr-2" />}
                    {qrCode ? 'Refresh QR' : 'Get QR Code'}
                  </Button>
                  <Button onClick={handleSyncStatus} disabled={isLoading} variant="outline" className="font-bold h-11 text-xs border-2 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all hover:scale-[1.01]">
                    {activeAction === 'sync' ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-2" />}
                    Sync Session
                  </Button>
                  <Button onClick={handleLogout} disabled={isLoading} variant="outline" className="font-bold h-11 text-xs border-2 border-red-200 text-red-600 hover:bg-red-50 transition-all hover:scale-[1.01]">
                    {activeAction === 'logout' ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <LogOut className="w-3.5 h-3.5 mr-2" />}
                    Logout Session
                  </Button>
                </div>

                <div className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg text-xs">
                  <span className="font-bold uppercase tracking-wider text-muted-foreground">Active Session ID</span>
                  <code className="font-mono font-black text-primary">{sessionName}</code>
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions List Table (API 1.2) */}
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-foreground">Active Server Sessions List</h3>
                  <Button variant="ghost" size="sm" className="h-8 font-bold gap-1" onClick={fetchActiveSessions} disabled={isLoadingSessions}>
                    <RefreshCw className={cn("w-3.5 h-3.5", isLoadingSessions && "animate-spin")} /> Refresh
                  </Button>
                </div>

                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b text-[10px] uppercase font-bold text-muted-foreground">
                        <th className="p-3">Session Name</th>
                        <th className="p-3">Phone Number</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {activeSessions.length > 0 ? (
                        activeSessions.map((s, i) => (
                          <tr key={i} className="hover:bg-muted/10">
                            <td className="p-3 font-mono font-bold">{s.sessionName || s.name || s.id}</td>
                            <td className="p-3 font-mono">{s.phoneNumber || s.number || 'N/A'}</td>
                            <td className="p-3">
                              <Badge className={cn("text-[9px] font-bold uppercase", 
                                (s.status === 'connected' || s.ready) ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                              )}>
                                {s.status || (s.ready ? 'connected' : 'connecting')}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={async () => {
                                  if (!window.confirm(`Logout session ${s.sessionName}?`)) return;
                                  try {
                                    await api.post(`${PROXY_BASE}/api/whatsapp/logout`, { sessionName: s.sessionName });
                                    toast.success("Session logged out");
                                    fetchActiveSessions();
                                  } catch (e) {
                                    toast.error("Logout failed");
                                  }
                                }}
                              >
                                Logout
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground italic">No active WhatsApp sessions registered.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ TAB 2: USER MANAGEMENT (PHASE 2) ════════ */}
          <TabsContent value="users" className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* User Creation Form */}
              <Card className="border border-border/60 md:col-span-1">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-foreground">Create User Account</h3>
                    <p className="text-[11px] text-muted-foreground">Register a new system user profile.</p>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Username</Label>
                      <Input
                        value={newUsername}
                        onChange={e => setNewUsername(e.target.value)}
                        placeholder="john_doe"
                        className="h-10 text-xs focus-visible:ring-primary"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Email Address</Label>
                      <Input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="h-10 text-xs focus-visible:ring-primary"
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full h-10 text-xs font-bold bg-primary hover:bg-primary/95 shadow-md">
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                      Register Account
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Users list table */}
              <Card className="border border-border/60 md:col-span-2">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-foreground">Registered System Users</h3>
                    <Button variant="ghost" size="sm" className="h-8 font-bold gap-1" onClick={fetchUsers} disabled={isLoadingUsers}>
                      <RefreshCw className={cn("w-3.5 h-3.5", isLoadingUsers && "animate-spin")} /> Refresh
                    </Button>
                  </div>

                  <div className="border rounded-xl overflow-hidden max-h-[350px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-muted/50 border-b text-[10px] uppercase font-bold text-muted-foreground sticky top-0">
                          <th className="p-3">User ID</th>
                          <th className="p-3">Username</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-xs">
                        {users.length > 0 ? (
                          users.map((u, i) => (
                            <tr key={i} className="hover:bg-muted/10">
                              <td className="p-3 font-mono font-bold text-primary">#{u.userId || u.id}</td>
                              <td className="p-3 font-semibold">{u.username}</td>
                              <td className="p-3 text-muted-foreground">{u.email}</td>
                              <td className="p-3 text-muted-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="p-12 text-center text-muted-foreground italic">No system users found.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

            </div>
          </TabsContent>

          {/* ════════ TAB 3: MESSAGE TEMPLATES (PHASE 3) ════════ */}
          <TabsContent value="templates" className="space-y-4 animate-in fade-in-50 duration-200">
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-foreground">Message Templates Library</h3>
                    <p className="text-[11px] text-muted-foreground">Configure dynamic messaging templates with custom variables.</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-9 text-xs font-bold text-primary gap-1" onClick={() => setShowCreateTemplate(!showCreateTemplate)}>
                    <Plus className="w-3.5 h-3.5" /> {showCreateTemplate ? 'Cancel Editor' : 'Create New Template'}
                  </Button>
                </div>

                {showCreateTemplate && (
                  <div className="p-4 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5 space-y-3 animate-in slide-in-from-top-2 duration-300">
                    <h4 className="text-xs font-black text-primary uppercase tracking-wider flex items-center gap-1.5"><Sparkles className="w-4 h-4" /> Save Template Builder</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-muted-foreground">Template Name</Label>
                        <Input value={newTemplate.template_name} onChange={e => setNewTemplate(p => ({ ...p, template_name: e.target.value }))} placeholder="Welcome Message" className="h-9 text-xs focus-visible:ring-primary" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold text-muted-foreground">Variables (Comma-separated)</Label>
                        <Input value={newTemplate.variables.join(', ')} onChange={e => setNewTemplate(p => ({ ...p, variables: e.target.value.split(',').map(s => s.trim()) }))} placeholder="customer_name, discount_rate" className="h-9 text-xs font-mono focus-visible:ring-primary" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-muted-foreground">Template Body Content</Label>
                      <Textarea value={newTemplate.template_content} onChange={e => setNewTemplate(p => ({ ...p, template_content: e.target.value }))} placeholder="Hello {{customer_name}}, you have a discount of {{discount_rate}}% valid today! 🎉" className="min-h-[70px] text-xs focus-visible:ring-primary" />
                    </div>
                    <Button onClick={handleSaveTemplate} disabled={isLoading} size="sm" className="w-full h-9 text-xs font-bold bg-primary hover:bg-primary/95 shadow-md">
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />} Save Template
                    </Button>
                  </div>
                )}

                {templates.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto no-scrollbar">
                    {templates.map(tpl => {
                      const tplId = String(tpl.id || tpl.template_id);
                      const isSelected = selectedTemplateId === tplId;
                      return (
                        <div key={tplId} className={cn(
                          "text-left p-3.5 rounded-xl border-2 transition-all flex flex-col justify-between gap-3 relative group",
                          isSelected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/50 hover:border-primary/30"
                        )}>
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black truncate">{tpl.template_name}</span>
                                <Badge variant="secondary" className="text-[8px] h-3.5 font-mono">ID:{tplId}</Badge>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1.5 bg-muted/40 p-2 rounded-lg font-mono line-clamp-3">{tpl.template_content}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button 
                                size="sm" 
                                variant={isSelected ? "default" : "outline"} 
                                className="h-7 text-[10px] font-bold"
                                onClick={() => setSelectedTemplateId(tplId)}
                              >
                                {isSelected ? "Active" : "Select"}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteTemplate(tpl.id || tpl.template_id || 0)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>

                          {tpl.variables && tpl.variables.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap pt-1.5 border-t border-dashed">
                              <span className="text-[8px] font-bold text-muted-foreground uppercase mr-1">Variables:</span>
                              {tpl.variables.map((v, i) => (
                                <Badge key={i} variant="outline" className="text-[8px] h-3.5 bg-blue-50/50 text-blue-700 border-blue-200">
                                  {`{{${v}}}`}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground border rounded-xl border-dashed">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-bold">No templates saved yet.</p>
                    <p className="text-[10px]">Create a new message template in the form above.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ TAB 4: CAMPAIGNS (PHASES 4 & 6) ════════ */}
          <TabsContent value="campaigns" className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Create Campaign form (Phase 4) */}
              <Card className="border border-border/60 md:col-span-1">
                <CardContent className="p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-foreground">Create Campaign Setup</h3>
                    <p className="text-[11px] text-muted-foreground">Setup a bulk broadcast list.</p>
                  </div>

                  <form onSubmit={handleCreateCampaign} className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Campaign Name</Label>
                      <Input
                        value={newCampaignName}
                        onChange={e => setNewCampaignName(e.target.value)}
                        placeholder="Spring Sale 2026"
                        className="h-10 text-xs focus-visible:ring-primary"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground">Description</Label>
                      <Textarea
                        value={newCampaignDesc}
                        onChange={e => setNewCampaignDesc(e.target.value)}
                        placeholder="Get 30% discount on all store items"
                        className="h-16 text-xs resize-none focus-visible:ring-primary"
                      />
                    </div>
                    <Button type="submit" disabled={isLoading} className="w-full h-10 text-xs font-bold bg-primary hover:bg-primary/95 shadow-md">
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-2" />}
                      Create Campaign
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Start/Trigger Campaign panel (Phase 6) */}
              <Card className="border border-border/60 md:col-span-2">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-black text-foreground">Start Campaign Dispatch</h3>
                      <p className="text-[11px] text-muted-foreground">Execute campaign messages using plain text or a saved template.</p>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px] border-amber-200 text-amber-700 bg-amber-50 h-5">
                      Active: #{campaignId}
                    </Badge>
                  </div>

                  <div className="space-y-3.5">
                    {/* Send Mode Toggle */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-muted rounded-lg text-xs font-bold">
                      <button onClick={() => setSendMode('text')} className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all",
                        sendMode === 'text' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}>
                        <MessageSquare className="w-3.5 h-3.5" /> Plain Text
                      </button>
                      <button onClick={() => setSendMode('template')} className={cn(
                        "flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all",
                        sendMode === 'template' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      )}>
                        <FileText className="w-3.5 h-3.5" /> Saved Template
                      </button>
                    </div>

                    {sendMode === 'text' ? (
                      <div className="space-y-1.5 animate-in fade-in-50 duration-200">
                        <Label className="text-xs font-bold text-muted-foreground">Plain Text Message Content</Label>
                        <Textarea
                          value={messageContent}
                          onChange={e => setMessageContent(e.target.value)}
                          className="min-h-[80px] text-xs resize-none"
                          placeholder="Check out our Spring Sale! Get 30% off now!"
                        />
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Chars: {messageContent.length}</span>
                          <span>Supported format: Unicode, emojis</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 animate-in fade-in-50 duration-200">
                        <Label className="text-xs font-bold text-muted-foreground">Select Active Saved Template</Label>
                        
                        {templates.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto no-scrollbar">
                            {templates.map(tpl => {
                              const tplId = String(tpl.id || tpl.template_id);
                              const isSelected = selectedTemplateId === tplId;
                              return (
                                <button
                                  key={tplId}
                                  type="button"
                                  onClick={() => setSelectedTemplateId(tplId)}
                                  className={cn(
                                    "p-2 rounded-lg border text-left flex items-start gap-2 text-xs",
                                    isSelected ? "border-primary bg-primary/5 font-semibold" : "border-border/60 hover:bg-muted/10"
                                  )}
                                >
                                  <div className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5", isSelected ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                                    {isSelected && <Check className="w-2 text-white" />}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-bold truncate">{tpl.template_name}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{tpl.template_content}</p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic p-3 text-center border rounded-lg">No templates saved yet. Create templates in the templates tab.</p>
                        )}
                      </div>
                    )}

                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-2.5 text-[10px] text-blue-800">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold uppercase tracking-wider mb-0.5">Ready to Dispatch</p>
                        <p>This action parses staged contacts and sends messages sequentially in the background. Close the modal or watch reports live.</p>
                      </div>
                    </div>

                    <div className="p-3 bg-muted/40 border border-dashed rounded-lg space-y-2 text-[11px] animate-in fade-in duration-300">
                      <p className="font-bold text-muted-foreground uppercase tracking-wider text-[9px] mb-1">Dispatch Summary Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-muted-foreground">Target Campaign:</span>
                          <p className="font-bold text-primary truncate">
                            {campaigns.find(c => String(c.campaign_id || c.id || c.campaignId) === campaignId)?.campaign_name || `Campaign #${campaignId}`}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Recipients:</span>
                          <p className="font-mono font-bold text-amber-700">{stagedContacts.length} numbers staged</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Message Mode:</span>
                          <p className="font-bold text-indigo-600">{sendMode === 'template' ? 'Saved Template' : 'Direct Plain Text'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Template Selected:</span>
                          <p className="font-bold text-emerald-600 truncate">
                            {sendMode === 'template' ? (selectedTemplate?.template_name || 'None selected') : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {stagedContacts.length > 0 && (
                        <div className="pt-2 border-t border-dashed">
                          <span className="text-muted-foreground">Recipients list preview:</span>
                          <div className="flex flex-wrap gap-1 mt-1 max-h-[38px] overflow-y-auto no-scrollbar">
                            {stagedContacts.slice(0, 6).map((sc, idx) => (
                              <Badge key={idx} variant="outline" className="text-[9px] font-mono py-0 px-1 bg-background text-muted-foreground h-4">
                                +{sc.number}
                              </Badge>
                            ))}
                            {stagedContacts.length > 6 && (
                              <Badge variant="outline" className="text-[9px] font-bold py-0 px-1 bg-indigo-50/50 text-indigo-600 border-indigo-200 h-4">
                                +{stagedContacts.length - 6} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handleStartCampaign}
                      disabled={isLoading || (sendMode === 'text' && !messageContent.trim()) || (sendMode === 'template' && !selectedTemplateId) || stagedContacts.length === 0}
                      className="w-full h-11 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg"
                    >
                      {activeAction === 'send' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Start Campaign Dispatch (202 Accepted)
                    </Button>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Campaigns database list (Phase 4.2) */}
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-foreground">Campaigns List History</h3>
                  <Button variant="ghost" size="sm" className="h-8 font-bold gap-1" onClick={fetchCampaigns} disabled={isLoadingCampaigns}>
                    <RefreshCw className={cn("w-3.5 h-3.5", isLoadingCampaigns && "animate-spin")} /> Refresh
                  </Button>
                </div>

                <div className="border rounded-xl overflow-hidden max-h-[250px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b text-[10px] uppercase font-bold text-muted-foreground sticky top-0">
                        <th className="p-3">Campaign ID</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Created</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {campaigns.length > 0 ? (
                        campaigns.map((c, i) => (
                          <tr key={i} className={cn("hover:bg-muted/10", String(c.campaign_id || c.id || c.campaignId) === campaignId && "bg-indigo-50/20")}>
                            <td className="p-3 font-mono font-bold">#{c.campaign_id || c.id || c.campaignId}</td>
                            <td className="p-3 font-semibold">{c.campaign_name}</td>
                            <td className="p-3 text-muted-foreground max-w-[200px] truncate">{c.campaign_description || 'No description'}</td>
                            <td className="p-3">
                              <Badge className={cn("text-[9px] font-bold uppercase", 
                                c.campaign_status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                c.campaign_status === 'in_progress' ? "bg-purple-50 text-purple-700 border-purple-200" :
                                "bg-amber-50 text-amber-700 border-amber-200"
                              )}>
                                {c.campaign_status || 'draft'}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant={String(c.campaign_id || c.id || c.campaignId) === campaignId ? "default" : "outline"}
                                className="h-6 text-[10px] font-bold"
                                onClick={() => handleCampaignIdChange(String(c.campaign_id || c.id || c.campaignId))}
                              >
                                {String(c.campaign_id || c.id || c.campaignId) === campaignId ? 'Active' : 'Activate'}
                              </Button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-muted-foreground italic">No campaigns registered.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ TAB 5: ADD CONTACTS (PHASE 5) ════════ */}
          <TabsContent value="contacts" className="space-y-4 animate-in fade-in-50 duration-200">
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-foreground">Stage campaign contacts (Phase 5)</h3>
                    <p className="text-[11px] text-muted-foreground">Upload and link phone numbers to active campaign <strong>#{campaignId}</strong>.</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono h-5">
                    Staged: {activeStagingCount} numbers
                  </Badge>
                </div>

                {/* Input Mode Tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setRecipientInputMode('chips')}
                    className={cn(
                      "py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5",
                      recipientInputMode === 'chips' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Phone className="w-3.5 h-3.5" /> Chip Tagging
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientInputMode('textarea')}
                    className={cn(
                      "py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5",
                      recipientInputMode === 'textarea' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" /> Bulk Paste
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientInputMode('upload')}
                    className={cn(
                      "py-1.5 rounded-md transition-all flex items-center justify-center gap-1.5",
                      recipientInputMode === 'upload' ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Upload className="w-3.5 h-3.5" /> File Scanner
                  </button>
                </div>

                {/* Mode 1: Chips Input */}
                {recipientInputMode === 'chips' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground">Phone Numbers Chip List</Label>
                    <div 
                      className="min-h-[100px] max-h-[180px] overflow-y-auto border rounded-xl p-2.5 bg-background cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1 transition-all"
                      onClick={() => numberInputRef.current?.focus()}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        {recipients.map((rec, i) => (
                          <div 
                            key={i} 
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-xs font-mono font-bold text-blue-800"
                          >
                            <Phone className="w-3 h-3 text-blue-400" />
                            {rec.phone}
                            {rec.variables && Object.keys(rec.variables).length > 0 && (
                              <span className="text-[9px] text-indigo-500 font-semibold ml-1">
                                ({Object.entries(rec.variables).map(([k, v]) => `${k}:${v}`).join(', ')})
                              </span>
                            )}
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setRecipients(prev => prev.filter(r => r.phone !== rec.phone)); }}
                              className="ml-1 w-3.5 h-3.5 rounded-full flex items-center justify-center hover:bg-red-100 text-blue-400 hover:text-red-500"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ))}
                        <input
                          ref={numberInputRef}
                          value={numberInput}
                          onChange={e => setNumberInput(e.target.value)}
                          onKeyDown={handleNumberKeyDown}
                          onPaste={handlePaste}
                          onBlur={() => { if (numberInput.trim()) addNumber(numberInput); }}
                          placeholder={recipients.length === 0 ? "Type number & press Enter..." : "Add more..."}
                          className="flex-1 min-w-[120px] border-0 bg-transparent text-xs font-mono outline-none p-1 placeholder:text-muted-foreground/50"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode 2: Bulk Textarea */}
                {recipientInputMode === 'textarea' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground">Paste Multi-line Numbers</Label>
                    <Textarea
                      value={bulkText}
                      onChange={e => setBulkText(e.target.value)}
                      className="min-h-[100px] text-xs font-mono resize-none focus-visible:ring-blue-500"
                      placeholder="919876543210&#10;+919999999999&#10;9876543212"
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">Found {bulkNumbersFound.length} valid numbers in text area</span>
                      <Button
                        type="button"
                        onClick={handleAddBulkTextNumbers}
                        disabled={bulkNumbersFound.length === 0}
                        size="sm"
                        className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Add to staging list
                      </Button>
                    </div>
                  </div>
                )}
                              {/* Mode 3: File Upload */}
                {recipientInputMode === 'upload' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-muted-foreground">Upload Contact Files</Label>
                    <div className="border-2 border-dashed border-muted-foreground/20 rounded-xl p-6 bg-muted/10 text-center hover:bg-muted/20 hover:border-blue-500/40 transition-all relative group">
                      <input 
                        type="file"
                        accept=".csv,.xlsx,.xls,.txt"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="w-8 h-8 mx-auto mb-1 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                      <p className="text-xs font-bold text-foreground">Click to upload or drag & drop</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Supports CSV, Excel (.xlsx, .xls) and TXT</p>
                    </div>
                  </div>
                )}

                {recipientInputMode === 'upload' && uploadedFile && (
                  <div className="p-4 border border-border bg-muted/25 rounded-xl space-y-3 mt-2 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-primary">
                        <FileText className="w-4 h-4" /> {uploadedFile.fileName} ({uploadedFile.rows.length} rows)
                      </span>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500 hover:text-red-700" onClick={() => setUploadedFile(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Target Template selector dropdown */}
                    <div className="space-y-1 pt-1.5 border-t border-dashed">
                      <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Select Target Template (Optional)</Label>
                      <select
                        value={selectedTemplateId}
                        onChange={e => {
                          setSelectedTemplateId(e.target.value);
                          setSendMode(e.target.value ? 'template' : 'text');
                        }}
                        className="w-full text-xs bg-background border rounded-lg h-9 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">-- No Template / Custom Plain Text --</option>
                        {templates.map((tpl, i) => (
                          <option key={i} value={String(tpl.id || tpl.template_id)}>
                            {tpl.template_name} ({getTemplateVarsCount(tpl)} variables)
                          </option>
                        ))}
                      </select>
                    </div>

                    {requiredVariables.length > 0 ? (
                      <div className="space-y-2.5 pt-2 border-t border-dashed">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Map Columns to Variables</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-[10px] font-bold text-muted-foreground">Phone Number Column (Required)</Label>
                            <select
                              value={columnMapping.phone || ''}
                              onChange={e => setColumnMapping(prev => ({ ...prev, phone: e.target.value }))}
                              className="w-full text-xs bg-background border rounded-lg h-9 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="">-- Select Column --</option>
                              {uploadedFile.headers.map((h, i) => (
                                <option key={i} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>

                          {requiredVariables.map((v, idx) => (
                            <div key={idx} className="space-y-1">
                              <Label className="text-[10px] font-bold text-muted-foreground">{`Variable {{${v}}}`}</Label>
                              <select
                                value={columnMapping[v] || ''}
                                onChange={e => setColumnMapping(prev => ({ ...prev, [v]: e.target.value }))}
                                className="w-full text-xs bg-background border rounded-lg h-9 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">-- Select Column --</option>
                                {uploadedFile.headers.map((h, i) => (
                                  <option key={i} value={h}>{h}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground italic bg-muted/50 p-2 rounded-lg leading-relaxed">
                        No placeholders like {"{{var}}"} detected. Select a template above or stage numbers only. The first column containing numbers will be staged.
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground italic bg-muted/50 p-2 rounded-lg leading-relaxed border-t border-dashed">
                      Configure your column mappings above. Click the primary button below to stage all contacts directly.
                    </p>
                  </div>
                )}

                <Button 
                  onClick={handleAddContacts} 
                  disabled={isLoading || (recipientInputMode === 'upload' ? !uploadedFile : recipients.length === 0)} 
                  className="w-full font-bold h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md transition-all hover:scale-[1.01]"
                >
                  {activeAction === 'stage' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}
                  {recipientInputMode === 'upload'
                    ? `Stage File Contacts (${uploadedFile ? uploadedFile.rows.length : 0}) to Campaign #${campaignId}`
                    : `Stage ${recipients.length} Contacts to Campaign #${campaignId}`
                  }
                </Button>
              </CardContent>
            </Card>

            {/* Staged contacts datatable */}
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-foreground">Staged Contacts for Campaign #{campaignId}</h3>
                    <Badge variant="outline" className="text-[10px]">{stagedContacts.length} staged</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-red-500 border-red-200 hover:bg-red-50" onClick={handleClearAllStaged} disabled={stagedContacts.length === 0}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Clear Staged List
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 font-bold gap-1" onClick={fetchStagedContacts} disabled={isLoadingStaged}>
                      <RefreshCw className={cn("w-3.5 h-3.5", isLoadingStaged && "animate-spin")} /> Refresh
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={stagedSearchTerm}
                    onChange={e => setStagedSearchTerm(e.target.value)}
                    placeholder="Search contacts list by number..."
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <div className="border rounded-xl overflow-hidden max-h-[280px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b text-[10px] uppercase font-bold text-muted-foreground sticky top-0">
                        <th className="p-3">Recipient Number</th>
                        <th className="p-3">Staged Name</th>
                        <th className="p-3">Staged Time</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {isLoadingStaged ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td>
                        </tr>
                      ) : stagedContacts.length > 0 ? (
                        stagedContacts
                          .filter(c => !stagedSearchTerm || c.number.includes(stagedSearchTerm) || (c.name && c.name.toLowerCase().includes(stagedSearchTerm.toLowerCase())))
                          .map((c, i) => (
                            <tr key={i} className="hover:bg-muted/10">
                              <td className="p-3 font-mono font-bold">+{c.number}</td>
                               <td className="p-3 text-muted-foreground font-semibold">
                                {c.name || 'N/A'}
                                {c.variables && Object.keys(c.variables).length > 0 && (
                                  <div className="text-[9px] text-indigo-500 font-mono mt-0.5 max-w-[200px] truncate" title={Object.entries(c.variables).map(([k, v]) => `${k}:${v}`).join(', ')}>
                                    {Object.entries(c.variables).map(([k, v]) => `${k}:${v}`).join(', ')}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-muted-foreground">{c.created_at ? new Date(c.created_at).toLocaleString() : 'N/A'}</td>
                              <td className="p-3">
                                <Badge className={cn("text-[9px] font-bold uppercase", 
                                  c.status === 'sent' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                  c.status === 'read' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  c.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                                  c.status === 'pending' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                )}>{c.status}</Badge>
                              </td>
                              <td className="p-3">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 text-[10px] text-red-500 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => handleDeleteStagedContact(c.number)}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-muted-foreground italic">No staged contacts in Campaign #{campaignId}.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ════════ TAB 6: REPORTS & ANALYTICS (PHASES 7, 8 & 9) ════════ */}
          <TabsContent value="reports" className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Phase 7 & 9 Analytics counters */}
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-foreground">Campaign Live status & analytics</h3>
                    <p className="text-[11px] text-muted-foreground">Monitor delivery rates, read status breakdowns, and performance metrics.</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold text-red-600 hover:bg-red-50 border-red-200" onClick={handleDeleteCampaign}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Campaign
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 font-bold gap-1" onClick={fetchCampaignAnalytics} disabled={isLoadingAnalytics}>
                      <RefreshCw className={cn("w-3.5 h-3.5", isLoadingAnalytics && "animate-spin")} /> Refresh Stats
                    </Button>
                  </div>
                </div>

                {campaignStatus && (
                  <div className="space-y-3">
                    {/* Progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-muted-foreground font-black">
                        <span>Campaign Completion Progress</span>
                        <span>{campaignStatus.completionPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden border">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${campaignStatus.completionPercentage || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* 7 columns counters */}
                    <div className="grid grid-cols-7 gap-1">
                      {[
                        { label: 'Staged', value: campaignStatus.local?.staged || 0, color: 'bg-amber-50 text-amber-700 border-amber-200' },
                        { label: 'Pending', value: Math.max(campaignStatus.local?.pending || 0, campaignStatus.remote?.pending || 0), color: 'bg-blue-50 text-blue-700 border-blue-200' },
                        { label: 'In Progress', value: Math.max(campaignStatus.local?.in_progress || 0, campaignStatus.remote?.in_progress || 0), color: 'bg-purple-50 text-purple-700 border-purple-200' },
                        { label: 'Sent', value: Math.max(campaignStatus.local?.sent || 0, campaignStatus.remote?.sent || 0), color: 'bg-sky-50 text-sky-700 border-sky-200' },
                        { label: 'Delivered', value: campaignStatus.remote?.delivered || 0, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        { label: 'Read', value: campaignStatus.remote?.read || 0, color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
                        { label: 'Failed', value: Math.max(campaignStatus.local?.failed || 0, campaignStatus.remote?.failed || 0), color: 'bg-red-50 text-red-700 border-red-200' },
                      ].map((s, i) => (
                        <div key={i} className={cn("flex flex-col items-center p-2 rounded-lg border text-center shadow-sm", s.color)}>
                          <span className="text-sm font-black">{s.value}</span>
                          <span className="text-[7.5px] font-black uppercase mt-0.5">{s.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Read rates statistics banner */}
                {(readSummary || readAnalytics) && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/40 border rounded-xl">
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Delivery Success Rate</p>
                      <p className="text-lg font-black text-emerald-600">{readSummary?.rates?.delivery_rate || readAnalytics?.read_breakdown?.read_percentage || 'N/A'}%</p>
                    </div>
                    <div className="text-center border-x">
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Message Read Rate</p>
                      <p className="text-lg font-black text-indigo-600">{readSummary?.rates?.read_rate || 'N/A'}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-muted-foreground uppercase font-black">Avg Read Delay</p>
                      <p className="text-lg font-black text-primary">{readAnalytics?.read_breakdown?.avg_read_time_seconds ? `${Math.round(readAnalytics.read_breakdown.avg_read_time_seconds)}s` : 'N/A'}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Message logs details table */}
            <Card className="border border-border/60">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-foreground">Message dispatch delivery logs</h3>
                  <Button variant="ghost" size="sm" className="h-8 font-bold gap-1" onClick={fetchCampaignMessages} disabled={isLoadingMessages}>
                    <RefreshCw className={cn("w-3.5 h-3.5", isLoadingMessages && "animate-spin")} /> Refresh Logs
                  </Button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={messageSearchTerm}
                    onChange={e => setMessageSearchTerm(e.target.value)}
                    placeholder="Search logs by phone number..."
                    className="pl-8 h-9 text-xs"
                  />
                </div>

                <div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto no-scrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b text-[10px] uppercase font-bold text-muted-foreground sticky top-0">
                        <th className="p-3">Recipient</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Sent Time</th>
                        <th className="p-3">Delivered Time</th>
                        <th className="p-3">Read Time</th>
                        <th className="p-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-xs">
                      {isLoadingMessages ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></td>
                        </tr>
                      ) : campaignMessages.length > 0 ? (
                        campaignMessages
                          .filter(m => !messageSearchTerm || (m.recipient_phone && m.recipient_phone.includes(messageSearchTerm)) || (m.recipient_name && m.recipient_name.toLowerCase().includes(messageSearchTerm.toLowerCase())))
                          .map((m, i) => {
                            const msgId = m.message_id || m.messageId || m.id;
                            const hasId = !!msgId;
                            const phone = m.recipient_phone || m.phone_number;
                            const isRead = m.status === 'read' || m.is_read === true;
                            return (
                              <tr key={i} className="hover:bg-muted/10">
                                <td className="p-3 font-mono font-bold">{phone ? `+${phone}` : (m.recipient_name || 'Queued Recipient')}</td>
                                <td className="p-3">
                                  <Badge className={cn("text-[9px] font-bold uppercase", 
                                    isRead ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                    m.status === 'delivered' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    m.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                                    'bg-blue-50 text-blue-700 border-blue-200'
                                  )}>{m.status || (isRead ? 'read' : 'sent/pending')}</Badge>
                                </td>
                                <td className="p-3 text-muted-foreground font-mono">{m.sent_at ? new Date(m.sent_at).toLocaleTimeString() : '-'}</td>
                                <td className="p-3 text-muted-foreground font-mono">{m.delivered_at ? new Date(m.delivered_at).toLocaleTimeString() : '-'}</td>
                                <td className="p-3 text-muted-foreground font-mono">{m.read_at ? new Date(m.read_at).toLocaleTimeString() : '-'}</td>
                                <td className="p-3">
                                  {hasId ? (
                                    <div className="flex items-center gap-1">
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        className="h-6 text-[10px] text-primary hover:bg-primary/5 gap-0.5"
                                        onClick={() => handleInspectMessage(msgId)}
                                      >
                                        <Eye className="w-3 h-3" /> Inspect
                                      </Button>
                                      {!isRead && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="h-6 text-[10px] text-emerald-600 hover:bg-emerald-50"
                                          onClick={() => handleMarkMessageAsRead(msgId, phone)}
                                          title="Manually override as Read"
                                        >
                                          Mark Read
                                        </Button>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                                      <Clock className="w-3 h-3 animate-pulse" /> Queueing...
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-10 text-center text-muted-foreground italic">No message status records found. Trigger campaign first.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Console Global API Logger banner */}
        {lastResult && (
          <div className={cn(
            "flex items-center gap-2.5 p-3 rounded-xl border animate-in slide-in-from-bottom-2 duration-300",
            lastResult.type === 'success' ? "bg-emerald-50/70 border-emerald-200 text-emerald-800" : "bg-red-50/70 border-red-200 text-red-800"
          )}>
            {lastResult.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <CircleDot className="w-4 h-4 text-red-600 shrink-0" />}
            <p className="text-xs font-semibold flex-1 leading-normal">{lastResult.message}</p>
            <button className="text-lg leading-none opacity-50 hover:opacity-100" onClick={() => setLastResult(null)}>×</button>
          </div>
        )}

      </div>

      {/* ══════════════ RIGHT: Live Phone Preview Panel ══════════════ */}
      <div className="lg:col-span-4 flex flex-col items-center">
        <div className="sticky top-0">
          <div className="text-center mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5" /> Interactive Phone Preview
            </p>
          </div>

          {/* Phone Frame */}
          <div className="w-[280px] h-[520px] bg-black rounded-[36px] p-[8px] shadow-2xl relative border-4 border-muted/80">
            {/* Camera notch */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[22px] bg-black rounded-b-2xl z-20" />
            
            {/* WhatsApp Interface Screen */}
            <div className="w-full h-full bg-[#0b141a] rounded-[28px] overflow-hidden flex flex-col">
              
              {/* Top notch icons */}
              <div className="flex items-center justify-between px-5 pt-2.5 pb-1 text-white/70">
                <span className="text-[10px] font-bold">{currentTime}</span>
                <div className="flex items-center gap-1.5">
                  <Signal className="w-3 h-3" />
                  <Wifi className="w-3 h-3" />
                  <Battery className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Chat header banner */}
              <div className="flex items-center gap-2.5 px-3 py-2 bg-[#1f2c34]">
                <ChevronLeft className="w-5 h-5 text-[#00a884] shrink-0" />
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00a884] to-[#075e54] flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {(channel.name || 'P')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-white truncate">{channel.name || 'Proero WhatsApp'}</p>
                  <p className="text-[10px] text-[#8696a0]">
                    {activeStagingCount > 0 
                      ? `${activeStagingCount} number${activeStagingCount > 1 ? 's' : ''} staging`
                      : 'Active Connection'
                    }
                  </p>
                </div>
                <MoreVertical className="w-4 h-4 text-[#8696a0]" />
              </div>

              {/* Chat Messages flow body */}
              <div 
                className="flex-1 px-3 py-3 overflow-y-auto no-scrollbar"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}
              >
                <div className="flex justify-center mb-3">
                  <span className="px-3 py-1 rounded-lg bg-[#182229] text-[9px] text-[#8696a0] font-medium shadow-sm uppercase tracking-wider">
                    Today
                  </span>
                </div>

                {activeStagingCount > 0 && (
                  <div className="flex justify-center mb-3">
                    <div className="px-3 py-1.5 rounded-lg bg-[#182229]/90 text-[9.5px] text-[#ffd279] font-medium max-w-[200px] text-center border border-[#ffd279]/20 shadow-lg">
                      📤 staging {activeStagingCount} number{activeStagingCount > 1 ? 's' : ''} to Campaign
                    </div>
                  </div>
                )}

                {/* Sent Bubble */}
                <div className="flex justify-end mb-2">
                  <div className={cn(
                    "max-w-[85%] rounded-xl rounded-tr-sm px-3 py-2 shadow-sm relative",
                    (messageContent || selectedTemplate) 
                      ? "bg-[#005c4b]" 
                      : "bg-[#1d2b33] border border-[#2a3942]"
                  )}>
                    <p className={cn(
                      "text-[12.5px] leading-relaxed break-words whitespace-pre-wrap",
                      (messageContent || selectedTemplate) ? "text-[#e9edef]" : "text-[#8696a0] italic"
                    )}>
                      {previewMessage}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[9px] text-[#ffffff99]">{currentTime}</span>
                      <CheckCircle2 className="w-3 h-3 text-[#53bdeb]" />
                    </div>
                  </div>
                </div>

                {/* Recipient list bubbles preview */}
                {activePreviewRecipients.length > 0 && activePreviewRecipients.map((rec, i) => (
                  <div key={i} className="flex justify-start mb-1.5 animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="max-w-[70%] rounded-xl rounded-tl-sm px-3 py-1.5 bg-[#1f2c34] shadow-sm">
                      <p className="text-[10px] text-[#8696a0] font-mono">
                        📱 +{rec.phone}
                      </p>
                      {rec.variables && Object.keys(rec.variables).length > 0 && (
                        <p className="text-[8.5px] text-[#ffd279] font-mono truncate mt-0.5">
                          {Object.entries(rec.variables).map(([k, v]) => `${k}:${v}`).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {activeStagingCount > 2 && (
                  <div className="flex justify-start mb-2">
                    <div className="px-3 py-1 rounded-xl bg-[#1f2c34] shadow-sm">
                      <p className="text-[10px] text-[#8696a0]">+{activeStagingCount - 2} more recipients staged...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom typing bar */}
              <div className="px-2 py-2 flex items-center gap-2 bg-[#1f2c34]">
                <div className="flex-1 flex items-center gap-2 bg-[#2a3942] rounded-full px-3 py-2">
                  <Smile className="w-4 h-4 text-[#8696a0] shrink-0" />
                  <span className="text-[11px] text-[#8696a0] flex-1 truncate">
                    {sendMode === 'template' ? '📋 Saved Template active' : (messageContent ? messageContent.slice(0, 30) + '...' : 'Type a message')}
                  </span>
                  <Paperclip className="w-4 h-4 text-[#8696a0] shrink-0" />
                  <Camera className="w-4 h-4 text-[#8696a0] shrink-0" />
                </div>
                <div className="w-9 h-9 rounded-full bg-[#00a884] flex items-center justify-center shadow-md shrink-0">
                  {activeStagingCount > 0 && (messageContent || selectedTemplate) 
                    ? <Send className="w-4 h-4 text-white" />
                    : <Mic className="w-4 h-4 text-white" />
                  }
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mt-3 opacity-40">
            <Zap className="w-3 h-3" />
            <span className="text-[9px] font-bold uppercase tracking-widest">Developer Console Interface</span>
          </div>
        </div>
      </div>

      {/* ══════════════ DIALOG: Message Status Detail Inspector (Phase 8) ══════════════ */}
      <Dialog open={showMsgDetailsModal} onOpenChange={setShowMsgDetailsModal}>
        <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-500" />
              Message Delivery & Read Inspector
            </DialogTitle>
            <DialogDescription className="text-xs">
              Deep-dive metrics and logs for individual message status records on the Baileys server.
            </DialogDescription>
          </DialogHeader>

          {isLoadingMsgDetails ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-xs text-muted-foreground">Fetching complete delivery logs from remote host...</p>
            </div>
          ) : selectedMessage ? (
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 py-3 pr-1 text-xs">
              
              {/* Main metrics */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-xl border">
                <div>
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Message Server ID</p>
                  <p className="font-mono font-bold truncate mt-0.5">{selectedMessage.message_id}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Recipient Number</p>
                  <p className="font-mono font-bold truncate mt-0.5">+{selectedMessage.recipient_phone}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Delivery Status</p>
                  <Badge className={cn("text-[9px] font-bold uppercase mt-0.5", 
                    selectedMessage.status === 'read' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                    selectedMessage.status === 'delivered' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                    selectedMessage.status === 'failed' ? 'bg-red-100 text-red-700 border-red-200' :
                    'bg-blue-100 text-blue-700 border-blue-200'
                  )}>{selectedMessage.status}</Badge>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase text-muted-foreground">Retries Attempted</p>
                  <p className="font-bold mt-0.5">{selectedMessage.retry_count ?? 0} attempts</p>
                </div>
              </div>

              {/* Message content */}
              <div className="space-y-1">
                <p className="text-[9px] font-black uppercase text-muted-foreground">Dispatched Message Content Body</p>
                <div className="p-3 bg-[#1e293b] text-slate-100 rounded-xl font-mono text-[11px] leading-relaxed break-words whitespace-pre-wrap">
                  {selectedMessage.message_content || 'No message content body returned'}
                </div>
              </div>

              {/* Error messages if failed */}
              {selectedMessage.error_message && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold uppercase tracking-wider text-[9px]">Server Failure Message</p>
                    <p className="mt-0.5">{selectedMessage.error_message}</p>
                  </div>
                </div>
              )}

              {/* Read history timeline (API 8.5) */}
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1"><History className="w-3.5 h-3.5" /> Status Changes Timeline (History)</p>
                <div className="border rounded-xl p-3 bg-muted/20 space-y-3">
                  {messageHistory.length > 0 ? (
                    <div className="relative pl-4 border-l border-muted-foreground/30 space-y-3">
                      {messageHistory.map((h, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-background" />
                          <p className="font-bold uppercase text-[9px] text-primary">{h.status}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{h.timestamp ? new Date(h.timestamp).toLocaleString() : 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="italic text-muted-foreground text-center py-2">No history timeline events registered.</p>
                  )}
                </div>
              </div>

              {/* Read users list (API 8.3) */}
              {messageReadUsers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1"><UserCheck className="w-3.5 h-3.5" /> Users Who Opened Message</p>
                  <div className="border rounded-xl p-2.5 bg-emerald-50/20 divide-y">
                    {messageReadUsers.map((ru, idx) => (
                      <div key={idx} className="flex justify-between py-1.5 text-[10px]">
                        <span className="font-mono font-bold">+{ru.phone_number}</span>
                        <span className="text-muted-foreground">Opened at: {ru.read_at ? new Date(ru.read_at).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pending users list (API 8.4) */}
              {messagePendingUsers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Pending Read Recipients</p>
                  <div className="border rounded-xl p-2.5 bg-blue-50/20 divide-y">
                    {messagePendingUsers.map((pu, idx) => (
                      <div key={idx} className="flex justify-between py-1.5 text-[10px]">
                        <span className="font-mono font-bold">+{pu.phone_number}</span>
                        <span className="text-muted-foreground">Delivered at: {pu.delivered_at ? new Date(pu.delivered_at).toLocaleTimeString() : 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Failed to inspect message details.</p>
          )}

          <DialogFooter className="border-t pt-3 flex gap-2 justify-between">
            {selectedMessage && selectedMessage.status !== 'read' && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 font-bold"
                onClick={() => handleMarkMessageAsRead(selectedMessage.message_id || selectedMessage.messageId || selectedMessage.id, selectedMessage.recipient_phone || selectedMessage.phone_number)}
              >
                Manual Override Read Status ✓
              </Button>
            )}
            <Button size="sm" variant="ghost" className="font-bold ml-auto" onClick={() => setShowMsgDetailsModal(false)}>Close Inspector</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
