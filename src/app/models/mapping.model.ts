/**
 * Define la estructura de datos de la tabla.
 * Es el cuerpo de cualquier peticion a la dba para mostrar datos.
 */
export interface Imapping {
  id_mapping: string;
  descripcion: string;
  num_cuenta: string;
  id_fsa: string;
  nombre?: string;
  isManual?: boolean
}
/**
 * Define la estructura de datos para los select.
 * es un get para mostrar el mapeo en el select.
 */

export interface ImappingSelect{
  id_mapping:string;
  descripcion: string
}

/**
 * Define la estructura de datos para crear un nuevo mapeo.
 * Es el "payload" o cuerpo de la petición POST.
 */
export interface IMappingPayload {
  num_cuenta: string;
  nombre?: string;
  id_fsa: string;
  id_mapping: string;
  descripcion: string; 
  isManual?: boolean;
}




/**
 * Define la estructura de datos para crear un mapping usando el clon.
 * Es el "payload" o cuerpo de la petición POST.
 */
export interface CloneMappingPayload {
  idMappingOrigen: string;
  idMappingNuevo: string;
  descripcionNueva: string;
  cambios?: Array<{
    num_cuenta: string;
    id_fsa: string;
    descripcion?: string;
  }>;
}