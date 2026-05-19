import express from 'express';
import { getTechnicienDashboard, getSoignantDashboard, getMobileDashboard } from '../controllers/dashboardController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien, isSoignant } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/technicien', verifyToken, isTechnicien, getTechnicienDashboard);
router.get('/soignant', verifyToken, isSoignant, getSoignantDashboard);
router.get('/mobile', verifyToken, isTechnicien, getMobileDashboard);

export default router;