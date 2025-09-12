const { pool } = require('../config/database');

class Estado {

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

module.exports = Estado;
