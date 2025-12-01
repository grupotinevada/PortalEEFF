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
  imports: [CommonModule, FormsModule, TooltipModule],
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
    alcanceNegativos: 'auditoria',
    // Opciones: 'signo' (-100), 'parentesis' (100)
    estiloNegativo: 'parentesis',
    mostrarFsa: false,
    mostrarCuentas: false,
    incluirCuentasCero: false,
    categoriasSeleccionadas: [] as { nombre: string; selected: boolean }[],
    colorTheme: 'green-black',
    mostrarDiferencia: true, // Default: visible
    mostrarVariacion: true   // Default: visible
  };

  constructor(
    public activeModal: NgbActiveModal, // Para cerrar el modal
    private sanitizer: DomSanitizer // Para la previsualización
  ) {
  }

  private getPaletteColors() {
    // Definimos los colores base
    const GREEN = '#198754'; // Verde Bootstrap (Success)
    const RED = '#dc3545';   // Rojo Bootstrap (Danger)
    const BLACK = '#000000'; // Negro

    let detailColor = GREEN;
    let negativeColor = RED;

    switch (this.config.colorTheme) {
      case 'green-black':
        detailColor = GREEN;
        negativeColor = BLACK;
        break;
      case 'green-red':
        detailColor = GREEN;
        negativeColor = RED;
        break;
      case 'red-black':
        detailColor = RED;
        negativeColor = BLACK;
        break;
      case 'red-red':
        detailColor = RED;
        negativeColor = RED;
        break;
    }

    return { detailColor, negativeColor };
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
      //this.config.alcanceNegativos = 'todo_negativo';
    }

    // Generar preview inicial si es modal de impresión
    if (this.type === 'print') {
      this.actualizarPreview();
    }
  }

  // --- GETTERS PARA HTML ---
  get themeClass(): string {
    return this.type === 'print' ? 'success' : 'teal';
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
    // 1. Delegar si es modo comparativo
    if (this.mode === 'comparative') {
      this._generarPreviewComparativo();
      return;
    }

    // 2. Validación básica
    if (this.reportData.length === 0) return;

    // A. COLORES
    const { detailColor, negativeColor } = this.getPaletteColors();

    // B. PROCESAMIENTO
    let dataParaImprimir: IMacroCategoria[] = JSON.parse(JSON.stringify(this.reportData));

    // Lógica de negativos
    dataParaImprimir.forEach(macro => {
      const esEstadoResultados = macro.nombre.toUpperCase().includes('RESULTADO') ||
        macro.nombre.toUpperCase().includes('GANANCIA') ||
        macro.nombre.toUpperCase().includes('PERDIDA');
      let debeSerAbsoluto = false;
      if (this.config.alcanceNegativos === 'absoluto') debeSerAbsoluto = true;
      else if (this.config.alcanceNegativos === 'auditoria' && !esEstadoResultados) debeSerAbsoluto = true;

      if (debeSerAbsoluto) this.hacerPositivoRecursivo(macro);
    });

    // Filtro
    const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
    dataParaImprimir = dataParaImprimir.filter(macro => categoriasActivas.includes(macro.nombre));

    if (dataParaImprimir.length === 0) {
      const noDataHtml = `<div style="padding: 20px; text-align: center; color: #777;">Selecciona al menos una categoría.</div>`;
      this.rawPreviewHtml = noDataHtml;
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(noDataHtml);
      return;
    }

    // C. GENERACIÓN HTML
    const nombreConjunto = this.balanceData?.nombre_conjunto || 'Balance';
    const ejercicio = this.balanceData?.ejercicio || '';
    const fechaInicio = new Date(this.balanceData?.fecha_inicio).toLocaleDateString('es-CL');
    const fechaFin = new Date(this.balanceData?.fecha_fin).toLocaleDateString('es-CL');
    const fechaImpresion = new Date().toLocaleString('es-CL');

    const formatearNumero = (valor: number): string => {
      if (typeof valor !== 'number') return '0';
      const esNegativo = valor < 0;
      const numStr = new Intl.NumberFormat('es-CL').format(Math.abs(valor));
      if (esNegativo) {
        return this.config.estiloNegativo === 'parentesis'
          ? `<span style="color: ${negativeColor}; font-weight:bold;">(${numStr})</span>`
          : `-${numStr}`;
      }
      return numStr;
    };

    const styles = `
    <style>
      body { margin: 20px; font-family: 'Segoe UI', sans-serif; color: #333; }
      .report-header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid ${detailColor}; padding-bottom: 10px; }
      .report-header h1 { margin: 0; font-size: 22px; text-transform: uppercase; }
      .report-header p { margin: 2px 0; font-size: 12px; color: #555; }
      
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background-color: #f0f0f0; border-bottom: 2px solid ${detailColor}; text-transform: uppercase; font-size: 10px; padding: 8px; }
      td { padding: 4px 8px; vertical-align: middle; }
      .text-end { text-align: right; }

      /* JERARQUÍA DE CABECERAS (Solo Títulos) */
      .header-macro td { font-size: 13px; font-weight: 800; color: ${detailColor}; text-transform: uppercase; padding-top: 15px; border-bottom: 1px solid #ccc; }
      .header-cat td { font-size: 11px; font-weight: 700; color: #444; padding-top: 10px; padding-left: 10px; font-style: italic; }
      .header-subcat td { font-size: 11px; font-weight: 600; color: #666; padding-left: 20px; }

      /* FILAS DE CUENTAS */
      .row-cuenta td { font-size: 10px; color: #777; padding-left: 40px; background-color: #fafafa; border-bottom: 1px solid #f0f0f0; }

      /* JERARQUÍA DE TOTALES (Pie de grupo) */
      .total-subcat td { font-weight: 600; color: #555; border-top: 1px solid #ddd; padding-left: 20px; font-style: italic; }
      .total-cat td { font-weight: 700; color: #333; border-top: 1px solid #999; background-color: #fcfcfc; padding-left: 10px; }
      .total-macro td { font-size: 12px; font-weight: 800; color: #000; border-top: 2px solid #000; border-bottom: 3px double #000; background-color: #f0f0f0; }

      /* Línea simple si no hay desglose de cuentas */
      .row-simple-subcat td { padding-left: 20px; font-weight: normal; }

      .footer { text-align: right; font-size: 9px; color: #999; margin-top: 30px; border-top: 1px solid #eee; }
    </style>
  `;

    let tableContent = '';

    dataParaImprimir.forEach((macro) => {
      // 1. Título Macro
      tableContent += `<tr class="header-macro"><td colspan="2">${macro.nombre.toUpperCase()}</td></tr>`;

      macro.categorias.forEach((cat) => {
        // 2. Título Categoría
        tableContent += `<tr class="header-cat"><td colspan="2">${cat.categoria}</td></tr>`;

        cat.subcategorias.forEach((sub) => {
          const nombreSub = this.config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;

          if (this.config.mostrarCuentas) {
            // A. MODO DETALLADO: Título Subcat -> Cuentas -> Total Subcat
            tableContent += `<tr class="header-subcat"><td colspan="2">${nombreSub}</td></tr>`;

            // Filtrar cuentas
            let cuentasVisibles = sub.cuentas;
            if (!this.config.incluirCuentasCero) cuentasVisibles = cuentasVisibles.filter(c => c.saldo !== 0);

            cuentasVisibles.forEach(cuenta => {
              tableContent += `
              <tr class="row-cuenta">
                <td>${cuenta.num_cuenta} - ${cuenta.nombre}</td>
                <td class="text-end">${formatearNumero(cuenta.saldo)}</td>
              </tr>`;
            });

            // Total Subcategoría
            tableContent += `
            <tr class="total-subcat">
              <td>Total ${sub.descripcion}</td>
              <td class="text-end">${formatearNumero(sub.saldo)}</td>
            </tr>`;
          } else {
            // B. MODO RESUMIDO: Subcategoría es una línea simple
            tableContent += `
            <tr class="row-simple-subcat">
              <td>${nombreSub}</td>
              <td class="text-end">${formatearNumero(sub.saldo)}</td>
            </tr>`;
          }
        });

        // 3. Total Categoría
        tableContent += `
        <tr class="total-cat">
          <td>TOTAL ${cat.categoria.toUpperCase()}</td>
          <td class="text-end">${formatearNumero(cat.saldo)}</td>
        </tr>`;
      });

      // 4. Total Macro
      tableContent += `
      <tr class="total-macro">
        <td>TOTAL ${macro.nombre.toUpperCase()}</td>
        <td class="text-end">${formatearNumero(macro.saldo)}</td>
      </tr>
      <tr><td colspan="2" style="height: 15px;"></td></tr>`; // Espaciador
    });

    const printHtml = `
    <html>
      <head><title>${nombreConjunto}</title>${styles}</head>
      <body>
        <div class="report-header">
          <h1>Estado de Resultados</h1>
          <p><strong>${nombreConjunto}</strong></p>
          <p>${ejercicio} | ${fechaInicio} al ${fechaFin}</p>
        </div>
        <table>
          <thead>
            <tr><th style="text-align:left;">Concepto</th><th class="text-end" style="width: 150px;">Saldo ($)</th></tr>
          </thead>
          <tbody>${tableContent}</tbody>
        </table>
        <div class="footer"><p>Generado: ${fechaImpresion}</p></div>
      </body>
    </html>`;

    this.rawPreviewHtml = printHtml;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(printHtml);
  }




  public exportarExcel(): void {
    this.showSpinner = true;

    try {
      // 1. OBTENER COLORES Y FORMATOS
      const { detailColor } = this.getPaletteColors();

      // CORRECCIÓN 1: Lógica de negativos (usar endsWith en lugar de includes)
      // Si el tema es 'red-black', NO queremos rojos. Solo si es 'green-red' o 'red-red'.
      const usarRojo = this.config.colorTheme.endsWith('red');

      // Construir formato Excel personalizado
      let excelNumFormat = '#,##0';
      if (this.config.estiloNegativo === 'parentesis') {
        excelNumFormat = usarRojo ? '#,##0;[Red](#,##0)' : '#,##0;(#,##0)';
      } else {
        excelNumFormat = usarRojo ? '#,##0;[Red]-#,##0' : '#,##0;-#,##0';
      }

      // 2. PROCESAR DATOS (Clonado y Signos)
      let dataProcesada: IMacroCategoria[] = JSON.parse(JSON.stringify(this.reportData));

      dataProcesada.forEach(macro => {
        const esEstadoResultados = macro.nombre.toUpperCase().includes('RESULTADO') ||
          macro.nombre.toUpperCase().includes('GANANCIA') ||
          macro.nombre.toUpperCase().includes('PERDIDA');
        let debeSerAbsoluto = false;

        if (this.config.alcanceNegativos === 'absoluto') debeSerAbsoluto = true;
        else if (this.config.alcanceNegativos === 'auditoria' && !esEstadoResultados) debeSerAbsoluto = true;

        if (debeSerAbsoluto) this.hacerPositivoRecursivo(macro);
      });

      // Filtro Categorías
      const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
      dataProcesada = dataProcesada.filter(macro => categoriasActivas.includes(macro.nombre));

      // 3. GENERAR HOJAS
      const ws_bi = this._crearHojaPowerBI(dataProcesada, this.config);

      // Pasamos el color sin el #
      const detailColorHex = detailColor.replace('#', '');
      const ws_design = this._crearHojaDisenoFinal(dataProcesada, this.config, excelNumFormat, detailColorHex);

      const wb: XLSX.WorkBook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws_bi, 'Datos Power BI');
      XLSX.utils.book_append_sheet(wb, ws_design, 'Diseño Impresión');

      const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const nombreArchivo = `Balance_${this.balanceData?.id_blce || 'Reporte'}.xlsx`;
      this._guardarArchivoExcel(excelBuffer, nombreArchivo);

    } catch (error) {
      console.error("Error al generar Excel:", error);
      Swal.fire('Error', 'No se pudo generar el archivo Excel.', 'error');
    } finally {
      this.showSpinner = false;
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
    * CORREGIDO: Ahora aplica estilos (s) a todas las filas para consistencia visual.
    */
  private _crearHojaDisenoFinal(
    data: IMacroCategoria[],
    config: IReportConfig,
    numFormat: string,
    colorHex: string
  ): XLSX.WorkSheet {

    const sheetData: any[] = [];

    // --- DEFINICIÓN DE ESTILOS (Igualando la calidad del modo comparativo) ---
    const styleHeader = { font: { bold: true, color: { rgb: colorHex } }, border: { bottom: { style: 'medium', color: { rgb: colorHex } } } };
    const styleMacro = { font: { bold: true, color: { rgb: colorHex } } }; // Título Macro con color del tema
    const styleCat = { font: { bold: true, color: { rgb: "444444" } } };   // Título Categoría (Gris oscuro)
    const styleCatTotal = { font: { bold: true }, border: { top: { style: 'thin' } } }; // Total Categoría

    // Estilos para Subcategorías y Cuentas (Usamos 'alignment' en vez de espacios en blanco en el string)
    const styleSubNombre = { alignment: { indent: 1 } };
    const styleSubNum = { font: { italic: false } }; // Saldo normal

    const styleSubNombreItalic = { alignment: { indent: 1 }, font: { italic: true } }; // Cuando hay desglose
    const styleSubTotal = { alignment: { indent: 1 }, font: { italic: true }, border: { top: { style: 'thin' } } };

    const styleCtaNombre = { alignment: { indent: 3 }, font: { color: { rgb: "777777" } } }; // Gris claro
    const styleCtaNum = { font: { color: { rgb: "777777" } } };

    const styleMacroTotal = { font: { bold: true }, border: { top: { style: 'thin' }, bottom: { style: 'double' } } };


    // Encabezado Tabla
    sheetData.push([
      { v: 'Concepto', s: styleHeader } as any,
      { v: 'Saldo', s: styleHeader } as any
    ]);

    data.forEach(macro => {
      // 1. MACRO
      sheetData.push([
        { v: macro.nombre.toUpperCase(), s: styleMacro } as any
      ]);

      macro.categorias.forEach(categoria => {
        // 2. CATEGORÍA
        sheetData.push([
          { v: categoria.categoria, s: styleCat } as any,
          // Nota: Las categorías generalmente no llevan saldo en la cabecera, pero si lo deseas, descomenta abajo:
          // { v: categoria.saldo, t: 'n', z: numFormat, s: styleCat } as any
          { v: '', s: styleCat } as any
        ]);

        categoria.subcategorias.forEach(sub => {
          const nombreSub = config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;

          if (!config.mostrarCuentas) {
            // A. MODO RESUMIDO (Linea simple)
            sheetData.push([
              { v: nombreSub, s: styleSubNombre },
              { v: sub.saldo, t: 'n', z: numFormat, s: styleSubNum } // Se agrega 's' para consistencia
            ]);
          } else {
            // B. MODO DETALLADO
            // Título Subcategoría
            sheetData.push([{ v: nombreSub, s: styleSubNombreItalic } as any]);

            let cuentasParaMostrar = sub.cuentas;
            if (!config.incluirCuentasCero) cuentasParaMostrar = cuentasParaMostrar.filter(c => c.saldo !== 0);

            // Cuentas
            cuentasParaMostrar.forEach(cuenta => {
              sheetData.push([
                { v: `${cuenta.num_cuenta} - ${cuenta.nombre}`, s: styleCtaNombre },
                { v: cuenta.saldo, t: 'n', z: numFormat, s: styleCtaNum }
              ]);
            });

            // Total Subcategoria
            sheetData.push([
              { v: `Total ${sub.descripcion}`, s: styleSubTotal } as any,
              { v: sub.saldo, t: 'n', z: numFormat, s: styleSubTotal } as any
            ]);
          }
        });

        // 3. TOTAL CATEGORÍA
        sheetData.push([
          { v: `TOTAL ${categoria.categoria.toUpperCase()}`, s: styleCatTotal } as any,
          { v: categoria.saldo, t: 'n', z: numFormat, s: styleCatTotal } as any
        ]);
      });

      // 4. TOTAL MACRO
      sheetData.push([
        { v: `TOTAL ${macro.nombre.toUpperCase()}`, s: styleMacroTotal } as any,
        { v: macro.saldo, t: 'n', z: numFormat, s: styleMacroTotal } as any
      ]);
      sheetData.push([]); // Espacio
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 60 }, { wch: 20 }];
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
    // A. COLORES
    const { detailColor, negativeColor } = this.getPaletteColors();

    // B. PROCESAMIENTO
    const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
    let dataClonada = JSON.parse(JSON.stringify(this.comparativeData));
    let dataFiltrada = dataClonada.filter((m: any) => categoriasActivas.includes(m.nombre));

    if (dataFiltrada.length === 0) {
      const noDataHtml = `<div style="padding: 20px; text-align: center;">Sin datos.</div>`;
      this.rawPreviewHtml = noDataHtml;
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(noDataHtml);
      return;
    }

    // Lógica Negativos
    dataFiltrada.forEach((macro: any) => {
      const esER = macro.nombre.toUpperCase().includes('RESULTADO') || macro.nombre.toUpperCase().includes('GANANCIA') || macro.nombre.toUpperCase().includes('PERDIDA');
      let abs = this.config.alcanceNegativos === 'absoluto' || (this.config.alcanceNegativos === 'auditoria' && !esER);
      if (abs) this.hacerPositivoComparativoRecursivo(macro);
    });

    // C. HELPERS FORMATO & VISIBILIDAD
    const showDiff = this.config.mostrarDiferencia;
    const showVar = this.config.mostrarVariacion;

    // Cálculo dinámico de columnas (Concepto + Año1 + Año2 + [Diff] + [Var])
    let colSpan = 3;
    if (showDiff) colSpan++;
    if (showVar) colSpan++;

    const fmtNum = (v: number) => {
      if (!v && v !== 0) return '0';
      const num = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(Math.abs(v));
      if (v < 0) return this.config.estiloNegativo === 'parentesis' ? `<span style="color:${negativeColor}; font-weight:bold">(${num})</span>` : `-${num}`;
      return num;
    };
    const fmtVar = (v: number) => Math.abs(v) > 9999 ? '>>' : `${v > 0 ? '+' : ''}${v.toLocaleString('es-CL', { maximumFractionDigits: 1 })}%`;
    const colorVar = (v: number) => v > 0 ? 'color:#198754' : (v < 0 ? `color:${negativeColor}` : 'color:#666');

    // D. ESTILOS
    const styles = `
    <style>
      body { font-family: 'Segoe UI', sans-serif; font-size: 11px; margin: 20px; color: #333; }
      .header { text-align: center; border-bottom: 2px solid ${detailColor}; padding-bottom: 10px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th { background-color: #f0f0f0; border-bottom: 2px solid ${detailColor}; text-transform: uppercase; font-size: 10px; padding: 6px; }
      td { padding: 5px; vertical-align: middle; }
      .text-end { text-align: right; }
      
      /* CABECERAS (Solo Título) */
      .head-macro td { font-size: 12px; font-weight: 800; color: ${detailColor}; background-color: #fdfdfd; padding-top: 15px; border-bottom: 1px solid #ddd; }
      .head-cat td { font-weight: 700; color: #555; padding-left: 15px; background-color: #fff; font-style: italic; padding-top: 8px; }
      .head-sub td { font-weight: 600; color: #666; padding-left: 25px; }

      /* CUENTAS */
      .row-cta td { font-size: 10px; color: #777; padding-left: 45px; background-color: #fafafa; border-bottom: 1px solid #f0f0f0; }

      /* TOTALES */
      .tot-sub td { font-weight: 600; font-style: italic; color: #555; border-top: 1px solid #eee; padding-left: 25px; }
      .tot-cat td { font-weight: 700; color: #333; background-color: #f8f9fa; border-top: 1px solid #999; padding-left: 15px; }
      .tot-macro td { font-weight: 800; color: #000; background-color: #f0f0f0; border-top: 2px solid #000; border-bottom: 3px double #000; }
      
      /* ROW SIMPLE */
      .row-simple td { padding-left: 25px; }
    </style>
  `;

    let rows = '';

    dataFiltrada.forEach((macro: any) => {
      // 1. Cabecera Macro
      rows += `<tr class="head-macro"><td colspan="${colSpan}">${macro.nombre.toUpperCase()}</td></tr>`;

      macro.categorias.forEach((cat: any) => {
        // 2. Cabecera Categoría
        rows += `<tr class="head-cat"><td colspan="${colSpan}">${cat.categoria}</td></tr>`;

        cat.subcategorias.forEach((sub: any) => {
          const nomSub = this.config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;

          if (this.config.mostrarCuentas) {
            // Detallado: Header -> Cuentas -> Total
            rows += `<tr class="head-sub"><td colspan="${colSpan}">${nomSub}</td></tr>`;

            sub.cuentas.forEach((cta: any) => {
              if (!this.config.incluirCuentasCero && cta.saldo === 0 && cta.saldoAnterior === 0) return;

              // Construcción fila cuenta
              rows += `<tr class="row-cta">
                <td>${cta.num_cuenta} - ${cta.nombre}</td>
                <td class="text-end">${fmtNum(cta.saldo)}</td>
                <td class="text-end text-muted">${fmtNum(cta.saldoAnterior)}</td>`;

              if (showDiff) rows += `<td class="text-end">${fmtNum(cta.diferencia)}</td>`;
              if (showVar) rows += `<td class="text-end" style="${colorVar(cta.variacion)}">${fmtVar(cta.variacion)}</td>`;

              rows += `</tr>`;
            });

            // Total Subcategoría
            rows += `<tr class="tot-sub">
              <td>Total ${sub.descripcion}</td>
              <td class="text-end">${fmtNum(sub.saldo)}</td>
              <td class="text-end text-muted">${fmtNum(sub.saldoAnterior)}</td>`;

            if (showDiff) rows += `<td class="text-end">${fmtNum(sub.diferencia)}</td>`;
            if (showVar) rows += `<td class="text-end" style="${colorVar(sub.variacion)}">${fmtVar(sub.variacion)}</td>`;

            rows += `</tr>`;

          } else {
            // Resumido: Línea simple
            rows += `<tr class="row-simple">
              <td>${nomSub}</td>
              <td class="text-end">${fmtNum(sub.saldo)}</td>
              <td class="text-end text-muted">${fmtNum(sub.saldoAnterior)}</td>`;

            if (showDiff) rows += `<td class="text-end">${fmtNum(sub.diferencia)}</td>`;
            if (showVar) rows += `<td class="text-end" style="${colorVar(sub.variacion)}">${fmtVar(sub.variacion)}</td>`;

            rows += `</tr>`;
          }
        });

        // 3. Total Categoría
        rows += `<tr class="tot-cat">
          <td>TOTAL ${cat.categoria.toUpperCase()}</td>
          <td class="text-end">${fmtNum(cat.saldo)}</td>
          <td class="text-end text-muted">${fmtNum(cat.saldoAnterior)}</td>`;

        if (showDiff) rows += `<td class="text-end">${fmtNum(cat.diferencia)}</td>`;
        if (showVar) rows += `<td class="text-end" style="${colorVar(cat.variacion)}">${fmtVar(cat.variacion)}</td>`;

        rows += `</tr>`;
      });

      // 4. Total Macro
      rows += `<tr class="tot-macro">
        <td>TOTAL ${macro.nombre.toUpperCase()}</td>
        <td class="text-end">${fmtNum(macro.saldo)}</td>
        <td class="text-end text-muted">${fmtNum(macro.saldoAnterior)}</td>`;

      if (showDiff) rows += `<td class="text-end">${fmtNum(macro.diferencia)}</td>`;
      if (showVar) rows += `<td class="text-end" style="${colorVar(macro.variacion)}">${fmtVar(macro.variacion)}</td>`;

      rows += `</tr><tr><td colspan="${colSpan}" style="height:15px"></td></tr>`;
    });

    // Construcción Header Table
    let headerHtml = `
      <tr>
        <th style="text-align:left">Concepto</th>
        <th class="text-end">${this.balanceData?.ejercicio}</th>
        <th class="text-end">${this.balanceAnteriorData?.ejercicio}</th>`;

    if (showDiff) headerHtml += `<th class="text-end">Dif ($)</th>`;
    if (showVar) headerHtml += `<th class="text-end">Var (%)</th>`;

    headerHtml += `</tr>`;

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
          <thead>${headerHtml}</thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px; font-size:9px; color:#999; text-align:right;">Generado: ${new Date().toLocaleString('es-CL')}</div>
      </body>
    </html>`;

    this.rawPreviewHtml = printHtml;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(printHtml);
  }

  private _exportarExcelComparativo(): void {
    this.showSpinner = true;
    try {
      // 1. CONFIGURACIÓN VISUAL
      const { detailColor } = this.getPaletteColors();
      const detailColorHex = detailColor.replace('#', '');
      const usarRojo = this.config.colorTheme.includes('red');

      // Formato de número ($)
      let excelNumFormat = '#,##0';
      if (this.config.estiloNegativo === 'parentesis') {
        excelNumFormat = usarRojo ? '#,##0;[Red](#,##0)' : '#,##0;(#,##0)';
      } else {
        excelNumFormat = usarRojo ? '#,##0;[Red]-#,##0' : '#,##0;-#,##0';
      }

      // Formato de porcentaje (%)
      const percentFormat = '0.0%';

      // 2. PROCESAMIENTO DE DATOS
      const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
      let dataClonada = JSON.parse(JSON.stringify(this.comparativeData));
      let dataFiltrada = dataClonada.filter((m: any) => categoriasActivas.includes(m.nombre));

      // Aplicar lógica de signos (Auditoría/Absoluto)
      dataFiltrada.forEach((macro: any) => {
        const esER = macro.nombre.toUpperCase().includes('RESULTADO') ||
          macro.nombre.toUpperCase().includes('GANANCIA') ||
          macro.nombre.toUpperCase().includes('PERDIDA');
        let abs = this.config.alcanceNegativos === 'absoluto' || (this.config.alcanceNegativos === 'auditoria' && !esER);

        if (abs) this.hacerPositivoComparativoRecursivo(macro);
      });

      // 3. CONSTRUCCIÓN DE COLUMNAS
      const anioActual = this.balanceData?.ejercicio || 'Actual';
      const anioAnt = this.balanceAnteriorData?.ejercicio || 'Anterior';

      // Headers Dinámicos
      const headerRow = [
        { v: 'Concepto', s: { font: { bold: true, color: { rgb: detailColorHex } }, border: { bottom: { style: 'medium', color: { rgb: detailColorHex } } } } },
        { v: 'Tipo', s: { font: { bold: true } } },
        { v: `Saldo ${anioActual}`, s: { font: { bold: true } } },
        { v: `Saldo ${anioAnt}`, s: { font: { bold: true } } }
      ];

      if (this.config.mostrarDiferencia) {
        headerRow.push({ v: 'Diferencia $', s: { font: { bold: true } } });
      }
      if (this.config.mostrarVariacion) {
        headerRow.push({ v: 'Variación %', s: { font: { bold: true } } });
      }

      const dataRows: any[] = [];
      dataRows.push(headerRow);

      // Helper para pushear filas respetando las columnas activas
      const addRow = (nombre: string, tipo: string, saldo: number, ant: number, dif: number, vari: number, styleName: any) => {

        // CORRECCIÓN AQUÍ: Definimos explícitamente 'row' como 'any[]' para permitir la mezcla de estilos
        const row: any[] = [
          { v: nombre, s: styleName },
          { v: tipo },
          { v: saldo, t: 'n', z: excelNumFormat },
          { v: ant, t: 'n', z: excelNumFormat }
        ];

        if (this.config.mostrarDiferencia) {
          row.push({ v: dif, t: 'n', z: excelNumFormat });
        }
        if (this.config.mostrarVariacion) {
          const colorVar = vari > 0 ? '008000' : (vari < 0 ? (usarRojo ? 'FF0000' : '000000') : '000000');
          // Ahora TypeScript permitirá este push sin errores gracias al 'any[]'
          row.push({ v: vari / 100, t: 'n', z: percentFormat, s: { font: { color: { rgb: colorVar } } } });
        }
        dataRows.push(row);
      };

      // 4. ITERACIÓN DE DATOS
      const styleMacro = { font: { bold: true, color: { rgb: detailColorHex } } };
      const styleCat = { font: { bold: true } };
      const styleSub = { alignment: { indent: 1 } };
      const styleCta = { alignment: { indent: 2 }, font: { color: { rgb: "777777" } } };

      dataFiltrada.forEach((macro: any) => {
        // Macro
        addRow(macro.nombre.toUpperCase(), 'MACRO', macro.saldo, macro.saldoAnterior, macro.diferencia, macro.variacion, styleMacro);

        macro.categorias.forEach((cat: any) => {
          // Categoría
          addRow(`  ${cat.categoria}`, 'CATEGORIA', cat.saldo, cat.saldoAnterior, cat.diferencia, cat.variacion, styleCat);

          cat.subcategorias.forEach((sub: any) => {
            const nombreSub = this.config.mostrarFsa ? `(${sub.id_fsa}) ${sub.descripcion}` : sub.descripcion;

            if (!this.config.mostrarCuentas) {
              addRow(`    ${nombreSub}`, 'RUBRO', sub.saldo, sub.saldoAnterior, sub.diferencia, sub.variacion, styleSub);
            } else {
              // Título Rubro
              dataRows.push([{ v: `    ${nombreSub}`, s: { font: { italic: true } } }]);

              // Cuentas
              sub.cuentas.forEach((cta: any) => {
                if (!this.config.incluirCuentasCero && cta.saldo === 0 && cta.saldoAnterior === 0) return;
                addRow(`      ${cta.num_cuenta} - ${cta.nombre}`, 'CUENTA', cta.saldo, cta.saldoAnterior, cta.diferencia, cta.variacion, styleCta);
              });

              // Total Rubro
              addRow(`      Total ${sub.descripcion}`, 'TOTAL RUBRO', sub.saldo, sub.saldoAnterior, sub.diferencia, sub.variacion, { font: { italic: true }, border: { top: { style: 'thin' } } });
            }
          });
        });
        dataRows.push([]); // Espacio vacío entre macros
      });

      // 5. GENERAR ARCHIVO
      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(dataRows);

      // Anchos de columna
      const cols = [{ wch: 60 }, { wch: 10 }, { wch: 15 }, { wch: 15 }];
      if (this.config.mostrarDiferencia) cols.push({ wch: 15 });
      if (this.config.mostrarVariacion) cols.push({ wch: 10 });
      ws['!cols'] = cols;

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

  // Agrega esto junto a tus otros métodos privados
  private hacerPositivoComparativoRecursivo(item: any) {
    // Invertir Saldo Actual
    if (item.saldo) item.saldo = Math.abs(item.saldo);
    // Invertir Saldo Anterior
    if (item.saldoAnterior) item.saldoAnterior = Math.abs(item.saldoAnterior);
    // Invertir Diferencia (para consistencia visual)
    if (item.diferencia) item.diferencia = Math.abs(item.diferencia);

    // La variación (%) no se toca, matemáticamente la proporción se mantiene.

    // Navegar hacia abajo
    if (item.categorias) {
      item.categorias.forEach((cat: any) => this.hacerPositivoComparativoRecursivo(cat));
    }
    if (item.subcategorias) {
      item.subcategorias.forEach((sub: any) => this.hacerPositivoComparativoRecursivo(sub));
    }
    if (item.cuentas) {
      item.cuentas.forEach((cta: any) => this.hacerPositivoComparativoRecursivo(cta));
    }
  }
}
