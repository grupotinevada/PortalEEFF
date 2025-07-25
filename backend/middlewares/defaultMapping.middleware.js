const { body, validationResult } = require('express-validator');

const validateMapping = [
  body('num_cuenta').notEmpty().withMessage('num_cuenta es obligatorio'),
  body('id_fsa').notEmpty().withMessage('id_fsa es obligatorio'),
  body('id_mapping').notEmpty().withMessage('id_mapping es obligatorio'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateMapping
};
