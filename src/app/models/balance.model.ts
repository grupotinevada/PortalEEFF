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
// Comparacion

export interface ICuenta {
  num_cuenta: string;
  nombre: string;
  saldo: number;
  saldoMiles?: number; // <--- NUEVO
  id_fsa: string;
}

export interface ISubcategoria {
  id_fsa: string;
  descripcion: string;
  orden?: number;
  saldo: number;
  saldoMiles?: number; // <--- NUEVO
  cuentas: ICuenta[];
}

export interface ICategoria {
  categoria: string;
  id_cate?: number;
  saldo: number;
  saldoMiles?: number; // <--- NUEVO
  orden?: number;
  subcategorias: ISubcategoria[];
}

export interface IMacroCategoria {
  nombre: string;
  saldo: number;
  saldoMiles?: number; // <--- NUEVO
  categorias: ICategoria[];
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

// ... interfaces base anteriores (ICuenta, etc) con saldoMiles ya agregado ...

// --- ACTUALIZACIÓN DE INTERFACES COMPARATIVAS ---

export interface ICuentaComparativa extends ICuenta {
  saldoAnterior: number;
  saldoAnteriorMiles?: number;
  diferencia: number;
  diferenciaMiles?: number;   
  variacion: number; 
  variacionMiles?: number;    
}

export interface ISubcategoriaComparativa extends ISubcategoria {
  saldoAnterior: number;
  saldoAnteriorMiles?: number;
  diferencia: number;
  diferenciaMiles?: number;   
  variacion: number;
  variacionMiles?: number;    
  cuentas: ICuentaComparativa[];
}

export interface ICategoriaComparativa extends ICategoria {
  saldoAnterior: number;
  saldoAnteriorMiles?: number;
  diferencia: number;
  diferenciaMiles?: number;   
  variacion: number;
  variacionMiles?: number;    
  subcategorias: ISubcategoriaComparativa[];
}

export interface IMacroCategoriaComparativa extends IMacroCategoria {
  saldoAnterior: number;
  saldoAnteriorMiles?: number;
  diferencia: number;
  diferenciaMiles?: number;   
  variacion: number;
  variacionMiles?: number;    
  categorias: ICategoriaComparativa[];
}

// Agregado al final para el prompt, aunque ahora las interfaces están tipadas.
//okok, te doy me falto darte mi modelo de balances, ojo que hay interfaces que no se usan en el eeffService

//ahora que informacion falta para crear esto?