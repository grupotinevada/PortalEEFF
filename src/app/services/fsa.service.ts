import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { IFsa } from '../models/fsa.model';

@Injectable({
  providedIn: 'root'
})
export class FsaService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}



  getAllFsa() {
  return this.http.get<{ success: boolean; data: IFsa[] }>(
    `${this.apiUrl}/fsa`,
    {
      withCredentials: true
    }
  );
}

createFsa(fsa: IFsa) {
  return this.http.post<{ success: boolean; data: IFsa }>(
    `${this.apiUrl}/fsa/create`,
    fsa,
    {
      withCredentials: true
    }
  );
}

}
