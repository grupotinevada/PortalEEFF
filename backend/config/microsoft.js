const msal = require('@azure/msal-node');
const {
  MICROSOFT_CLIENT_ID,
  MICROSOFT_CLIENT_SECRET,
  MICROSOFT_TENANT_ID,
  MICROSOFT_REDIRECT_URL 
} = require('./constants');

// Objeto de configuración de MSAL
const msalConfig = {
  auth: {
    clientId: MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}`,
    clientSecret: MICROSOFT_CLIENT_SECRET,
  },
  system: {
    loggerOptions: {
      loggerCallback(loglevel, message, containsPii) {
        console.log(message);
      },
      piiLoggingEnabled: false,
      logLevel: msal.LogLevel.Info,
    }
  }
};

// Crea la instancia del cliente
const msalClient = new msal.ConfidentialClientApplication(msalConfig);

module.exports = { msalClient, MICROSOFT_REDIRECT_URL };