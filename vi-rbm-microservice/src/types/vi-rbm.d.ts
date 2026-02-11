export interface ViRbmConfig {
    serverRoot: string;
    authUrl: string;
    clientId: string;
    clientSecret: string;
    botId: string;
    webhookSecret?: string;
}

// --- Template Interfaces ---

export interface TemplateButton {
    type: 'reply' | 'url_action' | 'dialer_action' | 'calendar_event' | 'view_location';
    displayText: string;
    postback: string;
    url?: string;
    phoneNumber?: string;
    startTime?: string;
    endTime?: string;
    title?: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    label?: string;
}

export interface RichCardData {
    orientation: 'VERTICAL' | 'HORIZONTAL';
    height: 'SHORT_HEIGHT' | 'MEDIUM_HEIGHT';
    mediaUrl: string;
    title?: string;
    description?: string;
    buttons?: TemplateButton[];
}

export interface CarouselCard {
    mediaUrl: string;
    title: string;
    description: string;
    buttons?: TemplateButton[];
}

export interface CarouselData {
    width: 'SMALL_WIDTH' | 'MEDIUM_WIDTH';
    cardCount: number;
    cards: CarouselCard[];
}

export interface RcsTemplateSubmission {
    name: string;
    type: 'text_message' | 'rich_card' | 'carousel';
    botId?: string; // Optional if handled by service
    textMessageContent?: string;
    standAlone?: {
        cardTitle?: string;
        cardDescription?: string;
        mediaUrl?: string; // Internal URL or RBM File URL
        thumbnailUrl?: string;
        orientation?: 'VERTICAL' | 'HORIZONTAL';
        height?: 'SHORT_HEIGHT' | 'MEDIUM_HEIGHT';
        suggestions?: any[];
    };
    carouselList?: {
        width: 'SMALL_WIDTH' | 'MEDIUM_WIDTH';
        cards: CarouselCard[];
    };
    suggestions?: any[]; // Global suggestions for text/rich card
}

// --- Message Interfaces ---

export interface RcsMessagePayload {
    msisdn: string; // User Phone Number
    contentMessage?: {
        text?: string;
        richCard?: any;
        carousel?: any;
        suggestions?: any[];
    };
    revocationStop?: boolean; // For revoking messages
}

export interface GoogleStyleMessage {
    contentMessage: {
        text?: string;
        file?: {
            fileUrl: string;
            thumbnailUrl?: string;
        };
        richCard?: any;
        carousel?: any;
        suggestions?: any[];
    };
    rcsBody?: {
        // Fallback or specific fields
    };
}

// --- Webhook Interfaces ---

export type WebhookEventType = 'user_message' | 'message_status' | 'template_callback' | 'billing_event';

export interface WebhookEvent {
    senderPhoneNumber: string;
    timestamp: string;
    messageId: string;
    eventType: WebhookEventType;
    textMessage?: string;
    suggestionResponse?: {
        postbackData: string;
        text: string;
    };
    userFile?: {
        payload: {
            fileUrl: string;
            mimeType: string;
            fileName: string;
        };
    };
    status?: 'DELIVERED' | 'READ' | 'FAILED';
}
