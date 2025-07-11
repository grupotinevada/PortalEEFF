import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Preview } from '../preview/preview';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
declare const bootstrap: any;

@Component({
  selector: 'app-home',
  imports: [Preview, CommonModule, Navbar],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  selectedFile: File | null = null;
  savedFileName: string | null = null;
  private modalInstance: any = null;
  private modalEventListeners: Array<() => void> = [];

  constructor(private authService: AuthService, 
              private router: Router) {}

  @ViewChild('previewModal') previewModalRef!: ElementRef;

  onFileSelected(event: Event) {

    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      console.log('❌ No hay archivos seleccionados');
      return;
    }
    this.selectedFile = input.files[0];
    console.log('✅ Archivo seleccionado:', this.selectedFile.name);

    // Limpia el input para permitir seleccionar el mismo archivo múltiples veces
    input.value = '';

    // Espera un tick para que el modal exista en el DOM
    setTimeout(() => {
      this.showModal();
    });
  }

  private showModal(): void {

    const modalEl = this.previewModalRef.nativeElement;
    
    // Limpia completamente el estado anterior
    this.cleanupModal();

    // Asegura que el modal esté en estado inicial
    modalEl.classList.remove('show');
    modalEl.style.display = 'none';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.removeAttribute('aria-modal');
    modalEl.removeAttribute('role');

    // Remueve cualquier backdrop que pueda haber quedado
    const backdrops = document.querySelectorAll('.modal-backdrop');

    backdrops.forEach(backdrop => backdrop.remove());

    // Remueve las clases del body que Bootstrap agrega
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');
    this.modalInstance = new bootstrap.Modal(modalEl, {
      backdrop: true,
      keyboard: true,
      focus: true
    });

    // Configura event listeners con referencias para poder removerlos
    const hiddenHandler = (e: Event) => {

      this.cleanupModal();
    };

    const hideHandler = (e: Event) => {

    };

    const shownHandler = (e: Event) => {
    };

    // Agrega los listeners
    modalEl.addEventListener('hidden.bs.modal', hiddenHandler);
    modalEl.addEventListener('hide.bs.modal', hideHandler);
    modalEl.addEventListener('shown.bs.modal', shownHandler);

    // Guarda las referencias para poder removerlas después
    this.modalEventListeners = [
      () => modalEl.removeEventListener('hidden.bs.modal', hiddenHandler),
      () => modalEl.removeEventListener('hide.bs.modal', hideHandler),
      () => modalEl.removeEventListener('shown.bs.modal', shownHandler)
    ];

    this.modalInstance.show();
    
    // Verifica el estado después de show()
    setTimeout(() => {
    }, 100);
  }

  private cleanupModal(): void {
    this.modalEventListeners.forEach(removeListener => removeListener());
    this.modalEventListeners = [];

    // Destruye la instancia del modal
    if (this.modalInstance) {

      this.modalInstance.dispose();
      this.modalInstance = null;
    }
    
    // Limpia completamente el estado
    if (this.previewModalRef) {
      const modalEl = this.previewModalRef.nativeElement;
      modalEl.classList.remove('show');
      modalEl.style.display = 'none';
      modalEl.setAttribute('aria-hidden', 'true');
      modalEl.removeAttribute('aria-modal');
      modalEl.removeAttribute('role');
    }

    // Asegúrate de que el body esté limpio
    document.body.classList.remove('modal-open');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('padding-right');

    // Remueve cualquier backdrop residual
    const backdrops = document.querySelectorAll('.modal-backdrop');
    backdrops.forEach(backdrop => backdrop.remove());
    
  }

  onFileConfirmed(confirmedFile: File): void {


    this.savedFileName = confirmedFile.name;
    
    // Cierra el modal y limpia
    if (this.modalInstance) {

      this.modalInstance.hide();
    }
    
    this.selectedFile = null; // Limpia la previsualización después de guardar
  }

  onFileCanceled(): void {

    this.savedFileName = null;
    
    // Cierra el modal y limpia
    if (this.modalInstance) {

      this.modalInstance.hide();
    }
    
    this.selectedFile = null;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.onFileSelected({ target: { files: [file] } } as any);
    }
  }




  // Limpia el modal cuando el componente se destruye
  ngOnDestroy(): void {
    this.cleanupModal();
  }
}