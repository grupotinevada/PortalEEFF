const AuthService = require('../services/auth.service');
const { msalClient, MICROSOFT_REDIRECT_URL } = require('../config/microsoft');
const UserModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const Logger = require('../utils/logger.utils');
class AuthController {



static async login(req, res) {
    const email = req.body?.email || 'email_desconocido'; // Obtenemos el email para los logs

    try {
      const { password } = req.body;

      // Validar que el email exista antes de continuar
      if (email === 'email_desconocido' || !password) {
        Logger.warn('Intento de login (local) con cuerpo de solicitud inválido.');
        return res.status(400).json({ success: false, message: 'Email y contraseña requeridos' });
      }

      const result = await AuthService.login(email, password);
      
      if (!result.success) {
        // Loguear intentos de login fallidos (importante para seguridad)
        Logger.warn(`Intento de login (local) fallido para: ${email}. Razón: ${result.message}`);
        return res.status(401).json({ success: false, message: result.message });
      }


      res.cookie('token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',  
        sameSite: 'Strict',
        maxAge: 8 * 60 * 60 * 1000
      });

      // --- REEMPLAZADO ---
      Logger.info(`Login exitoso (local) para: ${result.user.email}`);
      
      return res.json({
        success: true,
        user: result.user
      });

    } catch (error) {
      // Logueamos el error con más contexto
      const errorMessage = error.message || 'Error desconocido';
      const errorStack = error.stack || 'No stack available';
      Logger.error(`Error crítico en login (local) para ${email}: ${errorMessage}. Stack: ${errorStack}`);
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
    Logger.info('Recibido callback de Microsoft.');
    const authorizationCode = req.query.code;

    if (!authorizationCode) {
      Logger.error('No se recibió código de autorización de Microsoft.');
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
      Logger.info(`Email extraído de MSAL: ${email}`);
      const user = await UserModel.findByEmail(email);

      if(!user ){
        // Usamos WARN para intentos de login fallidos (seguridad)
        Logger.warn(`Usuario ${email} no encontrado en BD. Acceso rechazado.`);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=unauthorized_user`);
      }
      if(user.habilitado !==1 ){
        // Usamos WARN para intentos de cuentas deshabilitadas (seguridad)
        Logger.warn(`Usuario ${email} (deshabilitado) intentó acceder. Acceso rechazado.`);
        // Recomiendo un error específico para el frontend
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=disabled_user`); 
      }
      
      const permissions = await UserModel.getPermissionsByUserId(user.id_user);
      const roles = await AuthService.processRoles(permissions);

      Logger.info(`Usuario ${email} autenticado exitosamente. Generando JWT...`);
      
      // Reemplazo del console.log "aaaaaaa" por un log limpio y seguro
      Logger.info(`Generando token para [${user.username}] `);

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
        maxAge: 8 * 60 * 60 * 1000 // 8 horas
      });

      Logger.info(`Cookie de sesión establecida para ${email}. Redirigiendo al frontend.`);
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:4200/home');

    } catch (error) {
      // Es buena práctica loguear el mensaje y el stack del error
      const errorMessage = error.message || 'Error desconocido';
      const errorStack = error.stack || 'No stack available';
      Logger.error(`Error crítico en acquireTokenByCode: ${errorMessage}. Stack: ${errorStack}`);
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
    // Obtenemos el email para logging, incluso si falla
    const email = req.body?.email || 'email_desconocido';
    const username = req.body?.username || 'username_desconocido';
    // ID del admin/usuario que realiza la acción
    const actorId = req.user?.id || 'Sistema'; 

    try {
      Logger.info(`Intento de creación de usuario: ${email} (Username: ${username}) por Actor: ${actorId}`);
      const { password, permiso, accesos } = req.body;

      // 1. Validación simple de entrada
      if (!email || !password || !username || !permiso) {
        Logger.warn(`Creación fallida (400 - Bad Request) para ${email}: Datos incompletos.`);
        return res.status(400).json({ 
          success: false, 
          message: 'Datos incompletos. Se requiere: email, password, username y permiso.' 
        });
      }

      // 2. Llamar al servicio para registrar al usuario
      // ⚠️ IMPORTANTE: Nunca loguear el objeto req.body completo si contiene 'password'
      const result = await AuthService.registerUser({ 
        email, 
        password, 
        username, 
        permiso, 
        accesos
      });

      // 3. Devolver la respuesta
      if (!result.success) {
        const statusCode = result.message.includes('ya existe') ? 409 : 500;
        
        if (statusCode === 409) {
          Logger.warn(`Creación fallida (409 - Conflict) para ${email}: ${result.message}`);
        } else {
          Logger.error(`Error de servicio (500) al crear ${email}: ${result.message}`);
        }
        return res.status(statusCode).json(result);
      }

      // 4. Éxito
      const newUserId = result.user?.id_user; // Asumiendo que el servicio devuelve el usuario creado
      Logger.info(`Usuario ${email} (ID: ${newUserId}) creado exitosamente por Actor: ${actorId}.`);
      Logger.userAction(actorId, 'CREATE_USER', `Nuevo usuario: ${email} (ID: ${newUserId})`);

      return res.status(201).json(result);

    } catch (error) {
      Logger.error(`Error crítico en UserController.createUser (Datos: ${email}, ${username}): ${error.message}`, error.stack);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  /**
   * Controlador para obtener TODOS los usuarios
   */
 static async getAllUsers(req, res) {
    const actorId = req.user?.id || 'Desconocido';

    try {
      Logger.info(`Usuario ${actorId} solicitó getAllUsers.`);

      const result = await AuthService.getAllUsers();

      if (!result.success) {
        Logger.error(`Error de servicio en getAllUsers (solicitado por ${actorId}): ${result.message}`);
        return res.status(500).json(result);
      }

      // 200 OK (Éxito)
      Logger.info(`getAllUsers completado exitosamente para ${actorId}.`);
      return res.status(200).json(result);

    } catch (error) {
      Logger.error(`Error crítico en AuthController.getAllUsers (solicitado por ${actorId}): ${error.message}`, error.stack);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  /**
   * Controlador para actualizar un usuario existente
   */
 static async updateUser(req, res) {
    const { id } = req.params; // ID del usuario a editar
    const actorId = req.user?.id || 'Sistema'; // ID del admin/usuario que edita

    try {
      const { permiso, accesos, habilitado, password } = req.body;
      const updateData = { permiso, accesos, habilitado, password };

      // --- Logging Seguro ---
      // Filtramos las claves que realmente se enviaron (no son undefined)
      const updatedKeys = Object.keys(updateData).filter(k => updateData[k] !== undefined);
      // Reemplazamos 'password' con un placeholder para el log
      const logKeys = updatedKeys.map(k => (k === 'password' ? 'password(***)' : k));
      const logDetails = logKeys.length > 0 ? logKeys.join(', ') : 'ningún campo';
      
      Logger.info(`Intento de actualización (por Actor: ${actorId}) en Usuario ID: ${id}. Campos: [${logDetails}]`);
      // ---------------------

      // Validamos que el ID sea un número
      if (isNaN(id)) {
        Logger.warn(`Actualización fallida (400 - Bad Request) por ${actorId}: ID de usuario inválido (${id}).`);
        return res.status(400).json({ success: false, message: 'ID de usuario inválido.' });
      }

      // 2. Llamar al servicio para actualizar al usuario
      const result = await AuthService.updateUser(id, updateData);

      // 3. Devolver la respuesta
      if (!result.success) {
        const statusCode = result.message.includes('encontrado') ? 404 : 500;
        
        if (statusCode === 404) {
          Logger.warn(`Actualización fallida (404 - Not Found) por ${actorId}: Usuario ID ${id} no encontrado.`);
        } else {
          Logger.error(`Error de servicio (500) al actualizar ID ${id} (por ${actorId}): ${result.message}`);
        }
        return res.status(statusCode).json(result);
      }

      // 4. Éxito
      Logger.info(`Usuario ID: ${id} actualizado exitosamente por ${actorId}.`);
      Logger.userAction(actorId, 'UPDATE_USER', `Usuario ID: ${id}. Campos actualizados: [${logDetails}]`);

      return res.status(200).json(result);

    } catch (error) {
      Logger.error(`Error crítico en AuthController.updateUser (ID: ${id}, Actor: ${actorId}): ${error.message}`, error.stack);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }
}

module.exports = AuthController;
