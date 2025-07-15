const { body, checkSchema, validationResult } = require('express-validator');

const balanceValidation = [
  body('num_cuenta').notEmpty().withMessage('num_cuenta es obligatorio'),
  body('nombre_conjunto').notEmpty().withMessage('nombre_conjunto es obligatorio'),
  body('nombre').notEmpty().withMessage('nombre es obligatorio'),
  body('saldo').isNumeric().withMessage('saldo debe ser un número'),
  body('ejercicio').notEmpty().isLength({ min: 4, max: 4 }).withMessage('ejercicio debe tener 4 dígitos'),
  body('fecha_inicio').isISO8601().withMessage('fecha_inicio debe ser una fecha válida'),
  body('fecha_fin').isISO8601().withMessage('fecha_fin debe ser una fecha válida'),
  body('id_user').optional().isInt().withMessage('id_user debe ser un número entero'),
  body('id_empresa').notEmpty().withMessage('id_empresa es obligatorio'),
  body('id_fsa').optional().isString().isLength({ min: 6, max: 6 }).withMessage('id_fsa debe tener 6 caracteres')
];

// ✅ Nuevo middleware para validar array de balances
const bulkBalanceValidation = [
  body().isArray({ min: 1 }).withMessage('Debe enviar un array con al menos un balance'),
  body('*.num_cuenta').notEmpty().withMessage('num_cuenta es obligatorio'),
  body('*.nombre_conjunto').notEmpty().withMessage('nombre_conjunto es obligatorio'),
  body('*.nombre').notEmpty().withMessage('nombre es obligatorio'),
  body('*.saldo').isNumeric().withMessage('saldo debe ser un número'),
  body('*.ejercicio').notEmpty().isLength({ min: 4, max: 4 }).withMessage('ejercicio debe tener 4 dígitos'),
  body('*.fecha_inicio').isISO8601().withMessage('fecha_inicio debe ser una fecha válida'),
  body('*.fecha_fin').isISO8601().withMessage('fecha_fin debe ser una fecha válida'),
  body('*.id_user').optional().isInt().withMessage('id_user debe ser un número entero'),
  body('*.id_empresa').notEmpty().withMessage('id_empresa es obligatorio'),
  body('*.id_fsa').optional().isString().isLength({ min: 6, max: 6 }).withMessage('id_fsa debe tener 6 caracteres')
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