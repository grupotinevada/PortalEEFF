const BalanceModel = require('../models/balance.model');
const Logger = require('../utils/logger.utils');
const crypto = require('crypto');

/**
 * Servicio para gestionar balances
 */

function generarIdBalance({ num_cuenta, id_mapping, ejercicio, fecha_inicio, fecha_fin }) {
  const raw = `${num_cuenta}|${id_mapping}|${ejercicio}|${fecha_inicio}|${fecha_fin}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}


class BalanceService {
 /**
   * Crea un array de balances
   * @param {string} balances - Array del balance (num_cuenta, nombre, saldo, fecha_procesado, id_user, id_mapping)
   * @param {string} userId - Id del usaurio que realiza la acción (para logging)
   * @returns {Object} Resultado de la operación
   */


  static async createBulk(balances, userId) {
    try {
      if (!Array.isArray(balances) || balances.length === 0) {
        return { success: false, message: 'No se recibió ningún balance.' };
      }

      const primerBalance = balances[0];
      const claves = ['num_cuenta', 'nombre_balance' , 'id_mapping', 'ejercicio', 'fecha_inicio', 'fecha_fin', 'id_empresa'];

      // Validación general de campos mínimos en el primer balance
      for (const campo of claves) {
        if (!primerBalance[campo]) {
          return { success: false, message: `Falta el campo requerido: ${campo}` };
        }
      }

      const { id_mapping, nombre_balance, ejercicio, fecha_inicio, fecha_fin, id_empresa } = primerBalance;
      console.log("Datos del primer balance:", primerBalance);
      // Validar consistencia en todo el lote
      const cuentasVistas = new Set();

      for (const b of balances) {
        // 1. Que todos tengan los mismos datos clave
        if (
          b.nombre_balance !== nombre_balance ||
          b.id_mapping !== id_mapping ||
          b.ejercicio !== ejercicio ||
          b.fecha_inicio !== fecha_inicio ||
          b.fecha_fin !== fecha_fin ||
          b.id_empresa !== id_empresa
        ) {
          return {
            success: false,
            message: 'Todos los balances deben compartir la misma mapping, ejercicio y rango de fechas.',
          };
        }

        // 2. Validar que fecha_inicio <= fecha_fin
        if (new Date(b.fecha_inicio) > new Date(b.fecha_fin)) {
          return {
            success: false,
            message: 'La fecha de inicio no puede ser mayor que la fecha de fin.',
          };
        }

        // 3. Validar que ambas fechas están dentro del ejercicio
        const anioInicio = parseInt(b.fecha_inicio.substring(0, 4));
        const anioFin = parseInt(b.fecha_fin.substring(0, 4));



        if (anioInicio !== parseInt(ejercicio) || anioFin !== parseInt(ejercicio)) {
          return {
            success: false,
            message: `Las fechas deben pertenecer al año del ejercicio ${ejercicio}.`,
          };
        }

        // 4. Validar duplicados de num_cuenta dentro del lote
        if (cuentasVistas.has(b.num_cuenta)) {
          return {
            success: false,
            message: `Cuenta duplicada en el lote: ${b.num_cuenta}`,
          };
        }

        cuentasVistas.add(b.num_cuenta);
      }

      // Generar un único id_blce para el grupo
      const id_blce = generarIdBalance(primerBalance);

      // Validar existencia previa
      const exists = await BalanceModel.existsByIdBlce(id_blce);
      if (exists) {
        return { success: false, message: `Ya existe un balance con el identificador: ${id_blce}, intentalo de nuevo` };
      }

      // Validar existencia previa por nombre_conjunto
      const nombreConjunto = primerBalance.nombre_balance || primerBalance.nombre_conjunto;

      if (!nombreConjunto) {
        return { success: false, message: 'El campo Nombre del Balance es requerido. \n code: nombre_conjunto_blce_ser_137' };
      }

      const conjuntoDuplicado = await BalanceModel.existsByNombreConjunto(nombreConjunto, userId);
      if (conjuntoDuplicado) {
        return {
          success: false,
          message: `Ya existe un conjunto con el nombre "${nombreConjunto}".`,
        };
      }
      const balancesToInsert = balances.map((b) => ({
        ...b,
        id_blce,
        id_user: userId,
        id_estado: 1
      }));

      const result = await BalanceModel.createBulk(balancesToInsert);

      Logger.userAction(userId, 'CREAR_BALANCE_BULK', `Insertados: ${result.inserted} con id_blce: ${id_blce}`);
      return {
        success: true,
        message: `Se insertaron ${result.inserted} balances con id_blce ${id_blce}.`,
        inserted: result.inserted,
      };

    } catch (error) {
      Logger.error(`Error en BalanceService.createBulk: ${error.message}`);
      return { success: false, message: 'Error al insertar balances masivamente.' };
    }
  }





  // CARGA DE BALANCES 
static async getById(id_blce) {
  try {
    Logger.info(`Iniciando búsqueda de balance con ID: ${id_blce}`);

    // Validación básica: existencia y tipo string no vacío
    if (typeof id_blce !== 'string' || id_blce.trim().length === 0) {
      Logger.warn(`ID de balance inválido recibido: ${id_blce}`);
      return { success: false, message: 'ID de balance inválido' };
    }

    const md5Regex = /^[a-f0-9]{32}$/i;
    if (!md5Regex.test(id_blce)) {
      Logger.warn(`ID de balance no cumple con el formato MD5 esperado: ${id_blce}`);
      return { success: false, message: 'Formato de ID no válido' };
    }


    const balances = await BalanceModel.findById(id_blce);

    if (!balances || balances.length === 0) {
      Logger.info(`No se encontró balance con ID: ${id_blce}`);
      return { success: false, message: 'Balance no encontrado' };
    }

    Logger.info(`Balance encontrado con ID: ${id_blce}`);
    console.log(`Balance encontrado: `, balances);
    return {
      success: true,
      data: balances,
    };
  } catch (error) {
    Logger.error(`Error en BalanceService.getById: ${error.message}`);
    return {
      success: false,
      message: 'Error al obtener el balance',
    };
  }
}
  

  static async getDistinctBalances(query) {
    try {
      const {
        nombre,
        ejercicio,
        fechaInicio,
        fechaFin,
        idMapping,
        idEstado,
        idUser,
        idEmpresa,
        empresaDesc,
        limit = 10,
        offset = 0
      } = query;

      if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
        return {
          success: false,
          message: 'La fecha de inicio no puede ser posterior a la fecha de fin.'
        };
      }

      const filters = {
        nombre,
        ejercicio,
        fechaInicio,
        fechaFin,
        idMapping,
        idEstado,
        idUser,
        idEmpresa,
        empresaDesc,
        limit,
        offset
      };

      const [data, total] = await Promise.all([
        BalanceModel.findDistinctBalances(filters),
        BalanceModel.countDistinctBalances(filters)
      ]);

      return {
        success: true,
        data,
        total
      };

    } catch (error) {
      Logger.error(`Error en BalanceService.getDistinctBalances: ${error.message}`);
      return { success: false, message: 'Error al obtener balances.' };
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
