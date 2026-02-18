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
    audience_count: number;
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

export const campaignService = {
    async getCampaigns() {
        const response = await axios.get(API_BASE_URL_CAMPAIGNS, { headers: getAuthHeader() });
        return response.data.campaigns as Campaign[];
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
