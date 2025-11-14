import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgSelectOption } from '@angular/forms';
import { Imapping, ImappingSelect } from '../../models/mapping.model';
import { MappingService } from '../../services/mapping.service';
import { BalanceService } from '../../services/balance.service';
import Swal from 'sweetalert2';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Spinner } from '../spinner/spinner';
import { PreviewFileService } from '../../services/preview-fie';
import { Navbar } from '../navbar/navbar';
import { EmpresaService } from '../../services/empresa.service';
import { IEmpresa } from '../../models/empresa.model';
import {
  finalize,
  forkJoin,
  map,
  switchMap,
  take,
  throwError,
  debounceTime,
  distinctUntilChanged,
  Subscription,
  Subject,
  Observable
} from 'rxjs';
import { IFsa } from '../../models/fsa.model';
import { NgSelectComponent } from '@ng-select/ng-select';
import { ModalFsa } from '../modal-fsa/modal-fsa';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FsaService } from '../../services/fsa.service';
import { ModalDistribucion } from '../modal-distribucion/modal-distribucion';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';
import { UsuarioLogin } from '../../models/usuario-login';

@Component({
  selector: 'app-preview',
  imports: [CommonModule, FormsModule, Spinner, Navbar, TableModule, SelectModule],
  templateUrl: './preview.html',
  styleUrls: ['./preview.css'],
})
export class Preview implements OnInit {
  //user info
  readonly currentUser$: Observable<UsuarioLogin | null>;

  tableData: any[] = [];
  headers: string[] = [];
  csvContent = '';
  processed = false;
  originalTableData: any[] = [];
  originalHeaders: string[] = [];

  //cheack name variables
  isNombreLoading = false; 
  nombreValidationMessage = ''; 
  isNombreAvailable = false; 
  private nombreBalance$ = new Subject<string>();
  private subscriptions : Subscription = new Subscription;

  // Variables para totales

  totalDeudor: number = 0;
  totalAcreedor: number = 0;
  resultadoSaldo: number = 0;

  //variables ngModel
  fechaSeleccionada: string = '';
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

  anioSeleccionado: number | string | null = null;

  fechaInicioValidar: string | null = null;
  fechaFinValidar: string | null = null;
  ejercicioValidar: string | null = null;

  archivoCargado = false;

  id_estado: string = '1';

  empresas: IEmpresa[] = [];
  selectedEmpresa: string = '';

  fsas: IFsa[] = [];

  mappingCompleto: Imapping[] = [];
  mappinngNuevo: ImappingSelect[] = [];
  private initialFsaMap = new Map<string, string>();

  isDistributionMode = false; 
  sourceAccount: any = null;
  isDistribuited = false;


  hiddenColumns: string[] = [];



  constructor(
    private mappingService: MappingService,
    private balanceService: BalanceService,
    private authService: AuthService,
    private fsaService: FsaService,
    private router: Router,
    private previewFileService: PreviewFileService,
    private empresaService: EmpresaService,
    private modalService: NgbModal,


  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {

this.subscriptions.add(
  this.previewFileService.reload$.subscribe(() => {
    this.getFsaData();
    this.cargarEmpresas();

  })
);

// Añadimos la segunda suscripción al mismo gestor
this.subscriptions.add(
  this.nombreBalance$.pipe(
    debounceTime(400),
    distinctUntilChanged(),
    switchMap(nombre => {
      if (!nombre.trim()) {
        this.nombreValidationMessage = '';
        return []; 
      }
      this.isNombreLoading = true;
      this.nombreValidationMessage = ''; 
      return this.balanceService.checkNameAvailability(nombre);
    })
  ).subscribe(response => {
    this.isNombreLoading = false;
    this.isNombreAvailable = response.isAvailable;
    this.nombreValidationMessage = response.message;
  })
);


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


  onNombreChange(nombre: string): void {
  // Usamos .next() para empujar el nuevo valor del nombre al flujo de nuestro Subject.
  this.nombreBalance$.next(nombre);
    }

  private getFsaData(): void {
    this.showSpinner = true;
    this.msgError = '';

    this.authService
      .isAuthenticated()
      .pipe(
        take(1),
        switchMap((isAuthenticated) => {
          if (!isAuthenticated) {
            return throwError(() => new Error('Usuario no autenticado'));
          }
          return this.fsaService.getAllFsa();
        }),
        map((res) => {
          if (res.success && Array.isArray(res.data)) {
            return res.data.filter(
              (f) => f.id_fsa && f.desc && f.id_cate && f.categoria
            );
          }

          throw new Error('Respuesta inválida del servicio FSA');
        }),
        finalize(() => (this.showSpinner = false))
      )
      .subscribe({
        next: (fsaData) => {
          this.fsas = fsaData.map((f) => ({
            ...f,
            display: `${f.id_fsa} - ${f.desc}`,
          }));

          console.log('FSA data cargada:', this.fsas);
        },
        error: (error) => {
          console.error('Error al obtener FSA:', error);
          this.msgError = error.message || 'Ocurrió un error inesperado';
          this.fsas = [];
        },
      });
  }

ngOnDestroy(): void {
  this.subscriptions.unsubscribe();
}

  onFsaChange(row: any, selectedId: string): void {
    const fsa = this.fsas.find((f) => f.id_fsa === selectedId);

    if (fsa) {
      // Si eligió del select
      row['FSA'] = fsa.id_fsa;
      row.fsa = {
        id_fsa: fsa.id_fsa,
        desc: fsa.desc,
        id_cate: fsa.id_cate,
        categoria: fsa.categoria,
      };
    } else {
      // Si lo escribió manualmente
      row['FSA'] = selectedId;
      row.fsa = {
        id_fsa: selectedId,
        desc: 'Asignado manualmente',
        id_cate: null,
        categoria: null,
      };
    }
  }

  onMappingChange(): void {
    const mappingSeleccionada = this.selectedMapping;
    console.log('[INFO] MAPPING SELECCIONADO: ', mappingSeleccionada);

    if (!mappingSeleccionada) {
      this.mappingCompleto = [];
      // IMPORTANTE: Limpiar el initialFsaMap cuando no hay mapeo seleccionado
      this.initialFsaMap.clear();
      return;
    }

    this.showSpinner = true;
    this.mappingService
      .getMappingById(this.selectedMapping)
      .pipe(finalize(() => (this.showSpinner = false)))
      .subscribe({
        next: (data) => {
          this.mappingCompleto = data;
          console.log('[INFO] Mapping completo cargado:', this.mappingCompleto);

          // ✅ AHORA ES AQUÍ DONDE LLENAS EL MAPA DE REFERENCIA
          this.initialFsaMap.clear();
          this.mappingCompleto.forEach(mapeo => {
            this.initialFsaMap.set(String(mapeo.num_cuenta).trim(), String(mapeo.id_fsa).trim());
          });
          console.log('[DEBUG] initialFsaMap lleno con los datos del mapeo de DB:', this.initialFsaMap);
        },
        error: (err) => {
          console.error(`[ERROR] Error al cargar el mapping ${this.selectedMapping}:`, err);
          this.mappingCompleto = [];
          this.initialFsaMap.clear();
        },
      });
  }

 
private cargarEmpresas() {
  this.msgError = '';

  this.currentUser$.pipe(
    take(1),
    switchMap((user) => {
    if (!user) {
      return throwError(() => new Error('Usuario no autenticado'));
    }
    return this.empresaService.getEmpresas();
    }),
    map((res) => {
    if (res.success) {
      return res.data;
    }
    throw new Error('Error al obtener empresas desde la API');
    }),
    switchMap((empresas) => {
    return this.currentUser$.pipe(
      take(1),
      map((user) => {
      if (user?.roles.empresas && user.roles.empresas.length > 0) {
        return empresas.filter(e => user.roles.empresas?.includes(e.id_empresa));
      }
      return empresas;
      })
    );
    })
  )
  .subscribe({
    next: (empresasData) => {
    this.empresas = empresasData;
    },
    error: (error) => {
    console.error('Error de API al cargar empresas:', error);
    this.msgError = error.message || 'Ocurrió un error inesperado';
    },
  });
}

  private cargarSelectMappings(): void {
    this.msgError = ''; // Limpiar errores previos

    this.authService
      .isAuthenticated()
      .pipe(
        // toma solo el estado de autenticación actual y luego finaliza.
        take(1),

        // encadena la llamada a la API si el usuario está autenticado.
        switchMap((isAuthenticated) => {
          if (!isAuthenticated) {
            // detiene el flujo y lanza un error si no está autenticado.
            return throwError(() => new Error('Usuario no autenticado'));
          }
          // continúa con la llamada para obtener los mappings.
          return this.mappingService.getMappings();
        }),

        // transforma la respuesta exitosa.
        map((res) => {
          if (res.success) {
            return res.data;
          }
          // lanza un error si la respuesta no es exitosa.
          throw new Error('Error al obtener mappings');
        })
      )
      .subscribe({
        next: (mappingsData) => {
          this.mappings = mappingsData;
          console.log('[DEBUG] Mappings cargados:', this.mappings);
        },
        error: (error) => {
          this.msgError = error.message || 'Ocurrió un error inesperado';
          console.error('Error de API:', error);
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
      texto = texto
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

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
          diciembre: '12',
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

      const { fechaInicioVal, fechaFinVal, ejercicioVal } =
        this.extractPeriodoDesdeHtml(doc);

      this.fechaInicioValidar = fechaInicioVal;
      this.fechaFinValidar = fechaFinVal;
      this.ejercicioValidar = ejercicioVal;
      this.archivoCargado = true;

      console.log(
        'fechas recuperadas del archivo',
        this.fechaInicioValidar,
        this.fechaFinValidar,
        this.ejercicioValidar
      );
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
            !firstCell ||
            firstCell === '0' ||
            !secondCell ||
            secondCell === '0';

          this.headers.forEach((header, index) => {
            if (isTotal) {
              if (index === 0) {
                obj[header] = `TOTAL-${totalCounter
                  .toString()
                  .padStart(3, '0')}`;
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
    const mappingsCVXX = this.mappingCompleto.filter(
      (m) => m.id_mapping === 'NO-MAPPING'
    );

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
          id_empresa: id_empresa ?? '',
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

    console.log('ejercicio: ', this.anioSeleccionado);

    this.msgError = '';
    if (
      !this.anioSeleccionado ||
      !mappingSeleccionada ||
      !empresaSeleccionada
    ) {
      this.msgError = 'Debe seleccionar una mapping y una fecha';
      
      return;
    }

    if (!this.tableData || this.tableData.length === 0) return;

    try {
      this.hiddenColumns = [
        'Ejercicio',
        'Mapping',
        'Nombre Balance',
        'Fecha Inicio',
        'Fecha Fin',
        'Empresa'
      ];
      const cuentasManuales = this.tableData.filter(row => row.isManual);   // aqui me quedé
      // ✅ Si es el primer procesamiento, guardamos originales
      if (!this.processed) {
        this.originalTableData = [...this.tableData];
        this.originalHeaders = [...this.headers];
      }

      // ✅ Siempre partimos de los datos originales
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


      const cuentasEnArchivo = new Set(filasProcesadas.map(f => f.num_cuenta));

     
      const cuentasManualesDelMapping = (this.mappingCompleto || []).filter(mapeo =>
        mapeo.isManual && 
        !cuentasEnArchivo.has(mapeo.num_cuenta)
      );

      
      const filasManualesParaAgregar = cuentasManualesDelMapping.map(mapeo => ({
        num_cuenta: mapeo.num_cuenta,
        nombre: mapeo.nombre || 'Cuenta Manual', // Usar el nombre guardado
        saldo: 0, // Las cuentas manuales del mapping inician en 0
        ejercicio: this.anioSeleccionado,
        id_mapping: this.selectedMapping,
        id_fsa: mapeo.id_fsa,
        nombre_balance: this.nombreBalance,
        fecha_inicio: this.fechaInicio,
        fecha_fin: this.fechaFin,
        id_empresa: this.selectedEmpresa,
        isManual: true 
      }));

      
      const todasLasFilas = [...filasManualesParaAgregar, ...filasProcesadas];

      this.totalDeudor = totalDeudor;
      this.totalAcreedor = totalAcreedor;
      this.resultadoSaldo = totalDeudor - totalAcreedor;
      this.cuentasNoMapeadas = cuentasNoMapeadas;

      if (cuentasNoMapeadas.length > 0) {
        this.msgWarning = `${cuentasNoMapeadas.length} cuentas no están mapeadas y se marcaron como "NO MAPPING".`;
      } else {
        this.msgWarning = '';
      }

      this.headers = headersFiltrados;
      this.tableData = todasLasFilas.map((b) => ({
        [headersFiltrados[0]]: b.num_cuenta,
        [headersFiltrados[1]]: b.nombre,
        [headersFiltrados[2]]: b.saldo,
        [headersFiltrados[3]]: b.ejercicio,
        [headersFiltrados[4]]: b.id_mapping,
        [headersFiltrados[5]]: b.id_fsa,
        [headersFiltrados[6]]: b.nombre_balance,
        [headersFiltrados[7]]: b.fecha_inicio,
        [headersFiltrados[8]]: b.fecha_fin,
        [headersFiltrados[9]]: b.id_empresa,
        isManual: b.isManual || false
      }));

      if (cuentasManuales.length > 0) {
        this.tableData.unshift(...cuentasManuales);
      }

      // ✅ Bandera: ya está procesado (aunque siempre parte de original)
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
    this.msgError =
      'Debe esperar a que el archivo se cargue completamente antes de procesar.';
    console.log(this.msgError);
    return;
  }

  const mappingSeleccionada = this.selectedMapping;

  if (!this.anioSeleccionado || !mappingSeleccionada) {
    this.showSpinner = false;
    this.msgError = 'Debe seleccionar una mapping y una fecha';
    console.log(this.msgError);
    return;
  }

  if (!this.originalTableData || !this.originalHeaders) {
    this.showSpinner = false;
    this.msgError = 'Primero debes visualizar el archivo procesado';
    console.log(this.msgError);
    return;
  }

  const anioArchivo = this.ejercicioValidar;
  const anioSeleccionado = this.anioSeleccionado.toString();

  // Función interna para manejar la secuencia de validaciones
  const validarSecuencia = () => {
    // 1. VALIDACIÓN: Todas las cuentas deben tener FSA
    const cuentasSinFsa = this.tableData.filter((row) => {
      const v = row['FSA'] ?? row[this.headers[5]] ?? '';
      return !String(v).trim();
    });
    if (cuentasSinFsa.length > 0) {
      this.showSpinner = false;
      Swal.fire({
        title: 'Validación de FSA',
        icon: 'error',
        html: `<p>Existen <b>${cuentasSinFsa.length}</b> cuentas sin FSA asignado.</p>
               <p class="text-danger">Todas las cuentas deben tener un FSA antes de continuar.</p>`,
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    // 2. VALIDACIÓN: FSA inexistente en catálogo
    const fsaIds = this.fsas.map((f) => String(f.id_fsa ?? '').trim());
    const cuentasConFsaInvalido = this.tableData.filter((row) => {
      const v = row['FSA'] ?? row[this.headers[5]] ?? '';
      return String(v).trim() && !fsaIds.includes(String(v).trim());
    });
    if (cuentasConFsaInvalido.length > 0) {
      this.showSpinner = false;
      Swal.fire({
        title: 'FSA inválido detectado',
        icon: 'error',
        html: `<p>Existen <b>${cuentasConFsaInvalido.length}</b> cuentas con un FSA que no está en el catálogo.</p>
               <p class="text-danger">Debes crear el FSA correspondiente antes de continuar.</p>`,
        confirmButtonText: 'Aceptar',
      });
      return;
    }

    // 3. VALIDACIÓN: Cambios en el FSA
    console.log('--- [INICIO VALIDACIÓN 5] ---');
    const cambiosFsa: any[] = [];
    const normalizedHeaders = this.headers.map((h) => String(h ?? '').trim());
    const cuentaKey =
      this.headers.find((h) => String(h ?? '').toLowerCase().includes('cuenta')) ||
      this.headers[0];
    const fsaKey =
      this.headers.find((h) => String(h ?? '').toLowerCase() === 'fsa') ||
      this.headers.find((h) => String(h ?? '').toLowerCase().includes('fsa')) ||
      this.headers[5] ||
      'FSA';
    console.log('[DEBUG] Headers:', this.headers);
    console.log(`[DEBUG] Key de 'cuenta' detectada: "${cuentaKey}"`);
    console.log(`[DEBUG] Key de 'FSA' detectada: "${fsaKey}"`);

    const headerIndexMap = new Map<string, number>();
    normalizedHeaders.forEach((h, i) => headerIndexMap.set(h, i));
    const readCell = (row: any, key: string) => {
      if (row == null) return '';
      const kTrim = String(key ?? '').trim();
      if (Array.isArray(row)) {
        const idx = headerIndexMap.get(kTrim);
        return typeof idx === 'number' ? row[idx] ?? '' : '';
      } else if (typeof row === 'object') {
        return row[key] ?? row[kTrim] ?? '';
      }
      return '';
    };

    console.log('[DEBUG] Mapa de FSA original (antes de normalizar):', this.initialFsaMap);
    const normalizedInitialFsaMap = new Map<string, string>();
    try {
      if (this.initialFsaMap && typeof (this.initialFsaMap as any).entries === 'function') {
        for (const [k, v] of (this.initialFsaMap as any).entries()) {
          normalizedInitialFsaMap.set(String(k ?? '').trim(), String(v ?? '').trim());
        }
      } else if (this.initialFsaMap && typeof this.initialFsaMap === 'object') {
        Object.keys(this.initialFsaMap).forEach((k) =>
          normalizedInitialFsaMap.set(String(k ?? '').trim(), String((this.initialFsaMap as any)[k] ?? '').trim())
        );
      }
    } catch (e) {
      console.error('Error normalizando initialFsaMap', e);
    }
    console.log('[DEBUG] Mapa de FSA normalizado (listo para comparar):', normalizedInitialFsaMap);

    (this.tableData || []).forEach((currentRow: any, rowIndex: number) => {
      const rawCuenta = readCell(currentRow, cuentaKey);
      const cuentaId = String(rawCuenta ?? '').trim();
      const fsaOriginal = normalizedInitialFsaMap.get(cuentaId) ?? '';
      const fsaNuevo = String(readCell(currentRow, fsaKey) ?? '').trim();

      console.log(
        `[Fila ${rowIndex}] Cuenta: "${cuentaId}" | FSA Original (Mapping): "${fsaOriginal}" | FSA Nuevo (Archivo): "${fsaNuevo}"`
      );

      const isManual = currentRow.isManual || false;
      const nombreCuenta = readCell(currentRow, this.headers[1]);

      if (fsaOriginal !== fsaNuevo) {
        console.warn(`  -> ¡CAMBIO DETECTADO en la fila ${rowIndex} para la cuenta "${cuentaId}"!`);
        cambiosFsa.push({
          rowIndex,
          cuenta: cuentaId || '(sin nombre)',
          fsaOriginal: fsaOriginal || 'N/A',
          fsaNuevo: fsaNuevo || 'N/A',
          nombre: isManual ? nombreCuenta : null,
          isManual: isManual
        });
      }
    });
    console.log('--- [FIN DE COMPARACIÓN] ---');
    console.log(`[DEBUG] Total de cambios encontrados: ${cambiosFsa.length}`);

    if (cambiosFsa.length > 0) {
      console.log('[DEBUG] Detalles de los cambios:', cambiosFsa);
      this.showSpinner = false;
      let htmlCambios = '<ul class="text-start">';
      cambiosFsa.forEach((c) => {
        htmlCambios += `<li><b>${c.cuenta}</b>: de <span class="text-danger">${c.fsaOriginal}</span> → <span class="text-success">${c.fsaNuevo}</span></li>`;
      });
      htmlCambios += '</ul>';

      const isBaseMapping = this.selectedMapping === 'MP-01';
      const swalOptions: any = {
        title: 'Cambios de FSA Detectados',
        icon: 'warning',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
      };

      if (isBaseMapping) {
        // Si es el mapping base, solo permitimos CREAR.
        swalOptions.html = `<p>Se detectaron <b>${cambiosFsa.length}</b> cambios en las asignaciones de FSA partiendo del mapping base <b>(MP-01)</b>.</p>
               ${htmlCambios}
               <p class="mt-3">Estos cambios no estan contemplados en el mapping actual <b>${this.selectedMapping} - ${this.mappingCompleto.find((m) => m.id_mapping === this.selectedMapping)?.descripcion}</b>. al ser el mapping <b>${this.selectedMapping}</b> debes crear uno nuevo</p>`,
        swalOptions.confirmButtonText = 'Crear Nuevo Mapping';
        swalOptions.showDenyButton = false; // <-- LA CLAVE: Ocultamos el botón de actualizar

      } else {
        // Si es cualquier otro mapping, permitimos AMBAS opciones.
        swalOptions.html = `<p>Se detectaron <b>${cambiosFsa.length}</b> cambios en las asignaciones de FSA.</p>
               ${htmlCambios}
               <p class="mt-3">Estos cambios no están contemplados en el mapping actual <b>${this.selectedMapping} - ${this.mappingCompleto.find((m) => m.id_mapping === this.selectedMapping)?.descripcion}</b>.<br><b>¿Qué desea hacer?</b></p>`;
        swalOptions.showDenyButton = true; // <-- Mostramos el botón
        swalOptions.confirmButtonText = 'Crear nuevo';
        swalOptions.denyButtonText = 'Actualizar';
      }
      
      // --- FIN DE LA NUEVA VALIDACIÓN ---
      Swal.fire(swalOptions).then((result) => {
        if (result.isDenied) {
          const updates$ = cambiosFsa.map((cambio) =>
            this.mappingService.crearOActualizarMapeo({
              num_cuenta: cambio.cuenta,
              id_fsa: cambio.fsaNuevo,
              id_mapping: this.selectedMapping,
              descripcion: this.mappingCompleto.find((m) => m.id_mapping === this.selectedMapping)?.descripcion || 'Actualizado desde subida de balances',
              nombre: cambio.nombre,
              isManual: cambio.isManual
            })
          );
          forkJoin(updates$).subscribe({
            next: () => {
              Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Catálogo actualizado.', showConfirmButton: false, timer: 2000 });
              this.continuarProcesamiento();
            },
            error: (err) => {
              this.showSpinner = false;
              const errorMsg = err?.error?.message || err?.message || 'No se pudo actualizar el catálogo.';
              Swal.fire('Error', errorMsg, 'error');
            },
          });
        } else if (result.isConfirmed) {
          Swal.fire({
            title: 'Crear nuevo Mapping',
            html: `<input id="swal-input-descripcion" class="swal2-input" placeholder="Descripción del mapping">
                   <div style="position: relative; width: 100%;">
                     <input id="swal-input-codigo" class="swal2-input pe-5" placeholder="Código del mapping" />
                     <button type="button" id="btn-generar-codigo" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); border: none; background: transparent; cursor: pointer; color: #6c757d;">
                       <i class="bi bi-dice-5-fill"></i>
                     </button>
                   </div>`,
            didOpen: () => {
              const btn = document.getElementById('btn-generar-codigo');
              const input = document.getElementById('swal-input-codigo') as HTMLInputElement;
              if (btn && input) {
                btn.addEventListener('click', () => {
                  const randomNum = Math.floor(100 + Math.random() * 900);
                  input.value = `MP-${randomNum}`;
                });
              }
            },
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
              const descripcion = (document.getElementById('swal-input-descripcion') as HTMLInputElement)?.value?.trim();
              const codigo = (document.getElementById('swal-input-codigo') as HTMLInputElement)?.value?.trim();
              if (!descripcion || !codigo) {
                Swal.showValidationMessage('Debes ingresar ambos campos');
                return null;
              }
              return { descripcion, codigo };
            },
          }).then((result) => {
            if (result.isConfirmed && result.value) {
              this.showSpinner = true;
              this.mappinngNuevo = cambiosFsa.map((cambio) => ({
                id_mapping: result.value.codigo,
                descripcion: result.value.descripcion,
              }));
              console.log('[INFO] Nuevo mapping a crear: ', this.mappinngNuevo);
              this.mappingService.cloneMapping({
                idMappingOrigen: this.selectedMapping, idMappingNuevo: result.value.codigo, descripcionNueva: result.value.descripcion,
              }).subscribe({
                next: (mappingRes: any) => {
                  const nuevoMappingId = mappingRes?.data?.id_mapping || result.value.codigo;
                  const updates$ = cambiosFsa.map((cambio) =>
                    this.mappingService.crearOActualizarMapeo({
                      num_cuenta: cambio.cuenta, 
                      id_fsa: cambio.fsaNuevo, 
                      id_mapping: nuevoMappingId, 
                      descripcion: result.value.descripcion,
                      nombre: cambio.nombre,
                      isManual: cambio.isManual
                    })
                  );
                  forkJoin(updates$).subscribe({
                    next: () => {
                      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Nuevo mapping creado y actualizado.', showConfirmButton: false, timer: 2000 });
                      this.selectedMapping = nuevoMappingId;
                      this.continuarProcesamiento();
                    },
                    error: (err) => {
                      this.showSpinner = false;
                      const errorMsg = err?.error?.message || err?.message || 'No se pudo crear el mapping.';
                      Swal.fire('Error', errorMsg, 'error');
                    },
                  });
                },
                error: (err) => {
                  this.showSpinner = false;
                  const errorMsg = err?.error?.error || err?.message || 'No se pudo crear el mapping.';
                  Swal.fire('Error', errorMsg, 'error');
                },
              });
            }
          });
        }
      });
      return;
    }

    if(this.isDistribuited){
      this.showSpinner = false;
      Swal.fire({
        title: 'Distribución realizada',
        icon: 'info',
        html: `<p>Has realizado una distribución de saldo.<br>¿Deseas continuar con el procesamiento o seguir trabajando?</p>`,
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Seguir trabajando',
      })
      .then((result) => {
        if (result.isConfirmed) {
          this.showSpinner = true;
          this.continuarProcesamiento();
        }
      });
      return;
    }

    // Si no hay errores ni cambios, continúa directamente
    this.showSpinner = false;
    this.continuarProcesamiento();
  };

  // Validaciones de año con control de flujo para llamar a la secuencia de validación principal
  if (!anioArchivo) {
    let timerInterval: any;
    let secondsLeft = 5;
    Swal.fire({
      title: '¿Deseas continuar?',
      icon: 'warning',
      html: `<p><b>El archivo no contiene información del periodo (año)</b>, por lo tanto no se puede validar contra el año seleccionado (<b>${anioSeleccionado}</b>).</p>
             <p><strong>Podrás continuar en <b><span id="timer">${secondsLeft}</span></b> segundos...</strong></p>
             <p class="text-danger">* La validación quedará a tu responsabilidad.</p>`,
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
      willClose: () => clearInterval(timerInterval),
    }).then((result) => {
      this.showSpinner = false;
      if (result.isConfirmed) {
        validarSecuencia();
      }
    });
    return;
  }

  if (anioArchivo !== anioSeleccionado) {
    let timerInterval: any;
    let secondsLeft = 5;
    Swal.fire({
      title: '¿Deseas continuar?',
      icon: 'warning',
      html: `<p>El año seleccionado (<b>${anioSeleccionado}</b>) no coincide con el periodo del archivo (<b>${anioArchivo}</b>).</p>
             <p><strong>Podrás continuar en <b><span id="timer">${secondsLeft}</span></b> segundos...</strong></p>`,
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
      willClose: () => clearInterval(timerInterval),
    }).then((result) => {
      this.showSpinner = false;
      if (result.isConfirmed) {
        validarSecuencia();
      }
    });
    return;
  }

  // Si las validaciones de año pasan, se ejecuta la secuencia de validaciones principal
  validarSecuencia();
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

      const datosParaEnviar = this.tableData.map((row) => {
        return {
          num_cuenta: row[this.headers[0]],
          nombre: row[this.headers[1]],
          saldo: row[this.headers[2]],
          id_fsa: row[this.headers[5]],

          ejercicio: currentEjercicio,
          id_mapping: currentMappingId,
          nombre_balance: currentNombreBalance,
          fecha_inicio: currentFechaInicio,
          fecha_fin: currentFechaFin,
          id_empresa: currentEmpresaId,
          fecha_procesado: fechaProcesado,
        };
      });

      console.log(
        'BULK ENVIADO A BACK (corregido y consistente): ',
        datosParaEnviar
      );

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
            this.router.navigate(['balances'])
          });
        },
        error: async (err) => {
          this.showSpinner = false;
          const errorMessage =
            err?.error?.message || err?.message || 'Error al subir balances.';
          // HAY QUE ARREGLAR ESTO, NO ES POSIBLE QUE POR UN ERROR SE BORRE UN MAPPING AUTOMATICAMENTE
          // Eliminar el mapping en caso de error
          // try {
          //   await this.mappingService.deleteMapping(currentMappingId).toPromise();
          //   Swal.fire({
          //     icon: 'error',
          //     title: 'Error',
          //     text: errorMessage + ' El mapping ha sido eliminado.',
          //     confirmButtonText: 'Cerrar',
          //   });
          // } catch (deleteErr) {
          //   Swal.fire({
          //     icon: 'error',
          //     title: 'Error',
          //     text: errorMessage + ' Además, no se pudo eliminar el mapping.',
          //     confirmButtonText: 'Cerrar',
          //   });
          // }
          this.msgError = errorMessage;
        },
      });
    } catch (err: any) {
      this.showSpinner = false;
      const errorMessage =
        err?.error?.message ||
        err?.message ||
        'Error al procesar la información para el envío.';

      // Eliminar el mapping en caso de error
      this.mappingService.deleteMapping(this.selectedMapping).subscribe({
        next: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage + ' El mapping ha sido eliminado.',
            confirmButtonText: 'Cerrar',
          });
        },
        error: () => {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage + ' Además, no se pudo eliminar el mapping.',
            confirmButtonText: 'Cerrar',
          });
        },
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

    const blob = new Blob([csv], { type: 'text/csv;charset=latin-1;' });
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
    this.ngOnDestroy();
    this.router.navigate(['home']);
  }

  abrirModal() {
    const modalRef = this.modalService.open(ModalFsa, { size: 'lg' });
    modalRef.componentInstance.title = 'Crear FSA';

    modalRef.result.then(
      (result) => {
        if (result === 'guardar') {
          console.log('Guardado exitoso');
        }
      },
      () => {
        console.log('Modal cerrado sin guardar');
      }
    );
  }

  
  /**
   * Inicia el modo de distribución desde una fila específica.
   * @param row La fila de la cuenta origen.
   */
  startDistribution(row: any): void {
    this.cancelDistribution(); // Resetea cualquier estado anterior
    this.isDistributionMode = true;
    this.sourceAccount = row;

    this.tableData.forEach(r => {
      r.isSelected = false;
      r.isSelectionDisabled = (r === this.sourceAccount);
    });
  }

  /**
   * Cancela el modo de distribución y limpia la selección.
   */
  cancelDistribution(): void {
    this.isDistributionMode = false;
    this.sourceAccount = null;
    this.tableData.forEach(r => {
      delete r.isSelected;
      delete r.isSelectionDisabled;
    });
  }

  /**
   * Abre el modal para realizar la distribución.
   */
  openDistributionModal(): void {
    const selectedDestinations = this.tableData.filter(r => r.isSelected && !r.isSelectionDisabled);

    if (selectedDestinations.length === 0) {
      Swal.fire('Atención', 'Debes seleccionar al menos una cuenta de destino.', 'warning');
      return;
    }
    
    const modalRef = this.modalService.open(ModalDistribucion, {
      size: 'lg',
      backdrop: 'static',
      
    });

    modalRef.componentInstance.sourceAccount = this.sourceAccount;
    modalRef.componentInstance.destinationAccounts = selectedDestinations;
    modalRef.componentInstance.headers = this.headers;

    modalRef.result.then((result) => {
      if (result) {
        this.isDistribuited = true;
        console.log('bandera distribuited en true');
        this.applyDistribution(result);
      }
    }).catch(() => {
      this.isDistribuited = false;
      console.log('bandera distribuited en false');
      console.log('Distribución cancelada por el usuario.');
    });
  }

  /**
   * Aplica los cambios de la distribución a la tabla.
   * @param distributionData Los datos calculados devueltos por el modal.
   */
  applyDistribution(distributionData: { updates: any[], totalDistributed: number }): void {
    const codigoKey = this.headers[0];
    const saldoKey = this.headers[2]; // 'Saldo Actual'

    distributionData.updates.forEach(update => {
      const accountToUpdate = this.tableData.find(row => row[codigoKey] === update.codigo);
      if (accountToUpdate) {
        // Los saldos pueden ser negativos, por eso es una suma simple.
        accountToUpdate[saldoKey] += update.amountToAdd;
      }
    });

        // 2. CORRECCIÓN: Busca la cuenta de origen en la tabla y actualízala
    const sourceAccountCode = this.sourceAccount[codigoKey];
    const sourceAccountInTable = this.tableData.find(row => row[codigoKey] === sourceAccountCode);
    
    if (sourceAccountInTable) {
      sourceAccountInTable[saldoKey] -= distributionData.totalDistributed;
    } else {
      // Opcional: Manejar el caso improbable de que la cuenta de origen no se encuentre
      console.error('Error: No se encontró la cuenta de origen en la tabla para actualizar el saldo.');
      Swal.fire('Error Inesperado', 'No se pudo actualizar el saldo de la cuenta de origen.', 'error');
    }

    this.cancelDistribution();
    
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Saldo distribuido correctamente',
        showConfirmButton: false,
        timer: 2500
    });
  }

  agregarNuevaCuenta(): void {
  // Verificación de seguridad: no debería ocurrir si el botón está bien condicionado.
  if (!this.processed || this.tableData.length === 0) {
    Swal.fire('Acción no disponible', 'Primero debe procesar la información para poder agregar cuentas.', 'info');
    return;
  }

  Swal.fire({
    title: 'Agregar Nueva Cuenta',
    html: `
      <p class="small text-muted">La nueva cuenta heredará los parámetros del balance actual (ejercicio, mapping, fechas, etc.). El saldo inicial será 0 y el FSA deberá ser asignado manualmente.</p>
      <input id="swal-input-cuenta" class="swal2-input" placeholder="Código / N° Cuenta">
      <input id="swal-input-nombre" class="swal2-input" placeholder="Nombre de la cuenta">
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: 'Agregar',
    cancelButtonText: 'Cancelar',
    preConfirm: () => {
      const cuentaInput = document.getElementById('swal-input-cuenta') as HTMLInputElement;
      const nombreInput = document.getElementById('swal-input-nombre') as HTMLInputElement;
      const cuenta = cuentaInput.value.trim();
      const nombre = nombreInput.value.trim();

      // Validación de campos vacíos
      if (!cuenta || !nombre) {
        Swal.showValidationMessage('El código y el nombre son obligatorios.');
        return null;
      }

      // Validación de cuenta duplicada
      const cuentaKey = this.headers[0]; // Asume que la primera columna es siempre el N° de cuenta
      const existe = this.tableData.some(row => row[cuentaKey] === cuenta);
      if (existe) {
        Swal.showValidationMessage(`La cuenta '${cuenta}' ya existe en la tabla.`);
        return null;
      }

      return { cuenta, nombre };
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      const { cuenta, nombre } = result.value;
      const templateRow = this.tableData[0]; // Usamos la primera fila como plantilla para heredar datos

      // Construimos el objeto de la nueva cuenta usando los headers actuales como llaves
      const nuevaCuenta: any = {
        [this.headers[0]]: cuenta,                 // num_cuenta (ingresado por usuario)
        [this.headers[1]]: nombre,                 // nombre (ingresado por usuario)
        [this.headers[2]]: 0,                      // Saldo Actual (inicia en 0)
        [this.headers[3]]: templateRow[this.headers[3]], // Ejercicio (heredado)
        [this.headers[4]]: templateRow[this.headers[4]], // Mapping (heredado)
        [this.headers[5]]: null,                   // FSA (se inicializa vacío)
        [this.headers[6]]: templateRow[this.headers[6]], // Nombre Balance (heredado)
        [this.headers[7]]: templateRow[this.headers[7]], // Fecha Inicio (heredado)
        [this.headers[8]]: templateRow[this.headers[8]], // Fecha Fin (heredado)
        [this.headers[9]]: templateRow[this.headers[9]], // Empresa (heredado)
        isManual: true
      };

      // Agregamos la nueva cuenta al principio del array para que sea visible inmediatamente
      this.tableData.unshift(nuevaCuenta);

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Cuenta agregada correctamente',
        showConfirmButton: false,
        timer: 2000
      });
    }
  });
}
editarCuentaManual(row: any): void {
    const cuentaKey = this.headers[0];
    const nombreKey = this.headers[1];

    Swal.fire({
      title: 'Editar Cuenta Manual',
      html: `
        <input id="swal-input-cuenta" class="swal2-input" placeholder="Código / N° Cuenta" value="${row[cuentaKey]}">
        <input id="swal-input-nombre" class="swal2-input" placeholder="Nombre de la cuenta" value="${row[nombreKey]}">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const nuevoCodigo = (document.getElementById('swal-input-cuenta') as HTMLInputElement).value.trim();
        const nuevoNombre = (document.getElementById('swal-input-nombre') as HTMLInputElement).value.trim();

        if (!nuevoCodigo || !nuevoNombre) {
          Swal.showValidationMessage('El código y el nombre son obligatorios.');
          return null;
        }

        // Validar si el nuevo código ya existe en otra fila
        const existe = this.tableData.some(item => item !== row && item[cuentaKey] === nuevoCodigo);
        if (existe) {
          Swal.showValidationMessage(`La cuenta '${nuevoCodigo}' ya existe.`);
          return null;
        }

        return { nuevoCodigo, nuevoNombre };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const { nuevoCodigo, nuevoNombre } = result.value;
        // Actualizamos los datos en la fila original
        row[cuentaKey] = nuevoCodigo;
        row[nombreKey] = nuevoNombre;

        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Cuenta actualizada',
          showConfirmButton: false,
          timer: 2000
        });
      }
    });
  }

  /**
   * Elimina una cuenta agregada manualmente de la tabla.
   * @param row La fila de la cuenta a eliminar.
   */
  eliminarCuentaManual(row: any): void {
    const cuentaKey = this.headers[0];
    
    Swal.fire({
      title: '¿Estás seguro?',
      text: `Se eliminará la cuenta "${row[cuentaKey]}" de la tabla. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const index = this.tableData.findIndex(item => item === row);
        if (index > -1) {
          this.tableData.splice(index, 1);
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Cuenta eliminada',
            showConfirmButton: false,
            timer: 2000
          });
        }
      }
    });
  }

/**
   * Alterna la selección de una fila como destino en el modo de distribución.
   * Se activa al hacer clic en la fila.
   * @param row La fila sobre la que se hizo clic.
   */
  toggleRowSelection(row: any): void {
    // Solo funciona si estamos en modo distribución y la fila no es la de origen.
    if (this.isDistributionMode && !row.isSelectionDisabled) {
      row.isSelected = !row.isSelected;
    }
  }

 /**
   * Maneja el evento de clic derecho para mostrar el menú contextual.
   * @param event El MouseEvent para posicionar el menú.
   */
  onRightClick(event: MouseEvent): void {
    event.preventDefault(); // Evita el menú nativo del navegador.

    const menu = document.getElementById('actionsContextMenu');
    if (!menu) return;

    // Posicionamos el menú usando pageX/pageY, como en tu ejemplo.
    menu.style.display = 'block';
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';

    // Añadimos un listener para ocultar el menú al hacer clic en cualquier otro lado.
    // La opción { once: true } hace que el listener se elimine solo después de ejecutarse.
    const hideMenu = () => {
      menu.style.display = 'none';
      document.removeEventListener('click', hideMenu);
    };
    document.addEventListener('click', hideMenu);
  }

    toggleColumnVisibility(header: string, event: MouseEvent): void {
    event.stopPropagation(); // Previene que se dispare el sort
    
    const index = this.hiddenColumns.indexOf(header);
    if (index === -1) {
      // No está oculta, la ocultamos
      this.hiddenColumns.push(header);
    }
    // Si ya está oculta, el botón 'eye' no debería ser visible,
    // pero la lógica para mostrarla está en 'showColumn'.
  }
  /**
   * Muestra una columna. Llamado por el badge (X).
   */
  showColumn(header: string, event: MouseEvent): void {
    event.stopPropagation();
    const index = this.hiddenColumns.indexOf(header);
    if (index > -1) {
      this.hiddenColumns.splice(index, 1);
    }
  }

  /**
   * Verifica si una columna está oculta. Usado por *ngIf en el HTML.
   */
  isColumnHidden(header: string): boolean {
    return this.hiddenColumns.includes(header);
  }

  /**
   * Handler para el botón del ojo.
   */
  onColumnViewClick(h: string, event: MouseEvent) {
    this.toggleColumnVisibility(h, event);
  }

  /**
   * Calcula el colspan para el mensaje de tabla vacía.
   */
  get emptyMessageColspan(): number {
     const visibleColumnsCount = this.headers.length - this.hiddenColumns.length;
     const distributionCols = this.isDistributionMode ? 1 : 0;
     const actionCols = this.processed ? 1 : 0;
     return visibleColumnsCount + distributionCols + actionCols;
  }
}
