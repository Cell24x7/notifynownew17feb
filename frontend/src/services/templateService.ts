import axios from 'axios';

import { API_BASE_URL } from '@/config/api';

const API_BASE_URL_TEMPLATES = `${API_BASE_URL}/api/templates`;

const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return { Authorization: `Bearer ${token}` };
};

export interface TemplateButton {
    id: string;
    type: 'quick_reply' | 'url' | 'phone' | 'copy_code' | 'reply' | 'url_action' | 'dialer_action' | 'calendar_event' | 'view_location_latlong' | 'view_location_query' | 'share_location';
    label: string;
    value?: string;
    position: number;
}

export interface MessageTemplate {
    id: string;
    user_id: number;
    name: string;
    language: string;
    category: 'Marketing' | 'Utility' | 'Authentication';
    channel: 'whatsapp' | 'sms' | 'rcs';
    template_type: 'standard' | 'carousel' | 'text_message' | 'rich_card';
    header_type: 'none' | 'text' | 'image' | 'video' | 'document';
    header_content: string | null;
    body: string;
    footer: string | null;
    status: 'pending' | 'approved' | 'rejected' | 'draft';
    rejection_reason?: string;
    usage_count: number;
    created_at: string;
    updated_at: string;
    buttons: TemplateButton[];
    variables?: any[];
    metadata?: any;
    analytics?: {
        sent: number;
        deliveredRate: number;
        openedRate: number;
        clickedRate: number;
        buttonClicks: Array<{ label: string; type: string; clicks: number }>;
    };
}

export interface PaginatedTemplates {
    templates: MessageTemplate[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const templateService = {
    async getTemplates(page: number = 1, limit: number = 20) {
        const response = await axios.get(`${API_BASE_URL_TEMPLATES}?page=${page}&limit=${limit}`, { headers: getAuthHeader() });
        return response.data as PaginatedTemplates;
    },

    async getAdminTemplates(page: number = 1, limit: number = 20, clientId: string = 'all') {
        const response = await axios.get(`${API_BASE_URL_TEMPLATES}/admin?page=${page}&limit=${limit}&clientId=${clientId}`, { headers: getAuthHeader() });
        return response.data as PaginatedTemplates;
    },

    async createTemplate(data: Partial<MessageTemplate>) {
        const response = await axios.post(API_BASE_URL_TEMPLATES, data, { headers: getAuthHeader() });
        return response.data;
    },

    async updateTemplate(id: string, data: Partial<MessageTemplate>) {
        const response = await axios.put(`${API_BASE_URL_TEMPLATES}/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    async deleteTemplate(id: string) {
        const response = await axios.delete(`${API_BASE_URL_TEMPLATES}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    async updateTemplateStatus(id: string, status: 'approved' | 'rejected' | 'pending' | 'draft', rejection_reason?: string) {
        const response = await axios.patch(`${API_BASE_URL_TEMPLATES}/${id}/status`, { status, rejection_reason }, { headers: getAuthHeader() });
        return response.data;
    }
};
