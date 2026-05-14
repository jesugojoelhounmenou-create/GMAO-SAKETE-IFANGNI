import express from 'express';
import { 
  getFournisseurs, 
  getFournisseurById, 
  addFournisseur, 
  updateFournisseur, 
  deleteFournisseur 
} from '../controllers/fournisseurController.js';  // ← fournisseurController (sans s)
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/', verifyToken, isTechnicien, getFournisseurs);
router.get('/:id', verifyToken, isTechnicien, getFournisseurById);
router.post('/add', verifyToken, isTechnicien, addFournisseur);
router.put('/:id', verifyToken, isTechnicien, updateFournisseur);
router.delete('/:id', verifyToken, isTechnicien, deleteFournisseur);

export default router;