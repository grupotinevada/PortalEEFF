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
      if (item.saldo === 0) continue; // ✅ Salta cuentas con saldo 0

      const fsa = fsas.find(f => f.id_fsa === item.id_fsa);
      const categoria = fsa?.categoria ?? 'No mapeados';
      const id_fsa = item.id_fsa ?? 'sin_fsa';
      const descripcion = fsa?.desc ?? 'Sin descripción';

      if (!agrupado[categoria]) {
        agrupado[categoria] = {
          categoria,
          saldo: 0,
          subcategorias: []
        };
      }

      const categoriaRef = agrupado[categoria];

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

      subcategoria.cuentas.push({
        num_cuenta: item.num_cuenta,
        nombre: item.nombre,
        saldo: item.saldo,
        id_fsa: item.id_fsa
      });

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
