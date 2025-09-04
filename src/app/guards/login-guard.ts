import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { filter, map, take } from 'rxjs/operators';

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isInitialAuthCheckComplete$.pipe(
    filter(isDone => isDone),  
    take(1),
    map(() => {
      const isAuthenticated = !!authService.currentUserValue;
      if (isAuthenticated) {
        router.navigate(['/home']);
        return false;
      } else {
        return true; 
      }
    })
  );
};