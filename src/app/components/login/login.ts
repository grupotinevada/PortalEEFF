import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit{
  form: FormGroup;

  errorMsg = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  
  ngOnInit(): void {
    this.authService.checkAuth().subscribe({
      next: (res) => {
        if (res.success) {
          this.router.navigate(['/home']);
        }
      },
      error: (err) => {
        console.warn('Usuario no autenticado o error en verificación', err);
        
      }
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.authService.login(email!, password!).subscribe({
      next: () => this.router.navigate(['/home']),   // Redirige a la página principal después de iniciar sesión
      error: (err) =>
        (this.errorMsg = err.error.message || 'Error al iniciar sesión'),
    });
  }


  
}
