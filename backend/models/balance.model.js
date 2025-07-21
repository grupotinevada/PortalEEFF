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
  //=========================== FIN FUNCIONES AUXILIARES ===========//

  static async createBulk(balances) {
    //inserta el array
    const values = balances.map((b) => [
      b.id_blce,
      b.num_cuenta,
      b.nombre_balance,
      b.nombre,
      b.saldo,
      b.ejercicio,
      b.fecha_inicio,
      b.fecha_fin,
      b.id_user,
      b.id_empresa,
      b.id_fsa,
      b.id_estado,
    ]);
    const [result] = await pool.query(
      `INSERT INTO balance 
    (id_blce, num_cuenta, nombre_conjunto, nombre, saldo, ejercicio, fecha_inicio, fecha_fin, id_user, id_empresa, id_fsa, id_estado)
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
    id_empresa,
    id_fsa,
  }) {
    const [result] = await pool.query(
      `INSERT INTO balance 
    (num_cuenta, nombre_conjunto, nombre, saldo, ejercicio, fecha_inicio, fecha_fin, id_user, id_empresa, id_fsa)
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
        id_empresa,
        id_fsa,
      ]
    );
    return { id: result.insertId };
  }


  //CARGA DE BALANCES.

  static async findDistinctBalances(filters) {
    const { whereClause, params } = BalanceModel.buildFilters(filters);

    const sql = `
  SELECT DISTINCT 
    b.id_blce,
    b.nombre_conjunto,
    b.ejercicio,
    b.fecha_inicio,
    b.fecha_fin,
    b.id_empresa,
    e.descripcion AS empresa_desc,
    b.id_estado,
    es.desc AS estado_desc,
    es.color AS estado_color,
    u.username,
    u.email
  FROM balance b
  JOIN empresa e ON b.id_empresa = e.id_empresa
  JOIN estado es ON b.id_estado = es.id_estado
  JOIN usuario u ON b.id_user = u.id_user
  ${whereClause}
  ORDER BY b.fecha_fin DESC
  LIMIT ? OFFSET ?
`;

    return (
      await pool.query(sql, [
        ...params,
        parseInt(filters.limit),
        parseInt(filters.offset),
      ])
    )[0];
  }

  static async countDistinctBalances(filters) {
    const { whereClause, params } = BalanceModel.buildFilters(filters);

    const sql = `
      SELECT COUNT(DISTINCT id_blce) as total
      FROM balance
      ${whereClause}
    `;

    const [rows] = await pool.query(sql, params);
    return rows[0].total;
  }

  static buildFilters({
    nombre,
    ejercicio,
    fechaInicio,
    fechaFin,
    idEmpresa,
    idEstado,
    iduser,
  }) {
    const params = [];
    let whereClause = "WHERE 1 = 1";

    if (nombre) {
      whereClause += " AND nombre_conjunto LIKE ?";
      params.push(`%${nombre}%`);
    }
    if (ejercicio) {
      whereClause += " AND ejercicio = ?";
      params.push(ejercicio);
    }
    if (fechaInicio) {
      whereClause += " AND fecha_inicio >= ?";
      params.push(fechaInicio);
    }
    if (fechaFin) {
      whereClause += " AND fecha_fin <= ?";
      params.push(fechaFin);
    }
    if (idEmpresa) {
      whereClause += " AND id_empresa = ?";
      params.push(idEmpresa);
    }
    if (idEstado) {
      whereClause += " AND id_estado = ?";
      params.push(idEstado);
    }
    if (iduser) {
      whereClause += " AND id_user = ?";
      params.push(iduser);
    }

    return { whereClause, params };
  }


static async findById(id_blce) {
  if (typeof id_blce !== 'string' || id_blce.trim().length === 0) {
    throw new Error("ID de balance inválido");
  }

  const sql = "SELECT * FROM balance WHERE id_blce = ?";
  const [rows] = await pool.query(sql, [id_blce]);
  return rows;
}

  //=========================== TABLA FSA ========================================//
  static async getFsaCategoria() {
    const [rows] = await pool.query(`
    SELECT f.id_fsa, f.desc, f.id_cate, f.orden, c.descripcion AS categoria
    FROM fsa f
    LEFT JOIN categoria c ON f.id_cate = c.id_cate order by f.orden
  `);
    return rows;
  }
}

module.exports = BalanceModel;
