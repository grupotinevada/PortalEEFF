const express = require('express');
const router = express.Router();
const BalanceController = require('../controllers/balance.controller');

const { authenticateToken } = require('../middlewares/auth.middleware');
const { balanceValidation, bulkBalanceValidation, validate } = require('../middlewares/balance.middleware');


router.post('/', authenticateToken, balanceValidation, validate, BalanceController.create);

router.get('/resumen', authenticateToken, BalanceController.getResumen);


router.post('/bulk', authenticateToken, bulkBalanceValidation, BalanceController.createBulk);

router.get('/balance/:id_blce', authenticateToken, BalanceController.getById);

router.get('/check-name/:nombre', authenticateToken, BalanceController.checkName);

router.put('/:id_blce', authenticateToken, BalanceController.update);

//router.get('/fsa', authenticateToken, validate, BalanceController.obtenerFsasConCategoria);

module.exports = router;

