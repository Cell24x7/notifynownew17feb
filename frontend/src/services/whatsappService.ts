import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api/whatsapp`;

const getAuth = () => ({
    Authorization: `Bearer ${localStorage.getItem('authToken')}`
});

export interface WhatsAppTemplate {
    name: string;
    category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
    language: string;
    components: any[];
    status?: string;
    id?: string;
    allow_category_change?: boolean;
}

export const whatsappService = {
    // ─── STATUS ───────────────────────────────────────
    getStatus: async () => {
        const res = await axios.get(`${API_URL}/status`, { headers: getAuth() });
        return res.data;
    },

    // ─── TEMPLATES ────────────────────────────────────
    getTemplates: async (params?: { fields?: string; limit?: number; status?: string }) => {
        const res = await axios.get(`${API_URL}/templates`, { headers: getAuth(), params });
        return res.data;
    },

    getTemplateById: async (templateId: string) => {
        const res = await axios.get(`${API_URL}/templates/${templateId}`, { headers: getAuth() });
        return res.data;
    },

    createTemplate: async (template: WhatsAppTemplate) => {
        const res = await axios.post(`${API_URL}/templates`, template, { headers: getAuth() });
        return res.data;
    },

    editTemplate: async (templateId: string, payload: any) => {
        const res = await axios.put(`${API_URL}/templates/${templateId}`, payload, { headers: getAuth() });
        return res.data;
    },

    deleteTemplate: async (templateName: string, hsmId?: string) => {
        const res = await axios.delete(`${API_URL}/templates/${templateName}`, {
            headers: getAuth(),
            params: hsmId ? { hsm_id: hsmId } : undefined
        });
        return res.data;
    },

    // ─── SEND MESSAGES ────────────────────────────────
    /** Universal send — pass full WhatsApp message payload */
    send: async (payload: { to: string; type: string;[key: string]: any }) => {
        const res = await axios.post(`${API_URL}/send`, payload, { headers: getAuth() });
        return res.data;
    },

    /** Send template message (simplified) */
    sendTemplate: async (data: { to: string; templateName: string; languageCode?: string; components?: any[] }) => {
        const res = await axios.post(`${API_URL}/send-template`, data, { headers: getAuth() });
        return res.data;
    },

    /** Send text message */
    sendText: async (to: string, body: string) => {
        const res = await axios.post(`${API_URL}/send`, {
            to, type: 'text', text: { body }, messaging_product: 'whatsapp'
        }, { headers: getAuth() });
        return res.data;
    },

    /** Mark message as read */
    markAsRead: async (messageId: string) => {
        const res = await axios.post(`${API_URL}/mark-read`, { message_id: messageId }, { headers: getAuth() });
        return res.data;
    },

    // ─── WEBHOOK (Pinbot only) ────────────────────────
    setWebhook: async (webhookUrl: string, customHeaders?: Record<string, string>) => {
        const res = await axios.post(`${API_URL}/set-webhook`, {
            webhook_url: webhookUrl,
            ...(customHeaders ? { headers: customHeaders } : {})
        }, { headers: getAuth() });
        return res.data;
    },

    getWebhook: async () => {
        const res = await axios.get(`${API_URL}/get-webhook`, { headers: getAuth() });
        return res.data;
    },

    // ─── SEND CAMPAIGN (Queue-based) ──────────────────
    sendCampaign: async (data: { campaignId?: string; campaignName?: string; templateName: string; contacts: string[] }) => {
        const res = await axios.post(`${API_URL}/send-campaign`, data, { headers: getAuth() });
        return res.data;
    },

    // ─── USER DETAILS (Pinbot only) ───────────────────
    getUserDetails: async () => {
        const res = await axios.get(`${API_URL}/user-details`, { headers: getAuth() });
        return res.data;
    },

    // ─── MEDIA UPLOADS (Pinbot only) ──────────────────

    /**
     * Step 1: Create upload session on Pinbot
     * Returns { id: 'upload:XXXX', sig: 'YYYY', ... }
     */
    createUploadSession: async (fileLength: number, fileType: string) => {
        const res = await axios.post(`${API_URL}/header-handle/session`, {
            file_length: fileLength,
            file_type: fileType
        }, { headers: getAuth() });
        return res.data;
    },

    /**
     * Step 2: Upload raw binary file to Pinbot
     * session_id = the 'id' from Step 1 (e.g. 'upload:MTphdHR...')
     * sig = the 'sig' from Step 1
     * Backend converts multipart → raw binary for Pinbot
     */
    uploadFile: async (sessionId: string, sig: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);
        if (sig) formData.append('sig', sig);

        const res = await axios.post(`${API_URL}/header-handle/upload`, formData, {
            headers: {
                ...getAuth()
                // Don't set Content-Type, let browser set multipart boundary
            }
        });
        return res.data;
    },

    /**
     * Combined Helper: Upload file and get header_handle in one call
     * Returns header_handle string (e.g. '4::aW1h...')
     */
    uploadHeaderHandle: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await axios.post(`${API_URL}/media/upload-local`, formData, {
            headers: { ...getAuth() }
        });
        
        if (!res.data.success) throw new Error(res.data.message || 'Local upload failed');
        return res.data;
    },

    uploadMedia: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(`${API_URL}/media`, formData, {
            headers: { ...getAuth() }
        });
        return res.data;
    }
};
