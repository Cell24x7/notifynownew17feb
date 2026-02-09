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
    permissions?: any; // JSON object from backend
}
