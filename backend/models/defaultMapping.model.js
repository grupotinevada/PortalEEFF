const { pool } = require('../config/database');

class DefaultMappingModel {

  static async findAll() {
    const [rows] = await pool.query('SELECT * FROM default_cta_fsa_mapping');
    return rows;
  }

  static async create(mapping) {
    const { num_cuenta, id_fsa, id_empresa } = mapping;
    const [result] = await pool.query(
      `INSERT INTO default_cta_fsa_mapping (num_cuenta, id_fsa, id_empresa)
       VALUES (?, ?, ?)`,
      [num_cuenta, id_fsa, id_empresa]
    );
    return result;
  }

  static async update(mapping) {
    const { num_cuenta, id_fsa, id_empresa } = mapping;
    const [result] = await pool.query(
      `UPDATE default_cta_fsa_mapping
       SET id_fsa = ?
       WHERE num_cuenta = ? AND id_empresa = ?`,
      [id_fsa, num_cuenta, id_empresa]
    );
    return result;
  }

}

module.exports = DefaultMappingModel;
