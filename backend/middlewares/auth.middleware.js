const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { JWT_SECRET } = require('../config/constants');

const authenticateToken = async (req, res, next) => {
  try {
    // ✅ Se intenta obtener el token desde la cookie o el header
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Token requerido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = { authenticateToken };
