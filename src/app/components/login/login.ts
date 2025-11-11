import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Spinner } from '../spinner/spinner';
import { state, trigger, transition, style, animate } from '@angular/animations';
import { environment } from '../../../environments/environment.development';
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Spinner],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  animations: [
    trigger('fadeIn', [
      state('hidden', style({ opacity: 0, transform: 'translateY(6px)', display: 'none' })),
      state('visible', style({ opacity: 1, transform: 'translateY(0)', display: 'block' })),
      transition('hidden => visible', [
        style({ display: 'block', opacity: 0, transform: 'translateY(6px)' }),
        animate('220ms cubic-bezier(0.16,1,0.3,1)')
      ]),
      transition('visible => hidden', [
        animate('160ms ease-in', style({ opacity: 0, transform: 'translateY(6px)' })),
        // la siguiente style se aplica *al final* del animation player para forzar display:none
        style({ display: 'none' })
      ])
    ])
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
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
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
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
        switch(error) {

          case 'unauthorized_user':
            this.currentSection = 'unauthorized';
            break;
          case 'auth_failed':
            this.currentSection = 'unauthorized';
            break;
          case 'callback_error':
          case 'callback_error_no_user':
            this.errorMsg = 'Hubo un error al procesar su sesión de Microsoft. Intente con sus credenciales.';
            this.currentSection = 'form';
            break;
          default:
            console.log('Error de login SSO no manejado:', error);
            this.errorMsg = 'Ocurrió un error inesperado durante el inicio de sesión.';
            this.currentSection = 'form';
            break;
        }
        this.cdr.markForCheck();
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
      finalize(() => {
        
        this.showSpinner = false;
        this.cdr.markForCheck();})).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.errorMsg = err.error?.message || 'Credenciales inválidas. Por favor, intente de nuevo.';
        console.error('Login error:', err);
      },
    });
  }

  goToMicrosoftLogin(): void {
    // 2. Lee la URL desde el objeto environment importado
    // Esto es más seguro y fácil de probar que usar window en el template
    window.location.href = environment.loginbutton;
  }
}