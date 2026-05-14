import express from 'express';
import {
  getPreventives,
  getPreventiveById,
  addPreventive,
  updatePreventive,
  deletePreventive,
  realiserPreventive,
  getStatsPreventives
} from '../controllers/preventiveController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';
import prisma from '../config/database.js';

const router = express.Router();

// Liste des maintenances préventives
router.get('/', verifyToken, isTechnicien, getPreventives);

// Statistiques
router.get('/stats', verifyToken, isTechnicien, getStatsPreventives);

// Préventives à venir (version directe sans controller)
router.get('/a-venir', verifyToken, isTechnicien, async (req, res) => {
    try {
        const { jours = 7 } = req.query;
        const dateLimite = new Date();
        dateLimite.setDate(dateLimite.getDate() + parseInt(jours));
        
        const preventives = await prisma.maintenancePreventive.findMany({
            where: {
                statut: 'PREVU',
                prochaineRealisation: { lte: dateLimite }
            },
            include: {
                equipement: {
                    select: {
                        id: true,
                        nom: true,
                        codeInventaire: true,
                        service: true
                    }
                }
            },
            orderBy: { prochaineRealisation: 'asc' }
        });
        
        const aujourdhui = new Date();
        aujourdhui.setHours(0, 0, 0, 0);
        const demain = new Date(aujourdhui);
        demain.setDate(demain.getDate() + 1);
        
        res.json({
            aujourdhui: preventives.filter(p => p.prochaineRealisation < demain),
            cetteSemaine: preventives.filter(p => p.prochaineRealisation >= demain && p.prochaineRealisation <= dateLimite),
            total: preventives.length
        });
    } catch (error) {
        console.error('Erreur GET /a-venir:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// Détail d'une préventive
router.get('/:id', verifyToken, isTechnicien, getPreventiveById);

// Ajouter
router.post('/add', verifyToken, isTechnicien, addPreventive);

// Modifier
router.put('/:id', verifyToken, isTechnicien, updatePreventive);

// Supprimer
router.delete('/:id', verifyToken, isTechnicien, deletePreventive);

// Réaliser
router.post('/:id/realiser', verifyToken, isTechnicien, realiserPreventive);

export default router;