import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Spinner } from '../spinner/spinner';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Spinner],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login { 
  form: FormGroup;
  showSpinner = false;
  errorMsg = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
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