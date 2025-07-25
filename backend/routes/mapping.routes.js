// routes/mapping.routes.js
const express = require('express');
const router = express.Router();
const MappingController = require('../controllers/mapping.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
/**
 * Importa los middlewares de validación para la entidad mapping.
 * 
 * @module middlewares/validation.middleware
 * @property {Function} mappingValidation - Middleware para validar datos de mapping.
 * @property {Function} validate - Middleware genérico para validar solicitudes.
 */
const { mappingValidation, validate } = require('../middlewares/mapping.middlewares');

// Rutas protegidas con validación
router.post('/', authenticateToken, mappingValidation, validate, MappingController.create);
router.get('/', authenticateToken, MappingController.getAll);
router.put('/:id_mapping', authenticateToken, mappingValidation, validate, MappingController.update);
router.delete('/:id_mapping', authenticateToken, MappingController.delete);

module.exports = router;
