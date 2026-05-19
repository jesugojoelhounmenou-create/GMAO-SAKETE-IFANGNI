import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// CRUD TECHNICIENS
// ============================================

// Créer un nouveau technicien
export const createTechnicien = async (req, res) => {
    const { nom, prenom, email, telephone, matricule, service, password } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email existe déjà' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const matriculeFinal = matricule || `TECH-${Date.now()}`;

        const technicien = await prisma.user.create({
            data: {
                nom,
                prenom: prenom || null,
                email,
                matricule: matriculeFinal,
                telephone: telephone || null,
                service: service || 'MAINTENANCE',
                password: hashedPassword,
                role: 'TECHNICIEN',
                statut: 'ACTIF'
            }
        });

        res.status(201).json({ 
            success: true, 
            message: 'Technicien créé avec succès', 
            technicien 
        });
    } catch (error) {
        console.error('Erreur création technicien:', error);
        res.status(500).json({ message: 'Erreur lors de la création' });
    }
};

// Liste tous les techniciens
export const getAllTechniciens = async (req, res) => {
    const { archived, search } = req.query;

    try {
        const where = { role: 'TECHNICIEN' };
        
        if (archived === 'true') {
            where.statut = 'INACTIF';
        } else if (archived === 'false') {
            where.statut = 'ACTIF';
        }

        if (search) {
            where.OR = [
                { nom: { contains: search } },
                { prenom: { contains: search } },
                { email: { contains: search } },
                { matricule: { contains: search } }
            ];
        }

        const techniciens = await prisma.user.findMany({
            where,
            include: {
                interventions: {
                    take: 5,
                    orderBy: { dateDebut: 'desc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(techniciens);
    } catch (error) {
        console.error('Erreur liste techniciens:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
};

// Détail d'un technicien
export const getTechnicienById = async (req, res) => {
    const { id } = req.params;

    try {
        const technicien = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: {
                interventions: {
                    orderBy: { dateDebut: 'desc' },
                    include: {
                        equipement: { select: { nom: true, codeInventaire: true, service: true } }
                    }
                },
                planningGardes: true
            }
        });

        if (!technicien || technicien.role !== 'TECHNICIEN') {
            return res.status(404).json({ message: 'Technicien non trouvé' });
        }

        res.json(technicien);
    } catch (error) {
        console.error('Erreur détail technicien:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
};

// Modifier un technicien
export const updateTechnicien = async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, email, telephone, service } = req.body;

    try {
        const technicien = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { nom, prenom, email, telephone, service }
        });

        res.json({ success: true, message: 'Technicien modifié', technicien });
    } catch (error) {
        console.error('Erreur modification:', error);
        res.status(500).json({ message: 'Erreur lors de la modification' });
    }
};

// Supprimer un technicien
export const deleteTechnicien = async (req, res) => {
    const { id } = req.params;

    try {
        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Technicien supprimé' });
    } catch (error) {
        console.error('Erreur suppression:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression' });
    }
};

// ============================================
// GESTION DES DÉPARTS (MUTATION)
// ============================================

// Enregistrer le départ d'un technicien
export const enregistrerDepart = async (req, res) => {
    const { id } = req.params;
    const { nouveauHopital, motif, archiveInterventions, rapport } = req.body;

    try {
        const technicien = await prisma.user.findUnique({
            where: { id: parseInt(id) },
            include: { interventions: true }
        });

        if (!technicien) {
            return res.status(404).json({ message: 'Technicien non trouvé' });
        }

        // Désactiver le compte
        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { statut: 'INACTIF' }
        });

        // Enregistrer le départ
        const depart = await prisma.technicienDepart.create({
            data: {
                technicienId: parseInt(id),
                nouveauHopital,
                motif,
                archiveInterventions: archiveInterventions !== false,
                rapport: rapport || null
            }
        });

        // Exporter les interventions si demandé
        let exportUrl = null;
        if (archiveInterventions) {
            exportUrl = await exporterInterventionsTechnicien(id, technicien.nom);
        }

        res.json({
            success: true,
            message: `Départ de ${technicien.nom} enregistré`,
            depart,
            exportUrl
        });
    } catch (error) {
        console.error('Erreur départ:', error);
        res.status(500).json({ message: 'Erreur lors de l\'enregistrement' });
    }
};

// Exporter les interventions d'un technicien
export const exporterInterventionsTechnicien = async (technicienId, nomTechnicien) => {
    try {
        const interventions = await prisma.intervention.findMany({
            where: { technicienId: parseInt(technicienId) },
            include: {
                equipement: { select: { nom: true, codeInventaire: true, service: true } },
                signalement: { select: { description: true, priorite: true, dateSignalement: true } }
            },
            orderBy: { dateDebut: 'desc' }
        });

        const exportData = {
            technicien: nomTechnicien,
            dateExport: new Date().toISOString(),
            totalInterventions: interventions.length,
            interventions: interventions.map(i => ({
                id: i.id,
                equipement: i.equipement?.nom,
                codeInventaire: i.equipement?.codeInventaire,
                service: i.equipement?.service,
                type: i.type,
                diagnostic: i.diagnostic,
                dateDebut: i.dateDebut,
                dateFin: i.dateFin,
                dureeMinutes: i.dureeMinutes,
                statut: i.statut
            }))
        };

        const exportDir = path.join(__dirname, '../uploads/exports');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        const filename = `export_technicien_${technicienId}_${Date.now()}.json`;
        const filepath = path.join(exportDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));
        
        return `/uploads/exports/${filename}`;
    } catch (error) {
        console.error('Erreur export:', error);
        return null;
    }
};

// Liste des départs
export const getDeparts = async (req, res) => {
    try {
        const departs = await prisma.technicienDepart.findMany({
            include: {
                technicien: {
                    select: { id: true, nom: true, prenom: true, email: true, matricule: true }
                }
            },
            orderBy: { dateDepart: 'desc' }
        });
        res.json(departs);
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
};

// Statistiques des départs
export const getStatsDeparts = async (req, res) => {
    try {
        const total = await prisma.technicienDepart.count();
        const parMotif = await prisma.technicienDepart.groupBy({
            by: ['motif'],
            _count: true
        });
        res.json({ total, parMotif });
    } catch (error) {
        console.error('Erreur:', error);
        res.status(500).json({ message: 'Erreur lors de la récupération' });
    }
};

// Réactiver un technicien (annuler départ)
export const reactiverTechnicien = async (req, res) => {
    const { id } = req.params;

    try {
        const technicien = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { statut: 'ACTIF' }
        });
        res.json({ success: true, message: 'Technicien réactivé', technicien });
    } catch (error) {
        console.error('Erreur réactivation:', error);
        res.status(500).json({ message: 'Erreur lors de la réactivation' });
    }
};