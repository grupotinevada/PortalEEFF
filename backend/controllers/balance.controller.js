// controllers/balance.controller.js
const BalanceService = require('../services/balance.service');

class BalanceController {

  static async createBulk(req, res) {
  try {
    const balances = req.body;
    // Suponiendo que el userId está almacenado en una cookie llamada 'userId'
    const userId = req.cookies?.userId;

    if (!Array.isArray(balances)) {
      return res.status(400).json({
        success: false,
        message: 'El cuerpo debe ser un array de balances'
      });
    }

    const result = await BalanceService.createBulk(balances, userId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error('Error al subir balances masivamente:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

  static async create(req, res) {
    try {
      const {
        num_cuenta,
        nombre,
        saldo,
        fecha_procesado,
        id_user,
        id_empresa
      } = req.body;

      const userId = req.user?.id;

      const result = await BalanceService.create({
        num_cuenta,
        nombre,
        saldo,
        fecha_procesado,
        id_user,
        id_empresa
      }, userId);

      if (!result.success) {
        return res.status(409).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error('Error al crear balance:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async getAll(req, res) {
    try {
      const result = await BalanceService.getAll();
      res.json(result);
    } catch (error) {
      console.error('Error al obtener balances:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  static async getByEmpresaAndFecha(req, res) {
    try {
      const { id_empresa, fecha_procesado } = req.query;

      if (!id_empresa || !fecha_procesado) {
        return res.status(400).json({
          success: false,
          message: 'Se requieren id_empresa y fecha_procesado'
        });
      }

      const result = await BalanceService.getByEmpresaAndFecha(id_empresa, fecha_procesado);
      res.json(result);
    } catch (error) {
      console.error('Error al obtener balances por empresa y fecha:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = BalanceController;
