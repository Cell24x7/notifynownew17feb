import { Router } from 'express';
import { messageController } from '../controllers/messageController';
import { authMiddleware } from '../middleware/authMiddleware'; // Assuming standard auth middleware

const router = Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

router.post('/text', messageController.sendText);
router.post('/rich-card', messageController.sendRichCard);
router.post('/custom', messageController.sendCustom);

export default router;
