import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/templates';

const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return { Authorization: `Bearer ${token}` };
};

export interface TemplateButton {
    id: string;
    type: 'quick_reply' | 'url' | 'phone' | 'copy_code';
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
    channel: 'whatsapp' | 'sms' | 'rcs' | 'instagram' | 'facebook' | 'email' | 'voicebot';
    template_type: 'standard' | 'carousel';
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
    analytics?: {
        sent: number;
        deliveredRate: number;
        openedRate: number;
        clickedRate: number;
        buttonClicks: Array<{ label: string; type: string; clicks: number }>;
    };
}

export const templateService = {
    async getTemplates() {
        const response = await axios.get(API_BASE_URL, { headers: getAuthHeader() });
        return response.data.templates as MessageTemplate[];
    },

    async getAdminTemplates() {
        const response = await axios.get(`${API_BASE_URL}/admin`, { headers: getAuthHeader() });
        return response.data.templates as MessageTemplate[];
    },

    async createTemplate(data: Partial<MessageTemplate>) {
        const response = await axios.post(API_BASE_URL, data, { headers: getAuthHeader() });
        return response.data;
    },

    async updateTemplate(id: string, data: Partial<MessageTemplate>) {
        const response = await axios.put(`${API_BASE_URL}/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    async deleteTemplate(id: string) {
        const response = await axios.delete(`${API_BASE_URL}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    async updateTemplateStatus(id: string, status: 'approved' | 'rejected' | 'pending' | 'draft', rejection_reason?: string) {
        const response = await axios.patch(`${API_BASE_URL}/${id}/status`, { status, rejection_reason }, { headers: getAuthHeader() });
        return response.data;
    }
};
