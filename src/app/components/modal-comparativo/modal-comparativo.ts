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
   * Determina la clase CSS para el color de la variación (verde para positivo, rojo para negativo).
   */
  getVariacionClase(variacion: number): string {
    if (variacion > 0) {
      return 'text-success fw-bold';
    } else if (variacion < 0) {
      return 'text-danger fw-bold';
    }
    return 'text-muted';
  }

  /**
   * Formatea la variación porcentual con un signo '+' o '-' y añade el símbolo %.
   */
  formatearVariacion(variacion: number | null): string {
    if (variacion === null || isNaN(variacion)) return '-';

    // Si la variación es extremadamente alta (nuestro valor sentinel), mostrarlo como un cambio grande
    if (Math.abs(variacion) > 9999) return '>> 1000%';

    const signo = variacion > 0 ? '+' : '';
    // Usamos toLocaleString para formatear el número con comas y 2 decimales
    return `${signo}${variacion.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }

  abrirConfiguracion(tipo: 'print' | 'excel'): void {
    const modalRef = this.modalService.open(ReportConfigModal, { size: 'xl', backdrop: 'static' });

    // 1. Configuración Básica
    modalRef.componentInstance.type = tipo;
    modalRef.componentInstance.title = tipo === 'print' ? 'Imprimir Comparativo' : 'Exportar Comparativo';

    // 2. ACTIVAR MODO COMPARATIVO
    modalRef.componentInstance.mode = 'comparative';

    // 3. Pasar Datos Específicos
    modalRef.componentInstance.comparativeData = this.vistaComparativa;
    modalRef.componentInstance.balanceData = this.balanceActual; // Para cabeceras
    modalRef.componentInstance.balanceAnteriorData = this.balanceAnterior; // Para cabeceras
  }

  toggleMiles(): void {
    this.verEnMiles = !this.verEnMiles;
    if (this.verEnMiles) {
      this.calcularDineroOculto();
    } else {
      this.dineroOcultoActual = 0;
      this.dineroOcultoAnterior = 0;
    }
  }

  getValorVisual(valor: number): number {
    if (!valor && valor !== 0) return 0;

    if (this.verEnMiles) {
      // Truncamiento simple para visualización
      return Math.trunc(valor / 1000);
    }
    return valor;
  }

  /**
   * Calcula cuánto dinero se está ocultando visualmente.
   * IMPORTANTE: Usa Math.abs() para sumar la magnitud del error
   * sin que los signos negativos cancelen a los positivos.
   */
  calcularDineroOculto(): void {
    let totalResiduoActual = 0;
    let totalResiduoAnterior = 0;
    const tempResiduos: { nombre: string; actual: number; anterior: number }[] = [];

    this.vistaComparativa.forEach(macro => {
      macro.categorias.forEach(grupo => {

        // Acumuladores POR CATEGORÍA
        let catResActual = 0;
        let catResAnterior = 0;

        grupo.subcategorias.forEach(sub => {
          sub.cuentas.forEach(cuenta => {

            // 1. CÁLCULO RESIDUO ACTUAL (Absoluto a nivel cuenta)
            const saldoActualAbs = Math.abs(cuenta.saldo);
            const visualActual = Math.trunc(saldoActualAbs / 1000);
            catResActual += (saldoActualAbs - (visualActual * 1000));

            // 2. CÁLCULO RESIDUO ANTERIOR (Absoluto a nivel cuenta)
            const saldoAnteriorAbs = Math.abs(cuenta.saldoAnterior);
            const visualAnterior = Math.trunc(saldoAnteriorAbs / 1000);
            catResAnterior += (saldoAnteriorAbs - (visualAnterior * 1000));

          });
        });

        // Sumamos a los totales globales
        totalResiduoActual += catResActual;
        totalResiduoAnterior += catResAnterior;

        // Si la categoría tiene "basura" en alguno de los dos años, la agregamos
        if (catResActual > 0 || catResAnterior > 0) {
          tempResiduos.push({
            nombre: grupo.categoria,
            actual: catResActual,
            anterior: catResAnterior
          });
        }
      });
    });

    this.dineroOcultoActual = totalResiduoActual;
    this.dineroOcultoAnterior = totalResiduoAnterior;

    // Ordenamos por el residuo ACTUAL (el más relevante) de mayor a menor
    this.residuosPorCategoria = tempResiduos.sort((a, b) => b.actual - a.actual);
  }

}
