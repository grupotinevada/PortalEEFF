export interface IBalance {   //solo lo usa el balance.service.createBulk
  num_cuenta: string;
  nombre: string;
  saldo: number;
  fecha_procesado: string;
  id_user?: number;
  id_mapping: string;
  id_fsa?: string;
}

export interface IBalanceGet{ // solo lo usa el balance.service.getBalanceById
  id_blce: string,
  num_cuenta: string;
  nombre: string;
  nombre_conjunto: string;
  ejercicio: string;
  fecha_inicio: Date;
  fecha_fin: Date;
  saldo: number;
  fecha_procesado: string;
  id_user?: number;
  id_mapping: string;
  id_fsa?: string;
  id_empresa?: string;
  id_estado?: string;
  empresaDesc?: string;
  isManual?: boolean;
}
export interface BalanceResumen {
  id_blce: string;
  nombre_conjunto: string;
  ejercicio: number;
  fecha_inicio: string;
  fecha_fin: string;
  fecha_creacion: string;   // agregado porque tu consulta lo devuelve
  id_mapping: string;
  mapping_desc: string;     // ahora viene de cta_fsa_mapeo
  id_empresa: string;
  empresa_desc: string;
  estado_desc: string;
  estado_color: string;
  username: string;
  email: string;
}

export interface BalanceResumenResponse { //respuesta del getResumen, BalanceResumen
  success: boolean;
  data: BalanceResumen[];
  total: number;
}


export interface IDefaultMapping {
  num_cuenta: string;
  id_fsa: string;
  id_mapping: string;
}

// ----------------------------------------------------
// REFACTORIZACIÓN MÍNIMA (Necesaria para la comparación)

export interface ICuenta {
  num_cuenta: string;
  nombre: string;
  saldo: number;
  id_fsa: string;
}

export interface ISubcategoria {
  id_fsa: string;
  descripcion: string;
  orden?: number;
  saldo: number;
  cuentas: ICuenta[]; // Usa la nueva ICuenta
}

// RENOMBRADO: IVistaEEFF -> ICategoria
export interface ICategoria {
  categoria: string;
  id_cate?: number;
  saldo: number;
  orden?: number;
  subcategorias: ISubcategoria[]; // Usa la nueva ISubcategoria
}

export interface IMacroCategoria {
  nombre: string;
  saldo: number;
  categorias: ICategoria[]; // USANDO ICategoria[]
  orden?: number;
}
export interface IValidacionesEEFF {
  balanceCuadrado: boolean;
  diferenciaBalance: number;
  estadoResultadosSaldo: number;
}

// ----------------------------------------------------
// INTERFACES COMPARATIVAS (NUEVAS)
// ----------------------------------------------------

export interface ICuentaComparativa extends ICuenta {
  saldoAnterior: number;
  diferencia: number;
  variacion: number; // Porcentaje de variación
}

export interface ISubcategoriaComparativa extends ISubcategoria {
  saldoAnterior: number;
  diferencia: number;
  variacion: number;
  cuentas: ICuentaComparativa[]; // Usa la interfaz de cuenta comparativa
}

export interface ICategoriaComparativa extends ICategoria {
  saldoAnterior: number;
  diferencia: number;
  variacion: number;
  subcategorias: ISubcategoriaComparativa[]; // Usa la interfaz de subcategoría comparativa
}

export interface IMacroCategoriaComparativa extends IMacroCategoria {
  saldoAnterior: number;
  diferencia: number;
  variacion: number;
  categorias: ICategoriaComparativa[]; // Usa la interfaz de categoría comparativa
}

// Agregado al final para el prompt, aunque ahora las interfaces están tipadas.
//okok, te doy me falto darte mi modelo de balances, ojo que hay interfaces que no se usan en el eeffService

//ahora que informacion falta para crear esto?