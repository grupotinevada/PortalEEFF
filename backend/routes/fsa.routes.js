const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validation.middleware');
const FsaController = require('../controllers/fsa.controller');


router.get('/', authenticateToken, validate, FsaController.obtenerFsasConCategoria);
router.post('/create', authenticateToken, validate, FsaController.createFsa);

module.exports = router;