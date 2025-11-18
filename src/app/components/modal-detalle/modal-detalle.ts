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

  //html previsulizacion
  previewHtml: SafeHtml | null = null;
  rawPreviewHtml: string = '';
  //VARIABLES PARA LA CONFIGURACIÓN DE IMPRESIÓN
  printConfig = {
      // Opciones: 'absoluto' (todo +), 'todo_negativo' (todo original), 'auditoria' (Balance +, ER -)
      alcanceNegativos: 'absoluto', 
      
      // Opciones: 'signo' (-100), 'parentesis' (100)
      estiloNegativo: 'signo',      
      
      mostrarFsa: true,
      
      // --- NUEVAS PROPIEDADES ---
      mostrarCuentas: false,
      incluirCuentasCero: false,
      // -------------------------

      categoriasSeleccionadas: [] as { nombre: string; selected: boolean }[]
    };
     //VARIABLES PARA LA CONFIGURACIÓN DE EXCEL
    excelConfig = {
      alcanceNegativos: 'absoluto', 
      estiloNegativo: 'signo',      
      mostrarFsa: true,
      mostrarCuentas: false,
      incluirCuentasCero: false,
      categoriasSeleccionadas: [] as { nombre: string; selected: boolean }[]
  };
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

//Abrir el modal de configuración
abrirModalImpresion(content: any): void {
    // Inicializar la lista de categorías basándonos en los datos actuales
    // Marcamos todas como 'true' por defecto
    this.printConfig.categoriasSeleccionadas = this.vistaAgrupada.map(macro => ({
      nombre: macro.nombre,
      selected: true
    }));
    this.actualizarPreview(); 
    this.modalService.open(content, { size: 'xl', centered: true, scrollable: true });
  }

  // 5. MÉTODO REFACTORIZADO: Recibe la confirmación del modal y ejecuta la impresión
  ejecutarImpresion(): void {
    // El HTML ya está generado en 'this.rawPreviewHtml' por la previsualización
    if (!this.rawPreviewHtml || this.rawPreviewHtml.length === 0) {
      Swal.fire('Error', 'No se ha podido generar la previsualización para imprimir.', 'error');
      return;
    }
    
    // Cierra el modal de configuración
    this.modalService.dismissAll();
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(this.rawPreviewHtml);
      printWindow.document.close();
      setTimeout(() => {
          printWindow.focus();
          printWindow.print();
      }, 250);
    } else {
      Swal.fire('Error', 'Por favor permite las ventanas emergentes.', 'error');
    }
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

 actualizarPreview(): void {
    
    // --- Toda la lógica de 'generarHtmlImpresion' y la parte de datos de 'ejecutarImpresion' se mueven aquí ---
    
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

    // D. FILTRO DE CATEGORÍAS
    const categoriasActivas = this.printConfig.categoriasSeleccionadas
      .filter(c => c.selected)
      .map(c => c.nombre);

    dataParaImprimir = dataParaImprimir.filter(macro => categoriasActivas.includes(macro.nombre));

    // --- MANEJO DE VISTA VACÍA ---
    if (dataParaImprimir.length === 0) {
      const noDataHtml = `<div style="padding: 20px; text-align: center; font-family: sans-serif; color: #777; margin-top: 2rem;">Selecciona al menos una categoría para ver la previsualización.</div>`;
      this.rawPreviewHtml = noDataHtml;
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(noDataHtml);
      return;
    }

    // --- A partir de aquí, es la lógica de 'generarHtmlImpresion' ---
    
    const nombreConjunto = this.balance[0]?.nombre_conjunto || 'Balance';
    const ejercicio = this.balance[0]?.ejercicio || '';
    const fechaInicio = new Date(this.balance[0]?.fecha_inicio).toLocaleDateString('es-CL');
    const fechaFin = new Date(this.balance[0]?.fecha_fin).toLocaleDateString('es-CL');
    const fechaImpresion = new Date().toLocaleString('es-CL');

    // Estilos (Asegúrate de incluir los estilos para .row-cuenta y .indent-3 de la etapa anterior)
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
        
        /* --- ESTILOS AÑADIDOS --- */
        .row-cuenta { break-inside: avoid; }
        .row-cuenta td { font-size: 10px; color: #777; background-color: #fafafa; }
        /* ---------------------- */

        .row-macro-total td { font-size: 13px; font-weight: bold; color: #000; border-top: 1px solid #000; border-bottom: 3px double #000; background-color: #f9f9f9; padding-top: 8px; padding-bottom: 8px; }
        .indent-1 { padding-left: 20px !important; }
        .indent-2 { padding-left: 40px !important; }

        /* --- INDENTACIÓN AÑADIDA --- */
        .indent-3 { padding-left: 60px !important; }
        /* --------------------------- */

        .footer { text-align: right; font-size: 9px; color: #999; margin-top: 30px; border-top: 1px solid #eee; padding-top: 5px; }
      </style>
    `;

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

    dataParaImprimir.forEach((macro) => {
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
          
          // --- LÓGICA DE CUENTAS (AÑADIDA EN EL PASO ANTERIOR) ---
          if (this.printConfig.mostrarCuentas) {
            
            // 1. Filtrar cuentas en cero si es necesario
            let cuentasParaMostrar = sub.cuentas;
            if (!this.printConfig.incluirCuentasCero) {
              cuentasParaMostrar = cuentasParaMostrar.filter(c => c.saldo !== 0);
            }

            // 2. Renderizar las filas de las cuentas
            cuentasParaMostrar.forEach(cuenta => {
              tableContent += `
                <tr class="row-cuenta">
                  <td class="indent-3">${cuenta.num_cuenta} - ${cuenta.nombre}</td>
                  <td class="text-end">${formatearNumero(cuenta.saldo)}</td>
                </tr>
              `;
            });
          }
          // --- FIN LÓGICA DE CUENTAS ---

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

    // --- ESTA ES LA PARTE NUEVA FINAL ---
    // 1. Guardar el HTML crudo para la función de impresión
    this.rawPreviewHtml = printHtml;
    
    // 2. Sanitizar y asignar el HTML para el iframe [srcdoc]
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(printHtml);
  }


    exportarCSV(): void {
    this.eeffService.exportarCSV(this.macros);
  }

  abrirModalExcel(content: any): void {
      // 1. Inicializar la lista de categorías para el modal de Excel
      this.excelConfig.categoriasSeleccionadas = this.vistaAgrupada.map(macro => ({
        nombre: macro.nombre,
        selected: true
      }));
      
      // 2. Abrir el modal
      this.modalService.open(content, { 
        size: 'lg', // 'lg' es suficiente ya que no hay preview
        centered: true, 
        scrollable: true 
      });
    }

  public exportarExcel(): void {
    this.showSpinner = true;
    
    try {
      // 1. OBTENER LOS DATOS PROCESADOS (igual que en la preview)
      // Clonamos la data base (con negativos)
      let dataProcesada: IMacroCategoria[] = typeof structuredClone === 'function' 
        ? structuredClone(this.vistaAgrupada) 
        : JSON.parse(JSON.stringify(this.vistaAgrupada));

      // Aplicamos lógica de negativos (alcance)
     dataProcesada.forEach(macro => {
        const esEstadoResultados = macro.nombre.toUpperCase().includes('RESULTADO');
        let debeSerAbsoluto = false;

        if (this.excelConfig.alcanceNegativos === 'absoluto') {
          debeSerAbsoluto = true;
        } else if (this.excelConfig.alcanceNegativos === 'auditoria') {
          if (!esEstadoResultados) debeSerAbsoluto = true;
        }
        
        if (debeSerAbsoluto) {
          this.hacerPositivoRecursivo(macro);
        }
      });

      // Aplicamos filtro de categorías
     const categoriasActivas = this.excelConfig.categoriasSeleccionadas
        .filter(c => c.selected)
        .map(c => c.nombre);
      dataProcesada = dataProcesada.filter(macro => categoriasActivas.includes(macro.nombre));
      
      // 2. CREAR LAS HOJAS
      const ws_bi = this._crearHojaPowerBI(dataProcesada, this.excelConfig); 
      const ws_design = this._crearHojaDisenoFinal(dataProcesada, this.excelConfig);

// ... (Crear libro y guardar sin cambios) ...
      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws_bi, 'Datos Power BI');
      XLSX.utils.book_append_sheet(wb, ws_design, 'Diseño Impresión');
      const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const nombreArchivo = `Balance_${this.balance[0]?.id_blce || 'Reporte'}.xlsx`;
      this._guardarArchivoExcel(excelBuffer, nombreArchivo);

    } catch (error) {
      console.error("Error al generar Excel:", error);
      Swal.fire('Error', 'No se pudo generar el archivo Excel.', 'error');
    } finally {
      this.showSpinner = false;
       // <-- Cierra el modal de Excel al terminar
    }
  }

  /**
   * [HELPER] Crea la Hoja 1: Datos planos para Power BI.
   */
 private _crearHojaPowerBI(data: IMacroCategoria[], config: any): XLSX.WorkSheet {
    const flatData: any[] = [];
    
    data.forEach(macro => {
      macro.categorias.forEach(categoria => {
        categoria.subcategorias.forEach(sub => {
          
          // --- CAMBIO: Leer de 'config' ---
          if (!config.mostrarCuentas) {
            flatData.push({
              "MacroCategoria": macro.nombre,
              "Categoria": categoria.categoria,
              "Subcategoria_FSA": sub.id_fsa,
              "Subcategoria_Desc": sub.descripcion,
              "Cuenta_Num": null,
              "Cuenta_Nombre": null,
              "Saldo": sub.saldo
            });
          } else {
            // --- CAMBIO: Leer de 'config' ---
            let cuentasParaMostrar = sub.cuentas;
            if (!config.incluirCuentasCero) {
              cuentasParaMostrar = cuentasParaMostrar.filter(c => c.saldo !== 0);
            }

            if (cuentasParaMostrar.length > 0) {
              cuentasParaMostrar.forEach(cuenta => {
                flatData.push({
                  "MacroCategoria": macro.nombre,
                  "Categoria": categoria.categoria,
                  "Subcategoria_FSA": sub.id_fsa,
                  "Subcategoria_Desc": sub.descripcion,
                  "Cuenta_Num": cuenta.num_cuenta,
                  "Cuenta_Nombre": cuenta.nombre,
                  "Saldo": cuenta.saldo
                });
              });
            } else {
               flatData.push({
                "MacroCategoria": macro.nombre,
                "Categoria": categoria.categoria,
                "Subcategoria_FSA": sub.id_fsa,
                "Subcategoria_Desc": sub.descripcion,
                "Cuenta_Num": null,
                "Cuenta_Nombre": null,
                "Saldo": sub.saldo
              });
            }
          }
        });
      });
    });
    
    return XLSX.utils.json_to_sheet(flatData);
  }

  /**
   * [HELPER] Crea la Hoja 2: Diseño similar a la impresión.
   */
 private _crearHojaDisenoFinal(data: IMacroCategoria[], config: any): XLSX.WorkSheet {
    const sheetData: any[] = [];
    
    // --- CAMBIO: Leer de 'config' ---
    const numFormat = config.estiloNegativo === 'parentesis' 
      ? '#,##0;[Red](#,##0);0' 
      : '#,##0.00;[Red]-#,##0.00;0';

    sheetData.push([
      { v: 'Concepto', s: { font: { bold: true } } }, 
      { v: 'Saldo', s: { font: { bold: true } } }
    ]);

    data.forEach(macro => {
      sheetData.push([
        { v: macro.nombre.toUpperCase(), s: { font: { bold: true } } }
      ]); 
      
      macro.categorias.forEach(categoria => {
        sheetData.push([
          { v: `  ${categoria.categoria}` },
          { v: categoria.saldo, t: 'n', z: numFormat }
        ]);
        
        categoria.subcategorias.forEach(sub => {
          // --- CAMBIO: Leer de 'config' ---
          const nombreSub = config.mostrarFsa 
            ? `${sub.id_fsa} - ${sub.descripcion}` 
            : sub.descripcion;
          sheetData.push([
            { v: `    ${nombreSub}` },
            { v: sub.saldo, t: 'n', z: numFormat }
          ]);
          
          // --- CAMBIO: Leer de 'config' ---
          if (config.mostrarCuentas) {
            let cuentasParaMostrar = sub.cuentas;
            // --- CAMBIO: Leer de 'config' ---
            if (!config.incluirCuentasCero) {
              cuentasParaMostrar = cuentasParaMostrar.filter(c => c.saldo !== 0);
            }
            cuentasParaMostrar.forEach(cuenta => {
              sheetData.push([
                { v: `      ${cuenta.num_cuenta} - ${cuenta.nombre}` },
                { v: cuenta.saldo, t: 'n', z: numFormat }
              ]);
            });
          }
        });
      });
      
      sheetData.push([
        { v: `  TOTAL ${macro.nombre.toUpperCase()}`, s: { font: { bold: true } } },
        { v: macro.saldo, t: 'n', z: numFormat, s: { font: { bold: true } } }
      ]);
      sheetData.push([]); 
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [ { wch: 70 }, { wch: 20 } ];
    return ws;
  }

    private _guardarArchivoExcel(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-g'
    });
    saveAs(data, fileName);
  }

}
