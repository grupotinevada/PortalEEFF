import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment.development';
import { ICategoriaSelect } from '../models/categoria.model';

// Importaciones necesarias de RxJS
import { Observable, of } from 'rxjs';
import { map, catchError, shareReplay } from 'rxjs/operators';
import { IApiResponse } from '../models/api-response.model';

@Injectable({
  providedIn: 'root'
})
export class CategoriaService {

  private apiUrl = `${environment.apiUrl}`;
  public readonly categorias$: Observable<ICategoriaSelect[]>;

  constructor(private http: HttpClient) {
    // La lógica de la llamada HTTP se inicializa aquí
    this.categorias$ = this.http
      .get<IApiResponse>( // Es buena práctica tipar la llamada aquí
        `${this.apiUrl}/categoria`,
        {
          withCredentials: true,
        }
      )
      .pipe(
        map(response => response.data), // TypeScript ya infiere el tipo de 'response'
        shareReplay(1),
        catchError(error => {
          console.error('Ocurrió un error al obtener las categorías:', error);
          return of([]);
        })
      );
  }
}