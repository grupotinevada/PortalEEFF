const { pool } = require('../config/database');

class Categoria {

    static async findAllCategoria() {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM categoria'
      );
      return rows;
    } catch (error) {
      throw new Error(`Error al obtener categoriass: ${error.message}`);
    }
  }
}

module.exports = Categoria;
