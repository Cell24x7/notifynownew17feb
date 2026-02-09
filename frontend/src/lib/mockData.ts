// Mock data for the Cell24x7 SaaS application

// Media File types for File Manager
export interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'document';
  size: number;
  url: string;
  thumbnail?: string;
  uploadedAt: Date;
  uploadedBy: string;
}

// Mock Media Files
export const mockFiles: MediaFile[] = [
  { id: '1', name: 'product-banner.jpg', type: 'image', size: 245760, url: '/placeholder.svg', thumbnail: '/placeholder.svg', uploadedAt: new Date(Date.now() - 86400000), uploadedBy: 'John Smith' },
  { id: '2', name: 'promo-video.mp4', type: 'video', size: 15728640, url: '/video.mp4', uploadedAt: new Date(Date.now() - 172800000), uploadedBy: 'Sarah Johnson' },
  { id: '3', name: 'company-logo.png', type: 'image', size: 51200, url: '/logo.png', thumbnail: '/logo.png', uploadedAt: new Date(Date.now() - 259200000), uploadedBy: 'John Smith' },
  { id: '4', name: 'product-catalog.pdf', type: 'document', size: 2097152, url: '/catalog.pdf', uploadedAt: new Date(Date.now() - 345600000), uploadedBy: 'Emily Davis' },
  { id: '5', name: 'announcement.mp3', type: 'audio', size: 3145728, url: '/audio.mp3', uploadedAt: new Date(Date.now() - 432000000), uploadedBy: 'Mike Wilson' },
  { id: '6', name: 'sale-banner.jpg', type: 'image', size: 307200, url: '/placeholder.svg', thumbnail: '/placeholder.svg', uploadedAt: new Date(Date.now() - 518400000), uploadedBy: 'Sarah Johnson' },
  { id: '7', name: 'tutorial-video.mp4', type: 'video', size: 31457280, url: '/tutorial.mp4', uploadedAt: new Date(Date.now() - 604800000), uploadedBy: 'John Smith' },
  { id: '8', name: 'terms-conditions.pdf', type: 'document', size: 524288, url: '/terms.pdf', uploadedAt: new Date(Date.now() - 691200000), uploadedBy: 'Emily Davis' },
  { id: '9', name: 'hero-image.png', type: 'image', size: 409600, url: '/placeholder.svg', thumbnail: '/placeholder.svg', uploadedAt: new Date(Date.now() - 777600000), uploadedBy: 'Mike Wilson' },
  { id: '10', name: 'welcome-audio.mp3', type: 'audio', size: 2621440, url: '/welcome.mp3', uploadedAt: new Date(Date.now() - 864000000), uploadedBy: 'Sarah Johnson' },
];

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'agent';
  avatar?: string;
  department?: string;
  status: 'online' | 'offline' | 'busy';
}

export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  channel: Channel;
  avatar?: string;
  tags: string[];
  segment?: string;
  city?: string;
  createdAt?: Date;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export type Channel = 'whatsapp' | 'sms' | 'rcs';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'agent' | 'bot';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  channel: Channel;
  buttons?: { label: string; action: string }[];
}

export interface Conversation {
  id: string;
  contact: Contact;
  messages: Message[];
  status: 'open' | 'closed' | 'pending';
  assignedAgent?: User;
  channel: Channel;
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  status: 'draft' | 'scheduled' | 'running' | 'completed' | 'paused';
  template: string;
  audience: number;
  sent: number;
  delivered: number;
  failed: number;
  cost: number;
  scheduledAt?: Date;
  createdAt: Date;
}

export interface Automation {
  id: string;
  name: string;
  trigger: string;
  status: 'active' | 'paused' | 'draft';
  triggerCount: number;
  lastTriggered?: Date;
  createdAt: Date;
}

export interface Integration {
  id: string;
  name: string;
  category: 'ecommerce' | 'payments' | 'inventory' | 'crm' | 'scheduling' | 'ai' | 'utilities';
  logo: string;
  connected: boolean;
  description: string;
}

// Mock Users
export const mockUsers: User[] = [
  { id: '1', name: 'John Smith', email: 'john@company.com', role: 'admin', status: 'online', department: 'Support' },
  { id: '2', name: 'Sarah Johnson', email: 'sarah@company.com', role: 'manager', status: 'online', department: 'Sales' },
  { id: '3', name: 'Mike Wilson', email: 'mike@company.com', role: 'agent', status: 'busy', department: 'Support' },
  { id: '4', name: 'Emily Davis', email: 'emily@company.com', role: 'agent', status: 'offline', department: 'Sales' },
];

// Mock Contacts
export const mockContacts: Contact[] = [
  { id: '1', name: 'Alice Brown', phone: '+1234567890', email: 'alice@gmail.com', channel: 'whatsapp', tags: ['VIP', 'Premium'], segment: 'VIP Customers', city: 'Mumbai', createdAt: new Date(Date.now() - 2592000000), lastMessage: 'Thanks for your help!', lastMessageTime: new Date() },
  { id: '2', name: 'Bob Martinez', phone: '+1987654321', email: 'bob@yahoo.com', channel: 'sms', tags: ['New'], segment: 'New Customers', city: 'Delhi', createdAt: new Date(Date.now() - 604800000), lastMessage: 'When will my order arrive?', lastMessageTime: new Date(Date.now() - 3600000) },
  { id: '3', name: 'Charlie Davis', phone: '+1122334455', email: 'charlie@gmail.com', channel: 'rcs', tags: ['Regular'], segment: 'Returning Customers', city: 'Bangalore', createdAt: new Date(Date.now() - 1209600000), lastMessage: 'Is this item in stock?', lastMessageTime: new Date(Date.now() - 7200000) },
];

// Mock Messages
export const mockMessages: Message[] = [
  { id: '1', content: 'Hi! I need help with my order #12345', sender: 'user', timestamp: new Date(Date.now() - 300000), status: 'read', channel: 'whatsapp' },
  { id: '2', content: 'Hello Alice! I\'d be happy to help you with your order. Let me look that up for you.', sender: 'agent', timestamp: new Date(Date.now() - 240000), status: 'read', channel: 'whatsapp' },
  { id: '3', content: 'I found your order. It was shipped yesterday and should arrive by Friday.', sender: 'agent', timestamp: new Date(Date.now() - 180000), status: 'read', channel: 'whatsapp' },
  { id: '4', content: 'Would you like me to send you the tracking link?', sender: 'bot', timestamp: new Date(Date.now() - 120000), status: 'delivered', channel: 'whatsapp', buttons: [{ label: 'Yes, send tracking', action: 'send_tracking' }, { label: 'No thanks', action: 'decline' }] },
  { id: '5', content: 'Yes please!', sender: 'user', timestamp: new Date(Date.now() - 60000), status: 'read', channel: 'whatsapp' },
  { id: '6', content: 'Here\'s your tracking link: https://track.example.com/12345', sender: 'agent', timestamp: new Date(), status: 'sent', channel: 'whatsapp' },
];

// Mock Conversations
export const mockConversations: Conversation[] = [
  { id: '1', contact: mockContacts[0], messages: mockMessages, status: 'open', assignedAgent: mockUsers[2], channel: 'whatsapp', createdAt: new Date(Date.now() - 3600000), updatedAt: new Date() },
  { id: '2', contact: mockContacts[1], messages: mockMessages.slice(0, 3), status: 'pending', channel: 'sms', createdAt: new Date(Date.now() - 7200000), updatedAt: new Date(Date.now() - 3600000) },
  { id: '3', contact: mockContacts[2], messages: mockMessages.slice(0, 1), status: 'pending', channel: 'rcs', createdAt: new Date(Date.now() - 259200000), updatedAt: new Date(Date.now() - 172800000) },
];

// Mock Campaigns
export const mockCampaigns: Campaign[] = [
  { id: '1', name: 'Black Friday Sale', channel: 'whatsapp', status: 'completed', template: 'promotional_sale', audience: 5000, sent: 4950, delivered: 4800, failed: 150, cost: 1732.50, createdAt: new Date(Date.now() - 2592000000) },
  { id: '2', name: 'New Year Greetings', channel: 'sms', status: 'scheduled', template: 'holiday_greeting', audience: 3000, sent: 0, delivered: 0, failed: 0, cost: 750.00, scheduledAt: new Date(Date.now() + 604800000), createdAt: new Date(Date.now() - 86400000) },
  { id: '3', name: 'Product Launch', channel: 'rcs', status: 'running', template: 'product_announcement', audience: 2000, sent: 1200, delivered: 1150, failed: 50, cost: 600.00, createdAt: new Date(Date.now() - 172800000) },
  { id: '4', name: 'Flash Sale Alert', channel: 'whatsapp', status: 'draft', template: 'flash_sale', audience: 0, sent: 0, delivered: 0, failed: 0, cost: 0, createdAt: new Date() },

];

// Mock Automations
export const mockAutomations: Automation[] = [
  { id: '1', name: 'Welcome Message', trigger: 'New Contact', status: 'active', triggerCount: 1250, lastTriggered: new Date(Date.now() - 3600000), createdAt: new Date(Date.now() - 2592000000) },
  { id: '2', name: 'Order Confirmation', trigger: 'Order Placed', status: 'active', triggerCount: 3420, lastTriggered: new Date(Date.now() - 1800000), createdAt: new Date(Date.now() - 5184000000) },
  { id: '3', name: 'Abandoned Cart', trigger: 'Cart Abandoned', status: 'active', triggerCount: 890, lastTriggered: new Date(Date.now() - 7200000), createdAt: new Date(Date.now() - 1296000000) },
  { id: '4', name: 'Feedback Request', trigger: 'Order Delivered', status: 'paused', triggerCount: 2100, lastTriggered: new Date(Date.now() - 86400000), createdAt: new Date(Date.now() - 3888000000) },
  { id: '5', name: 'Support Ticket Auto-Reply', trigger: 'New Message', status: 'draft', triggerCount: 0, createdAt: new Date() },
];

// Mock Integrations
export const mockIntegrations: Integration[] = [
  // Ecommerce
  { id: '1', name: 'Shopify', category: 'ecommerce', logo: '🛒', connected: true, description: 'Sync your Shopify store with orders and customers' },
  { id: '2', name: 'WooCommerce', category: 'ecommerce', logo: '🛍️', connected: false, description: 'Connect your WooCommerce store' },
  { id: '3', name: 'Shiprocket', category: 'ecommerce', logo: '🚀', connected: true, description: 'Automated shipping and tracking' },
  { id: '4', name: 'Shipway', category: 'ecommerce', logo: '📦', connected: false, description: 'Shipping automation platform' },
  // Payments
  { id: '5', name: 'Razorpay', category: 'payments', logo: '💳', connected: true, description: 'Accept payments via Razorpay' },
  { id: '6', name: 'Stripe', category: 'payments', logo: '💰', connected: false, description: 'Global payment processing' },
  { id: '7', name: 'PhonePe', category: 'payments', logo: '📱', connected: false, description: 'UPI payments integration' },
  { id: '8', name: 'SoePay', category: 'payments', logo: '🏦', connected: false, description: 'Multi-currency payment gateway' },
  // Inventory
  { id: '9', name: 'Zoho Inventory', category: 'inventory', logo: '📊', connected: false, description: 'Inventory management system' },
  { id: '10', name: 'Zoho Books', category: 'inventory', logo: '📚', connected: true, description: 'Accounting and invoicing' },
  { id: '11', name: 'Tally Accounting', category: 'inventory', logo: '🧮', connected: false, description: 'Enterprise accounting solution' },
  // CRM
  { id: '12', name: 'Zoho CRM', category: 'crm', logo: '👥', connected: true, description: 'Customer relationship management' },
  { id: '13', name: 'Salesforce', category: 'crm', logo: '☁️', connected: false, description: 'Enterprise CRM platform' },
  { id: '14', name: 'Freshdesk', category: 'crm', logo: '🎫', connected: false, description: 'Customer support ticketing' },
  { id: '15', name: 'ITSell', category: 'crm', logo: '💼', connected: false, description: 'Sales automation platform' },
  { id: '16', name: 'IndiaMart', category: 'crm', logo: '🇮🇳', connected: false, description: 'B2B marketplace integration' },
  // Scheduling
  { id: '17', name: 'Calendly', category: 'scheduling', logo: '📅', connected: true, description: 'Appointment scheduling' },
  { id: '18', name: 'Acuity', category: 'scheduling', logo: '⏰', connected: false, description: 'Online scheduling software' },
  // AI
  { id: '19', name: 'Dialogflow', category: 'ai', logo: '🤖', connected: false, description: 'Google AI chatbot builder' },
  { id: '20', name: 'ChatGPT', category: 'ai', logo: '🧠', connected: true, description: 'OpenAI language model' },
  { id: '21', name: 'DeepSeek', category: 'ai', logo: '🔍', connected: false, description: 'Advanced AI search and analysis' },
  // Utilities
  { id: '22', name: 'Google Sheets', category: 'utilities', logo: '📋', connected: true, description: 'Spreadsheet automation' },
  { id: '23', name: 'Coupons', category: 'utilities', logo: '🎟️', connected: false, description: 'Coupon code management' },
];

// Mock Teams
export const mockTeams = [
  { id: '1', name: 'Support Team' },
  { id: '2', name: 'Sales Team' },
  { id: '3', name: 'Technical Team' },
  { id: '4', name: 'Customer Success' },
];

// Mock Quick Replies
export const mockQuickReplies = [
  { id: '1', title: 'Greeting', content: 'Hi! Thank you for contacting us. How can I help you today?' },
  { id: '2', title: 'Order Status', content: 'I\'ll check your order status right away. Could you please provide your order number?' },
  { id: '3', title: 'Thank You', content: 'Thank you for your patience! Is there anything else I can help you with?' },
  { id: '4', title: 'Hold On', content: 'Please hold on while I look into this for you.' },
  { id: '5', title: 'Closing', content: 'Thank you for reaching out! Have a great day!' },
];

// Template channels (6 channels for templates)
export type TemplateChannel = 'whatsapp' | 'sms' | 'rcs';

// Template header types
export type HeaderType = 'none' | 'text' | 'image' | 'video' | 'document';

// Template button types
export interface TemplateButton {
  id: string;
  type: 'url' | 'phone' | 'quick_reply' | 'copy_code';
  label: string;
  value: string;
}

// Message Templates with enhanced structure
export interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  category: 'Utility' | 'Marketing' | 'Authentication';
  channel: TemplateChannel;
  templateType: 'standard' | 'carousel';
  header: {
    type: HeaderType;
    content?: string;
  };
  body: string;
  footer?: string;
  buttons: TemplateButton[];
  variables: string[];
  status: 'approved' | 'pending' | 'rejected';
  createdAt: Date;
  usageCount: number;
  // Analytics
  analytics?: {
    sent: number;
    delivered: number;
    deliveredRate: number;
    opened: number;
    openedRate: number;
    clicked: number;
    clickedRate: number;
    buttonClicks: { label: string; type: string; clicks: number }[];
    lastUpdated: Date;
  };
}

export const mockMessageTemplates: MessageTemplate[] = [
  {
    id: '1',
    name: 'welcome_message',
    language: 'English',
    category: 'Marketing',
    channel: 'whatsapp',
    templateType: 'standard',
    header: { type: 'text', content: 'Welcome to {{1}}!' },
    body: 'Hi {{1}}! Welcome to our store. We\'re excited to have you here. 🎉\n\nExplore our latest collection and enjoy exclusive offers.',
    footer: 'Reply STOP to unsubscribe',
    buttons: [
      { id: '1', type: 'url', label: 'Shop Now', value: 'https://store.example.com' },
      { id: '2', type: 'quick_reply', label: 'View Offers', value: 'view_offers' },
    ],
    variables: ['1'],
    status: 'approved',
    createdAt: new Date(Date.now() - 2592000000),
    usageCount: 1250,
    analytics: {
      sent: 8920,
      delivered: 8670,
      deliveredRate: 97.2,
      opened: 7760,
      openedRate: 89.5,
      clicked: 1098,
      clickedRate: 12.3,
      buttonClicks: [
        { label: 'Shop Now', type: 'url', clicks: 756 },
        { label: 'View Offers', type: 'quick_reply', clicks: 342 },
      ],
      lastUpdated: new Date(Date.now() - 3600000),
    }
  },
  {
    id: '2',
    name: 'order_confirmation',
    language: 'English',
    category: 'Utility',
    channel: 'whatsapp',
    templateType: 'standard',
    header: { type: 'text', content: 'Order Confirmed! 📦' },
    body: 'Hi {{1}}! Your order #{{2}} has been confirmed.\n\nTotal: ₹{{3}}\nEstimated Delivery: {{4}}',
    footer: 'Thank you for shopping with us',
    buttons: [
      { id: '1', type: 'url', label: 'Track Order', value: 'https://track.example.com/{{2}}' },
    ],
    variables: ['1', '2', '3', '4'],
    status: 'approved',
    createdAt: new Date(Date.now() - 1296000000),
    usageCount: 3420,
    analytics: {
      sent: 15230,
      delivered: 14950,
      deliveredRate: 98.2,
      opened: 13200,
      openedRate: 88.3,
      clicked: 8540,
      clickedRate: 56.1,
      buttonClicks: [
        { label: 'Track Order', type: 'url', clicks: 8540 },
      ],
      lastUpdated: new Date(Date.now() - 1800000),
    }
  },
  {
    id: '3',
    name: 'shipping_update',
    language: 'English',
    category: 'Utility',
    channel: 'sms',
    templateType: 'standard',
    header: { type: 'none' },
    body: 'Great news! Your order #{{1}} has been shipped. Track here: {{2}}',
    buttons: [],
    variables: ['1', '2'],
    status: 'approved',
    createdAt: new Date(Date.now() - 864000000),
    usageCount: 2100,
    analytics: {
      sent: 9870,
      delivered: 9650,
      deliveredRate: 97.8,
      opened: 8200,
      openedRate: 85.0,
      clicked: 4100,
      clickedRate: 42.5,
      buttonClicks: [],
      lastUpdated: new Date(Date.now() - 7200000),
    }
  },
  {
    id: '4',
    name: 'feedback_request',
    language: 'English',
    category: 'Marketing',
    channel: 'whatsapp',
    templateType: 'standard',
    header: { type: 'image' },
    body: 'Hi {{1}}! We hope you loved your recent purchase! ⭐\n\nYour feedback helps us improve. Would you mind leaving a quick review?',
    footer: 'Reply STOP to unsubscribe',
    buttons: [
      { id: '1', type: 'url', label: 'Leave Review', value: 'https://review.example.com' },
      { id: '2', type: 'quick_reply', label: 'Later', value: 'remind_later' },
    ],
    variables: ['1'],
    status: 'approved',
    createdAt: new Date(Date.now() - 604800000),
    usageCount: 890,
    analytics: {
      sent: 5420,
      delivered: 5280,
      deliveredRate: 97.4,
      opened: 4520,
      openedRate: 85.6,
      clicked: 1890,
      clickedRate: 35.8,
      buttonClicks: [
        { label: 'Leave Review', type: 'url', clicks: 1450 },
        { label: 'Later', type: 'quick_reply', clicks: 440 },
      ],
      lastUpdated: new Date(Date.now() - 86400000),
    }
  },
  {
    id: '5',
    name: 'flash_sale_alert',
    language: 'English',
    category: 'Marketing',
    channel: 'whatsapp',
    templateType: 'standard',
    header: { type: 'video' },
    body: '🔥 FLASH SALE! 🔥\n\nUse code {{1}} for {{2}}% off your next order!\n\n⏰ Valid for 24 hours only!',
    footer: 'Terms & Conditions apply',
    buttons: [
      { id: '1', type: 'url', label: 'Shop Now', value: 'https://sale.example.com' },
      { id: '2', type: 'copy_code', label: 'Copy Code', value: '{{1}}' },
    ],
    variables: ['1', '2'],
    status: 'approved',
    createdAt: new Date(Date.now() - 432000000),
    usageCount: 4500,
    analytics: {
      sent: 22450,
      delivered: 21800,
      deliveredRate: 97.1,
      opened: 19500,
      openedRate: 89.4,
      clicked: 8760,
      clickedRate: 40.2,
      buttonClicks: [
        { label: 'Shop Now', type: 'url', clicks: 6230 },
        { label: 'Copy Code', type: 'copy_code', clicks: 2530 },
      ],
      lastUpdated: new Date(Date.now() - 43200000),
    }
  },
  {
    id: '6',
    name: 'otp_verification',
    language: 'English',
    category: 'Authentication',
    channel: 'whatsapp',
    templateType: 'standard',
    header: { type: 'none' },
    body: 'Your verification code is: {{1}}\n\nThis code expires in 10 minutes. Do not share this code with anyone.',
    buttons: [
      { id: '1', type: 'copy_code', label: 'Copy Code', value: '{{1}}' },
    ],
    variables: ['1'],
    status: 'approved',
    createdAt: new Date(Date.now() - 259200000),
    usageCount: 12780,
    analytics: {
      sent: 45000,
      delivered: 44500,
      deliveredRate: 98.9,
      opened: 42000,
      openedRate: 94.4,
      clicked: 38000,
      clickedRate: 85.4,
      buttonClicks: [
        { label: 'Copy Code', type: 'copy_code', clicks: 38000 },
      ],
      lastUpdated: new Date(Date.now() - 600000),
    }
  },
  {
    id: '7',
    name: 'cart_reminder',
    language: 'English',
    category: 'Marketing',
    channel: 'rcs',
    templateType: 'standard',
    header: { type: 'image' },
    body: 'Hey {{1}}! 🛒\n\nYou left {{2}} items in your cart worth ₹{{3}}.\n\nComplete your purchase now and get free shipping!',
    footer: 'Offer valid for 48 hours',
    buttons: [
      { id: '1', type: 'url', label: 'Complete Purchase', value: 'https://cart.example.com' },
      { id: '2', type: 'quick_reply', label: 'Remind Later', value: 'remind_later' },
    ],
    variables: ['1', '2', '3'],
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000),
    usageCount: 0
  },
  {
    id: '8',
    name: 'birthday_wish',
    language: 'English',
    category: 'Marketing',
    channel: 'sms',
    templateType: 'standard',
    header: { type: 'none' },
    body: 'Happy Birthday, {{1}}! 🎂 Enjoy {{2}}% off on us! Use code: BDAY{{3}}',
    buttons: [],
    variables: ['1', '2', '3'],
    status: 'approved',
    createdAt: new Date(Date.now() - 172800000),
    usageCount: 320,
    analytics: {
      sent: 3200,
      delivered: 3100,
      deliveredRate: 96.9,
      opened: 2800,
      openedRate: 90.3,
      clicked: 980,
      clickedRate: 31.6,
      buttonClicks: [],
      lastUpdated: new Date(Date.now() - 172800000),
    }
  },
];

// Mock Quick Replies for quick chat responses
export const mockTemplates = [
  { id: '1', name: 'Welcome Message', category: 'Greeting', content: 'Welcome to our store! We\'re excited to have you here.' },
  { id: '2', name: 'Order Confirmation', category: 'Transactional', content: 'Your order #{{order_id}} has been confirmed and is being processed.' },
  { id: '3', name: 'Shipping Update', category: 'Transactional', content: 'Great news! Your order has been shipped. Track it here: {{tracking_link}}' },
  { id: '4', name: 'Feedback Request', category: 'Marketing', content: 'We hope you loved your purchase! Would you mind leaving us a review?' },
  { id: '5', name: 'Promotional Offer', category: 'Marketing', content: 'Special offer just for you! Use code {{code}} for 20% off your next order.' },
];

// Template categories for filtering
export const templateCategories = ['All', 'Greeting', 'Transactional', 'Marketing', 'Support', 'Promotional'] as const;

// Audience segments
export const audienceSegments = [
  { id: '1', name: 'All Customers', count: 15000, description: 'All customers in your database' },
  { id: '2', name: 'VIP Customers', count: 1200, description: 'High-value customers with 5+ orders' },
  { id: '3', name: 'New Customers', count: 3500, description: 'Customers acquired in the last 30 days' },
  { id: '4', name: 'Inactive Customers', count: 4200, description: 'No purchase in last 90 days' },
  { id: '5', name: 'Cart Abandoners', count: 890, description: 'Left items in cart without purchase' },
  { id: '6', name: 'Newsletter Subscribers', count: 8900, description: 'Opted-in for marketing communications' },
];

// Priority levels
export const priorityLevels = [
  { id: 'none', label: 'None', color: 'gray' },
  { id: 'low', label: 'Low', color: 'blue' },
  { id: 'medium', label: 'Medium', color: 'yellow' },
  { id: 'high', label: 'High', color: 'orange' },
  { id: 'urgent', label: 'Urgent', color: 'red' },
];

// Dashboard Stats
export const dashboardStats = {
  totalConversations: 12847,
  activeChats: 234,
  openChats: 156,
  closedChats: 12613,
  automationsTriggered: 8650,
  campaignsSent: 45000,
  channelDistribution: {
    whatsapp: 45,
    sms: 25,
    rcs: 5,
  },
  weeklyChats: [
    { day: 'Mon', count: 120 },
    { day: 'Tue', count: 180 },
    { day: 'Wed', count: 150 },
    { day: 'Thu', count: 220 },
    { day: 'Fri', count: 190 },
    { day: 'Sat', count: 80 },
    { day: 'Sun', count: 60 },
  ],
};

// Enhanced Channel Analytics
export const channelAnalytics = {
  whatsapp: {
    name: 'WhatsApp',
    totalMessages: 45680,
    delivered: 44890,
    read: 38450,
    responded: 32100,
    avgResponseTime: '2m 15s',
    satisfaction: 4.7,
    botHandled: 18200,
    humanHandled: 13900,
    weeklyTrend: [
      { day: 'Mon', sent: 6520, received: 5890 },
      { day: 'Tue', sent: 7210, received: 6540 },
      { day: 'Wed', sent: 6890, received: 6120 },
      { day: 'Thu', sent: 7450, received: 6780 },
      { day: 'Fri', sent: 6980, received: 6340 },
      { day: 'Sat', sent: 5420, received: 4890 },
      { day: 'Sun', sent: 5210, received: 4670 },
    ],
    hourlyActivity: [
      { hour: '00', count: 120 }, { hour: '01', count: 85 }, { hour: '02', count: 45 },
      { hour: '03', count: 30 }, { hour: '04', count: 25 }, { hour: '05', count: 40 },
      { hour: '06', count: 180 }, { hour: '07', count: 420 }, { hour: '08', count: 680 },
      { hour: '09', count: 890 }, { hour: '10', count: 1020 }, { hour: '11', count: 1150 },
      { hour: '12', count: 980 }, { hour: '13', count: 1080 }, { hour: '14', count: 1120 },
      { hour: '15', count: 1050 }, { hour: '16', count: 980 }, { hour: '17', count: 850 },
      { hour: '18', count: 720 }, { hour: '19', count: 580 }, { hour: '20', count: 450 },
      { hour: '21', count: 380 }, { hour: '22', count: 290 }, { hour: '23', count: 180 },
    ],
    topIntents: [
      { intent: 'Order Status', count: 8540, percentage: 26.5 },
      { intent: 'Product Inquiry', count: 6890, percentage: 21.4 },
      { intent: 'Returns', count: 4520, percentage: 14.0 },
      { intent: 'Pricing', count: 3980, percentage: 12.4 },
      { intent: 'Support', count: 8270, percentage: 25.7 },
    ],
  },
  sms: {
    name: 'SMS',
    totalMessages: 28450,
    delivered: 27890,
    read: 0, // SMS doesn't have read receipts
    responded: 12450,
    avgResponseTime: '5m 30s',
    satisfaction: 4.2,
    botHandled: 8900,
    humanHandled: 3550,
    weeklyTrend: [
      { day: 'Mon', sent: 4120, received: 1890 },
      { day: 'Tue', sent: 4350, received: 2040 },
      { day: 'Wed', sent: 4180, received: 1920 },
      { day: 'Thu', sent: 4520, received: 2180 },
      { day: 'Fri', sent: 4280, received: 1980 },
      { day: 'Sat', sent: 3520, received: 1420 },
      { day: 'Sun', sent: 3480, received: 1020 },
    ],
    hourlyActivity: [
      { hour: '00', count: 45 }, { hour: '01', count: 30 }, { hour: '02', count: 15 },
      { hour: '03', count: 10 }, { hour: '04', count: 8 }, { hour: '05', count: 25 },
      { hour: '06', count: 120 }, { hour: '07', count: 280 }, { hour: '08', count: 450 },
      { hour: '09', count: 620 }, { hour: '10', count: 780 }, { hour: '11', count: 850 },
      { hour: '12', count: 720 }, { hour: '13', count: 790 }, { hour: '14', count: 820 },
      { hour: '15', count: 750 }, { hour: '16', count: 680 }, { hour: '17', count: 580 },
      { hour: '18', count: 450 }, { hour: '19', count: 380 }, { hour: '20', count: 290 },
      { hour: '21', count: 220 }, { hour: '22', count: 150 }, { hour: '23', count: 80 },
    ],
    topIntents: [
      { intent: 'OTP Verification', count: 12450, percentage: 43.8 },
      { intent: 'Order Updates', count: 8920, percentage: 31.4 },
      { intent: 'Promotions', count: 4580, percentage: 16.1 },
      { intent: 'Reminders', count: 2500, percentage: 8.8 },
    ],
  },

  rcs: {
    name: 'RCS',
    totalMessages: 5890,
    delivered: 5780,
    read: 5420,
    responded: 4560,
    avgResponseTime: '3m 10s',
    satisfaction: 4.6,
    botHandled: 2280,
    humanHandled: 2280,
    weeklyTrend: [
      { day: 'Mon', sent: 820, received: 680 },
      { day: 'Tue', sent: 890, received: 740 },
      { day: 'Wed', sent: 850, received: 710 },
      { day: 'Thu', sent: 920, received: 780 },
      { day: 'Fri', sent: 880, received: 740 },
      { day: 'Sat', sent: 720, received: 590 },
      { day: 'Sun', sent: 810, received: 680 },
    ],
    hourlyActivity: [
      { hour: '00', count: 35 }, { hour: '01', count: 22 }, { hour: '02', count: 12 },
      { hour: '03', count: 8 }, { hour: '04', count: 5 }, { hour: '05', count: 15 },
      { hour: '06', count: 45 }, { hour: '07', count: 95 }, { hour: '08', count: 180 },
      { hour: '09', count: 280 }, { hour: '10', count: 350 }, { hour: '11', count: 390 },
      { hour: '12', count: 340 }, { hour: '13', count: 380 }, { hour: '14', count: 400 },
      { hour: '15', count: 370 }, { hour: '16', count: 340 }, { hour: '17', count: 310 },
      { hour: '18', count: 280 }, { hour: '19', count: 250 }, { hour: '20', count: 220 },
      { hour: '21', count: 180 }, { hour: '22', count: 130 }, { hour: '23', count: 75 },
    ],
    topIntents: [
      { intent: 'Rich Media', count: 2120, percentage: 36.0 },
      { intent: 'Interactive Cards', count: 1560, percentage: 26.5 },
      { intent: 'Booking', count: 1180, percentage: 20.0 },
      { intent: 'Payments', count: 1030, percentage: 17.5 },
    ],
  },
};

// Customer Satisfaction Trends
export const satisfactionTrends = [
  { month: 'Jan', whatsapp: 4.5, sms: 4.0, rcs: 4.4 },
  { month: 'Feb', whatsapp: 4.6, sms: 4.1, rcs: 4.5 },
  { month: 'Mar', whatsapp: 4.5, sms: 4.2, rcs: 4.4 },
  { month: 'Apr', whatsapp: 4.7, sms: 4.1, rcs: 4.6 },
  { month: 'May', whatsapp: 4.8, sms: 4.2, rcs: 4.5 },
  { month: 'Jun', whatsapp: 4.7, sms: 4.2, rcs: 4.6 },
];

// Response Time Trends
export const responseTimeTrends = [
  { month: 'Jan', whatsapp: 3.2, sms: 6.5, rcs: 4.1 },
  { month: 'Feb', whatsapp: 2.9, sms: 6.2, rcs: 3.8 },
  { month: 'Mar', whatsapp: 2.7, sms: 5.9, rcs: 3.5 },
  { month: 'Apr', whatsapp: 2.5, sms: 5.7, rcs: 3.3 },
  { month: 'May', whatsapp: 2.3, sms: 5.5, rcs: 3.2 },
  { month: 'Jun', whatsapp: 2.2, sms: 5.3, rcs: 3.1 },
];

// Bot vs Human Resolution
export const botVsHumanResolution = [
  { channel: 'WhatsApp', bot: 58, human: 42 },
  { channel: 'SMS', bot: 71, human: 29 },
  { channel: 'RCS', bot: 50, human: 50 },
];

// Conversation Volume by Hour (Heatmap data)
export const hourlyHeatmap = [
  { hour: '12am', Mon: 120, Tue: 135, Wed: 118, Thu: 142, Fri: 128, Sat: 95, Sun: 78 },
  { hour: '3am', Mon: 45, Tue: 52, Wed: 48, Thu: 55, Fri: 50, Sat: 38, Sun: 32 },
  { hour: '6am', Mon: 280, Tue: 310, Wed: 295, Thu: 325, Fri: 305, Sat: 180, Sun: 145 },
  { hour: '9am', Mon: 890, Tue: 920, Wed: 875, Thu: 945, Fri: 910, Sat: 420, Sun: 350 },
  { hour: '12pm', Mon: 980, Tue: 1020, Wed: 960, Thu: 1050, Fri: 995, Sat: 520, Sun: 450 },
  { hour: '3pm', Mon: 1050, Tue: 1080, Wed: 1020, Thu: 1120, Fri: 1065, Sat: 580, Sun: 490 },
  { hour: '6pm', Mon: 780, Tue: 820, Wed: 765, Thu: 850, Fri: 810, Sat: 680, Sun: 620 },
  { hour: '9pm', Mon: 450, Tue: 480, Wed: 435, Thu: 510, Fri: 485, Sat: 520, Sun: 480 },
];

// Agent Analytics Data
export const agentAnalytics = [
  {
    id: '1',
    name: 'John Smith',
    avatar: 'JS',
    status: 'online' as const,
    assigned: 245,
    closed: 230,
    open: 15,
    rating: 4.8,
    firstResponseTime: '1m 23s',
    avgResponseTime: '2m 45s',
    avgClosingTime: '12m 30s',
    resolutionRate: 94,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    avatar: 'SJ',
    status: 'online' as const,
    assigned: 312,
    closed: 298,
    open: 14,
    rating: 4.9,
    firstResponseTime: '45s',
    avgResponseTime: '1m 58s',
    avgClosingTime: '8m 15s',
    resolutionRate: 96,
  },
  {
    id: '3',
    name: 'Mike Wilson',
    avatar: 'MW',
    status: 'busy' as const,
    assigned: 189,
    closed: 165,
    open: 24,
    rating: 4.5,
    firstResponseTime: '2m 10s',
    avgResponseTime: '4m 20s',
    avgClosingTime: '18m 45s',
    resolutionRate: 87,
  },
  {
    id: '4',
    name: 'Emily Davis',
    avatar: 'ED',
    status: 'offline' as const,
    assigned: 156,
    closed: 152,
    open: 4,
    rating: 4.7,
    firstResponseTime: '1m 05s',
    avgResponseTime: '2m 30s',
    avgClosingTime: '10m 20s',
    resolutionRate: 97,
  },
  {
    id: '5',
    name: 'Alex Thompson',
    avatar: 'AT',
    status: 'online' as const,
    assigned: 278,
    closed: 260,
    open: 18,
    rating: 4.6,
    firstResponseTime: '1m 45s',
    avgResponseTime: '3m 10s',
    avgClosingTime: '14m 55s',
    resolutionRate: 94,
  },
];

// RCS Template Types
export interface RCSTemplate {
  id: string;
  name: string;
  language: string;
  category: 'Utility' | 'Marketing' | 'Authentication';
  headerType: HeaderType;
  headerContent?: string;
  body: string;
  footer?: string;
  templateType: 'standard' | 'carousel';
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  rejectionReason?: string;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  createdAt: Date;
  usageCount: number;
  lastUsedAt?: Date;
  buttons: RCSButton[];
  variables: RCSVariable[];
  analytics?: RCSAnalytics;
}

export interface RCSButton {
  id: string;
  type: 'action' | 'suggestion';
  actionType: 'openurl' | 'dlaction' | 'viewlocation' | 'calldialog';
  displayText: string;
  uriOrPhoneNumber?: string;
  postbackData?: string;
  suggestedReplyText?: string;
  position: number;
}

export interface RCSVariable {
  id: string;
  name: string;
  position: number;
  sampleValue?: string;
}

export interface RCSAnalytics {
  sentCount: number;
  deliveredCount: number;
  deliveredRate: number;
  openedCount: number;
  openedRate: number;
  clickedCount: number;
  clickedRate: number;
  actionButtonsClicked: number;
  suggestionRepliesClicked: number;
  lastUpdated: Date;
}

// Mock RCS Templates
export const mockRCSTemplates: RCSTemplate[] = [
  {
    id: 'rcs_1',
    name: 'promotional_banner',
    language: 'English',
    category: 'Marketing',
    headerType: 'image',
    headerContent: 'https://images.example.com/promo.jpg',
    body: 'Hey {{1}}! 🎉\n\nEnjoy {{2}}% OFF on our entire collection!\n\nLimited time offer - Valid for 48 hours only',
    footer: 'Offer ends at midnight',
    templateType: 'standard',
    status: 'approved',
    createdBy: 'user_1',
    approvedBy: 'admin_1',
    approvedAt: new Date(Date.now() - 2592000000),
    createdAt: new Date(Date.now() - 2592000000),
    usageCount: 1500,
    buttons: [
      {
        id: 'btn_1',
        type: 'action',
        actionType: 'openurl',
        displayText: 'Shop Now',
        uriOrPhoneNumber: 'https://shop.example.com/sale',
        position: 0,
      },
      {
        id: 'btn_2',
        type: 'suggestion',
        actionType: 'openurl',
        displayText: 'View Details',
        suggestedReplyText: 'View Details',
        position: 1,
      },
    ],
    variables: [
      { id: 'var_1', name: 'customer_name', position: 0, sampleValue: 'John' },
      { id: 'var_2', name: 'discount_percent', position: 1, sampleValue: '50' },
    ],
    analytics: {
      sentCount: 12450,
      deliveredCount: 12100,
      deliveredRate: 97.2,
      openedCount: 10800,
      openedRate: 89.3,
      clickedCount: 5420,
      clickedRate: 43.5,
      actionButtonsClicked: 4200,
      suggestionRepliesClicked: 1220,
      lastUpdated: new Date(Date.now() - 3600000),
    },
  },
  {
    id: 'rcs_2',
    name: 'order_tracking',
    language: 'English',
    category: 'Utility',
    headerType: 'text',
    headerContent: 'Your Order is On The Way! 📦',
    body: 'Hi {{1}}! Your order #{{2}} will arrive tomorrow between {{3}} AM - {{4}} PM.\n\nTrack your package in real-time.',
    footer: 'Need help? Tap below',
    templateType: 'standard',
    status: 'approved',
    createdBy: 'user_1',
    approvedBy: 'admin_1',
    approvedAt: new Date(Date.now() - 1728000000),
    createdAt: new Date(Date.now() - 1728000000),
    usageCount: 3200,
    buttons: [
      {
        id: 'btn_3',
        type: 'action',
        actionType: 'openurl',
        displayText: 'Track Order',
        uriOrPhoneNumber: 'https://track.example.com/{{2}}',
        position: 0,
      },
      {
        id: 'btn_4',
        type: 'action',
        actionType: 'calldialog',
        displayText: 'Call Support',
        uriOrPhoneNumber: '+919876543210',
        position: 1,
      },
    ],
    variables: [
      { id: 'var_3', name: 'customer_name', position: 0, sampleValue: 'John' },
      { id: 'var_4', name: 'order_id', position: 1, sampleValue: 'ORD12345' },
      { id: 'var_5', name: 'start_hour', position: 2, sampleValue: '10' },
      { id: 'var_6', name: 'end_hour', position: 3, sampleValue: '2' },
    ],
    analytics: {
      sentCount: 28900,
      deliveredCount: 28650,
      deliveredRate: 99.1,
      openedCount: 25200,
      openedRate: 88.0,
      clickedCount: 18900,
      clickedRate: 65.4,
      actionButtonsClicked: 16700,
      suggestionRepliesClicked: 2200,
      lastUpdated: new Date(Date.now() - 1800000),
    },
  },
  {
    id: 'rcs_3',
    name: 'product_card_catalog',
    language: 'English',
    category: 'Marketing',
    headerType: 'image',
    headerContent: 'https://images.example.com/catalog.jpg',
    body: 'Browse our latest collection:\n\n{{1}} - ₹{{2}}\n\nAvailable in {{3}} colors',
    footer: 'Free shipping on orders above ₹500',
    templateType: 'carousel',
    status: 'pending_approval',
    createdBy: 'user_2',
    createdAt: new Date(Date.now() - 86400000),
    usageCount: 0,
    buttons: [
      {
        id: 'btn_5',
        type: 'action',
        actionType: 'openurl',
        displayText: 'View Product',
        uriOrPhoneNumber: 'https://shop.example.com/products/{{product_id}}',
        position: 0,
      },
      {
        id: 'btn_6',
        type: 'suggestion',
        actionType: 'openurl',
        displayText: 'Add to Cart',
        suggestedReplyText: 'Add to Cart',
        position: 1,
      },
    ],
    variables: [
      { id: 'var_7', name: 'product_name', position: 0, sampleValue: 'Premium Shoes' },
      { id: 'var_8', name: 'product_price', position: 1, sampleValue: '2999' },
      { id: 'var_9', name: 'color_count', position: 2, sampleValue: '5' },
    ],
  },
  {
    id: 'rcs_4',
    name: 'authentication_otp',
    language: 'English',
    category: 'Authentication',
    headerType: 'text',
    headerContent: 'Your OTP Verification',
    body: '🔐 Your one-time password is: {{1}}\n\nThis code is valid for 10 minutes.\nDo not share this with anyone.',
    templateType: 'standard',
    status: 'approved',
    createdBy: 'user_1',
    approvedBy: 'admin_1',
    approvedAt: new Date(Date.now() - 1209600000),
    createdAt: new Date(Date.now() - 1209600000),
    usageCount: 45000,
    buttons: [
      {
        id: 'btn_7',
        type: 'action',
        actionType: 'dlaction',
        displayText: 'Copy OTP',
        postbackData: 'copy_otp_{{1}}',
        position: 0,
      },
    ],
    variables: [
      { id: 'var_10', name: 'otp_code', position: 0, sampleValue: '123456' },
    ],
    analytics: {
      sentCount: 125600,
      deliveredCount: 123400,
      deliveredRate: 98.2,
      openedCount: 118900,
      openedRate: 96.4,
      clickedCount: 89340,
      clickedRate: 71.0,
      actionButtonsClicked: 89340,
      suggestionRepliesClicked: 0,
      lastUpdated: new Date(Date.now() - 900000),
    },
  },
  {
    id: 'rcs_5',
    name: 'feedback_survey',
    language: 'English',
    category: 'Marketing',
    headerType: 'none',
    body: 'We\'d love your feedback! 🌟\n\nHow would you rate your experience with us?\n\nYour {{1}} seconds feedback helps us improve.',
    templateType: 'standard',
    status: 'draft',
    createdBy: 'user_3',
    createdAt: new Date(Date.now() - 43200000),
    usageCount: 0,
    buttons: [
      {
        id: 'btn_8',
        type: 'suggestion',
        actionType: 'openurl',
        displayText: '⭐⭐⭐⭐⭐ Excellent',
        suggestedReplyText: 'Excellent',
        position: 0,
      },
      {
        id: 'btn_9',
        type: 'suggestion',
        actionType: 'openurl',
        displayText: '⭐⭐⭐⭐ Good',
        suggestedReplyText: 'Good',
        position: 1,
      },
      {
        id: 'btn_10',
        type: 'suggestion',
        actionType: 'openurl',
        displayText: '⭐⭐⭐ Average',
        suggestedReplyText: 'Average',
        position: 2,
      },
    ],
    variables: [
      { id: 'var_11', name: 'survey_duration', position: 0, sampleValue: '30' },
    ],
  },
];

