// controllers/empresa.controller.js
const EmpresaService = require('../services/empresa.service');

/**
 * Controlador para gestionar las peticiones HTTP de empresas
 */
class EmpresaController {
  /**
   * Crea una nueva empresa
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

      const { id_empresa, descripcion } = req.body;
      const userId = req.user?.id;


      // Validar que los campos estén presentes
      if (id_empresa === undefined || descripcion === undefined) {
        return res.status(400).json({ 
          success: false, 
          message: 'Los campos id_empresa y descripcion son requeridos' 
        });
      }

      // Validar tipos de datos
      if (typeof id_empresa !== 'string' || typeof descripcion !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'Los campos id_empresa y descripcion deben ser texto' 
        });
      }
      
      const result = await EmpresaService.create(id_empresa, descripcion, userId);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);

    } catch (error) {
      console.error('Error al crear empresa:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Obtiene todas las empresas
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async getAll(req, res) {
    try {
      const result = await EmpresaService.getAll();
      
      if (!result.success) {
        return res.status(500).json(result);
      }

      res.status(200).json(result);

    } catch (error) {
      console.error('Error al obtener empresas:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Actualiza una empresa
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async update(req, res) {
    try {
      // Validaciones de parámetros
      if (!req.params || !req.params.id_empresa) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de empresa requerido en la URL' 
        });
      }

      if (typeof req.params.id_empresa !== 'string' || req.params.id_empresa.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de empresa debe ser un texto válido' 
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

      const { id_empresa } = req.params;
      const result = await EmpresaService.update(id_empresa, descripcion, userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);

    } catch (error) {
      console.error('Error al actualizar empresa:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

  /**
   * Elimina una empresa
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  static async delete(req, res) {
    try {
      // Validaciones de parámetros
      if (!req.params || !req.params.id_empresa) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de empresa requerido en la URL' 
        });
      }

      if (typeof req.params.id_empresa !== 'string' || req.params.id_empresa.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de empresa debe ser un texto válido' 
        });
      }
      const userId = req.user?.id;

      const { id_empresa } = req.params;
      const result = await EmpresaService.delete(id_empresa, userId);
      
      if (!result.success) {
        return res.status(404).json(result);
      }

      res.status(200).json(result);

    } catch (error) {
      console.error('Error al eliminar empresa:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }
}

module.exports = EmpresaController;