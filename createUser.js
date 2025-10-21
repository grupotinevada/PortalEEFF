// crearUsuarioManual.js
// Script para crear un usuario con un ID manual.
// Uso: node crearUsuarioManual.js <id_del_usuario> <username> <email> <password>

// =================================================================
// 1. DEPENDENCIAS NECESARIAS
// =================================================================
// Antes de ejecutar, asegúrate de haber instalado estas librerías:
// npm install mysql2 bcryptjs dotenv
// =================================================================

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config(); // Para leer las variables de entorno del archivo .env

// =================================================================
// 2. CONFIGURACIÓN DE LA BASE DE DATOS
// =================================================================
// El script lee las credenciales directamente de tus variables de entorno.
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
};

// =================================================================
// 3. MODELO DE USUARIO (SIMPLIFICADO)
// =================================================================
// Lógica para interactuar con la tabla 'usuario'.
const UserModel = {
  /**
   * Crea un nuevo usuario en la base de datos con un ID específico.
   * @param {object} userData - Contiene id, email, password y username.
   * @param {object} dbPool - El pool de conexiones a la base de datos.
   * @returns {object} - El nuevo usuario con su ID.
   */
  create: async ({ id, email, password, username }, dbPool) => {
    // Hashear la contraseña antes de guardarla.
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO usuario (id_user, username, email, password_hash) VALUES (?, ?, ?, ?)';
    const params = [id, username, email, hashedPassword];

    // Ejecutar la consulta.
    await dbPool.query(sql, params);

    // Devolver el ID que se insertó.
    return { id, email, username };
  }
};

// =================================================================
// 4. LÓGICA PRINCIPAL DEL SCRIPT
// =================================================================
// Esta función se ejecuta sola al llamar al archivo con 'node'.
(async () => {
  // ✅ Tomar los 4 argumentos, incluyendo el ID.
  const [, , id, username, email, password] = process.argv;

  // Validar que se hayan proporcionado todos los argumentos.
  if (!id || !username || !email || !password) {
    console.error('❌ Error: Faltan argumentos.');
    console.log('Uso: node crearUsuarioManual.js <id> <username> <email> <password>');
    return; // Salir si faltan datos.
  }

  let pool; // Declarar el pool fuera del try para que sea accesible en el 'finally'.

  try {
    // Crear el pool de conexiones.
    pool = mysql.createPool(dbConfig);
    console.log('✔️ Conexión a la base de datos establecida.');

    console.log(`⚙️  Creando usuario con ID manual: ${id}...`);

    // Llamar a la función del modelo para crear el usuario.
    const newUser = await UserModel.create({ id, email, password, username }, pool);

    console.log('===================================================');
    console.log(`✅ ¡Usuario creado con éxito!`);
    console.log(`   - ID Manual: ${newUser.id}`);
    console.log(`   - Usuario: ${newUser.username}`);
    console.log(`   - Email: ${newUser.email}`);
    console.log('===================================================');

  } catch (error) {
    console.error('🔥 Error al procesar la solicitud:', error.message);
  } finally {
    // Es crucial cerrar el pool para que el script termine.
    if (pool) {
      await pool.end();
      console.log('🔌 Conexión a la base de datos cerrada.');
    }
  }
})();