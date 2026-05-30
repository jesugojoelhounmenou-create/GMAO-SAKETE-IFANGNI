import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createTechnicien = async (req, res) => {
    const { nom, prenom, email, telephone, matricule, service, password } = req.body;

    try {
        if (!nom || !email || !password) {
            return res.status(400).json({ message: 'Nom, email et mot de passe sont requis' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email existe deja' });
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

        const { password: _, ...technicienWithoutPassword } = technicien;

        res.status(201).json({ 
            success: true, 
            message: 'Technicien cree avec succes', 
            technicien: technicienWithoutPassword 
        });
    } catch (error) {
        console.error('Erreur creation technicien:', error);
        res.status(500).json({ message: 'Erreur lors de la creation du technicien' });
    }
};

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
                { nom: { contains: search, mode: 'insensitive' } },
                { prenom: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { matricule: { contains: search, mode: 'insensitive' } }
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

        const techniciensWithoutPassword = techniciens.map(({ password, ...rest }) => rest);

        res.json(techniciensWithoutPassword);
    } catch (error) {
        console.error('Erreur liste techniciens:', error);
        res.status(500).json({ message: 'Erreur lors de la recuperation des techniciens' });
    }
};

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
            return res.status(404).json({ message: 'Technicien non trouve' });
        }

        const { password, ...technicienWithoutPassword } = technicien;

        res.json(technicienWithoutPassword);
    } catch (error) {
        console.error('Erreur detail technicien:', error);
        res.status(500).json({ message: 'Erreur lors de la recuperation du technicien' });
    }
};

export const updateTechnicien = async (req, res) => {
    const { id } = req.params;
    const { nom, prenom, email, telephone, service } = req.body;

    try {
        const existing = await prisma.user.findUnique({
            where: { id: parseInt(id), role: 'TECHNICIEN' }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Technicien non trouve' });
        }

        const technicien = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { 
                nom: nom || existing.nom,
                prenom: prenom !== undefined ? prenom : existing.prenom,
                email: email || existing.email,
                telephone: telephone !== undefined ? telephone : existing.telephone,
                service: service || existing.service
            }
        });

        const { password, ...technicienWithoutPassword } = technicien;

        res.json({ success: true, message: 'Technicien modifie', technicien: technicienWithoutPassword });
    } catch (error) {
        console.error('Erreur modification technicien:', error);
        res.status(500).json({ message: 'Erreur lors de la modification du technicien' });
    }
};

export const deleteTechnicien = async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await prisma.user.findUnique({
            where: { id: parseInt(id), role: 'TECHNICIEN' }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Technicien non trouve' });
        }

        await prisma.user.delete({ where: { id: parseInt(id) } });
        res.json({ success: true, message: 'Technicien supprime' });
    } catch (error) {
        console.error('Erreur suppression technicien:', error);
        res.status(500).json({ message: 'Erreur lors de la suppression du technicien' });
    }
};

export const enregistrerDepart = async (req, res) => {
    const { id } = req.params;
    const { nouveauHopital, motif, archiveInterventions, rapport } = req.body;

    try {
        if (!nouveauHopital || !motif) {
            return res.status(400).json({ message: 'Nouvel hopital et motif sont requis' });
        }

        const technicien = await prisma.user.findUnique({
            where: { id: parseInt(id), role: 'TECHNICIEN' },
            include: { interventions: true }
        });

        if (!technicien) {
            return res.status(404).json({ message: 'Technicien non trouve' });
        }

        await prisma.user.update({
            where: { id: parseInt(id) },
            data: { statut: 'INACTIF' }
        });

        const depart = await prisma.technicienDepart.create({
            data: {
                technicienId: parseInt(id),
                nouveauHopital,
                motif,
                archiveInterventions: archiveInterventions !== false,
                rapport: rapport || null
            }
        });

        let exportUrl = null;
        if (archiveInterventions) {
            exportUrl = await exporterInterventionsTechnicien(id, technicien.nom);
        }

        res.json({
            success: true,
            message: `Depart de ${technicien.nom} enregistre`,
            depart,
            exportUrl
        });
    } catch (error) {
        console.error('Erreur enregistrement depart:', error);
        res.status(500).json({ message: 'Erreur lors de l\'enregistrement du depart' });
    }
};

const exporterInterventionsTechnicien = async (technicienId, nomTechnicien) => {
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
        console.error('Erreur export interventions:', error);
        return null;
    }
};

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
        console.error('Erreur recuperation departs:', error);
        res.status(500).json({ message: 'Erreur lors de la recuperation des departs' });
    }
};

export const getStatsDeparts = async (req, res) => {
    try {
        const total = await prisma.technicienDepart.count();
        const parMotif = await prisma.technicienDepart.groupBy({
            by: ['motif'],
            _count: true
        });
        res.json({ total, parMotif });
    } catch (error) {
        console.error('Erreur recuperation stats departs:', error);
        res.status(500).json({ message: 'Erreur lors de la recuperation des statistiques' });
    }
};

export const reactiverTechnicien = async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await prisma.user.findUnique({
            where: { id: parseInt(id), role: 'TECHNICIEN' }
        });

        if (!existing) {
            return res.status(404).json({ message: 'Technicien non trouve' });
        }

        const technicien = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { statut: 'ACTIF' }
        });

        const { password, ...technicienWithoutPassword } = technicien;

        res.json({ success: true, message: 'Technicien reactive', technicien: technicienWithoutPassword });
    } catch (error) {
        console.error('Erreur reactivation technicien:', error);
        res.status(500).json({ message: 'Erreur lors de la reactivation du technicien' });
    }
};
