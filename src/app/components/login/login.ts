import { Component, Inject, OnInit, PLATFORM_ID } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';
import { Spinner } from '../spinner/spinner';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Spinner],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  form: FormGroup;
  showSpinner: boolean = false;
  errorMsg = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    this.initializeAuthCheck();
  }

  private initializeAuthCheck(): void {
    this.showSpinner = true;

    if (!isPlatformBrowser(this.platformId)) {
      this.showSpinner = false;
      return; // No hacer nada si no estamos en el navegador
    }

    // Esperar 2 segundos para asegurar disponibilidad de cookies
    setTimeout(() => {
      this.checkAuthentication();
    }, 2000);
  }

  private checkAuthentication(): void {
    this.authService.checkAuth().subscribe({
      next: (res) => this.handleAuthCheckResponse(res),
      error: (err) => this.handleAuthCheckError(err),
    });
  }

  private handleAuthCheckResponse(res: any): void {
    if (res?.success) {
      this.showSpinner = false;
      this.router.navigate(['/home']);
    } else {
      this.showSpinner = false;
      // Opcional: Manejar caso donde success es false
      console.warn('Autenticación verificada pero success=false');
    }
  }

  private handleAuthCheckError(err: any): void {
    this.showSpinner = false;
    console.warn('Usuario no autenticado o error en verificación', err);

    // Opcional: Podrías redirigir a login o mostrar un mensaje
    // this.router.navigate(['/login']);
  }

  onSubmit(): void {
    // Verificar si el formulario es inválido
    if (this.form.invalid) {
      return;
    }

    // Obtener valores del formulario
    const { email, password } = this.form.value;

    // Mostrar spinner de carga
    this.showSpinner = true;

    // Limpiar mensajes de error previos
    this.errorMsg = '';

    // Realizar el login
    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.handleLoginSuccess();
      },
      error: (err) => {
        this.handleLoginError(err);
      },
    });
  }

  private handleLoginSuccess(): void {
    this.showSpinner = false;
    this.router.navigate(['/home']); // Redirige a la página principal
  }

  private handleLoginError(err: any): void {
    this.showSpinner = false;
    this.errorMsg = err.error?.message || 'Error al iniciar sesión';

    // Opcional: Log del error para debugging
    console.error('Login error:', err);
  }
}
