import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/contacts';

const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return { Authorization: `Bearer ${token}` };
};

export interface Contact {
    id: string;
    name: string;
    phone: string;
    email?: string;
    category: 'guest' | 'lead' | 'customer' | 'vip';
    channel: 'whatsapp' | 'email' | 'sms' | 'instagram' | 'web';
    labels: string;
    starred: boolean;
    status: 'active' | 'inactive' | 'blocked' | 'pending';
    created_at?: string;
}

export type CreateContactData = Omit<Contact, 'id' | 'created_at' | 'starred' | 'status'> & {
    starred?: boolean;
    status?: string;
};

export const contactService = {
    getContacts: async (params?: any) => {
        const response = await axios.get(API_BASE_URL, { headers: getAuthHeader(), params });
        return response.data.contacts;
    },

    createContact: async (data: CreateContactData) => {
        const response = await axios.post(API_BASE_URL, data, { headers: getAuthHeader() });
        return response.data;
    },

    updateContact: async (id: string, data: Partial<Contact>) => {
        const response = await axios.put(`${API_BASE_URL}/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    deleteContact: async (id: string) => {
        const response = await axios.delete(`${API_BASE_URL}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    importContacts: async (contacts: Partial<Contact>[]) => {
        const response = await axios.post(`${API_BASE_URL}/bulk`, { contacts }, { headers: getAuthHeader() });
        return response.data;
    },
};
