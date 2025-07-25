// models/mapping.model.js
const { pool } = require('../config/database');

/**
 * Modelo para gestionar mappings
 */
class MappingModel {
  /**
   * Crea una nueva mapping
   * @param {string} id_mapping - ID único de la mapping
   * @param {string} descripcion - Descripción de la mapping
   * @returns {Object} La mapping creada
   * @throws {Error} Si hay error en BD
   */
  static async create(id_mapping, descripcion) {
    try {
      const [result] = await pool.query(
        'INSERT INTO mapping (id_mapping, descripcion) VALUES (?, ?)',
        [id_mapping, descripcion]
      );

      return { 
        id_mapping, 
        descripcion,
        insertId: result.insertId
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error(`mapping con ID ${id_mapping} ya existe`);
      }
      throw new Error(`Error al crear mapping: ${error.message}`);
    }
  }

  /**
   * Obtiene todas las mappings
   * @returns {Array} Array de mappings
   * @throws {Error} Si hay error en BD
   */
  static async findAll() {
    try {
      const [rows] = await pool.query(
        'SELECT id_mapping, descripcion FROM mapping ORDER BY descripcion'
      );
      return rows;
    } catch (error) {
      throw new Error(`Error al obtener mappings: ${error.message}`);
    }
  }

  /**
   * Busca una mapping por ID
   * @param {string} id_mapping - ID de la mapping
   * @returns {Object|null} La mapping encontrada o null
   * @throws {Error} Si hay error en BD
   */
  static async findById(id_mapping) {
    try {
      const [rows] = await pool.query(
        'SELECT id_mapping, descripcion FROM mapping WHERE id_mapping = ?',
        [id_mapping]
      );
      
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error al buscar mapping: ${error.message}`);
    }
  }

  /**
   * Busca mappings por descripción (búsqueda parcial)
   * @param {string} descripcion - Descripción a buscar
   * @returns {Array} Array de mappings que coinciden
   * @throws {Error} Si hay error en BD
   */
  static async findByDescription(descripcion) {
    try {
      const [rows] = await pool.query(
        'SELECT id_mapping, descripcion FROM mapping WHERE descripcion LIKE ? ORDER BY descripcion',
        [`%${descripcion}%`]
      );
      
      return rows;
    } catch (error) {
      throw new Error(`Error al buscar mappings por descripción: ${error.message}`);
    }
  }

  /**
   * Actualiza una mapping
   * @param {string} id_mapping - ID de la mapping
   * @param {string} descripcion - Nueva descripción
   * @returns {boolean} true si se actualizó, false si no
   * @throws {Error} Si hay error en BD
   */
  static async update(id_mapping, descripcion) {
    try {
      const [result] = await pool.query(
        'UPDATE mapping SET descripcion = ? WHERE id_mapping = ?',
        [descripcion, id_mapping]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error al actualizar mapping: ${error.message}`);
    }
  }

  /**
   * Elimina una mapping
   * @param {string} id_mapping - ID de la mapping
   * @returns {boolean} true si se eliminó, false si no
   * @throws {Error} Si hay error en BD
   */
  static async delete(id_mapping) {
    try {
      const [result] = await pool.query(
        'DELETE FROM mapping WHERE id_mapping = ?',
        [id_mapping]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error al eliminar mapping: ${error.message}`);
    }
  }

  /**
   * Verifica si existe una mapping
   * @param {string} id_mapping - ID de la mapping
   * @returns {boolean} true si existe, false si no
   * @throws {Error} Si hay error en BD
   */
  static async exists(id_mapping) {
    try {
      const [rows] = await pool.query(
        'SELECT 1 FROM mapping WHERE id_mapping = ? LIMIT 1',
        [id_mapping]
      );
      
      return rows.length > 0;
    } catch (error) {
      throw new Error(`Error al verificar existencia de mapping: ${error.message}`);
    }
  }

  /**
   * Cuenta el total de mappings
   * @returns {number} Número total de mappings
   * @throws {Error} Si hay error en BD
   */
  static async count() {
    try {
      const [rows] = await pool.query('SELECT COUNT(*) as total FROM mapping');
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error al contar mappings: ${error.message}`);
    }
  }
}

module.exports = MappingModel;
