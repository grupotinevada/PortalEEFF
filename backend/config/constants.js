// This must be at the very top of your file, before any other code
require('dotenv').config();

console.log("CONECTADO A LA BDA:", process.env.DB_NAME); // Should now show your DB name

module.exports = {
    JWT_SECRET: process.env.JWT_SECRET,
    DB_CONFIG: { // Fixed typo from DB_COMFIG to DB_CONFIG
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'portaleeff3',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0 
    }
};
