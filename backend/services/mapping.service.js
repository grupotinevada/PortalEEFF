const MappingModel = require('../models/mapping.model');
const Logger = require('../utils/logger.utils');

/**
 * Servicio para gestionar la lógica de negocio de mappings
 */
class MappingService {
  /**
   * Obtiene todas las mappings
   * @returns {Object} Resultado de la operación
   */
  static async findAvailableMappings() {
    try {
      const mappings = await MappingModel.findAvailableMappings();
      return { success: true, data: mappings };

    } catch (error) {
      Logger.error(`Error en MappingService.findAvailableMappings: ${error.message}`);
      return { success: false, message: 'Error al obtener las mappings' };
    }
  }

  /**
   * Obtiene un mapping completo y maneja la lógica de negocio.
   * @param {string} id_mapping - El ID del mapping a buscar.
   * @returns {Promise<Array>} Los datos del mapping.
   * @throws {Error} Lanza un error si el mapping no se encuentra.
   */
  static async getById(id_mapping) {
    // 1. Llama al modelo para obtener los datos crudos.
    const mappingData = await MappingModel.findById(id_mapping);

    // 2. Aplica la lógica de negocio: verificar si los datos existen.
    if (!mappingData || mappingData.length === 0) {
      // Si no hay datos, lanzamos un error específico.
      // Esto permite que el controlador sepa qué tipo de error ocurrió.
      const error = new Error(`No se encontraron datos para el mapping con ID: ${id_mapping}`);
      error.status = 404; // Asignamos un status de "Not Found" al error.
      throw error;
    }

    // 3. Devuelve los datos si todo está correcto.
    return mappingData;
  }


  /**
   * Orquesta la creación de un nuevo mapeo, aplicando reglas de negocio.
   * @param {Object} datosMapeo - Objeto con los datos del mapeo.
   * @param {string} datosMapeo.num_cuenta - El número de cuenta.
   * @param {string} datosMapeo.id_fsa - El ID FSA a asignar.
   * @param {string} datosMapeo.id_mapping - El grupo de mapeo.
   * @param {string} usuarioId - El ID del usuario que realiza la acción (para el log).
   * @returns {boolean} Retorna `true` si se creó el mapeo.
   * @throws {Error} Si los datos son inválidos, el mapeo ya existe, o falla la BD.
   */
  static async asignarMapeo(datosMapeo, usuarioId) {
    const { num_cuenta, id_fsa, id_mapping } = datosMapeo;

    try {
      // 1. Validación de datos de entrada
      if (!num_cuenta || !id_fsa || !id_mapping) {
        throw new Error('Datos incompletos. Se requiere num_cuenta, id_fsa y id_mapping.');
      }

      // 2. Regla de Negocio: Verificar si el mapeo ya existe para esta cuenta.
      const mapeoExistente = await MappingModel.findByCuentaAndMapping(num_cuenta, id_mapping);
      if (mapeoExistente) {
        throw new Error(`La cuenta ${num_cuenta} ya tiene una asignación en el mapping ${id_mapping}.`);
      }

      // 3. Ejecución: Llamar al modelo para crear el registro.
      const exito = await MappingModel.asociarMapping(num_cuenta, id_fsa, id_mapping);

      // 4. Logging de Auditoría (Éxito)
      if (exito) {
        Logger.info(`Usuario [${usuarioId}] asignó la cuenta [${num_cuenta}] al FSA [${id_fsa}] en el mapping [${id_mapping}].`);
      }

      return exito;

    } catch (error) {
      // 5. Logging de Error
      Logger.error(`Error en MappingService.asignarMapeo para usuario [${usuarioId}]: ${error.message}`);
      // Re-lanzamos el error para que el Controlador lo capture y envíe una respuesta HTTP adecuada.
      throw error;
    }
  }


  //funcion upsertMapping
  static async crearOActualizarMapeo(datosMapeo) {
    const { num_cuenta, id_fsa, id_mapping, descripcion } = datosMapeo;

    // 1. Validación de datos de entrada
    if (!num_cuenta || !id_fsa || !id_mapping || !descripcion) {
      throw new Error('Datos incompletos. Se requiere num_cuenta, id_fsa y id_mapping.');
    }

    // 2. Llamada al modelo
    return MappingModel.crearOActualizarMapeo(num_cuenta, id_fsa, id_mapping, descripcion);
  }

  /**
   * Clona un mapping existente y crea uno nuevo con cambios opcionales
   * @param {string} idMappingOrigen - ID del mapping que se quiere clonar
   * @param {string} idMappingNuevo - ID del nuevo mapping
   * @param {string} descripcionNueva - Descripción del nuevo mapping
   * @param {Array<Object>} cambios - [{ num_cuenta, id_fsa }]
   * @returns {Object} Resumen de la operación
   */
static async cloneMapping(idMappingOrigen, idMappingNuevo, descripcionNueva, cambios = []) {
  try {
    // 1. Validar que el nuevo id_mapping no exista
    const existente = await MappingModel.findById(idMappingNuevo);
    if (existente.length > 0) {
      Logger.error(`Error en cloneMapping: El id_mapping '${idMappingNuevo}' ya existe`);
      
      // Crea un nuevo objeto de error con un atributo 'status' que el controlador puede leer.
      const error = new Error(`El id_mapping '${idMappingNuevo}' ya existe, usa otro`);
      error.status = 409; 
      throw error; 
    }

    // 2. Obtener las filas del mapping origen
    const filasOrigen = await MappingModel.findById(idMappingOrigen);
    if (filasOrigen.length === 0) {
      Logger.error(`Error en cloneMapping: El mapping de origen '${idMappingOrigen}' no existe o está vacío`);
      throw new Error(`El mapping de origen '${idMappingOrigen}' no existe o está vacío`);
    }

    // 3. Preparar filas para el nuevo mapping
    Logger.info(`Clonando mapping '${idMappingOrigen}' a '${idMappingNuevo}' con ${filasOrigen.length} filas`);
    const filasNuevas = filasOrigen.map(r => ({
      num_cuenta: r.num_cuenta,
      id_fsa: r.id_fsa,
      id_mapping: idMappingNuevo,
      descripcion: descripcionNueva
    }));

    // 4. Insertar el nuevo mapping
    const insertadas = await MappingModel.createMapping(filasNuevas);
    Logger.info(`Mapping '${idMappingNuevo}' creado con ${insertadas} filas clonadas de '${idMappingOrigen}'`);
    
    // 5. Aplicar cambios opcionales
    let actualizadas = 0;
    if (Array.isArray(cambios) && cambios.length > 0) {
      actualizadas = await MappingModel.updateMapping(idMappingNuevo, cambios);
    }

    return {
      idMappingNuevo,
      descripcionNueva,
      insertadas,
      actualizadas
    };
  } catch (error) {
    Logger.error(`Error en MappingService.cloneMapping: ${error.message}`);
    // Vuelve a lanzar el mismo error. Si tiene un 'status' (como el 409 que agregaste),
    // el controlador podrá leerlo y enviar la respuesta correcta.
    throw error;
  }
}
  /**
   * Elimina un mapping por su ID
   * @param {string} idMapping
   * @returns {number} Número de filas eliminadas
   */
  static async deleteMapping(idMapping) {
    try {
      if (idMapping === "MP-01") {
        Logger.error(`No se puede eliminar el mapping protegido '${idMapping}'`);
        throw new Error(`El mapping '${idMapping}' no se puede eliminar.`);
      }
      Logger.info(`Eliminando mapping '${idMapping}'`);
      const deletedRows = MappingModel.deleteMapping(idMapping);
      return { success: true, deletedRows };
    } catch (error) {
      Logger.error(`Error en MappingService.deleteMapping: ${error.message}`);
      return { success: false, message: `Error en deleteMapping: ${error.message}` };
    }
  }
}

module.exports = MappingService;
