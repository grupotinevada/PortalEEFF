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
      if (this.verEnMiles) {
        this.calcularVistaMiles();
      }
    }

    /**
   * Algoritmo principal de Cuadratura en Cascada (Waterfall).
   * 1. Calcula el objetivo del padre (Redondeo puro).
   * 2. Calcula la suma de los hijos redondeados.
   * 3. Detecta la diferencia (Delta).
   * 4. Asigna la diferencia al hijo con mayor saldo absoluto para minimizar impacto visual.
   * 5. Propaga la lógica hacia abajo (Recursividad).
   */
  calcularVistaMiles(): void {
    // 1. Nivel Raíz: Macros
    this.vistaParaMostrar.forEach(macro => {
      // Paso A: Establecer la "Verdad" del Macro (Redondeo matemático estándar)
      macro.saldoMiles = Math.round(macro.saldo / 1000);

      // Paso B: Ajustar sus hijos (Categorías) para que sumen exactamente 'macro.saldoMiles'
      this.distribuirAjuste(macro, macro.categorias);

      // Paso C: Profundizar en la jerarquía
      macro.categorias.forEach(cat => {
        // Ajustar Subcategorías para que sumen lo que se definió en 'cat.saldoMiles'
        this.distribuirAjuste(cat, cat.subcategorias);

        cat.subcategorias.forEach(sub => {
          // Ajustar Cuentas para que sumen lo que se definió en 'sub.saldoMiles'
          this.distribuirAjuste(sub, sub.cuentas);
        });
      });
    });
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
  private distribuirAjuste(padre: any, hijos: any[]): void {
    if (!hijos || hijos.length === 0) return;

    // 1. Calcular redondeo inicial para todos los hijos
    let sumaHijos = 0;
    hijos.forEach(hijo => {
      hijo.saldoMiles = Math.round(hijo.saldo / 1000);
      sumaHijos += hijo.saldoMiles;
    });

    // 2. Detectar el "Delta" (Lo que sobra o falta para llegar al padre)
    // Ejemplo: Padre=10, SumaHijos=9 -> Diff=1 (Falta 1)
    // Ejemplo: Padre=10, SumaHijos=11 -> Diff=-1 (Sobra 1)
    let diferencia = padre.saldoMiles - sumaHijos;

    // 3. Si hay diferencia, aplicarla al hijo con mayor peso (Estrategia de menor impacto visual)
    if (diferencia !== 0) {
      // Buscamos el hijo con mayor saldo absoluto (el "más grande")
      // Esto simula el "azar" pero de forma inteligente para no distorsionar cuentas pequeñas.
      const hijoCandidato = hijos.reduce((prev, current) => 
        (Math.abs(current.saldo) > Math.abs(prev.saldo) ? current : prev)
      );
      
      // Le inyectamos la diferencia
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
    setTimeout(() => {
      try {
        if (!this.balance || !this.fsas) {
          return;
        }
        this.vistaAgrupada = this.eeffService.generarVistaAgrupada(
          this.balance,
          this.fsas
        );
        this.macros = this.vistaAgrupada;
        const copiaParaVista = typeof structuredClone === 'function'
          ? structuredClone(this.vistaAgrupada)
          : JSON.parse(JSON.stringify(this.vistaAgrupada));
        if (!this.verNegativos) {
          this.vistaParaMostrar = this.eeffService.positivizarSaldosParaPreview(copiaParaVista);
        } else {
          this.vistaParaMostrar = copiaParaVista;
        }
        if (this.verEnMiles) {
          this.calcularVistaMiles();
        }
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
