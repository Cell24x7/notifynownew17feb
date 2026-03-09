import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api/whatsapp`;

export interface WhatsAppTemplate {
    name: string;
    category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
    language: string;
    components: any[];
    status?: string;
    id?: string;
}

export const whatsappService = {
    getTemplates: async () => {
        const token = localStorage.getItem('authToken');
        const res = await axios.get(`${API_URL}/templates`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    createTemplate: async (template: WhatsAppTemplate) => {
        const token = localStorage.getItem('authToken');
        const res = await axios.post(`${API_URL}/templates`, template, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    sendTemplate: async (data: { to: string, templateName: string, languageCode?: string, components?: any[] }) => {
        const token = localStorage.getItem('authToken');
        const res = await axios.post(`${API_URL}/send-template`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    },

    deleteTemplate: async (templateName: string) => {
        const token = localStorage.getItem('authToken');
        const res = await axios.delete(`${API_URL}/templates/${templateName}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    }
};
