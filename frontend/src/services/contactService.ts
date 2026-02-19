import axios from 'axios';

import { API_BASE_URL } from '@/config/api';

const API_BASE_URL_CONTACTS = `${API_BASE_URL}/api/contacts`;

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
    channel: 'whatsapp' | 'sms';
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
        const response = await axios.get(API_BASE_URL_CONTACTS, { headers: getAuthHeader(), params });
        return response.data.contacts;
    },

    createContact: async (data: CreateContactData) => {
        const response = await axios.post(API_BASE_URL_CONTACTS, data, { headers: getAuthHeader() });
        return response.data;
    },

    updateContact: async (id: string, data: Partial<Contact>) => {
        const response = await axios.put(`${API_BASE_URL_CONTACTS}/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    async deleteContact(id: string) {
        const response = await axios.delete(`${API_BASE_URL_CONTACTS}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    async importContacts(contacts: any[]) {
        const response = await axios.post(`${API_BASE_URL_CONTACTS}/bulk`, { contacts }, { headers: getAuthHeader() });
        return response.data;
    }
};
