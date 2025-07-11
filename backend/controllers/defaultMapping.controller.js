const DefaultMappingService = require('../services/defaultMapping.service');

class DefaultMappingController {

  static async getAll(req, res) {
    try {
      const data = await DefaultMappingService.getAll();
      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error('Error al obtener mappings:', err);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  static async create(req, res) {
    try {
      const mapping = req.body;
      await DefaultMappingService.create(mapping);
      res.status(201).json({ success: true, message: 'Mapping creado correctamente' });
    } catch (err) {
      console.error('Error al crear mapping:', err);
      res.status(500).json({ success: false, message: 'Error al crear el mapping' });
    }
  }

  static async update(req, res) {
    try {
      const mapping = req.body;
      await DefaultMappingService.update(mapping);
      res.status(200).json({ success: true, message: 'Mapping actualizado correctamente' });
    } catch (err) {
      console.error('Error al actualizar mapping:', err);
      res.status(500).json({ success: false, message: 'Error al actualizar el mapping' });
    }
  }

}

module.exports = DefaultMappingController;
