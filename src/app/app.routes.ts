import { Routes } from '@angular/router';


export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./components/login/login').then(m => m.Login) },
  { path: 'home', loadComponent: () => import('./components/home/home').then(m => m.Home) },
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard) },
  { path: '**', redirectTo: 'login' }
];
