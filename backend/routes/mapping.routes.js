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

// Rutas protegidas con validación
router.get('/', authenticateToken, MappingController.findAvailableMappings);
router.get('/:id_mapping', authenticateToken, MappingController.getMappingById);
router.get('/asociar', authenticateToken, MappingController.asignarMapeo)
router.post('/upsert', authenticateToken, MappingController.crearOActualizarMapeo);
router.post('/clone', authenticateToken,  MappingController.cloneMapping);
router.delete('/dlt/:id_mapping', authenticateToken, MappingController.deleteMapping);



module.exports = router;
