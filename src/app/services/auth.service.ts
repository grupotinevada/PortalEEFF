// auth.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap, catchError, of, map, finalize } from 'rxjs';
import { environment } from '../../environments/environment';
import { UsuarioLogin } from '../models/usuario-login';
import { AuthResponse } from '../models/api-response.model';

// Puedes crear una interfaz para el usuario

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<UsuarioLogin | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  // 1. Nuevo "semáforo" para saber cuándo terminó la verificación inicial
  private initialAuthCheckDone = new BehaviorSubject<boolean>(false);
  public isInitialAuthCheckComplete$ = this.initialAuthCheckDone.asObservable();

  constructor(private http: HttpClient) {
    // 2. Se llama a la verificación de sesión en cuanto el servicio se construye
    this.checkAuthOnLoad();
  }

  public get currentUserValue(): UsuarioLogin | null {
    return this.currentUserSubject.value;
  }
  
  public isAuthenticated(): Observable<boolean> {
    return this.currentUser$.pipe(map(user => !!user));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      { email, password },
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
        }
      })
    );
  }

  logout(): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/logout`, {}, { withCredentials: true })
      .pipe(
        tap(() => this.currentUserSubject.next(null)),
        catchError(() => {
          this.currentUserSubject.next(null);
          return of({ success: true });
        })
      );
  }

  checkAuthOnLoad(): void {
    this.http.get<AuthResponse>(
      `${this.apiUrl}/isLoggedIn`,
      { withCredentials: true }
    ).pipe(
      tap(response => {
        if (response.success && response.user) {
          this.currentUserSubject.next(response.user);
        }
      }),
      catchError(() => {
        this.currentUserSubject.next(null);
        return of(null);
      }),
      // 3. Al finalizar (con éxito o error), se pone el semáforo en 'true'
      finalize(() => {
        this.initialAuthCheckDone.next(true);
      })
    ).subscribe(); // Se necesita .subscribe() para que la petición se ejecute
  }
}