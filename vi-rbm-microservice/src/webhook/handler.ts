import { WebhookEvent, WebhookEventType } from '../types/vi-rbm';
import { config } from '../config/env';
import crypto from 'crypto';

class WebhookHandler {

    /**
     * Verify Webhook Signature (If applicable)
     * Vi RBM / Google RBM often uses a secret to sign the body.
     */
    public verifySignature(signature: string, body: any): boolean {
        if (!config.viRbm.webhookSecret) return true; // Skip if no secret configured

        const hmac = crypto.createHmac('sha256', config.viRbm.webhookSecret);
        const digest = hmac.update(JSON.stringify(body)).digest('base64');
        return signature === digest;
    }

    /**
     * Handle Incoming Webhook
     */
    public async handleEvent(body: any) {
        // RBM payloads often come as a list of events or a single event wrapper
        // We assume a standard structure: { senderPhoneNumber, messageId, ... }

        const event = body; // Simplified, in reality might need extracting from `userEvent` or `agentEvent`
        console.log('📨 Received Webhook Event:', JSON.stringify(event, null, 2));

        if (event.contentMessage) {
            await this.handleUserMessage(event);
        } else if (event.eventType === 'READ' || event.eventType === 'DELIVERED') {
            await this.handleMessageStatus(event);
        } else if (event.suggestionResponse) {
            await this.handleSuggestionResponse(event);
        } else {
            console.log('ℹ️ Unhandled Event Type:', event.eventType || 'Unknown');
        }
    }

    private async handleUserMessage(event: any) {
        const text = event.contentMessage.text;
        const sender = event.senderPhoneNumber;
        console.log(`💬 User (${sender}) says: ${text}`);
        // Application logic: Trigger bot response, save to DB, etc.
    }

    private async handleSuggestionResponse(event: any) {
        const payload = event.suggestionResponse.postbackData;
        console.log(`👆 User clicked suggestion: ${payload}`);
        // Application logic: Handle button click
    }

    private async handleMessageStatus(event: any) {
        console.log(`✅ Message ${event.messageId} status: ${event.eventType}`);
        // Application logic: Update analytics
    }
}

export const webhookHandler = new WebhookHandler();
