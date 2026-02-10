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

    { feature: 'Chat - View', admin: true, manager: true, agent: true },
    { feature: 'Chat - Reply', admin: true, manager: true, agent: true },
    { feature: 'Chat - Assign', admin: true, manager: true, agent: false },
    { feature: 'Chat - Close', admin: true, manager: true, agent: true },

    { feature: 'Contacts - View', admin: true, manager: true, agent: false },
    { feature: 'Contacts - Create', admin: true, manager: true, agent: false },
    { feature: 'Contacts - Edit', admin: true, manager: true, agent: false },
    { feature: 'Contacts - Delete', admin: true, manager: false, agent: false },
    { feature: 'Contacts - Export', admin: true, manager: false, agent: false },
    { feature: 'Contacts - Import', admin: true, manager: false, agent: false },

    { feature: 'Campaigns - View', admin: true, manager: true, agent: false },
    { feature: 'Campaigns - Create', admin: true, manager: true, agent: false },
    { feature: 'Campaigns - Edit', admin: true, manager: false, agent: false },
    { feature: 'Campaigns - Delete', admin: true, manager: false, agent: false },
    { feature: 'Campaigns - Report', admin: true, manager: true, agent: false },

    { feature: 'Automations - View', admin: true, manager: true, agent: false },
    { feature: 'Automations - Create', admin: true, manager: false, agent: false },
    { feature: 'Automations - Edit', admin: true, manager: false, agent: false },
    { feature: 'Automations - Delete', admin: true, manager: false, agent: false },

    { feature: 'Integrations - View', admin: true, manager: true, agent: false },
    { feature: 'Integrations - Manage', admin: true, manager: false, agent: false },

    { feature: 'User Plans - View', admin: true, manager: true, agent: true },

    { feature: 'Settings - View', admin: true, manager: false, agent: false },
    { feature: 'Settings - Edit', admin: true, manager: false, agent: false },
];

export const RESELLER_PERMISSIONS: Permission[] = [
    { feature: 'Dashboard - View', admin: true, manager: true, agent: true },

    { feature: 'Clients - View', admin: true, manager: true, agent: false },
    { feature: 'Clients - Create', admin: true, manager: true, agent: false },
    { feature: 'Clients - Edit', admin: true, manager: false, agent: false },
    { feature: 'Clients - Delete', admin: true, manager: false, agent: false },
    { feature: 'Clients - Login As', admin: true, manager: false, agent: false },

    { feature: 'Templates - View', admin: true, manager: true, agent: false },
    { feature: 'Templates - Create', admin: true, manager: true, agent: false },
    { feature: 'Templates - Edit', admin: true, manager: false, agent: false },
    { feature: 'Templates - Delete', admin: true, manager: false, agent: false },
    { feature: 'Templates - Approve', admin: true, manager: false, agent: false },

    { feature: 'Plans - View', admin: true, manager: true, agent: false },
    { feature: 'Plans - Create', admin: true, manager: false, agent: false },
    { feature: 'Plans - Edit', admin: true, manager: false, agent: false },
    { feature: 'Plans - Delete', admin: true, manager: false, agent: false },

    { feature: 'Roles - View', admin: true, manager: true, agent: false },
    { feature: 'Roles - Manage', admin: true, manager: false, agent: false },

    { feature: 'Resellers - View', admin: true, manager: false, agent: false },
    { feature: 'Resellers - Create', admin: true, manager: false, agent: false },
    { feature: 'Resellers - Edit', admin: true, manager: false, agent: false },
    { feature: 'Resellers - Delete', admin: true, manager: false, agent: false },

    { feature: 'Affiliates - View', admin: true, manager: true, agent: false },
    { feature: 'Affiliates - Manage', admin: true, manager: false, agent: false },

    { feature: 'Wallet - View', admin: true, manager: true, agent: false },
    { feature: 'Wallet - Manage', admin: true, manager: false, agent: false },

    { feature: 'Reports - View', admin: true, manager: true, agent: true },
    { feature: 'Reports - Export', admin: true, manager: true, agent: false },

    { feature: 'Vendors - View', admin: true, manager: true, agent: false },
    { feature: 'Vendors - Manage', admin: true, manager: false, agent: false },

    { feature: 'Numbers - View', admin: true, manager: true, agent: false },
    { feature: 'Numbers - Manage', admin: true, manager: false, agent: false },

    { feature: 'System Logs - View', admin: true, manager: true, agent: false },
];
