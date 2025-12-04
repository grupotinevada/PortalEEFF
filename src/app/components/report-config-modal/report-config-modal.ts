import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { IReportConfig } from '../../models/report-config-modal';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import Swal from 'sweetalert2';
import { IBalanceGet, IMacroCategoria, IMacroCategoriaComparativa } from '../../models/balance.model';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-report-config-modal',
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
  ) {
  }

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
    // Si es blanco y negro, usamos 'dark' para el header del modal, o lo dejamos en success/teal
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

    dataProcesada.forEach((macro: any) => {
      const esER = macro.nombre.toUpperCase().includes('RESULTADO') ||
        macro.nombre.toUpperCase().includes('GANANCIA') ||
        macro.nombre.toUpperCase().includes('PERDIDA');
      let debeSerAbsoluto = false;
      if (this.config.alcanceNegativos === 'absoluto') debeSerAbsoluto = true;
      else if (this.config.alcanceNegativos === 'auditoria' && !esER) debeSerAbsoluto = true;

      if (debeSerAbsoluto) {
        if (mode === 'standard') this.hacerPositivoRecursivo(macro);
        else this.hacerPositivoComparativoRecursivo(macro);
      }
    });

    if (this.config.verEnMiles) {
      if (mode === 'standard') {
        this.aplicarTransformacionMilesStandard(dataProcesada);
      } else {
        this.aplicarTransformacionMilesComparativa(dataProcesada);
      }
    }

    return dataProcesada;
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

  private aplicarTransformacionMilesStandard(nodos: any[]): void {
    this.ejecutarWaterfallStandard(nodos);
    this.sobreescribirSaldosStandard(nodos);
  }

  private ejecutarWaterfallStandard(nodos: any[]): void {
    nodos.forEach(nodo => {
      nodo.saldoMiles = Math.round(nodo.saldo / 1000);

      let hijos: any[] = [];
      if (nodo.categorias) hijos = nodo.categorias;
      else if (nodo.subcategorias) hijos = nodo.subcategorias;
      else if (nodo.cuentas) hijos = nodo.cuentas;

      if (hijos.length > 0) {
        this.distribuirAjusteStandard(nodo, hijos);
        this.ejecutarWaterfallStandard(hijos);
      }
    });
  }

  private distribuirAjusteStandard(padre: any, hijos: any[]): void {
    let sumaHijos = 0;
    hijos.forEach(hijo => {
      hijo.saldoMiles = Math.round(hijo.saldo / 1000);
      sumaHijos += hijo.saldoMiles;
    });

    const diferencia = padre.saldoMiles - sumaHijos;

    if (diferencia !== 0) {
      const hijoCandidato = hijos.reduce((prev, current) =>
        (Math.abs(current.saldo) > Math.abs(prev.saldo) ? current : prev)
      );
      hijoCandidato.saldoMiles += diferencia;
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

  private aplicarTransformacionMilesComparativa(nodos: any[]): void {
    this.ejecutarWaterfallComparativo(nodos, 'saldo', 'saldoMiles');
    this.ejecutarWaterfallComparativo(nodos, 'saldoAnterior', 'saldoAnteriorMiles');
    this.calcularDiferenciasHorizontales(nodos);
    this.sobreescribirSaldosComparativos(nodos);
  }

  private ejecutarWaterfallComparativo(nodos: any[], campoOrigen: string, campoDestino: string): void {
    nodos.forEach(nodo => {
      nodo[campoDestino] = Math.round(nodo[campoOrigen] / 1000);

      let hijos: any[] = [];
      if (nodo.categorias) hijos = nodo.categorias;
      else if (nodo.subcategorias) hijos = nodo.subcategorias;
      else if (nodo.cuentas) hijos = nodo.cuentas;

      if (hijos.length > 0) {
        this.distribuirAjusteComparativo(nodo, hijos, campoOrigen, campoDestino);
        this.ejecutarWaterfallComparativo(hijos, campoOrigen, campoDestino);
      }
    });
  }

  private distribuirAjusteComparativo(padre: any, hijos: any[], campoOrigen: string, campoDestino: string): void {
    let sumaHijos = 0;
    hijos.forEach(hijo => {
      hijo[campoDestino] = Math.round(hijo[campoOrigen] / 1000);
      sumaHijos += hijo[campoDestino];
    });

    const diferencia = padre[campoDestino] - sumaHijos;

    if (diferencia !== 0) {
      const hijoCandidato = hijos.reduce((prev, current) =>
        (Math.abs(current[campoOrigen]) > Math.abs(prev[campoOrigen]) ? current : prev)
      );
      hijoCandidato[campoDestino] += diferencia;
    }
  }

  private calcularDiferenciasHorizontales(nodos: any[]): void {
    nodos.forEach(nodo => {
      nodo.diferenciaMiles = (nodo.saldoMiles ?? 0) - (nodo.saldoAnteriorMiles ?? 0);
      nodo.variacionMiles = this.calcularVariacion(nodo.saldoMiles ?? 0, nodo.saldoAnteriorMiles ?? 0);

      if (nodo.categorias) this.calcularDiferenciasHorizontales(nodo.categorias);
      if (nodo.subcategorias) this.calcularDiferenciasHorizontales(nodo.subcategorias);
      if (nodo.cuentas) this.calcularDiferenciasHorizontales(nodo.cuentas);
    });
  }

  private calcularVariacion(actual: number, anterior: number): number {
    if (anterior === 0) return actual === 0 ? 0 : 999999;
    return ((actual - anterior) / anterior) * 100;
  }

  private sobreescribirSaldosComparativos(nodos: any[]): void {
    nodos.forEach(nodo => {
      if (nodo.saldoMiles !== undefined) nodo.saldo = nodo.saldoMiles;
      if (nodo.saldoAnteriorMiles !== undefined) nodo.saldoAnterior = nodo.saldoAnteriorMiles;
      if (nodo.diferenciaMiles !== undefined) nodo.diferencia = nodo.diferenciaMiles;
      if (nodo.variacionMiles !== undefined) nodo.variacion = nodo.variacionMiles;

      if (nodo.categorias) this.sobreescribirSaldosComparativos(nodo.categorias);
      if (nodo.subcategorias) this.sobreescribirSaldosComparativos(nodo.subcategorias);
      if (nodo.cuentas) this.sobreescribirSaldosComparativos(nodo.cuentas);
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

  private _crearHojaDisenoFinal(
    data: IMacroCategoria[],
    config: IReportConfig,
    numFormat: string,
    colorHex: string
  ): XLSX.WorkSheet {

    const sheetData: any[] = [];
    const styleHeader = { font: { bold: true, color: { rgb: colorHex } }, border: { bottom: { style: 'medium', color: { rgb: colorHex } } } };
    const styleMacro = { font: { bold: true, color: { rgb: colorHex } } };
    const styleCat = { font: { bold: true, color: { rgb: "444444" } } };
    const styleCatTotal = { font: { bold: true }, border: { top: { style: 'thin' } } };
    const styleSubNombre = { alignment: { indent: 1 } };
    const styleSubNum = { font: { italic: false } };
    const styleSubNombreItalic = { alignment: { indent: 1 }, font: { italic: true } };
    const styleSubTotal = { alignment: { indent: 1 }, font: { italic: true }, border: { top: { style: 'thin' } } };
    const styleCtaNombre = { alignment: { indent: 3 }, font: { color: { rgb: "777777" } } };
    const styleCtaNum = { font: { color: { rgb: "777777" } } };
    const styleMacroTotal = { font: { bold: true }, border: { top: { style: 'thin' }, bottom: { style: 'double' } } };

    const tituloSaldo = this.config.verEnMiles ? 'Saldo (M$)' : 'Saldo';

    sheetData.push([
      { v: 'Concepto', s: styleHeader } as any,
      { v: tituloSaldo, s: styleHeader } as any
    ]);

    data.forEach(macro => {
      sheetData.push([{ v: macro.nombre.toUpperCase(), s: styleMacro } as any]);
      macro.categorias.forEach(categoria => {
        sheetData.push([
          { v: categoria.categoria, s: styleCat } as any,
          { v: '', s: styleCat } as any
        ]);

        categoria.subcategorias.forEach(sub => {
          const nombreSub = config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;
          if (!config.mostrarCuentas) {
            sheetData.push([
              { v: nombreSub, s: styleSubNombre },
              { v: sub.saldo, t: 'n', z: numFormat, s: styleSubNum }
            ]);
          } else {
            sheetData.push([{ v: nombreSub, s: styleSubNombreItalic } as any]);
            let cuentasParaMostrar = sub.cuentas;
            if (!config.incluirCuentasCero) cuentasParaMostrar = cuentasParaMostrar.filter(c => c.saldo !== 0);

            cuentasParaMostrar.forEach(cuenta => {
              sheetData.push([
                { v: `${cuenta.num_cuenta} - ${cuenta.nombre}`, s: styleCtaNombre },
                { v: cuenta.saldo, t: 'n', z: numFormat, s: styleCtaNum }
              ]);
            });
            sheetData.push([
              { v: `Total ${sub.descripcion}`, s: styleSubTotal } as any,
              { v: sub.saldo, t: 'n', z: numFormat, s: styleSubTotal } as any
            ]);
          }
        });
        sheetData.push([
          { v: `TOTAL ${categoria.categoria.toUpperCase()}`, s: styleCatTotal } as any,
          { v: categoria.saldo, t: 'n', z: numFormat, s: styleCatTotal } as any
        ]);
      });
      sheetData.push([
        { v: `TOTAL ${macro.nombre.toUpperCase()}`, s: styleMacroTotal } as any,
        { v: macro.saldo, t: 'n', z: numFormat, s: styleMacroTotal } as any
      ]);
      sheetData.push([]);
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

      const anioActual = this.balanceData?.ejercicio || 'Actual';
      const anioAnt = this.balanceAnteriorData?.ejercicio || 'Anterior';
      const tituloSufijo = this.config.verEnMiles ? '(M$)' : '($)';

      const headerRow = [
        { v: 'Concepto', s: { font: { bold: true, color: { rgb: detailColorHex } }, border: { bottom: { style: 'medium', color: { rgb: detailColorHex } } } } },
        { v: 'Tipo', s: { font: { bold: true } } },
        { v: `Saldo ${anioActual} ${tituloSufijo}`, s: { font: { bold: true } } },
        { v: `Saldo ${anioAnt} ${tituloSufijo}`, s: { font: { bold: true } } }
      ];

      if (this.config.mostrarDiferencia) headerRow.push({ v: `Diferencia ${tituloSufijo}`, s: { font: { bold: true } } });
      if (this.config.mostrarVariacion) headerRow.push({ v: 'Variación %', s: { font: { bold: true } } });

      const dataRows: any[] = [];
      dataRows.push(headerRow);

      const addRow = (nombre: string, tipo: string, saldo: number, ant: number, dif: number, vari: number, styleName: any) => {
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
          row.push({ v: vari / 100, t: 'n', z: percentFormat, s: { font: { color: { rgb: colorVar } } } });
        }
        dataRows.push(row);
      };

      const styleMacro = { font: { bold: true, color: { rgb: detailColorHex } } };
      const styleCat = { font: { bold: true } };
      const styleSub = { alignment: { indent: 1 } };
      const styleCta = { alignment: { indent: 2 }, font: { color: { rgb: "777777" } } };

      dataFiltrada.forEach((macro: any) => {
        addRow(macro.nombre.toUpperCase(), 'MACRO', macro.saldo, macro.saldoAnterior, macro.diferencia, macro.variacion, styleMacro);
        macro.categorias.forEach((cat: any) => {
          addRow(`  ${cat.categoria}`, 'CATEGORIA', cat.saldo, cat.saldoAnterior, cat.diferencia, cat.variacion, styleCat);
          cat.subcategorias.forEach((sub: any) => {
            const nombreSub = this.config.mostrarFsa ? `(${sub.id_fsa}) ${sub.descripcion}` : sub.descripcion;
            if (!this.config.mostrarCuentas) {
              addRow(`    ${nombreSub}`, 'RUBRO', sub.saldo, sub.saldoAnterior, sub.diferencia, sub.variacion, styleSub);
            } else {
              dataRows.push([{ v: `    ${nombreSub}`, s: { font: { italic: true } } }]);
              sub.cuentas.forEach((cta: any) => {
                if (!this.config.incluirCuentasCero && cta.saldo === 0 && cta.saldoAnterior === 0) return;
                addRow(`      ${cta.num_cuenta} - ${cta.nombre}`, 'CUENTA', cta.saldo, cta.saldoAnterior, cta.diferencia, cta.variacion, styleCta);
              });
              addRow(`      Total ${sub.descripcion}`, 'TOTAL RUBRO', sub.saldo, sub.saldoAnterior, sub.diferencia, sub.variacion, { font: { italic: true }, border: { top: { style: 'thin' } } });
            }
          });
        });
        dataRows.push([]);
      });

      const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(dataRows);
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

  private hacerPositivoRecursivo(item: any) {
    if (item.saldo) item.saldo = Math.abs(item.saldo);
    if (item.categorias) item.categorias.forEach((cat: any) => this.hacerPositivoRecursivo(cat));
    if (item.subcategorias) item.subcategorias.forEach((sub: any) => this.hacerPositivoRecursivo(sub));
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