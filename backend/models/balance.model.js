// balance.model.js
const { pool } = require("../config/database");

class BalanceModel {
  //=========================== TABLA BALANCE ========================================//
  //=========================== INICIO FUNCIONES AUXILIARES ===========//
  static async existsByIdBlce(id_blce) {
    const [rows] = await pool.query(
      "SELECT 1 FROM balance WHERE id_blce = ? LIMIT 1",
      [id_blce]
    );
    return rows.length > 0;
  }
  static async existsByNombreConjunto(nombreConjunto, userId) {
    const [rows] = await pool.query(
      "SELECT 1 FROM balance WHERE nombre_conjunto = ? AND id_user = ? LIMIT 1",
      [nombreConjunto, userId]
    );
    return rows.length > 0;
  }

  /**
   * Checks if a balance with the given name already exists in the database.
   * @param {string} nombre The balance name to check.
   * @returns {Promise<boolean>} A promise that resolves to true if the name is taken, false otherwise.
   */
  static async checkName(nombre) {
    // La validación inicial es buena para evitar consultas innecesarias.
    if (!nombre || typeof nombre !== "string") {
      return false;
    }

    const query =
      "SELECT EXISTS(SELECT 1 FROM balance WHERE nombre_conjunto = ?) AS nameExists;";
    const [rows] = await pool.query(query, [nombre]);

    // Usar Boolean() es un poco más explícito que `!!`
    return Boolean(rows[0].nameExists);
  }

  //=========================== FIN FUNCIONES AUXILIARES ===========//

  /**
   * Inserta un array de balances.
   * Acepta un 'connection' opcional para poder ser usado dentro de una transacción.
   * Si no se provee una conexión, usa el pool por defecto.
   */
  static async createBulk(balances, connection = null) {
    // Si no se pasó una conexión, usamos el pool. De lo contrario, usamos la conexión existente.
    const db = connection || pool;

    const values = balances.map((b) => [
      b.id_blce,
      b.num_cuenta,
      b.nombre_balance || b.nombre_conjunto, // Soporta ambos nombres
      b.nombre,
      b.saldo,
      b.ejercicio,
      b.fecha_inicio,
      b.fecha_fin,
      b.id_user,
      b.id_mapping,
      b.id_fsa,
      b.id_estado,
      b.id_empresa,
    ]);
    console.log("Valores a insertar (primeros 3):", values.slice(0, 3));
    const [result] = await db.query(
      `INSERT INTO balance 
      (id_blce, num_cuenta, nombre_conjunto, nombre, saldo, ejercicio, fecha_inicio, fecha_fin, id_user, id_mapping, id_fsa, id_estado, id_empresa)
      VALUES ?`,
      [values]
    );

    return { inserted: result.affectedRows };
  }

  static async create({
    //inserta un balance
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
    id_empresa,
  }) {
    const [result] = await pool.query(
      `INSERT INTO balance 
    (num_cuenta, nombre_conjunto, nombre, saldo, ejercicio, fecha_inicio, fecha_fin, id_user, id_mapping, id_fsa, id_empresa)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
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
        id_empresa,
      ]
    );
    return { id: result.insertId };
  }

  /**
   * Método privado para construir las partes comunes (JOINs y WHERE) de la consulta.
   * Esto evita la duplicación de código y asegura consistencia.
   */
  static _buildCommonQueryParts(filters) {
    const { whereClause, params } = BalanceModel.buildFilters(filters);

    const joinClause = `
      FROM balance b
      LEFT JOIN fsa f ON b.id_fsa = f.id_fsa
      JOIN estado es ON b.id_estado = es.id_estado
      JOIN usuario u ON b.id_user = u.id_user
      JOIN empresa em ON b.id_empresa = em.id_empresa
      LEFT JOIN cta_fsa_mapeo cta ON f.id_fsa = cta.id_fsa
    `;

    return { joinClause, whereClause, params };
  }

  /**
   * Busca balances con paginación y filtros.
   */
  static async findDistinctBalances(filters) {
    const { joinClause, whereClause, params } =
      BalanceModel._buildCommonQueryParts(filters);

    const sql = `
    SELECT 
        b.id_blce,
        MAX(b.nombre_conjunto) AS nombre_conjunto,
        MAX(b.ejercicio) AS ejercicio,
        MIN(b.fecha_inicio) AS fecha_inicio,
        MAX(b.fecha_fin) AS fecha_fin,
        MAX(b.fecha_creacion) AS fecha_creacion,
        MAX(b.id_mapping) as id_mapping,
        MIN(cta.descripcion) AS mapping_desc, 
        MAX(em.id_empresa) AS id_empresa,
        MAX(em.descripcion) AS empresa_desc,
        MAX(es.desc) AS estado_desc,
        MAX(es.color) AS estado_color,
        MAX(u.id_user) AS id_user,
        MAX(u.username) AS username,
        MAX(u.email) AS email
      ${joinClause}
      ${whereClause}
      GROUP BY b.id_blce
      ORDER BY MAX(b.fecha_creacion) DESC
      LIMIT ? OFFSET ?;
    `;

    // Añadimos los parámetros de paginación al final
    const queryParams = [
      ...params,
      parseInt(filters.limit, 10) || 10, // Valor por defecto para limit
      parseInt(filters.offset, 10) || 0, // Valor por defecto para offset
    ];

    const [rows] = await pool.query(sql, queryParams);
    return rows;
  }

  /**
   * Cuenta el total de balances distintos que coinciden con los filtros.
   * AHORA USA LOS MISMOS JOINS Y FILTROS que findDistinctBalances.
   */
  static async countDistinctBalances(filters) {
    const { joinClause, whereClause, params } =
      BalanceModel._buildCommonQueryParts(filters);

    const sql = `
      SELECT COUNT(DISTINCT b.id_blce) as total
      ${joinClause}
      ${whereClause}
    `;

    const [rows] = await pool.query(sql, params);
    return rows[0].total;
  }

  /**
   * Construye la cláusula WHERE y los parámetros de forma segura.
   * (Esta función ya estaba bien, no necesita cambios).
   */
  static buildFilters({
    nombre,
    ejercicio,
    fechaInicio,
    fechaFin,
    idMapping,
    idFsa,
    idEstado,
    iduser,
    id_empresa,
    empresaDesc,
    id_empresa_in,
  }) {
    const params = [];
    let whereClause = "WHERE 1 = 1";

    if (nombre) {
      whereClause += " AND b.nombre_conjunto LIKE ?"; // Buena práctica: usar alias de tabla (b)
      params.push(`%${nombre}%`);
    }
    if (ejercicio) {
      whereClause += " AND b.ejercicio = ?";
      params.push(ejercicio);
    }
    if (fechaInicio) {
      whereClause += " AND b.fecha_inicio >= ?";
      params.push(fechaInicio);
    }
    if (fechaFin) {
      whereClause += " AND b.fecha_fin <= ?";
      params.push(fechaFin);
    }
    if (idMapping) {
      whereClause += " AND b.id_mapping = ?";
      params.push(idMapping);
    }
    if (idFsa) {
      whereClause += " AND b.id_fsa = ?";
      params.push(idFsa);
    }
    if (idEstado) {
      whereClause += " AND b.id_estado = ?";
      params.push(idEstado);
    }
    if (iduser) {
      whereClause += " AND b.id_user = ?";
      params.push(iduser);
    }
    if (id_empresa_in) {
      whereClause += " AND b.id_empresa IN (?)";
      params.push(id_empresa_in);
    } else if (id_empresa) {
      whereClause += " AND b.id_empresa = ?";
      params.push(id_empresa);
    }
    if (empresaDesc) {
      whereClause += " AND em.descripcion LIKE ?";
      params.push(`%${empresaDesc}%`);
    }

    return { whereClause, params };
  }

static async findById(id_blce, allowedEmpresaIds) {
    if (typeof id_blce !== "string" || id_blce.trim().length === 0) {
      throw new Error("ID de balance inválido");
    }
    let sql = `SELECT 
    b.*, 
    IFNULL(cfm.isManual, 0) as isManual, 
    e.descripcion as empresaDesc
    FROM 
        balance b
    JOIN 
        fsa f ON b.id_fsa = f.id_fsa
    JOIN 
        empresa e ON b.id_empresa = e.id_empresa 
    LEFT JOIN 
        cta_fsa_mapeo cfm ON b.id_mapping = cfm.id_mapping 
                        AND b.id_fsa = cfm.id_fsa 
                        AND b.num_cuenta = cfm.num_cuenta
    WHERE b.id_blce = ?`; 

    const params = [id_blce];
    if (allowedEmpresaIds !== null) {
      // Si NO es global (es un array, ej: ['CV04']  )
      // Forzamos a que el ID del balance también pertenezca a una empresa permitida.
      sql += " AND b.id_empresa IN (?)";
      params.push(allowedEmpresaIds);
    }
    // Si es 'global' (null), no se añade este filtro.

    sql += ";"; 

    const [rows] = await pool.query(sql, params);
    return rows;
  }

  /**
   * Actualiza un balance completo eliminando los registros antiguos y reinsertando los nuevos.
   * Utiliza una transacción para garantizar la integridad de los datos.
   * @param {string} id_blce El ID del balance a actualizar.
   * @param {Array} balances El array de objetos de balance (filas) a insertar.
   * @returns {Promise<{updated: number}>} Un objeto indicando el número de filas insertadas.
   */
  /**
   * Actualiza un balance completo eliminando los registros antiguos y reinsertando los nuevos.
   * Ahora reutiliza la función createBulk dentro de una transacción.
   */
  static async updateById(id_blce, balances) {
    console.log(
      "BalanceModel.updateById llamado con id_blce:",
      id_blce,
      "y balances: ",
      balances.slice(0,1)
    );
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // 1. Eliminar todas las filas antiguas para este id_blce
      await connection.query("DELETE FROM balance WHERE id_blce = ?", [
        id_blce,
      ]);

      // Si hay datos nuevos, los insertamos
      if (balances && balances.length > 0) {
        // 2. REUTILIZAMOS createBulk, pasándole la conexión de la transacción
        await BalanceModel.createBulk(balances, connection);
      }

      await connection.commit();

      return { updated: balances ? balances.length : 0 };
    } catch (error) {
      await connection.rollback();
      console.error(
        "Error en la transacción de actualización del balance:",
        error
      );
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = BalanceModel;
