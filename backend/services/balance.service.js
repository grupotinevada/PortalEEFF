const BalanceModel = require('../models/balance.model');
const Logger = require('../utils/logger.utils');
const crypto = require('crypto');
const UserModel = require('../models/user.model');

/**
 * Servicio para gestionar balances
 */

function generarIdBalance() {
  // Genera un UUID v4 y elimina los guiones
  return crypto.randomUUID().replace(/-/g, '');
}


class BalanceService {

 /**
 * Verifica si el nombre de un balance está disponible.
 * @param {string} nombre El nombre del balance a verificar.
 * @returns {Promise<boolean>} Un booleano que indica si el nombre está disponible.
 */
static async isNameAvailable(nombre) {
  Logger.info(`Verificando disponibilidad del nombre de balance: ${nombre}`);

  // Llama al modelo para consultar la base de datos.
  const nameExists = await BalanceModel.checkName(nombre);

  Logger.info(`El nombre "${nombre}" ${nameExists ? 'ya existe' : 'está disponible'}.`);
  
  // Retorna true si el nombre NO existe (es decir, está disponible).
  return !nameExists;
}


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
      // Obtenemos las empresas permitidas para el usuario
      const allowedEmpresaIds = await UserModel.getAllowedEmpresaIds(userId);

      if (allowedEmpresaIds !== null) { // Si NO es global
        // Verificamos que la empresa del balance a crear esté en su lista
        if (!allowedEmpresaIds.includes(id_empresa)) {
          Logger.warn(`Usuario ${userId} intentó crear balance en empresa ${id_empresa} no permitida.`);
          return {
            success: false,
            message: 'Acción no permitida. No tiene permisos para crear balances en esta empresa.',
          };
        }
      }
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
      const id_blce = generarIdBalance();

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
static async getById(id_blce, userId) {
  try {
    Logger.info(`Iniciando búsqueda de balance con ID: ${id_blce} por usuario ${userId}`)
    
    if (typeof id_blce !== 'string' || id_blce.trim().length === 0) {
      Logger.warn(`ID de balance inválido recibido: ${id_blce}`);
      return { success: false, message: 'ID de balance inválido' };
    }

    const md5Regex = /^[a-f0-9]{32}$/i;
    if (!md5Regex.test(id_blce)) {
      Logger.warn(`ID de balance no cumple con el formato MD5 esperado: ${id_blce}`);
      return { success: false, message: 'Formato de ID no válido' };
    }
    const allowedEmpresaIds = await UserModel.getAllowedEmpresaIds(userId);

    const balances = await BalanceModel.findById(id_blce,allowedEmpresaIds);

    if (!balances || balances.length === 0) {
            Logger.info(`No se encontró balance con ID: ${id_blce} (o sin acceso para user ${userId})`);
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
  

static async getDistinctBalances(query, userId) {
  try {
    const allowedEmpresaIds = await UserModel.getAllowedEmpresaIds(userId);
      
      if (allowedEmpresaIds !== null && allowedEmpresaIds.length === 0) {
        // CASO: NO es 'global' y NO tiene empresas asignadas.
        // No debe ver NADA. Retornamos vacío sin consultar la BD.
        Logger.warn(`Usuario ${userId} sin acceso 'global' ni empresas. Acceso denegado a lista.`);
        return { success: true, data: [], total: 0 };
      }
    // 1. Destructuramos los parámetros de la query
    const {
      nombre,
      ejercicio,
      fechaInicio,
      fechaFin,
      fechaCreacion,
      idMapping,
      mappingDesc,
      idEstado,
      idUser,
      idEmpresa,
      empresaDesc,
      limit = 10,
      offset = 0,
    } = query;

    // 2. Validación de lógica de negocio
    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
      return {
        success: false,
        message: "La fecha de inicio no puede ser posterior a la fecha de fin.",
      };
    }

    // 3. Creamos el objeto de filtros, traduciendo nombres y convirtiendo tipos
    const filters = {
      limit, // limit y offset ya se convierten a número en el modelo
      offset,
      nombre,
      fechaInicio,
      fechaFin,
      fechaCreacion,
      empresaDesc,
      mappingDesc,
      ejercicio: ejercicio ? parseInt(ejercicio, 10) : undefined,
      idMapping: idMapping || undefined,       // ahora string, no parseInt
      idEstado: idEstado ? parseInt(idEstado, 10) : undefined,
      iduser: idUser ? parseInt(idUser, 10) : undefined, // 'idUser' -> 'iduser'
      id_empresa: idEmpresa || undefined,      // string (char(5)), no parseInt
    };
    if (allowedEmpresaIds !== null) {
        // CASO: Es restringido (ej: 'savisa').
        // Inyectamos el filtro de seguridad que el modelo espera.
        filters.id_empresa_in = allowedEmpresaIds;
        
        // **IMPORTANTE**: Borramos el filtro de empresa de la UI
        // para que no entre en conflicto con el filtro de seguridad.
        delete filters.id_empresa;
        delete filters.empresaDesc; // Borramos también este por si acaso
      }

    // 4. Llamamos al modelo con los filtros limpios
    const [data, total] = await Promise.all([
      BalanceModel.findDistinctBalances(filters),
      BalanceModel.countDistinctBalances(filters),
    ]);

    return {
      success: true,
      data,
      total,
    };
  } catch (error) {
    Logger.error(`Error en BalanceService.getDistinctBalances: ${error.message}`);
    return { success: false, message: "Error al obtener balances." };
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

  /**
 * Actualiza un conjunto de balances por su ID.
 * Valida la consistencia de los datos y la unicidad del nuevo nombre si este cambia.
 * @param {string} id_blce - El ID del conjunto de balances a actualizar.
 * @param {Array} balances - El nuevo array de filas para el balance.
 * @param {string} userId - El ID del usuario que realiza la acción.
 * @returns {Promise<Object>} Resultado de la operación.
 */
static async update(id_blce, balances, userId) {
  console.log("BalanceService.update llamado con id_blce:", id_blce, "y balances: ", balances.slice(0, 3));
  
    try {
        const allowedEmpresaIds = await UserModel.getAllowedEmpresaIds(userId);

          
        const balancesCompatibles = balances.map(b => ({
            ...b,
            nombre_balance: b.nombre_conjunto
        }));
        // --- 1. Validaciones Iniciales ---
        if (!id_blce) {
            return { success: false, message: 'ID del balance no proporcionado.' };
        }
        if (!Array.isArray(balancesCompatibles)) {
            return { success: false, message: 'Los datos del balance deben ser un array.' };
        }



        // Caso especial: si el array está vacío, significa que el usuario eliminó todas las cuentas.
        if (balancesCompatibles.length === 0) {
            Logger.userAction(userId, 'UPDATE_BALANCE_EMPTY', `Vaciando todas las filas del balance con id_blce: ${id_blce}`);
            const result = await BalanceModel.updateById(id_blce, []);
            return {
                success: true,
                message: `Se eliminaron todas las filas del balance.`,
                updated: result.updated,
            };
        }

        // --- 2. Validaciones de Datos y Consistencia ---
        const primerBalance = balancesCompatibles[0];
        const { nombre_conjunto, id_mapping, ejercicio, fecha_inicio, fecha_fin, id_empresa, id_estado } = primerBalance;

        if (allowedEmpresaIds !== null) { // Si NO es global
        if (!allowedEmpresaIds.includes(id_empresa)) {
          Logger.warn(`Usuario ${userId} intentó re-asignar balance ${id_blce} a empresa ${id_empresa} no permitida.`);
          return {
            success: false,
            message: 'Acción no permitida. No tiene permisos para asignar este balance a la empresa seleccionada.',
          };
        }
      }

        // Validar si el nombre del balance ha cambiado y si el nuevo nombre está disponible.
        const originalBalance = await BalanceModel.findById(id_blce, allowedEmpresaIds);
              if (!originalBalance || originalBalance.length === 0) {
                  Logger.warn(`Usuario ${userId} intentó actualizar balance ${id_blce} no encontrado o sin acceso.`);
                  return { success: false, message: `No se encontró un balance con el ID: ${id_blce}` };
              }

        const nombreOriginal = originalBalance[0].nombre_conjunto;
        if (nombre_conjunto !== nombreOriginal) {
            const nombreTomado = await BalanceModel.existsByNombreConjunto(nombre_conjunto, userId);
            if (nombreTomado) {
                return {
                    success: false,
                    message: `El nombre de balance "${nombre_conjunto}" ya está en uso por otro conjunto.`,
                };
            }
        }

        // Validaciones de consistencia interna del lote (similar a createBulk)
        const cuentasVistas = new Set();
        for (const b of balancesCompatibles) {
            // Todos los registros deben compartir los mismos datos maestros
            if (
                b.nombre_conjunto !== nombre_conjunto || b.id_mapping !== id_mapping ||
                b.ejercicio !== ejercicio || b.fecha_inicio !== fecha_inicio ||
                b.fecha_fin !== fecha_fin || b.id_empresa !== id_empresa || b.id_estado !== id_estado
            ) {
                return {
                    success: false,
                    message: 'Inconsistencia en los datos. Todos los registros deben compartir el mismo nombre, mapping, ejercicio, fechas, empresa y estado.',
                };
            }
            // Lógica de fechas
            if (new Date(b.fecha_inicio) > new Date(b.fecha_fin)) {
                return { success: false, message: 'La fecha de inicio no puede ser mayor que la fecha de fin.' };
            }
            // Cuentas duplicadas
            if (cuentasVistas.has(b.num_cuenta)) {
                return { success: false, message: `Cuenta duplicada en los datos enviados: ${b.num_cuenta}` };
            }
            cuentasVistas.add(b.num_cuenta);
        }

        // --- 3. Preparar Datos y Llamar al Modelo ---
        const balancesCompatiblesToUpdate = balancesCompatibles.map((b) => ({
            ...b,
            id_blce, // Forzamos el ID correcto para todas las filas
            id_user: userId,
        }));

        const result = await BalanceModel.updateById(id_blce, balancesCompatiblesToUpdate);

        Logger.userAction(userId, 'UPDATE_BALANCE', `Actualizadas: ${result.updated} filas para el id_blce: ${id_blce}`);
        return {
            success: true,
            message: `Se actualizaron ${result.updated} filas para el balance.`,
            updated: result.updated,
        };

    } catch (error) {
        Logger.error(`Error en BalanceService.update: ${error.message}`);
        return { success: false, message: 'Error interno al actualizar el balance.' };
    }
}
}

module.exports = BalanceService;
