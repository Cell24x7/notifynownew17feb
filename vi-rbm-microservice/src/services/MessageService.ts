import axios from 'axios';
import { config } from '../config/env';
import { authService } from './AuthService';
import { RcsMessagePayload, GoogleStyleMessage } from '../types/vi-rbm';
import { v4 as uuidv4 } from 'uuid';

class MessageService {
    private get googleStyleUrl() {
        // Standard RBM API endpoint (Google Style)
        return `https://rcsbusinessmessaging.googleapis.com/v1/phones`;
    }

    // Vi Specific Endpoint for GSMA style might differ, usually:
    // {serverRoot}/messaging/v1/bots/{botId}/messages
    private get gsmaStyleUrl() {
        return `${config.viRbm.serverRoot}/messaging/v1/bots/${config.viRbm.botId}/messages`;
    }

    /**
     * Send Message (Google Style)
     * This is the most common way to interact with RBM agents
     */
    async sendGoogleStyleMessage(msisdn: string, message: GoogleStyleMessage) {
        const token = await authService.getAccessToken();
        const messageId = uuidv4();

        try {
            const response = await axios.post(
                `${this.googleStyleUrl}/${msisdn}/agentMessages?messageId=${messageId}`,
                message,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('❌ Send Message Error (Google Style):', error.message);
            if (error.response) console.error(JSON.stringify(error.response.data));
            throw error;
        }
    }

    /**
     * Send GSMA Style Message
     * Used by some aggregators and strictly GSMA compliant platforms
     */
    async sendGsmaMessage(msisdn: string, payload: any) {
        const token = await authService.getAccessToken();
        const messageId = uuidv4();

        // GSMA specific payload wrapper
        const body = {
            destinationAddress: [msisdn],
            senderAddress: config.viRbm.botId,
            messageId: messageId,
            messageContentType: 'application/vnd.gsma.rcs-maap.chatbound+json',
            contentEncoding: 'utf8',
            content: JSON.stringify(payload) // often content is a nested JSON string
        };

        try {
            const response = await axios.post(
                this.gsmaStyleUrl,
                body,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('❌ Send Message Error (GSMA):', error.message);
            throw error;
        }
    }

    /**
     * Send basic text message helper
     */
    async sendText(msisdn: string, text: string) {
        return this.sendGoogleStyleMessage(msisdn, {
            contentMessage: { text }
        });
    }

    /**
     * Send Rich Card helper
     */
    async sendRichCard(msisdn: string, cardData: any) {
        return this.sendGoogleStyleMessage(msisdn, {
            contentMessage: { richCard: cardData }
        });
    }
}

export const messageService = new MessageService();
