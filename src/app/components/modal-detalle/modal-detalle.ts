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
//VARIABLES PARA LA CONFIGURACIÓN DE IMPRESIÓN
printConfig = {
    // Opciones: 'absoluto' (todo +), 'todo_negativo' (todo original), 'auditoria' (Balance +, ER -)
    alcanceNegativos: 'absoluto', 
    
    // Opciones: 'signo' (-100), 'parentesis' (100)
    estiloNegativo: 'signo',      
    
    mostrarFsa: true,
    categoriasSeleccionadas: [] as { nombre: string; selected: boolean }[]
  };
  constructor(
    public activeModal: NgbActiveModal,
    private balanceService: BalanceService,
    private eeffService: EEFFService,
    private modalService: NgbModal,
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

//Abrir el modal de configuración
abrirModalImpresion(content: any): void {
    // Inicializar la lista de categorías basándonos en los datos actuales
    // Marcamos todas como 'true' por defecto
    this.printConfig.categoriasSeleccionadas = this.vistaAgrupada.map(macro => ({
      nombre: macro.nombre,
      selected: true
    }));

    this.modalService.open(content, { size: 'm', centered: true });
  }

  // 5. MÉTODO REFACTORIZADO: Recibe la confirmación del modal y ejecuta la impresión
ejecutarImpresion(): void {
    this.modalService.dismissAll();

    // A. Clonado Profundo (Base siempre con negativos originales)
    let dataParaImprimir: IMacroCategoria[] = typeof structuredClone === 'function' 
      ? structuredClone(this.vistaAgrupada) 
      : JSON.parse(JSON.stringify(this.vistaAgrupada));

    // B. APLICAR LÓGICA DE ALCANCE (¿Qué convertimos a positivo?)
    dataParaImprimir.forEach(macro => {
      // Detectamos si es Estado de Resultados (ajusta este string según tus datos exactos)
      const esEstadoResultados = macro.nombre.toUpperCase().includes('RESULTADO') || 
                                 macro.nombre.toUpperCase().includes('GANANCIA') ||
                                 macro.nombre.toUpperCase().includes('PERDIDA');

      // Lógica de decisión
      let debeSerAbsoluto = false;

      if (this.printConfig.alcanceNegativos === 'absoluto') {
        debeSerAbsoluto = true; // Todo positivo
      } else if (this.printConfig.alcanceNegativos === 'auditoria') {
        // En auditoría: Balance (Act/Pas) es absoluto, ER mantiene signo
        if (!esEstadoResultados) {
          debeSerAbsoluto = true;
        }
      }
      // Si es 'todo_negativo', debeSerAbsoluto se queda en false

      // C. Aplicar transformación si corresponde
      if (debeSerAbsoluto) {
        this.hacerPositivoRecursivo(macro);
      }
    });

    // D. FILTRO DE CATEGORÍAS (Igual que antes)
    const categoriasActivas = this.printConfig.categoriasSeleccionadas
      .filter(c => c.selected)
      .map(c => c.nombre);

    dataParaImprimir = dataParaImprimir.filter(macro => categoriasActivas.includes(macro.nombre));

    if (dataParaImprimir.length === 0) {
      Swal.fire('Atención', 'Debes seleccionar al menos una categoría.', 'warning');
      return;
    }

    this.generarHtmlImpresion(dataParaImprimir);
  }

// Helper para convertir todo un árbol a positivo
  private hacerPositivoRecursivo(item: any) {
    if (item.saldo) item.saldo = Math.abs(item.saldo);
    
    // Navegar hacia abajo
    if (item.categorias) {
      item.categorias.forEach((cat: any) => this.hacerPositivoRecursivo(cat));
    }
    if (item.subcategorias) {
      item.subcategorias.forEach((sub: any) => this.hacerPositivoRecursivo(sub));
    }
  }

private generarHtmlImpresion(data: IMacroCategoria[]): void {
    const nombreConjunto = this.balance[0]?.nombre_conjunto || 'Balance';
    const ejercicio = this.balance[0]?.ejercicio || '';
    const fechaInicio = new Date(this.balance[0]?.fecha_inicio).toLocaleDateString('es-CL');
    const fechaFin = new Date(this.balance[0]?.fecha_fin).toLocaleDateString('es-CL');
    const fechaImpresion = new Date().toLocaleString('es-CL');

    // MANTENEMOS TUS ESTILOS CSS EXACTOS (incluyendo paginación)
    const styles = `
      <style>
        body { margin: 20px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; -webkit-print-color-adjust: exact; }
        .report-header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 10px; }
        .report-header h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
        .report-header p { margin: 2px 0; font-size: 12px; color: #555; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        tbody.macro-group { break-inside: avoid; page-break-inside: avoid; display: table-row-group; border-bottom: 15px solid transparent; }
        thead th { background-color: #f0f0f0; border-bottom: 2px solid #000; text-transform: uppercase; font-size: 10px; padding: 8px; position: relative; }
        th, td { padding: 5px 8px; vertical-align: middle; }
        .text-end { text-align: right; }
        .row-macro-header td { font-size: 13px; font-weight: 800; color: #000; text-transform: uppercase; padding-top: 10px; border-bottom: 1px solid #ccc; }
        .row-categoria td { font-weight: 600; color: #333; }
        .row-subcategoria td { font-style: italic; color: #555; }
        .row-macro-total td { font-size: 13px; font-weight: bold; color: #000; border-top: 1px solid #000; border-bottom: 3px double #000; background-color: #f9f9f9; padding-top: 8px; padding-bottom: 8px; }
        .indent-1 { padding-left: 20px !important; }
        .indent-2 { padding-left: 40px !important; }
        .footer { text-align: right; font-size: 9px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 5px; }
      </style>
    `;

    // --- NUEVO HELPER DE FORMATEO VISUAL ---
    const formatearNumero = (valor: number): string => {
      if (typeof valor !== 'number') return '0'; // Seguridad
      
      const esNegativo = valor < 0;
      const valorAbsoluto = Math.abs(valor);
      const numeroString = new Intl.NumberFormat('es-CL').format(valorAbsoluto);

      if (esNegativo) {
        if (this.printConfig.estiloNegativo === 'parentesis') {
          return `<span style="color: red;">(${numeroString})</span>`; // Opcional: con color rojo
        } else {
          return `-${numeroString}`;
        }
      }
      return numeroString;
    };

    let tableContent = '';

    data.forEach((macro) => {
      tableContent += `<tbody class="macro-group">`;
      tableContent += `<tr class="row-macro-header"><td colspan="2">${macro.nombre.toUpperCase()}</td></tr>`;

      macro.categorias.forEach((grupo) => {
        tableContent += `
          <tr class="row-categoria">
            <td class="indent-1">${grupo.categoria}</td>
            <td class="text-end">${formatearNumero(grupo.saldo)}</td>
          </tr>
        `;
        grupo.subcategorias.forEach((sub) => {
          const nombreCuenta = this.printConfig.mostrarFsa 
            ? `${sub.id_fsa} - ${sub.descripcion}` 
            : sub.descripcion;
          tableContent += `
            <tr class="row-subcategoria">
              <td class="indent-2">${nombreCuenta}</td>
              <td class="text-end">${formatearNumero(sub.saldo)}</td>
            </tr>
          `;
        });
      });

      tableContent += `
        <tr class="row-macro-total">
          <td class="indent-1">TOTAL ${macro.nombre.toUpperCase()}</td>
          <td class="text-end">${formatearNumero(macro.saldo)}</td>
        </tr>
      `;
      tableContent += `</tbody>`;
    });

    const printHtml = `
      <html>
        <head>
          <title>EEFF - ${nombreConjunto}</title>
          ${styles}
        </head>
        <body>
          <div class="report-header">
            <h1>Estado de Resultados</h1>
            <p><strong>${nombreConjunto}</strong></p>
            <p>Ejercicio: ${ejercicio} | Del ${fechaInicio} al ${fechaFin}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:left;">Concepto</th>
                <th class="text-end" style="width: 150px;">Saldo ($)</th>
              </tr>
            </thead>
            ${tableContent}
          </table>
          <div class="footer"><p>Generado el: ${fechaImpresion}</p></div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtml);
      printWindow.document.close();
      setTimeout(() => {
          printWindow.focus();
          printWindow.print();
      }, 250);
    } else {
      Swal.fire('Error', 'Por favor permite las ventanas emergentes.', 'error');
    }
  }


    exportarCSV(): void {
    this.eeffService.exportarCSV(this.macros);
  }

}
