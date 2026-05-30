import { body, validationResult, param, query } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg
      }))
    });
  }
  next();
};

// Validation inscription
export const registerValidation = [
  body('nom')
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 2, max: 50 }).withMessage('Le nom doit contenir entre 2 et 50 caracteres'),
  body('prenom')
    .optional()
    .isLength({ max: 50 }).withMessage('Le prenom est trop long'),
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('matricule')
    .notEmpty().withMessage('Le matricule est requis'),
  body('password')
    .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caracteres'),
  body('telephone')
    .optional()
    .matches(/^(\+229|0)[0-9]{8,9}$/).withMessage('Numero de telephone invalide (ex: +229XXXXXXXX)'),
  body('service')
    .optional()
];

// Validation connexion
export const loginValidation = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Le mot de passe est requis')
];

// Validation equipement
export const equipmentValidation = [
  body('codeInventaire')
    .notEmpty().withMessage('Le code inventaire est requis')
    .isLength({ max: 50 }).withMessage('Code inventaire trop long'),
  body('nom')
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ min: 2, max: 100 }).withMessage('Le nom doit contenir entre 2 et 100 caracteres'),
  body('typeMedical')
    .notEmpty().withMessage('Le type medical est requis')
    .isIn(['IMAGERIE', 'MONITORING', 'RESPIRATION', 'LABORATOIRE', 'CHIRURGIE', 'STERILISATION', 'AUTRE'])
    .withMessage('Type medical invalide'),
  body('service')
    .notEmpty().withMessage('Le service est requis'),
  body('marque')
    .optional(),
  body('modele')
    .optional(),
  body('numeroSerie')
    .optional(),
  body('criticite')
    .optional()
    .isIn(['CRITIQUE', 'HAUTE', 'MOYENNE', 'BASSE']).withMessage('Criticite invalide'),
  body('dateMiseService')
    .optional()
    .isISO8601().withMessage('Date de mise en service invalide'),
  body('garantieFin')
    .optional()
    .isISO8601().withMessage('Date de fin de garantie invalide')
];

// Validation intervention
export const interventionValidation = [
  body('equipementId')
    .notEmpty().withMessage('L\'equipement est requis')
    .isInt({ min: 1 }).withMessage('ID equipement invalide'),
  body('description')
    .notEmpty().withMessage('La description est requise')
    .isLength({ min: 5, max: 1000 }).withMessage('La description doit contenir entre 5 et 1000 caracteres'),
  body('priorite')
    .optional()
    .isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorite invalide')
];

// Validation signalement
export const signalementValidation = [
  body('equipementId')
    .notEmpty().withMessage('L\'equipement est requis')
    .isInt({ min: 1 }).withMessage('ID equipement invalide'),
  body('description')
    .notEmpty().withMessage('La description est requise')
    .isLength({ min: 5, max: 1000 }).withMessage('La description doit contenir entre 5 et 1000 caracteres'),
  body('priorite')
    .optional()
    .isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorite invalide')
];

// Validation piece de stock
export const pieceValidation = [
  body('code')
    .notEmpty().withMessage('Le code piece est requis')
    .isLength({ max: 50 }).withMessage('Code trop long'),
  body('designation')
    .notEmpty().withMessage('La designation est requise')
    .isLength({ min: 2, max: 100 }).withMessage('La designation doit contenir entre 2 et 100 caracteres'),
  body('categorie')
    .optional()
    .isIn(['ELECTRONIQUE', 'MECANIQUE', 'CONSOMMABLE', 'SONDE', 'CABLE', 'BATTERIE', 'CARTE_MERE', 'AUTRE']),
  body('quantiteStock')
    .optional()
    .isInt({ min: 0 }).withMessage('La quantite doit etre un nombre positif'),
  body('prixUnitaire')
    .optional()
    .isFloat({ min: 0 }).withMessage('Le prix doit etre un nombre positif')
];

// Validation planning
export const planningValidation = [
  body('technicienId')
    .notEmpty().withMessage('Le technicien est requis')
    .isInt({ min: 1 }).withMessage('ID technicien invalide'),
  body('date')
    .notEmpty().withMessage('La date est requise')
    .isISO8601().withMessage('Date invalide'),
  body('typeGarde')
    .notEmpty().withMessage('Le type de garde est requis')
    .isIn(['JOUR', 'NUIT', 'ASTREINTE', 'WEEKEND']).withMessage('Type de garde invalide')
];

// Validation ID param
export const idParamValidation = [
  param('id')
    .notEmpty().withMessage('L\'ID est requis')
    .isInt({ min: 1 }).withMessage('ID invalide')
];

// Validation pagination
export const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('La page doit etre un nombre positif')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('La limite doit etre comprise entre 1 et 100')
    .toInt()
];

export default {
  validate,
  registerValidation,
  loginValidation,
  equipmentValidation,
  interventionValidation,
  signalementValidation,
  pieceValidation,
  planningValidation,
  idParamValidation,
  paginationValidation
};
