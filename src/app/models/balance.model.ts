export interface IBalance {   //solo lo usa el balance.service.createBulk
  num_cuenta: string;
  nombre: string;
  saldo: number;
  fecha_procesado: string;
  id_user?: number;
  id_mapping: string;
  id_fsa?: string;
}

export interface IBalanceGet{ // solo lo usa el balance.service.getBalanceById, este es la interfaz mas reciente del backend
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
  empresaDesc?: string;
}

export interface IDefaultMapping {
  num_cuenta: string;
  id_fsa: string;
  id_mapping: string;
}

export interface IMacroCategoria {
  nombre: string;
  saldo: number;
  categorias: IVistaEEFF[]; // Contendrá 'Activo Corriente', 'Activo No Corriente'.
}
export interface IVistaEEFF {
  categoria: string;
  id_cate?: number;
  saldo: number;
  subcategorias: {
    id_fsa: string;
    descripcion: string;
    saldo: number;
    cuentas: {
      num_cuenta: string;
      nombre: string;
      saldo: number;
      id_fsa: string;
    }[];
  }[];
}























//interfaces para la comparativa
export interface CuentaComparada {
  num_cuenta: string;
  nombre: string;
  saldo_base?: number;
  saldo_comp?: number;
}


export interface VistaCategoria {
  categoria: string;
  totalCategoria: number;
  grupos: {
    desc: string;
    totalFsa: number;
    cuentas: IBalance[];
  }[];
}
export interface ComparativoFsa {
  desc: string;
  annio_base: number;
  totalBase: number;
  annio_comp: number;
  totalComp: number;
  variacionAbs: number;
  variacionPct: number;
  cuentasBase: IBalance[];
  cuentasComp: IBalance[];
  cuentasFusionadas?: CuentaComparada[];
}

export interface ComparativoCategoria {
  categoria: string;
  totalBase: number;
  totalComp: number;
  variacionAbs: number;
  variacionPct: number;
  grupos: ComparativoFsa[];
}

export interface BalanceResumen {
  id_blce: string;
  nombre_conjunto: string;
  ejercicio: number;
  fecha_inicio: string;
  fecha_fin: string;
  id_mapping: string;
  id_estado: number;
  id_user: string;
  mapping_desc: string;
  estado_desc: string;
  estado_color: string;
  username: string;
  email: string
  id_empresa?: string;
  empresaDesc?: string;
}

export interface BalanceResumenResponse {
  success: boolean;
  data: BalanceResumen[];
  total: number;
}