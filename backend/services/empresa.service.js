const EmpresaModel = require('../models/empresa.model');
const Logger = require('../utils/logger.utils');

/**
 * Servicio para gestionar la lógica de negocio de empresas
 */
class EmpresaService {
  /**
   * Crea una nueva empresa
   * @param {string} id_empresa - ID único de la empresa
   * @param {string} descripcion - Descripción de la empresa
   * @param {number} userId - ID del usuario que realiza la acción (para logging)
   * @returns {Object} Resultado de la operación
   */
  static async create(id_empresa, descripcion, userId) {
    try {
      if (!id_empresa || typeof id_empresa !== 'string' || id_empresa.trim() === '') {
        return { success: false, message: 'El ID de empresa es obligatorio' };
      }

      if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
        return { success: false, message: 'La descripción es obligatoria' };
      }

      const nuevaempresa = await EmpresaModel.create(id_empresa.trim(), descripcion.trim());
      
      Logger.userAction(userId, 'CREAR_EMPRESA', `ID: ${id_empresa.trim()}, Desc: ${descripcion.trim()}`);

      return { success: true, message: 'empresa creada', empresa: nuevaempresa };

    } catch (error) {
      Logger.error(`Error en empresaService.create: ${error.message}`);

      if (error.message.includes('ya existe')) {
        return { success: false, message: 'Ya existe una empresa con ese ID' };
      }
      
      return { success: false, message: 'Error al crear la empresa' };
    }
  }

  /**
   * Obtiene todas las empresas
   * @returns {Object} Resultado de la operación
   */
  static async getAll() {
    try {
      const empresas = await EmpresaModel.findAll();
      return { success: true, data: empresas };

    } catch (error) {
      Logger.error(`Error en empresaService.getAll: ${error.message}`);
      return { success: false, message: 'Error al obtener las empresas' };
    }
  }

  /**
   * Actualiza una empresa
   * @param {string} id_empresa - ID de la empresa
   * @param {string} descripcion - Nueva descripción
   * @param {number} userId - ID del usuario que realiza la acción (para logging)
   * @returns {Object} Resultado de la operación
   */
  static async update(id_empresa, descripcion, userId) {
    try {
      if (!id_empresa || typeof id_empresa !== 'string' || id_empresa.trim() === '') {
        return { success: false, message: 'El ID de empresa es obligatorio' };
      }

      if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
        return { success: false, message: 'La descripción es obligatoria' };
      }

      const updated = await EmpresaModel.update(id_empresa.trim(), descripcion.trim());
      
      if (!updated) {
        return { success: false, message: 'empresa no encontrada o sin cambios' };
      }

      Logger.userAction(userId, 'ACTUALIZAR_EMPRESA', `ID: ${id_empresa.trim()}, Desc: ${descripcion.trim()}`);
      
      return { success: true, message: 'empresa actualizada' };

    } catch (error) {
      Logger.error(`Error en empresaService.update: ${error.message}`);
      return { success: false, message: 'Error al actualizar la empresa' };
    }
  }

  /**
   * Elimina una empresa
   * @param {string} id_empresa - ID de la empresa
   * @param {number} userId - ID del usuario que realiza la acción (para logging)
   * @returns {Object} Resultado de la operación
   */
  static async delete(id_empresa, userId) {
    try {
      if (!id_empresa || typeof id_empresa !== 'string' || id_empresa.trim() === '') {
        return { success: false, message: 'El ID de empresa es obligatorio' };
      }

      const deleted = await EmpresaModel.delete(id_empresa.trim());
      
      if (!deleted) {
        return { success: false, message: 'empresa no encontrada' };
      }

      Logger.userAction(userId, 'ELIMINAR_EMPRESA', `ID: ${id_empresa.trim()}`);
      
      return { success: true, message: 'empresa eliminada' };

    } catch (error) {
      Logger.error(`Error en empresaService.delete: ${error.message}`);
      return { success: false, message: 'Error al eliminar la empresa' };
    }
  }
}

module.exports = EmpresaService;
