// models/empresa.model.js
const { pool } = require('../config/database');

/**
 * Modelo para gestionar empresas
 */
class EmpresaModel {
  /**
   * Crea una nueva empresa
   * @param {string} id_empresa - ID único de la empresa
   * @param {string} descripcion - Descripción de la empresa
   * @returns {Object} La empresa creada
   * @throws {Error} Si hay error en BD
   */
  static async create(id_empresa, descripcion) {
    try {
      const [result] = await pool.query(
        'INSERT INTO empresa (id_empresa, descripcion) VALUES (?, ?)',
        [id_empresa, descripcion]
      );

      return { 
        id_empresa, 
        descripcion,
        insertId: result.insertId
      };
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error(`Empresa con ID ${id_empresa} ya existe`);
      }
      throw new Error(`Error al crear empresa: ${error.message}`);
    }
  }

  /**
   * Obtiene todas las empresas
   * @returns {Array} Array de empresas
   * @throws {Error} Si hay error en BD
   */
  static async findAll() {
    try {
      const [rows] = await pool.query(
        'SELECT id_empresa, descripcion FROM empresa ORDER BY descripcion'
      );
      return rows;
    } catch (error) {
      throw new Error(`Error al obtener empresas: ${error.message}`);
    }
  }

  /**
   * Busca una empresa por ID
   * @param {string} id_empresa - ID de la empresa
   * @returns {Object|null} La empresa encontrada o null
   * @throws {Error} Si hay error en BD
   */
  static async findById(id_empresa) {
    try {
      const [rows] = await pool.query(
        'SELECT id_empresa, descripcion FROM empresa WHERE id_empresa = ?',
        [id_empresa]
      );
      
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error al buscar empresa: ${error.message}`);
    }
  }

  /**
   * Busca empresas por descripción (búsqueda parcial)
   * @param {string} descripcion - Descripción a buscar
   * @returns {Array} Array de empresas que coinciden
   * @throws {Error} Si hay error en BD
   */
  static async findByDescription(descripcion) {
    try {
      const [rows] = await pool.query(
        'SELECT id_empresa, descripcion FROM empresa WHERE descripcion LIKE ? ORDER BY descripcion',
        [`%${descripcion}%`]
      );
      
      return rows;
    } catch (error) {
      throw new Error(`Error al buscar empresas por descripción: ${error.message}`);
    }
  }

  /**
   * Actualiza una empresa
   * @param {string} id_empresa - ID de la empresa
   * @param {string} descripcion - Nueva descripción
   * @returns {boolean} true si se actualizó, false si no
   * @throws {Error} Si hay error en BD
   */
  static async update(id_empresa, descripcion) {
    try {
      const [result] = await pool.query(
        'UPDATE empresa SET descripcion = ? WHERE id_empresa = ?',
        [descripcion, id_empresa]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error al actualizar empresa: ${error.message}`);
    }
  }

  /**
   * Elimina una empresa
   * @param {string} id_empresa - ID de la empresa
   * @returns {boolean} true si se eliminó, false si no
   * @throws {Error} Si hay error en BD
   */
  static async delete(id_empresa) {
    try {
      const [result] = await pool.query(
        'DELETE FROM empresa WHERE id_empresa = ?',
        [id_empresa]
      );

      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error al eliminar empresa: ${error.message}`);
    }
  }

  /**
   * Verifica si existe una empresa
   * @param {string} id_empresa - ID de la empresa
   * @returns {boolean} true si existe, false si no
   * @throws {Error} Si hay error en BD
   */
  static async exists(id_empresa) {
    try {
      const [rows] = await pool.query(
        'SELECT 1 FROM empresa WHERE id_empresa = ? LIMIT 1',
        [id_empresa]
      );
      
      return rows.length > 0;
    } catch (error) {
      throw new Error(`Error al verificar existencia de empresa: ${error.message}`);
    }
  }

  /**
   * Cuenta el total de empresas
   * @returns {number} Número total de empresas
   * @throws {Error} Si hay error en BD
   */
  static async count() {
    try {
      const [rows] = await pool.query('SELECT COUNT(*) as total FROM empresa');
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error al contar empresas: ${error.message}`);
    }
  }
}

module.exports = EmpresaModel;
