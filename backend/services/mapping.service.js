const MappingModel = require('../models/mapping.model');
const Logger = require('../utils/logger.utils');

/**
 * Servicio para gestionar la lógica de negocio de mappings
 */
class MappingService {
  /**
   * Crea una nueva mapping
   * @param {string} id_mapping - ID único de la mapping
   * @param {string} descripcion - Descripción de la mapping
   * @param {number} userId - ID del usuario que realiza la acción (para logging)
   * @returns {Object} Resultado de la operación
   */
  static async create(id_mapping, descripcion, userId) {
    try {
      if (!id_mapping || typeof id_mapping !== 'string' || id_mapping.trim() === '') {
        return { success: false, message: 'El ID de mapping es obligatorio' };
      }

      if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
        return { success: false, message: 'La descripción es obligatoria' };
      }

      const nuevaMapping = await MappingModel.create(id_mapping.trim(), descripcion.trim());
      
      Logger.userAction(userId, 'CREAR_EMPRESA', `ID: ${id_mapping.trim()}, Desc: ${descripcion.trim()}`);

      return { success: true, message: 'mapping creada', mapping: nuevaMapping };

    } catch (error) {
      Logger.error(`Error en MappingService.create: ${error.message}`);

      if (error.message.includes('ya existe')) {
        return { success: false, message: 'Ya existe una mapping con ese ID' };
      }
      
      return { success: false, message: 'Error al crear la mapping' };
    }
  }

  /**
   * Obtiene todas las mappings
   * @returns {Object} Resultado de la operación
   */
  static async getAll() {
    try {
      const mappings = await MappingModel.findAll();
      return { success: true, data: mappings };

    } catch (error) {
      Logger.error(`Error en MappingService.getAll: ${error.message}`);
      return { success: false, message: 'Error al obtener las mappings' };
    }
  }

  /**
   * Actualiza una mapping
   * @param {string} id_mapping - ID de la mapping
   * @param {string} descripcion - Nueva descripción
   * @param {number} userId - ID del usuario que realiza la acción (para logging)
   * @returns {Object} Resultado de la operación
   */
  static async update(id_mapping, descripcion, userId) {
    try {
      if (!id_mapping || typeof id_mapping !== 'string' || id_mapping.trim() === '') {
        return { success: false, message: 'El ID de mapping es obligatorio' };
      }

      if (!descripcion || typeof descripcion !== 'string' || descripcion.trim() === '') {
        return { success: false, message: 'La descripción es obligatoria' };
      }

      const updated = await MappingModel.update(id_mapping.trim(), descripcion.trim());
      
      if (!updated) {
        return { success: false, message: 'mapping no encontrada o sin cambios' };
      }

      Logger.userAction(userId, 'ACTUALIZAR_EMPRESA', `ID: ${id_mapping.trim()}, Desc: ${descripcion.trim()}`);
      
      return { success: true, message: 'mapping actualizada' };

    } catch (error) {
      Logger.error(`Error en MappingService.update: ${error.message}`);
      return { success: false, message: 'Error al actualizar la mapping' };
    }
  }

  /**
   * Elimina una mapping
   * @param {string} id_mapping - ID de la mapping
   * @param {number} userId - ID del usuario que realiza la acción (para logging)
   * @returns {Object} Resultado de la operación
   */
  static async delete(id_mapping, userId) {
    try {
      if (!id_mapping || typeof id_mapping !== 'string' || id_mapping.trim() === '') {
        return { success: false, message: 'El ID de mapping es obligatorio' };
      }

      const deleted = await MappingModel.delete(id_mapping.trim());
      
      if (!deleted) {
        return { success: false, message: 'mapping no encontrada' };
      }

      Logger.userAction(userId, 'ELIMINAR_EMPRESA', `ID: ${id_mapping.trim()}`);
      
      return { success: true, message: 'mapping eliminada' };

    } catch (error) {
      Logger.error(`Error en MappingService.delete: ${error.message}`);
      return { success: false, message: 'Error al eliminar la mapping' };
    }
  }
}

module.exports = MappingService;
