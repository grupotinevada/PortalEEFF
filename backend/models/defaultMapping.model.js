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

//AQUI ESTA EL ENDPOINT PARA LLAMAR A LOS ESTADOS JIJIJIJI
    static async findAllEstados() {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM estado'
      );
      return rows;
    } catch (error) {
      throw new Error(`Error al obtener estado: ${error.message}`);
    }
  }
}

module.exports = DefaultMappingModel;
