const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authValidation, validate } = require('../middlewares/validation.middleware');
const { authenticateToken } = require('../middlewares/auth.middleware');



router.post('/login', authValidation, validate, AuthController.login);
router.post('/register', authValidation, validate, AuthController.register);
router.get('/verify', authenticateToken, AuthController.verifyToken);
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/isLoggedIn', authenticateToken, AuthController.isLoggedIn);

// Rutas para autenticación con Microsoft
router.get('/microsoft', AuthController.microsoftLogin);
router.get('/microsoft/callback', AuthController.microsoftCallback);

// Ruta protegida de ejemplo
router.get('/protected', authenticateToken, (req, res) => {
  res.json({
    message: 'Acceso autorizado',
    user: req.user
  });
});

module.exports = router;