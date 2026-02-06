import { API_BASE_URL } from '@/config/api';

export interface SystemLog {
    id: number;
    type: 'login' | 'api' | 'credit' | 'admin_action' | 'error';
    action: string;
    details: string;
    userName?: string;
    clientName?: string;
    ipAddress?: string;
    severity: 'info' | 'warning' | 'error';
    createdAt: string;
}

export interface LogsStats {
    total: number;
    errors: number;
    warnings: number;
    info: number;
}

export interface LogsResponse {
    success: boolean;
    logs: SystemLog[];
    stats: LogsStats;
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export const logsApi = {
    getLogs: async (params: {
        type?: string;
        severity?: string;
        search?: string;
        page?: number;
        limit?: number
    } = {}) => {
        const queryParams = new URLSearchParams();
        if (params.type && params.type !== 'all') queryParams.append('type', params.type);
        if (params.severity && params.severity !== 'all') queryParams.append('severity', params.severity);
        if (params.search) queryParams.append('search', params.search);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());

        const token = localStorage.getItem('authToken');

        if (!token) {
            console.warn('No auth token found, cannot fetch logs');
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_BASE_URL}/api/logs?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 401) {
            // Token might be expired
            localStorage.removeItem('authToken');
            throw new Error('Session expired. Please login again.');
        }

        if (!response.ok) {
            throw new Error('Failed to fetch logs');
        }

        return response.json() as Promise<LogsResponse>;
    },
};
