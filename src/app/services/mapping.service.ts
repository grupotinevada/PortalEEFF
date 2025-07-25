import { Injectable } from '@angular/core';
import { mapping } from '../models/mapping.model';
import { environment } from '../../environments/environment.development';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class MappingService {
  private apiUrl = `${environment.apiUrl}/mapping`;

  constructor(private http: HttpClient) { }

getMappings(): Observable<{ success: boolean; data: mapping[] }> {
  return this.http.get<{ success: boolean; data: mapping[] }>(this.apiUrl, {
    withCredentials: true
  });
}
}

