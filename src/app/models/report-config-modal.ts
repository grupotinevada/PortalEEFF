export interface IReportConfig {
  alcanceNegativos: 'absoluto' | 'auditoria' | 'todo_negativo';
  estiloNegativo: 'signo' | 'parentesis';
  mostrarFsa: boolean;
  mostrarCuentas: boolean;
  incluirCuentasCero: boolean;
  categoriasSeleccionadas: { nombre: string; selected: boolean }[];
  colorTheme: 'green-red' | 'green-black' | 'red-black' | 'red-red'| 'black-black';
  mostrarDiferencia: boolean, // Default: visible
  mostrarVariacion: boolean,   // Default: visible
  verEnMiles: boolean
}