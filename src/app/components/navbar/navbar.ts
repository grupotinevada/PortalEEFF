import { Component, Inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { finalize, Observable } from 'rxjs';
import { UsuarioLogin } from '../../models/usuario-login';
import { AsyncPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [AsyncPipe, CommonModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {

  currentUser$: Observable<UsuarioLogin | null>;

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  logout(): void {
    this.authService.logout().pipe(
      finalize(() => {
        this.router.navigate(['/login']);
      })
    ).subscribe({
      next: () => console.log('Logout completado, redirigiendo...'),
      error: err => console.error('Error inesperado durante el logout:', err)
    });
  }


  irDashboard(){
    this.router.navigate(['dashboard'])
  }

  irBalance(){
    this.router.navigate(['balances'])
  }
  irHome(){
   this.router.navigate(['home'])
  }
}
