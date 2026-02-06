import { API_BASE_URL } from '@/config/api';

export interface SuperAdminStats {
    totalClients: number;
    activeClients: number;
    activePlans: number;
    totalMessagesProcessed: number;
    messagesToday: number;
    revenueTotal: number;
    revenueToday: number;
    revenueMonth: number;
    creditsConsumedToday: number;
    creditsConsumedMonth: number;
    weeklyMessages: { day: string; messages: number }[];
    channelUsage: { channel: string; messages: number; percentage: number }[];
    planDistribution: { name: string; value: number }[];
    topClients: { name: string; balance: number }[];
}

export const superAdminApi = {
    getDashboardStats: async (): Promise<SuperAdminStats> => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/dashboard/super-admin?_t=${Date.now()}`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch dashboard stats');
        }

        const data = await response.json();
        return data.stats;
    },
};
