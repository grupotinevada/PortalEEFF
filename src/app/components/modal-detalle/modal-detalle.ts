import { Component, Input, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { EmpresaService } from '../../services/empresa.service';
import { BalanceService } from '../../services/balance.service';
import { Empresa } from '../../models/empresa.model';
import { IFsa } from '../../models/fsa.model';
import { IBalance } from '../../models/balance.model';

@Component({
  selector: 'app-modal-detalle',
  imports: [],
  templateUrl: './modal-detalle.html',
  styleUrl: './modal-detalle.css'
})
export class ModalDetalle implements OnInit{
  @Input() id!: number;
  @Input() empresas: Empresa[] = []
  @Input() fsas: IFsa[] = [];
  showSpinner = false;
  msgError = '';
  balance: IBalance[] = [];

  constructor(public activeModal: NgbActiveModal, private balanceService: BalanceService) {}

  ngOnInit(): void {
    console.log('ID recibido en el modal:', this.id);
    console.log('Empresas recibidas en el modal:', this.empresas);
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
    next: (data: IBalance[]) => {
      this.balance = data;
      this.showSpinner = false;
    },
    error: (err: any) => {
      console.error('Error al obtener balance:', err);
      this.msgError = 'Error al obtener el balance';
      this.showSpinner = false;
    }
  });
}

}
