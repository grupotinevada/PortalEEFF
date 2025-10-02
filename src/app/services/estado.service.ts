import { Injectable } from '@angular/core';
import { IDefaultMapping } from '../models/balance.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';
import { IEstados } from '../models/estado.model';

@Injectable({
  providedIn: 'root'
})
export class EstadoService {

  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

getAllEstados(){
  return this.http.get<{ success: boolean; data: IEstados[] }>(
    `${this.apiUrl}/estado`,
    {
      withCredentials: true,
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }
  );
}
}
