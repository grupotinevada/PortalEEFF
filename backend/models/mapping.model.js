// models/cta_fsa_mapeo.model.js
const { pool } = require('../config/database');

/**
 * Modelo para gestionar mappings
 */
class MappingModel {

  /**
   * Obtiene todas las mappings
   * @returns {Array} Array de mappings
   * @throws {Error} Si hay error en BD
   */
    static async findAvailableMappings() {
      const [rows] = await pool.query(`
        SELECT 
          id_mapping, 
          MIN(descripcion) as descripcion 
        FROM 
          cta_fsa_mapeo 
        GROUP BY 
          id_mapping 
        ORDER BY 
          id_mapping ASC
      `);
      // La consulta ya devuelve el formato { id_mapping, descripcion }, así que la retornamos directamente.
      return rows;
    }

  /**
   * Busca una cta_fsa_mapeo por ID
   * @param {string} id_mapping - ID de la cta_fsa_mapeo
   * @returns {Object|null} La cta_fsa_mapeo encontrada o null
   * @throws {Error} Si hay error en BD
   */
  static async findById(id_mapping) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM cta_fsa_mapeo WHERE id_mapping = ?',
        [id_mapping]
      );
      
      return rows;
    } catch (error) {
      throw new Error(`Error al buscar cta_fsa_mapeo: ${error.message}`);
    }
}

  /**
   * Busca un mapeo específico por número de cuenta y ID de mapping.
   * @param {string} num_cuenta El número de cuenta a buscar.
   * @param {string} id_mapping El identificador del grupo de mapeo.
   * @returns {Object|null} El registro de mapeo si se encuentra, de lo contrario null.
   * @throws {Error} Si ocurre un error durante la consulta.
   */
  static async findByCuentaAndMapping(num_cuenta, id_mapping) {
    const sql = `
      SELECT num_cuenta, id_fsa, id_mapping 
      FROM cta_fsa_mapeo 
      WHERE num_cuenta = ? AND id_mapping = ?
    `;
    try {
      const [rows] = await pool.query(sql, [num_cuenta, id_mapping]);
      return rows[0] || null; // Retorna el primer resultado o null
    } catch (error) {
      throw new Error(`Error al buscar el mapeo: ${error.message}`);
    }
  }


    /**
   * Inserta una nueva asociación (mapeo) en la base de datos.
   * @param {string} num_cuenta El número de cuenta a mapear.
   * @param {string} id_fsa El ID FSA que se le asignará.
   * @param {string} id_mapping El grupo de mapeo al que pertenece (ej: 'MP-01').
   * @param {string} [descripcion] Una descripción para el nuevo registro.
   * @returns {boolean} Retorna `true` si la inserción fue exitosa.
   * @throws {Error} Si ocurre un error durante la consulta a la base de datos.
   */
  static async asociarMapping(num_cuenta, id_fsa, id_mapping, descripcion) {
    // Reemplaza 'tu_tabla_de_mapeo' por el nombre real de tu tabla.
    const sql = `
      INSERT INTO cta_fsa_mapeo 
        (num_cuenta, id_fsa, id_mapping, descripcion) 
      VALUES (?, ?, ?, ?)
    `;
    
    try {
      // Usamos `pool.query` que es ideal para consultas preparadas.
      // El resultado de un INSERT en mysql2/promise incluye 'affectedRows'.
      const [result] = await pool.query(sql, [
        num_cuenta,
        id_fsa,
        id_mapping,
        descripcion
      ]);

      // La operación fue exitosa si se afectó al menos una fila.
      return result.affectedRows > 0;

    } catch (error) {
      // Lanzamos un nuevo error para que sea capturado por la capa superior (Servicio/Controlador).
      throw new Error(`Error al crear el mapeo en la base de datos: ${error.message}`);
    }
  }

  static async crearOActualizarMapeo(num_cuenta, id_fsa, id_mapping, descripcion, nombre, isManual) {
  const sql = `
    INSERT INTO cta_fsa_mapeo (num_cuenta, id_mapping, id_fsa, descripcion, nombre, isManual)
    VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
      id_fsa = VALUES(id_fsa),
      descripcion = VALUES(descripcion),
      nombre = VALUES(nombre),
      isManual = VALUES(isManual);
  `;
  
    try {
    const [result] = await pool.query(sql, [
      num_cuenta, 
      id_mapping, 
      id_fsa, 
      descripcion,
      nombre,
      isManual
    ]);
    
    // En MySQL, un INSERT devuelve affectedRows=1, un UPDATE devuelve affectedRows=2.
    // Cualquier valor > 0 significa que la operación tuvo efecto.
    return result.affectedRows > 0;

  } catch (error) {
    // Lanza el error para que el servicio lo capture.
    throw new Error(`Error en la base de datos al guardar el mapeo: ${error.message}`);
  }
}


  /**
   * Inserta un nuevo mapping (puede ser clon de otro)
   * @param {Array<Object>} rows - [{ num_cuenta, id_fsa, id_mapping, descripcion }]
   * @returns {number} Número de filas insertadas
   */
  static async createMapping(rows) {
    try {
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('Se requiere un arreglo con al menos una fila para insertar');
      }

      const [result] = await pool.query(
        `INSERT INTO cta_fsa_mapeo (num_cuenta, id_fsa, id_mapping, descripcion)
         VALUES ?`,
        [rows.map(r => [r.num_cuenta, r.id_fsa, r.id_mapping, r.descripcion])]
      );

      return result.affectedRows;
    } catch (error) {
      throw new Error(`Error al crear mapping: ${error.message}`);
    }
  }


   /**
   * Actualiza filas de un mapping existente
   * @param {string} idMapping - ID del mapping a actualizar
   * @param {Array<Object>} changes - [{ num_cuenta, id_fsa }]
   * @returns {number} Número de filas actualizadas
   */
  static async updateMapping(idMapping, changes) {
    try {
      let total = 0;

      for (const cambio of changes) {
        const [result] = await pool.query(
          `UPDATE cta_fsa_mapeo 
           SET id_fsa = ? 
           WHERE num_cuenta = ? AND id_mapping = ?`,
          [cambio.id_fsa, cambio.num_cuenta, idMapping]
        );
        total += result.affectedRows;
      }

      return total;
    } catch (error) {
      throw new Error(`Error al actualizar mapping: ${error.message}`);
    }
  }

   /**
   * Elimina un mapping completo por su ID
   * @param {string} idMapping
   * @returns {number} Número de filas eliminadas
   */
  static async deleteMapping(idMapping) {
    try {
      const [result] = await pool.query(
        `DELETE FROM cta_fsa_mapeo WHERE id_mapping = ?`,
        [idMapping]
      );
      return result.affectedRows;
    } catch (error) {
      throw new Error(`Error al eliminar mapping: ${error.message}`);
    }
  }

}
module.exports = MappingModel;
