const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model'); // Ajusta a tu modelo real
const { JWT_SECRET } = process.env;

const identifyUser = async (req, res, next) => {
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

    // Adjuntar usuario al request
    req.user = user;
    next();
  } catch (error) {
    console.error('identifyUser error:', error);
    return res.status(401).json({ message: 'No autorizado: token inválido o expirado' });
  }
};

module.exports = identifyUser;
