// user.model.js
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class UserModel {
  static async findByEmail(email) {
    const [rows] = await pool.query('SELECT * FROM usuario WHERE email = ?', [email]);

    return rows[0];
  }

  static async create({  email, password, username }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
       'INSERT INTO usuario (username, email, password_hash) VALUES (?, ?, ?)',
        [username, email, hashedPassword]
    );
    return { id: result.insertId, email };
  }

  static async validatePassword(plainPassword, hashedPassword) {

    if (!plainPassword || !hashedPassword) {

      return false;
    }
    return bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = UserModel;
