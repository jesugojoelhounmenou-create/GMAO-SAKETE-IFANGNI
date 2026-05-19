import express from 'express';
import {
  getAlertes,
  getAlerteById,
  resoudreAlerte,
  getAlertesNonResolues,
  getStatsAlertes
} from '../controllers/alerteController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/', verifyToken, isTechnicien, getAlertes);
router.get('/stats', verifyToken, isTechnicien, getStatsAlertes);
router.get('/non-resolues', verifyToken, isTechnicien, getAlertesNonResolues);
router.get('/:id', verifyToken, isTechnicien, getAlerteById);
router.put('/:id/resoudre', verifyToken, isTechnicien, resoudreAlerte);

export default router;