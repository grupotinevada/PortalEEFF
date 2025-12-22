import { Component, Input, OnInit } from '@angular/core';

import { NgbAccordionModule, NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { BalanceService } from '../../services/balance.service';
import { Imapping } from '../../models/mapping.model';
import { IFsa } from '../../models/fsa.model';
import { IBalanceGet, IMacroCategoria } from '../../models/balance.model';
import { Spinner } from '../spinner/spinner';

import { EEFFService } from '../../services/eeff.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { ReportConfigModal } from '../report-config-modal/report-config-modal';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-modal-detalle',
  standalone: true,
  imports: [
    Spinner,
    CommonModule,
    NgbAccordionModule,
    FormsModule,
    TooltipModule
  ],
  templateUrl: './modal-detalle.html',
  styleUrl: './modal-detalle.css',
})
export class ModalDetalle implements OnInit {
  @Input() id!: number;
  @Input() mappings: Imapping[] = [];
  @Input() fsas: IFsa[] = [];
  showSpinner = false;
  msgError = '';
  balance: IBalanceGet[] = [];
  verNegativos: boolean = false;

  macros: IMacroCategoria[] = [];

  vistaAgrupada: IMacroCategoria[] = [];
  vistaParaMostrar: IMacroCategoria[] = [];

  //SWITCH DE MONTO EN MIL
  verEnMiles: boolean = false;


  constructor(
    public activeModal: NgbActiveModal,
    private balanceService: BalanceService,
    private eeffService: EEFFService,
    private modalService: NgbModal,

  ) { }

  ngOnInit(): void {
    console.log('ID recibido en el modal:', this.id);
    console.log('Mappings recibidas en el modal:', this.mappings);
    console.log('FSAs recibidas en el modal:', this.fsas);


    this.getBalance(this.id.toString());
  }

  toggleMiles(): void {
    this.verEnMiles = !this.verEnMiles;
    // Al cambiar el modo miles, regeneramos la vista completa
    this.regenerarVista();
  }

  /**
     * Estrategia "Bottom-Up" (Acumulación Ascendente).
     * IMPORTANTE: Esta función debe trabajar con datos SIN positivizar (con signos originales)
     * para que la suma de hijos cuadre correctamente con el padre.
     */
  calcularVistaMiles(): void {
    console.log('⚖️ Calculando vista en Miles (Con Redondeo Simétrico)...');

    this.vistaParaMostrar.forEach(macro => {
      // 🔍 LOG DE DIAGNÓSTICO
      const saldoOriginal = macro.saldo;
      const saldoDividido = saldoOriginal / 1000;
      const saldoRedondeado = this.redondear(saldoDividido);

      console.log(`🔍 MACRO "${macro.nombre}":`,
        `Original: ${saldoOriginal},`,
        `÷1000: ${saldoDividido},`,
        `Redondeado: ${saldoRedondeado}`
      );

      macro.saldoMiles = saldoRedondeado;

      this.ajustarHijos(macro.saldoMiles, macro.categorias);

      macro.categorias.forEach(cat => {
        this.ajustarHijos(cat.saldoMiles!, cat.subcategorias);

        cat.subcategorias.forEach(sub => {
          this.ajustarHijos(sub.saldoMiles!, sub.cuentas);
        });
      });
    });
  }

  private ajustarHijos(saldoObjetivoPadre: number, hijos: any[]): void {
    if (!hijos || hijos.length === 0) return;

    let sumaHijos = 0;
    hijos.forEach(hijo => {
      // USAMOS EL NUEVO REDONDEO AQUÍ TAMBIÉN
      hijo.saldoMiles = this.redondear(hijo.saldo / 1000);
      sumaHijos += hijo.saldoMiles;
    });

    const diferencia = saldoObjetivoPadre - sumaHijos;

    // ... (El resto de tu lógica de fusible sigue igual) ...
    if (diferencia !== 0 && Math.abs(diferencia) <= 2) {
      // ... lógica de ajuste ...
      const candidato = hijos.reduce((prev, curr) =>
        (Math.abs(curr.saldo) > Math.abs(prev.saldo) ? curr : prev)
      );
      candidato.saldoMiles += diferencia;
    }
    else if (Math.abs(diferencia) > 2) {
      console.warn(`🚨 FUSIBLE ACTIVADO: Diferencia de ${diferencia} ...`);
    }
  }

  /**
   * Redondeo Simétrico: Asegura que positivos y negativos se redondeen con la misma magnitud.
   * Math.round(-343.5) = -343 (ERROR en JS) -> Queremos -344
   * redondearSimetrico(-343.5) = -344 (CORRECTO)
   */
  private redondear(valor: number): number {
    return Math.round(Math.abs(valor)) * Math.sign(valor);
  }

  getBalance(id: string): void {
    if (!id || id.trim().length === 0) {
      this.msgError = 'ID no proporcionado';
      return;
    }
    this.showSpinner = true;
    this.msgError = '';
    this.balanceService.getBalanceById(id).subscribe({
      next: (data: IBalanceGet[]) => {
        this.balance = data;
        this.showSpinner = false;
        console.log('Balance inicial:', this.balance);
        this.agruparVista();
      },
      error: (err: any) => {
        console.error('Error al obtener balance:', err);
        this.msgError = 'Error al obtener el balance';
        this.showSpinner = false;
      },
    });
  }

  /**
   * Distribuye la diferencia de redondeo entre los hijos para cuadrar con el padre.
   * @param padre El nodo superior que contiene el 'saldoMiles' objetivo.
   * @param hijos La lista de nodos hijos a ajustar.
   */
  private distribuirAjuste(padre: any, hijos: any[], nivel: string): void {
    if (!hijos || hijos.length === 0) return;

    // 1. Calcular redondeo inicial (usando redondeo simétrico)
    let sumaHijos = 0;
    hijos.forEach(hijo => {
      hijo.saldoMiles = this.redondear(hijo.saldo / 1000);
      sumaHijos += hijo.saldoMiles;
    });

    // 2. Detectar Delta
    let diferencia = padre.saldoMiles - sumaHijos;

    // 🚨 LOG DE ALERTA SI LA DIFERENCIA ES GRANDE (Más de 5 mil pesos de error es sospechoso)
    if (Math.abs(diferencia) > 5) {
      console.warn(`🚨 DESCUADRE MASIVO DETECTADO EN NIVEL ${nivel}`);
      console.log(`Padre: ${padre.nombre || padre.categoria || padre.descripcion}`);
      console.log(`💰 El Padre exige sumar: ${padre.saldoMiles}`);
      console.log(`∑ Los Hijos suman solo: ${sumaHijos}`);
      console.log(`📉 DIFERENCIA A INYECTAR: ${diferencia}`);
      console.table(hijos.map(h => ({
        nombre: h.nombre || h.categoria || h.descripcion,
        saldoReal: h.saldo,
        saldoMilesCalc: h.saldoMiles
      })));
    }

    // 3. Aplicar diferencia
    if (diferencia !== 0) {
      const hijoCandidato = hijos.reduce((prev, current) =>
        (Math.abs(current.saldo) > Math.abs(prev.saldo) ? current : prev)
      );

      if (Math.abs(diferencia) > 5) {
        console.log(`💉 INYECTANDO la diferencia de ${diferencia} en el candidato:`, hijoCandidato.nombre || hijoCandidato.descripcion);
        console.log(`   Valor Antes: ${hijoCandidato.saldoMiles}`);
        console.log(`   Valor Después: ${hijoCandidato.saldoMiles + diferencia}`);
      }

      hijoCandidato.saldoMiles += diferencia;
    }
  }

  // Helper para el HTML: Devuelve el valor correcto según el modo activo
  getMontoDisplay(item: any): number {
    return this.verEnMiles ? (item.saldoMiles ?? 0) : item.saldo;
  }

  agruparVista(): void {
    if (!this.balance || !this.fsas) {
      console.error('No hay datos disponibles para agrupar.');
      return;
    }

    this.vistaAgrupada = this.eeffService.generarVistaAgrupada(
      this.balance,
      this.fsas
    );

    this.macros = this.vistaAgrupada; // Guardar la vista agrupada en la propiedad macros
    console.log('Vista Agrupada Final:', this.vistaAgrupada);    //VISTA AGRUPADA CON SALDOS ORIGINALES EN NEGATIVO

    const copiaParaPositivizar = typeof structuredClone === 'function'
      ? structuredClone(this.vistaAgrupada)
      : JSON.parse(JSON.stringify(this.vistaAgrupada));

    // 3. Ahora positivizamos la COPIA. 'this.vistaAgrupada' queda intacta.
    this.vistaParaMostrar = this.eeffService.positivizarSaldosParaPreview(copiaParaPositivizar);  //PARA MOSTRAR CON SIGNO BASTA CON USAR VISTA AGRUPARA Y NO VISTAPARAMOSTRAR EN EL HTML

    // --- Validaciones ---
    const validaciones = this.eeffService.validarEEFF(this.vistaParaMostrar);
    console.log('Validaciones EEFF:', validaciones);
    if (!validaciones.balanceCuadrado) {
      Swal.fire({
        icon: 'warning',
        title: 'Advertencia de cuadratura',
        text: `El balance no cuadra: diferencia de ${validaciones.diferenciaBalance.toLocaleString()}`,
        confirmButtonText: 'Entendido'
      });
    }

    if (validaciones.estadoResultadosSaldo === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Estado de Resultados',
        text: 'El Estado de Resultados está en 0, revise si es correcto.',
        confirmButtonText: 'OK'
      });
    }
  }

  toggleNegativos(): void {
    this.verNegativos = !this.verNegativos;
    this.regenerarVista();
  }


  // 🔹 Estado combinado (getter)
  get filtrosActivos(): boolean {
    return this.eeffService.mostrarDetalles;
  }

  // 🔹 Función única para alternar filtros
  toggleFiltro() {
    console.log(`[FUNCTION COMPONENT] Tocaste toggleFiltro()`);
    this.eeffService.toggleDetalles();
    this.regenerarVista();
  }

  regenerarVista(): void {
    this.showSpinner = true;

    // Usamos setTimeout para dar respiro al renderizado UI
    setTimeout(() => {
      try {
        if (!this.vistaAgrupada || this.vistaAgrupada.length === 0) {
          // Si no hay vista base, la regeneramos desde cero usando el servicio
          if (this.balance && this.fsas) {
            this.vistaAgrupada = this.eeffService.generarVistaAgrupada(this.balance, this.fsas);
          } else {
            return;
          }
        }

        // PASO CLAVE: Siempre partimos de una copia FRESCA de los datos originales (vistaAgrupada)
        // Esto evita que activar/desactivar switches acumule errores o cambios.
        const copiaFresca = typeof structuredClone === 'function'
          ? structuredClone(this.vistaAgrupada)
          : JSON.parse(JSON.stringify(this.vistaAgrupada));

        // ⚠️ ORDEN CORRECTO DE TRANSFORMACIONES:
        // 1. PRIMERO: Calcular miles (sobre datos con signos originales)
        // 2. DESPUÉS: Positivizar (solo para display visual)

        this.vistaParaMostrar = copiaFresca;

        // 1. Aplicar conversión a Miles si corresponde (trabaja con signos originales)
        if (this.verEnMiles) {
          this.calcularVistaMiles();
        }

        // 2. Aplicar lógica de signos (Solo visual, después de calcular miles)
        // Si "Ver Negativos" está APAGADO (!verNegativos), aplicamos la positivización.
        if (!this.verNegativos) {
          this.vistaParaMostrar = this.eeffService.positivizarSaldosParaPreview(this.vistaParaMostrar);
        }

        // Validaciones solo informativas
        const validaciones = this.eeffService.validarEEFF(this.vistaParaMostrar);
        console.log('Validaciones tras regenerar:', validaciones);

      } catch (error) {
        console.error('Error al regenerar:', error);
      } finally {
        this.showSpinner = false;
      }
    }, 0);
  }


  abrirModalImpresion(): void {
  const modalRef = this.modalService.open(ReportConfigModal, { size: 'xl', centered: true, scrollable: true });

  modalRef.componentInstance.type = 'print';
  modalRef.componentInstance.title = 'Opciones y Previsualización de Impresión';

  // 💡 CLAVE: Pasamos la data ya procesada y la cabecera
  modalRef.componentInstance.reportData = this.vistaAgrupada;
  modalRef.componentInstance.balanceData = this.balance[0];
}

abrirModalExcel(): void {
  const modalRef = this.modalService.open(ReportConfigModal, { size: 'lg', centered: true, scrollable: true });

  modalRef.componentInstance.type = 'excel';
  modalRef.componentInstance.title = 'Opciones de Exportación Excel';

  // 💡 CLAVE: Pasamos la data ya procesada y la cabecera
  modalRef.componentInstance.reportData = this.vistaAgrupada;
  modalRef.componentInstance.balanceData = this.balance[0];
}

}
