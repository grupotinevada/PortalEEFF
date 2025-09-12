import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BalanceService } from '../../services/balance.service';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { BalanceResumen } from '../../models/balance.model';
import { AuthService } from '../../services/auth.service';
import { EstadoService } from '../../services/estado.service';
import { IEstados, IFsa } from '../../models/fsa.model';
import { Navbar } from '../navbar/navbar';
import { MappingService } from '../../services/mapping.service';
import { Imapping, ImappingSelect } from '../../models/mapping.model';
import { Spinner } from '../spinner/spinner';
import { ModalDetalle } from '../modal-detalle/modal-detalle';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { tap, switchMap, take, finalize, catchError, EMPTY, of, throwError, map, takeUntil, Subject } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-balances',
  imports: [CommonModule, Navbar, Spinner, ReactiveFormsModule],
  templateUrl: './balances.html',
  styleUrl: './balances.css'
})
export class Balances implements OnInit {
  msgError = ''
  currentView = 'list';
  balances: BalanceResumen[] = [];
  total = 0;
  page = 1;
  limit = 10;
  filtersForm!: FormGroup;
  loading = false;
  estados: IEstados[] = []
  filtroForm: any;
  
  mappings: ImappingSelect[] = [];


  fsas: IFsa[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private balanceService: BalanceService,
    private fb: FormBuilder,
    private authService: AuthService,
    private estadoService: EstadoService,
    private mappingService: MappingService,
    private modalService: NgbModal,
    
  ) { }

  ngOnInit(): void {
    this.filtersForm = this.fb.group({
      nombre: [''],
      ejercicio: [''],
      fechaInicio: [''],
      fechaFin: [''],
      idMapping: [''],
      idEstado: [''],
      idUser: ['']
    });

    this.loadBalances();

    this.getEstados();
    this.cargarMappings();
    this.getFsaData();
  }

private getEstados(): void {
  this.loading = true;
  this.msgError = ''; // Limpiar errores previos

  this.authService.isAuthenticated().pipe(
    take(1), 
    switchMap(isAuthenticated => {
      if (!isAuthenticated) {
        return throwError(() => new Error('Usuario no autenticado'));
      }
      return this.estadoService.getAllEstados();
    }),
    map(res => {
      if (res.success && Array.isArray(res.data)) {
        return res.data.filter(f => f.id_estado && f.desc && f.color);
      }
      throw new Error('Respuesta inválida del servicio FSA');
    }),
    finalize(() => this.loading = false)

  ).subscribe({
    next: (estadosFiltrados) => {
      this.estados = estadosFiltrados;
      console.log('estados data cargada:', this.estados);
    },
    error: (error) => {
      console.error('Error al obtener FSA:', error);
      this.msgError = error.message || 'Ocurrió un error inesperado';
      this.estados = [];
    }
  });
}

private cargarMappings() {
  this.loading = true;
  this.msgError = '';

  this.authService.isAuthenticated().pipe(
    take(1),
    switchMap(isAuthenticated => {
      if (!isAuthenticated) {
        return throwError(() => new Error('Usuario no autenticado'));
      }
      return this.mappingService.getMappings();
    }),
    map(res => {
      if (res.success) {
        return res.data;
      }
      throw new Error('La respuesta del servicio de mappings no fue exitosa');
    }),
    finalize(() => this.loading = false)

  ).subscribe({
    next: (mappingsData) => {
      this.mappings = mappingsData;
    },
    error: (error) => {
      console.error('Error de API al cargar mappings:', error);
      this.msgError = error.message || 'Ocurrió un error inesperado';
    }
  });
}

loadBalances(): void {
    this.loading = true;
    const offset = (this.page - 1) * this.limit;
    const filtros = { ...this.filtersForm.value, limit: this.limit, offset };

    this.balanceService.getResumen(filtros)
      .pipe(
        finalize(() => this.loading = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.balances = res.data;
            this.total = res.total;
          } else {
            // 2. REEMPLAZO: Muestra un error de negocio con Swal
            Swal.fire({
              icon: 'warning',
              title: 'Atención',
              text: 'No se pudieron cargar los datos correctamente.',
            });
            this.balances = [];
            this.total = 0;
          }
        },
        error: (err) => {
          // 3. REEMPLAZO: Muestra un error de conexión con Swal
          Swal.fire({
            icon: 'error',
            title: 'Error de Conexión',
            text: 'No se pudo comunicar con el servidor. Por favor, inténtelo de nuevo más tarde.',
          });
        }
      });
  }

 onApplyFilters(): void {
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  abrirModal(id: string) {
    const modalRef = this.modalService.open(ModalDetalle, {
      fullscreen: true,
      backdrop: 'static',
      centered: false, 

    });

    modalRef.componentInstance.mappings = this.mappings;
    modalRef.componentInstance.fsas = this.fsas;
    modalRef.componentInstance.id = id;

  }



  
  
private getFsaData(): void {
  this.loading = true;
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
      // continúa con la llamada para obtener los datos FSA.
      return this.balanceService.getAllFsa();
    }),

    // transforma la respuesta exitosa.
    map(res => {
      if (res.success && Array.isArray(res.data)) {
        // devuelve los datos filtrados.
        return res.data.filter(
          f => f.id_fsa && f.desc && f.id_cate && f.categoria
        );
      }
      // lanza un error si la respuesta no es válida.
      throw new Error('Respuesta inválida del servicio FSA');
    }),

    // se ejecuta siempre al final para ocultar el spinner.
    finalize(() => this.loading = false)

  ).subscribe({
    next: (fsaData) => {
      this.fsas = fsaData;
      console.log('FSA data cargada:', this.fsas);
    },
    error: (error) => {
      console.error('Error al obtener FSA:', error);
      this.msgError = error.message || 'Ocurrió un error inesperado';
      this.fsas = [];
    }
  });
}
}