import { Injectable } from '@angular/core';
import { IVistaEEFF } from '../models/balance.model';


@Injectable({
  providedIn: 'root'
})
export class EEFFService {

agruparBalancePorCategoria(
  balances: any[],
  fsas: any[]
): IVistaEEFF[] {
  const agrupado: { [categoria: string]: IVistaEEFF } = {};

  for (const item of balances) {
    const fsa = fsas.find(f => f.id_fsa === item.id_fsa);
    const categoria = fsa?.categoria ?? 'No mapeados';
    const id_fsa = item.id_fsa ?? 'sin_fsa';
    const descripcion = fsa?.desc ?? 'Sin descripción';

    // Si no existe la categoría aún, la creamos
    if (!agrupado[categoria]) {
      agrupado[categoria] = {
        categoria,
        saldo: 0,
        subcategorias: []
      };
    }

    const categoriaRef = agrupado[categoria];

    // Buscar subcategoría actual dentro de la categoría
    let subcategoria = categoriaRef.subcategorias.find(s => s.id_fsa === id_fsa);

    if (!subcategoria) {
      subcategoria = {
        id_fsa,
        descripcion,
        saldo: 0,
        cuentas: []
      };
      categoriaRef.subcategorias.push(subcategoria);
    }

    // Agregar cuenta
    subcategoria.cuentas.push({
      num_cuenta: item.num_cuenta,
      nombre: item.nombre,
      saldo: item.saldo,
      id_fsa: item.id_fsa
    });

    // Sumar saldos
    subcategoria.saldo += item.saldo;
    categoriaRef.saldo += item.saldo;
  }

  // Orden de categorías según orden de aparición en fsas, con "No mapeados" al final
  const ordenCategorias = Array.from(new Set(fsas.map(f => f.categoria)));
  if (agrupado['No mapeados']) {
    ordenCategorias.push('No mapeados');
  }

  return ordenCategorias
    .filter(cat => agrupado[cat])
    .map(cat => agrupado[cat]);
}



}
