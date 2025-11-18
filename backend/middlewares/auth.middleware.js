const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { JWT_SECRET } = require('../config/constants');
const AuthService = require('../services/auth.service');

const authenticateToken = async (req, res, next) => {
  try {
    // Obtener token desde la cookie o el header
    const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token requerido' });
    }

    // Verificar el token
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded?.email) {
      return res.status(401).json({ message: 'Token inválido: email faltante' });
    }

    // Buscar al usuario en la base de datos
    const user = await UserModel.findByEmail(decoded.email);

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    if (user.habilitado !== 1) {
        console.warn(`Intento de acceso de usuario deshabilitado: ${user.email}`);
        return res.status(403).json({ message: 'Acceso denegado: Usuario deshabilitado' });
    }
    
    const permissions = await UserModel.getPermissionsByUserId(user.id_user);
    const roles = AuthService.processRoles(permissions);

    // Adjuntar usuario al request
    req.user = {
      id: user.id_user,
      email: user.email,
      username: user.username,
      roles: roles
    };
    next();
  } catch (error) {
    console.error('identifyUser error:', error);
    return res.status(401).json({ message: 'No autorizado: token inválido o expirado' });
  }
};

module.exports = { authenticateToken };
