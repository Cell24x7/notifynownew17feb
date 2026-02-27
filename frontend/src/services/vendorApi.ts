import { API_BASE_URL } from '@/config/api';

export interface Vendor {
    id: string;
    name: string;
    type: 'sms' | 'whatsapp' | 'rcs' | 'email' | 'voice' | 'multi';
    api_url: string;
    api_key?: string;
    priority: number;
    status: 'active' | 'inactive';
    channels: string[];
    created_at?: string;
    updated_at?: string;
}

export const vendorApi = {
    getVendors: async (): Promise<Vendor[]> => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/vendors`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch vendors');
        }

        const data = await response.json();
        return data.vendors;
    },

    createVendor: async (vendor: Omit<Vendor, 'id'>): Promise<string> => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/vendors`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vendor),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create vendor');
        }

        const data = await response.json();
        return data.id;
    },

    updateVendor: async (id: string, vendor: Partial<Vendor>): Promise<void> => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/vendors/${id}`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(vendor),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update vendor');
        }
    },

    deleteVendor: async (id: string): Promise<void> => {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/api/vendors/${id}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete vendor');
        }
    },
};
