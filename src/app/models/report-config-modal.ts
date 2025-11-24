export interface IReportConfig {
  alcanceNegativos: 'absoluto' | 'auditoria' | 'todo_negativo';
  estiloNegativo: 'signo' | 'parentesis';
  mostrarFsa: boolean;
  mostrarCuentas: boolean;
  incluirCuentasCero: boolean;
  categoriasSeleccionadas: { nombre: string; selected: boolean }[];
}