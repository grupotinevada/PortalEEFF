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
    // NUEVO FLAG
    verEnMiles: false
  };

  constructor(
    public activeModal: NgbActiveModal,
    private sanitizer: DomSanitizer
  ) {
  }

  //HELPER CENTRAL PARA TRUNCAMIENTO
  private _getValor(valor: number): number {
    if (!valor && valor !== 0) return 0;
    if (this.config.verEnMiles) {
      // Truncamiento estricto (no redondeo)
      return Math.trunc(valor / 1000);
    }
    return valor;
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

  get btnConfirmClass(): string {
    return this.type === 'print' ? 'btn-success' : 'btn-teal';
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

  private hacerPositivoRecursivo(item: any) {
    if (item.saldo) item.saldo = Math.abs(item.saldo);
    if (item.categorias) item.categorias.forEach((cat: any) => this.hacerPositivoRecursivo(cat));
    if (item.subcategorias) item.subcategorias.forEach((sub: any) => this.hacerPositivoRecursivo(sub));
  }


  actualizarPreview(): void {
    if (this.mode === 'comparative') {
      this._generarPreviewComparativo();
      return;
    }
    if (this.reportData.length === 0) return;

    const { detailColor, negativeColor } = this.getPaletteColors();
    let dataParaImprimir: IMacroCategoria[] = JSON.parse(JSON.stringify(this.reportData));

    dataParaImprimir.forEach(macro => {
      const esEstadoResultados = macro.nombre.toUpperCase().includes('RESULTADO') ||
        macro.nombre.toUpperCase().includes('GANANCIA') ||
        macro.nombre.toUpperCase().includes('PERDIDA');
      let debeSerAbsoluto = false;
      if (this.config.alcanceNegativos === 'absoluto') debeSerAbsoluto = true;
      else if (this.config.alcanceNegativos === 'auditoria' && !esEstadoResultados) debeSerAbsoluto = true;
      if (debeSerAbsoluto) this.hacerPositivoRecursivo(macro);
    });

    const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
    dataParaImprimir = dataParaImprimir.filter(macro => categoriasActivas.includes(macro.nombre));

    if (dataParaImprimir.length === 0) {
      const noDataHtml = `<div style="padding: 20px; text-align: center; color: #777;">Selecciona al menos una categoría.</div>`;
      this.rawPreviewHtml = noDataHtml;
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(noDataHtml);
      return;
    }

    let residuosHtml = '';
    if (this.config.verEnMiles) {
      const { desglose, totalActual } = this._calcularResiduosParaReporte(dataParaImprimir, 'standard');
      if (totalActual > 0) {
        let filasResiduos = '';
        desglose.forEach(item => {
          filasResiduos += `
            <tr>
              <td style="border-bottom: 1px solid #eee; color: #555;">${item.nombre}</td>
              <td class="text-end" style="border-bottom: 1px solid #eee; font-family: monospace;">${new Intl.NumberFormat('es-CL').format(item.actual)}</td>
            </tr>`;
        });
        residuosHtml = `
          <div style="margin-top: 5px; page-break-inside: avoid;">
            <h4 style="font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #ccc; margin-bottom: 5px;">Control de Residuos (M$)</h4>
            <table style="width: 70%; font-size: 9px;">
              <thead>
                <tr>
                  <th style="text-align: left; background: #f9f9f9; padding:2px;">Categoría</th>
                  <th class="text-end" style="background: #f9f9f9; padding:2px;">Res. Actual ($)</th>

                </tr>
              </thead>
              <tbody>
                ${filasResiduos}
                <tr>
                  <td style="font-weight: bold; border-top: 1px solid #333;">TOTAL OCULTO</td>
                  <td class="text-end" style="font-weight: bold; border-top: 1px solid #333; font-family: monospace;">${new Intl.NumberFormat('es-CL').format(totalActual)}</td>
                </tr>
              </tbody>
            </table>
            <p style="font-size: 9px; color: #777; margin-top: 5px;">* Estos montos son la suma de los decimales (cientos de pesos) no visualizados en el reporte principal.</p>
          </div>
        `;
      }
    }

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

    // Estilos CSS
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

    // HEADER DE LA TABLA (Lo guardamos para repetirlo)
    const tituloSufijo = this.config.verEnMiles ? '(Valores en M$)' : '($)';
    const tableHeaderHtml = `
      <thead>
        <tr>
          <th style="text-align:left;">Concepto</th>
          <th class="text-end" style="width: 140px;">Saldo ${tituloSufijo}</th>
        </tr>
      </thead>`;

    // Construcción del contenido
    let fullContent = `<table>${tableHeaderHtml}<tbody>`;

    dataParaImprimir.forEach((macro, index) => {
      fullContent += `<tr class="header-macro"><td colspan="2">${macro.nombre.toUpperCase()}</td></tr>`;

      macro.categorias.forEach((cat) => {
        fullContent += `<tr class="header-cat"><td colspan="2">${cat.categoria}</td></tr>`;
        cat.subcategorias.forEach((sub) => {
          const nombreSub = this.config.mostrarFsa ? `${sub.id_fsa} - ${sub.descripcion}` : sub.descripcion;
          if (this.config.mostrarCuentas) {
            fullContent += `<tr class="header-subcat"><td colspan="2">${nombreSub}</td></tr>`;
            let cuentasVisibles = sub.cuentas;
            if (!this.config.incluirCuentasCero) cuentasVisibles = cuentasVisibles.filter(c => c.saldo !== 0);

            cuentasVisibles.forEach(cuenta => {
              fullContent += `
              <tr class="row-cuenta">
                <td>${cuenta.num_cuenta} - ${cuenta.nombre}</td>
                <td class="text-end">${formatearNumero(this._getValor(cuenta.saldo))}</td>
              </tr>`;
            });

            fullContent += `
            <tr class="total-subcat">
              <td>Total ${sub.descripcion}</td>
              <td class="text-end">${formatearNumero(this._getValor(sub.saldo))}</td>
            </tr>`;
          } else {
            fullContent += `
            <tr class="row-simple-subcat">
              <td>${nombreSub}</td>
              <td class="text-end">${formatearNumero(this._getValor(sub.saldo))}</td>
            </tr>`;
          }
        });
        fullContent += `
        <tr class="total-cat">
          <td>TOTAL ${cat.categoria.toUpperCase()}</td>
          <td class="text-end">${formatearNumero(this._getValor(cat.saldo))}</td>
        </tr>`;
      });

      fullContent += `
      <tr class="total-macro">
        <td>TOTAL ${macro.nombre.toUpperCase()}</td>
        <td class="text-end">${formatearNumero(this._getValor(macro.saldo))}</td>
      </tr>
      <tr><td colspan="2" style="height: 30px;"></td></tr>`; // <-- AUMENTADO A 30PX

      // 🛑 LÓGICA DE CORTE DE PÁGINA (CORREGIDA) 🛑
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
        
        ${residuosHtml}<div class="footer"><p>Generado: ${fechaImpresion}</p></div>
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

      const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
      dataProcesada = dataProcesada.filter(macro => categoriasActivas.includes(macro.nombre));

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
              "Saldo": this._getValor(sub.saldo) // APLICAR _getValor
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
                  "Saldo": this._getValor(cuenta.saldo) // APLICAR _getValor
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
                "Saldo": this._getValor(sub.saldo) // APLICAR _getValor
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

    if (config.verEnMiles) {
      const { desglose, totalActual } = this._calcularResiduosParaReporte(data, 'standard');

      if (totalActual > 0) {
        // Estilos básicos para la tabla de control
        const sHeaderCtrl = { font: { bold: true, color: { rgb: "333333" } }, fill: { fgColor: { rgb: "F2F2F2" } }, border: { bottom: { style: 'thin' } } };
        const sRowCtrl = { font: { color: { rgb: "555555" } } };
        const sTotalCtrl = { font: { bold: true }, border: { top: { style: 'thin' } } };
        const fmtMoney = '#,##0';

        sheetData.push([]); // Espacio vacío
        sheetData.push([]);
        sheetData.push([{ v: 'CONTROL DE RESIDUOS (MILES)', s: { font: { bold: true, underline: true } } }]);
        sheetData.push([
          { v: 'Categoría', s: sHeaderCtrl },
          { v: 'Residuo ($)', s: sHeaderCtrl }
        ]);

        desglose.forEach(item => {
          sheetData.push([
            { v: item.nombre, s: sRowCtrl },
            { v: item.actual, t: 'n', z: fmtMoney, s: sRowCtrl }
          ]);
        });

        sheetData.push([
          { v: 'TOTAL OCULTO', s: sTotalCtrl },
          { v: totalActual, t: 'n', z: fmtMoney, s: sTotalCtrl }
        ]);
      }
    }

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
              { v: this._getValor(sub.saldo), t: 'n', z: numFormat, s: styleSubNum } // APLICAR _getValor
            ]);
          } else {
            sheetData.push([{ v: nombreSub, s: styleSubNombreItalic } as any]);
            let cuentasParaMostrar = sub.cuentas;
            if (!config.incluirCuentasCero) cuentasParaMostrar = cuentasParaMostrar.filter(c => c.saldo !== 0);

            cuentasParaMostrar.forEach(cuenta => {
              sheetData.push([
                { v: `${cuenta.num_cuenta} - ${cuenta.nombre}`, s: styleCtaNombre },
                { v: this._getValor(cuenta.saldo), t: 'n', z: numFormat, s: styleCtaNum } // APLICAR _getValor
              ]);
            });
            sheetData.push([
              { v: `Total ${sub.descripcion}`, s: styleSubTotal } as any,
              { v: this._getValor(sub.saldo), t: 'n', z: numFormat, s: styleSubTotal } as any // APLICAR _getValor
            ]);
          }
        });
        sheetData.push([
          { v: `TOTAL ${categoria.categoria.toUpperCase()}`, s: styleCatTotal } as any,
          { v: this._getValor(categoria.saldo), t: 'n', z: numFormat, s: styleCatTotal } as any // APLICAR _getValor
        ]);
      });
      sheetData.push([
        { v: `TOTAL ${macro.nombre.toUpperCase()}`, s: styleMacroTotal } as any,
        { v: this._getValor(macro.saldo), t: 'n', z: numFormat, s: styleMacroTotal } as any // APLICAR _getValor
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

  // ==========================================
  // 🔄 LÓGICA COMPARATIVA
  // ==========================================

  private _generarPreviewComparativo(): void {
    const { detailColor, negativeColor } = this.getPaletteColors();
    const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
    let dataClonada = JSON.parse(JSON.stringify(this.comparativeData));
    let dataFiltrada = dataClonada.filter((m: any) => categoriasActivas.includes(m.nombre));

    if (dataFiltrada.length === 0) {
      const noDataHtml = `<div style="padding: 20px; text-align: center;">Sin datos.</div>`;
      this.rawPreviewHtml = noDataHtml;
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(noDataHtml);
      return;
    }

    dataFiltrada.forEach((macro: any) => {
      const esER = macro.nombre.toUpperCase().includes('RESULTADO') || macro.nombre.toUpperCase().includes('GANANCIA') || macro.nombre.toUpperCase().includes('PERDIDA');
      let abs = this.config.alcanceNegativos === 'absoluto' || (this.config.alcanceNegativos === 'auditoria' && !esER);
      if (abs) this.hacerPositivoComparativoRecursivo(macro);
    });

    // Residuos
    let residuosHtml = '';
    if (this.config.verEnMiles) {
      const { desglose, totalActual, totalAnterior } = this._calcularResiduosParaReporte(dataFiltrada, 'comparative');
      if (totalActual > 0 || totalAnterior > 0) {
        let filas = '';
        desglose.forEach(item => {
          filas += `
            <tr>
              <td style="border-bottom: 1px solid #eee;">${item.nombre}</td>
              <td class="text-end" style="border-bottom: 1px solid #eee; font-family: monospace;">${new Intl.NumberFormat('es-CL').format(item.actual)}</td>
              <td class="text-end text-muted" style="border-bottom: 1px solid #eee; font-family: monospace;">${new Intl.NumberFormat('es-CL').format(item.anterior)}</td>
            </tr>`;
        });
        residuosHtml = `
          <div style="margin-top: 25px; page-break-inside: avoid;">
            <h4 style="font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #ccc; margin-bottom: 5px;">Control de Residuos (M$)</h4>
            <table style="width: 70%; font-size: 9px;">
              <thead>
                <tr>
                  <th style="text-align: left; background: #f9f9f9; padding:2px;">Categoría</th>
                  <th class="text-end" style="background: #f9f9f9; padding:2px;">Res. Actual ($)</th>
                  <th class="text-end" style="background: #f9f9f9; padding:2px;">Res. Ant. ($)</th>
                </tr>
              </thead>
              <tbody>
                ${filas}
                <tr>
                  <td style="font-weight: bold; border-top: 1px solid #333;">TOTAL OCULTO</td>
                  <td class="text-end" style="font-weight: bold; border-top: 1px solid #333; font-family: monospace;">${new Intl.NumberFormat('es-CL').format(totalActual)}</td>
                  <td class="text-end" style="font-weight: bold; border-top: 1px solid #333; font-family: monospace; color: #777;">${new Intl.NumberFormat('es-CL').format(totalAnterior)}</td>
                </tr>
              </tbody>
            </table>
            <p style="font-size: 9px; color: #777; margin-top: 5px;">* Estos montos son la suma de los decimales (cientos de pesos) no visualizados en el reporte principal.</p>
          </div>
        `;
      }
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

    // Estilos CSS
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
      /* CLASE PARA SALTO DE PÁGINA FORZADO */
      .page-break { page-break-after: always; display: block; height: 1px; width: 100%; border: none; }
    </style>
  `;

    // HEADER DE LA TABLA (Lo guardamos para repetirlo)
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

    // Construcción del contenido
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
                <td class="text-end">${fmtNum(this._getValor(cta.saldo))}</td>
                <td class="text-end text-muted">${fmtNum(this._getValor(cta.saldoAnterior))}</td>`;
              if (showDiff) fullContent += `<td class="text-end">${fmtNum(this._getValor(cta.diferencia))}</td>`;
              if (showVar) fullContent += `<td class="text-end" style="${colorVar(cta.variacion)}">${fmtVar(cta.variacion)}</td>`;
              fullContent += `</tr>`;
            });
            fullContent += `<tr class="tot-sub">
              <td>Total ${sub.descripcion}</td>
              <td class="text-end">${fmtNum(this._getValor(sub.saldo))}</td>
              <td class="text-end text-muted">${fmtNum(this._getValor(sub.saldoAnterior))}</td>`;
            if (showDiff) fullContent += `<td class="text-end">${fmtNum(this._getValor(sub.diferencia))}</td>`;
            if (showVar) fullContent += `<td class="text-end" style="${colorVar(sub.variacion)}">${fmtVar(sub.variacion)}</td>`;
            fullContent += `</tr>`;
          } else {
            fullContent += `<tr class="row-simple">
              <td>${nomSub}</td>
              <td class="text-end">${fmtNum(this._getValor(sub.saldo))}</td>
              <td class="text-end text-muted">${fmtNum(this._getValor(sub.saldoAnterior))}</td>`;
            if (showDiff) fullContent += `<td class="text-end">${fmtNum(this._getValor(sub.diferencia))}</td>`;
            if (showVar) fullContent += `<td class="text-end" style="${colorVar(sub.variacion)}">${fmtVar(sub.variacion)}</td>`;
            fullContent += `</tr>`;
          }
        });
        fullContent += `<tr class="tot-cat">
          <td>TOTAL ${cat.categoria.toUpperCase()}</td>
          <td class="text-end">${fmtNum(this._getValor(cat.saldo))}</td>
          <td class="text-end text-muted">${fmtNum(this._getValor(cat.saldoAnterior))}</td>`;
        if (showDiff) fullContent += `<td class="text-end">${fmtNum(this._getValor(cat.diferencia))}</td>`;
        if (showVar) fullContent += `<td class="text-end" style="${colorVar(cat.variacion)}">${fmtVar(cat.variacion)}</td>`;
        fullContent += `</tr>`;
      });
      fullContent += `<tr class="tot-macro">
        <td>TOTAL ${macro.nombre.toUpperCase()}</td>
        <td class="text-end">${fmtNum(this._getValor(macro.saldo))}</td>
        <td class="text-end text-muted">${fmtNum(this._getValor(macro.saldoAnterior))}</td>`;
      if (showDiff) fullContent += `<td class="text-end">${fmtNum(this._getValor(macro.diferencia))}</td>`;
      if (showVar) fullContent += `<td class="text-end" style="${colorVar(macro.variacion)}">${fmtVar(macro.variacion)}</td>`;
      fullContent += `</tr><tr><td colspan="${colSpan}" style="height:30px"></td></tr>`; // <-- AUMENTADO A 30PX

      // 🛑 LÓGICA DE CORTE DE PÁGINA (CORREGIDA) 🛑
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
        ${residuosHtml}<div style="margin-top:20px; font-size:9px; color:#999; text-align:right;">Generado: ${new Date().toLocaleString('es-CL')}</div>
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

      const categoriasActivas = this.config.categoriasSeleccionadas.filter(c => c.selected).map(c => c.nombre);
      let dataClonada = JSON.parse(JSON.stringify(this.comparativeData));
      let dataFiltrada = dataClonada.filter((m: any) => categoriasActivas.includes(m.nombre));

      dataFiltrada.forEach((macro: any) => {
        const esER = macro.nombre.toUpperCase().includes('RESULTADO') ||
          macro.nombre.toUpperCase().includes('GANANCIA') ||
          macro.nombre.toUpperCase().includes('PERDIDA');
        let abs = this.config.alcanceNegativos === 'absoluto' || (this.config.alcanceNegativos === 'auditoria' && !esER);
        if (abs) this.hacerPositivoComparativoRecursivo(macro);
      });



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
        // APLICAR _getValor en saldo, ant, dif
        const row: any[] = [
          { v: nombre, s: styleName },
          { v: tipo },
          { v: this._getValor(saldo), t: 'n', z: excelNumFormat },
          { v: this._getValor(ant), t: 'n', z: excelNumFormat }
        ];

        if (this.config.mostrarDiferencia) {
          row.push({ v: this._getValor(dif), t: 'n', z: excelNumFormat });
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
      if (this.config.verEnMiles) {
        const { desglose, totalActual, totalAnterior } = this._calcularResiduosParaReporte(dataFiltrada, 'comparative');

        if (totalActual > 0 || totalAnterior > 0) {
          const sHead = { font: { bold: true }, fill: { fgColor: { rgb: "F2F2F2" } } };
          const sTot = { font: { bold: true }, border: { top: { style: 'thin' } } };
          const fmt = '#,##0';

          dataRows.push([]);
          dataRows.push([]);
          dataRows.push([{ v: 'CONTROL DE RESIDUOS (MILES)', s: { font: { bold: true } } }]);

          dataRows.push([
            { v: 'Categoría', s: sHead },
            { v: '', s: sHead }, // Columna Tipo vacía
            { v: 'Res. Actual ($)', s: sHead },
            { v: 'Res. Ant. ($)', s: sHead }
          ]);

          desglose.forEach(item => {
            dataRows.push([
              { v: item.nombre },
              { v: '' },
              { v: item.actual, t: 'n', z: fmt },
              { v: item.anterior, t: 'n', z: fmt }
            ]);
          });

          dataRows.push([
            { v: 'TOTAL OCULTO', s: sTot },
            { v: '', s: sTot },
            { v: totalActual, t: 'n', z: fmt, s: sTot },
            { v: totalAnterior, t: 'n', z: fmt, s: sTot }
          ]);
        }
      }

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

  private hacerPositivoComparativoRecursivo(item: any) {
    if (item.saldo) item.saldo = Math.abs(item.saldo);
    if (item.saldoAnterior) item.saldoAnterior = Math.abs(item.saldoAnterior);
    if (item.diferencia) item.diferencia = Math.abs(item.diferencia);
    if (item.categorias) item.categorias.forEach((cat: any) => this.hacerPositivoComparativoRecursivo(cat));
    if (item.subcategorias) item.subcategorias.forEach((sub: any) => this.hacerPositivoComparativoRecursivo(sub));
    if (item.cuentas) item.cuentas.forEach((cta: any) => this.hacerPositivoComparativoRecursivo(cta));
  }


  private _calcularResiduosParaReporte(dataFiltrada: any[], mode: 'standard' | 'comparative') {
    const desglose: { nombre: string; actual: number; anterior: number }[] = [];
    let totalActual = 0;
    let totalAnterior = 0;

    dataFiltrada.forEach(macro => {
      macro.categorias.forEach((grupo: any) => {
        let catResActual = 0;
        let catResAnterior = 0;

        grupo.subcategorias.forEach((sub: any) => {
          sub.cuentas.forEach((cuenta: any) => {
            // MODO STANDARD (Solo Actual)
            if (mode === 'standard') {
              const saldoAbs = Math.abs(cuenta.saldo);
              const visual = Math.trunc(saldoAbs / 1000);
              catResActual += (saldoAbs - (visual * 1000));
            }
            // MODO COMPARATIVE (Actual + Anterior)
            else {
              const saldoActualAbs = Math.abs(cuenta.saldo);
              const visualActual = Math.trunc(saldoActualAbs / 1000);
              catResActual += (saldoActualAbs - (visualActual * 1000));

              const saldoAntAbs = Math.abs(cuenta.saldoAnterior || 0);
              const visualAnt = Math.trunc(saldoAntAbs / 1000);
              catResAnterior += (saldoAntAbs - (visualAnt * 1000));
            }
          });
        });

        // Si hay residuo, lo agregamos al desglose
        if (catResActual > 0 || catResAnterior > 0) {
          desglose.push({
            nombre: grupo.categoria,
            actual: catResActual,
            anterior: catResAnterior
          });
        }
        totalActual += catResActual;
        totalAnterior += catResAnterior;
      });
    });

    // Ordenar por mayor residuo actual
    desglose.sort((a, b) => b.actual - a.actual);

    return { desglose, totalActual, totalAnterior };
  }
}