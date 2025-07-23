/// <reference types="@angular/localize" />

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/components/app/app';

// Importaciones para el locale
import { registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';

// Registra los datos del locale ANTES de iniciar la app
registerLocaleData(localeEsCl);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
