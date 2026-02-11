import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Implement your API key or Bearer token check here
    // intended for YOUR clients calling THIS microservice

    const token = req.headers['authorization'];

    // Simple check example
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify token logic...
    next();
};
