// Mock data for Super Admin - Platform Owner View

export interface Client {
  id: string;
  name: string;
  domain: string;
  apiBaseUrl: string;
  planId: string;
  planName: string;
  creditsUsed: number;
  creditsAvailable: number;
  channelsEnabled: ('whatsapp' | 'rcs' | 'sms')[];
  status: 'active' | 'suspended' | 'pending' | 'trial';
  createdAt: string;
  contactEmail: string;
  contactPhone: string;
  totalMessages: number;
  activeUsers: number;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  monthlyCredits: number;
  channelsAllowed: string[];
  automationLimit: number;
  campaignLimit: number;
  apiAccess: boolean;
  status: 'active' | 'inactive';
  clientCount: number;
}

export interface Reseller {
  id: string;
  name: string;
  email: string;
  phone: string;
  clientsManaged: number;
  commissionPercent: number;
  revenueGenerated: number;
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  payoutPending: number;
}

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  signups: number;
  activeClients: number;
  commissionEarned: number;
  payoutStatus: 'pending' | 'paid' | 'processing';
  createdAt: string;
}

export interface WalletTransaction {
  id: string;
  type: 'purchase' | 'deduction' | 'refund' | 'adjustment';
  clientId: string;
  clientName: string;
  amount: number;
  credits: number;
  description: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface SystemLog {
  id: string;
  type: 'login' | 'api' | 'credit' | 'admin_action' | 'error';
  action: string;
  userId?: string;
  userName?: string;
  clientId?: string;
  clientName?: string;
  ipAddress: string;
  details: string;
  createdAt: string;
  severity: 'info' | 'warning' | 'error';
}

export interface GlobalChat {
  id: string;
  clientId: string;
  clientName: string;
  customerName: string;
  customerPhone: string;
  channel: 'whatsapp' | 'rcs' | 'sms';
  status: 'open' | 'closed' | 'pending';
  lastMessage: string;
  automationTriggered: boolean;
  creditsDeducted: number;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    sender: 'customer' | 'agent' | 'bot';
    content: string;
    timestamp: string;
  }[];
}

export interface GlobalCampaign {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  channel: 'whatsapp' | 'rcs' | 'sms';
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  messagesSent: number;
  creditsUsed: number;
  deliveryRate: number;
  createdAt: string;
  scheduledAt?: string;
}

export interface RolePermission {
  feature: string;
  admin: boolean;
  manager: boolean;
  agent: boolean;
}

// Mock Clients
export const mockClients: Client[] = [
  {
    id: 'client-1',
    name: 'TechCorp Solutions',
    domain: 'techcorp.com',
    apiBaseUrl: 'https://api.techcorp.com',
    planId: 'plan-3',
    planName: 'Enterprise',
    creditsUsed: 45000,
    creditsAvailable: 55000,
    channelsEnabled: ['whatsapp', 'rcs', 'sms'],
    status: 'active',
    createdAt: '2024-01-15',
    contactEmail: 'admin@techcorp.com',
    contactPhone: '+1234567890',
    totalMessages: 125000,
    activeUsers: 45,
  },
  {
    id: 'client-2',
    name: 'RetailMax',
    domain: 'retailmax.io',
    apiBaseUrl: 'https://api.retailmax.io',
    planId: 'plan-2',
    planName: 'Professional',
    creditsUsed: 18000,
    creditsAvailable: 12000,
    channelsEnabled: ['whatsapp', 'sms'],
    status: 'active',
    createdAt: '2024-02-20',
    contactEmail: 'support@retailmax.io',
    contactPhone: '+1987654321',
    totalMessages: 67000,
    activeUsers: 22,
  },
  {
    id: 'client-3',
    name: 'HealthFirst Clinic',
    domain: 'healthfirst.com',
    apiBaseUrl: 'https://api.healthfirst.com',
    planId: 'plan-2',
    planName: 'Professional',
    creditsUsed: 8500,
    creditsAvailable: 21500,
    channelsEnabled: ['whatsapp', 'sms'],
    status: 'active',
    createdAt: '2024-03-10',
    contactEmail: 'it@healthfirst.com',
    contactPhone: '+1122334455',
    totalMessages: 34000,
    activeUsers: 15,
  },
  {
    id: 'client-4',
    name: 'EduLearn Academy',
    domain: 'edulearn.edu',
    apiBaseUrl: 'https://api.edulearn.edu',
    planId: 'plan-1',
    planName: 'Starter',
    creditsUsed: 4200,
    creditsAvailable: 800,
    channelsEnabled: ['whatsapp', 'sms'],
    status: 'trial',
    createdAt: '2024-06-01',
    contactEmail: 'admin@edulearn.edu',
    contactPhone: '+1555666777',
    totalMessages: 8500,
    activeUsers: 8,
  },
  {
    id: 'client-5',
    name: 'FoodieDelight',
    domain: 'foodiedelight.com',
    apiBaseUrl: 'https://api.foodiedelight.com',
    planId: 'plan-2',
    planName: 'Professional',
    creditsUsed: 22000,
    creditsAvailable: 8000,
    channelsEnabled: ['whatsapp', 'rcs'],
    status: 'active',
    createdAt: '2024-04-15',
    contactEmail: 'marketing@foodiedelight.com',
    contactPhone: '+1777888999',
    totalMessages: 89000,
    activeUsers: 30,
  },
  {
    id: 'client-6',
    name: 'AutoDrive Motors',
    domain: 'autodrive.com',
    apiBaseUrl: 'https://api.autodrive.com',
    planId: 'plan-3',
    planName: 'Enterprise',
    creditsUsed: 67000,
    creditsAvailable: 33000,
    channelsEnabled: ['whatsapp', 'rcs', 'sms'],
    status: 'active',
    createdAt: '2024-01-05',
    contactEmail: 'digital@autodrive.com',
    contactPhone: '+1999000111',
    totalMessages: 210000,
    activeUsers: 65,
  },
  {
    id: 'client-7',
    name: 'TravelWise',
    domain: 'travelwise.io',
    apiBaseUrl: 'https://api.travelwise.io',
    planId: 'plan-1',
    planName: 'Starter',
    creditsUsed: 0,
    creditsAvailable: 5000,
    channelsEnabled: ['whatsapp'],
    status: 'suspended',
    createdAt: '2024-05-20',
    contactEmail: 'info@travelwise.io',
    contactPhone: '+1444555666',
    totalMessages: 2500,
    activeUsers: 3,
  },
];

// Mock Plans
export const mockPlans: Plan[] = [
  {
    id: 'plan-1',
    name: 'Starter',
    price: 49,
    monthlyCredits: 5000,
    channelsAllowed: ['whatsapp', 'sms'],
    automationLimit: 5,
    campaignLimit: 10,
    apiAccess: false,
    status: 'active',
    clientCount: 45,
  },
  {
    id: 'plan-2',
    name: 'Professional',
    price: 149,
    monthlyCredits: 30000,
    channelsAllowed: ['whatsapp', 'rcs', 'sms'],
    automationLimit: 25,
    campaignLimit: 50,
    apiAccess: true,
    status: 'active',
    clientCount: 128,
  },
  {
    id: 'plan-3',
    name: 'Enterprise',
    price: 499,
    monthlyCredits: 100000,
    channelsAllowed: ['whatsapp', 'rcs', 'sms'],
    automationLimit: -1, // unlimited
    campaignLimit: -1, // unlimited
    apiAccess: true,
    status: 'active',
    clientCount: 34,
  },
  {
    id: 'plan-4',
    name: 'Legacy Basic',
    price: 29,
    monthlyCredits: 2000,
    channelsAllowed: ['sms'],
    automationLimit: 2,
    campaignLimit: 5,
    apiAccess: false,
    status: 'inactive',
    clientCount: 12,
  },
];

// Mock Resellers
export const mockResellers: Reseller[] = [
  {
    id: 'reseller-1',
    name: 'Digital Partners Inc',
    email: 'sales@digitalpartners.com',
    phone: '+1234567890',
    clientsManaged: 24,
    commissionPercent: 15,
    revenueGenerated: 45600,
    status: 'active',
    createdAt: '2024-01-10',
    payoutPending: 6840,
  },
  {
    id: 'reseller-2',
    name: 'CloudFirst Solutions',
    email: 'partner@cloudfirst.io',
    phone: '+1987654321',
    clientsManaged: 18,
    commissionPercent: 12,
    revenueGenerated: 32400,
    status: 'active',
    createdAt: '2024-02-15',
    payoutPending: 3888,
  },
  {
    id: 'reseller-3',
    name: 'TechBridge Agency',
    email: 'business@techbridge.com',
    phone: '+1555666777',
    clientsManaged: 8,
    commissionPercent: 10,
    revenueGenerated: 12800,
    status: 'pending',
    createdAt: '2024-06-01',
    payoutPending: 1280,
  },
];

// Mock Affiliates
export const mockAffiliates: Affiliate[] = [
  {
    id: 'affiliate-1',
    name: 'John Marketing',
    email: 'john@marketing.com',
    referralCode: 'JOHN2024',
    signups: 156,
    activeClients: 89,
    commissionEarned: 12450,
    payoutStatus: 'paid',
    createdAt: '2024-01-05',
  },
  {
    id: 'affiliate-2',
    name: 'Sarah Tech Blog',
    email: 'sarah@techblog.io',
    referralCode: 'SARAH50',
    signups: 234,
    activeClients: 145,
    commissionEarned: 18900,
    payoutStatus: 'pending',
    createdAt: '2024-02-10',
  },
  {
    id: 'affiliate-3',
    name: 'Mike Reviews',
    email: 'mike@reviews.com',
    referralCode: 'MIKE100',
    signups: 67,
    activeClients: 34,
    commissionEarned: 4560,
    payoutStatus: 'processing',
    createdAt: '2024-04-20',
  },
];

// Mock Wallet Transactions
export const mockWalletTransactions: WalletTransaction[] = [
  {
    id: 'txn-1',
    type: 'purchase',
    clientId: 'client-1',
    clientName: 'TechCorp Solutions',
    amount: 499,
    credits: 100000,
    description: 'Enterprise Plan - Monthly Credits',
    createdAt: '2024-06-15T10:30:00',
    status: 'completed',
  },
  {
    id: 'txn-2',
    type: 'deduction',
    clientId: 'client-2',
    clientName: 'RetailMax',
    amount: 0,
    credits: -1500,
    description: 'Campaign: Summer Sale - WhatsApp',
    createdAt: '2024-06-15T09:15:00',
    status: 'completed',
  },
  {
    id: 'txn-3',
    type: 'refund',
    clientId: 'client-4',
    clientName: 'EduLearn Academy',
    amount: 25,
    credits: 500,
    description: 'Failed delivery refund',
    createdAt: '2024-06-14T16:45:00',
    status: 'completed',
  },
  {
    id: 'txn-4',
    type: 'adjustment',
    clientId: 'client-6',
    clientName: 'AutoDrive Motors',
    amount: 0,
    credits: 5000,
    description: 'Promotional bonus credits',
    createdAt: '2024-06-14T14:00:00',
    status: 'completed',
  },
  {
    id: 'txn-5',
    type: 'purchase',
    clientId: 'client-5',
    clientName: 'FoodieDelight',
    amount: 149,
    credits: 30000,
    description: 'Professional Plan - Monthly Credits',
    createdAt: '2024-06-14T11:20:00',
    status: 'completed',
  },
];

// Mock System Logs
export const mockSystemLogs: SystemLog[] = [
  {
    id: 'log-1',
    type: 'login',
    action: 'User Login',
    userId: 'user-123',
    userName: 'admin@techcorp.com',
    clientId: 'client-1',
    clientName: 'TechCorp Solutions',
    ipAddress: '192.168.1.100',
    details: 'Successful login from Chrome/Windows',
    createdAt: '2024-06-15T10:45:00',
    severity: 'info',
  },
  {
    id: 'log-2',
    type: 'api',
    action: 'API Rate Limit',
    clientId: 'client-2',
    clientName: 'RetailMax',
    ipAddress: '10.0.0.50',
    details: 'Rate limit exceeded: 1000 requests/minute',
    createdAt: '2024-06-15T10:30:00',
    severity: 'warning',
  },
  {
    id: 'log-3',
    type: 'credit',
    action: 'Credit Deduction',
    clientId: 'client-5',
    clientName: 'FoodieDelight',
    ipAddress: 'system',
    details: 'Campaign "Weekend Special" - 2500 credits deducted',
    createdAt: '2024-06-15T10:15:00',
    severity: 'info',
  },
  {
    id: 'log-4',
    type: 'admin_action',
    action: 'Client Suspended',
    userId: 'super-admin',
    userName: 'Super Admin',
    clientId: 'client-7',
    clientName: 'TravelWise',
    ipAddress: '192.168.1.1',
    details: 'Account suspended due to payment failure',
    createdAt: '2024-06-15T09:00:00',
    severity: 'warning',
  },
  {
    id: 'log-5',
    type: 'error',
    action: 'Message Delivery Failed',
    clientId: 'client-3',
    clientName: 'HealthFirst Clinic',
    ipAddress: 'system',
    details: 'WhatsApp API error: Invalid phone number format',
    createdAt: '2024-06-15T08:45:00',
    severity: 'error',
  },
];

// Mock Global Chats
export const mockGlobalChats: GlobalChat[] = [
  {
    id: 'gchat-1',
    clientId: 'client-1',
    clientName: 'TechCorp Solutions',
    customerName: 'Alice Johnson',
    customerPhone: '+1234567001',
    channel: 'whatsapp',
    status: 'open',
    lastMessage: 'I need help with my order #12345',
    automationTriggered: true,
    creditsDeducted: 12,
    createdAt: '2024-06-15T10:30:00',
    updatedAt: '2024-06-15T10:45:00',
    messages: [
      { id: 'm1', sender: 'customer', content: 'Hi, I need help with my order #12345', timestamp: '2024-06-15T10:30:00' },
      { id: 'm2', sender: 'bot', content: 'Hello! I can help you with that. Let me look up your order.', timestamp: '2024-06-15T10:30:15' },
      { id: 'm3', sender: 'customer', content: 'Thank you!', timestamp: '2024-06-15T10:31:00' },
      { id: 'm4', sender: 'agent', content: 'Hi Alice, I see your order is currently in transit. Expected delivery is tomorrow.', timestamp: '2024-06-15T10:35:00' },
    ],
  },
  {
    id: 'gchat-2',
    clientId: 'client-2',
    clientName: 'RetailMax',
    customerName: 'Bob Smith',
    customerPhone: '+1234567002',
    channel: 'sms',
    status: 'closed',
    lastMessage: 'Thanks for the refund confirmation',
    automationTriggered: false,
    creditsDeducted: 8,
    createdAt: '2024-06-15T09:00:00',
    updatedAt: '2024-06-15T09:30:00',
    messages: [
      { id: 'm1', sender: 'customer', content: 'I want to return my purchase', timestamp: '2024-06-15T09:00:00' },
      { id: 'm2', sender: 'agent', content: 'Sure, I can help you process a return. What is your order number?', timestamp: '2024-06-15T09:05:00' },
      { id: 'm3', sender: 'customer', content: 'Order #67890', timestamp: '2024-06-15T09:10:00' },
      { id: 'm4', sender: 'agent', content: 'Refund processed. You will receive the amount in 3-5 business days.', timestamp: '2024-06-15T09:25:00' },
      { id: 'm5', sender: 'customer', content: 'Thanks for the refund confirmation', timestamp: '2024-06-15T09:30:00' },
    ],
  },
  {
    id: 'gchat-3',
    clientId: 'client-5',
    clientName: 'FoodieDelight',
    customerName: 'Carol Davis',
    customerPhone: '+1234567003',
    channel: 'whatsapp',
    status: 'pending',
    lastMessage: 'Can you recommend something vegetarian?',
    automationTriggered: true,
    creditsDeducted: 6,
    createdAt: '2024-06-15T11:00:00',
    updatedAt: '2024-06-15T11:15:00',
    messages: [
      { id: 'm1', sender: 'customer', content: 'Hi! What are your specials today?', timestamp: '2024-06-15T11:00:00' },
      { id: 'm2', sender: 'bot', content: 'Welcome to FoodieDelight! Today we have: 1. Grilled Salmon, 2. Pasta Primavera, 3. BBQ Ribs', timestamp: '2024-06-15T11:00:30' },
      { id: 'm3', sender: 'customer', content: 'Can you recommend something vegetarian?', timestamp: '2024-06-15T11:15:00' },
    ],
  },
];

// Mock Global Campaigns
export const mockGlobalCampaigns: GlobalCampaign[] = [
  {
    id: 'gcampaign-1',
    name: 'Summer Sale 2024',
    clientId: 'client-1',
    clientName: 'TechCorp Solutions',
    channel: 'whatsapp',
    status: 'running',
    messagesSent: 45000,
    creditsUsed: 45000,
    deliveryRate: 96.5,
    createdAt: '2024-06-10',
    scheduledAt: '2024-06-15T08:00:00',
  },
  {
    id: 'gcampaign-2',
    name: 'Flash Discount',
    clientId: 'client-2',
    clientName: 'RetailMax',
    channel: 'sms',
    status: 'completed',
    messagesSent: 12000,
    creditsUsed: 12000,
    deliveryRate: 94.2,
    createdAt: '2024-06-12',
  },
  {
    id: 'gcampaign-3',
    name: 'Health Tips Weekly',
    clientId: 'client-3',
    clientName: 'HealthFirst Clinic',
    channel: 'whatsapp',
    status: 'scheduled',
    messagesSent: 0,
    creditsUsed: 0,
    deliveryRate: 0,
    createdAt: '2024-06-14',
    scheduledAt: '2024-06-20T10:00:00',
  },
  {
    id: 'gcampaign-4',
    name: 'Weekend Menu',
    clientId: 'client-5',
    clientName: 'FoodieDelight',
    channel: 'rcs',
    status: 'running',
    messagesSent: 8500,
    creditsUsed: 17000,
    deliveryRate: 98.1,
    createdAt: '2024-06-14',
  },
  {
    id: 'gcampaign-5',
    name: 'New Model Launch',
    clientId: 'client-6',
    clientName: 'AutoDrive Motors',
    channel: 'whatsapp',
    status: 'paused',
    messagesSent: 25000,
    creditsUsed: 25000,
    deliveryRate: 95.8,
    createdAt: '2024-06-08',
  },
];

// Mock Role Permissions
export const mockRolePermissions: RolePermission[] = [
  { feature: 'Chat - View', admin: true, manager: true, agent: true },
  { feature: 'Chat - Reply', admin: true, manager: true, agent: true },
  { feature: 'Chat - Assign', admin: true, manager: true, agent: false },
  { feature: 'Chat - Close', admin: true, manager: true, agent: true },
  { feature: 'Campaign - View', admin: true, manager: true, agent: false },
  { feature: 'Campaign - Create', admin: true, manager: true, agent: false },
  { feature: 'Campaign - Edit', admin: true, manager: false, agent: false },
  { feature: 'Campaign - Delete', admin: true, manager: false, agent: false },
  { feature: 'Automation - View', admin: true, manager: true, agent: false },
  { feature: 'Automation - Create', admin: true, manager: false, agent: false },
  { feature: 'Automation - Edit', admin: true, manager: false, agent: false },
  { feature: 'Automation - Delete', admin: true, manager: false, agent: false },
  { feature: 'Integration - View', admin: true, manager: true, agent: false },
  { feature: 'Integration - Manage', admin: true, manager: false, agent: false },
  { feature: 'Reports - View', admin: true, manager: true, agent: true },
  { feature: 'Reports - Export', admin: true, manager: true, agent: false },
  { feature: 'Settings - View', admin: true, manager: false, agent: false },
  { feature: 'Settings - Edit', admin: true, manager: false, agent: false },
  { feature: 'Users - View', admin: true, manager: true, agent: false },
  { feature: 'Users - Manage', admin: true, manager: false, agent: false },
];

// Dashboard Stats
export const superAdminDashboardStats = {
  totalClients: 207,
  activeClients: 189,
  activePlans: 3,
  totalMessagesProcessed: 2456000,
  creditsConsumedToday: 45600,
  creditsConsumedMonth: 1250000,
  revenueToday: 4560,
  revenueMonth: 125000,
  channelUsage: [
    { channel: 'WhatsApp', messages: 1450000, percentage: 59 },
    { channel: 'SMS', messages: 520000, percentage: 21 },
    { channel: 'RCS', messages: 245000, percentage: 10 },
  ],
  creditsByPlan: [
    { plan: 'Starter', credits: 225000 },
    { plan: 'Professional', credits: 3840000 },
    { plan: 'Enterprise', credits: 3400000 },
  ],
  clientGrowth: [
    { month: 'Jan', clients: 120 },
    { month: 'Feb', clients: 135 },
    { month: 'Mar', clients: 148 },
    { month: 'Apr', clients: 165 },
    { month: 'May', clients: 182 },
    { month: 'Jun', clients: 207 },
  ],
  weeklyMessages: [
    { day: 'Mon', messages: 320000 },
    { day: 'Tue', messages: 380000 },
    { day: 'Wed', messages: 420000 },
    { day: 'Thu', messages: 390000 },
    { day: 'Fri', messages: 450000 },
    { day: 'Sat', messages: 280000 },
    { day: 'Sun', messages: 216000 },
  ],
};
