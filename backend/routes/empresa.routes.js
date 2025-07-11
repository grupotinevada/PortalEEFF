// routes/empresa.routes.js
const express = require('express');
const router = express.Router();
const EmpresaController = require('../controllers/empresa.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
/**
 * Importa los middlewares de validación para la entidad empresa.
 * 
 * @module middlewares/validation.middleware
 * @property {Function} empresaValidation - Middleware para validar datos de empresa.
 * @property {Function} validate - Middleware genérico para validar solicitudes.
 */
const { empresaValidation, validate } = require('../middlewares/empresa.middlewares');

// Rutas protegidas con validación
router.post('/', authenticateToken, empresaValidation, validate, EmpresaController.create);
router.get('/', authenticateToken, EmpresaController.getAll);
router.put('/:id_empresa', authenticateToken, empresaValidation, validate, EmpresaController.update);
router.delete('/:id_empresa', authenticateToken, EmpresaController.delete);

module.exports = router;
