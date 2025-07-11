import { Injectable } from '@angular/core';
import { IDefaultMapping } from '../models/balance.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class DefaultMappingService {

  private baseUrl = `${environment.apiUrl}/default-mapping`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<{ success: boolean; data: IDefaultMapping[] }> {
    return this.http.get<{ success: boolean; data: IDefaultMapping[] }>(this.baseUrl, { withCredentials: true });
  }

  create(mapping: IDefaultMapping): Observable<any> {
    return this.http.post(this.baseUrl, mapping, { withCredentials: true });
  }

  update(mapping: IDefaultMapping): Observable<any> {
    return this.http.put(this.baseUrl, mapping, { withCredentials: true });
  }
}
