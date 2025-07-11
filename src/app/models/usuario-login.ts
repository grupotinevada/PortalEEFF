export interface UsuarioLogin {
  success: boolean;
  token: string;
  user: { id: number; email: string };
}
