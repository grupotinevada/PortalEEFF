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