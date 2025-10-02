// services/preview-file.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PreviewFileService {
  private file: File | null = null;
  
  setFile(file: File) {
    this.file = file;
  }

  getFile(): File | null {
    return this.file;
  }

  clearFile() {
    this.file = null;
  }

  private reloadSubject = new Subject<void>();
  reload$ = this.reloadSubject.asObservable();
  notifyReload(): void {
    this.reloadSubject.next();
  }

  
}
