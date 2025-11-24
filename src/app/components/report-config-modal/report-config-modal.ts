import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { IReportConfig } from '../../models/report-config-modal';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { BalanceService } from '../../services/balance.service';
import { EEFFService } from '../../services/eeff.service';
import Swal from 'sweetalert2';
import { IBalanceGet, IMacroCategoria, IMacroCategoriaComparativa } from '../../models/balance.model';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-report-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule,TooltipModule],
  templateUrl: './report-config-modal.html',
  styles: []
})

export class ReportConfigModal implements OnInit {

  // PROPIEDADES INICIALES (Inputs del Padre)
  @Input() type: 'print' | 'excel' = 'print';
  @Input() title: string = '';
  @Input() reportData: IMacroCategoria[] = []; // Data agrupada con saldos originales
  @Input() balanceData!: IBalanceGet; // Data de cabecera
  // --- MODO COMPARATIVO ---
  @Input() mode: 'standard' | 'comparative' = 'standard';
  @Input() comparativeData: IMacroCategoriaComparativa[] = [];
  @Input() balanceAnteriorData!: IBalanceGet;


  // html previsulizacion
  previewHtml: SafeHtml | null = null;
  rawPreviewHtml: string = '';
  showSpinner = false; 

  // 💡 PROPIEDAD DE CONFIGURACIÓN ÚNICA (Reemplaza a printConfig y excelConfig)
  config: IReportConfig = {
      // Opciones: 'absoluto' (todo +), 'todo_negativo' (todo original), 'auditoria' (Balance +, ER -)
      alcanceNegativos: 'absoluto', 
      // Opciones: 'signo' (-100), 'parentesis' (100)
      estiloNegativo: 'signo',      
      mostrarFsa: true,
      mostrarCuentas: false,
      incluirCuentasCero: false,
      categoriasSeleccionadas: [] as { nombre: string; selected: boolean }[]
  };

constructor(
    public activeModal: NgbActiveModal, // Para cerrar el modal
    private sanitizer: DomSanitizer // Para la previsualización
  ){
  }

ngOnInit(): void {
  // 1. Inicializar categorías según el modo
  if (this.mode === 'standard') {
      if (this.reportData && this.reportData.length > 0) {
          this.config.categoriasSeleccionadas = this.reportData.map(macro => ({
              nombre: macro.nombre,
              selected: true
          }));
      }
  } else {
      // MODO COMPARATIVO
      if (this.comparativeData && this.comparativeData.length > 0) {
          this.config.categoriasSeleccionadas = this.comparativeData.map(macro => ({
              nombre: macro.nombre,
              selected: true
          }));
      }
      // Forzamos ver negativos reales, ya que en variaciones el signo es vital
      this.config.alcanceNegativos = 'todo_negativo';
  }
  
  // Generar preview inicial si es modal de impresión
  if (this.type === 'print') {
      this.actualizarPreview();
  }
}

  // --- GETTERS PARA HTML ---
  get themeClass(): string {
    return this.type === 'print' ? 'success' : 'primary';
  }

  get btnConfirmClass(): string {
    return this.type === 'print' ? 'btn-success' : 'btn-teal'; 
  }

  // 💡 Llama a generar preview si estamos en modo impresión
  emitChange(): void {
    if (this.type === 'print') {
        this.actualizarPreview();
    }
  }

  // 💡Ejecuta la acción final y cierra el modal
confirm(): void {
  if (this.type === 'print') {
      this.ejecutarImpresion();
  } else {
      // Derivar según el modo
      if (this.mode === 'standard') {
          this.exportarExcel();
      } else {
          this._exportarExcelComparativo();
      }
  }
  this.activeModal.close(); 
}
  
ejecutarImpresion(): void {
    if (!this.rawPreviewHtml || this.rawPreviewHtml.length === 0) {
      Swal.fire('Error', 'No se ha podido generar la previsualización para imprimir.', 'error');
      return;
    }
    
    // Ya no se necesita this.modalService.dismissAll();
    
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
  if (this.mode === 'comparative') {
      this._generarPreviewComparativo();
      return;
  }
    if (this.reportData.length === 0) return; // Validación básica

    // A. Clonado Profundo (Base siempre con negativos originales)
    let dataParaImprimir: IMacroCategoria[] = JSON.parse(JSON.stringify(this.reportData));

    // B. APLICAR LÓGICA DE ALCANCE (¿Qué convertimos a positivo?)
    dataParaImprimir.forEach(macro => {
      const esEstadoResultados = macro.nombre.toUpperCase().includes('RESULTADO') || 
                                 macro.nombre.toUpperCase().includes('GANANCIA') ||
                                 macro.nombre.toUpperCase().includes('PERDIDA');

      let debeSerAbsoluto = false;

      if (this.config.alcanceNegativos === 'absoluto') {
        debeSerAbsoluto = true;
      } else if (this.config.alcanceNegativos === 'auditoria') {
        if (!esEstadoResultados) debeSerAbsoluto = true;
      }

      if (debeSerAbsoluto) {
        this.hacerPositivoRecursivo(macro);
      }
    });

    // C. FILTRO DE CATEGORÍAS
    const categoriasActivas = this.config.categoriasSeleccionadas
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

    // D. Lógica de 'generarHtmlImpresion' (Adaptada para usar this.balanceData y this.config)
    
    // 💡 Reemplazo de this.balance[0] por this.balanceData
    const nombreConjunto = this.balanceData?.nombre_conjunto || 'Balance';
    const ejercicio = this.balanceData?.ejercicio || '';
    const fechaInicio = new Date(this.balanceData?.fecha_inicio).toLocaleDateString('es-CL');
    const fechaFin = new Date(this.balanceData?.fecha_fin).toLocaleDateString('es-CL');
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
      if (typeof valor !== 'number') return '0';
      
      const esNegativo = valor < 0;
      const valorAbsoluto = Math.abs(valor);
      const numeroString = new Intl.NumberFormat('es-CL').format(valorAbsoluto);

      if (esNegativo) {
        if (this.config.estiloNegativo === 'parentesis') {
          return `<span style="color: red;">(${numeroString})</span>`; 
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
          const nombreCuenta = this.config.mostrarFsa 
            ? `${sub.id_fsa} - ${sub.descripcion}` 
            : sub.descripcion;
          tableContent += `
            <tr class="row-subcategoria">
              <td class="indent-2">${nombreCuenta}</td>
              <td class="text-end">${formatearNumero(sub.saldo)}</td>
            </tr>
          `;
          
          if (this.config.mostrarCuentas) {
            let cuentasParaMostrar = sub.cuentas;
            if (!this.config.incluirCuentasCero) {
              cuentasParaMostrar = cuentasParaMostrar.filter(c => c.saldo !== 0);
            }

            cuentasParaMostrar.forEach(cuenta => {
              tableContent += `
                <tr class="row-cuenta">
                  <td class="indent-3">${cuenta.num_cuenta} - ${cuenta.nombre}</td>
                  <td class="text-end">${formatearNumero(cuenta.saldo)}</td>
                </tr>
              `;
            });
          }
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

    this.rawPreviewHtml = printHtml;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(printHtml);
  }




  public exportarExcel(): void {
    this.showSpinner = true;
    
    try {
      // 1. OBTENER LOS DATOS PROCESADOS
      // Clonamos la data base (con negativos)
      let dataProcesada: IMacroCategoria[] = JSON.parse(JSON.stringify(this.reportData));

      // Aplicamos lógica de negativos (alcance)
     dataProcesada.forEach(macro => {
        const esEstadoResultados = macro.nombre.toUpperCase().includes('RESULTADO');
        let debeSerAbsoluto = false;

        if (this.config.alcanceNegativos === 'absoluto') {
          debeSerAbsoluto = true;
        } else if (this.config.alcanceNegativos === 'auditoria') {
          if (!esEstadoResultados) debeSerAbsoluto = true;
        }
        
        if (debeSerAbsoluto) {
          this.hacerPositivoRecursivo(macro);
        }
      });

      // Aplicamos filtro de categorías
     const categoriasActivas = this.config.categoriasSeleccionadas
        .filter(c => c.selected)
        .map(c => c.nombre);
      dataProcesada = dataProcesada.filter(macro => categoriasActivas.includes(macro.nombre));
      
      // 2. CREAR LAS HOJAS
      // 💡 Reemplazo de this.excelConfig por this.config
      const ws_bi = this._crearHojaPowerBI(dataProcesada, this.config); 
      const ws_design = this._crearHojaDisenoFinal(dataProcesada, this.config);

      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws_bi, 'Datos Power BI');
      XLSX.utils.book_append_sheet(wb, ws_design, 'Diseño Impresión');
      const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      // 💡 Reemplazo de this.balance[0] por this.balanceData
      const nombreArchivo = `Balance_${this.balanceData?.id_blce || 'Reporte'}.xlsx`;
      this._guardarArchivoExcel(excelBuffer, nombreArchivo);

    } catch (error) {
      console.error("Error al generar Excel:", error);
      Swal.fire('Error', 'No se pudo generar el archivo Excel.', 'error');
    } finally {
      this.showSpinner = false;
      // Ya no se necesita modalService.dismissAll();
    }
  }

  /**
   * [HELPER] Crea la Hoja 1: Datos planos para Power BI.
   */
 private _crearHojaPowerBI(data: IMacroCategoria[], config: IReportConfig): XLSX.WorkSheet {
    const flatData: any[] = [];
    
    data.forEach(macro => {
      macro.categorias.forEach(categoria => {
        categoria.subcategorias.forEach(sub => {
          
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
 private _crearHojaDisenoFinal(data: IMacroCategoria[], config: IReportConfig): XLSX.WorkSheet {
    const sheetData: any[] = [];
    
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
          const nombreSub = config.mostrarFsa 
            ? `${sub.id_fsa} - ${sub.descripcion}` 
            : sub.descripcion;
          sheetData.push([
            { v: `    ${nombreSub}` },
            { v: sub.saldo, t: 'n', z: numFormat }
          ]);
          
          if (config.mostrarCuentas) {
            let cuentasParaMostrar = sub.cuentas;
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

  // ==========================================
// 🔄 LÓGICA COMPARATIVA (NUEVA)
// ==========================================

private _generarPreviewComparativo(): void {
  // 1. Filtrar categorías
  const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
  const dataFiltrada = this.comparativeData.filter(m => categoriasActivas.includes(m.nombre));

  if (dataFiltrada.length === 0) {
      const noDataHtml = `<div style="padding: 20px; text-align: center; color: #777;">Sin datos para mostrar.</div>`;
      this.rawPreviewHtml = noDataHtml;
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(noDataHtml);
      return;
  }

  // 2. Helpers de formato
  const fmt = (val: number) => new Intl.NumberFormat('es-CL').format(Math.round(val));
  const fmtVar = (val: number) => {
      if (Math.abs(val) > 9999) return '>>';
      return `${val > 0 ? '+' : ''}${val.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;
  };
  const colorVar = (val: number) => val > 0 ? 'color:#198754' : (val < 0 ? 'color:#dc3545' : 'color:#666');

  // 3. Estilos
  const styles = `
    <style>
      body { font-family: 'Segoe UI', sans-serif; font-size: 11px; margin: 20px; color: #333; }
      .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #198754; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background-color: #f0f0f0; border-bottom: 1px solid #999; padding: 6px; text-transform: uppercase; font-size: 10px; }
      td { padding: 5px; border-bottom: 1px solid #eee; vertical-align: middle; }
      .text-end { text-align: right; }
      .bg-macro { background-color: #e8f5e9; font-weight: bold; font-size: 12px; }
      .bg-cat { background-color: #f8f9fa; font-weight: 600; }
      .indent-1 { padding-left: 20px; font-style: italic; }
      .indent-2 { padding-left: 40px; color: #666; font-size: 10px; }
    </style>
  `;

  let rows = '';

  dataFiltrada.forEach(macro => {
      // Macro
      rows += `<tr class="bg-macro">
          <td>${macro.nombre}</td>
          <td class="text-end">${fmt(macro.saldo)}</td>
          <td class="text-end text-muted">${fmt(macro.saldoAnterior)}</td>
          <td class="text-end">${fmt(macro.diferencia)}</td>
          <td class="text-end" style="${colorVar(macro.variacion)}">${fmtVar(macro.variacion)}</td>
      </tr>`;

      macro.categorias.forEach(cat => {
          // Categoría
          rows += `<tr class="bg-cat">
              <td style="padding-left:15px;">${cat.categoria}</td>
              <td class="text-end">${fmt(cat.saldo)}</td>
              <td class="text-end text-muted">${fmt(cat.saldoAnterior)}</td>
              <td class="text-end">${fmt(cat.diferencia)}</td>
              <td class="text-end" style="${colorVar(cat.variacion)}">${fmtVar(cat.variacion)}</td>
          </tr>`;
          
          cat.subcategorias.forEach(sub => {
              // Subcategoría
              const nombreSub = this.config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;
              rows += `<tr>
                  <td class="indent-1">${nombreSub}</td>
                  <td class="text-end">${fmt(sub.saldo)}</td>
                  <td class="text-end text-muted">${fmt(sub.saldoAnterior)}</td>
                  <td class="text-end">${fmt(sub.diferencia)}</td>
                  <td class="text-end" style="${colorVar(sub.variacion)}">${fmtVar(sub.variacion)}</td>
              </tr>`;

              // Cuentas
              if (this.config.mostrarCuentas) {
                  sub.cuentas.forEach(cta => {
                      // Filtro de ceros si aplica (si ambos son 0, se oculta)
                      if (!this.config.incluirCuentasCero && cta.saldo === 0 && cta.saldoAnterior === 0) return;
                      
                      rows += `<tr>
                          <td class="indent-2">${cta.num_cuenta} - ${cta.nombre}</td>
                          <td class="text-end" style="font-size:10px;">${fmt(cta.saldo)}</td>
                          <td class="text-end text-muted" style="font-size:10px;">${fmt(cta.saldoAnterior)}</td>
                          <td class="text-end" style="font-size:10px;">${fmt(cta.diferencia)}</td>
                          <td class="text-end" style="font-size:10px; ${colorVar(cta.variacion)}">${fmtVar(cta.variacion)}</td>
                      </tr>`;
                  });
              }
          });
      });
  });

  const printHtml = `
    <html>
      <head><title>Comparativo</title>${styles}</head>
      <body>
        <div class="header">
          <h2>Comparativo Estados Financieros</h2>
          <p>${this.balanceData?.empresaDesc || ''}</p>
          <p>Comparando: <strong>${this.balanceData?.ejercicio}</strong> vs <strong>${this.balanceAnteriorData?.ejercicio || 'Anterior'}</strong></p>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align:left">Concepto</th>
              <th class="text-end">${this.balanceData?.ejercicio}</th>
              <th class="text-end">${this.balanceAnteriorData?.ejercicio}</th>
              <th class="text-end">Dif ($)</th>
              <th class="text-end">Var (%)</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px; font-size:9px; color:#999; text-align:right;">Generado: ${new Date().toLocaleString('es-CL')}</div>
      </body>
    </html>
  `;
  
  this.rawPreviewHtml = printHtml;
  this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(printHtml);
}

private _exportarExcelComparativo(): void {
  this.showSpinner = true;
  try {
    const dataRows: any[] = [];
    const anioActual = this.balanceData?.ejercicio || 'Actual';
    const anioAnt = this.balanceAnteriorData?.ejercicio || 'Anterior';

    // Encabezados
    dataRows.push(['Concepto', 'Tipo', `Saldo ${anioActual}`, `Saldo ${anioAnt}`, 'Diferencia $', 'Variación %']);

    // Filtro de categorías
    const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
    const dataFiltrada = this.comparativeData.filter(m => categoriasActivas.includes(m.nombre));

    dataFiltrada.forEach(macro => {
      dataRows.push([macro.nombre.toUpperCase(), 'MACRO', macro.saldo, macro.saldoAnterior, macro.diferencia, macro.variacion / 100]);
      
      macro.categorias.forEach(cat => {
        dataRows.push([`  ${cat.categoria}`, 'CATEGORIA', cat.saldo, cat.saldoAnterior, cat.diferencia, cat.variacion / 100]);
        
        cat.subcategorias.forEach(sub => {
            const nombreSub = this.config.mostrarFsa ? `(${sub.id_fsa}) ${sub.descripcion}` : sub.descripcion;
            dataRows.push([`    ${nombreSub}`, 'RUBRO', sub.saldo, sub.saldoAnterior, sub.diferencia, sub.variacion / 100]);
            
            if (this.config.mostrarCuentas) {
              sub.cuentas.forEach(cta => {
                if (!this.config.incluirCuentasCero && cta.saldo === 0 && cta.saldoAnterior === 0) return;
                dataRows.push([`      ${cta.num_cuenta} - ${cta.nombre}`, 'CUENTA', cta.saldo, cta.saldoAnterior, cta.diferencia, cta.variacion / 100]);
              });
            }
        });
      });
      dataRows.push([]); // Espacio vacío
    });

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(dataRows);
    ws['!cols'] = [{ wch: 60 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparativo');

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const nombreArchivo = `Comparativo_${anioActual}_vs_${anioAnt}.xlsx`;
    this._guardarArchivoExcel(excelBuffer, nombreArchivo);

  } catch (error) {
    console.error("Error Excel Comparativo:", error);
    Swal.fire('Error', 'No se pudo generar el archivo Excel.', 'error');
  } finally {
    this.showSpinner = false;
  }
}
}
