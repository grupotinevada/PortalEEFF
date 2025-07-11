const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { JWT_SECRET } = require('../config/constants');
const Logger = require('../utils/logger.utils');

/**
 * Servicio de autenticación
 */
class AuthService {
  /**
   * Login de usuario
   * @param {string} email
   * @param {string} password
   * @returns {Object} Resultado con token o error
   */
  static async login(email, password) {
    try {
      const user = await UserModel.findByEmail(email);
      if (!user) {
        Logger.warn(`Login fallido - usuario no encontrado: ${email}`);
        return { success: false, message: 'Credenciales inválidas' };
      }

      const isValidPassword = await UserModel.validatePassword(password, user.password_hash);
      if (!isValidPassword) {
        Logger.warn(`Login fallido - contraseña incorrecta: ${email}`);
        return { success: false, message: 'Credenciales inválidas' };
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      Logger.userAction(user.id, 'LOGIN', `Usuario ${email} inició sesión`);

      return {
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id: user.id,
          email: user.email
        }
      };
    } catch (error) {
      Logger.error(`Error en AuthService.login: ${error.message}`);
      return { success: false, message: 'Error interno en login' };
    }
  }

  /**
   * Registro de usuario
   * @param {string} email
   * @param {string} password
   * @param {string} username
   * @returns {Object} Resultado de la operación
   */
 static async register(email, password, username) {
  try {
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return { success: false, message: 'El usuario ya existe' };
    }

    const newUser = await UserModel.create({ email, password, username });

    // ✅ Generar token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return {
      success: true,
      message: 'Usuario registrado exitosamente',
      user: {
        id: newUser.id,
        email: newUser.email
      },
      token // ✅ devolver token para usar en la cookie
    };
  } catch (error) {
    return { success: false, message: 'Error interno en registro' };
  }
}
  /**
   * Verifica un token JWT
   * @param {string} token - Token JWT
   * @returns {Object} Resultado de la verificación
   */
  static async verifyToken(token) {
    if (!token) {
      Logger.warn('Intento de verificación sin token');
      return { success: false, message: 'Token no proporcionado' };
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await UserModel.findByEmail(decoded.email);

      if (!user) {
        Logger.warn('Token inválido: usuario no encontrado');
        return { success: false, message: 'Token inválido' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email
        }
      };
    } catch (error) {
      Logger.error(`Error en AuthService.verifyToken: ${error.message}`);
      return { success: false, message: 'Token inválido' };
    }
  }
}

module.exports = AuthService;
