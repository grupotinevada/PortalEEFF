const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { JWT_SECRET } = require('../config/constants');
const Logger = require('../utils/logger.utils');
const bcrypt = require('bcryptjs');
/**
 * Servicio de autenticación
 */
class AuthService {

/**################################################################################################# */
/**############################  FUNCIONES AUXILIARES  ############################################# */
/**################################################################################################# */
  
 
/**################################################################################################# */
/**############################ FIN FUNCIONES AUXILIARES  ########################################## */
/**################################################################################################# */


  /**
   * Login de usuario
   * @param {string} email
   * @param {string} password
   * @returns {Object} Resultado con token o error
   */
  static async login(email, password) {
    try {
      const user = await UserModel.findByEmail(email);

      console.log(user);

      if (!user) {
        Logger.warn(`Login fallido - usuario no encontrado: ${email}`);
        return { success: false, message: 'Credenciales inválidas, Email no encontrado' };
      }

      const isValidPassword = await UserModel.validatePassword(password, user.password_hash);
      if (!isValidPassword) {
        Logger.warn(`Login fallido - contraseña incorrecta: ${email}`);
        return { success: false, message: 'Credenciales inválidas, contraseña incorrecta' };
      }

      const permissions = await UserModel.getPermissionsByUserId(user.id_user);
      const roles = this.processRoles(permissions);
      
      const token = jwt.sign(
        { 
        userId: user.id_user, 
        email: user.email,
        username: user.username,
        roles: roles 
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      Logger.userAction(user.id_user, 'LOGIN', `Usuario ${email} - ${user.username} con roles ${JSON.stringify(roles)} inició sesión`);

      return {
        success: true,
        message: 'Login exitoso',
        token,
        user: {
          id: user.id_user,
          email: user.email,
          roles: roles,
          username: user.username
        }
        
      };
      
    } catch (error) {
      Logger.error(`Error en AuthService.login: ${error.message}`);
      return { success: false, message: 'Error interno, contacta con el administrador' };
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



/*##################################################################**/
//CREACION DE USUARIOS
/*##################################################################**/

/**
   * Procesa la lógica de permisos
   * (Adaptador para la nueva estructura de BBDD)
   * @param {object} permissionData - Objeto con { roles: [], accesos: [] }
   */
  static processRoles(permissionData) {
        // permissionData tiene la forma:
    // { 
    //   roles: [{ id_rol: '2', descripcion: 'Operador' }], 
    //   accesos: [{ id_acceso: '4', descripcion: 'Savisa' }]
    //   empresa: [{ id_empresa: 'E001' }]
    // }

    const permisoRol = permissionData.roles.length > 0
      ? parseInt(permissionData.roles[0].id_rol, 10)
      : undefined; 

    const accesoRol = permissionData.accesos.length > 0
      ? parseInt(permissionData.accesos[0].id_acceso, 10)
      : undefined; 
      
      const empresasSource = permissionData.empresas || permissionData.empresa || [];
      const empresas = empresasSource.map(e => e.id_empresa);


    const rawIds = [
      ...permissionData.roles.map(r => parseInt(r.id_rol, 10)),
      ...permissionData.accesos.map(a => parseInt(a.id_acceso, 10))
    ];

    return {
      permiso: permisoRol, 
      acceso: accesoRol, 
      empresas,
      raw: rawIds         
    };
  }

  /**
   * Registra un nuevo usuario en el sistema.
   * @param {Object} data - { email, password, username, permiso, accesos }
   */
  static async registerUser(data) {
    const { email, password, username, permiso, accesos } = data;

    try {
      // 1. Verificar si el usuario ya existe
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        Logger.warn(`Intento de registro fallido - email ya existe: ${email}`);
        return { success: false, message: 'El email ya se encuentra registrado.' };
      }

      // 2. Hashear la contraseña
      // (Asegúrate de que '10' coincida con tu método de validación)
      const password_hash = await bcrypt.hash(password, 10);

      // 3. Preparar los datos del usuario
      const userData = { email, username, password_hash, habilitado: 1 };
      
      // 4. Llamar al modelo para crear el usuario DENTRO de la transacción
      const newUserId = await UserModel.createWithPermissions(userData, permiso, accesos);

      Logger.userAction(newUserId, 'REGISTER', `Nuevo usuario ${email} creado con permiso ${permiso}`);

      return {
        success: true,
        message: 'Usuario creado exitosamente.',
        userId: newUserId
      };

    } catch (error) {
      Logger.error(`Error en AuthService.registerUser: ${error.message}`);
      return { success: false, message: 'Error interno al registrar el usuario.' };
    }
  }

   /**
   * Obtiene una lista de todos los usuarios con sus roles y accesos.
   */
  static async getAllUsers() {
    try {
      const users = await UserModel.getAllUsersWithPermissions();
      
      // La data ya viene lista del modelo
      return { 
        success: true, 
        users: users 
      };

    } catch (error) {
      Logger.error(`Error en UserService.getAllUsers: ${error.message}`);
      return { success: false, message: 'Error interno al obtener usuarios.' };
    }
  }

  /**
   * Actualiza un usuario existente.
   * @param {string} userId - ID del usuario a actualizar
   * @param {Object} data - { permiso, accesos, habilitado, password }
   * @NUEVO
   */
  static async updateUser(userId, data) {
    const { permiso, accesos, habilitado, password } = data;

    try {
      // 1. Objeto para almacenar solo los campos que realmente vamos a actualizar
      const fieldsToUpdate = {};

      // 2. Si se proporcionó una nueva contraseña, hashearla
      if (password) {
        fieldsToUpdate.password_hash = await bcrypt.hash(password, 10);
      }
      
      // 3. Añadimos los otros campos si fueron proporcionados
      // (Si 'habilitado' es 0 o 'false', '!== undefined' lo captura bien)
      if (permiso !== undefined) {
        fieldsToUpdate.permiso = permiso;
      }
      if (accesos !== undefined) { // 'accesos' puede ser un array vacío []
        fieldsToUpdate.accesos = accesos;
      }
      if (habilitado !== undefined) {
        fieldsToUpdate.habilitado = habilitado;
      }

      // 4. Verificar que haya algo que actualizar
      if (Object.keys(fieldsToUpdate).length === 0) {
        Logger.warn(`Intento de actualización vacío para usuario ${userId}`);
        return { success: false, message: 'No se proporcionaron datos para actualizar.', statusCode: 400 };
      }
      
      // 5. Llamar al modelo para actualizar al usuario DENTRO de la transacción
      const affectedRows = await UserModel.updateUserWithPermissions(userId, fieldsToUpdate);

      if (affectedRows === 0) {
         Logger.warn(`Intento de actualización para usuario ${userId} no encontrado.`);
         return { success: false, message: 'Usuario no encontrado.', statusCode: 404 };
      }

      Logger.userAction(userId, 'UPDATE', `Usuario ${userId} actualizado. Datos: ${JSON.stringify(Object.keys(fieldsToUpdate))}`);

      return {
        success: true,
        message: 'Usuario actualizado exitosamente.'
      };

    } catch (error) {
      Logger.error(`Error en AuthService.updateUser: ${error.message}`);
      return { success: false, message: 'Error interno al actualizar el usuario.' };
    }
  }

}

module.exports = AuthService;
