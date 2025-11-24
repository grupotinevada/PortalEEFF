import { Component, Input, OnInit } from '@angular/core';
import { BalanceResumen, IMacroCategoriaComparativa } from '../../models/balance.model';
import { NgbAccordionModule, NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CurrencyPipe } from '@angular/common';
import { Spinner } from '../spinner/spinner';
import { ReportConfigModal } from '../report-config-modal/report-config-modal';

@Component({
  selector: 'app-modal-comparativo',
  imports: [NgbAccordionModule, Spinner, CurrencyPipe],
  templateUrl: './modal-comparativo.html',
  styleUrl: './modal-comparativo.css',
})
export class ModalComparativo implements OnInit {
  
  @Input() vistaComparativa: IMacroCategoriaComparativa[] = [];
  @Input() balanceActual: BalanceResumen | null = null;
  @Input() balanceAnterior: BalanceResumen | null = null;

  showSpinner = false;

  constructor(
    public activeModal: NgbActiveModal,
    private modalService: NgbModal
  ) {}

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
}
