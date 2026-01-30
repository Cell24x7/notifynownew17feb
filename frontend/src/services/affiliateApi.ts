// API service for Affiliate Management

const API_BASE_URL = `http://${window.location.hostname}:5000/api/affiliates`;

const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

export interface Affiliate {
    id: string;
    name: string;
    email: string;
    referral_code: string;
    signups: number;
    active_clients: number;
    commission_earned: number;
    payout_status: 'pending' | 'processing' | 'paid';
    status: 'active' | 'inactive';
    created_at: string;
}

export const affiliateApi = {
    // Get all affiliates
    async getAll() {
        const response = await fetch(API_BASE_URL, {
            headers: getAuthHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to fetch affiliates');
        return result.data;
    },

    // Create affiliate
    async create(data: { name: string; email: string; referral_code?: string }) {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to create affiliate');
        return result.data;
    },

    // Update affiliate
    async update(id: string, data: Partial<Affiliate>) {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to update affiliate');
        return result.data;
    },

    // Delete affiliate
    async delete(id: string) {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Failed to delete affiliate');
        return result.data;
    },
};
