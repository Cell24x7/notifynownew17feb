export interface Permission {
    feature: string;
    admin: boolean;
    manager: boolean;
    agent: boolean;
}

export interface PlanPermissions {
    [key: string]: Permission[];
}

export const USER_PERMISSIONS: Permission[] = [
    { feature: 'Dashboard - View', admin: true, manager: true, agent: true },

    { feature: 'Template - View', admin: true, manager: true, agent: true },
    { feature: 'Template - Create', admin: true, manager: true, agent: true },
    { feature: 'Template - Edit', admin: true, manager: true, agent: true },
    { feature: 'Template - Delete', admin: true, manager: true, agent: false },

    { feature: 'Campaigns - View', admin: true, manager: true, agent: true },
    { feature: 'Campaigns - Create', admin: true, manager: true, agent: true },
    { feature: 'Campaigns - Edit', admin: true, manager: true, agent: false },
    { feature: 'Campaigns - Delete', admin: true, manager: true, agent: false },
    { feature: 'Campaigns - Report', admin: true, manager: true, agent: true },

    { feature: 'Contacts - View', admin: true, manager: true, agent: true },
    { feature: 'Contacts - Create', admin: true, manager: true, agent: true },
    { feature: 'Contacts - Edit', admin: true, manager: true, agent: true },
    { feature: 'Contacts - Delete', admin: true, manager: true, agent: false },
    { feature: 'Contacts - Export', admin: true, manager: true, agent: false },
    { feature: 'Contacts - Import', admin: true, manager: true, agent: false },

    { feature: 'Chat - View', admin: true, manager: true, agent: true },
    { feature: 'Chat - Reply', admin: true, manager: true, agent: true },
    { feature: 'Chat - Assign', admin: true, manager: true, agent: true },
    { feature: 'Chat - Close', admin: true, manager: true, agent: true },

    { feature: 'API & Webhooks - View', admin: true, manager: true, agent: false },
    { feature: 'API & Webhooks - Manage', admin: true, manager: true, agent: false },

    { feature: 'Automations - View', admin: true, manager: true, agent: true },
    { feature: 'Automations - Create', admin: true, manager: true, agent: false },
    { feature: 'Automations - Edit', admin: true, manager: true, agent: false },
    { feature: 'Automations - Delete', admin: true, manager: true, agent: false },

    { feature: 'Chatflows - View', admin: true, manager: true, agent: true },
    { feature: 'Chatflows - Create', admin: true, manager: true, agent: false },
    { feature: 'Chatflows - Edit', admin: true, manager: true, agent: false },
    { feature: 'Chatflows - Delete', admin: true, manager: true, agent: false },

    { feature: 'Available Plans - View', admin: true, manager: true, agent: true },

    { feature: 'Integrations - View', admin: true, manager: true, agent: true },
    { feature: 'Integrations - Manage', admin: true, manager: true, agent: false },
    { feature: 'User Plans - View', admin: true, manager: true, agent: true },

    { feature: 'DLT Templates - View', admin: true, manager: true, agent: true },
    { feature: 'DLT Templates - Create', admin: true, manager: true, agent: true },
    { feature: 'DLT Templates - Edit', admin: true, manager: true, agent: false },
    { feature: 'DLT Templates - Delete', admin: true, manager: true, agent: false },

    { feature: 'Marketplace - View', admin: true, manager: true, agent: true },

    { feature: 'Reports - View', admin: true, manager: true, agent: true },
    { feature: 'Reports - Export', admin: true, manager: true, agent: true },

    { feature: 'Wallet - View', admin: true, manager: true, agent: true },
    { feature: 'Wallet - Manage', admin: true, manager: true, agent: false },

    { feature: 'Settings - View', admin: true, manager: true, agent: false },
    { feature: 'Settings - Edit', admin: true, manager: true, agent: false },
];

export const RESELLER_PERMISSIONS: Permission[] = [
    { feature: 'Dashboard - View', admin: true, manager: true, agent: true },

    { feature: 'Clients - View', admin: true, manager: true, agent: true },
    { feature: 'Clients - Create', admin: true, manager: true, agent: true },
    { feature: 'Clients - Edit', admin: true, manager: true, agent: false },
    { feature: 'Clients - Delete', admin: true, manager: true, agent: false },
    { feature: 'Clients - Login As', admin: true, manager: true, agent: false },

    { feature: 'Campaigns - View', admin: true, manager: true, agent: true },
    { feature: 'Campaigns - Create', admin: true, manager: true, agent: true },
    { feature: 'Campaigns - Edit', admin: true, manager: true, agent: false },
    { feature: 'Campaigns - Delete', admin: true, manager: true, agent: false },
    { feature: 'Campaigns - Report', admin: true, manager: true, agent: true },

    { feature: 'Contacts - View', admin: true, manager: true, agent: true },
    { feature: 'Contacts - Create', admin: true, manager: true, agent: true },
    { feature: 'Contacts - Edit', admin: true, manager: true, agent: true },
    { feature: 'Contacts - Delete', admin: true, manager: true, agent: false },

    { feature: 'Chat - View', admin: true, manager: true, agent: true },
    { feature: 'Chat - Reply', admin: true, manager: true, agent: true },
    { feature: 'Chat - Assign', admin: true, manager: true, agent: true },
    { feature: 'Chat - Close', admin: true, manager: true, agent: true },

    { feature: 'Templates - View', admin: true, manager: true, agent: true },
    { feature: 'Templates - Create', admin: true, manager: true, agent: true },
    { feature: 'Templates - Edit', admin: true, manager: true, agent: false },
    { feature: 'Templates - Delete', admin: true, manager: true, agent: false },
    { feature: 'Templates - Approve', admin: true, manager: true, agent: false },

    { feature: 'Plans - View', admin: true, manager: true, agent: true },
    { feature: 'Plans - Create', admin: true, manager: true, agent: false },
    { feature: 'Plans - Edit', admin: true, manager: true, agent: false },
    { feature: 'Plans - Delete', admin: true, manager: true, agent: false },

    { feature: 'Roles - View', admin: true, manager: true, agent: true },
    { feature: 'Roles - Manage', admin: true, manager: true, agent: false },

    { feature: 'Resellers - View', admin: true, manager: true, agent: false },
    { feature: 'Resellers - Create', admin: true, manager: true, agent: false },
    { feature: 'Resellers - Edit', admin: true, manager: true, agent: false },
    { feature: 'Resellers - Delete', admin: true, manager: true, agent: false },

    { feature: 'Affiliates - View', admin: true, manager: true, agent: true },
    { feature: 'Affiliates - Manage', admin: true, manager: true, agent: false },

    { feature: 'Wallet - View', admin: true, manager: true, agent: true },
    { feature: 'Wallet - Manage', admin: true, manager: true, agent: false },

    { feature: 'Reports - View', admin: true, manager: true, agent: true },
    { feature: 'Reports - Export', admin: true, manager: true, agent: true },

    { feature: 'Vendors - View', admin: true, manager: true, agent: true },
    { feature: 'Vendors - Manage', admin: true, manager: true, agent: false },

    { feature: 'Numbers - View', admin: true, manager: true, agent: true },
    { feature: 'Numbers - Manage', admin: true, manager: true, agent: false },

    { feature: 'SMS Gateways - View', admin: true, manager: true, agent: false },
    { feature: 'SMS Gateways - Manage', admin: true, manager: true, agent: false },

    { feature: 'RCS Configs - View', admin: true, manager: true, agent: false },
    { feature: 'RCS Configs - Manage', admin: true, manager: true, agent: false },

    { feature: 'WhatsApp Configs - View', admin: true, manager: true, agent: false },
    { feature: 'WhatsApp Configs - Manage', admin: true, manager: true, agent: false },

    { feature: 'System Engine - View', admin: true, manager: true, agent: false },
    { feature: 'System Engine - Manage', admin: true, manager: true, agent: false },

    { feature: 'Reseller Branding - View', admin: true, manager: true, agent: false },
    { feature: 'Reseller Branding - Manage', admin: true, manager: true, agent: false },
    { feature: 'Reseller Users - View', admin: true, manager: true, agent: false },
    { feature: 'Reseller Users - Manage', admin: true, manager: true, agent: false },

    { feature: 'System Logs - View', admin: true, manager: true, agent: false },
    { feature: 'Usage Ledger - View', admin: true, manager: true, agent: false },
];
