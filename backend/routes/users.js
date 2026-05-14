import express from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';

const router = express.Router();

router.get('/', verifyToken, isTechnicien, getAllUsers);
router.get('/:id', verifyToken, isTechnicien, getUserById);
router.put('/:id', verifyToken, isTechnicien, updateUser);
router.delete('/:id', verifyToken, isTechnicien, deleteUser);

export default router;