import { Injectable } from '@angular/core';
import { IDefaultMapping } from '../models/balance.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { IEstados } from '../models/fsa.model';

@Injectable({
  providedIn: 'root'
})
export class DefaultMappingService {

  private apiUrl = `${environment.apiUrl}/default-mapping`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<{ success: boolean; data: IDefaultMapping[] }> {
    return this.http.get<{ success: boolean; data: IDefaultMapping[] }>(this.apiUrl, { withCredentials: true });
  }

  create(mapping: IDefaultMapping): Observable<any> {
    return this.http.post(this.apiUrl, mapping, { withCredentials: true });
  }

  update(mapping: IDefaultMapping): Observable<any> {
    return this.http.put(this.apiUrl, mapping, { withCredentials: true });
  }

  
getAllEstados(){
  return this.http.get<{ success: boolean; data: IEstados[] }>(
    `${this.apiUrl}/estados`,
    {
      withCredentials: true,
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }
  );
}
}
