import { Injectable } from '@angular/core';
import { Empresa } from '../models/empresa.model';
import { environment } from '../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class EmpresaService {
  private apiUrl = `${environment.apiUrl}/empresa`;

  constructor(private http: HttpClient) { }

getEmpresas(): Observable<{ success: boolean; data: Empresa[] }> {
  return this.http.get<{ success: boolean; data: Empresa[] }>(this.apiUrl, {
    withCredentials: true
  });
}
}

