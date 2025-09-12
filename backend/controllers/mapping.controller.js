// controllers/mapping.controller.js
const MappingService = require('../services/mapping.service');

/**
 * Controlador para gestionar las peticiones HTTP de mappings
 */
class MappingController {
 
  /**
   * Obtiene todas las mappings
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async findAvailableMappings(req, res) {
    try {
      const result = await MappingService.findAvailableMappings();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json(result);

    } catch (error) {
      console.error('Error al obtener mappings: en controller: findAvailableMappings', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

  static async getMappingById(req, res) {
    try {
      // 1. Obtenemos el ID desde los parámetros de la URL.
      const { id_mapping } = req.params;

      // 2. El controlador ahora llama al SERVICIO, no al modelo.
      const mappingData = await MappingService.getById(id_mapping);

      // 3. Si el servicio devuelve datos, la respuesta es exitosa.
      res.status(200).json(mappingData);

    } catch (error) {
      // 4. Capturamos cualquier error que el servicio haya lanzado.
      console.error(error);
      
      // Enviamos el status del error (ej: 404) o 500 si es un error genérico.
      res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor.' });
    }
  }

}

module.exports = MappingController;