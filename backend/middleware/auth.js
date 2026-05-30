import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Acces non autorise. Token manquant.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true, statut: true, nom: true, email: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'Utilisateur inexistant' });
    }

    if (user.statut !== 'ACTIF') {
      return res.status(401).json({ message: 'Compte inactif. Veuillez contacter l\'administrateur.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expire. Veuillez vous reconnecter.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ message: 'Token invalide.' });
    }
    console.error('Erreur verification token:', error);
    return res.status(500).json({ message: 'Erreur lors de la verification du token' });
  }
};
