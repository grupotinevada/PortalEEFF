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

}

module.exports = DefaultMappingService;
