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
      const { id_mapping } = req.params;
      const mappingData = await MappingService.getById(id_mapping);
      res.status(200).json(mappingData);

    } catch (error) {
      console.error(error);
      res.status(error.status || 500).json({ message: error.message || 'Error interno del servidor.' });
    }
  }


   /**
   * Maneja la petición HTTP para crear un nuevo mapeo agrega una cuenta + fsa.
   * @param {object} req - El objeto de la petición (request).
   * @param {object} res - El objeto de la respuesta (response).
   */
  static async asignarMapeo(req, res) {
    try {
      // 1. Extraer datos de la petición.
      // Los datos del mapeo vienen en el cuerpo (body) de la petición.
      const datosMapeo = req.body;

      // Asumimos que un middleware de autenticación ya verificó al usuario
      // y adjuntó su información al objeto `req`.
      const usuarioId = req.user.id; 

      // 2. Llamar al servicio para que ejecute la lógica de negocio.
      await MappingService.asignarMapeo(datosMapeo, usuarioId);

      // 3. Enviar una respuesta de éxito.
      // El código 201 Created es el estándar para una creación exitosa.
      res.status(201).json({
        success: true,
        message: 'Mapeo creado exitosamente.'
      });

    } catch (error) {
      // 4. Manejar errores que vienen del servicio.
      // Si el error es por datos duplicados (lanzado por el servicio).
      if (error.message.includes('ya tiene una asignación')) {
        return res.status(409).json({ // 409 Conflict
          success: false,
          message: error.message
        });
      }
      // Si el error es por datos inválidos.
      if (error.message.includes('Datos incompletos')) {
        return res.status(400).json({ // 400 Bad Request
          success: false,
          message: error.message
        });
      }

      // Para cualquier otro tipo de error (ej: fallo de la BD).
      res.status(500).json({ // 500 Internal Server Error
        success: false,
        message: 'Ocurrió un error interno en el servidor.'
      });
    }
  }

  static async crearOActualizarMapeo(req, res) {
  try {
    // Llama al servicio con los datos del body de la petición
    await MappingService.crearOActualizarMapeo(req.body);

    // Si todo va bien, envía una respuesta de éxito.
    res.status(200).json({ 
      success: true, 
      message: 'Mapeo guardado exitosamente.' 
    });

  } catch (error) {
    // Si el error es por datos inválidos, envía un 400.
    if (error.message.includes('Datos incompletos')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    // Para cualquier otro error (ej. de la BD), envía un 500.
    res.status(500).json({ success: false, message: error.message });
  }
}
  

    /**
   * Clona un mapping
   * @route POST /mappings/clone
   * @body { idMappingOrigen, idMappingNuevo, descripcionNueva, cambios[] }
   */
static async cloneMapping(req, res) {
  try {
    const { idMappingOrigen, idMappingNuevo, descripcionNueva, cambios } = req.body;

    if (!idMappingOrigen || !idMappingNuevo || !descripcionNueva) {
      return res.status(400).json({
        error: 'idMappingOrigen, idMappingNuevo y descripcionNueva son obligatorios'
      });
    }

    const resultado = await MappingService.cloneMapping(
      idMappingOrigen,
      idMappingNuevo,
      descripcionNueva,
      cambios || []
    );

    return res.status(201).json({
      message: 'Mapping clonado exitosamente',
      data: resultado
    });
  } catch (error) {
    // 1. Aquí se comprueba si el error tiene un 'status' específico.
    if (error.status) {
      // 2. Si lo tiene, se devuelve ese código de estado (por ejemplo, 409).
      return res.status(error.status).json({
        error: error.message
      });
    }

    // 3. Si el error no tiene un 'status' específico, se asume que es un error del servidor.
    return res.status(500).json({
      error: error.message || 'Error al clonar el mapping'
    });
  }
}

  /**
   * Elimina un mapping completo
   * @route DELETE /mappings/:idMapping
   */
  static async deleteMapping(req, res) {
    try {
      console.log("Llega a deleteMapping en el controlador");
      console.log("Parámetros recibidos:", req.params);
      const { id_mapping } = req.params;
      console.log("ID a eliminar:", id_mapping);
      if (!id_mapping) {
        return res.status(400).json({ error: 'Debe especificar un id_mapping' });
      }

      const eliminadas = await MappingService.deleteMapping(id_mapping);

      return res.status(200).json({
        message: `Mapping '${id_mapping}' eliminado`,
        filasEliminadas: eliminadas
      });
    } catch (error) {
      return res.status(500).json({
        error: error.message || 'Error al eliminar el mapping'
      });
    }
  }
}

module.exports = MappingController;