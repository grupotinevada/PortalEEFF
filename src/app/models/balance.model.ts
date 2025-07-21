export interface IBalance {
  num_cuenta: string;
  nombre: string;
  saldo: number;
  fecha_procesado: string;
  id_user?: number;
  id_empresa: string;
  id_fsa?: string;
}

export interface IDefaultMapping {
  num_cuenta: string;
  id_fsa: string;
  id_empresa: string;
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
  id_empresa: string;
  id_estado: number;
  id_user: string;
  empresa_desc: string;
  estado_desc: string;
  estado_color: string;
  username: string;
  email: string

}

export interface BalanceResumenResponse {
  success: boolean;
  data: BalanceResumen[];
  total: number;
}