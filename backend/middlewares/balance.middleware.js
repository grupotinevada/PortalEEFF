const { body, checkSchema, validationResult } = require('express-validator');

const balanceValidation = [
  body('num_cuenta').notEmpty().withMessage('num_cuenta es obligatorio'),
  body('nombre').notEmpty().withMessage('nombre es obligatorio'),
  body('saldo').isNumeric().withMessage('saldo debe ser un número'),
  body('fecha_procesado').isISO8601().withMessage('fecha_procesado debe ser una fecha válida'),
  body('id_user').isInt().withMessage('id_user debe ser un número entero'),
  body('id_empresa').notEmpty().withMessage('id_empresa es obligatorio')
];

// ✅ Nuevo middleware para validar array de balances
const bulkBalanceValidation = [
  body().isArray({ min: 1 }).withMessage('Debe enviar un array con al menos un balance'),
  body('*.num_cuenta').notEmpty().withMessage('num_cuenta es obligatorio'),
  body('*.nombre').notEmpty().withMessage('nombre es obligatorio'),
  body('*.saldo').isNumeric().withMessage('saldo debe ser un número'),
  body('*.fecha_procesado').isISO8601().withMessage('fecha_procesado debe ser una fecha válida'),
  body('*.id_user').optional().isInt().withMessage('id_user debe ser un número entero'),
  body('*.id_empresa').notEmpty().withMessage('id_empresa es obligatorio'),
  body('*.id_fsa').optional().isInt().withMessage('id_fsa debe ser un número entero')
];

// ✅ Middleware genérico para capturar errores
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

module.exports = {
  balanceValidation,
  bulkBalanceValidation,
  validate
};