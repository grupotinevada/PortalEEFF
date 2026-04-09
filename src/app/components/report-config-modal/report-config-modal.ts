import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { IReportConfig } from '../../models/report-config-modal';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as XLSX from 'xlsx-js-style';
import { saveAs } from 'file-saver';
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

  @Input() type: 'print' | 'excel' = 'print';
  @Input() title: string = '';
  @Input() reportData: IMacroCategoria[] = [];
  @Input() balanceData!: IBalanceGet;
  @Input() mode: 'standard' | 'comparative' = 'standard';
  @Input() comparativeData: IMacroCategoriaComparativa[] = [];
  @Input() balanceAnteriorData!: IBalanceGet;

  previewHtml: SafeHtml | null = null;
  rawPreviewHtml: string = '';
  showSpinner = false;

  config: IReportConfig = {
    alcanceNegativos: 'auditoria',
    estiloNegativo: 'parentesis',
    mostrarFsa: false,
    mostrarCuentas: false,
    incluirCuentasCero: false,
    categoriasSeleccionadas: [] as { nombre: string; selected: boolean }[],
    colorTheme: 'green-black',
    mostrarDiferencia: true,
    mostrarVariacion: true,
    verEnMiles: false
  };

  constructor(
    public activeModal: NgbActiveModal,
    private sanitizer: DomSanitizer
  ) { }

  private _getValor(valor: number): number {
    return valor || 0;
  }

  private getPaletteColors() {
    const GREEN = '#198754';
    const RED = '#dc3545';
    const BLACK = '#000000';

    let detailColor = GREEN;
    let negativeColor = RED;

    switch (this.config.colorTheme) {
      case 'green-black': detailColor = GREEN; negativeColor = BLACK; break;
      case 'green-red': detailColor = GREEN; negativeColor = RED; break;
      case 'red-black': detailColor = RED; negativeColor = BLACK; break;
      case 'red-red': detailColor = RED; negativeColor = RED; break;
      case 'black-black': detailColor = BLACK; negativeColor = BLACK; break;
    }
    return { detailColor, negativeColor };
  }

  ngOnInit(): void {
    if (this.mode === 'standard') {
      if (this.reportData && this.reportData.length > 0) {
        this.config.categoriasSeleccionadas = this.reportData.map(macro => ({
          nombre: macro.nombre,
          selected: true
        }));
      }
    } else {
      if (this.comparativeData && this.comparativeData.length > 0) {
        this.config.categoriasSeleccionadas = this.comparativeData.map(macro => ({
          nombre: macro.nombre,
          selected: true
        }));
      }
    }
    if (this.type === 'print') {
      this.actualizarPreview();
    }
  }

  get themeClass(): string {
    return this.type === 'print' ? 'success' : 'teal';
  }

  emitChange(): void {
    if (this.type === 'print') {
      this.actualizarPreview();
    }
  }

  confirm(): void {
    if (this.type === 'print') {
      this.ejecutarImpresion();
    } else {
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
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(this.rawPreviewHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      Swal.fire('Error', 'Por favor permite las ventanas emergentes.', 'error');
    }
  }

  private prepararDatosParaReporte(dataOrigen: any[], mode: 'standard' | 'comparative'): any[] {
    let dataProcesada = JSON.parse(JSON.stringify(dataOrigen));
    const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
    dataProcesada = dataProcesada.filter((macro: any) => categoriasActivas.includes(macro.nombre));

    // 1. PRIMERO: Aplicar transformación a Miles (sobre datos con signos originales)
    if (this.config.verEnMiles) {
      if (mode === 'standard') {
        this.aplicarTransformacionMilesStandard(dataProcesada);
      } else {
        this.aplicarTransformacionMilesComparativa(dataProcesada);
      }
    }

    // 2. DESPUÉS: Aplicar tratamiento de signos (Vista Financiera = 'auditoria')
    if (this.config.alcanceNegativos === 'auditoria') {
      if (mode === 'standard') {
        this.aplicarVistaFinancieraStandard(dataProcesada);
      } else {
        this.aplicarVistaFinancieraComparativa(dataProcesada);
      }
    }
    // Si es 'todo_negativo' (Vista Cruda), se mantienen los signos contables originales.

    return dataProcesada;
  }

  // =========================================================
  // LÓGICA DE INVERSIÓN: VISTA FINANCIERA
  // =========================================================
  private aplicarVistaFinancieraStandard(nodos: any[]) {
    const macrosInvertir = ['PASIVOS', 'PATRIMONIO', 'ESTADO DE RESULTADOS', 'PASIVO + PATRIMONIO'];
    nodos.forEach(macro => {
      const factor = macrosInvertir.includes(macro.nombre) ? -1 : 1;
      this.multiplicarNodosRecursivo(macro, factor);
    });
  }

  private multiplicarNodosRecursivo(item: any, factor: number) {
    if (item.saldo !== undefined) item.saldo = item.saldo * factor;
    if (item.saldoMiles !== undefined) item.saldoMiles = item.saldoMiles * factor;

    if (item.categorias) item.categorias.forEach((cat: any) => this.multiplicarNodosRecursivo(cat, factor));
    if (item.subcategorias) item.subcategorias.forEach((sub: any) => this.multiplicarNodosRecursivo(sub, factor));
    if (item.cuentas) item.cuentas.forEach((cta: any) => this.multiplicarNodosRecursivo(cta, factor));
  }

  private aplicarVistaFinancieraComparativa(nodos: any[]) {
    const macrosInvertir = ['PASIVOS', 'PATRIMONIO', 'ESTADO DE RESULTADOS', 'PASIVO + PATRIMONIO'];
    nodos.forEach(macro => {
      const factor = macrosInvertir.includes(macro.nombre) ? -1 : 1;
      this.multiplicarComparativoRecursivo(macro, factor);
    });
  }

  private multiplicarComparativoRecursivo(item: any, factor: number) {
    // Invertimos saldos actuales
    if (item.saldo !== undefined) item.saldo = item.saldo * factor;
    if (item.saldoMiles !== undefined) item.saldoMiles = item.saldoMiles * factor;

    // Invertimos saldos anteriores
    if (item.saldoAnterior !== undefined) item.saldoAnterior = item.saldoAnterior * factor;
    if (item.saldoAnteriorMiles !== undefined) item.saldoAnteriorMiles = item.saldoAnteriorMiles * factor;

    // Al invertir ambos saldos, la diferencia monetaria también invierte su signo
    if (item.diferencia !== undefined) item.diferencia = item.diferencia * factor;
    if (item.diferenciaMiles !== undefined) item.diferenciaMiles = item.diferenciaMiles * factor;

    // NOTA: La variación porcentual (item.variacion) NO se altera.
    // Matemáticamente: (-Nuevo - -Ant) / -Ant == (Nuevo - Ant) / Ant

    if (item.categorias) item.categorias.forEach((cat: any) => this.multiplicarComparativoRecursivo(cat, factor));
    if (item.subcategorias) item.subcategorias.forEach((sub: any) => this.multiplicarComparativoRecursivo(sub, factor));
    if (item.cuentas) item.cuentas.forEach((cta: any) => this.multiplicarComparativoRecursivo(cta, factor));
  }

  actualizarPreview(): void {
    if (this.mode === 'comparative') {
      this._generarPreviewComparativo();
      return;
    }
    if (this.reportData.length === 0) return;

    const dataParaImprimir = this.prepararDatosParaReporte(this.reportData, 'standard');

    if (dataParaImprimir.length === 0) {
      const noDataHtml = `<div style="padding: 20px; text-align: center; color: #777;">Selecciona al menos una categoría.</div>`;
      this.rawPreviewHtml = noDataHtml;
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(noDataHtml);
      return;
    }

    const { detailColor, negativeColor } = this.getPaletteColors();
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
      @page { size: auto; margin: 10mm; }
      body { font-family: 'Segoe UI', sans-serif; color: #333; margin: 0; padding: 0; }
      .report-header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid ${detailColor}; padding-bottom: 5px; }
      .report-header h1 { margin: 0; font-size: 18px; text-transform: uppercase; }
      .report-header p { margin: 0; font-size: 11px; color: #555; }
      table { width: 100%; border-collapse: collapse; font-size: 10px; }
      th { background-color: #f0f0f0; border-bottom: 1px solid ${detailColor}; text-transform: uppercase; font-size: 9px; padding: 4px; }
      td { padding: 2px 4px; vertical-align: middle; }
      tr { page-break-inside: avoid; }
      .text-end { text-align: right; }
      .header-macro td { font-size: 11px; font-weight: 800; color: ${detailColor}; text-transform: uppercase; padding-top: 10px; border-bottom: 1px solid #ccc; background-color: #fff; }
      .header-cat td { font-size: 10px; font-weight: 700; color: #444; padding-top: 6px; padding-left: 8px; font-style: italic; }
      .header-subcat td { font-size: 10px; font-weight: 600; color: #666; padding-left: 16px; }
      .row-cuenta td { font-size: 9px; color: #777; padding-left: 30px; background-color: #fafafa; border-bottom: 1px solid #f8f8f8; }
      .total-subcat td { font-weight: 600; color: #555; border-top: 1px solid #ddd; padding-left: 16px; font-style: italic; background-color: #fff; }
      .total-cat td { font-weight: 700; color: #333; border-top: 1px solid #999; background-color: #fcfcfc; padding-left: 8px; }
      .total-macro td { font-size: 11px; font-weight: 800; color: #000; border-top: 1px solid #000; border-bottom: 3px double #000; background-color: #f0f0f0; padding-top: 4px; padding-bottom: 4px; }
      .row-simple-subcat td { padding-left: 16px; font-weight: normal; }
      .footer { text-align: right; font-size: 8px; color: #999; margin-top: 10px; border-top: 1px solid #eee; }
      .page-break { page-break-after: always; display: block; height: 1px; width: 100%; border: none; }
    </style>
    `;

    const tituloSufijo = this.config.verEnMiles ? '(Valores en M$)' : '($)';
    const tableHeaderHtml = `
      <thead>
        <tr>
          <th style="text-align:left;">Concepto</th>
          <th class="text-end" style="width: 140px;">Saldo ${tituloSufijo}</th>
        </tr>
      </thead>`;

    let fullContent = `<table>${tableHeaderHtml}<tbody>`;

    dataParaImprimir.forEach((macro: any, index: number) => {
      fullContent += `<tr class="header-macro"><td colspan="2">${macro.nombre.toUpperCase()}</td></tr>`;

      macro.categorias.forEach((cat: any) => {
        fullContent += `<tr class="header-cat"><td colspan="2">${cat.categoria}</td></tr>`;
        cat.subcategorias.forEach((sub: any) => {
          const nombreSub = this.config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;
          if (this.config.mostrarCuentas) {
            fullContent += `<tr class="header-subcat"><td colspan="2">${nombreSub}</td></tr>`;
            let cuentasVisibles = sub.cuentas;
            if (!this.config.incluirCuentasCero) cuentasVisibles = cuentasVisibles.filter((c: any) => c.saldo !== 0);

            cuentasVisibles.forEach((cuenta: any) => {
              fullContent += `
              <tr class="row-cuenta">
                <td>${cuenta.num_cuenta} - ${cuenta.nombre}</td>
                <td class="text-end">${formatearNumero(cuenta.saldo)}</td>
              </tr>`;
            });

            fullContent += `
            <tr class="total-subcat">
              <td>Total ${sub.descripcion}</td>
              <td class="text-end">${formatearNumero(sub.saldo)}</td>
            </tr>`;
          } else {
            fullContent += `
            <tr class="row-simple-subcat">
              <td>${nombreSub}</td>
              <td class="text-end">${formatearNumero(sub.saldo)}</td>
            </tr>`;
          }
        });
        fullContent += `
        <tr class="total-cat">
          <td>TOTAL ${cat.categoria.toUpperCase()}</td>
          <td class="text-end">${formatearNumero(cat.saldo)}</td>
        </tr>`;
      });

      fullContent += `
      <tr class="total-macro">
        <td>TOTAL ${macro.nombre.toUpperCase()}</td>
        <td class="text-end">${formatearNumero(macro.saldo)}</td>
      </tr>
      <tr><td colspan="2" style="height: 30px;"></td></tr>`;

      if (macro.nombre.toUpperCase().includes('PASIVO') && !macro.nombre.toUpperCase().includes('PATRIMONIO')) {
        fullContent += `</tbody></table>`;
        fullContent += `<div class="page-break"></div>`;
        fullContent += `<div style="margin-top:20px"></div><table>${tableHeaderHtml}<tbody>`;
      }

    });

    fullContent += `</tbody></table>`;

    const printHtml = `
    <html>
      <head><title>${nombreConjunto}</title>${styles}</head>
      <body>
        <div class="report-header">
          <h1>Estado de Resultados</h1>
          <p><strong>${nombreConjunto}</strong></p>
          <p>${ejercicio} | ${fechaInicio} al ${fechaFin}</p>
        </div>
        ${fullContent}
        <div class="footer"><p>Generado: ${fechaImpresion}</p></div>
      </body>
    </html>`;

    this.rawPreviewHtml = printHtml;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(printHtml);
  }

  public exportarExcel(): void {
    this.showSpinner = true;
    try {
      const { detailColor } = this.getPaletteColors();
      const usarRojo = this.config.colorTheme.endsWith('red');
      let excelNumFormat = '#,##0';
      if (this.config.estiloNegativo === 'parentesis') {
        excelNumFormat = usarRojo ? '#,##0;[Red](#,##0)' : '#,##0;(#,##0)';
      } else {
        excelNumFormat = usarRojo ? '#,##0;[Red]-#,##0' : '#,##0;-#,##0';
      }

      const dataProcesada = this.prepararDatosParaReporte(this.reportData, 'standard');

      const ws_bi = this._crearHojaPowerBI(dataProcesada, this.config);
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

  // =========================================================
  // LOGICA M$ STANDARD (Igual a ModalDetalle)
  // =========================================================
  private aplicarTransformacionMilesStandard(nodos: any[]): void {
    nodos.forEach(macro => {
      macro.saldoMiles = this.redondear(macro.saldo / 1000);
      this.ajustarHijosStandard(macro.saldoMiles, macro.categorias);

      macro.categorias.forEach((cat: any) => {
        this.ajustarHijosStandard(cat.saldoMiles, cat.subcategorias);

        cat.subcategorias.forEach((sub: any) => {
          this.ajustarHijosStandard(sub.saldoMiles, sub.cuentas);
        });
      });
    });

    this.sobreescribirSaldosStandard(nodos);
  }

  private ajustarHijosStandard(saldoObjetivoPadre: number, hijos: any[]): void {
    if (!hijos || hijos.length === 0) return;

    let sumaHijos = 0;
    hijos.forEach(hijo => {
      hijo.saldoMiles = this.redondear(hijo.saldo / 1000);
      sumaHijos += hijo.saldoMiles;
    });

    const diferencia = saldoObjetivoPadre - sumaHijos;

    if (diferencia !== 0 && Math.abs(diferencia) <= 2) {
      const candidato = hijos.reduce((prev, curr) =>
        (Math.abs(curr.saldo) > Math.abs(prev.saldo) ? curr : prev)
      );
      candidato.saldoMiles += diferencia;
    }
  }

  private sobreescribirSaldosStandard(nodos: any[]): void {
    nodos.forEach(nodo => {
      if (nodo.saldoMiles !== undefined) nodo.saldo = nodo.saldoMiles;
      if (nodo.categorias) this.sobreescribirSaldosStandard(nodo.categorias);
      if (nodo.subcategorias) this.sobreescribirSaldosStandard(nodo.subcategorias);
      if (nodo.cuentas) this.sobreescribirSaldosStandard(nodo.cuentas);
    });
  }

  // =========================================================
  // LOGICA M$ COMPARATIVA (Igual a ModalComparativo)
  // =========================================================
  private aplicarTransformacionMilesComparativa(nodos: any[]): void {
    nodos.forEach(macro => {
      // 1. Columna Actual
      macro.saldoMiles = this.redondear(macro.saldo / 1000);
      this.ajustarHijosComparativo(macro.saldoMiles, macro.categorias, 'saldo', 'saldoMiles');

      macro.categorias.forEach((cat: any) => {
        this.ajustarHijosComparativo(cat.saldoMiles, cat.subcategorias, 'saldo', 'saldoMiles');
        cat.subcategorias.forEach((sub: any) => {
          this.ajustarHijosComparativo(sub.saldoMiles, sub.cuentas, 'saldo', 'saldoMiles');
        });
      });

      // 2. Columna Anterior
      macro.saldoAnteriorMiles = this.redondear(macro.saldoAnterior / 1000);
      this.ajustarHijosComparativo(macro.saldoAnteriorMiles, macro.categorias, 'saldoAnterior', 'saldoAnteriorMiles');

      macro.categorias.forEach((cat: any) => {
        this.ajustarHijosComparativo(cat.saldoAnteriorMiles, cat.subcategorias, 'saldoAnterior', 'saldoAnteriorMiles');
        cat.subcategorias.forEach((sub: any) => {
          this.ajustarHijosComparativo(sub.saldoAnteriorMiles, sub.cuentas, 'saldoAnterior', 'saldoAnteriorMiles');
        });
      });
    });

    this.recalcularHorizontalesYPlanchar(nodos);
  }

  private ajustarHijosComparativo(saldoObjetivoPadre: number, hijos: any[], campoOrigen: string, campoDestino: string): void {
    if (!hijos || hijos.length === 0) return;
    let sumaHijos = 0;
    hijos.forEach(hijo => {
      hijo[campoDestino] = this.redondear(hijo[campoOrigen] / 1000);
      sumaHijos += hijo[campoDestino];
    });

    const diferencia = saldoObjetivoPadre - sumaHijos;
    if (diferencia !== 0 && Math.abs(diferencia) <= 2) {
      const candidato = hijos.reduce((prev, curr) =>
        (Math.abs(curr[campoOrigen]) > Math.abs(prev[campoOrigen]) ? curr : prev)
      );
      candidato[campoDestino] += diferencia;
    }
  }

  private recalcularHorizontalesYPlanchar(nodos: any[]): void {
    nodos.forEach(nodo => {
      // Planchar valores (sobrescribir originales con miles)
      if (nodo.saldoMiles !== undefined) nodo.saldo = nodo.saldoMiles;
      if (nodo.saldoAnteriorMiles !== undefined) nodo.saldoAnterior = nodo.saldoAnteriorMiles;

      // Recalcular diferencias en base a lo planchado
      nodo.diferencia = (nodo.saldo || 0) - (nodo.saldoAnterior || 0);

      const anterior = nodo.saldoAnterior || 0;
      if (anterior === 0) {
        nodo.variacion = (nodo.saldo === 0) ? 0 : 999999;
      } else {
        nodo.variacion = ((nodo.saldo - anterior) / anterior) * 100;
      }

      if (nodo.categorias) this.recalcularHorizontalesYPlanchar(nodo.categorias);
      if (nodo.subcategorias) this.recalcularHorizontalesYPlanchar(nodo.subcategorias);
      if (nodo.cuentas) this.recalcularHorizontalesYPlanchar(nodo.cuentas);
    });
  }

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
            if (!config.incluirCuentasCero) cuentasParaMostrar = cuentasParaMostrar.filter(c => c.saldo !== 0);
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

  private redondear(valor: number): number {
    return Math.round(Math.abs(valor)) * Math.sign(valor);
  }

  public positivizarSaldosParaPreview(
    macros: IMacroCategoria[]
  ): IMacroCategoria[] {
    return macros;
  }

  private _crearHojaDisenoFinal(
    data: IMacroCategoria[],
    config: IReportConfig,
    numFormat: string,
    colorHex: string
  ): XLSX.WorkSheet {

    const sheetData: any[] = [];

    // --- ESTILOS CON FONDO BLANCO ---
    const bgWhite = { fgColor: { rgb: "FFFFFF" } };

    const styleMetaTitle = { font: { bold: true, sz: 12 }, fill: bgWhite };
    const styleMetaSub = { font: { bold: true, sz: 10 }, fill: bgWhite };

    const styleHeader = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: colorHex } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
    };

    const styleMacro = { font: { bold: true, color: { rgb: colorHex } }, fill: bgWhite };
    const styleCat = { font: { bold: true, color: { rgb: "444444" } }, fill: bgWhite };
    const styleCatTotal = { font: { bold: true }, border: { top: { style: 'thin' } }, fill: bgWhite };
    const styleSubNombre = { alignment: { indent: 1 }, fill: bgWhite };
    const styleSubNum = { font: { italic: false }, fill: bgWhite };
    const styleSubNombreItalic = { alignment: { indent: 1 }, font: { italic: true }, fill: bgWhite };
    const styleSubTotal = { alignment: { indent: 1 }, font: { bold: true, italic: true }, border: { top: { style: 'thin' } }, fill: bgWhite };
    const styleCtaNombre = { alignment: { indent: 3 }, font: { color: { rgb: "777777" } }, fill: bgWhite };
    const styleCtaNum = { font: { color: { rgb: "777777" } }, fill: bgWhite };
    const styleMacroTotal = { font: { bold: true }, border: { top: { style: 'thin' }, bottom: { style: 'double' } }, fill: bgWhite };
    const styleEmpty = { fill: bgWhite };

    // --- HELPER PARA RELLENAR BLANCOS ---
    // Asegura que ambas columnas tengan el fondo blanco, incluso si están vacías
    const pushRow = (cells: any[]) => {
      const row = [{ v: '', s: styleEmpty }, { v: '', s: styleEmpty }];
      cells.forEach((cell, i) => { if (cell) row[i] = cell; });
      sheetData.push(row);
    };

    let dia = 'DD', mesStr = 'Mes', mesNum = 'MM', anio = 'AAAA';
    if (this.balanceData?.fecha_fin) {
      const f = new Date(this.balanceData.fecha_fin);
      const offset = f.getTimezoneOffset() * 60000;
      const localDate = new Date(f.getTime() + offset);
      dia = localDate.getDate().toString().padStart(2, '0');
      mesNum = (localDate.getMonth() + 1).toString().padStart(2, '0');
      anio = localDate.getFullYear().toString();
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      mesStr = meses[localDate.getMonth()];
    }

    const nombreConjunto = this.balanceData?.nombre_conjunto || this.balanceData?.empresaDesc || 'Balance';
    const nombreEmpresa = this.balanceData?.id_empresa + ' - ' + this.balanceData?.empresaDesc || 'Ingresa empresa';
    pushRow([{ v: nombreConjunto, s: styleMetaTitle }]);
    pushRow([{ v: nombreEmpresa, s: styleMetaTitle }]);
    pushRow([{ v: `Estados Financieros al ${dia} de ${mesStr} ${anio}`, s: styleMetaSub }]);
    pushRow([]);

    const sufijoMiles = this.config.verEnMiles ? '\n(M$)' : '';
    const tituloSaldo = `Saldo al\n${dia}-${mesNum}-${anio}${sufijoMiles}`;

    pushRow([
      { v: 'Concepto', s: styleHeader },
      { v: tituloSaldo, s: styleHeader }
    ]);

    data.forEach(macro => {
      const esER = macro.nombre.toUpperCase().includes('RESULTADO') ||
        macro.nombre.toUpperCase().includes('GANANCIA') ||
        macro.nombre.toUpperCase().includes('PERDIDA');

      pushRow([{ v: macro.nombre.toUpperCase(), s: styleMacro }]);

      macro.categorias.forEach(categoria => {
        pushRow([{ v: categoria.categoria, s: styleCat }]);

        categoria.subcategorias.forEach(sub => {
          const nombreSub = config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;
          if (!config.mostrarCuentas) {
            pushRow([
              { v: nombreSub, s: styleSubNombre },
              { v: sub.saldo, t: 'n', z: numFormat, s: styleSubNum }
            ]);
          } else {
            pushRow([{ v: nombreSub, s: styleSubNombreItalic }]);
            let cuentasParaMostrar = sub.cuentas;
            if (!config.incluirCuentasCero) cuentasParaMostrar = cuentasParaMostrar.filter(c => c.saldo !== 0);

            cuentasParaMostrar.forEach(cuenta => {
              pushRow([
                { v: `${cuenta.num_cuenta} - ${cuenta.nombre}`, s: styleCtaNombre },
                { v: cuenta.saldo, t: 'n', z: numFormat, s: styleCtaNum }
              ]);
            });
            pushRow([
              { v: `Total ${sub.descripcion}`, s: styleSubTotal },
              { v: sub.saldo, t: 'n', z: numFormat, s: styleSubTotal }
            ]);
          }
        });

        const textoTotalCat = esER ? categoria.categoria : `TOTAL ${categoria.categoria.toUpperCase()}`;
        pushRow([
          { v: textoTotalCat, s: styleCatTotal },
          { v: categoria.saldo, t: 'n', z: numFormat, s: styleCatTotal }
        ]);
      });

      if (!esER) {
        pushRow([
          { v: `TOTAL ${macro.nombre.toUpperCase()}`, s: styleMacroTotal },
          { v: macro.saldo, t: 'n', z: numFormat, s: styleMacroTotal }
        ]);
      }
      pushRow([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws['!cols'] = [{ wch: 80 }, { wch: 20 }];

    return ws;
  }

  private _guardarArchivoExcel(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-g'
    });
    saveAs(data, fileName);
  }

  private _generarPreviewComparativo(): void {
    const { detailColor, negativeColor } = this.getPaletteColors();

    const dataFiltrada = this.prepararDatosParaReporte(this.comparativeData, 'comparative');

    if (dataFiltrada.length === 0) {
      const noDataHtml = `<div style="padding: 20px; text-align: center;">Sin datos.</div>`;
      this.rawPreviewHtml = noDataHtml;
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(noDataHtml);
      return;
    }

    const showDiff = this.config.mostrarDiferencia;
    const showVar = this.config.mostrarVariacion;
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

    const styles = `
    <style>
      @page { size: auto; margin: 8mm; }
      body { font-family: 'Segoe UI', sans-serif; font-size: 9px; margin: 0; color: #333; }
      .header { text-align: center; border-bottom: 2px solid ${detailColor}; padding-bottom: 5px; margin-bottom: 10px; }
      .header h2 { margin: 0; font-size: 16px; }
      .header p { margin: 0; font-size: 10px; }
      table { width: 100%; border-collapse: collapse; table-layout: auto; }
      th { background-color: #f0f0f0; border-bottom: 2px solid ${detailColor}; text-transform: uppercase; font-size: 8px; padding: 3px; }
      td { padding: 2px 3px; vertical-align: middle; }
      tr { page-break-inside: avoid; }
      .text-end { text-align: right; }
      .head-macro td { font-size: 10px; font-weight: 800; color: ${detailColor}; background-color: #fdfdfd; padding-top: 8px; border-bottom: 1px solid #ddd; }
      .head-cat td { font-weight: 700; color: #555; padding-left: 10px; background-color: #fff; font-style: italic; padding-top: 5px; }
      .head-sub td { font-weight: 600; color: #666; padding-left: 15px; }
      .row-cta td { font-size: 8.5px; color: #777; padding-left: 30px; background-color: #fafafa; border-bottom: 1px solid #f0f0f0; }
      .tot-sub td { font-weight: 600; font-style: italic; color: #555; border-top: 1px solid #eee; padding-left: 15px; background-color: #fff; }
      .tot-cat td { font-weight: 700; color: #333; background-color: #f8f9fa; border-top: 1px solid #999; padding-left: 10px; }
      .tot-macro td { font-weight: 800; color: #000; background-color: #f0f0f0; border-top: 1px solid #000; border-bottom: 3px double #000; padding-top: 4px; padding-bottom: 4px; }
      .row-simple td { padding-left: 20px; }
      .page-break { page-break-after: always; display: block; height: 1px; width: 100%; border: none; }
    </style>
  `;

    const tituloSufijo = this.config.verEnMiles ? '(M$)' : '($)';
    let headerHtml = `
      <thead>
        <tr>
          <th style="text-align:left">Concepto</th>
          <th class="text-end">${this.balanceData?.ejercicio} ${tituloSufijo}</th>
          <th class="text-end">${this.balanceAnteriorData?.ejercicio || 'Ant'} ${tituloSufijo}</th>`;
    if (showDiff) headerHtml += `<th class="text-end">Dif ${tituloSufijo}</th>`;
    if (showVar) headerHtml += `<th class="text-end">Var (%)</th>`;
    headerHtml += `</tr></thead>`;

    let fullContent = `<table>${headerHtml}<tbody>`;

    dataFiltrada.forEach((macro: any) => {
      fullContent += `<tr class="head-macro"><td colspan="${colSpan}">${macro.nombre.toUpperCase()}</td></tr>`;
      macro.categorias.forEach((cat: any) => {
        fullContent += `<tr class="head-cat"><td colspan="${colSpan}">${cat.categoria}</td></tr>`;
        cat.subcategorias.forEach((sub: any) => {
          const nomSub = this.config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;
          if (this.config.mostrarCuentas) {
            fullContent += `<tr class="head-sub"><td colspan="${colSpan}">${nomSub}</td></tr>`;
            sub.cuentas.forEach((cta: any) => {
              if (!this.config.incluirCuentasCero && cta.saldo === 0 && cta.saldoAnterior === 0) return;
              fullContent += `<tr class="row-cta">
                <td>${cta.num_cuenta} - ${cta.nombre}</td>
                <td class="text-end">${fmtNum(cta.saldo)}</td>
                <td class="text-end text-muted">${fmtNum(cta.saldoAnterior)}</td>`;
              if (showDiff) fullContent += `<td class="text-end">${fmtNum(cta.diferencia)}</td>`;
              if (showVar) fullContent += `<td class="text-end" style="${colorVar(cta.variacion)}">${fmtVar(cta.variacion)}</td>`;
              fullContent += `</tr>`;
            });
            fullContent += `<tr class="tot-sub">
              <td>Total ${sub.descripcion}</td>
              <td class="text-end">${fmtNum(sub.saldo)}</td>
              <td class="text-end text-muted">${fmtNum(sub.saldoAnterior)}</td>`;
            if (showDiff) fullContent += `<td class="text-end">${fmtNum(sub.diferencia)}</td>`;
            if (showVar) fullContent += `<td class="text-end" style="${colorVar(sub.variacion)}">${fmtVar(sub.variacion)}</td>`;
            fullContent += `</tr>`;
          } else {
            fullContent += `<tr class="row-simple">
              <td>${nomSub}</td>
              <td class="text-end">${fmtNum(sub.saldo)}</td>
              <td class="text-end text-muted">${fmtNum(sub.saldoAnterior)}</td>`;
            if (showDiff) fullContent += `<td class="text-end">${fmtNum(sub.diferencia)}</td>`;
            if (showVar) fullContent += `<td class="text-end" style="${colorVar(sub.variacion)}">${fmtVar(sub.variacion)}</td>`;
            fullContent += `</tr>`;
          }
        });
        fullContent += `<tr class="tot-cat">
          <td>TOTAL ${cat.categoria.toUpperCase()}</td>
          <td class="text-end">${fmtNum(cat.saldo)}</td>
          <td class="text-end text-muted">${fmtNum(cat.saldoAnterior)}</td>`;
        if (showDiff) fullContent += `<td class="text-end">${fmtNum(cat.diferencia)}</td>`;
        if (showVar) fullContent += `<td class="text-end" style="${colorVar(cat.variacion)}">${fmtVar(cat.variacion)}</td>`;
        fullContent += `</tr>`;
      });
      fullContent += `<tr class="tot-macro">
        <td>TOTAL ${macro.nombre.toUpperCase()}</td>
        <td class="text-end">${fmtNum(macro.saldo)}</td>
        <td class="text-end text-muted">${fmtNum(macro.saldoAnterior)}</td>`;
      if (showDiff) fullContent += `<td class="text-end">${fmtNum(macro.diferencia)}</td>`;
      if (showVar) fullContent += `<td class="text-end" style="${colorVar(macro.variacion)}">${fmtVar(macro.variacion)}</td>`;
      fullContent += `</tr><tr><td colspan="${colSpan}" style="height:30px"></td></tr>`;

      if (macro.nombre.toUpperCase().includes('PASIVO') && !macro.nombre.toUpperCase().includes('PATRIMONIO')) {
        fullContent += `</tbody></table>`;
        fullContent += `<div class="page-break"></div>`;
        fullContent += `<div style="margin-top:20px"></div><table>${headerHtml}<tbody>`;
      }
    });

    fullContent += `</tbody></table>`;

    const printHtml = `
    <html>
      <head><title>Comparativo</title>${styles}</head>
      <body>
        <div class="header">
          <h2>Comparativo Estados Financieros</h2>
          <p>${this.balanceData?.empresaDesc || ''}</p>
          <p>Comparando: <strong>${this.balanceData?.ejercicio}</strong> vs <strong>${this.balanceAnteriorData?.ejercicio || 'Anterior'}</strong></p>
        </div>
        ${fullContent}
        <div style="margin-top:20px; font-size:9px; color:#999; text-align:right;">Generado: ${new Date().toLocaleString('es-CL')}</div>
      </body>
    </html>`;

    this.rawPreviewHtml = printHtml;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(printHtml);
  }

  private _exportarExcelComparativo(): void {
    this.showSpinner = true;
    try {
      const { detailColor } = this.getPaletteColors();
      const detailColorHex = detailColor.replace('#', '');
      const usarRojo = this.config.colorTheme.includes('red');

      let excelNumFormat = '#,##0';
      if (this.config.estiloNegativo === 'parentesis') {
        excelNumFormat = usarRojo ? '#,##0;[Red](#,##0)' : '#,##0;(#,##0)';
      } else {
        excelNumFormat = usarRojo ? '#,##0;[Red]-#,##0' : '#,##0;-#,##0';
      }
      const percentFormat = '0.0%';

      const dataFiltrada = this.prepararDatosParaReporte(this.comparativeData, 'comparative');

      // --- ESTILOS CON FONDO BLANCO ---
      const bgWhite = { fgColor: { rgb: "FFFFFF" } };

      const styleMetaTitle = { font: { bold: true, sz: 12 }, fill: bgWhite };
      const styleMetaSub = { font: { bold: true, sz: 10 }, fill: bgWhite };

      const styleHeader = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: detailColorHex } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
      };

      const styleMacro = { font: { bold: true, color: { rgb: detailColorHex } }, fill: bgWhite };
      const styleCat = { font: { bold: true, color: { rgb: "444444" } }, fill: bgWhite };
      const styleCatTotal = { font: { bold: true }, border: { top: { style: 'thin' } }, fill: bgWhite };
      const styleSubNombre = { alignment: { indent: 1 }, fill: bgWhite };
      const styleSubNombreItalic = { alignment: { indent: 1 }, font: { italic: true }, fill: bgWhite };
      const styleSubTotal = { alignment: { indent: 1 }, font: { bold: true, italic: true }, border: { top: { style: 'thin' } }, fill: bgWhite };
      const styleCtaNombre = { alignment: { indent: 3 }, font: { color: { rgb: "777777" } }, fill: bgWhite };
      const styleCtaNum = { font: { color: { rgb: "777777" } }, fill: bgWhite };
      const styleMacroTotal = { font: { bold: true }, border: { top: { style: 'thin' }, bottom: { style: 'double' } }, fill: bgWhite };
      const styleNormalNum = { font: { italic: false }, fill: bgWhite };
      const styleEmpty = { fill: bgWhite };

      // --- CONFIGURACIÓN DE COLUMNAS Y HELPER DE RELLENO ---
      const numCols = 3 + (this.config.mostrarDiferencia ? 1 : 0) + (this.config.mostrarVariacion ? 1 : 0);
      const dataRows: any[] = [];

      const pushRow = (cells: any[]) => {
        const row = Array.from({ length: numCols }, () => ({ v: '', s: styleEmpty }));
        cells.forEach((cell, i) => { if (cell) row[i] = cell; });
        dataRows.push(row);
      };

      let dia = 'DD', mesStr = 'Mes', mesNum = 'MM', anio = 'AAAA';
      if (this.balanceData?.fecha_fin) {
        const f = new Date(this.balanceData.fecha_fin);
        const offset = f.getTimezoneOffset() * 60000;
        const localDate = new Date(f.getTime() + offset);
        dia = localDate.getDate().toString().padStart(2, '0');
        mesNum = (localDate.getMonth() + 1).toString().padStart(2, '0');
        anio = localDate.getFullYear().toString();
        const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        mesStr = meses[localDate.getMonth()];
      }

      const anioActual = this.balanceData?.ejercicio || 'Actual';
      const anioAnt = this.balanceAnteriorData?.ejercicio || 'Anterior';
      const tituloSufijo = this.config.verEnMiles ? '\n(M$)' : '';

      const nombreConjunto = this.balanceData?.nombre_conjunto || this.balanceData?.empresaDesc || 'Balance';
      const nombreEmpresa = this.balanceData?.id_empresa + ' - ' + this.balanceData?.empresaDesc || 'Ingresa empresa';
      pushRow([{ v: nombreConjunto, s: styleMetaTitle }]);
      pushRow([{ v: nombreEmpresa, s: styleMetaTitle }]);
      pushRow([{ v: `Estados Financieros Comparativos al ${dia} de ${mesStr} de ${anio} y ${anioAnt}`, s: styleMetaSub }]);
      pushRow([]);

      const headerRow = [
        { v: 'Concepto', s: styleHeader },
        { v: `Saldo al\n${dia}-${mesNum}-${anio}${tituloSufijo}`, s: styleHeader },
        { v: `Saldo al\n${dia}-${mesNum}-${anioAnt}${tituloSufijo}`, s: styleHeader }
      ];

      if (this.config.mostrarDiferencia) headerRow.push({ v: `Diferencia${tituloSufijo}`, s: styleHeader });
      if (this.config.mostrarVariacion) headerRow.push({ v: 'Variación %', s: styleHeader });

      pushRow(headerRow);

      const addRow = (nombre: string, saldo: number, ant: number, dif: number, vari: number, styleConcepto: any, isCuenta: boolean = false) => {
        const numStyle = isCuenta ? styleCtaNum : styleNormalNum;
        const cells: any[] = [
          { v: nombre, s: styleConcepto },
          { v: saldo, t: 'n', z: excelNumFormat, s: numStyle },
          { v: ant, t: 'n', z: excelNumFormat, s: numStyle }
        ];

        if (this.config.mostrarDiferencia) {
          cells.push({ v: dif, t: 'n', z: excelNumFormat, s: numStyle });
        }
        if (this.config.mostrarVariacion) {
          const colorVar = vari > 0 ? '008000' : (vari < 0 ? (usarRojo ? 'FF0000' : '000000') : '000000');
          // Al asignar un color específico, nos aseguramos de que el fondo siga siendo blanco
          cells.push({ v: vari / 100, t: 'n', z: percentFormat, s: { font: { color: { rgb: colorVar } }, fill: bgWhite } });
        }
        pushRow(cells);
      };

      dataFiltrada.forEach((macro: any) => {
        const esER = macro.nombre.toUpperCase().includes('RESULTADO') ||
          macro.nombre.toUpperCase().includes('GANANCIA') ||
          macro.nombre.toUpperCase().includes('PERDIDA');

        pushRow([{ v: macro.nombre.toUpperCase(), s: styleMacro }]);

        macro.categorias.forEach((cat: any) => {
          pushRow([{ v: cat.categoria, s: styleCat }]);

          cat.subcategorias.forEach((sub: any) => {
            const nombreSub = this.config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;
            if (!this.config.mostrarCuentas) {
              addRow(nombreSub, sub.saldo, sub.saldoAnterior, sub.diferencia, sub.variacion, styleSubNombre);
            } else {
              pushRow([{ v: nombreSub, s: styleSubNombreItalic }]);
              sub.cuentas.forEach((cta: any) => {
                if (!this.config.incluirCuentasCero && cta.saldo === 0 && cta.saldoAnterior === 0) return;
                addRow(`${cta.num_cuenta} - ${cta.nombre}`, cta.saldo, cta.saldoAnterior, cta.diferencia, cta.variacion, styleCtaNombre, true);
              });
              addRow(`Total ${sub.descripcion}`, sub.saldo, sub.saldoAnterior, sub.diferencia, sub.variacion, styleSubTotal);
            }
          });

          const textoTotalCat = esER ? cat.categoria : `TOTAL ${cat.categoria.toUpperCase()}`;
          addRow(textoTotalCat, cat.saldo, cat.saldoAnterior, cat.diferencia, cat.variacion, styleCatTotal);
        });

        if (!esER) {
          addRow(`TOTAL ${macro.nombre.toUpperCase()}`, macro.saldo, macro.saldoAnterior, macro.diferencia, macro.variacion, styleMacroTotal);
        }
        pushRow([]);
      });

      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(dataRows);
      const cols = [{ wch: 60 }, { wch: 15 }, { wch: 15 }];
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

  private hacerPositivoRecursivo(item: any) {
    if (item.saldo) item.saldo = Math.abs(item.saldo);
    if (item.categorias) item.categorias.forEach((cat: any) => this.hacerPositivoRecursivo(cat));
    if (item.subcategorias) item.subcategorias.forEach((sub: any) => this.hacerPositivoRecursivo(sub));
    if (item.cuentas) item.cuentas.forEach((cta: any) => this.hacerPositivoRecursivo(cta));
  }

  private hacerPositivoComparativoRecursivo(item: any) {
    if (item.saldo) item.saldo = Math.abs(item.saldo);
    if (item.saldoAnterior) item.saldoAnterior = Math.abs(item.saldoAnterior);
    if (item.diferencia) item.diferencia = Math.abs(item.diferencia);
    if (item.categorias) item.categorias.forEach((cat: any) => this.hacerPositivoComparativoRecursivo(cat));
    if (item.subcategorias) item.subcategorias.forEach((sub: any) => this.hacerPositivoComparativoRecursivo(sub));
    if (item.cuentas) item.cuentas.forEach((cta: any) => this.hacerPositivoComparativoRecursivo(cta));
  }
}