import { Request, Response } from 'express';
import { messageService } from '../services/MessageService';

export const messageController = {
    sendText: async (req: Request, res: Response) => {
        try {
            const { msisdn, text } = req.body;
            const result = await messageService.sendText(msisdn, text);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    sendRichCard: async (req: Request, res: Response) => {
        try {
            const { msisdn, cardData } = req.body;
            const result = await messageService.sendRichCard(msisdn, cardData);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    sendCustom: async (req: Request, res: Response) => {
        try {
            const { msisdn, payload } = req.body;
            // Depending on structure, could be google style or GSMA
            const result = await messageService.sendGoogleStyleMessage(msisdn, payload);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
};
