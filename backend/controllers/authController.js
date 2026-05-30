import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { sendWelcomeEmail, sendValidationEmail } from '../config/email.js';
import { generateMatricule } from '../utils/matricule.js';
import { sendValidationSMS } from '../config/sms.js';

export const register = async (req, res) => {
    const { nom, prenom, email, telephone, service, password } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est deja utilise' });
        }

        const matricule = generateMatricule(nom, prenom || '');

        const hashedPassword = await bcrypt.hash(password, 10);

        let role = 'SOIGNANT';
        let statut = 'EN_ATTENTE';
        if (email === 'tech.biomedical@hopital.bj') {
            role = 'TECHNICIEN';
            statut = 'ACTIF';
        }

        const user = await prisma.user.create({
            data: {
                nom,
                prenom: prenom || null,
                email,
                matricule,
                telephone: telephone || null,
                service: service || null,
                password: hashedPassword,
                role: role,
                statut: statut,
            },
        });

        try {
            await sendWelcomeEmail(user, password);
        } catch (emailError) {
            console.log('Email non envoye:', emailError.message);
        }

        res.status(201).json({
            message: 'Inscription reussie. Vous pouvez vous connecter.',
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                matricule: user.matricule,
                role: user.role,
                statut: user.statut,
            },
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(500).json({ message: 'Erreur lors de l\'inscription' });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        if (user.statut === 'EN_ATTENTE') {
            return res.status(401).json({
                message: 'Votre compte est en attente de validation par le technicien.'
            });
        }

        if (user.statut === 'INACTIF') {
            return res.status(401).json({ message: 'Votre compte a ete desactive.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { dernierConnexion: new Date() },
        });

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '30d' }
        );

        res.json({
            message: 'Connexion reussie',
            token,
            user: {
                id: user.id,
                nom: user.nom,
                email: user.email,
                role: user.role,
                service: user.service,
            },
        });
    } catch (error) {
        console.error('Erreur connexion:', error);
        res.status(500).json({ message: 'Erreur lors de la connexion' });
    }
};

export const validateUser = async (req, res) => {
    const { userId } = req.params;
    const technicienId = req.user.id;

    try {
        const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: {
                statut: 'ACTIF',
                valideParId: technicienId,
                dateValidation: new Date(),
            },
        });

        try {
            await sendValidationEmail(user);
            if (user.telephone) {
                await sendValidationSMS(user);
            }
        } catch (notifError) {
            console.log('Notification non envoyee:', notifError.message);
        }

        res.json({ message: 'Compte valide avec succes', user });
    } catch (error) {
        console.error('Erreur validation:', error);
        res.status(500).json({ message: 'Erreur lors de la validation' });
    }
};

export const rejectUser = async (req, res) => {
    const { userId } = req.params;

    try {
        await prisma.user.delete({ where: { id: parseInt(userId) } });
        res.json({ message: 'Inscription rejetee' });
    } catch (error) {
        console.error('Erreur rejet:', error);
        res.status(500).json({ message: 'Erreur lors du rejet' });
    }
};

export const toggleUserStatus = async (req, res) => {
    const { userId } = req.params;
    const { actif } = req.body;

    try {
        const user = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: { statut: actif ? 'ACTIF' : 'INACTIF' },
        });

        res.json({ message: `Compte ${actif ? 'active' : 'desactive'}`, user });
    } catch (error) {
        console.error('Erreur toggle:', error);
        res.status(500).json({ message: 'Erreur lors de l\'operation' });
    }
};

export const refreshToken = async (req, res) => {
    const user = req.user;
    
    const newToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: '30d' }
    );
    
    res.json({ 
        token: newToken,
        expiresIn: 30 * 24 * 60 * 60 * 1000
    });
};

export const verifyToken = async (req, res) => {
    res.json(req.user);
};
