import { Request, Response } from 'express';
import { templateService } from '../services/TemplateService';

export const templateController = {
    create: async (req: Request, res: Response) => {
        try {
            const result = await templateService.createTemplate(req.body);
            res.status(201).json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    list: async (req: Request, res: Response) => {
        try {
            const result = await templateService.listTemplates();
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const result = await templateService.deleteTemplate(req.params.id);
            res.json(result);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    },

    uploadMedia: async (req: Request, res: Response) => {
        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

            const fileId = await templateService.uploadFile(req.file.path, req.file.mimetype);
            res.json({ fileId });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
};
