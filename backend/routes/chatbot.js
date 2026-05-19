import express from 'express';
import { chatbotMessage, chatbotCreateSignalement } from '../controllers/chatbotController.js';
import { verifyToken } from '../middleware/auth.js';
import { isSoignant } from '../middleware/roleCheck.js';

const router = express.Router();

router.post('/message', verifyToken, isSoignant, chatbotMessage);
router.post('/signaler', verifyToken, isSoignant, chatbotCreateSignalement);

export default router;