import { Injectable } from '@angular/core';
import { ImappingSelect, Imapping, IMappingPayload, CloneMappingPayload } from '../models/mapping.model';
import { environment } from '../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IApiResponse } from '../models/api-response.model';
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
  
  crearOActualizarMapeo(payload: IMappingPayload): Observable<IApiResponse> {
      const upsertUrl = `${this.apiUrl}/upsert`;
      return this.http.post<IApiResponse>(upsertUrl, payload, {
        withCredentials: true
      });
    }
  
     /**
   * Clona un mapping existente
   */
  cloneMapping(payload: CloneMappingPayload): Observable<any> {
    return this.http.post(`${this.apiUrl}/clone`, payload, {
        withCredentials: true
      });
  }

  /**
   * Elimina un mapping completo
   */
  deleteMapping(idMapping: number|string): Observable<any> {
    console.log("ID recibido en el servicio:", idMapping);
    return this.http.delete(`${this.apiUrl}/dlt/${idMapping}`, {
        withCredentials: true
      });
  }

}

