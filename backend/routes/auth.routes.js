const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authValidation, validate } = require('../middlewares/validation.middleware');
const { authenticateToken } = require('../middlewares/auth.middleware');
const { authorizeAdmin } = require('../middlewares/admin.middleware');



router.post('/login', authValidation, validate, AuthController.login);
router.get('/verify', authenticateToken, AuthController.verifyToken);
router.post('/logout', authenticateToken, AuthController.logout);
router.get('/isLoggedIn', authenticateToken, AuthController.isLoggedIn);

// Rutas para autenticación con Microsoft
router.get('/microsoft', AuthController.microsoftLogin);
router.get('/microsoft/callback', AuthController.microsoftCallback);

// Ruta protegida de ejemplo
router.get('/protected', authenticateToken, (req, res) => {res.json({message: 'Acceso autorizado',user: req.user});});


/*##################################################################**/
//CREACION DE USUARIOS
/*##################################################################**/
router.post('/user',[authenticateToken,authorizeAdmin], AuthController.createUser);
router.get('/users',[authenticateToken, authorizeAdmin], AuthController.getAllUsers);
router.put('/user/:id',[authenticateToken, authorizeAdmin], AuthController.updateUser);

module.exports = router;
