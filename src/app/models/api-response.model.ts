// src/app/models/api-responses.model.ts
import { UsuarioLogin } from './usuario-login';

export interface AuthResponse {
  success: boolean;
  user: UsuarioLogin;
}