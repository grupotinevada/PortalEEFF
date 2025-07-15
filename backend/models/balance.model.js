// balance.model.js
const { pool } = require("../config/database");

class BalanceModel {

  static async createBulk(balances) {
  const values = balances.map(b => [
    b.num_cuenta,
    b.nombre_conjunto,
    b.nombre,
    b.saldo,
    b.ejercicio,
    b.fecha_inicio,
    b.fecha_fin,
    b.id_user,
    b.id_empresa,
    b.id_fsa
  ]);
  const [result] = await pool.query(
    `INSERT INTO balance 
    (num_cuenta, nombre_conjunto, nombre, saldo, ejercicio, fecha_inicio, fecha_fin, id_user, id_empresa, id_fsa)
     VALUES ?`,
    [values]
  );
  return { inserted: result.affectedRows };
}

static async create({
  num_cuenta,
  nombre_conjunto,
  nombre,
  saldo,
  ejercicio,
  fecha_inicio,
  fecha_fin,
  id_user,
  id_empresa,
  id_fsa
}) {
  const [result] = await pool.query(
    `INSERT INTO balance 
    (num_cuenta, nombre_conjunto, nombre, saldo, ejercicio, fecha_inicio, fecha_fin, id_user, id_empresa, id_fsa)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [num_cuenta, nombre_conjunto, nombre, saldo, ejercicio, fecha_inicio, fecha_fin, id_user, id_empresa, id_fsa]
  );
  return { id: result.insertId };
}

  static async existsByCuentaEmpresaFecha(
    num_cuenta,
    id_empresa,
    ejercicio
  ) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total 
     FROM balance 
     WHERE num_cuenta = ? AND id_empresa = ? AND ejercicio = ?`,
      [num_cuenta, id_empresa, ejercicio]
    );

    return rows[0].total > 0;
  }

// models/balance.model.js
static async findByEmpresaEnRango(id_empresa, fecha_inicio, fecha_fin) {
  const [rows] = await pool.query(
    `SELECT * FROM balance 
     WHERE id_empresa = ? 
       AND fecha_inicio >= ? 
       AND fecha_fin <= ?`,
    [id_empresa, fecha_inicio, fecha_fin]
  );
  return rows;
}

static async findByEmpresaYFechaUnica(id_empresa, fecha_consulta) {
  const [rows] = await pool.query(
    `SELECT * FROM balance 
     WHERE id_empresa = ? 
       AND ? BETWEEN fecha_inicio AND fecha_fin`,
    [id_empresa, fecha_consulta]
  );
  return rows;
}



  static async findAll() {
    const [rows] = await pool.query("SELECT * FROM balance");
    return rows;
  }

  static async getFsaCategoria(){
  const [rows] = await pool.query(`
    SELECT f.id_fsa, f.desc, f.id_cate, c.descripcion AS categoria
    FROM fsa f
    LEFT JOIN categoria c ON f.id_cate = c.id_cate
  `);
  return rows;
};
  
}

module.exports = BalanceModel;
