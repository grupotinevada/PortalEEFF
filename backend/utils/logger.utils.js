// utils/logger.js
const fs = require('fs');
const path = require('path');

// Rutas de carpetas y archivos
const useLogDir = path.join(__dirname, '../use_log');
const infoLogDir = path.join(__dirname, '../info_log');
const useLogFile = path.join(useLogDir, 'use_log.txt');
const infoLogFile = path.join(infoLogDir, 'info_log.txt');

// Asegurar que existan las carpetas
if (!fs.existsSync(useLogDir)) fs.mkdirSync(useLogDir, { recursive: true });
if (!fs.existsSync(infoLogDir)) fs.mkdirSync(infoLogDir, { recursive: true });

const writeLog = (level, message, filePath) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${level}] ${timestamp} - ${message}\n`;
  fs.appendFileSync(filePath, logMessage, 'utf8');
  console.log(logMessage); // también lo imprime en consola si estás desarrollando
};

const Logger = {
  info: (msg) => writeLog('INFO', msg, useLogFile),
  warn: (msg) => writeLog('WARN', msg, infoLogFile),
  error: (msg) => writeLog('ERROR', msg, infoLogFile),
  userAction: (userId, action, details = '') =>
    writeLog('ACTION', `User ${userId} - ${action}${details ? ` - ${details}` : ''}`, useLogFile)
};

module.exports = Logger;
