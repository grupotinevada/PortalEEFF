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

@Component({
  selector: 'app-modal-detalle',
  standalone: true,
  imports: [Spinner, CommonModule, NgbAccordionModule, FormsModule],
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
  negativos = false;

  macros: IMacroCategoria[] = [];

  vistaAgrupada: IMacroCategoria[] = [];
  vistaParaMostrar: IMacroCategoria[] = [];

  
  constructor(
    public activeModal: NgbActiveModal,
    private balanceService: BalanceService,
    private eeffService: EEFFService,
    private modalService: NgbModal,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    console.log('ID recibido en el modal:', this.id);
    console.log('Mappings recibidas en el modal:', this.mappings);
    console.log('FSAs recibidas en el modal:', this.fsas);

    
    this.getBalance(this.id.toString());


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

  mostrarNegativos(): void {
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
        console.error('No hay datos disponibles para reagrupar.');
        return;
      }

      // 1. Recalcular vista agrupada
      this.vistaAgrupada = this.eeffService.generarVistaAgrupada(
        this.balance,
        this.fsas
      );
      console.log('Vista Regenerada:', this.vistaAgrupada);

      // 2. Actualizar macros (igual que en agruparVista)
      this.macros = this.vistaAgrupada;

      // 3. Construir vista para mostrar (con saldos positivizados si corresponde)
      const copiaParaPositivizar = typeof structuredClone === 'function'
        ? structuredClone(this.vistaAgrupada)
        : JSON.parse(JSON.stringify(this.vistaAgrupada));

      // 3. Ahora positivizamos la COPIA. 'this.vistaAgrupada' queda intacta.
      this.vistaParaMostrar = this.eeffService.positivizarSaldosParaPreview(copiaParaPositivizar);

      // 4. Validaciones sobre la vista "para mostrar"
      const validaciones = this.eeffService.validarEEFF(this.vistaParaMostrar);
      console.log('Validaciones EEFF tras regenerar:', validaciones);

    } catch (error) {
      console.error('Ocurrió un error al regenerar la vista:', error);
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
