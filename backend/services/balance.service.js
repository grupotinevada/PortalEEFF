const BalanceModel = require('../models/balance.model');
const Logger = require('../utils/logger.utils');

/**
 * Servicio para gestionar balances
 */
class BalanceService {
  /**
   * Crea un nuevo balance
   * @param {Object} balanceData - Datos del balance (num_cuenta, nombre, saldo, fecha_procesado, id_user, id_empresa)
   * @param {number} userId - ID del usuario que realiza la acción (para logging)
   * @returns {Object} Resultado de la operación
   */
  static async create(balanceData, userId) {
    const { num_cuenta, id_empresa, fecha_procesado } = balanceData;
    console.log('Hola desde BalanceService.create', balanceData);
    try {
      const exists = await BalanceModel.existsByCuentaEmpresaFecha(num_cuenta, id_empresa, fecha_procesado);

      if (exists) {
        return {
          success: false,
          message: `Ya existe un balance para la cuenta ${num_cuenta}, empresa ${id_empresa} y fecha ${fecha_procesado}`
        };
      }

      const result = await BalanceModel.create(balanceData);

      Logger.userAction(userId, 'CREAR_BALANCE', `Cuenta: ${num_cuenta}, Empresa: ${id_empresa}, Fecha: ${fecha_procesado}`);

      return {
        success: true,
        message: 'Balance insertado correctamente',
        balance: result
      };
    } catch (error) {
      Logger.error(`Error en BalanceService.create: ${error.message}`);
      return { success: false, message: 'Error al insertar el balance' };
    }
  }
  /**
   * Crea un array de balances
   * @param {string} balances - Array del balance (num_cuenta, nombre, saldo, fecha_procesado, id_user, id_empresa)
   * @param {string} userId - Id del usaurio que realiza la acción (para logging)
   * @returns {Object} Resultado de la operación
   */
static async createBulk(balances, userId) {
  try {
    // Filtrar balances ya existentes (opcional pero recomendable)
    const balancesToInsert = [];
    for (const b of balances) {
      const exists = await BalanceModel.existsByCuentaEmpresaFecha(
        b.num_cuenta,
        b.id_empresa,
        b.ejercicio
      );
      if (!exists) {
        b.id_user = userId;
        balancesToInsert.push(b);
      }
    }

    if (balancesToInsert.length === 0) {
      return { success: false, message: 'Todos los balances ya existen.' };
    }
    console.log('Balances a insertar:', balancesToInsert);
    const result = await BalanceModel.createBulk(balancesToInsert);

    Logger.userAction(userId, 'CREAR_BALANCE_BULK', `Insertados: ${result.inserted}`);
    return {
      success: true,
      message: `Se insertaron ${result.inserted} balances.`,
      inserted: result.inserted
    };
  } catch (error) {
    Logger.error(`Error en BalanceService.createBulk: ${error.message}`);
    return { success: false, message: 'Error al insertar balances masivamente' };
  }
}
  /**
   * Obtiene balances por empresa y fecha
   * @param {string} id_empresa - ID de la empresa
   * @param {string} fecha_inicio - Fecha del balance desde
   * @param {string} fecha_fin - Fecha del balance fin
   * @returns {Object} Resultado de la operación
   */
// services/balance.service.js


static async getByEmpresaYPeriodoFlexible({ id_empresa, fecha_inicio, fecha_fin, fecha_consulta }) {
  try {
    let balances;
    let modoConsulta;

    if (fecha_inicio && fecha_fin) {
      modoConsulta = 'rango';
      Logger.info(`Consultando balances por rango: Empresa ${id_empresa}, Desde ${fecha_inicio} hasta ${fecha_fin}`);
      balances = await BalanceModel.findByEmpresaEnRango(id_empresa, fecha_inicio, fecha_fin);
    } else if (fecha_consulta) {
      modoConsulta = 'única';
      Logger.info(`Consultando balances por fecha única: Empresa ${id_empresa}, Fecha ${fecha_consulta}`);
      balances = await BalanceModel.findByEmpresaYFechaUnica(id_empresa, fecha_consulta);
    } else {
      Logger.warn(`Consulta fallida: parámetros insuficientes para empresa ${id_empresa}`);
      return { success: false, message: 'Parámetros insuficientes' };
    }

    return {
      success: true,
      modo: modoConsulta,
      data: balances
    };
  } catch (error) {
    Logger.error(`Error en getByEmpresaYPeriodoFlexible: ${error.message}`);
    return { success: false, message: 'Error al obtener balances' };
  }
}


  /**
   * Obtiene todos los balances
   * @returns {Object} Resultado de la operación
   */
  static async getAll() {
    try {
      const balances = await BalanceModel.findAll();

      return {
        success: true,
        data: balances
      };
    } catch (error) {
      Logger.error(`Error en BalanceService.getAll: ${error.message}`);
      return { success: false, message: 'Error al obtener balances' };
    }
  }

    static async getFsaCategoria() {
    try {
      const balances = await BalanceModel.getFsaCategoria();

      return {
        success: true,
        data: balances
      };
    } catch (error) {
      Logger.error(`Error en BalanceService.getAll: ${error.message}`);
      return { success: false, message: 'Error al obtener balances' };
    }
  }
}

module.exports = BalanceService;
