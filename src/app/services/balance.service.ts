import { Injectable } from '@angular/core';
import { BalanceResumenResponse, IBalance, IBalanceGet } from '../models/balance.model';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { IFsa } from '../models/fsa.model';
import { INameAvailabilityResponse } from '../models/api-response.model';

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


  getResumen(params: {
    nombre?: string;
    ejercicio?: number;
    fechaInicio?: string;
    fechaFin?: string;
    idMapping?: string;
    idEstado?: number;
    idEmpresa?: string;
    empresaDesc?: string; 
    idUser?: number;      
    limit?: number;
    offset?: number;
  }): Observable<BalanceResumenResponse> {
    
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<BalanceResumenResponse>(`${this.apiUrl}/resumen`, {
      params: httpParams,
      withCredentials: true,
    });
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

 /**
   * Verifica en el backend si un nombre de balance ya está en uso.
   * @param nombre El nombre del balance a verificar.
   * @returns Un Observable que emite la respuesta de la API.
   */
checkNameAvailability(nombre: string): Observable<INameAvailabilityResponse> {
  const url = `${this.apiUrl}/check-name/${nombre.trim()}`;
  
  return this.http.get<INameAvailabilityResponse>(url, { withCredentials: true }).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si el error es 409 (Conflict), lo atrapamos.
      if (error.status === 409) {
        // En lugar de dejar que sea un error, lo transformamos en una
        // emisión normal del observable usando 'of()'.
        // El componente lo recibirá en el bloque 'next' como si fuera un éxito.
        return of(error.error as INameAvailabilityResponse);
      }
      
      // Para cualquier otro error, lo dejamos pasar como un error real.
      return throwError(() => new Error('Ocurrió un error en el servidor.'));
    })
  );
}

}
