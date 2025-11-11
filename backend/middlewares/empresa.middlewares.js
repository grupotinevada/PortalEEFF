const { body, validationResult } = require('express-validator');

const empresaValidation = [
  body('descripcion')
    .trim()
    .notEmpty()
    .withMessage('La descripción es obligatoria')
];

/**
 * Middleware para validar los resultados de las validaciones previas en la solicitud.
 * Si existen errores de validación, responde con un estado 400 y un objeto JSON detallando los errores.
 * Si no hay errores, continúa con el siguiente middleware.
 *
 * @param {import('express').Request} req - Objeto de solicitud de Express.
 * @param {import('express').Response} res - Objeto de respuesta de Express.
 * @param {import('express').NextFunction} next - Función para pasar al siguiente middleware.
 */

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

module.exports = {
  empresaValidation,
  validate
};
