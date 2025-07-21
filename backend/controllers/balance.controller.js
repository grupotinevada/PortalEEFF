// controllers/balance.controller.js
const BalanceService = require("../services/balance.service");
const Logger = require("../utils/logger.utils");

class BalanceController {

static async createBulk(req, res) {
  try {
    console.log("POST /bulk - Subiendo balances masivamente");
    console.log("Cuerpo de la petición:", req.body);
    console.log("Usuario autenticado:", req.user);
    const balances = req.body;
    const userId = req.user.id_user;

    if (!Array.isArray(balances)) {
      return res.status(400).json({
        success: false,
        message: "El cuerpo debe ser un array de balances",
      });
    }

    const result = await BalanceService.createBulk(balances, userId);

    if (!result.success) {
      return res.status(409).json(result);
    }

    return res.status(201).json(result);
  } catch (error) {
    console.error("Error al subir balances masivamente:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
}


  static async create(req, res) {
    try {
      const {
        num_cuenta,
        nombre_conjunto,
        nombre,
        saldo,
        ejercicio,
        fecha_inicio,
        fecha_fin,
        id_user,
        id_empresa,
        id_fsa,
      } = req.body;

      const userId = req.user?.id;

      const result = await BalanceService.create(
        {
          num_cuenta,
          nombre_conjunto,
          nombre,
          saldo,
          ejercicio,
          fecha_inicio,
          fecha_fin,
          id_user,
          id_empresa,
          id_fsa,
        },
        userId
      );

      if (!result.success) {
        return res.status(409).json(result);
      }

      return res.status(201).json(result);
    } catch (error) {
      console.error("Error al crear balance:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

//CARGA BALANCES

  static async getResumen(req, res) {
    const response = await BalanceService.getDistinctBalances(req.query);
    if (!response.success) {
      return res.status(400).json(response);
    }
    res.json(response);
  }


static async getById(req, res) {
  try {
    const user = req.user;
    const id_blce = req.params.id_blce;



    // Validación básica del ID
    if (typeof id_blce !== 'string' || id_blce.trim().length === 0) {
      Logger.warn(`Usuario ${user.username} (${user.id}) envió ID inválido: "${id_blce}"`);
      return res.status(400).json({
        success: false,
        message: "ID de balance inválido",
      });
    }

    Logger.info(`Usuario ${user.username} (${user.id_user}) solicitó balance con ID: ${id_blce}`);

    const result = await BalanceService.getById(id_blce);

    if (!result.success) {
      Logger.info(`Balance con ID ${id_blce} no encontrado o inválido`);
      return res.status(404).json(result);
    }

    return res.json(result);
  } catch (error) {
    Logger.error(`Error en BalanceController.getById: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
    });
  }
}



  static async obtenerFsasConCategoria(req, res) {
    try {
      console.log("GET /fsa - Obteniendo FSA con join a categoria");
      const fsas = await BalanceService.getFsaCategoria();
      res.json(fsas);
    } catch (err) {
      console.error("Error en GET /fsa:", err);
      res.status(500).json({ error: "Error al obtener FSA" });
    }
  }
}

module.exports = BalanceController;
