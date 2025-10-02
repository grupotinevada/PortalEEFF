import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal, NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { CategoriaService } from '../../services/categoria.service';
import { ICategoriaSelect } from '../../models/categoria.model';
import Swal from 'sweetalert2';
import { FsaService } from '../../services/fsa.service';
import { PreviewFileService } from '../../services/preview-fie';


@Component({
  selector: 'app-modal-fsa',
  imports: [CommonModule, ReactiveFormsModule, NgbPopoverModule],
  templateUrl: './modal-fsa.html',
  styleUrls: ['./modal-fsa.css']
})
export class ModalFsa implements OnInit {
  @Input() title: string = '';
  activeModal = inject(NgbActiveModal);
  public categoriaService = inject(CategoriaService);
  private fb = inject(FormBuilder);
  private fsaService = inject(FsaService);
  private reloadService = inject(PreviewFileService);
  
  form!: FormGroup;
  categorias: ICategoriaSelect[]=[];

  ngOnInit(): void {
    console.log('categorias', this.categoriaService.categorias$);
    this.form = this.fb.group({
      idFsa: ['', [Validators.required, Validators.pattern(/^\d{2}-\d{3}$/)]],
      descripcion: ['', [Validators.required, Validators.minLength(3)]],
      orden: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      categoria: ['', [Validators.required]]
    });
  }

guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // Muestra el Swal de confirmación antes de llamar al servicio
    Swal.fire({
      title: '¿Estás seguro?',
      text: "Se creará un nuevo FSA con los datos ingresados.",
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, guardar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        const fsaData = this.form.value;
        this.fsaService.createFsa(fsaData).subscribe({
          next: (response) => {
            Swal.fire({
              title: '¡Éxito!',
              text: 'FSA creado correctamente.',
              icon: 'success',
              timer: 2000,
              showConfirmButton: false
            }).then(() => {
              this.reloadService.notifyReload(); 
              this.activeModal.close(fsaData); 
              });
          },
          error: (err) => {
            const errorMsg = err.message || 'No se pudo crear el FSA.';
            Swal.fire({
              title: 'Error',
              text: errorMsg,
              icon: 'error'
            });
          }
        });
      }
    });
  }

}
