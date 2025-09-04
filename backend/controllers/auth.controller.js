const AuthService = require('../services/auth.service');

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
        sameSite: 'Lax', // O 'Strict'
        maxAge: 24 * 60 * 60 * 1000 // 1 día
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


}

module.exports = AuthController;
