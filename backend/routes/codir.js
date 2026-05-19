import express from 'express';
import { getCodirIndicators, generatePDFRapport, exportToExcel, getRapportsList } from '../controllers/codirController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/indicators', verifyToken, isTechnicien, getCodirIndicators);
router.get('/rapports', verifyToken, isTechnicien, getRapportsList);
router.get('/pdf/:rapportId', verifyToken, isTechnicien, generatePDFRapport);
router.get('/export-excel', verifyToken, isTechnicien, exportToExcel);

export default router;