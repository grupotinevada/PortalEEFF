const express = require('express');
const router = express.Router();
const DefaultMappingController = require('../controllers/defaultMapping.controller');
const { validateMapping } = require('../middlewares/defaultMapping.middleware');
const { authenticateToken } = require('../middlewares/auth.middleware'); // suponiendo que ya lo usas

router.get('/', authenticateToken, DefaultMappingController.getAll);
router.post('/', authenticateToken, validateMapping, DefaultMappingController.create);
router.put('/', authenticateToken, validateMapping, DefaultMappingController.update);

module.exports = router;
