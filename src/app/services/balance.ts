import { Injectable } from '@angular/core';
import { IBalance } from '../models/balance.model';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { Observable } from 'rxjs';
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

// Cambia el tipo de retorno esperado
getAllFsa() {
  return this.http.get<IFsa[]>(`${this.apiUrl}/fsa`, {
    withCredentials: true,
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  });
}


}
