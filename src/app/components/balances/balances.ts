import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { BalanceService } from '../../services/balance.service';
import { FormBuilder, FormGroup } from '@angular/forms';
import { BalanceResumen } from '../../models/balance.model';
import { AuthService } from '../../services/auth.service';
import { DefaultMappingService } from '../../services/default-mapping.service';
import { IEstados, IFsa } from '../../models/fsa.model';
import { Navbar } from '../navbar/navbar';
import { MappingService } from '../../services/mapping.service';
import { mapping } from '../../models/mapping.model';
import { Spinner } from '../spinner/spinner';
import { ModalDetalle } from '../modal-detalle/modal-detalle';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-balances',
  imports: [CommonModule, Navbar, Spinner],
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
  
  mappings: mapping[] = [];


  fsas: IFsa[] = [];
  fsas2: IFsa[] = [];

  constructor(
    private balanceService: BalanceService,
    private fb: FormBuilder,
    private authService: AuthService,
    private defaultMappingService: DefaultMappingService,
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
    this.authService.checkAuth().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          this.defaultMappingService.getAllEstados().subscribe({
            next: (res) => {
              if (res.success && Array.isArray(res.data)) {
                this.estados = res.data.filter(
                  (f) => f.id_estado && f.desc && f.color);
                console.log('estados data cargada:', this.estados);
              } else {
                console.warn('Respuesta inválida del servicio FSA');
                this.estados = [];
              }
              this.loading = false;
            },
            error: (error) => {
              console.error('Error al obtener FSA:', error);
              this.loading = false;
              this.estados = [];
            },
          });
        } else {
          this.loading = false;
          this.msgError = 'Usuario no autenticado';
        }
      },
      error: () => {
        this.loading = false;
        this.msgError = 'Error al verificar autenticación';
      },
    });
  }

  private cargarMappings() {
    this.loading = true;
    this.authService.checkAuth().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          this.mappingService.getMappings().subscribe({
            next: (res) => {
              if (res.success) {
                this.mappings = res.data;
              } else {
                this.loading = false;
                console.warn('Error al obtener mappings');
              }
            },

            error: (err) => {
              this.loading = false;
              console.error('Error de API', err)
            }
          });
        } else {
          this.loading = false;
          this.msgError = 'Usuario no autenticado';
        }
      },
      error: () => {
        this.loading = false;
        this.msgError = 'Error al verificar autenticación';
      },
    });
  }

  loadBalances(): void {
    this.loading = true;

    const offset = (this.page - 1) * this.limit;
    const filtros = { ...this.filtersForm.value, limit: this.limit, offset };

    this.balanceService.getResumen(filtros).subscribe({
      next: (res) => {
        if (res.success) {
          this.balances = res.data;
          this.total = res.total;
        }
        this.loading = false;
      },
      error: () => {
        this.currentView = 'error';
        this.loading = false;
      }
    });
  }

  onApplyFilters(): void {
    this.page = 1;
    this.loadBalances();
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages) return;
    this.page = newPage;
    this.loadBalances();
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  onResetFilters() {
    this.filtersForm = this.fb.group({
      nombre: [''],
      ejercicio: [''],
      fechaInicio: [''],
      fechaFin: [''],
      idMapping: [''],
      idEstado: [''],
      idUser: ['']
    });
    this.filtersForm.reset
  }


  abrirModal(id: string) {
    const modalRef = this.modalService.open(ModalDetalle, {
      fullscreen: true,
      backdrop: 'static',
      centered: false, // no lo necesitamos centrado porque ocupa toda la pantalla
      

    });
    // Pasa los datos al modal
    modalRef.componentInstance.mappings = this.mappings;
    modalRef.componentInstance.fsas = this.fsas;
    modalRef.componentInstance.id = id;

  }



  
  
 private getFsaData(): void {
  this.loading = true;
  this.authService.checkAuth().subscribe({
    next: (isAuthenticated) => {
      if (isAuthenticated) {
        this.balanceService.getAllFsa().subscribe({
          next: (res) => {
            if (res.success && Array.isArray(res.data)) {
              this.fsas = res.data.filter(
                (f) => f.id_fsa && f.desc && f.id_cate && f.categoria
              );
              console.log('FSA data cargada:', this.fsas);
            } else {
              console.warn('Respuesta inválida del servicio FSA');
              this.fsas = [];
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error al obtener FSA:', error);
            this.loading = false;
            this.fsas = [];
          },
        });
      } else {
        this.loading = false;
        this.msgError = 'Usuario no autenticado';
      }
    },
    error: () => {
      this.loading = false;
      this.msgError = 'Error al verificar autenticación';
    },
  });
}
}