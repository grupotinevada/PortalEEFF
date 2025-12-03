import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { filter, map, take } from 'rxjs';
import { UsuarioLogin } from '../models/usuario-login';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isInitialAuthCheckComplete$.pipe(
    filter(isDone => isDone), // espera a que el chequeo inicial termine
    take(1),
    map(() => {
      const user: UsuarioLogin | null = authService.currentUserValue;

      // Si no está autenticado -> login
      if (!user) {
        router.navigate(['/login']);
        return false;
      }
      // Si lo consideras rol 5 cuando roles.permiso === 5 o cuando roles.raw incluye 5
      const roles = user.roles;
      const isRol5 =
        (roles && typeof roles.permiso === 'number' && roles.permiso === 5) ||
        (roles && Array.isArray(roles.raw) && roles.raw.includes(5));

      if (!isRol5) {
        console.log('No es rol 5');
        // redirige a una página de "no autorizado" o a la que prefieras
        router.navigate(['/test']);
        return false;
      }
      console.log('Es rol 5');
      // autorizado
      return true;
    })
  );
};
