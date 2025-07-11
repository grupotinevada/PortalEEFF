const express = require('express');
const router = express.Router();
const BalanceController = require('../controllers/balance.controller');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { balanceValidation, bulkBalanceValidation, validate } = require('../middlewares/balance.middleware');


router.post('/', authenticateToken, balanceValidation, validate, BalanceController.create);
router.get('/', authenticateToken, BalanceController.getAll);
router.get('/search', authenticateToken, BalanceController.getByEmpresaAndFecha);
router.post('/bulk', authenticateToken, bulkBalanceValidation, BalanceController.createBulk);

const { pool } = require("../config/database");
// Endpoint rápido para obtener la tabla fsa con join a categoria
router.get('/fsa', authenticateToken, async (req, res) => {
    try {
        console.log('GET /fsa - Obteniendo FSA con join a categoria');
        const [rows] = await pool.query(`
        SELECT f.id_fsa, f.desc, f.id_cate, c.id_cate, c.descripcion AS categoria
        FROM fsa f
        LEFT JOIN categoria c ON f.id_cate = c.id_cate
    `);
        res.json(rows);
    } catch (err) {
        console.error('Error en GET /fsa:', err);
        res.status(500).json({ error: 'Error al obtener FSA' });
    }
});

module.exports = router;
