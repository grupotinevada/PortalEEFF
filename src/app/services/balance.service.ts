import { Injectable } from '@angular/core';
import { BalanceResumenResponse, IBalance } from '../models/balance.model';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { map, Observable } from 'rxjs';
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

getAllBalances(): Observable<{ success: boolean; data: IBalance[] }> {
  return this.http.get<{ success: boolean; data: IBalance[] }>(this.apiUrl, {
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


getBalanceById(id: string): Observable<IBalance[]> {
  return this.http.get<{ success: boolean; data: IBalance[]; message?: string }>(
    `${this.apiUrl}/balance/search/${id}`,
    {
      withCredentials: true,
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      })
    }
  ).pipe(
    map(response => response.data)
  );
}


}
