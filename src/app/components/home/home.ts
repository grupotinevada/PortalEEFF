import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { PreviewFileService } from '../../services/preview-fie';
import { CloneMappingPayload } from '../../models/mapping.model';
import { MappingService } from '../../services/mapping.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, Navbar, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  selectedFile: File | null = null;
  savedFileName: string | null = null;
  isDragOver = false;

  constructor(private previewFileService: PreviewFileService, private router: Router, private mappingService: MappingService) { }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    this.previewFileService.setFile(file);

    this.router.navigate(['/preview']);
  }

  onFileConfirmed(confirmedFile: File): void {
    this.savedFileName = confirmedFile.name;
    this.selectedFile = null;
  }

  onFileCanceled(): void {
    this.selectedFile = null;
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true; // Activa el estilo visual
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false; // Desactiva el estilo visual
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file) {
      this.onFileSelected({ target: { files: [file] } } as any);
    }
  }
  shouldShowPreview(): boolean {
    return this.selectedFile !== null;
  }



  clonar() {
    const payload: CloneMappingPayload = {
      idMappingOrigen: "MP-01",
      idMappingNuevo: "MP-CLONADO",
      descripcionNueva: 'Mapping clonado con cambios',
      cambios: [
        { num_cuenta: '1101010000', id_fsa: "11-020" }
      ]
    };

    this.mappingService.cloneMapping(payload).subscribe({
      next: (res) => console.log('Clonado:', res),
      error: (err) => console.error('Error:', err)
    });
  }

  eliminar() {
    this.mappingService.deleteMapping("cv-19").subscribe({
      next: (res) => console.log('Eliminado:', res),
      error: (err) => console.error('Error:', err)
    });
  }












}
