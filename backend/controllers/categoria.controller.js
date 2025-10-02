const CategoriaService = require('../services/categoria.service');

class CategoriaController {

  static async getAllEstados(req, res) {
    try {
      const result = await CategoriaService.getAllCategoria();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json(result);

    } catch (error) {
      console.error('Error al obtener categorias:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

}

module.exports = CategoriaController;