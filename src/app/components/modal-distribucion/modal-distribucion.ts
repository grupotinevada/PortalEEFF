import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-modal-distribucion',
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-distribucion.html',
  styleUrl: './modal-distribucion.css'
})
export class ModalDistribucion implements OnInit{
  @Input() sourceAccount: any;
  @Input() destinationAccounts!: any[];
  @Input() headers!: string[];

  distributionType = 'percentage';
  distributions: { [key: string]: { value: number | null, amount: number } } = {};
  totalDistributed = 0;
  saldoKey!: string;
  codigoKey!: string;
  nombreKey!: string;

  constructor(public activeModal: NgbActiveModal) {}

  ngOnInit(): void {
    this.codigoKey = this.headers[0];
    this.nombreKey = this.headers[1];
    this.saldoKey = this.headers[2]; // 'Saldo Actual'

    this.destinationAccounts.forEach(acc => {
      this.distributions[acc[this.codigoKey]] = { value: null, amount: 0 };
    });
  }
  
  updateDistribution(): void {
    let currentTotal = 0;
    const sourceBalance = this.sourceAccount[this.saldoKey];

    this.destinationAccounts.forEach(acc => {
        const code = acc[this.codigoKey];
        const dist = this.distributions[code];
        
        if (this.distributionType === 'percentage') {
            const percentage = dist.value || 0;
            dist.amount = (sourceBalance * percentage) / 100;
        } else {
            dist.amount = dist.value || 0;
        }
        currentTotal += dist.amount;
    });

    this.totalDistributed = currentTotal;
  }

  get validationError(): string | null {
    const sourceBalance = this.sourceAccount[this.saldoKey];
    if (this.distributionType === 'percentage') {
      const totalPercentage = Object.values(this.distributions).reduce((sum: number, d: any) => sum + (d.value || 0), 0);
      if (totalPercentage > 100) {
        return 'El porcentaje total no puede superar el 100%.';
      }
    } else {
      if (Math.abs(this.totalDistributed) > Math.abs(sourceBalance)) {
        return 'El monto total distribuido no puede superar el saldo de origen.';
      }
    }
    return null;
  }

  apply(): void {
    if (this.validationError) return;

    const updates = this.destinationAccounts.map(acc => ({
      codigo: acc[this.codigoKey],
      amountToAdd: this.distributions[acc[this.codigoKey]].amount,
    }));

    this.activeModal.close({
      updates,
      totalDistributed: this.totalDistributed,
    });
  }
}