const express = require('express');
const router = express.Router();
const EstadoController = require('../controllers/estado.controller');
//const { validateMapping } = require('../middlewares/defaultMapping.middleware');
const { authenticateToken } = require('../middlewares/auth.middleware'); // suponiendo que ya lo usas


router.get('/', authenticateToken, EstadoController.getAllEstados)
module.exports = router;
