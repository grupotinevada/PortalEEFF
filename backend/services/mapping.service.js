const MappingModel = require('../models/mapping.model');
const Logger = require('../utils/logger.utils');

/**
 * Servicio para gestionar la lógica de negocio de mappings
 */
class MappingService {
  /**
   * Obtiene todas las mappings
   * @returns {Object} Resultado de la operación
   */
  static async findAvailableMappings() {
    try {
      const mappings = await MappingModel.findAvailableMappings();
      return { success: true, data: mappings };

    } catch (error) {
      Logger.error(`Error en MappingService.findAvailableMappings: ${error.message}`);
      return { success: false, message: 'Error al obtener las mappings' };
    }
  }

  /**
   * Obtiene un mapping completo y maneja la lógica de negocio.
   * @param {string} id_mapping - El ID del mapping a buscar.
   * @returns {Promise<Array>} Los datos del mapping.
   * @throws {Error} Lanza un error si el mapping no se encuentra.
   */
  static async getById(id_mapping) {
    // 1. Llama al modelo para obtener los datos crudos.
    const mappingData = await MappingModel.findById(id_mapping);

    // 2. Aplica la lógica de negocio: verificar si los datos existen.
    if (!mappingData || mappingData.length === 0) {
      // Si no hay datos, lanzamos un error específico.
      // Esto permite que el controlador sepa qué tipo de error ocurrió.
      const error = new Error(`No se encontraron datos para el mapping con ID: ${id_mapping}`);
      error.status = 404; // Asignamos un status de "Not Found" al error.
      throw error;
    }

    // 3. Devuelve los datos si todo está correcto.
    return mappingData;
  }


}

module.exports = MappingService;
