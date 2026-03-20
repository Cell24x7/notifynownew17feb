import axios from 'axios';

import { API_BASE_URL } from '@/config/api';

const API_BASE_URL_CAMPAIGNS = `${API_BASE_URL}/api/campaigns`;

const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return { Authorization: `Bearer ${token}` };
};

export interface Campaign {
    id: string;
    user_id: number;
    name: string;
    channel: string;
    template_id: string;
    audience_id: string;
    recipient_count: number;
    sent_count: number;
    delivered_count: number;
    read_count: number;
    failed_count: number;
    clicked_count: number;
    cost: number;
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'sent';
    scheduled_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface PaginatedCampaigns {
    campaigns: Campaign[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const campaignService = {
    async getCampaigns(page: number = 1, limit: number = 20) {
        const response = await axios.get(`${API_BASE_URL_CAMPAIGNS}?page=${page}&limit=${limit}`, { headers: getAuthHeader() });
        return response.data as PaginatedCampaigns;
    },

    async getAdminCampaigns(params: { page: number; limit?: number; search?: string; clientId?: string; channel?: string; status?: string }) {
        const { page = 1, limit = 20, search = '', clientId = 'all', channel = 'all', status = 'all' } = params;
        const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            search,
            clientId,
            channel,
            status
        });
        const response = await axios.get(`${API_BASE_URL_CAMPAIGNS}/admin?${queryParams.toString()}`, { headers: getAuthHeader() });
        return response.data as PaginatedCampaigns;
    },

    async getCampaign(id: string) {
        const response = await axios.get(`${API_BASE_URL_CAMPAIGNS}/${id}`, { headers: getAuthHeader() });
        return response.data.campaign as Campaign;
    },

    async createCampaign(data: Partial<Campaign>) {
        const response = await axios.post(API_BASE_URL_CAMPAIGNS, data, { headers: getAuthHeader() });
        return response.data;
    },

    async updateStatus(id: string, status: Campaign['status']) {
        const response = await axios.put(`${API_BASE_URL_CAMPAIGNS}/${id}/status`, { status }, { headers: getAuthHeader() });
        return response.data;
    },

    async sendTestMessage(campaignId: string, phone: string) {
        const response = await axios.post(`${API_BASE_URL_CAMPAIGNS}/${campaignId}/test`, { phone }, { headers: getAuthHeader() });
        return response.data;
    },

    async uploadContacts(campaignId: string, file: File | Blob) {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios.post(`${API_BASE_URL_CAMPAIGNS}/${campaignId}/upload-contacts`, formData, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    async startCampaign(campaignId: string, channel?: string) {
        let activeChannel = channel;

        // If channel is not provided, fetch campaign info first
        if (!activeChannel) {
            try {
                const campaign = await this.getCampaign(campaignId);
                activeChannel = campaign.channel?.toLowerCase();
            } catch (err) {
                console.error("Failed to fetch campaign for starting:", err);
            }
        }

        const endpoint = (activeChannel === 'whatsapp')
            ? `${API_BASE_URL}/api/whatsapp/send-campaign`
            : `${API_BASE_URL}/api/rcs/send-campaign`;

        const response = await axios.post(endpoint, { campaignId }, { headers: getAuthHeader() });
        return response.data;
    },

    async duplicateCampaign(id: string) {
        const response = await axios.post(`${API_BASE_URL_CAMPAIGNS}/${id}/duplicate`, {}, { headers: getAuthHeader() });
        return response.data;
    },

    async deleteCampaign(id: string) {
        const response = await axios.delete(`${API_BASE_URL_CAMPAIGNS}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    async sendTest(data: { channel: string; template_id: string; destination: string; variables: any }) {
        const response = await axios.post(`${API_BASE_URL_CAMPAIGNS}/test-send`, data, { headers: getAuthHeader() });
        return response.data;
    }
};
