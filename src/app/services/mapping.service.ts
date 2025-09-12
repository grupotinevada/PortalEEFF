import { Injectable } from '@angular/core';
import { ImappingSelect, Imapping } from '../models/mapping.model';
import { environment } from '../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class MappingService {
  private apiUrl = `${environment.apiUrl}/mapping`;

  constructor(private http: HttpClient) { }

  getMappings(): Observable<{ success: boolean; data: ImappingSelect[] }> {    //esta funcion traer la info para el select
    return this.http.get<{ success: boolean; data: ImappingSelect[] }>(this.apiUrl, {
      withCredentials: true
    });
  }

getMappingById(idMapping: string): Observable<Imapping[]> { //esta funcion trae la info del mapping x id
  const url = `${this.apiUrl}/${idMapping}`;
  // Esperamos un array de mappings: mapping[]
  return this.http.get<Imapping[]>(url, {
    withCredentials: true
  });
}

}

