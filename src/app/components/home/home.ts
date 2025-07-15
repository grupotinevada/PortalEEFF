import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../navbar/navbar';
import { PreviewFileService } from '../../services/preview-fie';

@Component({
  selector: 'app-home',
  imports: [CommonModule, Navbar],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  selectedFile: File | null = null;
  savedFileName: string | null = null;

  constructor(private previewFileService: PreviewFileService, private router: Router) {}

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
  shouldShowPreview(): boolean {
    return this.selectedFile !== null;
  }
}
