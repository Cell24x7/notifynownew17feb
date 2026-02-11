import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { config } from '../config/env';
import { authService } from './AuthService';
import { RcsTemplateSubmission } from '../types/vi-rbm';

class TemplateService {
    private get baseUrl() {
        return `${config.viRbm.serverRoot}/directory/secure/api/v1/bots/${config.viRbm.botId}`;
    }

    private get uploadUrl() {
        return `${config.viRbm.serverRoot}/rcs/upload/v1/files?botId=${config.viRbm.botId}`;
    }

    /**
     * Upload a file to Vi RBM Media Server
     */
    async uploadFile(filePath: string, mimeType: string): Promise<string> {
        const token = await authService.getAccessToken();
        const form = new FormData();
        form.append('fileContent', fs.createReadStream(filePath));
        form.append('fileType', mimeType);

        try {
            const response = await axios.post(this.uploadUrl, form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            });
            // Return fileId or name
            return response.data.name || response.data.fileId;
        } catch (error: any) {
            console.error('❌ File Upload Error:', error.message);
            throw error;
        }
    }

    /**
     * Create a new RCS Template
     */
    async createTemplate(templateData: RcsTemplateSubmission) {
        const token = await authService.getAccessToken();
        const form = new FormData();
        form.append('rich_template_data', JSON.stringify(templateData));

        // Note: If you have local files to upload as part of the template request (multipart),
        // you would append them here as 'multimedia_files'.
        // For this implementation, we assume media is already uploaded or is a URL.

        try {
            const response = await axios.post(`${this.baseUrl}/templates`, form, {
                headers: {
                    ...form.getHeaders(),
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('❌ Create Template Error:', error.message);
            if (error.response) console.error(JSON.stringify(error.response.data));
            throw error;
        }
    }

    /**
     * List all templates
     */
    async listTemplates() {
        const token = await authService.getAccessToken();
        try {
            const response = await axios.get(`${this.baseUrl}/templates`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.data;
        } catch (error: any) {
            console.error('❌ List Templates Error:', error.message);
            throw error;
        }
    }

    /**
     * Delete a template
     */
    async deleteTemplate(templateId: string) {
        const token = await authService.getAccessToken();
        try {
            await axios.delete(`${this.baseUrl}/templates/${templateId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return { success: true };
        } catch (error: any) {
            console.error('❌ Delete Template Error:', error.message);
            throw error;
        }
    }
}

export const templateService = new TemplateService();
