import { Component, Input, OnInit } from '@angular/core';
import { BalanceResumen, IMacroCategoriaComparativa } from '../../models/balance.model';
import { NgbAccordionModule, NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CurrencyPipe, CommonModule } from '@angular/common';
import { Spinner } from '../spinner/spinner';
import { ReportConfigModal } from '../report-config-modal/report-config-modal';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-modal-comparativo',
  standalone: true,
  imports: [
    CommonModule,
    NgbAccordionModule,
    Spinner,
    CurrencyPipe,
    TooltipModule
  ],
  templateUrl: './modal-comparativo.html',
  styleUrl: './modal-comparativo.css',
})
export class ModalComparativo implements OnInit {
  @Input() vistaComparativa: IMacroCategoriaComparativa[] = [];
  @Input() balanceActual: BalanceResumen | null = null;
  @Input() balanceAnterior: BalanceResumen | null = null;

  showSpinner = false;
  verEnMiles: boolean = false;

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal
  ) { }

  ngOnInit(): void {
    console.log('Vista Comparativa recibida:', this.vistaComparativa);
  }

  toggleMiles(): void {
    this.verEnMiles = !this.verEnMiles;
    if (this.verEnMiles) {
      this.calcularVistaMilesCompleta();
    }
  }

  /**
   * Lógica estandarizada con ModalDetalle:
   * 1. Calcula Miles para la columna Actual (usando redondeo simétrico + ajuste hijos).
   * 2. Calcula Miles para la columna Anterior (usando redondeo simétrico + ajuste hijos).
   * 3. Recalcula diferencias horizontales (Diferencia y Variación) sobre los valores en Miles.
   */
  calcularVistaMilesCompleta(): void {
    console.log('⚖️ Calculando vista Comparativa en Miles...');

    // Iteramos explícitamente igual que en ModalDetalle para asegurar consistencia
    this.vistaComparativa.forEach(macro => {

      // --- 1. PROCESAR COLUMNA ACTUAL ---
      macro.saldoMiles = this.redondear(macro.saldo / 1000);
      this.ajustarHijos(macro.saldoMiles, macro.categorias, 'saldo', 'saldoMiles');

      macro.categorias.forEach(cat => {
        this.ajustarHijos(cat.saldoMiles!, cat.subcategorias, 'saldo', 'saldoMiles');

        cat.subcategorias.forEach(sub => {
          this.ajustarHijos(sub.saldoMiles!, sub.cuentas, 'saldo', 'saldoMiles');
        });
      });

      // --- 2. PROCESAR COLUMNA ANTERIOR ---
      macro.saldoAnteriorMiles = this.redondear(macro.saldoAnterior / 1000);
      this.ajustarHijos(macro.saldoAnteriorMiles, macro.categorias, 'saldoAnterior', 'saldoAnteriorMiles');

      macro.categorias.forEach(cat => {
        this.ajustarHijos(cat.saldoAnteriorMiles!, cat.subcategorias, 'saldoAnterior', 'saldoAnteriorMiles');

        cat.subcategorias.forEach(sub => {
          this.ajustarHijos(sub.saldoAnteriorMiles!, sub.cuentas, 'saldoAnterior', 'saldoAnteriorMiles');
        });
      });
    });

    // --- 3. RECALCULO HORIZONTAL (Diferencias y Variaciones) ---
    this.recalcularDiferenciasHorizontales();
  }

  /**
   * Ajusta la suma de los hijos para que cuadre con el padre redondeado.
   * Se aplica el ajuste al hijo con mayor valor absoluto ("Candidato").
   */
  private ajustarHijos(saldoObjetivoPadre: number, hijos: any[], campoOrigen: string, campoDestino: string): void {
    if (!hijos || hijos.length === 0) return;

    let sumaHijos = 0;

    hijos.forEach(hijo => {
      // Redondeo simétrico inicial
      hijo[campoDestino] = this.redondear(hijo[campoOrigen] / 1000);
      sumaHijos += hijo[campoDestino];
    });

    const diferencia = saldoObjetivoPadre - sumaHijos;

    // Si hay diferencia pequeña (fusible), se ajusta
    if (diferencia !== 0 && Math.abs(diferencia) <= 2) {
      const candidato = hijos.reduce((prev, curr) =>
        (Math.abs(curr[campoOrigen]) > Math.abs(prev[campoOrigen]) ? curr : prev)
      );
      candidato[campoDestino] += diferencia;
    }
    else if (Math.abs(diferencia) > 2) {
      console.warn(`🚨 FUSIBLE COMPARATIVO: Diferencia grande (${diferencia}) en campo ${campoDestino}`);
    }
  }

  private recalcularDiferenciasHorizontales(): void {
    // Función recursiva simple para actualizar diferencias tras el redondeo
    const actualizarNodo = (nodo: any) => {
      const actual = nodo.saldoMiles ?? 0;
      const anterior = nodo.saldoAnteriorMiles ?? 0;

      nodo.diferenciaMiles = actual - anterior;
      nodo.variacionMiles = this.calcularVariacion(actual, anterior);

      if (nodo.categorias) nodo.categorias.forEach(actualizarNodo);
      if (nodo.subcategorias) nodo.subcategorias.forEach(actualizarNodo);
      if (nodo.cuentas) nodo.cuentas.forEach(actualizarNodo);
    };

    this.vistaComparativa.forEach(actualizarNodo);
  }

  private redondear(valor: number): number {
    return Math.round(Math.abs(valor)) * Math.sign(valor);
  }

  private calcularVariacion(actual: number, anterior: number): number {
    if (anterior === 0) return actual === 0 ? 0 : 999999;
    return ((actual - anterior) / anterior) * 100;
  }

  // --- GETTERS PARA HTML ---

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
    if (Math.abs(variacion) > 9999) return '>>';
    const signo = variacion > 0 ? '+' : '';
    return `${signo}${variacion.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }

  abrirConfiguracion(tipo: 'print' | 'excel'): void {
    const modalRef = this.modalService.open(ReportConfigModal, { size: 'xl', backdrop: 'static' });
    modalRef.componentInstance.type = tipo;
    modalRef.componentInstance.title = tipo === 'print' ? 'Imprimir Comparativo' : 'Exportar Comparativo';
    modalRef.componentInstance.mode = 'comparative';

    // Clonamos para evitar mutaciones directas indeseadas
    modalRef.componentInstance.comparativeData = JSON.parse(JSON.stringify(this.vistaComparativa));
    modalRef.componentInstance.balanceData = this.balanceActual;
    modalRef.componentInstance.balanceAnteriorData = this.balanceAnterior;

    // Pasar configuración actual
    modalRef.componentInstance.config.verEnMiles = this.verEnMiles;
  }
}