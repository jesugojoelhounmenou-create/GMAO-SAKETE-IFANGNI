import express from 'express';
import { 
  signalerPanne, 
  getUrgences, 
  prendreEnCharge, 
  terminerIntervention, 
  getHistoriqueEquipement,
  creerIntervention                    // ← AJOUTE CETTE LIGNE
} from '../controllers/maintenanceController.js';
import { verifyToken } from '../middleware/auth.js';
import { isTechnicien } from '../middleware/roleCheck.js';
import prisma from '../config/database.js';

const router = express.Router();

// ============================================
// ROUTE POUR SIGNALER (Soignant ET Technicien)
// ============================================
router.post('/signaler', verifyToken, signalerPanne);

// Créer une intervention (technicien)
router.post('/', verifyToken, isTechnicien, creerIntervention);

// ============================================
// ROUTES TECHNICIEN
// ============================================

// Urgences (pannes en attente)
router.get('/urgences', verifyToken, isTechnicien, getUrgences);

// Mes interventions (technicien connecté)
router.get('/my', verifyToken, isTechnicien, async (req, res) => {
  try {
    const interventions = await prisma.intervention.findMany({
      where: {
        technicienId: req.user.id,
        statut: { in: ['EN_COURS', 'EN_ATTENTE'] }
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
      orderBy: { dateDebut: 'desc' }
    });
    res.json(interventions);
  } catch (error) {
    console.error('Erreur GET /my:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Maintenances correctives avec filtres
router.get('/correctives', verifyToken, isTechnicien, async (req, res) => {
  try {
    const { search, statut, service, priorite } = req.query;
    
    const filters = { type: 'CORRECTIF' };
    if (statut && statut !== '') filters.statut = statut;
    if (service && service !== '') filters.equipement = { service: service };
    if (search) {
      filters.OR = [
        { equipement: { nom: { contains: search, mode: 'insensitive' } } },
        { diagnostic: { contains: search, mode: 'insensitive' } },
        { signalement: { description: { contains: search, mode: 'insensitive' } } }
      ];
    }
    
    const interventions = await prisma.intervention.findMany({
      where: filters,
      include: {
        equipement: {
          select: {
            id: true,
            nom: true,
            codeInventaire: true,
            service: true
          }
        },
        signalement: {
          include: {
            signalePar: {
              select: { id: true, nom: true, service: true }
            }
          }
        }
      },
      orderBy: { dateDebut: 'desc' }
    });
    
    res.json(interventions);
  } catch (error) {
    console.error('Erreur GET /correctives:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Prendre en charge
router.put('/:id/prendre', verifyToken, isTechnicien, prendreEnCharge);

// Terminer intervention
router.put('/:id/terminer', verifyToken, isTechnicien, terminerIntervention);

// Historique par équipement
router.get('/historique/:equipementId', verifyToken, isTechnicien, getHistoriqueEquipement);

// Historique complet avec filtres
router.get('/historique-complet', verifyToken, isTechnicien, async (req, res) => {
    const { search, statut, type, dateDebut, dateFin } = req.query;
    try {
        const filters = {};
        if (statut) filters.statut = statut;
        if (type) filters.type = type;
        if (dateDebut || dateFin) {
            filters.dateDebut = {};
            if (dateDebut) filters.dateDebut.gte = new Date(dateDebut);
            if (dateFin) filters.dateDebut.lte = new Date(dateFin);
        }
        if (search) {
            filters.OR = [
                { equipement: { nom: { contains: search } } },
                { equipement: { codeInventaire: { contains: search } } },
                { technicien: { nom: { contains: search } } }
            ];
        }
        const interventions = await prisma.intervention.findMany({
            where: filters,
            include: { equipement: true, technicien: true, signalement: true },
            orderBy: { dateDebut: 'desc' }
        });
        res.json(interventions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;