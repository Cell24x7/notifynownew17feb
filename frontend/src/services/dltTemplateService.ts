import axios from 'axios';
import { API_BASE_URL } from '@/config/api';

const API_URL = `${API_BASE_URL}/api/dlt-templates`;

const getAuthHeader = () => {
    const token = localStorage.getItem('authToken');
    return { Authorization: `Bearer ${token}` };
};

export interface DLTTemplate {
    id: number;
    user_id: number;
    sender: string;
    template_text: string;
    temp_id: string;
    temp_name: string;
    status: 'Y' | 'N';
    temp_type: string;
    pe_id?: string;
    hash_id?: string;
    created_at: string;
    updated_at: string;
}

export interface DLTPagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export const dltTemplateService = {
    async getTemplates(search = '', page = 1, limit = 50) {
        const response = await axios.get(API_URL, {
            headers: getAuthHeader(),
            params: { search, page, limit }
        });
        return response.data as { success: boolean; templates: DLTTemplate[]; pagination: DLTPagination };
    },

    async getSenders() {
        const response = await axios.get(`${API_URL}/senders`, { headers: getAuthHeader() });
        return response.data as { success: boolean; senders: string[] };
    },

    async createTemplate(data: Partial<DLTTemplate>) {
        const response = await axios.post(API_URL, data, { headers: getAuthHeader() });
        return response.data;
    },

    async updateTemplate(id: number, data: Partial<DLTTemplate>) {
        const response = await axios.put(`${API_URL}/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    async deleteTemplate(id: number) {
        const response = await axios.delete(`${API_URL}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    async bulkUpload(file: File, deleteOld: boolean = false) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('deleteOld', String(deleteOld));
        const response = await axios.post(`${API_URL}/bulk-upload`, formData, {
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
};
