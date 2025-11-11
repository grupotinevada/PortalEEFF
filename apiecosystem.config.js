/**
 * Iniciar el servidor en desarrollo:
 * pm2 start ecosystem.config.js --env development
 * 
 * Iniciar en QA:
 * pm2 start ecosystem.config.js --env qa
 * 
 * Iniciar en Producción:
 * 
 * pm2 start ecosystem.config.js --env production
 * 
 * 
 */
/**
* pm2 list               # Ver todos los procesos
*
* pm2 logs portaleeff-api  # Ver logs en tiempo real
*
* pm2 restart portaleeff-api --env qa   # Reiniciar en modo QA
*
* pm2 stop portaleeff-api
*
* pm2 delete portaleeff-api
*
* pm2 save
*
*/


module.exports = {
  apps: [
    {
      name: 'portaleeff-api',
      script: './server.js',
      instances: 'max',             
      exec_mode: 'cluster',       
      watch: false,            
      max_memory_restart: '500M',

      // 🔹 Configuración por defecto
      env: {
        NODE_ENV: 'development'
      },

      // 🔹 Entorno QA
      env_qa: {
        NODE_ENV: 'qa'
      },

      // 🔹 Entorno Producción
      env_production: {
        NODE_ENV: 'production'
      },

      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
