const DefaultMappingModel = require('../models/defaultMapping.model');

class DefaultMappingService {

  static async getAll() {
    return await DefaultMappingModel.findAll();
  }

  static async create(mapping) {
    return await DefaultMappingModel.create(mapping);
  }

  static async update(mapping) {
    return await DefaultMappingModel.update(mapping);
  }

    static async getAllEstado() {
    try {
      const estados = await DefaultMappingModel.findAllEstados();
      return { success: true, data: estados };

    } catch (error) {
      Logger.error(`Error en defaultMapping.findAllEstados: ${error.message}`);
      return { success: false, message: 'Error al obtener los estados' };
    }
  }
}

module.exports = DefaultMappingService;
