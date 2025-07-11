const { body, validationResult } = require('express-validator');

const authValidation = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres')
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: errors.array()
    });
  }
  next();
};

module.exports = { authValidation, validate };