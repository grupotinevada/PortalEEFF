// controllers/balance.controller.js
const BalanceService = require("../services/balance.service");
const Logger = require("../utils/logger.utils");
class BalanceController {
  static async createBulk(req, res) {
    try {
      const balances = req.body;
      // Suponiendo que el userId está almacenado en una cookie llamada 'userId'
      const userId = req.cookies?.userId;

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

  static async getAll(req, res) {
    try {
      const result = await BalanceService.getAll();
      res.json(result);
    } catch (error) {
      console.error("Error al obtener balances:", error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
      });
    }
  }

  static async getByEmpresaYPeriodoFlexible(req, res) {
    try {
      const { id_empresa, fecha_inicio, fecha_fin, fecha_consulta } = req.query;

      if (!id_empresa) {
        Logger.warn("Falta id_empresa en la consulta a searchPeriodoFlexible");
        return res.status(400).json({
          success: false,
          message: "Se requiere id_empresa",
        });
      }

      const isDate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d);

      if (fecha_inicio && fecha_fin) {
        if (!isDate(fecha_inicio) || !isDate(fecha_fin)) {
          Logger.warn(
            `Fechas inválidas: fecha_inicio: ${fecha_inicio}, fecha_fin: ${fecha_fin}`
          );
          return res.status(400).json({
            success: false,
            message:
              "fecha_inicio y fecha_fin deben estar en formato YYYY-MM-DD",
          });
        }
      } else if (fecha_consulta) {
        if (!isDate(fecha_consulta)) {
          Logger.warn(`Fecha consulta inválida: ${fecha_consulta}`);
          return res.status(400).json({
            success: false,
            message: "fecha_consulta debe estar en formato YYYY-MM-DD",
          });
        }
      } else {
        Logger.warn(`Consulta sin fechas válida para empresa ${id_empresa}`);
        return res.status(400).json({
          success: false,
          message:
            "Debe proporcionar fecha_inicio y fecha_fin o fecha_consulta",
        });
      }

      Logger.userAction(
        req.user?.id || "desconocido",
        "Consulta balance por periodo",
        `Empresa: ${id_empresa}`
      );
      const result = await BalanceService.getByEmpresaYPeriodoFlexible({
        id_empresa,
        fecha_inicio,
        fecha_fin,
        fecha_consulta,
      });

      res.json(result);
    } catch (error) {
      Logger.error(
        `Error interno en getByEmpresaYPeriodoFlexible: ${error.message}`
      );
      res.status(500).json({
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
