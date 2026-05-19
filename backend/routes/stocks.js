import express from 'express';
import { 
  getAllPieces, 
  addPiece, 
  updatePiece, 
  deletePiece, 
  mouvementStock, 
  checkStock, 
  getStockStats 
} from '../controllers/stockController.js';  // ← stockController (ok)
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

// Routes protégées (technicien uniquement)
router.get('/', verifyToken, isTechnicien, getAllPieces);
router.get('/stats', verifyToken, isTechnicien, getStockStats);
router.get('/check/:pieceCode', verifyToken, isTechnicien, checkStock);
router.post('/add', verifyToken, isTechnicien, addPiece);
router.put('/:id', verifyToken, isTechnicien, updatePiece);
router.delete('/:id', verifyToken, isTechnicien, deletePiece);
router.post('/mouvement', verifyToken, isTechnicien, mouvementStock);

export default router;