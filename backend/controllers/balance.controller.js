// controllers/balance.controller.js
const BalanceService = require("../services/balance.service");
const Logger = require("../utils/logger.utils");

class BalanceController {


static async createBulk(req, res) {
  try {
    console.log("POST /bulk - Subiendo balances masivamente");
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
        id_mapping,
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
          id_mapping,
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
    try {
      const response = await BalanceService.getDistinctBalances(req.query);

      if (!response.success) {
        return res.status(400).json({ message: response.message });
      }
      res.json(response);
    } catch (error) {
      console.error(`Error en BalanceController.getResumen: ${error.message}`); // O usar tu Logger     
      res.status(500).json({ message: "Ocurrió un error interno en el servidor." });
    }
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

/**
 * Controlador para verificar si un nombre de balance ya existe.
 * @param {object} req - Objeto de solicitud de Express.
 * @param {object} res - Objeto de respuesta de Express.
 */
static async checkName(req, res) {
  const { nombre } = req.params;

  if (!nombre) {
    return res.status(400).json({
      success: false,
      message: 'El parámetro "nombre" es obligatorio.'
    });
  }

  try {
    const isAvailable = await BalanceService.isNameAvailable(nombre);

    if (isAvailable) {
      return res.status(200).json({
        success: true,
        message: `El nombre de balance '${nombre}' está disponible.`,
        isAvailable: true
      });
    } else {
      return res.status(409).json({ // 409 Conflict es ideal para esto.
        success: false,
        message: `El nombre de balance '${nombre}' ya está en uso.`,
        isAvailable: false
      });
    }
  } catch (error) {
    // Si algo falla en el servicio o el modelo, se captura aquí.
    Logger.error(`Error en el controlador al verificar el nombre '${nombre}':`, error);
    
    return res.status(500).json({
      success: false,
      message: 'Ocurrió un error inesperado en el servidor.'
    });
  }
}

/**
 * Controlador para actualizar un conjunto de balances.
 * @param {object} req - Objeto de solicitud de Express.
 * @param {object} res - Objeto de respuesta de Express.
 */
static async update(req, res) {
  console.log("PUT /:id_blce - Actualizando balance");
    try {
        const { id_blce } = req.params;         
        const balances = req.body;  
        console.log("Primeros 3 balances:", balances.slice(0, 3));
        const userId = req.user?.id_user;       

        if (!userId) {
            return res.status(401).json({ success: false, message: 'Usuario no autenticado.' });
        }
        if (!id_blce) {
            return res.status(400).json({ success: false, message: 'Falta el ID del balance en la URL.' });
        }
        if (!Array.isArray(balances)) {
            return res.status(400).json({ success: false, message: 'El cuerpo de la petición debe ser un array.' });
        }

        Logger.info(`Usuario ${userId} inició la actualización del balance con ID: ${id_blce}`);
        const result = await BalanceService.update(id_blce, balances, userId);

        // --- Manejo de la Respuesta del Servicio ---
        if (!result.success) {
           
            const statusCode = result.message.includes('en uso') ? 409 : (result.message.includes('No se encontró') ? 404 : 400);
            return res.status(statusCode).json(result);
        }

        // Si todo salió bien
        return res.status(200).json(result);

    } catch (error) {
        Logger.error(`Error en BalanceController.update: ${error.message}`);
        res.status(500).json({
            success: false,
            message: "Error interno del servidor al actualizar el balance.",
        });
    }
}

}

module.exports = BalanceController;
