const { pool } = require('../config/database');

class Fsa {
    static async getFsaCategoria() {
    const [rows] = await pool.query(`
    SELECT f.id_fsa, f.desc, f.id_cate, f.orden, c.descripcion AS categoria
    FROM fsa f
    LEFT JOIN categoria c ON f.id_cate = c.id_cate order by f.orden
  `);
    return rows;
  }
    
static async createFsa({ idFsa, descripcion, categoria, orden }) {
        try {
            const sql = 'INSERT INTO fsa (id_fsa, `desc`, id_cate, orden) VALUES (?, ?, ?, ?)';
            const [result] = await pool.query(sql, [idFsa, descripcion, categoria, orden]);
            if (result.affectedRows > 0) {
                return { idFsa, descripcion, categoria, orden };
            } else {
                throw new Error('No se pudo crear el registro Fsa, no se afectaron filas.');
            }
            
        } catch (error) {
            console.error("Error al crear Fsa:", error);
            throw new Error('Error en la base de datos al intentar crear el Fsa.');
        }
    }
}

module.exports = Fsa;













