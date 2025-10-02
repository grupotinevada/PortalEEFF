const Fsa = require('../models/fsa.model');
const Logger = require('../utils/logger.utils');

class FsaService {

    static async getAllFsa() {
    try {
      const estados = await Fsa.getFsaCategoria();
      return { success: true, data: estados };

    } catch (error) {
      Logger.error(`Error en Fsa.findAllFsas: ${error.message}`);
      return { success: false, message: 'Error al obtener las Fsas' };
    }
  }
      /**
     * Crea un nuevo registro FSA.
     * @param {string} id_fsa - El ID único del FSA.
     * @param {string} desc - La descripción del FSA.
     * @param {string} id_cate - El ID de la categoría.
     * @param {number} orden - El número de orden.
     * @returns {object} El objeto FSA creado.
     * @throws {Error} Si algún campo es nulo o si ya existe un FSA con el mismo ID.
     */
    static async createFsa({ idFsa, descripcion, categoria, orden }) {

        console.log("Llega a FsaService.createFsa con datos:", idFsa, descripcion, categoria, orden);
        try {
            // 1. Validar la entrada de datos (Lógica de Negocio)
            if (!idFsa || !descripcion || !categoria || !orden) {
                const error = new Error('Los campos id_fsa, desc, id_cate y orden son obligatorios.');
                error.status = 400; // Bad Request
                throw error;
            }

            // 2. Validar si el FSA ya existe usando getFsaCategoria.
            // Aunque getFsaCategoria traiga todos los registros, podemos usarla para la validación.
            const allFsa = await Fsa.getFsaCategoria();
            const existingFsa = allFsa.find(fsa => fsa.idFsa === idFsa);

            if (existingFsa) {
                const error = new Error(`El FSA con ID '${idFsa}' ya existe.`);
                error.status = 409; // Conflict
                throw error;
            }

            // 3. Llamar al modelo para interactuar con la base de datos
            const newFsa = await Fsa.createFsa({ idFsa, descripcion, categoria, orden });

            Logger.info(`FSA creado exitosamente con ID: ${newFsa.idFsa}`);
            return newFsa;

        } catch (error) {
            // 4. Manejar errores y re-lanzarlos de forma controlada
            Logger.error(`Error en FsaService.createFsa: ${error.message}`);

            throw error;
        }
    }
}

module.exports = FsaService;