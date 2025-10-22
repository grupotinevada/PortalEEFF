import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Spinner } from '../spinner/spinner';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Spinner],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit{ 
  form: FormGroup;
  showSpinner = false;
  errorMsg = '';
  currentSection: 'microsoft' | 'form' | 'unauthorized' = 'microsoft';
  
  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const error = params['error'];
      if (error) {
        
        // ================== LÓGICA DE ERROR MEJORADA ==================
        // Usamos un switch para manejar todos los casos de error del backend
        switch(error) {
          
          // Caso 1: El usuario fue autenticado por MSAL pero NO existe en nuestra BD.
          // (Este es el error 'unauthorized_user' que vimos en el log).
          // La sección 'unauthorized' tiene el mensaje perfecto para esto.
          case 'unauthorized_user':
            this.currentSection = 'unauthorized';
            break;
          
          // Caso 2: Un error genérico de autenticación (legacy o por si acaso).
          case 'auth_failed':
            this.currentSection = 'unauthorized';
            break;

          // Caso 3: Errores técnicos en el callback de MSAL.
          // (ej. 'callback_error', 'callback_error_no_user')
          // Mostramos el formulario con un mensaje de error específico
          // para que el usuario pueda intentar el login manual.
          case 'callback_error':
          case 'callback_error_no_user':
            this.errorMsg = 'Hubo un error al procesar su sesión de Microsoft. Intente con sus credenciales.';
            this.currentSection = 'form';
            break;

          // Caso 4: Otros errores (sso_failed, etc.)
          default:
            console.log('Error de login SSO no manejado:', error);
            this.errorMsg = 'Ocurrió un error inesperado durante el inicio de sesión.';
            this.currentSection = 'form';
            break;
        }
        // ================== FIN LÓGICA DE ERROR ==================

        // Limpiamos la URL (esto estaba bien)
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }
  
  showFormLogin(): void {
    this.errorMsg = '';
    this.currentSection = 'form';
  }

  showMicrosoftLogin(): void {
    this.errorMsg = '';
    this.currentSection = 'microsoft';
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.showSpinner = true;
    this.errorMsg = '';
    const { email, password } = this.form.value;

    this.authService.login(email, password).pipe(
      finalize(() => this.showSpinner = false)).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Credenciales inválidas. Por favor, intente de nuevo.';
        console.error('Login error:', err);
      },
    });
  }
}