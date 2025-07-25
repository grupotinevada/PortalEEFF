import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment.development';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IEmpresa } from '../models/empresa.model';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private apiUrl = `${environment.apiUrl}/empresa`;

  constructor(private http: HttpClient) { }

getEmpresas(): Observable<{ success: boolean; data: IEmpresa[] }> {
  return this.http.get<{ success: boolean; data: IEmpresa[] }>(this.apiUrl, {
    withCredentials: true
  });
}

}
