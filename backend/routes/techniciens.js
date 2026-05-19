import express from 'express';
import {
    createTechnicien,
    getAllTechniciens,
    getTechnicienById,
    updateTechnicien,
    deleteTechnicien,
    enregistrerDepart,
    getDeparts,
    getStatsDeparts,
    reactiverTechnicien
} from '../controllers/technicienController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

// Routes CRUD
router.post('/', verifyToken, isTechnicien, createTechnicien);
router.get('/', verifyToken, isTechnicien, getAllTechniciens);
router.get('/:id', verifyToken, isTechnicien, getTechnicienById);
router.put('/:id', verifyToken, isTechnicien, updateTechnicien);
router.delete('/:id', verifyToken, isTechnicien, deleteTechnicien);

// Routes départs
router.post('/:id/depart', verifyToken, isTechnicien, enregistrerDepart);
router.get('/departs/liste', verifyToken, isTechnicien, getDeparts);
router.get('/departs/stats', verifyToken, isTechnicien, getStatsDeparts);
router.put('/:id/reactiver', verifyToken, isTechnicien, reactiverTechnicien);

export default router;