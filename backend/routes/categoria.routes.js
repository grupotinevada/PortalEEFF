const express = require('express');
const router = express.Router();
const CategoriaController = require('../controllers/categoria.controller');
const { authenticateToken } = require('../middlewares/auth.middleware'); // suponiendo que ya lo usas


router.get('/', authenticateToken, CategoriaController.getAllEstados)
module.exports = router;