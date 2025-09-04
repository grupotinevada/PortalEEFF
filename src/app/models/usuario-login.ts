// src/app/models/usuario.model.ts
export interface UsuarioLogin {
  id: number;
  email: string;
  username?: string; // Lo ponemos opcional por si alguna respuesta no lo incluye
}