const mysql = require('mysql2/promise');
const { DB_CONFIG } = require('./constants');

// Crear pool de conexiones
const pool = mysql.createPool(DB_CONFIG);

// Función para probar la conexión
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Conexión a MySQL establecida correctamente');
    connection.release();

    // No crear tablas ni usuario admin
  } catch (error) {
    console.error('Error al conectar a MySQL:', error.message);
    process.exit(1);
  }
};

module.exports = {
  pool,
  testConnection
};

