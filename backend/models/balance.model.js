// balance.model.js
const { pool } = require("../config/database");

class BalanceModel {

  static async createBulk(balances) {
  const values = balances.map(b => [
    b.num_cuenta,
    b.nombre,
    b.saldo,
    b.fecha_procesado,
    b.id_user,
    b.id_empresa,
    b.id_fsa
  ]);
  console.log('Subiendo balances masivos', values);
  const [result] = await pool.query(
    `INSERT INTO balance (num_cuenta, nombre, saldo, fecha_procesado, id_user, id_empresa, id_fsa)
     VALUES ?`,
    [values]
  );

  console.log(`Subidos ${result.affectedRows} balances`);
  return { inserted: result.affectedRows };
}

  static async create({
    num_cuenta,
    nombre,
    saldo,
    fecha_procesado,
    id_user,
    id_empresa,
  }) {
    const [result] = await pool.query(
      `INSERT INTO balance (num_cuenta, nombre, saldo, fecha_procesado, id_user, id_empresa)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [num_cuenta, nombre, saldo, fecha_procesado, id_user, id_empresa]
    );
    console.log('Subiendo balance')
    return { id: result.insertId };
  }
  static async existsByCuentaEmpresaFecha(
    num_cuenta,
    id_empresa,
    fecha_procesado
  ) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total 
     FROM balance 
     WHERE num_cuenta = ? AND id_empresa = ? AND fecha_procesado = ?`,
      [num_cuenta, id_empresa, fecha_procesado]
    );

    return rows[0].total > 0;
  }

  static async findByEmpresaAndFecha(id_empresa, fecha_procesado) {
    const [rows] = await pool.query(
      `SELECT * FROM balance WHERE id_empresa = ? AND fecha_procesado = ?`,
      [id_empresa, fecha_procesado]
    );
    return rows;
  }

  static async findAll() {
    const [rows] = await pool.query("SELECT * FROM balance");
    return rows;
  }
}

module.exports = BalanceModel;
