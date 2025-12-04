import { Component, Input, OnInit } from '@angular/core';
import { BalanceResumen, IMacroCategoriaComparativa } from '../../models/balance.model';
import { NgbAccordionModule, NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CurrencyPipe } from '@angular/common';
import { Spinner } from '../spinner/spinner';
import { ReportConfigModal } from '../report-config-modal/report-config-modal';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-modal-comparativo',
  imports: [
    NgbAccordionModule,
    Spinner,
    CurrencyPipe,
    TooltipModule
  ],

  templateUrl: './modal-comparativo.html',
  styleUrl: './modal-comparativo.css',
})
export class ModalComparativo implements OnInit {
  //entrada de datos
  @Input() vistaComparativa: IMacroCategoriaComparativa[] = [];
  @Input() balanceActual: BalanceResumen | null = null;
  @Input() balanceAnterior: BalanceResumen | null = null;

  showSpinner = false;

  //Variables para ver en miles
  verEnMiles: boolean = false;
  dineroOcultoActual: number = 0;
  dineroOcultoAnterior: number = 0;
  residuosPorCategoria: { nombre: string; actual: number; anterior: number }[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    console.log('Vista Comparativa recibida:', this.vistaComparativa);
  }


  /**
   * Orquestador principal:
   * 1. Ajusta verticalmente la columna ACTUAL.
   * 2. Ajusta verticalmente la columna ANTERIOR.
   * 3. Calcula horizontalmente DIFERENCIA y VARIACIÓN usando los valores ajustados.
   */
  calcularVistaMilesCompleta(): void {
    // 1. Cascada para columna ACTUAL ('saldo' -> 'saldoMiles')
    this.ejecutarWaterfall(this.vistaComparativa, 'saldo', 'saldoMiles');

    // 2. Cascada para columna ANTERIOR ('saldoAnterior' -> 'saldoAnteriorMiles')
    this.ejecutarWaterfall(this.vistaComparativa, 'saldoAnterior', 'saldoAnteriorMiles');

    // 3. Cálculo Horizontal (Diferencias y Variaciones en base a Miles)
    this.calcularDiferenciasHorizontales(this.vistaComparativa);
  }

  /**
   * Algoritmo genérico de distribución de redondeo (Waterfall).
   * @param nodos Lista de elementos a procesar (Macros, Categorías, etc.)
   * @param campoOrigen Nombre del campo con data real (ej: 'saldo' o 'saldoAnterior')
   * @param campoDestino Nombre del campo donde guardar el valor visual (ej: 'saldoMiles' o 'saldoAnteriorMiles')
   */
  private ejecutarWaterfall(nodos: any[], campoOrigen: string, campoDestino: string): void {
    nodos.forEach(nodo => {
      // A. Definir la verdad del padre
      nodo[campoDestino] = Math.round(nodo[campoOrigen] / 1000);

      // B. Determinar hijos según el tipo de nodo
      let hijos: any[] = [];
      if (nodo.categorias) hijos = nodo.categorias;
      else if (nodo.subcategorias) hijos = nodo.subcategorias;
      else if (nodo.cuentas) hijos = nodo.cuentas;

      if (hijos.length > 0) {
        // C. Distribuir ajuste en los hijos
        this.distribuirAjusteGenerico(nodo, hijos, campoOrigen, campoDestino);
        
        // D. Recursividad
        this.ejecutarWaterfall(hijos, campoOrigen, campoDestino);
      }
    });
  }

  private distribuirAjusteGenerico(padre: any, hijos: any[], campoOrigen: string, campoDestino: string): void {
    let sumaHijos = 0;
    
    // 1. Calcular redondeo inicial hijos
    hijos.forEach(hijo => {
      hijo[campoDestino] = Math.round(hijo[campoOrigen] / 1000);
      sumaHijos += hijo[campoDestino];
    });

    // 2. Calcular Delta
    const diferencia = padre[campoDestino] - sumaHijos;

    // 3. Asignar al mayor candidato
    if (diferencia !== 0) {
      const hijoCandidato = hijos.reduce((prev, current) => 
        (Math.abs(current[campoOrigen]) > Math.abs(prev[campoOrigen]) ? current : prev)
      );
      hijoCandidato[campoDestino] += diferencia;
    }
  }

  private calcularDiferenciasHorizontales(nodos: any[]): void {
    nodos.forEach(nodo => {
      // Diferencia Simple (M$ Actual - M$ Anterior)
      nodo.diferenciaMiles = (nodo.saldoMiles ?? 0) - (nodo.saldoAnteriorMiles ?? 0);

      // Variación % (Basada en los valores visuales de Miles)
      nodo.variacionMiles = this.calcularVariacion(nodo.saldoMiles ?? 0, nodo.saldoAnteriorMiles ?? 0);

      // Recursividad para bajar por el árbol
      if (nodo.categorias) this.calcularDiferenciasHorizontales(nodo.categorias);
      if (nodo.subcategorias) this.calcularDiferenciasHorizontales(nodo.subcategorias);
      if (nodo.cuentas) this.calcularDiferenciasHorizontales(nodo.cuentas);
    });
  }

// Misma lógica de variación que el servicio, pero aplicada a números pequeños (Miles)
  private calcularVariacion(actual: number, anterior: number): number {
    if (anterior === 0) {
      return actual === 0 ? 0 : 999999; // Valor centinela para variación infinita
    }
    return ((actual - anterior) / anterior) * 100;
  }

  // --- HELPERS PARA HTML ---

  getMontoDisplay(item: any, tipo: 'actual' | 'anterior' | 'diferencia'): number {
    if (this.verEnMiles) {
      switch (tipo) {
        case 'actual': return item.saldoMiles ?? 0;
        case 'anterior': return item.saldoAnteriorMiles ?? 0;
        case 'diferencia': return item.diferenciaMiles ?? 0;
      }
    }
    // Modo Normal
    switch (tipo) {
      case 'actual': return item.saldo;
      case 'anterior': return item.saldoAnterior;
      case 'diferencia': return item.diferencia;
    }
    return 0;
  }

  getVariacionDisplay(item: any): number {
    return this.verEnMiles ? (item.variacionMiles ?? 0) : item.variacion;
  }

  getVariacionClase(variacion: number): string {
    if (variacion > 0) return 'text-success fw-bold';
    if (variacion < 0) return 'text-danger fw-bold';
    return 'text-muted';
  }

  formatearVariacion(variacion: number | null): string {
    if (variacion === null || isNaN(variacion)) return '-';
    if (Math.abs(variacion) > 9999) return '>>'; // Simplificado para espacios reducidos
    const signo = variacion > 0 ? '+' : '';
    return `${signo}${variacion.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }
  


abrirConfiguracion(tipo: 'print' | 'excel'): void {
    const modalRef = this.modalService.open(ReportConfigModal, { size: 'xl', backdrop: 'static' });
    modalRef.componentInstance.type = tipo;
    modalRef.componentInstance.title = tipo === 'print' ? 'Imprimir Comparativo' : 'Exportar Comparativo';
    modalRef.componentInstance.mode = 'comparative';
    modalRef.componentInstance.comparativeData = this.vistaComparativa;
    modalRef.componentInstance.balanceData = this.balanceActual;
    modalRef.componentInstance.balanceAnteriorData = this.balanceAnterior;
    
    // PASO CRUCIAL: Pasamos la configuración de miles actual al reporte
    // Para que el reporte sepa si debe inicializarse en miles o no.
    modalRef.componentInstance.config.verEnMiles = this.verEnMiles;
  }

toggleMiles(): void {
    this.verEnMiles = !this.verEnMiles;
    if (this.verEnMiles) {
      this.calcularVistaMilesCompleta();
    }
  }


}
