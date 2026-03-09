/**
 * Pinbot (Pinnacle Partners API v3) Frontend Service
 * Handles all Pinbot-related API calls
 */

import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

const PINBOT_API = `${API_BASE_URL}/api/whatsapp-pinbot`;

const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return { Authorization: `Bearer ${token}` };
};

export const pinbotService = {
    // ─── STATUS ───────────────────────────────────────────────
    getStatus: () =>
        axios.get(`${PINBOT_API}/status`, { headers: getAuthHeader() }),

    // ─── TEMPLATES ────────────────────────────────────────────
    getTemplates: (params?: {
        fields?: string;
        limit?: number;
        status?: string;
        before?: string;
        after?: string;
    }) =>
        axios.get(`${PINBOT_API}/templates`, { headers: getAuthHeader(), params }),

    getTemplateById: (templateId: string) =>
        axios.get(`${PINBOT_API}/templates/${templateId}`, { headers: getAuthHeader() }),

    createTemplate: (payload: {
        name: string;
        category: string;
        language: string;
        components: any[];
        allow_category_change?: boolean;
    }) =>
        axios.post(`${PINBOT_API}/templates`, payload, { headers: getAuthHeader() }),

    editTemplate: (templateId: string, payload: any) =>
        axios.put(`${PINBOT_API}/templates/${templateId}`, payload, { headers: getAuthHeader() }),

    deleteTemplate: (name: string, hsmId?: string) =>
        axios.delete(`${PINBOT_API}/templates/${name}`, {
            headers: getAuthHeader(),
            params: hsmId ? { hsm_id: hsmId } : undefined,
        }),

    // ─── WABA INFO ────────────────────────────────────────────
    getWabaInfo: (fields?: string) =>
        axios.get(`${PINBOT_API}/waba-info`, {
            headers: getAuthHeader(),
            params: fields ? { fields } : undefined,
        }),

    getWabaDetails: () =>
        axios.get(`${PINBOT_API}/waba-details`, { headers: getAuthHeader() }),

    // ─── HEADER HANDLE ────────────────────────────────────────
    createUploadSession: (fileLength: number, fileType: string) =>
        axios.post(
            `${PINBOT_API}/header-handle/session`,
            { file_length: fileLength, file_type: fileType },
            { headers: getAuthHeader() }
        ),

    uploadFileForHeader: (file: File, sessionId: string, sig?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('session_id', sessionId);
        if (sig) formData.append('sig', sig);
        return axios.post(`${PINBOT_API}/header-handle/upload`, formData, {
            headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' },
        });
    },

    // ─── MEDIA ────────────────────────────────────────────────
    uploadMedia: (file: File) => {
        const formData = new FormData();
        formData.append('sheet', file);
        return axios.post(`${PINBOT_API}/media`, formData, {
            headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' },
        });
    },

    getMediaUrl: (mediaId: string) =>
        axios.get(`${PINBOT_API}/media/${mediaId}`, { headers: getAuthHeader() }),

    deleteMedia: (mediaId: string) =>
        axios.delete(`${PINBOT_API}/media/${mediaId}`, { headers: getAuthHeader() }),

    // ─── SEND MESSAGES ────────────────────────────────────────
    /** Universal send – pass full WhatsApp message payload */
    sendMessage: (payload: {
        to: string;
        type: 'template' | 'text' | 'image' | 'video' | 'document' | 'audio' | 'interactive' | 'contacts' | 'location';
        [key: string]: any;
    }) =>
        axios.post(`${PINBOT_API}/send`, payload, { headers: getAuthHeader() }),

    /** Simplified template send */
    sendTemplate: (to: string, templateName: string, languageCode?: string, components?: any[]) =>
        axios.post(
            `${PINBOT_API}/send-template`,
            { to, templateName, languageCode: languageCode || 'en_US', components },
            { headers: getAuthHeader() }
        ),

    /** Send text message */
    sendText: (to: string, body: string) =>
        axios.post(
            `${PINBOT_API}/send`,
            { to, type: 'text', text: { body }, messaging_product: 'whatsapp' },
            { headers: getAuthHeader() }
        ),

    /** Send media message (image/video/document) with link */
    sendMedia: (to: string, type: 'image' | 'video' | 'document', link: string, caption?: string) =>
        axios.post(
            `${PINBOT_API}/send`,
            { to, type, [type]: { link, ...(caption ? { caption } : {}) }, messaging_product: 'whatsapp' },
            { headers: getAuthHeader() }
        ),

    /** Send interactive list message */
    sendList: (to: string, body: string, sections: any[], buttonLabel?: string) =>
        axios.post(
            `${PINBOT_API}/send`,
            {
                to,
                type: 'interactive',
                messaging_product: 'whatsapp',
                interactive: {
                    type: 'list',
                    body: { text: body },
                    action: { button: buttonLabel || 'Select', sections },
                },
            },
            { headers: getAuthHeader() }
        ),

    /** Send interactive reply buttons */
    sendReplyButtons: (to: string, bodyText: string, buttons: { id: string; title: string }[]) =>
        axios.post(
            `${PINBOT_API}/send`,
            {
                to,
                type: 'interactive',
                messaging_product: 'whatsapp',
                interactive: {
                    type: 'button',
                    body: { text: bodyText },
                    action: {
                        buttons: buttons.map((b) => ({ type: 'reply', reply: { id: b.id, title: b.title } })),
                    },
                },
            },
            { headers: getAuthHeader() }
        ),

    markAsRead: (messageId: string) =>
        axios.post(`${PINBOT_API}/mark-read`, { message_id: messageId }, { headers: getAuthHeader() }),

    // ─── WEBHOOK MANAGEMENT ───────────────────────────────────
    setWebhook: (webhookUrl: string, customHeaders?: Record<string, string>) =>
        axios.post(
            `${PINBOT_API}/set-webhook`,
            { webhook_url: webhookUrl, ...(customHeaders ? { headers: customHeaders } : {}) },
            { headers: getAuthHeader() }
        ),

    getWebhook: () =>
        axios.get(`${PINBOT_API}/get-webhook`, { headers: getAuthHeader() }),

    // ─── USER / ACCOUNT ───────────────────────────────────────
    getUserDetails: () =>
        axios.get(`${PINBOT_API}/user-details`, { headers: getAuthHeader() }),

    // ─── PAYMENTS ─────────────────────────────────────────────
    createRefund: (payload: {
        reference_id: string;
        speed?: string;
        payment_config_id?: string;
        amount: { currency: string; value: string; offset: string };
    }) =>
        axios.post(`${PINBOT_API}/payment-refund`, payload, { headers: getAuthHeader() }),
};

export default pinbotService;
