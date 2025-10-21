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
        // 2. Si el error es de autorización, mostramos la sección 'unauthorized'
        if (error === 'auth_failed') {
          this.currentSection = 'unauthorized';
        } else {
          // Para otros errores, mostramos el formulario con el mensaje
          console.log('Error de login SSO:', error);
          this.errorMsg = 'Ocurrió un error inesperado durante el inicio de sesión.';
          this.currentSection = 'form';
        }
        // Limpiamos la URL para que el mensaje no persista si el usuario recarga
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