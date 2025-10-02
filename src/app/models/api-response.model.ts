// src/app/models/api-responses.model.ts
import { UsuarioLogin } from './usuario-login';

export interface AuthResponse {
  success: boolean;
  user: UsuarioLogin;
}

export interface IApiResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export interface INameAvailabilityResponse {
  success: boolean;
  message: string;
  isAvailable: boolean;
}