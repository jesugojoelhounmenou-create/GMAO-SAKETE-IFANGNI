import { body, validationResult } from 'express-validator';

export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Règles de validation
export const registerValidation = [
  body('nom').notEmpty().withMessage('Nom requis'),
  body('email').isEmail().withMessage('Email invalide'),
  body('matricule').notEmpty().withMessage('Matricule requis'),
  body('password').isLength({ min: 6 }).withMessage('Mot de passe minimum 6 caractères'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
];

export const equipmentValidation = [
  body('codeInventaire').notEmpty().withMessage('Code inventaire requis'),
  body('nom').notEmpty().withMessage('Nom requis'),
  body('typeMedical').notEmpty().withMessage('Type médical requis'),
  body('service').notEmpty().withMessage('Service requis'),
];