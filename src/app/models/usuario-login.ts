// --- TUS INTERFACES EXISTENTES (PERFECTAS) ---

export interface RolesUsuario {
  permiso: number;
  acceso: number;
  raw: number[];
  empresas?: string[];
}

/**
 * Representa al usuario autenticado en la aplicación.
 * (Tu interfaz 'UsuarioLogin' original)
 */
export interface UsuarioLogin {
  id: number;
  email: string;
  username?: string;
  roles: RolesUsuario;
}

/**
 * La respuesta que esperamos de los endpoints
 * /auth/login y /auth/isloggedin.
 * Esta respuesta "envuelve" al objeto UsuarioLogin.
 */
export interface AuthResponse {
  success: boolean;
  user: UsuarioLogin; // Usa tu interfaz existente
  message?: string;
}

/**
 * El payload (datos) que ENVIAMOS al backend
 * para crear un nuevo usuario.
 * (Para la función crearUsuario).
 */
export interface CreateUserPayload {
  email: string;
  password: string;
  username: string;
  permiso: string | number;
  accesos?: (string | number)[];
}

/**
 * La respuesta que esperamos del backend después
 * de crear un usuario (POST /api/users).
 */
export interface RegisterResponse {
  success: boolean;
  message: string;
  userId?: number;
}


// --- NUEVAS INTERFACES GET ---

/**
 * Representa un Rol individual (viene anidado en la lista de usuarios)
 */
export interface Rol {
  id_rol: string;
  descripcion: string;
}

/**
 * Representa un Acceso individual (viene anidado en la lista de usuarios)
 */
export interface Acceso {
  id_acceso: string;
  descripcion: string;
}


/**
 * Representa al usuario completo como viene de la lista GET /api/users
 * (Incluye roles y accesos anidados)
 */
export interface UsuarioCompleto {
  id_user: number;
  username: string;
  email: string;
  habilitado: number; // o boolean, dependiendo de tu BBDD
  roles: Rol[];       // Un array de objetos Rol
  accesos: Acceso[];  // Un array de objetos Acceso
}

/**
 * La respuesta completa del endpoint GET /api/users
 */
export interface UserListResponse {
  success: boolean;
  users: UsuarioCompleto[];
  message?: string;
}


/**
 * El payload (datos) que ENVIAMOS al backend
 * para actualizar un usuario (PUT /api/auth/user/:id).
 * Todos los campos son opcionales, justo como en el backend.
 */
export interface UpdateUserPayload {
  permiso?: number | string;
  accesos?: (string | number)[];
  habilitado?: number; // 0 o 1
  password?: string;     // Opcional, solo si se quiere cambiar
}