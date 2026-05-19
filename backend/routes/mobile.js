import express from 'express';
import {
  getMobileDashboard,
  getMobileInterventions,
  getMobileInterventionDetail,
  updateMobileIntervention,
  prendreEnChargeMobile,
  scanQRCodeMobile,
  getMobileEquipements,
  getMobileEquipementDetail,
  getMobileAlertes,
  getMobileStats,
  getMobileProfil,
  updateMobilePosition,
  registerPushToken
} from '../controllers/mobileController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

// Toutes les routes mobiles sont protégées et réservées au technicien
router.use(verifyToken, isTechnicien);

// Dashboard
router.get('/dashboard', getMobileDashboard);

// Interventions
router.get('/interventions', getMobileInterventions);
router.get('/interventions/:id', getMobileInterventionDetail);
router.put('/interventions/:id', updateMobileIntervention);
router.put('/interventions/:id/prendre', prendreEnChargeMobile);

// Scan QR
router.post('/scan-qr', scanQRCodeMobile);

// Équipements
router.get('/equipements', getMobileEquipements);
router.get('/equipements/:id', getMobileEquipementDetail);

// Alertes
router.get('/alertes', getMobileAlertes);

// Statistiques
router.get('/stats', getMobileStats);

// Profil
router.get('/profil', getMobileProfil);
router.post('/position', updateMobilePosition);
router.post('/push-token', registerPushToken);

export default router;