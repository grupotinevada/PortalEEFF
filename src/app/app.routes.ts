import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { loginGuard } from './guards/login-guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login').then((m) => m.Login),
    canActivate: [loginGuard],
  },
    {
    path: 'test',
    loadComponent: () => import('./components/test/test').then((m) => m.Test),
    
  },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home').then((m) => m.Home),
    canActivate: [authGuard],
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/dashboard/dashboard').then((m) => m.Dashboard),
    canActivate: [authGuard],
  },
  {
    path: 'preview',
    loadComponent: () =>
      import('./components/preview/preview').then((m) => m.Preview),
    canActivate: [authGuard],
  },
    {
    path: 'admin', loadComponent: () =>
      import('./components/administracion/administracion').then(m => m.Administracion),
    canActivate: [authGuard],
  },
  {
    path: 'balances',
    loadComponent: () =>
      import('./components/balances/balances').then((m) => m.Balances),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'login' },

];
