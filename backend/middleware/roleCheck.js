export const isTechnicien = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Utilisateur non authentifie' 
    });
  }

  if (req.user.role !== 'TECHNICIEN') {
    return res.status(403).json({ 
      message: 'Acces refuse. Reserve aux techniciens biomedicaux.' 
    });
  }
  next();
};

export const isSoignant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Utilisateur non authentifie' 
    });
  }

  if (req.user.role !== 'SOIGNANT' && req.user.role !== 'TECHNICIEN') {
    return res.status(403).json({ 
      message: 'Acces refuse. Reserve au personnel soignant.' 
    });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      message: 'Utilisateur non authentifie' 
    });
  }

  if (req.user.role !== 'TECHNICIEN') {
    return res.status(403).json({ 
      message: 'Acces refuse. Droits administrateur requis.' 
    });
  }
  next();
};
