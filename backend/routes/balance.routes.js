const express = require('express');
const router = express.Router();
const BalanceController = require('../controllers/balance.controller');

const { authenticateToken } = require('../middlewares/auth.middleware');
const { balanceValidation, bulkBalanceValidation, validate } = require('../middlewares/balance.middleware');


router.post('/', authenticateToken, balanceValidation, validate, BalanceController.create);
router.get('/', authenticateToken, BalanceController.getAll);
router.get('/search', authenticateToken,  BalanceController.getByEmpresaYPeriodoFlexible);
router.post('/bulk', authenticateToken, bulkBalanceValidation, BalanceController.createBulk);

const { pool } = require("../config/database");
// Endpoint rápido para obtener la tabla fsa con join a categoria

router.get('/fsa', authenticateToken, validate, BalanceController.obtenerFsasConCategoria);

module.exports = router;

