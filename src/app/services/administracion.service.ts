import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { CreateUserPayload, RegisterResponse, UpdateUserPayload, UserListResponse } from '../models/usuario-login';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})


export class AdministracionService {
private apiUrl = `${environment.apiUrl}/auth`;  

constructor(private http: HttpClient) { }
/**
   * (POST /api/users)
   * Registra un nuevo usuario en el sistema.
   *
   * @param userData Los datos del nuevo usuario
   */
crearUsuario(userData: CreateUserPayload): Observable<RegisterResponse> {
  
    return this.http.post<RegisterResponse>(
      `${this.apiUrl}/user`, 
      userData,
      { withCredentials: true }
    );
  }

  /**
   * (GET /api/users)
   * Obtiene la lista completa de usuarios con sus roles y accesos.
   * Esta es una ruta protegida que requiere ser Admin.
   */
  getUsers(): Observable<UserListResponse> {
    return this.http.get<UserListResponse>(
      `${this.apiUrl}/users`, // Endpoint: GET /api/users
      { withCredentials: true }
    );
  }

  /**
   * (PUT /api/auth/user/:id)
   * @NUEVO
   * Actualiza un usuario existente.
   *
   * @param id El ID del usuario a modificar
   * @param payload Los datos a cambiar (UpdateUserPayload)
   */
  actualizarUsuario(id: number, payload: UpdateUserPayload): Observable<RegisterResponse> {
    // Usamos RegisterResponse como tipo de respuesta, 
    // ya que es compatible ({ success, message })
    return this.http.put<RegisterResponse>(
      `${this.apiUrl}/user/${id}`, // Endpoint: PUT /api/auth/user/123
      payload,
      { withCredentials: true }
    );
  }
}
