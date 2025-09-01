import { Injectable } from '@angular/core';
import { IMacroCategoria, IVistaEEFF } from '../models/balance.model';


@Injectable({
  providedIn: 'root'
})
export class EEFFService {

  generarVistaAgrupada(balances: any[], fsas: any[]): IMacroCategoria[] {
    // 1. Obtenemos la agrupación inicial por categorías (Activo Corriente, Pasivo Corriente...)
    const vistaPorCategoria = this.agruparBalancePorCategoria(balances, fsas);

    const macroCategorias: { [nombre: string]: IMacroCategoria } = {};

    // 2. Definimos el mapa para agrupar por id_cate
    const mapaMacro: { [key: number]: string } = {
      1: 'ACTIVOS',
      2: 'ACTIVOS',
      3: 'PASIVOS',
      4: 'PASIVOS'
    };

    // 3. Iteramos sobre las categorías para crear la nueva agrupación
    for (const categoria of vistaPorCategoria) {
      // Si el id_cate está en nuestro mapa, usamos el nombre del mapa (ACTIVOS/PASIVOS)
      // Si no, la categoría (ej: Patrimonio) se convierte en su propia macro-categoría.
      const nombreMacro = mapaMacro[categoria.id_cate!] || categoria.categoria;

      // Si la macro-categoría no existe, la inicializamos
      if (!macroCategorias[nombreMacro]) {
        macroCategorias[nombreMacro] = {
          nombre: nombreMacro,
          saldo: 0,
          categorias: []
        };
      }

      // Agregamos la categoría original (ej: Activo Corriente) a su macro y sumamos su saldo
      macroCategorias[nombreMacro].categorias.push(categoria);
      macroCategorias[nombreMacro].saldo += categoria.saldo;
    }

    // 4. Convertimos el objeto de macro-categorías en un array para el frontend
    // Puedes agregar un orden específico si lo necesitas.
    return Object.values(macroCategorias);
  }


  /**
   * MODIFICACIÓN: Esta función ahora también captura el `id_cate`.
   */
  agruparBalancePorCategoria(
    balances: any[],
    fsas: any[]
  ): IVistaEEFF[] {
    const agrupado: { [categoria: string]: IVistaEEFF } = {};

    for (const item of balances) {
      if (item.saldo === 0) continue;

      const fsa = fsas.find(f => f.id_fsa === item.id_fsa);
      const categoria = fsa?.categoria ?? 'No mapeados';
      const id_cate = fsa?.id_cate; // <-- AÑADIDO: Capturamos el id_cate
      const id_fsa = item.id_fsa ?? 'sin_fsa';
      const descripcion = fsa?.desc ?? 'Sin descripción';

      if (!agrupado[categoria]) {
        agrupado[categoria] = {
          categoria,
          id_cate, // <-- AÑADIDO: Lo guardamos en el objeto
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

    const ordenCategorias = Array.from(new Set(fsas.map(f => f.categoria)));
    if (agrupado['No mapeados']) {
      ordenCategorias.push('No mapeados');
    }

    return ordenCategorias
      .filter(cat => agrupado[cat])
      .map(cat => agrupado[cat]);
  }

}