import { Component } from '@angular/core';
import { Navbar } from '../navbar/navbar';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateUserPayload, UpdateUserPayload, UsuarioCompleto } from '../../models/usuario-login';
import { AdministracionService } from '../../services/administracion.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { PaginatorModule } from 'primeng/paginator';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { RouterModule } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { UserFormModal } from '../user-form-modal/user-form-modal';

@Component({
  selector: 'app-administracion',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    Navbar,
    TableModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    PaginatorModule,
    TagModule,
    CardModule,
    TooltipModule,
    CheckboxModule,
    RouterModule,
    UserFormModal
  ],
  templateUrl: './administracion.html',
  styleUrl: './administracion.css',
})
export class Administracion {
// --- Para la Tabla ---
  usuarios: UsuarioCompleto[] = [];
  globalFilter: string = '';

  // --- NUEVO: Estado del Modal Unificado ---
  displayModal: boolean = false;
  modalMode: 'create' | 'edit' = 'create';
  selectedUser: UsuarioCompleto | null = null;
  isLoading = false;
  constructor(

    private adminService: AdministracionService
  ) {}
  
  
  ngOnInit(): void {
    this.cargarUsuarios();
  }

  /**
   * Carga la lista de usuarios desde el servicio
   */
  cargarUsuarios(): void {
    this.adminService.getUsers().subscribe(
      (response) => {
        if (response.success) {
          this.usuarios = response.users;
          console.log('Usuarios cargados:', this.usuarios);
        } else {
          Swal.fire('Error', 'No se pudo cargar la lista de usuarios.', 'error');
        }
      },
      (err) => {
        Swal.fire('Error', 'Error de conexión al cargar usuarios.', 'error');
      }
    );
  }

 
  /**
   * Abre el modal de creación y resetea el formulario
   */
  abrirModalCrear(): void {
      this.modalMode = 'create';
      this.selectedUser = null;
      this.displayModal = true;
    }

  

  confirmarEliminar(usuario: UsuarioCompleto): void {
    Swal.fire({
      title: `¿Eliminar a ${usuario.username}?`,
      text: "¡Esta acción no se puede revertir!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire('Eliminado', 'El usuario ha sido eliminado (simulación).', 'success');
      }
    });
  }
  
  /**
   * Abre el modal de edición y carga los datos del usuario
   */
  abrirModalEditar(usuario: UsuarioCompleto): void {
      this.modalMode = 'edit';
      this.selectedUser = usuario;
      this.displayModal = true;
    }

handleSave(formData: any): void {
    this.isLoading = true;
    
    // Procesar los 'accesos' desde el sub-formulario
    const selectedAccesos = Object.keys(formData.accesos)
      .filter(key => formData.accesos[key] === true)
      .map(Number); // Convertir a [4, 5]

    if (this.modalMode === 'create') {
      const payload: CreateUserPayload = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        permiso: formData.permiso,
        accesos: selectedAccesos
      };
      this.llamarServicioCrear(payload);
    } 
    else if (this.modalMode === 'edit' && this.selectedUser) {
      const payload: UpdateUserPayload = {
        permiso: formData.permiso,
        habilitado: formData.habilitado,
        accesos: selectedAccesos
      };
      // Solo añadir contraseña si se escribió una nueva
      if (formData.password && formData.password.length > 0) {
        payload.password = formData.password;
      }
      this.llamarServicioActualizar(this.selectedUser.id_user, payload);
    }
  }

  // --- Llamadas al Servicio (separadas para legibilidad) ---

  private llamarServicioCrear(payload: CreateUserPayload): void {
    this.adminService.crearUsuario(payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.displayModal = false; // Cierra el modal
        this.cargarUsuarios(); // Recarga la tabla
        Swal.fire({
          icon: 'success',
          title: '¡Usuario Creado!',
          text: response.message,
          timer: 2500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.isLoading = false;
        // No cerramos el modal en error
        Swal.fire({
          icon: 'error',
          title: 'Error al crear usuario',
          text: err.error?.message || 'Ocurrió un error inesperado.'
        });
      }
    });
  }

  private llamarServicioActualizar(id: number, payload: UpdateUserPayload): void {
    this.adminService.actualizarUsuario(id, payload).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.displayModal = false; // Cierra el modal
        this.cargarUsuarios(); // Recarga la tabla
        Swal.fire({
          icon: 'success',
          title: '¡Usuario Actualizado!',
          text: response.message,
          timer: 2500,
          showConfirmButton: false
        });
      },
      error: (err) => {
        this.isLoading = false;
        // No cerramos el modal en error
        Swal.fire({
          icon: 'error',
          title: 'Error al actualizar',
          text: err.error?.message || 'No se pudo actualizar el usuario.'
        });
      }
    });
  }

  /**
   * Helper para dar color a los tags de Rol
   */
  getRolSeverity(rolId: any): 'success' | 'info' | 'warn' {
    switch (rolId.toString()) {
      case "1": return 'info'; // Admin
      case "2": return 'success'; // Operador
      case "3": return 'warn'; // Lector
      default: return 'info';
    }
  }
  getAccesoSeverity(accesoId: any): 'info' | 'warn' | 'danger' {
    switch (accesoId.toString()) {
      case '4': return 'danger'; // Savisa (usará el estilo gris de 'info')
      case '5': return 'info'; // Global (usará el estilo gris de 'warn')
      default: return 'warn'; // Otro
    }
  }
}