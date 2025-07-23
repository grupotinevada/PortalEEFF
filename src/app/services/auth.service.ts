import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { UsuarioLogin } from '../models/usuario-login';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
    private apiUrl = `${environment.apiUrl}/auth`;
  public isAuthenticated = false;

  constructor(private http: HttpClient) { }

  login(email: string, password: string) {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/login`,
      { email, password },
      { withCredentials: true }
    ).pipe(
      tap(res => {
        if (res.success) {
          this.isAuthenticated = true;
        }
      })
    );
  }

  logout() {
    return this.http.post<{ success: boolean }>(
      `${this.apiUrl}/logout`,
      {},
      { withCredentials: true }
    ).pipe(
      tap(res => {
        if (res.success) {
          this.isAuthenticated = false;
        }
      })
    );
    
  }

  checkAuth() {
    return this.http.get<{ success: boolean; user: any }>(
      `${this.apiUrl}/isLoggedIn`,
      { withCredentials: true }
    ).pipe(
      tap(res => {
        this.isAuthenticated = res.success;
      })
    );
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }
}