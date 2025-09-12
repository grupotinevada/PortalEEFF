const EstadoService = require('../services/estado.service');

class EstadoController {

  static async getAllEstados(req, res) {
    try {
      const result = await EstadoService.getAllEstado();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json(result);

    } catch (error) {
      console.error('Error al obtener estado:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

}

module.exports = EstadoController;
