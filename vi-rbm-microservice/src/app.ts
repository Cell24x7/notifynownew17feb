import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import templateRoutes from './routes/templateRoutes';
import messageRoutes from './routes/messageRoutes';
import { webhookHandler } from './webhook/handler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/templates', templateRoutes);
app.use('/api/messages', messageRoutes);

// Webhook Endpoint (No Auth Middleware usually, or signature verification separate)
app.post('/api/webhooks/vi-rbm', async (req, res) => {
    // Verify signature logic if needed
    // if (!webhookHandler.verifySignature(req.headers['x-goog-signature'], req.body)) ...

    // Process async to return 200 OK quickly to RBM Platform
    webhookHandler.handleEvent(req.body).catch(err => console.error(err));
    res.status(200).send('OK');
});

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', service: 'Vi-RBM-Service' });
});

// Start Server
app.listen(config.server.port, () => {
    console.log(`🚀 Vi RBM Service running on port ${config.server.port}`);
    console.log(`Environment: ${config.server.nodeEnv}`);
});

export default app;
