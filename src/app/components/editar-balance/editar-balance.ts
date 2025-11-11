import { Component, Input, OnInit, OnDestroy, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, Subscription, Subject } from 'rxjs';
import { finalize } from 'rxjs/operators';
import Swal from 'sweetalert2';

// Modelos y Servicios (Asegúrate de que las rutas sean correctas)
import { IBalanceGet } from '../../models/balance.model';
import { IEmpresa } from '../../models/empresa.model';
import { IFsa } from '../../models/fsa.model';
import { ImappingSelect } from '../../models/mapping.model';
import { BalanceService } from '../../services/balance.service';
import { EmpresaService } from '../../services/empresa.service';
import { FsaService } from '../../services/fsa.service';
import { MappingService } from '../../services/mapping.service';

// Componentes Reutilizados
import { Navbar } from '../navbar/navbar';
import { Spinner } from '../spinner/spinner';
import { ModalFsa } from '../modal-fsa/modal-fsa';
import { ModalDistribucion } from '../modal-distribucion/modal-distribucion';
import { IEstados } from '../../models/estado.model';
import { TableModule } from 'primeng/table';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-editar-balance',
  imports: [CommonModule,
    FormsModule,
    Spinner,
    TableModule,
    SelectModule],
  templateUrl: './editar-balance.html',
  styleUrl: './editar-balance.css',
  
})
export class EditarBalance implements OnInit, OnDestroy {
  @Input() id!: string; // ID del balance a editar
  @Input() estados: IEstados[] = [];

  // --- Propiedades del Estado y Datos ---
  balanceOriginal: IBalanceGet[] = [];
  tableData: any[] = [];
  headers: string[] = [];
  
  showSpinner = false;
  processed = false; // Se activa a true cuando los datos cargan
  msgError = '';

  // --- Propiedades para Selects y Listas ---
  fsas: IFsa[] = [];
  mappings: ImappingSelect[] = [];
  empresas: IEmpresa[] = [];
  listaAnios: number[] = [];

  // --- Propiedades ngModel para el Formulario ---
  nombreBalance: string = '';
  fechaInicio: string = '';
  fechaFin: string = '';
  anioSeleccionado: number | string | null = null;
  selectedMapping: string = '';
  selectedEmpresa: string = '';
  selectedEstado: string | number = '';
  resultadoSaldo: number = 0;
  
  // --- Funcionalidad de Distribución ---
  isDistributionMode = false;
  sourceAccount: any = null;
  isDistribuited = false;

  private subscriptions = new Subscription();

// --- NUEVAS PROPIEDADES PARA GUARDAR ESTADO ORIGINAL ---
  private originalTableData: any[] = [];
  private originalFormParams: any = {};
  // --- Variable que oculta columnas ---
  hiddenColumns: string[] = [];

  public selfElementRef: ElementRef;


  constructor(
    public activeModal: NgbActiveModal,
    private balanceService: BalanceService,
    private el: ElementRef,
    private mappingService: MappingService,
    private empresaService: EmpresaService,
    private fsaService: FsaService,
    private modalService: NgbModal
  ) {
    this.selfElementRef = el;
  }

  ngOnInit(): void {
    this.showSpinner = true;
    console.log("estados recibidos", this.estados)
    this.loadInitialSelects().then(() => {
      this.getBalance(this.id.toString());
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Carga los datos para todos los selects (Mappings, Empresas, FSAs).
   */
  async loadInitialSelects(): Promise<void> {
    const currentYear = new Date().getFullYear();
    this.listaAnios = Array.from({ length: 10 }, (_, i) => currentYear - i);

    return new Promise((resolve, reject) => {
      const selects$ = forkJoin({
        mappings: this.mappingService.getMappings(),
        empresas: this.empresaService.getEmpresas(),
        fsas: this.fsaService.getAllFsa(),
      });

      this.subscriptions.add(
        selects$.subscribe({
          next: (results) => {
            this.mappings = results.mappings.data;
            this.empresas = results.empresas.data;
            this.fsas = results.fsas.data.map((f: any) => ({
              ...f,
              display: `${f.id_fsa} - ${f.desc}`,
            }));
            resolve();
          },
          error: (err) => {
            this.msgError = 'Error fatal al cargar datos iniciales. No se puede continuar.';
            console.error(err);
            this.showSpinner = false;
            reject(err);
          },
        })
      );
    });
  }

  /**
   * Obtiene los datos del balance desde el servicio y prepara el componente.
   */
  getBalance(id: string): void {
    if (!id || id.trim().length === 0) {
      this.msgError = 'ID no proporcionado';
      return;
    }
    this.msgError = '';
    this.balanceService.getBalanceById(id)
      .pipe(finalize(() => (this.showSpinner = false)))
      .subscribe({
        next: (data: IBalanceGet[]) => {
          if (!data || data.length === 0) {
              this.msgError = 'No se encontraron datos para este balance.';
              return;
          }
          this.balanceOriginal = data;
          console.log('Balance inicial:', this.balanceOriginal);
          this.prepareComponent(data);
        },
        error: (err: any) => {
          console.error('Error al obtener balance:', err);
          this.msgError = 'Error al obtener el balance';
        },
      });
  }

  /**
   * Rellena el formulario y la tabla con los datos recibidos de la API.
   */
  prepareComponent(data: IBalanceGet[]): void {
    const firstRow = data[0];
    
    // 1. Rellenar campos del formulario
    this.nombreBalance = firstRow.nombre_conjunto;
    this.fechaInicio = this.formatDate(firstRow.fecha_inicio);
    this.fechaFin = this.formatDate(firstRow.fecha_fin);
    this.anioSeleccionado = firstRow.ejercicio;
    this.selectedMapping = firstRow.id_mapping;
    this.selectedEmpresa = firstRow.id_empresa ?? '';
    this.selectedEstado = firstRow.id_estado ?? '';
    
    // 2. Definir cabeceras de la tabla
    this.headers = [
      'N° Cuenta',
      'Nombre',
      'Saldo Actual',
      'Ejercicio',
      'Mapping',
      'FSA',
      'Nombre Balance',
      'Fecha Inicio',
      'Fecha Fin',
      'Empresa',
    ];

    this.hiddenColumns = [
      'Ejercicio',
      'Mapping',
      'Nombre Balance',
      'Fecha Inicio',
      'Fecha Fin',
      'Empresa'
    ];
    
    // 3. Transformar datos para la tabla
    this.tableData = data.map(row => ({
      [this.headers[0]]: row.num_cuenta,
      [this.headers[1]]: row.nombre,
      [this.headers[2]]: row.saldo,
      [this.headers[3]]: row.ejercicio,
      [this.headers[4]]: row.id_mapping,
      [this.headers[5]]: row.id_fsa,
      [this.headers[6]]: row.nombre_conjunto,
      [this.headers[7]]: this.formatDate(row.fecha_inicio),
      [this.headers[8]]: this.formatDate(row.fecha_fin),
      [this.headers[9]]: row.id_empresa,
      isManual: !!row.isManual
    }));

    this.originalTableData = JSON.parse(JSON.stringify(this.tableData));
    this.originalFormParams = {
      nombre_conjunto: this.nombreBalance,
      ejercicio: this.anioSeleccionado,
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin,
      id_mapping: this.selectedMapping,
      id_empresa: this.selectedEmpresa,
      id_estado: this.selectedEstado,
    };    
    // 4. Calcular saldo y activar la vista
    this.recalculateTotal();
    this.processed = true;
  }

  /**
   * Compara el estado actual con el original y genera un resumen en HTML.
   */
  private generarResumenDeCambios(): string {
    let htmlChanges = '';
    const cuentaKey = this.headers[0];
    const nombreKey = this.headers[1];
    const saldoKey = this.headers[2];
    const fsaKey = this.headers[5];

    // 1. Comparar parámetros generales
    let paramsHtml = '';
    if (this.originalFormParams.nombre_conjunto !== this.nombreBalance) paramsHtml += `<li><b>Nombre:</b> "${this.originalFormParams.nombre_conjunto}" → "${this.nombreBalance}"</li>`;
    if (this.originalFormParams.ejercicio != this.anioSeleccionado) paramsHtml += `<li><b>Ejercicio:</b> ${this.originalFormParams.ejercicio} → ${this.anioSeleccionado}</li>`;
    if (this.originalFormParams.id_estado != this.selectedEstado) { // <-- AÑADIMOS COMPARACIÓN DE ESTADO
        const estadoOriginal = this.estados.find(e => e.id_estado == this.originalFormParams.id_estado)?.desc || 'N/A';
        const estadoNuevo = this.estados.find(e => e.id_estado == this.selectedEstado)?.desc || 'N/A';
        paramsHtml += `<li><b>Estado:</b> "${estadoOriginal}" → "${estadoNuevo}"</li>`;
    }
    // ... (puedes agregar más comparaciones para fechas, mapping, etc. si lo deseas)

    if (paramsHtml) {
      htmlChanges += '<h6><i class="bi bi-info-circle-fill text-primary"></i> Parámetros Modificados</h6><ul>' + paramsHtml + '</ul>';
    }

    // 2. Comparar filas (agregadas, eliminadas, modificadas)
    const originalRowsMap = new Map(this.originalTableData.map(row => [row[cuentaKey], row]));
    const currentRowsMap = new Map(this.tableData.map(row => [row[cuentaKey], row]));
    
    let agregadasHtml = '';
    let eliminadasHtml = '';
    let modificadasHtml = '';

    currentRowsMap.forEach((row, key) => {
      if (!originalRowsMap.has(key)) {
        agregadasHtml += `<li>${row[cuentaKey]} - ${row[nombreKey]}</li>`;
      } else {
        const originalRow = originalRowsMap.get(key)!;
        let cambiosFila = '';
        if (originalRow[nombreKey] !== row[nombreKey]) cambiosFila += `<li>Nombre: "${originalRow[nombreKey]}" → "${row[nombreKey]}"</li>`;
        if (originalRow[saldoKey] !== row[saldoKey]) cambiosFila += `<li>Saldo: ${originalRow[saldoKey].toLocaleString()} → ${row[saldoKey].toLocaleString()}</li>`;
        if (originalRow[fsaKey] !== row[fsaKey]) cambiosFila += `<li>FSA: ${originalRow[fsaKey]} → ${row[fsaKey]}</li>`;
        
        if (cambiosFila) {
          modificadasHtml += `<h6>${row[cuentaKey]} - ${row[nombreKey]}</h6><ul>${cambiosFila}</ul>`;
        }
      }
    });

    originalRowsMap.forEach((row, key) => {
      if (!currentRowsMap.has(key)) {
        eliminadasHtml += `<li>${row[cuentaKey]} - ${row[nombreKey]}</li>`;
      }
    });
    
    if (agregadasHtml) htmlChanges += '<h6><i class="bi bi-plus-circle-fill text-success"></i> Cuentas Agregadas</h6><ul>' + agregadasHtml + '</ul>';
    if (eliminadasHtml) htmlChanges += '<h6><i class="bi bi-trash-fill text-danger"></i> Cuentas Eliminadas</h6><ul>' + eliminadasHtml + '</ul>';
    if (modificadasHtml) htmlChanges += '<h6><i class="bi bi-pencil-fill text-warning"></i> Cuentas Modificadas</h6><div class="summary-details">' + modificadasHtml + '</div>';

    return htmlChanges || '<p>No se han detectado cambios para guardar.</p>';
  }

  /**
   * Recalcula la suma de la columna 'Saldo Actual'.
   */
  recalculateTotal(): void {
    const saldoKey = this.headers[2];
    this.resultadoSaldo = this.tableData.reduce((acc, row) => acc + (Number(row[saldoKey]) || 0), 0);
  }

 /**
   * Guarda los cambios realizados en el balance, mostrando un resumen previo.
   */
  guardarCambios(): void {
    const resumen = this.generarResumenDeCambios();

    if (resumen.includes('No se han detectado cambios')) {
      Swal.fire('Sin Cambios', resumen, 'info');
      return;
    }

    Swal.fire({
      title: 'Resumen de Cambios',
      html: `<div class="text-start">${resumen}</div>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar cambios',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#28a745',
      customClass: {
        htmlContainer: 'swal2-html-container-custom'
      }
    }).then(result => {
      if (result.isConfirmed) {
        this.showSpinner = true;
        // La lógica de transformación y llamada al servicio sigue siendo la misma
        const datosParaEnviar = this.tableData.map(row => ({
          num_cuenta: row[this.headers[0]], 
          nombre: row[this.headers[1]],
          saldo: row[this.headers[2]], 
          id_fsa: row[this.headers[5]],
          nombre_conjunto: this.nombreBalance, 
          ejercicio: this.anioSeleccionado,
          fecha_inicio: this.fechaInicio, 
          fecha_fin: this.fechaFin,
          id_mapping: this.selectedMapping, 
          id_empresa: this.selectedEmpresa,
          id_estado: this.selectedEstado,
        }));
        
        this.subscriptions.add(
          this.balanceService.updateBalance(this.id.toString(), datosParaEnviar)
            .pipe(finalize(() => this.showSpinner = false))
            .subscribe({
              next: (response) => {
                Swal.fire('¡Actualizado!', response.message || 'El balance ha sido guardado.', 'success');
                console.log("enviar datos:", datosParaEnviar);
                this.activeModal.close('saved');
              },
              error: (err) => {
                Swal.fire('Error', err.message || 'No se pudieron guardar los cambios.', 'error');
              }
            })
        );
      }
    });
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
  // --- Helpers ---
  private formatDate(dateInput: string | Date): string {
    if (!dateInput) return '';
    try {
      const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
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

    /**
   * Oculta una columna. Llamado por el botón del ojo.
   */
  toggleColumnVisibility(header: string, event: MouseEvent): void {
    event.stopPropagation(); // Previene que se dispare el sort
    
    const index = this.hiddenColumns.indexOf(header);
    if (index === -1) {
      // No está oculta, la ocultamos
      this.hiddenColumns.push(header);
    }
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
     const actionCols = 1; // La columna de acciones siempre está visible
     return visibleColumnsCount + distributionCols + actionCols;
  }
}
