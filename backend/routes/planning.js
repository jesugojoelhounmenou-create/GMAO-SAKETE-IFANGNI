import express from 'express';
import {
  getPlanning,
  addPlanning,
  updatePlanning,
  deletePlanning,
  getMyPlanning
} from '../controllers/planningController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/', verifyToken, isTechnicien, getPlanning);
router.get('/my', verifyToken, isTechnicien, getMyPlanning);
router.post('/add', verifyToken, isTechnicien, addPlanning);
router.put('/:id', verifyToken, isTechnicien, updatePlanning);
router.delete('/:id', verifyToken, isTechnicien, deletePlanning);

export default router;