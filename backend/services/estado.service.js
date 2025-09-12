const Estado = require('../models/estado.model');

class EstadoService {

    static async getAllEstado() {
    try {
      const estados = await Estado.findAllEstados();
      return { success: true, data: estados };

    } catch (error) {
      Logger.error(`Error en Estado.findAllEstados: ${error.message}`);
      return { success: false, message: 'Error al obtener los estados' };
    }
  }
}

module.exports = EstadoService;
