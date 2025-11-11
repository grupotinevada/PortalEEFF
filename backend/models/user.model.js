// user.model.js
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {

/**################################################################################################# */
/**############################  FUNCIONES AUXILIARES  ############################################# */
/**################################################################################################# */

/**
   * 
   * Obtiene las IDs de las empresas que un usuario puede ver.
   * - Retorna `null` si el usuario tiene acceso 'global' (sin filtro).
   * - Retorna un `array` de IDs de empresa si tiene accesos restringidos.
   * - Retorna un `array` vacío si no tiene 'global' ni empresas asignadas.
   *
   * @param {string|number} id_user - ID del usuario.
   * @returns {Promise<string[] | null>} - Un array de id_empresa, o null para "global".
   */
  static async getAllowedEmpresaIds(id_user) {
    try {
      // Verificamos si el usuario tiene el acceso "global"
      // (Asumimos que el acceso global tiene la descripción 'global')
      const queryGlobal = `
        SELECT 1 
        FROM usuario_acceso ua
        JOIN acceso a ON ua.id_acceso = a.id_acceso
        WHERE ua.id_user = ? AND a.descripcion = 'global'
        LIMIT 1
      `;
      const [globalRows] = await pool.query(queryGlobal, [id_user]);

      // Si tiene 'global', retornamos null (significa "sin filtro")
      if (globalRows.length > 0) {
        return null; 
      }

      //Si NO tiene 'global', buscamos sus empresas específicas
      //    (Esto usa la nueva tabla 'acceso_empresa')
      const queryEmpresas = `
        SELECT DISTINCT ae.id_empresa
        FROM usuario_acceso ua
        JOIN acceso_empresa ae ON ua.id_acceso = ae.id_acceso
        WHERE ua.id_user = ?
      `;
      const [empresaRows] = await pool.query(queryEmpresas, [id_user]);

      // Retornamos el array de IDs de empresa permitidas
      return empresaRows.map(row => row.id_empresa); // E.g., ['E001'] o []

    } catch (error) {
      console.error('Error fetching allowed empresas:', error);
      throw new Error('Error al obtener permisos de empresa.');
    }
  }

  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);

    return rows[0];
  }

  static async validatePassword(plainPassword, hashedPassword) {

    if (!plainPassword || !hashedPassword) {

      return false;
    }
    return bcrypt.compare(plainPassword, hashedPassword);
  }

static async getPermissionsByUserId(id_user) {
    try {
      // Consultas que traen ID y Descripción
      const queryRoles = 'SELECT r.id_rol, r.descripcion FROM usuario_rol ur JOIN rol r ON r.id_rol = ur.id_rol WHERE ur.id_user = ?';
      const queryAccesos = 'SELECT a.id_acceso, a.descripcion FROM usuario_acceso ua JOIN acceso a ON a.id_acceso = ua.id_acceso WHERE ua.id_user = ?';
      const queryEmpresas  = 'SELECT DISTINCT ae.id_empresa FROM usuario_acceso ua JOIN acceso_empresa ae ON ua.id_acceso = ae.id_acceso WHERE ua.id_user = ?';
      // Ejecutamos en paralelo
      const [rolesResult, accesosResult,empresasResult] = await Promise.all([
        pool.query(queryRoles, [id_user]),
        pool.query(queryAccesos, [id_user]),
        pool.query(queryEmpresas , [id_user])
      ]);

      // Retornamos los arreglos de objetos COMPLETOS
      return {
        roles: rolesResult[0],     // Esto es [{ id_rol: '1', ... }]
        accesos: accesosResult[0],  // Esto es [{ id_acceso: '4', ... }]
        empresa: empresasResult[0]  // Esto es [{ id_empresa: 'E001' }, ... ]
      };

    } catch (error) {
      console.error('Error fetching user permissions:', error);
      return { roles: [], accesos: [], empresa: []  };
    }
  }
/**################################################################################################# */
/**############################ FIN FUNCIONES AUXILIARES  ########################################## */
/**################################################################################################# */


/*##################################################################**/
//CREACION DE USUARIOS
/*##################################################################**/

/**
   * Crea un nuevo usuario y asigna sus permisos (rol y accesos)
   */
  static async createWithPermissions(userData, permisoId, accesoIds) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [userResult] = await connection.query(
        'INSERT INTO usuario (username, email, password_hash, habilitado) VALUES (?, ?, ?, ?)',
        [userData.username, userData.email, userData.password_hash, userData.habilitado || 1]
      );
      const newUserId = userResult.insertId;
      await connection.query(
        'INSERT INTO usuario_rol (id_user, id_rol) VALUES (?, ?)',
        [newUserId, permisoId]
      );
      if (accesoIds && accesoIds.length > 0) {
        const accesoData = accesoIds.map(accesoId => [newUserId, accesoId]);
        await connection.query(
          'INSERT INTO usuario_acceso (id_user, id_acceso) VALUES ?',
          [accesoData] 
        );
      }
      await connection.commit();
      return newUserId;
    } catch (error) {
      await connection.rollback();
      console.error('Error en transacción de creación de usuario:', error);
      throw new Error('Error al crear el usuario en la base de datos.');
      } finally {
      connection.release();
    }
  }

  static async getAllUsersWithPermissions() {
  // 1. Definimos las 3 consultas
  const queryUsers = 'SELECT id_user, username, email, habilitado FROM usuario';
  const queryRoles = `
    SELECT ur.id_user, r.id_rol, r.descripcion 
    FROM usuario_rol ur 
    JOIN rol r ON ur.id_rol = r.id_rol
  `;
  const queryAccesos = `
    SELECT ua.id_user, a.id_acceso, a.descripcion 
    FROM usuario_acceso ua 
    JOIN acceso a ON ua.id_acceso = a.id_acceso
  `;

  try {
    // 2. Ejecutamos todo en paralelo
    const [usersResult, rolesResult, accesosResult] = await Promise.all([
      pool.query(queryUsers),
      pool.query(queryRoles),
      pool.query(queryAccesos)
    ]);

    const allUsers = usersResult[0];
    const allRoles = rolesResult[0];
    const allAccesos = accesosResult[0];

    // 3. Creamos "Mapas" para ensamblar los datos rápidamente
    const rolesMap = new Map();
    for (const role of allRoles) {
      if (!rolesMap.has(role.id_user)) {
        rolesMap.set(role.id_user, []);
      }
      rolesMap.get(role.id_user).push({ id_rol: role.id_rol, descripcion: role.descripcion });
    }

    const accesosMap = new Map();
    for (const acceso of allAccesos) {
      if (!accesosMap.has(acceso.id_user)) {
        accesosMap.set(acceso.id_user, []);
      }
      accesosMap.get(acceso.id_user).push({ id_acceso: acceso.id_acceso, descripcion: acceso.descripcion });
    }

    // 4. Ensamblamos el resultado final
    const finalUsersList = allUsers.map(user => {
      return {
        ...user,
        roles: rolesMap.get(user.id_user) || [],     // Asigna sus roles
        accesos: accesosMap.get(user.id_user) || []  // Asigna sus accesos
      };
    });

    return finalUsersList;

  } catch (error) {
    console.error('Error al obtener todos los usuarios con permisos:', error);
    throw new Error('Error en la base de datos al obtener usuarios.');
  }
}

/**
   * Actualiza un usuario y sus permisos (rol y accesos) en una transacción.
   * @param {string|number} userId - ID del usuario a actualizar.
   * @param {Object} fields - Objeto con los campos a actualizar.
   * E.g., { password_hash: '...', habilitado: 0, permiso: 2, accesos: ['4', '5'] }
   * @NUEVO
   */
  static async updateUserWithPermissions(userId, fields) {
    const connection = await pool.getConnection();
    let totalAffectedRows = 0; 

    try {
      await connection.beginTransaction();
      const userFieldsToUpdate = {};
      if (fields.password_hash) {
        userFieldsToUpdate.password_hash = fields.password_hash;
      }
      if (fields.habilitado !== undefined) {
        userFieldsToUpdate.habilitado = fields.habilitado;
      }
      if (Object.keys(userFieldsToUpdate).length > 0) {
        const [userUpdateResult] = await connection.query(
          'UPDATE usuario SET ? WHERE id_user = ?',
          [userFieldsToUpdate, userId]
        );
        totalAffectedRows += userUpdateResult.affectedRows;
      }
      if (fields.permiso !== undefined) {
        const [roleUpdateResult] = await connection.query(
          'UPDATE usuario_rol SET id_rol = ? WHERE id_user = ?',
          [fields.permiso, userId]
        );
        // Si el usuario no existía, el update anterior (paso 1) dará 0.
        // Si sí existía, pero el rol no cambia, affectedRows es 0, pero no es un error.
        // Si el usuario existe (totalAffectedRows > 0) pero el rol no (affectedRows 0), 
        // significa que el INSERT original falló (raro). Asumimos que la fila existe.
        if (totalAffectedRows === 0) totalAffectedRows += roleUpdateResult.affectedRows;
      }

      // --- 3. Sincronizar Tabla 'usuario_acceso' (accesos) ---
      if (fields.accesos !== undefined) {
        // a. Borrar accesos antiguos
        const [deleteResult] = await connection.query(
          'DELETE FROM usuario_acceso WHERE id_user = ?',
          [userId]
        );
        
        // b. Insertar accesos nuevos (si el array no está vacío)
        if (fields.accesos.length > 0) {
          const accesoData = fields.accesos.map(accesoId => [userId, accesoId]);
          await connection.query(
            'INSERT INTO usuario_acceso (id_user, id_acceso) VALUES ?',
            [accesoData] 
          );
        }

        if (totalAffectedRows === 0) totalAffectedRows += deleteResult.affectedRows;
      }

      if (totalAffectedRows === 0) {

        await connection.rollback();
        return 0; 
      }

      await connection.commit();
      return totalAffectedRows; 

    } catch (error) {
      await connection.rollback();
      console.error('Error en transacción de actualización de usuario:', error);
      throw new Error('Error al actualizar el usuario en la base de datos.');
    } finally {
      connection.release();
    }
  }

}

module.exports = UserModel;
