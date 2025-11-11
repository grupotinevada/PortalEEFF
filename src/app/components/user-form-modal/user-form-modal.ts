import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { UsuarioCompleto } from '../../models/usuario-login';

@Component({
  selector: 'app-user-form-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    DialogModule,
    ButtonModule
  ],
  templateUrl: './user-form-modal.html',
  styleUrl: './user-form-modal.css',
})
export class UserFormModal {
// --- Comunicación con el Padre ---
  @Input() display: boolean = false;
  @Output() displayChange = new EventEmitter<boolean>();
  
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() userToEdit: UsuarioCompleto | null = null;
  @Input() isLoading: boolean = false;
  
  // Emite el valor del formulario cuando se guarda
  @Output() save = new EventEmitter<any>();

  // --- Listas para Dropdowns (copiadas del padre) ---
  permisosDisponibles = [
    { id: 1, nombre: 'Administrador' },
    { id: 2, nombre: 'Operador' },
    { id: 3, nombre: 'Lector' }
  ];
  accesosDisponibles = [
    { id: 4, nombre: 'Savisa' },
    { id: 5, nombre: 'Global' }
  ];

  // --- Formulario ---
  form: FormGroup;
  
  constructor(private fb: FormBuilder) {
    this.form = this.buildForm();
  }

  ngOnInit(): void {
    // El formulario ya está construido en el constructor
  }

  /**
   * Detecta cuándo el padre abre el modal y configura el formulario
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['display'] && this.display === true) {
      if (this.mode === 'create') {
        this.configurarModoCrear();
      } else if (this.mode === 'edit' && this.userToEdit) {
        this.configurarModoEditar(this.userToEdit);
      }
    }
  }

  /**
   * Construye el formulario "maestro" con todos los campos
   */
  buildForm(): FormGroup {
    const accesosControls = this.accesosDisponibles.reduce((acc, acceso) => {
      acc[acceso.id.toString()] = this.fb.control(false);
      return acc;
    }, {} as { [key: string]: any });
    
    return this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      permiso: ['', Validators.required],
      habilitado: [1, Validators.required],
      accesos: this.fb.group(accesosControls)
    });
  }

  // --- Configuración de Modos ---

  private configurarModoCrear(): void {
    this.form.reset();
    this.form.patchValue({ habilitado: 1 }); // Valor por defecto
    
    // Habilitar campos de creación y requerir contraseña
    this.form.get('username')?.enable();
    this.form.get('email')?.enable();
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.updateValueAndValidity();
  }

  private configurarModoEditar(user: UsuarioCompleto): void {
    this.form.reset();
    
    // Mapear accesos
    const userAccesosMap = this.accesosDisponibles.reduce((acc, acceso) => {
      const hasAccess = user.accesos.some(ua => ua.id_acceso == acceso.id.toString());
      acc[acceso.id.toString()] = hasAccess;
      return acc;
    }, {} as { [key: string]: boolean });

    // Cargar datos del usuario
    this.form.patchValue({
      username: user.username,
      email: user.email,
      password: '', // Contraseña siempre vacía al inicio
      permiso: user.roles.length > 0 ? user.roles[0].id_rol : '',
      habilitado: user.habilitado,
      accesos: userAccesosMap
    });
    
    // Deshabilitar campos no editables y hacer contraseña opcional
    this.form.get('username')?.disable();
    this.form.get('email')?.disable();
    this.form.get('password')?.clearValidators(); // Contraseña es opcional en edición
    this.form.updateValueAndValidity();
  }

  // --- Getters y Eventos ---

  get f() { return this.form.controls; }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    // getRawValue() incluye los campos deshabilitados (username, email)
    // que serán necesarios si el padre los necesita para crear
    this.save.emit(this.form.getRawValue()); 
  }

  onCancel(): void {
    this.displayChange.emit(false);
  }
}

