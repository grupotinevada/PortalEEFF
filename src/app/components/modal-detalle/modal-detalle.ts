import { Component, 
         Input, 
         OnInit } from '@angular/core';

import { NgbAccordionModule, 
         NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
         
import { BalanceService } from '../../services/balance.service';
import { mapping } from '../../models/mapping.model';
import { IFsa } from '../../models/fsa.model';
import { IBalanceGet } from '../../models/balance.model';
import { Spinner } from '../spinner/spinner';

import { IVistaEEFF } from '../../models/balance.model';
import { EEFFService } from '../../services/eeff.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-detalle',
  standalone: true,
  imports: [Spinner, CommonModule, NgbAccordionModule],
  templateUrl: './modal-detalle.html',
  styleUrl: './modal-detalle.css'
})

export class ModalDetalle implements OnInit {
  @Input() id!: number;
  @Input() mappings: mapping[] = []
  @Input() fsas: IFsa[] = [];
  showSpinner = false;
  msgError = '';
  balance: IBalanceGet[] = [];

  vistaEEFF: IVistaEEFF[] = [];

  constructor(public activeModal: NgbActiveModal, private balanceService: BalanceService, private eeffService: EEFFService) { }

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
        this.agruparPorTipoDeActivo();
      },
      error: (err: any) => {
        console.error('Error al obtener balance:', err);
        this.msgError = 'Error al obtener el balance';
        this.showSpinner = false;
      }
    });
  }

  agruparPorTipoDeActivo(): void {
    if (!this.balance || !this.fsas) {
      console.error('No hay datos disponibles para agrupar.');
      return;
    }

    this.vistaEEFF = this.eeffService.agruparBalancePorCategoria(this.balance, this.fsas);
    console.log('Vista EEFF agrupada:', this.vistaEEFF);
  }

}
