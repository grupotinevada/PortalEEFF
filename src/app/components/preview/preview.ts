import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { mapping } from '../../models/mapping.model';
import { MappingService } from '../../services/mapping.service';
import { BalanceService } from '../../services/balance.service';
import Swal from 'sweetalert2';

import { AuthService } from '../../services/auth.service';
import { DefaultMappingService } from '../../services/default-mapping.service';
import { IDefaultMapping } from '../../models/balance.model';
import { Router } from '@angular/router';
import { Spinner } from '../spinner/spinner';
import { PreviewFileService } from '../../services/preview-fie';
import { Navbar } from '../navbar/navbar';
import { Console } from 'console';
import { EmpresaService } from '../../services/empresa.service';
import { IEmpresa } from '../../models/empresa.model';

@Component({
  selector: 'app-preview',
  imports: [CommonModule, FormsModule, Spinner, Navbar],
  templateUrl: './preview.html',
  styleUrls: ['./preview.css'],
})
export class Preview implements OnInit {
  tableData: any[] = [];
  headers: string[] = [];
  csvContent = '';
  processed = false;
  originalTableData: any[] = [];
  originalHeaders: string[] = [];
  totalDeudor: number = 0;
  totalAcreedor: number = 0;
  resultadoSaldo: number = 0;

  fechaSeleccionada: string = ''; // este será el formato 'YYYY-01-01'
  listaAnios: number[] = [];
  msgError: string = '';
  mappings: mapping[] = [];
  selectedMapping: string = '';
  showSpinner: boolean = false;
  defaultMappings: IDefaultMapping[] = [];

  cuentasNoMapeadas: string[] = [];
  msgWarning: string = '';
  file!: File | null;

  nombreBalance: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';

  anioSeleccionado: number| string | null = null;    //ejercicio

  fechaInicioValidar: string | null = null;
  fechaFinValidar: string  | null = null;
  ejercicioValidar: string  | null = null;
  
  archivoCargado = false; //bandera

  id_estado: string = '1'; 

  empresas: IEmpresa[] = [];
  selectedEmpresa: string = '';
  constructor(
    private mappingService: MappingService,
    private balanceService: BalanceService,
    private authService: AuthService,
    private DefaultMappingService: DefaultMappingService,
    private router: Router,
    private previewFileService: PreviewFileService,
    private empresaService: EmpresaService
  ) { }

  ngOnInit(): void {

    this.selectedMapping = '';
    this.cargarSelectMappings();
    this.cargarEmpresas();
    this.cargarTodosLosMapping();
    console.log('empresas', this.empresas);
    const currentYear = new Date().getFullYear();
    this.listaAnios = Array.from({ length: 10 }, (_, i) => currentYear - i);

    this.file = this.previewFileService.getFile();

    if (!this.file) {
      console.error('No se encontró archivo');
      this.msgError = 'No se encontró el archivo cargado.';
      this.router.navigate(['home']);
      return;
    }

    this.readHtmlFile(this.file);
  }


  private cargarTodosLosMapping() {
    this.authService.checkAuth().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          this.DefaultMappingService.getAll().subscribe({
            next: (res) => {
              // ✅ Corregido: acceder al array real en "res.data"
              this.defaultMappings = res.data ?? [];
              console.log('[DEBUG]funcion cargarMapping - Mappings cargados:', this.defaultMappings);

            },
            error: (err) => {
              console.error('Error al obtener defaultMappings:', err);
              this.defaultMappings = [];
            },
          });
        } else {
          this.msgError = 'Usuario no autenticado';
        }
      },
      error: () => {
        this.msgError = 'Error al verificar autenticación';
      },
    });
  }

  private cargarEmpresas() {
    this.authService.checkAuth().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          this.empresaService.getEmpresas().subscribe({
            next: (res) => {
              if (res.success) {
                this.empresas = res.data;
              } else {
                console.warn('Error al obtener empresas');
              }
            },
            error: (err) => console.error('Error de API', err),
          });
        } else {
          this.msgError = 'Usuario no autenticado';
        }
      },
      error: () => {
        this.msgError = 'Error al verificar autenticación';
      },
    });
  }




  private cargarSelectMappings() {
    this.authService.checkAuth().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          this.mappingService.getMappings().subscribe({
            next: (res) => {
              if (res.success) {
                this.mappings = res.data;
                console.log('[DEBUG]funcion cargarMappings - Mappings cargados:', this.mappings);
              } else {
                console.warn('Error al obtener mappings');
              }
            },
            error: (err) => console.error('Error de API', err),
          });
        } else {
          this.msgError = 'Usuario no autenticado';
        }
      },
      error: () => {
        this.msgError = 'Error al verificar autenticación';
      },
    });
  }



private extractPeriodoDesdeHtml(doc: Document): {
  fechaInicioVal: string | null;
  fechaFinVal: string | null;
  ejercicioVal: string | null;
} {
  const nobrElements = doc.querySelectorAll('nobr');

  for (const nobr of Array.from(nobrElements)) {
    let texto = nobr.textContent ?? '';
    // Reemplazar &nbsp; y múltiples espacios
    texto = texto.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

    const match = texto.match(
      /Desde\s+(\d{1,2})\s*-\s*([A-Za-zñÑáéíóúÁÉÍÓÚ]+)\s+al\s+(\d{1,2})\s*-\s*([A-Za-zñÑáéíóúÁÉÍÓÚ]+)\s+(\d{4})/
    );

    if (match) {
      const diaInicio = match[1].padStart(2, '0');
      const mesInicio = match[2];
      const diaFin = match[3].padStart(2, '0');
      const mesFin = match[4];
      const anio = match[5];

      const meses: Record<string, string> = {
        enero: '01',
        febrero: '02',
        marzo: '03',
        abril: '04',
        mayo: '05',
        junio: '06',
        julio: '07',
        agosto: '08',
        septiembre: '09',
        setiembre: '09',
        octubre: '10',
        noviembre: '11',
        diciembre: '12'
      };

      const mesInicioNum = meses[mesInicio.toLowerCase()];
      const mesFinNum = meses[mesFin.toLowerCase()];

      if (!mesInicioNum || !mesFinNum) break;

      const fechaInicioVal = `${anio}-${mesInicioNum}-${diaInicio}`;
      const fechaFinVal = `${anio}-${mesFinNum}-${diaFin}`;
      const ejercicioVal = anio;

      return { fechaInicioVal, fechaFinVal, ejercicioVal };
    }
  }

  return { fechaInicioVal: null, fechaFinVal: null, ejercicioVal: null };
}



private readHtmlFile(file: File): void {
  const reader = new FileReader();

  reader.onload = () => {
    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(reader.result as ArrayBuffer);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Usar función auxiliar para extraer fechas
    const { fechaInicioVal, fechaFinVal, ejercicioVal } =
      this.extractPeriodoDesdeHtml(doc);

    this.fechaInicioValidar = fechaInicioVal;
    this.fechaFinValidar = fechaFinVal;
    this.ejercicioValidar = ejercicioVal;
    this.archivoCargado = true;


    console.log("fechas recuperadas del archivo", this.fechaInicioValidar , this.fechaFinValidar, this.ejercicioValidar )
    const allRows = Array.from(doc.querySelectorAll('table.list tr'));
    const rows: string[][] = [];

    allRows.forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll('td,th'));
      const texts = cells.map(
        (td) => td.textContent?.replace(/\s+/g, ' ').trim() ?? ''
      );
      if (texts.filter((t) => t).length > 1) rows.push(texts);
    });

    if (rows.length === 0) return;

    const headerIndices = rows
      .map((row, index) => ({ row, index }))
      .filter((item) => item.row[0].toLowerCase().includes('codigo'))
      .map((item) => item.index);

    if (headerIndices.length === 0) return;

    const firstHeaderIndex = headerIndices[0];
    this.headers = rows[firstHeaderIndex];

    const allDataRows: string[][] = [];

    for (let i = 0; i < headerIndices.length; i++) {
      const currentHeaderIndex = headerIndices[i];
      const nextHeaderIndex = headerIndices[i + 1];
      const startIndex = currentHeaderIndex + 1;
      const endIndex = nextHeaderIndex ?? rows.length;

      const segmentDataRows = rows
        .slice(startIndex, endIndex)
        .filter((row) => {
          const firstCell = row[0]?.toLowerCase().trim() ?? '';
          const secondCell = row[1]?.toLowerCase().trim() ?? '';
          return (
            !row[0].toLowerCase().includes('codigo') &&
            !(firstCell === 'cuenta' && secondCell === 'acumulado')
          );
        });

      allDataRows.push(...segmentDataRows);
    }

    const normalizedRows = allDataRows.map((row) => {
      const filledRow = [...row];
      for (let i = 0; i < this.headers.length; i++) {
        if (!filledRow[i] || filledRow[i].trim() === '') {
          filledRow[i] = '0';
        }
      }
      while (filledRow.length < this.headers.length) {
        filledRow.push('0');
      }
      return filledRow;
    });

    let totalCounter = 1;

    this.tableData = normalizedRows
      .filter((row) => {
        const nonEmptyValues = row.filter(
          (cell) => cell && cell.trim() !== ''
        ).length;
        return nonEmptyValues >= Math.floor(this.headers.length / 2);
      })
      .map((row) => {
        const obj: any = {};
        const firstCell = row[0]?.trim() ?? '';
        const secondCell = row[1]?.trim() ?? '';

        const isTotal =
          !firstCell || firstCell === '0' || !secondCell || secondCell === '0';

        this.headers.forEach((header, index) => {
          if (isTotal) {
            if (index === 0) {
              obj[header] = `TOTAL-${totalCounter.toString().padStart(3, '0')}`;
            } else if (index === 1) {
              obj[header] = `Total ${totalCounter}`;
            } else {
              const originalIndex = index - 1;
              obj[header] =
                originalIndex >= 0 && originalIndex < row.length
                  ? row[originalIndex]
                  : '0';
            }
          } else {
            obj[header] = row[index] ?? '0';
          }
        });

        if (isTotal) totalCounter++;
        return obj;
      });

    this.csvContent = this.generateCsv(this.tableData, this.headers);
  };

  reader.readAsArrayBuffer(file);
}


  private generateCsv(data: any[], headers: string[]): string {
    const lines = [
      headers.join(','),
      ...data.map((row) =>
        headers
          .map((h) => `"${(row[h] || '').toString().replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    return lines.join('\r\n');
  }

  private procesarFilas(
    rawRows: any[],
    headers: string[],
    fecha: number | string,
    idMapping: string,
    nombreBalance: string,
    fechaInicio: string,
    fechaFin: string,
    id_empresa: string
    
  ): {
    filasProcesadas: any[];
    headersFiltrados: string[];
    totalDeudor: number;
    totalAcreedor: number;
    cuentasNoMapeadas: string[]; // << NUEVO
  } {
    const getKey = (candidatos: string[]) =>
      headers.find((h) =>
        candidatos.some((c) => h.toLowerCase().includes(c.toLowerCase()))
      );

    const codigoKey = getKey(['codigo', 'cuenta']);
    const nombreKey = getKey(['nombre', 'glosa']);
    const deudorKey = getKey(['deudor', 'debe']);
    const acreedorKey = getKey(['acreedor', 'haber']);

    if (!codigoKey || !nombreKey || !deudorKey || !acreedorKey) {
      throw new Error('Faltan columnas clave en el archivo');
    }

    const esTotal = (row: any) => {
      const nombre = (row[nombreKey] ?? '').toString().toLowerCase();
      return nombre.includes('total') || nombre.includes('saldo');
    };

    // Filtro defaultMappings por mapping actual y CV-XX
    const mappingsMapping = this.defaultMappings.filter(
      (m) => m.id_mapping === idMapping
    );
    const mappingsCVXX = this.defaultMappings.filter((m) => m.id_mapping === 'NO-MAPPING');

    let totalDeudor = 0;
    let totalAcreedor = 0;
    const cuentasNoMapeadas: string[] = [];

    const filasProcesadas = rawRows
      .filter((row) => !esTotal(row))
      .map((row) => {
        const num_cuenta = row[codigoKey]?.toString().trim();
        const nombre = row[nombreKey];
        const deudor =
          parseInt((row[deudorKey] ?? '0').toString().replace(/\./g, '')) || 0;
        const acreedor =
          parseInt((row[acreedorKey] ?? '0').toString().replace(/\./g, '')) ||
          0;
        const saldo = deudor - acreedor;

        totalDeudor += deudor;
        totalAcreedor += acreedor;

        // 1. Buscar mapping por mapping actual
        let mapping = mappingsMapping.find((m) => m.num_cuenta === num_cuenta);

        // 2. Si no existe, buscar en CV-XX
        if (!mapping) {
          mapping = mappingsCVXX.find((m) => m.num_cuenta === num_cuenta);
        }

        // 3. Si sigue sin existir, usar "NO MAPPING"
        const id_fsa = mapping ? mapping.id_fsa : null;

        const id_fsa_final = id_fsa && /^X\d{5}$/.test(id_fsa) ? null : id_fsa;

        // Agregar a cuentas no mapeadas si es null
        if (id_fsa_final === null) {
          cuentasNoMapeadas.push(num_cuenta);
        }

        return {
          num_cuenta,
          nombre,
          saldo,
          ejercicio: fecha,
          id_mapping: idMapping,
          id_fsa,
          nombre_balance: nombreBalance ?? '',
          fecha_inicio: fechaInicio ?? '',
          fecha_fin: fechaFin ?? '',
          id_empresa: id_empresa ?? ''
        };
      });

    return {
      filasProcesadas,
      headersFiltrados: [
        codigoKey,
        nombreKey,
        'Saldo Actual',
        'Ejercicio',
        'Mapping',
        'FSA',
        'Nombre Balance',
        'Fecha Inicio',
        'Fecha Fin',
        'Empresa',
      ],

      totalDeudor,
      totalAcreedor,
      cuentasNoMapeadas,
    };
  }

  visualizarProcesado(): void {

    const mappingSeleccionada = this.selectedMapping;
    const empresaSeleccionada = this.selectedEmpresa;

    console.log("ejercicio: ", this.anioSeleccionado)

    this.msgError = '';
    if (!this.anioSeleccionado || !mappingSeleccionada || !empresaSeleccionada) {
      this.msgError = 'Debe seleccionar una mapping y una fecha';
      return;
    }

    if (!this.tableData || this.tableData.length === 0) return;

    this.originalTableData = [...this.tableData];
    this.originalHeaders = [...this.headers];

    try {
      const {
        filasProcesadas,
        headersFiltrados,
        totalDeudor,
        totalAcreedor,
        cuentasNoMapeadas,
      } = this.procesarFilas(
        this.originalTableData,
        this.originalHeaders,
        this.anioSeleccionado,
        this.selectedMapping,
        this.nombreBalance,
        this.fechaInicio,
        this.fechaFin,
        this.selectedEmpresa
      );

      this.totalDeudor = totalDeudor;
      this.totalAcreedor = totalAcreedor;
      this.resultadoSaldo = totalDeudor - totalAcreedor;
      this.cuentasNoMapeadas = cuentasNoMapeadas;
      // Mensaje simple si hay alguna no mapeada
      if (cuentasNoMapeadas.length > 0) {
        this.msgWarning = `${cuentasNoMapeadas.length} cuentas no están mapeadas y se marcaron como "NO MAPPING".`;
      }
      this.headers = headersFiltrados;
      this.tableData = filasProcesadas.map((b) => ({
        [headersFiltrados[0]]: b.num_cuenta,
        [headersFiltrados[1]]: b.nombre,
        [headersFiltrados[2]]: b.saldo,
        [headersFiltrados[3]]: b.ejercicio,
        [headersFiltrados[4]]: b.id_mapping,
        [headersFiltrados[5]]: b.id_fsa,
        [headersFiltrados[6]]: b.nombre_balance,
        [headersFiltrados[7]]: b.fecha_inicio,
        [headersFiltrados[8]]: b.fecha_fin,
        [headersFiltrados[9]]: b.id_empresa
      }));

      this.processed = true;
    } catch (err: any) {
      console.error('Error al visualizar:', err);
      this.msgError = err.message;
    }
  }






procesarInformacion(): void {

  this.msgError = '';

  if (!this.archivoCargado) {
    this.showSpinner = false;
    this.msgError = 'Debe esperar a que el archivo se cargue completamente antes de procesar.';

    return;
  }

  const mappingSeleccionada = this.selectedMapping;

  if (!this.anioSeleccionado || !mappingSeleccionada) {
    this.showSpinner = false;
    this.msgError = 'Debe seleccionar una mapping y una fecha';
    
    return;
  }

  if (!this.originalTableData || !this.originalHeaders) {
    this.showSpinner = false;
    this.msgError = 'Primero debes visualizar el archivo procesado';
    
    return;
  }

  const anioArchivo = this.ejercicioValidar;
  const anioSeleccionado = this.anioSeleccionado.toString();

  // 🔴 Caso 3: No existe año en el archivo
  if (!anioArchivo) {
    let timerInterval: any;
    let secondsLeft = 5;

    Swal.fire({
      title: '¿Deseas continuar?',
      icon: 'warning',
      html: `
        <p><b>El archivo no contiene información del periodo (año)</b>, por lo tanto no se puede validar contra el año seleccionado (<b>${anioSeleccionado}</b>).</p>
        <p><strong>Podrás continuar en <b><span id="timer">${secondsLeft}</span></b> segundos...</strong></p>
        <p class="text-danger">* La validación quedará a tu responsabilidad.</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const confirmBtn = Swal.getConfirmButton();
        confirmBtn!.disabled = true;

        timerInterval = setInterval(() => {
          secondsLeft--;
          const timerSpan = document.getElementById('timer');
          if (timerSpan) timerSpan.textContent = secondsLeft.toString();

          if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            confirmBtn!.disabled = false;
          }
        }, 1000);
      },
      willClose: () => clearInterval(timerInterval)
    }).then((result) => {
      if (result.isConfirmed) {
        this.showSpinner = false;
        this.continuarProcesamiento();
      } else {
        this.showSpinner = false;
      }
    });

    return;
  }

  // ⚠️ Caso 2: Año no coincide
  if (anioArchivo !== anioSeleccionado) {
    let timerInterval: any;
    let secondsLeft = 5;

    Swal.fire({
      title: '¿Deseas continuar?',
      icon: 'warning',
      html: `
        <p>El año seleccionado (<b>${anioSeleccionado}</b>) no coincide con el periodo del archivo (<b>${anioArchivo}</b>).</p>
        <p><strong>Podrás continuar en <b><span id="timer">${secondsLeft}</span></b> segundos...</strong></p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Aceptar',
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const confirmBtn = Swal.getConfirmButton();
        confirmBtn!.disabled = true;

        timerInterval = setInterval(() => {
          secondsLeft--;
          const timerSpan = document.getElementById('timer');
          if (timerSpan) timerSpan.textContent = secondsLeft.toString();

          if (secondsLeft <= 0) {
            clearInterval(timerInterval);
            confirmBtn!.disabled = false;
          }
        }, 1000);
      },
      willClose: () => clearInterval(timerInterval)
    }).then((result) => {
      if (result.isConfirmed) {
        this.showSpinner = false;
        this.continuarProcesamiento();
      } else {
        this.showSpinner = false;
      }
    });

    return;
  }
      this.showSpinner = false;
  // ✅ Caso 1: Año coincide
  this.continuarProcesamiento();
}


private continuarProcesamiento(): void {

  try {
    const { filasProcesadas, totalDeudor, totalAcreedor } =
      this.procesarFilas(
        this.originalTableData,
        this.originalHeaders,
        this.anioSeleccionado!,
        this.selectedMapping,
        this.nombreBalance,
        this.fechaInicio,
        this.fechaFin,
        this.selectedEmpresa

      );

    this.totalDeudor = totalDeudor;
    this.totalAcreedor = totalAcreedor;
    this.resultadoSaldo = totalDeudor - totalAcreedor;
    console.log("BULK ENVIADO A BACK: ", filasProcesadas)

    this.balanceService.createBalanceBulk(filasProcesadas).subscribe({
      next: (res) => {
        this.showSpinner = false;
        Swal.fire({
          icon: 'success',
          title: '¡Subido!',
          text: res.message || 'Los balances se subieron correctamente.',
          timer: 2000,
          showConfirmButton: false,
        }).then(() => {
          this.router.navigate(['balances']).then(() => {
            window.location.reload();
          });
        });
      },
      error: (err) => {
        this.showSpinner = false;
        const errorMessage =
          err?.error?.message || err?.message || 'Error al subir balances.';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonText: 'Cerrar',
        });
        this.msgError = errorMessage;
      },
    });
  } catch (err: any) {
    this.showSpinner = false;
    const errorMessage =
      err?.error?.message ||
      err?.message ||
      'Error al procesar la información.';
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage,
      confirmButtonText: 'Cerrar',
    });
    this.msgError = errorMessage;
  }
}



  descargarOriginal(): void {
    if (!this.originalTableData.length || !this.originalHeaders.length) {
      // Si aún no se ha procesado, usamos los datos actuales como originales
      this.originalTableData = [...this.tableData];
      this.originalHeaders = [...this.headers];
    }

    const csv = this.generateCsv(this.originalTableData, this.originalHeaders);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resumen_original.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  }

  descargarProcesado(): void {
    if (!this.processed) return;

    this.csvContent = this.generateCsv(this.tableData, this.headers);

    const blob = new Blob([this.csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resumen_filtrado.csv';
    a.click();
    window.URL.revokeObjectURL(url);

    this.processed = false;
  }

  subirBalance(): void {
    console.log('PASO 1');
    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Se subirán los balances procesados',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, subir',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        console.log('PASO 2');
        this.procesarInformacion();
      }
    });
  }

  cancel(): void {
    if (this.originalTableData.length > 0) {
      this.tableData = [...this.originalTableData];
      this.headers = [...this.originalHeaders];
    }

    this.processed = false;
    this.router.navigate(['home'])
  }

}
