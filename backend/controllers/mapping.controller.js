// controllers/mapping.controller.js
const MappingService = require('../services/mapping.service');

/**
 * Controlador para gestionar las peticiones HTTP de mappings
 */
class MappingController {
  /**
   * Crea una nueva mapping
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async create(req, res) {
    try {
      // Validaciones de entrada HTTP
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Datos requeridos en el cuerpo de la petición' 
        });
      }

      const { id_mapping, descripcion } = req.body;
      const userId = req.user?.id;


      // Validar que los campos estén presentes
      if (id_mapping === undefined || descripcion === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: 'Los campos id_mapping y descripcion son requeridos' 
        });
      }

      // Validar tipos de datos
      if (typeof id_mapping !== 'string' || typeof descripcion !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Los campos id_mapping y descripcion deben ser texto' 
        });
      }
      
      const result = await MappingService.create(id_mapping, descripcion, userId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);

    } catch (error) {
      console.error('Error al crear mapping:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Obtiene todas las mappings
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getAll(req, res) {
    try {
      const result = await MappingService.getAll();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json(result);

    } catch (error) {
      console.error('Error al obtener mappings:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Actualiza una mapping
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async update(req, res) {
    try {
      // Validaciones de parámetros
      if (!req.params || !req.params.id_mapping) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de mapping requerido en la URL' 
        });
      }

      if (typeof req.params.id_mapping !== 'string' || req.params.id_mapping.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de mapping debe ser un texto válido' 
        });
      }

      // Validaciones de cuerpo
      if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Datos requeridos en el cuerpo de la petición' 
        });
      }

      const { descripcion } = req.body;
      const userId = req.user?.id;

      if (descripcion === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: 'El campo descripcion es requerido' 
        });
      }

      if (typeof descripcion !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'El campo descripcion debe ser texto' 
        });
      }

      const { id_mapping } = req.params;
      const result = await MappingService.update(id_mapping, descripcion, userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);

    } catch (error) {
      console.error('Error al actualizar mapping:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Elimina una mapping
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async delete(req, res) {
    try {
      // Validaciones de parámetros
      if (!req.params || !req.params.id_mapping) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de mapping requerido en la URL' 
        });
      }

      if (typeof req.params.id_mapping !== 'string' || req.params.id_mapping.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de mapping debe ser un texto válido' 
        });
      }
      const userId = req.user?.id;

      const { id_mapping } = req.params;
      const result = await MappingService.delete(id_mapping, userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);

    } catch (error) {
      console.error('Error al eliminar mapping:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }
}

module.exports = MappingController;