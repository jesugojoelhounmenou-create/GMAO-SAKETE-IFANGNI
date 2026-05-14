import express from 'express';
import { diagnosticMessage, getDiagnosticHistory } from '../controllers/diagnosticController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

router.post('/message', verifyToken, isTechnicien, diagnosticMessage);
router.get('/history', verifyToken, isTechnicien, getDiagnosticHistory);

export default router;