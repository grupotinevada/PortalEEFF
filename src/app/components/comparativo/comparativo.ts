import { AuthService } from './../../services/auth.service';
import { EmpresaService } from './../../services/empresa.service';
import { Component, OnInit } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { IEmpresa } from '../../models/empresa.model';
import { UsuarioLogin } from '../../models/usuario-login';
import { finalize, forkJoin, map, Observable, Subject, switchMap, take, takeUntil, throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormGroup, FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { BalanceResumen, IBalanceGet, IMacroCategoria, IMacroCategoriaComparativa } from '../../models/balance.model';
import { BalanceService } from '../../services/balance.service';
import Swal from 'sweetalert2';
import { Spinner } from '../spinner/spinner';
import { EEFFService } from '../../services/eeff.service';
import { FsaService } from '../../services/fsa.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ModalComparativo } from '../modal-comparativo/modal-comparativo';
import { SelectModule } from 'primeng/select';


@Component({
  selector: 'app-comparativo',
  imports: [Navbar, CommonModule, ReactiveFormsModule, Spinner, SelectModule],
  templateUrl: './comparativo.html',
  styleUrl: './comparativo.css',
})
export class Comparativo implements OnInit{

  readonly currentUser$: Observable<UsuarioLogin | null>;

  empresas: IEmpresa[] = [];
  msgError = '';

  // --- PROPIEDADES PARA FILTROS Y BALANCES
  filtersForm!: FormGroup; // Formulario para filtros (incluida la empresa)
  balances: BalanceResumen[] = [];
  total: number = 0;
  page: number = 1;
  limit: number = 10;
  showSpinner: boolean = false;

  // --- PROPIEDADES PARA LA COMPARACIÓN (NUEVAS)
  balanceActual: BalanceResumen | null = null;
  balanceAnterior: BalanceResumen | null = null;
  vistaComparativa: IMacroCategoriaComparativa[] | null = null;
  // --- DATA NECESARIA
  fsasData: any[] = [];

  private destroy$ = new Subject<void>();

  private readonly swalToast = Swal.mixin({
        toast: true,
        position: 'bottom-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
    });

  constructor(
    private empresaService: EmpresaService, 
    private authService: AuthService,
    private balanceService: BalanceService,
    private eeffService: EEFFService,
    private fsaService: FsaService,
    private fb : FormBuilder,
    private modalService: NgbModal){
    this.currentUser$ = this.authService.currentUser$;
  }

ngOnInit(): void {
    // 1. Inicializar el formulario con el campo para la empresa
    this.filtersForm = this.fb.group({
      idEmpresa: [''], // Campo para el ID de la empresa seleccionada
    });
    this.getFsaData();
    this.cargarEmpresas();

    // this.loadBalances(); 
  }

ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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

private getFsaData(): void {
    this.msgError = '';

    this.authService
      .isAuthenticated()
      .pipe(
        take(1),
        switchMap((isAuthenticated) => {
          if (!isAuthenticated) {
            return throwError(() => new Error('Usuario no autenticado'));
          }
          // Llamada al servicio FSA
          return this.fsaService.getAllFsa();
        }),
        map((res: { success: boolean, data: any[] }) => { // Tipado del res para seguridad
          if (res.success && Array.isArray(res.data)) {
            return res.data.filter(
              (f) => f.id_fsa && f.desc && f.id_cate && f.categoria
            );
          }
          throw new Error('Respuesta inválida del servicio FSA');
        }),
        finalize(() => (this.showSpinner = false)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (fsaData) => {
          // Almacena solo la data limpia y necesaria
          this.fsasData = fsaData.map((f) => ({
            ...f,
            display: `${f.id_fsa} - ${f.desc}`,
          }));
          console.log('FSA data cargada y almacenada:', this.fsasData);
        },
        error: (error) => {
          console.error('Error al obtener FSA:', error);
          this.msgError = error.message || 'Ocurrió un error inesperado al cargar el mapeo contable.';
          this.fsasData = [];
        },
      });
  }

loadBalances(): void {
    const empresaId = this.filtersForm.get('idEmpresa')?.value;

    if (!empresaId) {
      // 💡 Aseguramos el reseteo de los balances si no hay empresa seleccionada
      this.balances = []; 
      this.total = 0;
      return; 
    }

    // 💡 Limpiamos los balances antes de la llamada (para evitar datos "sucios" o parpadeos)
    this.balances = []; 

    this.showSpinner = true;
    const offset = (this.page - 1) * this.limit;
    const filtros = { ...this.filtersForm.value, limit: this.limit, offset }; 

    this.balanceService.getResumen(filtros)
      .pipe(
        finalize(() => this.showSpinner = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.balances = res.data;
            this.total = res.total;
            console.log('Balances cargados:', this.balances);
          } else {
            Swal.fire({
              icon: 'warning',
              title: 'Atención',
              text: 'No se pudieron cargar los balances para la empresa seleccionada.',
            });
            this.balances = [];
            this.total = 0;
          }
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: 'No se pudo comunicar con el servidor para obtener los balances.',
          });
          this.balances = [];
          this.total = 0;
        }
      });
  }

  // Reutiliza onApplyFilters
onApplyFilters(): void {
    this.balances = []; // Reset para paginación/visualización
    this.page = 1;
    this.loadBalances();
  }
  
  onPageChange(newPage: number): void {
    if (newPage >= 1 && newPage <= this.totalPages) {
      this.page = newPage;
      this.loadBalances();
    }
  }

get totalPages(): number {
    if (this.total === 0 || this.limit === 0) return 0;
    return Math.ceil(this.total / this.limit);
  }
  

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

 onResetFilters(): void {
    this.filtersForm.reset(); 
    this.onApplyFilters();    
  }

cargarBalanceCompleto(balance: BalanceResumen): void {
  // 1. Deselección: Si ya estaba seleccionado, se deselecciona.
  if (this.balanceActual?.id_blce === balance.id_blce) {
    this.balanceActual = null;
    this.swalToast.fire({ icon: 'info', title: `Balance ${balance.ejercicio} deseleccionado (Actual)` });
  } else if (this.balanceAnterior?.id_blce === balance.id_blce) {
    this.balanceAnterior = null;
    this.swalToast.fire({ icon: 'info', title: `Balance ${balance.ejercicio} deseleccionado (Anterior)` });

  // 2. Selección: Se selecciona en el primer slot disponible (Actual > Anterior).
  } else if (!this.balanceActual) {
    this.balanceActual = balance;
    this.swalToast.fire({ icon: 'success', title: `Balance ${balance.ejercicio} fijado como Actual` });
  } else if (!this.balanceAnterior) {
    this.balanceAnterior = balance;
    this.swalToast.fire({ icon: 'success', title: `Balance ${balance.ejercicio} fijado como Anterior` });
  } else {
    // 3. Dos balances seleccionados.
    Swal.fire({
      icon: 'warning',
      title: 'Dos Balances Seleccionados',
      text: 'Ya has seleccionado dos balances. Deselecciona uno o presiona "Generar Comparativo".',
    });
  }
  
  this.vistaComparativa = null;
}

// En Comparativo (Añadir)

deseleccionarBalance(periodo: 'actual' | 'anterior'): void {
    if (periodo === 'actual') {
        this.balanceActual = null;
        this.swalToast.fire({ icon: 'info', title: 'Balance Actual deseleccionado' });
    } else {
        this.balanceAnterior = null;
        this.swalToast.fire({ icon: 'info', title: 'Balance Anterior deseleccionado' });
    }
    this.vistaComparativa = null;
}


generarComparativo(): void {
    if (!this.balanceActual || !this.balanceAnterior) {
      Swal.fire({
        icon: 'warning',
        title: 'Selección Incompleta',
        text: 'Debes seleccionar un Balance Actual y un Balance Anterior para generar la comparación.',
      });
      return;
    }
    
    if (this.fsasData.length === 0) {
        Swal.fire({ icon: 'error', title: 'Falta Mapeo', text: 'No se pudo cargar la data FSA. No es posible generar el comparativo.' });
        return;
    }


    this.showSpinner = true;
    this.vistaComparativa = null;
    
    // 1. Obtener los balances completos (detalles de cuentas)
    // Se usa el servicio balanceService.getBalanceById() que devuelve IBalanceGet[]
    const detalleActual$ = this.balanceService.getBalanceById(this.balanceActual.id_blce);
    const detalleAnterior$ = this.balanceService.getBalanceById(this.balanceAnterior.id_blce);

    // 2. Usar forkJoin para esperar ambas llamadas al mismo tiempo
    forkJoin([detalleActual$, detalleAnterior$])
      .pipe(
        finalize(() => this.showSpinner = false),
        takeUntil(this.destroy$),
        // 3. Transformación de datos usando EEFFService
        map(([balancesActual, balancesAnterior]: [IBalanceGet[], IBalanceGet[]]) => {
          
          // Generar la vista agrupada por MacroCategoría para cada balance
          const vistaActual: IMacroCategoria[] = this.eeffService.generarVistaAgrupada(
            balancesActual, 
            this.fsasData
          );
          const vistaAnterior: IMacroCategoria[] = this.eeffService.generarVistaAgrupada(
            balancesAnterior, 
            this.fsasData
          );
          
          // Generar la vista comparativa final
          return this.eeffService.generarVistaComparativa(vistaActual, vistaAnterior);
        })
      )
      .subscribe({
          next: (comparativo) => {
            this.vistaComparativa = comparativo;
            console.log('Vista comparativa generada:', this.vistaComparativa);
            
            // *** LLAMADA AL NUEVO MODAL ***
            this.abrirModalComparativo(comparativo); 
          },
        error: (error) => {
          console.error('Error al generar el comparativo:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error de Comparación',
            text: error.message || 'Ocurrió un error al procesar la vista comparativa.',
          });
        }
      });
  }

intercambiarBalances(): void {
  if (!this.balanceActual && !this.balanceAnterior) {
    Swal.fire({
      icon: 'info',
      title: 'No hay balances',
      text: 'Debes seleccionar al menos dos balances para poder intercambiarlos.',
    });
    return;
  }
  
  const temp = this.balanceActual;
  this.balanceActual = this.balanceAnterior;
  this.balanceAnterior = temp;

  this.vistaComparativa = null;

  this.swalToast.fire({
    icon: 'success',
    title: 'Balances Intercambiados',
  });
}


abrirModalComparativo(vista: IMacroCategoriaComparativa[]): void {
  const modalRef = this.modalService.open(ModalComparativo, { 
    fullscreen: true, 
    centered: true, 
    scrollable: true,
  });
  
  // Pasamos la data procesada y los resúmenes de los balances
  modalRef.componentInstance.vistaComparativa = vista;
  modalRef.componentInstance.balanceActual = this.balanceActual;
  modalRef.componentInstance.balanceAnterior = this.balanceAnterior;
}

}
