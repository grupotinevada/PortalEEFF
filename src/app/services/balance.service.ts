import { Injectable } from '@angular/core';
import { BalanceResumenResponse, IBalance, IBalanceGet } from '../models/balance.model';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { catchError, map, Observable, throwError } from 'rxjs';
import { IFsa } from '../models/fsa.model';

@Injectable({
  providedIn: 'root',
})
export class BalanceService {
  private apiUrl = `${environment.apiUrl}/blce/upld`;

  constructor(private http: HttpClient) {}

createBalance(balance: IBalance): Observable<any> {
  return this.http.post(`${this.apiUrl}`, balance, {
    withCredentials: true,
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  });
}

createBalanceBulk(balances: IBalance[]): Observable<any> {
  return this.http.post(`${this.apiUrl}/bulk`, balances, {
    withCredentials: true,
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  });
}


getAllFsa() {
  return this.http.get<{ success: boolean; data: IFsa[] }>(
    `${this.apiUrl}/fsa`,
    {
      withCredentials: true,
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }
  );
}

 getResumen(params: {
    nombre?: string;
    ejercicio?: number;
    fechaInicio?: string;
    fechaFin?: string;
    idEmpresa?: string;
    idEstado?: number;
    limit?: number;
    offset?: number;
  }): Observable<BalanceResumenResponse> {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<BalanceResumenResponse>(`${this.apiUrl}/resumen`, { params: httpParams });
  }


getBalanceById(id: string): Observable<IBalanceGet[]> {
  const url = `${this.apiUrl}/balance/${id}`;

  return this.http.get<{ success: boolean; data: IBalanceGet[] }>(url, {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    }),
    withCredentials: true // solo si estás usando cookies o sesiones
  }).pipe(
    map(response => {
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('Respuesta de API inválida');
      }
      return response.data;
    }),
    catchError((error: HttpErrorResponse) => {
      console.error('Error al obtener balance:', error);
      return throwError(() => new Error('Error en la petición de balance'));
    })
  );
}



}
