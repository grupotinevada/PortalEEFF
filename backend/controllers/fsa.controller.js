const FsaService = require('../services/fsa.service');

class FsaController {

  static async obtenerFsasConCategoria(req, res) {
    try {
        console.log("Llega a FsaController");
      const fsas = await FsaService.getAllFsa();
      res.json(fsas);
    } catch (err) {
      res.status(500).json({ error: "Error al obtener FSA" });
    }
  }

  /**
     * Maneja la solicitud POST para crear un nuevo FSA.
     * @param {object} req - Objeto de la solicitud (request) de Express.
     * @param {object} res - Objeto de la respuesta (response) de Express.
     * @returns {object} La respuesta JSON con el resultado o el error.
     */
    static async createFsa(req, res) {
      console.log("Llega a createFsa en FsaController");
        try {
            const { idFsa, descripcion, categoria, orden } = req.body;

            console.log("Datos recibidos en el cuerpo de la solicitud:", idFsa, descripcion, categoria, orden);

            const newFsa = await FsaService.createFsa({ idFsa, descripcion, categoria, orden });

            return res.status(201).json({
                message: 'FSA creado exitosamente',
                data: newFsa
            });
        } catch (error) {
            
            if (error.status) {
                return res.status(error.status).json({
                    error: error.message
                });
            }

            return res.status(500).json({
                error: 'Error interno del servidor al crear el FSA.'
            });
        }
    }

  
}

module.exports = FsaController;