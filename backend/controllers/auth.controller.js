const AuthService = require('../services/auth.service');
const { msalClient, MICROSOFT_REDIRECT_URL } = require('../config/microsoft');
const UserModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const Logger = require('../utils/logger.utils');
class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const result = await AuthService.login(email, password);

      if (!result.success) {
        return res.status(401).json({ success: false, message: result.message });
      }
      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',  
        sameSite: 'Strict', // O 'Strict'
        maxAge: 8 * 60 * 60 * 1000
      });
      console.log('sesion iniciada')
      // ⚠️ Ya no incluimos el token en el JSON (más seguro)
      return res.json({
        success: true,
        user: result.user
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

static async verifyToken(req, res) {
  try {
    const token = req.cookies.token; // ✅ desde cookie
    const result = await AuthService.verifyToken(token);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error en verificación de token:', error);
    res.status(401).json({ success: false, message: 'Token inválido' });
  }
}

  static async logout(req, res) {
  try {
    console.log('Sesión cerrada correctamente');
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax'
    });

    return res.json({ success: true, message: 'Sesión cerrada correctamente' });
    
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ success: false, message: 'Error interno en logout' });
  }
}

static async isLoggedIn(req, res) {
  console.log('Verificando si el usuario está logueado');
  
  // req.user ya fue construido por el middleware CON los roles
  // req.user = { id, email, username, roles: { permiso, acceso, raw } }
  
  return res.json({
      success: true,
      user: req.user // ✅ Pasa el objeto req.user completo
    });
}

static async microsoftCallback(req, res) {
    console.log('[DEBUG #3] Recibido callback de Microsoft...');
    const authorizationCode = req.query.code;

    if (!authorizationCode) {
      console.error('[DEBUG #3 - ERROR] No se recibió código de autorización.');
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
    }

    const tokenRequest = {
      code: authorizationCode,
      scopes: ["User.Read", "email", "openid", "profile"],
      redirectUri: MICROSOFT_REDIRECT_URL,
    };

    try {
      const response = await msalClient.acquireTokenByCode(tokenRequest);
      const email = response.account.username.toLowerCase();
      console.log(`[DEBUG #3] Email extraído de MSAL: ${email}`);
      const user = await UserModel.findByEmail(email);

      if(!user){
        console.log(`[DEBUG #3.1 - RECHAZADO] Usuario ${email} no encontrado en BD.`);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=unauthorized_user`);
      }
      
      const permissions = await UserModel.getPermissionsByUserId(user.id_user);
      const roles = await AuthService.processRoles(permissions);

      console.log(`[DEBUG #3.2 - ÉXITO] Usuario ${email} encontrado. Generando JWT...`);
      console.log('aaaaaaa usuario y roles', user, roles);
      const token = jwt.sign(
        {
        userId: user.id_user, 
        email:user.email,
        username: user.username,
        roles: roles
        },
        JWT_SECRET, 
        {expiresIn: '8h'}
      );
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 8 * 60 * 60 * 1000 // 8 horasz
      });

      console.log(`[DEBUG #4] Cookie establecida. Redirigiendo al Frontend.`);
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:4200/home');

    } catch (error) {
      console.error('[DEBUG #3 - ERROR CRÍTICO] Error en acquireTokenByCode:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=callback_error`);
    }
  }

static async microsoftLogin(req, res) {
    console.log('[DEBUG #1] Iniciando login de Microsoft...');
    try {
      const authCodeUrlParameters = {
        scopes: ["User.Read", "email", "openid", "profile"], // Pide los scopes
        redirectUri: MICROSOFT_REDIRECT_URL,
      };

      // 1. Pide a MSAL que genere la URL de login
      const authCodeUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
      
      // 2. Redirige al usuario a esa URL
      res.redirect(authCodeUrl);

    } catch (error) {
      console.error('Error al generar la URL de MSAL:', error);
      res.status(500).send('Error iniciando sesión con Microsoft');
    }
  }

/*##################################################################**/
//CREACION DE USUARIOS
/*##################################################################**/
/**
   * Controlador para crear un nuevo usuario
   */
  static async createUser(req, res) {
    try {
      const { email, password, username, permiso, accesos } = req.body;

      // 1. Validación simple de entrada
      if (!email || !password || !username || !permiso) {
        return res.status(400).json({ 
          success: false, 
          message: 'Datos incompletos. Se requiere: email, password, username y permiso.' 
        });
      }

      // 2. Llamar al servicio para registrar al usuario
      const result = await AuthService.registerUser({ 
        email, 
        password, 
        username, 
        permiso, 
        accesos // 'accesos' puede ser undefined o un array ['4', '5']
      });

      // 3. Devolver la respuesta
      if (!result.success) {
        // 409 Conflict (email ya existe) o 500 (error de BBDD)
        const statusCode = result.message.includes('ya existe') ? 409 : 500;
        return res.status(statusCode).json(result);
      }

      // 201 Created (Éxito)
      return res.status(201).json(result);

    } catch (error) {
      Logger.error('Error en UserController.createUser:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  /**
   * Controlador para obtener TODOS los usuarios
   */
  static async getAllUsers(req, res) {
    try {
      const result = await AuthService.getAllUsers();

      if (!result.success) {
        // Esto sería un error 500
        return res.status(500).json(result);
      }

      // 200 OK (Éxito)
      return res.status(200).json(result);

    } catch (error) {
      Logger.error('Error en AuthController.getAllUsers:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  /**
   * Controlador para actualizar un usuario existente
   */
  static async updateUser(req, res) {
    try {
      const { id } = req.params; // ID del usuario a editar
      
      // Obtenemos solo los campos permitidos
      const { permiso, accesos, habilitado, password } = req.body;
      const updateData = { permiso, accesos, habilitado, password };

      // Validamos que el ID sea un número
      if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'ID de usuario inválido.' });
      }

      // 2. Llamar al servicio para actualizar al usuario
      const result = await AuthService.updateUser(id, updateData);

      // 3. Devolver la respuesta
      if (!result.success) {
        // 404 Not Found o 500 (error de BBDD)
        const statusCode = result.message.includes('encontrado') ? 404 : 500;
        return res.status(statusCode).json(result);
      }

      // 200 OK (Éxito)
      return res.status(200).json(result);

    } catch (error) {
      Logger.error('Error en AuthController.updateUser:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }
}

module.exports = AuthController;
