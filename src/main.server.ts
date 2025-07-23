import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/components/app/app';
import { config } from './app/app.config.server';


// Importaciones para el locale
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';

// Registra los datos del locale ANTES de iniciar la app del servidor
registerLocaleData(localeEsCl);


const bootstrap = () => bootstrapApplication(App, config);

export default bootstrap;
