module.exports = {
  apps: [
    {
      name: "PortalEEFF",
      script: "dist/server/server.mjs",
      cwd: "/var/www/PortalEEFF/server",
      watch: ["dist/server/server.mjs"],  // 👈 solo vigila este archivo
      watch_delay: 2000,                  // espera 2s antes de reiniciar
      env: {
        NODE_ENV: "production",
        PORT: 4003,
        PM2: "true"
      }
    }
  ]
};
