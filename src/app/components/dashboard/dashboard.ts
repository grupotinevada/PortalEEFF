import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxChartsModule, Color, ScaleType } from '@swimlane/ngx-charts';
import { BalanceService } from '../../services/balance.service';
import { EEFFService } from '../../services/eeff.service';
import { IBalanceGet, IMacroCategoria } from '../../models/balance.model';
import { IFsa } from '../../models/fsa.model';
import { Spinner } from '../spinner/spinner';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgxChartsModule, Spinner],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class Dashboard implements OnInit {
  @Input() id!: string;
  @Input() fsas: IFsa[] = [];

  loading = true;
  balanceOriginal: IBalanceGet[] = [];
  vistaAgrupada: IMacroCategoria[] = [];

  // Paleta de colores unificada
  colorScheme: Color = {
    name: 'finance',
    selectable: true,
    group: ScaleType.Ordinal,
    domain: ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#0dcaf0']
  };

  composicionData: any[] = [];
  topCuentasData: any[] = [];
  ingresosGastosData: any[] = [];
  gastosData: any[] = [];

  constructor(
    public activeModal: NgbActiveModal,
    private balanceService: BalanceService,
    private eeffService: EEFFService
  ) { }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.loading = true;
    this.balanceService.getBalanceById(this.id).subscribe({
      next: (data) => {
        this.balanceOriginal = data;
        // Reutilizamos tu servicio experto para agrupar la data
        this.vistaAgrupada = this.eeffService.generarVistaAgrupada(this.balanceOriginal, this.fsas);
        this.procesarGraficos();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar balance para dashboard', err);
        this.loading = false;
      }
    });
  }

  procesarGraficos() {
    // 1. Composición Financiera (Activos, Pasivos, Patrimonio)
    const macros = ['ACTIVOS', 'PASIVOS', 'PATRIMONIO'];
    this.composicionData = this.vistaAgrupada
      .filter(m => macros.includes(m.nombre) && m.saldo !== 0)
      .map(m => ({ name: m.nombre, value: Math.abs(m.saldo) }));

    // 2. Top 5 Cuentas (Saldos absolutos)
    this.topCuentasData = this.balanceOriginal
      .filter(c => c.saldo !== 0)
      .map(c => ({ name: c.nombre, value: Math.abs(c.saldo) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Buscamos el Estado de Resultados para los gráficos 3 y 4
    const erMacro = this.vistaAgrupada.find(m => m.nombre === 'ESTADO DE RESULTADOS');
    if (erMacro) {
      const ingresosCat = erMacro.categorias.find(c => c.id_cate === 7);
      const gastosCat = erMacro.categorias.find(c => c.id_cate === 6);

      // 3. Ingresos vs Gastos
      this.ingresosGastosData = [
        { name: 'Ingresos', value: ingresosCat ? Math.abs(ingresosCat.saldo) : 0 },
        { name: 'Gastos', value: gastosCat ? Math.abs(gastosCat.saldo) : 0 }
      ].filter(x => x.value > 0);

      // 4. Distribución de Gastos (Desglose de subcategorías de Pérdidas/Gastos)
      if (gastosCat && gastosCat.subcategorias) {
        this.gastosData = gastosCat.subcategorias
          .filter(s => s.saldo !== 0)
          .map(s => ({ name: s.descripcion, value: Math.abs(s.saldo) }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6); // Limitamos a 6 para no saturar visualmente el gráfico
      }
    }
  }
}