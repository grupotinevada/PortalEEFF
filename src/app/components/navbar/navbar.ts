import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  imports: [],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
constructor(private authService: AuthService,
            private router: Router
){}
  logout(): void {
  this.authService.logout().subscribe({
    next: res => {
      if (res) {
        this.router.navigate(['/login']);
        this.authService.isAuthenticated = false; // Actualiza el estado de autenticación
        console.log('Logout exitoso');
      }
    },
    error: err => {
      console.error('Error en logout', err);
    }
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
