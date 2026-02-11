import { Router } from 'express';
import { templateController } from '../controllers/templateController';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';

// Configure Multer for file uploads
const upload = multer({ dest: 'uploads/' });

const router = Router();

// Apply auth middleware
router.use(authMiddleware);

router.post('/', templateController.create);
router.get('/', templateController.list);
router.delete('/:id', templateController.delete);
router.post('/upload', upload.single('file'), templateController.uploadMedia);

export default router;
