// middlewares/admin.middleware.js
const Logger = require('../utils/logger.utils');

/**
 * Middleware para verificar si el usuario es Administrador.
 * Debe usarse *después* de authenticateToken.
 *
 * El rol de "Admin" ahora requiere DOS condiciones:
 * 1. Permiso (rol) = 1 (Administrador)
 * 2. Acceso = 5 (Global)
 */
const authorizeAdmin = (req, res, next) => {
  try {
    // req.user es poblado por el middleware authenticateToken
    // req.user.roles = { permiso: 1, acceso: 5, raw: [1, 5] }
    const userRoles = req.user.roles;

    // --- LÓGICA ACTUALIZADA ---
    // Verificamos que el usuario tenga AMBAS condiciones
    if (userRoles && userRoles.permiso === 1 && [4, 5].includes(userRoles.acceso)) {
      // El usuario es Admin (rol 1) Y Global (acceso 5)
      next();
    } else {
      // Si falta una o ambas condiciones, se rechaza.
      Logger.warn(
        `Acceso no autorizado a ruta de admin por usuario: ${req.user.email} (Permiso: ${userRoles?.permiso}, Acceso: ${userRoles?.acceso})`
      );
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Se requiere rol de Administrador Global.',
      });
    }
  } catch (error) {
    Logger.error(`Error en middleware authorizeAdmin: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Error interno de autorización',
    });
  }
};

module.exports = {
  authorizeAdmin,
};