const { watch } = require("fs");

module.exports = {
  apps: [{
    name: 'apiPortalEEFF',
    script: 'server.js',
    cwd: '/home/soporte/Escritorio/portalEEFF',
    ignore_watch: ["logs", "*.log","*.txt","info_log/" ],
    watch: true, //este
    // Otras configuraciones
  }]
};