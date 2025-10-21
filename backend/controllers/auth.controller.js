const AuthService = require('../services/auth.service');
const { msalClient, MICROSOFT_REDIRECT_URL } = require('../config/microsoft');
const UserModel = require('../models/user.model');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
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
        maxAge: 12 * 60 * 60 * 1000 // 1 día
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

 static async register(req, res) {
  try {
    const { email, password, username } = req.body;
    const result = await AuthService.register(email, password, username);

    if (!result.success) {
      return res.status(409).json(result);
    }
    res.cookie('token', result.token, {
      httpOnly: true,
      secure:  process.env.NODE_ENV === 'production', // solo si estás en HTTPS
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000
    });
    console.log('Cookie establecida con éxito');
    res.status(201).json({
      success: true,
      user: result.user
    });
  } catch (error) {
    console.error('Error en registro:', error);
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
      secure: false,
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
  return res.json({
      success: true,
      user: { // Enviamos solo los datos necesarios
        id: req.user.id,
        email: req.user.email,
        username: req.user.username
      }
    });
}

static async microsoftCallback(req, res) {
    console.log('[DEBUG #3] Recibido callback de Microsoft...');
    
    // 1. Obtén el código de autorización de la query string
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
      // 2. Intercambia el código por un token
      const response = await msalClient.acquireTokenByCode(tokenRequest);
      
      // 3. ¡Tienes al usuario! El perfil está en 'response.account'
      // response.account contiene info como:
      // { homeAccountId, environment, tenantId, username, localAccountId, name, ... }
      
      const email = response.account.username.toLowerCase(); // 'username' suele ser el UPN/email
      console.log(`[DEBUG #3] Email extraído de MSAL: ${email}`);

      // 4. --- A PARTIR DE AQUÍ, TU LÓGICA EXISTENTE FUNCIONA PERFECTO ---
      //
      const user = await UserModel.findByEmail(email);

      if(!user){
        console.log(`[DEBUG #3.1 - RECHAZADO] Usuario ${email} no encontrado en BD.`);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=unauthorized_user`);
      }

      console.log(`[DEBUG #3.2 - ÉXITO] Usuario ${email} encontrado. Generando JWT...`);
      const token = jwt.sign(
        {userId: user.id, email:user.email},
        JWT_SECRET, //
        {expiresIn: '12h'}
      );

      // 5. Establece tu cookie JWT (tu lógica actual)
      //
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 24 * 60 * 60 * 1000 // 1 día
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


}

module.exports = AuthController;
