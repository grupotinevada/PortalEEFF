import { Component, 
         Input, 
         OnInit } from '@angular/core';

import { NgbAccordionModule, 
         NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
         
import { BalanceService } from '../../services/balance.service';
import { mapping } from '../../models/mapping.model';
import { IFsa } from '../../models/fsa.model';
import { IBalanceGet, IMacroCategoria } from '../../models/balance.model';
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

  vistaAgrupada: IMacroCategoria[] = [];

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
        this.agruparVista();
      },
      error: (err: any) => {
        console.error('Error al obtener balance:', err);
        this.msgError = 'Error al obtener el balance';
        this.showSpinner = false;
      }
    });
  }

  agruparVista(): void {
    if (!this.balance || !this.fsas) {
      console.error('No hay datos disponibles para agrupar.');
      return;
    }
    this.vistaAgrupada = this.eeffService.generarVistaAgrupada(this.balance, this.fsas);
    console.log('Vista Agrupada Final:', this.vistaAgrupada);
  }

imprimirEEFF(): void {
  // 1. Extraer información para el encabezado (sin cambios)
  const nombreConjunto = this.balance[0]?.nombre_conjunto || 'Balance';
  const ejercicio = this.balance[0]?.ejercicio || '';
  const fechaInicio = new Date(this.balance[0]?.fecha_inicio).toLocaleDateString('es-CL');
  const fechaFin = new Date(this.balance[0]?.fecha_fin).toLocaleDateString('es-CL');
  const fechaImpresion = new Date().toLocaleString('es-CL');

  // 2. Definir los estilos CSS para la impresión (REFINADOS)
  const styles = `
    <style>
      body {
        margin: 20px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #333;
      }
      .report-header {
        text-align: center;
        margin-bottom: 25px;
        border-bottom: 2px solid #000;
        padding-bottom: 10px;
      }
      .report-header h1 { margin: 0; font-size: 24px; }
      .report-header p { margin: 4px 0; font-size: 14px; color: #555; }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      th, td {
        padding: 8px 10px;
        border-bottom: 1px solid #eee; /* Borde de fila más sutil */
        text-align: left;
      }
      th {
        background-color: #f8f9fa;
        font-weight: 600;
        border-bottom: 2px solid #dee2e6;
      }
      .text-end { text-align: right; }
      
      /* ESTILOS DE FILA REFINADOS */
      .row-macro-header {
        font-size: 14px;
        font-weight: bold;
        color: #000;
        text-transform: uppercase;
        /* Se elimina el color de fondo para un look más limpio */
        border-top: 1.5px solid #333;
        border-bottom: 1.5px solid #333;
      }
      .row-categoria {
        /* Se elimina el color de fondo, la negrita es suficiente */
        font-weight: bold;
      }
      .row-subcategoria {
        /* El estilo itálico se mantiene para la descripción */
        font-style: italic;
        color: #555;
      }
      .row-macro-total {
        background-color: #28a745;
        color: white;
        font-size: 14px;
        font-weight: bold;
        border-top: 2px solid #208336; /* Línea superior fuerte para separar */
      }
      .indent-1 { padding-left: 25px !important; }
      .indent-2 { padding-left: 50px !important; }
      .footer {
        text-align: right;
        font-size: 10px;
        color: #777;
        margin-top: 20px;
      }
    </style>
  `;

  // 3. Construir el cuerpo de la tabla (con .toUpperCase() para coherencia)
  let tableBody = '';
  this.vistaAgrupada.forEach(macro => {
    // Fila de encabezado para la macro categoría
    tableBody += `
      <tr class="row-macro-header">
        <td colspan="2">${macro.nombre.toUpperCase()}</td>
      </tr>
    `;

    // Filas de categorías y subcategorías
    macro.categorias.forEach(grupo => {
      tableBody += `
        <tr class="row-categoria">
          <td class="indent-1">${grupo.categoria}</td>
          <td class="text-end">${new Intl.NumberFormat('es-CL').format(grupo.saldo)}</td>
        </tr>
      `;
      grupo.subcategorias.forEach(sub => {
        tableBody += `
          <tr class="row-subcategoria">
            <td class="indent-2">${sub.id_fsa} - ${sub.descripcion}</td>
            <td class="text-end">${new Intl.NumberFormat('es-CL').format(sub.saldo)}</td>
          </tr>
        `;
      });
    });

    // Fila del total al final de la sección
    tableBody += `
      <tr class="row-macro-total">
        <td>TOTAL ${macro.nombre.toUpperCase()}</td>
        <td class="text-end">${new Intl.NumberFormat('es-CL').format(macro.saldo)}</td>
      </tr>
    `;
  });

  // 4. Ensamblar el HTML completo (sin cambios)
  const printHtml = `
    <html>
      <head>
        <title>Reporte - ${nombreConjunto}</title>
        ${styles}
      </head>
      <body>
        <div class="report-header">
          <h1>${nombreConjunto}</h1>
          <p>Ejercicio: ${ejercicio}</p>
          <p>Período del ${fechaInicio} al ${fechaFin}</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Descripción</th>
              <th class="text-end">Saldo ($)</th>
            </tr>
          </thead>
          <tbody>
            ${tableBody}
          </tbody>
        </table>
        <div class="footer">
          <p>Impreso el: ${fechaImpresion}</p>
        </div>
      </body>
    </html>
  `;

  // 5. Abrir la ventana de impresión (sin cambios)
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  } else {
    alert('Por favor, permite las ventanas emergentes para imprimir el reporte.');
  }
}
}
