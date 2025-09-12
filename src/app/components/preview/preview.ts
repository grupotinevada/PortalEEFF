import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgSelectOption } from '@angular/forms';
import { Imapping, ImappingSelect } from '../../models/mapping.model';
import { MappingService } from '../../services/mapping.service';
import { BalanceService } from '../../services/balance.service';
import Swal from 'sweetalert2';

import { AuthService } from '../../services/auth.service';
import { EstadoService } from '../../services/estado.service';
import { IDefaultMapping } from '../../models/balance.model';
import { Router } from '@angular/router';
import { Spinner } from '../spinner/spinner';
import { PreviewFileService } from '../../services/preview-fie';
import { Navbar } from '../navbar/navbar';
import { Console } from 'console';
import { EmpresaService } from '../../services/empresa.service';
import { IEmpresa } from '../../models/empresa.model';
import { finalize, map, switchMap, take, throwError } from 'rxjs';
import { IFsa } from '../../models/fsa.model';
import { NgSelectComponent } from '@ng-select/ng-select'

@Component({
  selector: 'app-preview',
  imports: [CommonModule, FormsModule, Spinner, Navbar, NgSelectComponent],
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

  private initialFsaMap = new Map<string, string>();

  totalDeudor: number = 0;
  totalAcreedor: number = 0;
  resultadoSaldo: number = 0;

  fechaSeleccionada: string = ''; // este será el formato 'YYYY-01-01'
  listaAnios: number[] = [];
  msgError: string = '';
  mappings: ImappingSelect[] = [];
  selectedMapping: string = '';
  showSpinner: boolean = false;
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

   fsas: IFsa[] = [];

  mappingCompleto: Imapping[] = []
  constructor(
    private mappingService: MappingService,
    private balanceService: BalanceService,
    private authService: AuthService,
    private estadoService: EstadoService,
    private router: Router,
    private previewFileService: PreviewFileService,
    private empresaService: EmpresaService
  ) { }

  ngOnInit(): void {

    this.selectedMapping = '';
    this.cargarSelectMappings();
    this.cargarEmpresas();
    this.getFsaData();
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

private getFsaData(): void {
  this.showSpinner = true;
  this.msgError = ''; 

  this.authService.isAuthenticated().pipe(
    
    take(1),
    switchMap(isAuthenticated => {
      if (!isAuthenticated) {
        return throwError(() => new Error('Usuario no autenticado'));
      }
        return this.balanceService.getAllFsa();
    }),

    
    map(res => {
      if (res.success && Array.isArray(res.data)) {
        return res.data.filter(
          f => f.id_fsa && f.desc && f.id_cate && f.categoria
        );
      }

      throw new Error('Respuesta inválida del servicio FSA');
    }),
    finalize(() => this.showSpinner = false)

  ).subscribe({
    next: (fsaData) => {
      this.fsas = fsaData.map(f => ({
        ...f,
        display: `${f.id_fsa} - ${f.desc}`
        
      }));
      
      console.log('FSA data cargada:', this.fsas);
    },
    error: (error) => {
      console.error('Error al obtener FSA:', error);
      this.msgError = error.message || 'Ocurrió un error inesperado';
      this.fsas = [];
    }
  });
}

onFsaChange(row: any, selectedId: string): void {
  const fsa = this.fsas.find(f => f.id_fsa === selectedId);
  
  if (fsa) {
    // Si eligió del select
    row['FSA'] = fsa.id_fsa;
    row.fsa = {
      id_fsa: fsa.id_fsa,
      desc: fsa.desc,
      id_cate: fsa.id_cate,
      categoria: fsa.categoria
    };
  } else {
    // Si lo escribió manualmente
    row['FSA'] = selectedId;
    row.fsa = {
      id_fsa: selectedId,
      desc: 'Asignado manualmente',
      id_cate: null,
      categoria: null
    };
  }

  
}


onMappingChange(): void {

  const mappingSeleccionada = this.selectedMapping;

  console.log("[INFO] MAPPING SELECCIONADO: ", mappingSeleccionada)

  if (!mappingSeleccionada) {
    this.mappingCompleto = [];
    return;
  }
  
  this.showSpinner = true;

  // Llamamos al servicio con el ID seleccionado
  this.mappingService.getMappingById(this.selectedMapping)
    .pipe(finalize(() => this.showSpinner = false))
    .subscribe({
      next: (data) => {
        // 'data' es directamente el array que viene de la API
        this.mappingCompleto = data; 
        console.log('[INFO] Mapping completo cargado:', this.mappingCompleto);
      },
      error: (err) => {
        console.error(`[ERROR] Error al cargar el mapping ${this.selectedMapping}:`, err);
        this.mappingCompleto = [];
      }
  });
}

  private cargarEmpresas() {
  this.msgError = ''; // Limpiar errores previos

  this.authService.isAuthenticated().pipe(
    take(1),
    switchMap(isAuthenticated => {
      if (!isAuthenticated) {
        return throwError(() => new Error('Usuario no autenticado'));
      }
      return this.empresaService.getEmpresas();
    }),
    map(res => {
      if (res.success) {
        return res.data;
      }
      // Si la API devuelve success: false, lo convertimos en un error.
      throw new Error('Error al obtener empresas desde la API');
    })
  ).subscribe({
    next: (empresasData) => {
      this.empresas = empresasData;
    },
    error: (error) => {
      console.error('Error de API al cargar empresas:', error);
      this.msgError = error.message || 'Ocurrió un error inesperado';
    }
  });
    console.log('empresas', this.empresas);
}




private cargarSelectMappings(): void {
  this.msgError = ''; // Limpiar errores previos

  this.authService.isAuthenticated().pipe(
    // toma solo el estado de autenticación actual y luego finaliza.
    take(1),

    // encadena la llamada a la API si el usuario está autenticado.
    switchMap(isAuthenticated => {
      if (!isAuthenticated) {
        // detiene el flujo y lanza un error si no está autenticado.
        return throwError(() => new Error('Usuario no autenticado'));
      }
      // continúa con la llamada para obtener los mappings.
      return this.mappingService.getMappings();
    }),

    // transforma la respuesta exitosa.
    map(res => {
      if (res.success) {
        return res.data;
      }
      // lanza un error si la respuesta no es exitosa.
      throw new Error('Error al obtener mappings');
    })

  ).subscribe({
    next: (mappingsData) => {
      this.mappings = mappingsData;
      console.log('[DEBUG] Mappings cargados:', this.mappings);
    },
    error: (error) => {
      this.msgError = error.message || 'Ocurrió un error inesperado';
      console.error('Error de API:', error);
    }
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
    const mappingsMapping = this.mappingCompleto.filter(
      (m) => m.id_mapping === idMapping
    );
    const mappingsCVXX = this.mappingCompleto.filter((m) => m.id_mapping === 'NO-MAPPING');

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
          id_fsa: id_fsa_final ?? 'NO-MAPPING',
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
      
      // <-- 🟢 MODIFICADO: Guardar una copia del estado inicial procesado
      //this.initialProcessedData = JSON.parse(JSON.stringify(this.tableData));

      this.initialFsaMap.clear();
      const cuentaKey = this.headers[0];
      const fsaKey = this.headers[5];
      this.tableData.forEach(row => {
        this.initialFsaMap.set(row[cuentaKey], row[fsaKey]);
      });

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

  // (Casos 3 y 2 iguales — los omito aquí para brevedad, puedes mantener los tuyos)
  // ... (mantén los bloques Swal de año como los tenías)

  // 🚨 Validación 3: Todas las cuentas deben tener FSA
  const cuentasSinFsa = this.tableData.filter(row => {
    const v = row['FSA'] ?? row[this.headers[5]] ?? '';
    return !String(v).trim();
  });
  if (cuentasSinFsa.length > 0) {
    this.showSpinner = false;
    Swal.fire({
      title: 'Validación de FSA',
      icon: 'error',
      html: `
        <p>Existen <b>${cuentasSinFsa.length}</b> cuentas sin FSA asignado.</p>
        <p class="text-danger">Todas las cuentas deben tener un FSA antes de continuar.</p>
      `,
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // 🚨 Validación 4: FSA inexistente en catálogo
  const fsaIds = this.fsas.map(f => String(f.id_fsa ?? '').trim());
  const cuentasConFsaInvalido = this.tableData.filter(row => {
    const v = row['FSA'] ?? row[this.headers[5]] ?? '';
    return String(v).trim() && !fsaIds.includes(String(v).trim());
  });
  if (cuentasConFsaInvalido.length > 0) {
    this.showSpinner = false;
    Swal.fire({
      title: 'FSA inválido detectado',
      icon: 'error',
      html: `
        <p>Existen <b>${cuentasConFsaInvalido.length}</b> cuentas con un FSA que no está en el catálogo.</p>
        <p class="text-danger">Debes crear el FSA correspondiente antes de continuar.</p>
      `,
      confirmButtonText: 'Aceptar'
    });
    return;
  }

  // =========================
  // 🚨 VALIDACIÓN 5 (DEBUG)
  // =========================
  const debug = true; // ponlo a false cuando termines
  const cambiosFsa: any[] = [];

  // Normalizamos headers (trim)
  const normalizedHeaders = this.headers.map(h => String(h ?? '').trim());
  // Intentos inteligentes de detectar keys de cuenta y FSA
  const cuentaKey =
    this.headers.find(h => String(h ?? '').toLowerCase().includes('cuenta')) ||
    this.headers[0];
  const fsaKey =
    this.headers.find(h => String(h ?? '').toLowerCase() === 'fsa') ||
    this.headers.find(h => String(h ?? '').toLowerCase().includes('fsa')) ||
    this.headers[5] ||
    'FSA';

  // Mapa índice por header (para rows array[])
  const headerIndexMap = new Map<string, number>();
  normalizedHeaders.forEach((h, i) => headerIndexMap.set(h, i));

  const readCell = (row: any, key: string) => {
    if (row == null) return '';
    const kTrim = String(key ?? '').trim();
    if (Array.isArray(row)) {
      const idx = headerIndexMap.get(kTrim);
      return typeof idx === 'number' ? row[idx] ?? '' : '';
    } else if (typeof row === 'object') {
      // pruebo key directo y trimmed
      return row[key] ?? row[kTrim] ?? '';
    }
    return '';
  };

  // Normalizar initialFsaMap (soporta Map o objeto)
  const normalizedInitialFsaMap = new Map<string, string>();
  try {
    if (this.initialFsaMap && typeof this.initialFsaMap.entries === 'function') {
      for (const [k, v] of this.initialFsaMap.entries()) {
        normalizedInitialFsaMap.set(String(k ?? '').trim(), String(v ?? '').trim());
      }
    } else if (this.initialFsaMap && typeof this.initialFsaMap === 'object') {
      Object.keys(this.initialFsaMap).forEach(k =>
        normalizedInitialFsaMap.set(String(k ?? '').trim(), String((this.initialFsaMap as any).get(k) ?? '').trim())
      );
    }
  } catch (e) {
    console.error('Error normalizando initialFsaMap', e);
  }

  if (debug) {
    console.group('DEBUG: Validación FSA - info preliminar');
    console.log('headers (raw):', this.headers);
    console.log('normalizedHeaders:', normalizedHeaders);
    console.log('detected cuentaKey:', cuentaKey);
    console.log('detected fsaKey:', fsaKey);
    console.log('initialFsaMap size:', normalizedInitialFsaMap.size);
    // muestro primeros 10 pares del map
    let c = 0;
    for (const [k,v] of normalizedInitialFsaMap.entries()) {
      if (c++ < 10) console.log('map key:', `'${k}' -> '${v}'`);
      else break;
    }
    // muestro primeras filas de tableData
    console.log('tableData length:', (this.tableData || []).length);
    for (let i = 0; i < Math.min(10, (this.tableData || []).length); i++) {
      console.log(`row[${i}] raw:`, this.tableData[i]);
    }
    console.groupEnd();
  }

  // Recorro y comparo
  (this.tableData || []).forEach((currentRow: any, rowIndex: number) => {
    const rawCuenta = readCell(currentRow, cuentaKey);
    const cuentaId = String(rawCuenta ?? '').trim();
    const fsaOriginal = normalizedInitialFsaMap.get(cuentaId) ?? '';
    const fsaNuevo = String(readCell(currentRow, fsaKey) ?? '').trim();

    if (debug) {
      console.log(`ROW ${rowIndex} | cuentaId='${cuentaId}' | mapHas=${normalizedInitialFsaMap.has(cuentaId)} | fsaOriginal='${fsaOriginal}' | fsaNuevo='${fsaNuevo}'`);
    }

    // Normalización extra para comparar (opcional): minusculas y quitar espacios intermedios si quisieras
    const normOrig = fsaOriginal; // .toLowerCase()
    const normNew = fsaNuevo; // .toLowerCase()

    if (normOrig !== normNew) {
      cambiosFsa.push({
        rowIndex,
        cuenta: cuentaId || '(sin nombre)',
        fsaOriginal: fsaOriginal || 'N/A',
        fsaNuevo: fsaNuevo || 'N/A'
      });
    }
  });

  if (debug) {
    console.log('Cambios detectados total:', cambiosFsa.length);
  }

  if (cambiosFsa.length > 0) {
    this.showSpinner = false;
    let htmlCambios = '<ul class="text-start">';
    cambiosFsa.forEach(c => {
      htmlCambios += `<li><b>${c.cuenta}</b> (fila ${c.rowIndex + 1}): de <span class="text-danger">${c.fsaOriginal}</span> → <span class="text-success">${c.fsaNuevo}</span></li>`;
    });
    htmlCambios += '</ul>';

    // Si debug, añadimos un pequeño resumen en la consola y un Swal con detalle
    console.group('Detalle cambios FSA');
    cambiosFsa.forEach(c => console.log(c));
    console.groupEnd();

    Swal.fire({
      title: 'Cambios de FSA detectados',
      icon: 'warning',
      html: `
        <p>Se detectaron <b>${cambiosFsa.length}</b> cuentas que cambiaron de FSA respecto a la previsualización original:</p>
        ${htmlCambios}
        <p>¿Deseas continuar?</p>
      `,
      showCancelButton: true,
      confirmButtonText: 'Sí, continuar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      this.showSpinner = false;
      if (result.isConfirmed) {
        this.continuarProcesamiento();
      }
    });

    return;
  }

  this.showSpinner = false;
  this.continuarProcesamiento();
}





private continuarProcesamiento(): void {
  this.showSpinner = true; // Inicia el spinner

  try {
    const currentEjercicio = this.anioSeleccionado;
    const currentMappingId = this.selectedMapping;
    const currentNombreBalance = this.nombreBalance;
    const currentFechaInicio = this.fechaInicio;
    const currentFechaFin = this.fechaFin;
    const currentEmpresaId = this.selectedEmpresa;
    const fechaProcesado = new Date().toISOString(); 

    const datosParaEnviar = this.tableData.map(row => {

      return {

        num_cuenta:     row[this.headers[0]],
        nombre:         row[this.headers[1]],
        saldo:          row[this.headers[2]],
        id_fsa:         row[this.headers[5]],

        ejercicio:      currentEjercicio,
        id_mapping:     currentMappingId,
        nombre_balance: currentNombreBalance,
        fecha_inicio:   currentFechaInicio,
        fecha_fin:      currentFechaFin,
        id_empresa:     currentEmpresaId,
        fecha_procesado: fechaProcesado
      };
      
    });

    console.log("BULK ENVIADO A BACK (corregido y consistente): ", datosParaEnviar);

    // Llama al servicio para enviar el payload final y consistente
    this.balanceService.createBalanceBulk(datosParaEnviar).subscribe({
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
      'Error al procesar la información para el envío.';
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