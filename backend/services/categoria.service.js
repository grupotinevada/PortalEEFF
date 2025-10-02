const Categoria = require('../models/categoria.model');
const Logger = require('../utils/logger.utils');

class CategoriaService {

    static async getAllCategoria() {
    try {
      const estados = await Categoria.findAllCategoria();
      return { success: true, data: estados };

    } catch (error) {
      Logger.error(`Error en Categoria.findAllCategorias: ${error.message}`);
      return { success: false, message: 'Error al obtener las categorias' };
    }
  }
}

module.exports = CategoriaService;
