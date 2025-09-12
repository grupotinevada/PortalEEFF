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

}
module.exports = MappingModel;
