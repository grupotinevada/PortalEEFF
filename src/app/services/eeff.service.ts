import { Injectable } from '@angular/core';
import { IBalanceGet, IMacroCategoria, IValidacionesEEFF, IVistaEEFF } from '../models/balance.model';


@Injectable({
  providedIn: 'root'
})
export class EEFFService {

public mostrarNoMapeados = false;

public mostrarSaldosCero = false;

MostrarNoMapeados(): void {
    this.mostrarNoMapeados = !this.mostrarNoMapeados;
  }

MostrarSaldosCero(): void {
    this.mostrarSaldosCero = !this.mostrarSaldosCero;
  }
  
generarVistaAgrupada(balances: any[], fsas: any[]): IMacroCategoria[] {
  const vistaPorCategoria = this.agruparBalancePorCategoria(balances, fsas);
  
  const existeCategoria8 = vistaPorCategoria.some(c => c.id_cate === 8);

  if (!existeCategoria8) {
    const fsaCat8 = fsas.find(f => f.id_cate === 8);
    const nombreCat8 = fsaCat8?.categoria ?? 'Resultado del Ejercicio'; 

    vistaPorCategoria.push({
      categoria: nombreCat8,
      id_cate: 8,
      saldo: 0,
      subcategorias: [
        {
          id_fsa: 'fsa temporal',
          descripcion: 'No hay cuentas especificadas en el mapping',
          orden: 999,
          saldo: 0,
          cuentas: [
            {
              num_cuenta: '---',
              nombre: 'No se encontraron cuentas asociadas en el mapping o la cuenta no existe en el 8 columnas',
              saldo: 0,
              id_fsa: 'fsa temporal'
            }
          ]
        }
      ]
    });
  }
  
  const macroCategorias: { [nombre: string]: IMacroCategoria } = {};

  const mapaMacro: { [key: number]: string } = {
    1: 'ACTIVOS',
    2: 'ACTIVOS',
    3: 'PASIVOS',
    4: 'PASIVOS',
    5: 'PATRIMONIO',
    6: 'ESTADO DE RESULTADOS',
    7: 'ESTADO DE RESULTADOS',
    8: 'ESTADO DE RESULTADOS',
    9: 'No asignado' 
  };

  const ordenMacro: { [nombre: string]: number } = {
    'ACTIVOS': 1,
    'PASIVOS': 2,
    'PATRIMONIO': 3,
    'PASIVO + PATRIMONIO': 3.5, 
    'ESTADO DE RESULTADOS': 4
  };

  // 🔹 Construcción inicial de macros
  for (const categoria of vistaPorCategoria) {
    const nombreMacro = mapaMacro[categoria.id_cate!] || categoria.categoria;

    if (!macroCategorias[nombreMacro]) {
      macroCategorias[nombreMacro] = {
        nombre: nombreMacro,
        saldo: 0,
        categorias: [],
        orden: ordenMacro[nombreMacro] ?? 999
      };
    }

    macroCategorias[nombreMacro].categorias.push(categoria);
    macroCategorias[nombreMacro].saldo += categoria.saldo;
  }
  
  // 🔹 Ajustar saldo de la categoría 8 sumando el de la categoría 7
  const erMacro = macroCategorias['ESTADO DE RESULTADOS'];

  if (erMacro) {
    const categoria6 = erMacro.categorias.find(c => c.id_cate === 6);
    const categoria7 = erMacro.categorias.find(c => c.id_cate === 7);

    // 🔹 Insertar el total de categoría 6 dentro de la categoría 7 como cuenta
    if (categoria6 && categoria7) {
      const saldoCat6 = categoria6.saldo;

      // aseguramos que haya al menos una subcategoría en cat7
      if (categoria7.subcategorias.length === 0) {
        categoria7.subcategorias.push({
          id_fsa: 'fsa temporal cat7',
          descripcion: 'Subcategoría temporal',
          orden: 999,
          saldo: 0,
          cuentas: []
        });
      }

      // tomamos la primera subcategoría y agregamos la cuenta especial
      categoria7.subcategorias[0].cuentas.push({
        num_cuenta: '---',
        nombre: 'Resultado acumulado de categoría 6',
        saldo: saldoCat6,
        id_fsa: 'cat6_total'
      });

      // actualizar saldos de cat7 y del macro
      categoria7.saldo += saldoCat6;
      erMacro.saldo += saldoCat6;
    }

    // 🔹 luego seguimos con lo mismo de antes: sumar cat7 a cat8
    const saldoCategoria7 = categoria7?.saldo ?? 0;
    const categoria8 = erMacro.categorias.find(c => c.id_cate === 8);

    if (categoria8) {
      categoria8.saldo += saldoCategoria7;
      erMacro.saldo += saldoCategoria7;
    }
  }

  // 🔹 Ordenar categorías internas por ID
  for (const nombreMacro in macroCategorias){
    if(macroCategorias.hasOwnProperty(nombreMacro)){
      macroCategorias[nombreMacro].categorias.sort(
        (a,b) => (a.id_cate ?? 999) - (b.id_cate ?? 999)
      )
    }
  }

  // 🔹 Incorporar Ganancia Neta dentro de Patrimonio
  const patrimonio = macroCategorias['PATRIMONIO'];
  const categoria8 = macroCategorias['ESTADO DE RESULTADOS']?.categorias.find(c => c.id_cate === 8);

  if (patrimonio && categoria8) {
    patrimonio.categorias.push({
      categoria: 'Ganancia Neta',
      id_cate: 999, // ID especial
      saldo: categoria8.saldo,
      subcategorias: [
        {
          id_fsa: 'ganancia_neta',
          descripcion: 'Ganancia neta del ejercicio',
          orden: 1000,
          saldo: categoria8.saldo,
          cuentas: []
        }
      ]
    });

    patrimonio.saldo += categoria8.saldo;
  }

  // 🔹 Finalmente: PASIVO + PATRIMONIO (ahora sí con Ganancia Neta incluida)
  const saldoPasivos = macroCategorias['PASIVOS']?.saldo ?? 0;
  const saldoPatrimonio = macroCategorias['PATRIMONIO']?.saldo ?? 0;

  macroCategorias['PASIVO + PATRIMONIO'] = {
    nombre: 'PASIVO + PATRIMONIO',
    saldo: saldoPasivos + saldoPatrimonio,
    categorias: [],
    orden: ordenMacro['PASIVO + PATRIMONIO']
  };

  // 🔹 Convertir a array y ordenar macros
  const resultado = Object.values(macroCategorias);
  resultado.sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

  return resultado;
}



agruparBalancePorCategoria(balances: IBalanceGet[], fsas: any[]): IVistaEEFF[] {
  const agrupado: { [categoria: string]: IVistaEEFF } = {};
  const idsSinFiltroSaldoCero  = [6, 7, 8, 9];

  for (const item of balances) {
    const fsa = fsas.find(f => f.id_fsa === item.id_fsa);
    const id_cate = fsa?.id_cate;

    const categoria = fsa?.categoria ?? 'No mapeados';
    const id_fsa = item.id_fsa ?? 'sin_fsa';
    const descripcion = fsa?.desc ?? 'Sin descripción';
    const ordenSubcategoria = fsa?.orden ?? 999;

    if (categoria === 'No mapeados' && !this.mostrarNoMapeados) {
      continue;
    }
    
    if (item.saldo === 0 && !this.mostrarSaldosCero && !idsSinFiltroSaldoCero.includes(id_cate)) {
      continue;
    }


    if (!agrupado[categoria]) {
      agrupado[categoria] = {
        categoria,
        id_cate,
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
        orden: ordenSubcategoria,
        saldo: 0,
        cuentas: []
      };
      categoriaRef.subcategorias.push(subcategoria);
    }

    subcategoria.cuentas.push({
      num_cuenta: item.num_cuenta,
      nombre: item.nombre,
      saldo: item.saldo,
      id_fsa: item.id_fsa || 'sin_fsa'
    });

    subcategoria.saldo += item.saldo;
    categoriaRef.saldo += item.saldo;
  }

  // Ordena las subcategorías
  for (const categoriaKey in agrupado) {
    if (agrupado.hasOwnProperty(categoriaKey)) {
      agrupado[categoriaKey].subcategorias.sort(
        (a, b) => (a.orden ?? 999) - (b.orden ?? 999)
      );
    }
  }

  return Object.values(agrupado);
}

  validarEEFF(macros: IMacroCategoria[]): IValidacionesEEFF {
    const activos = macros.find(m => m.nombre === 'ACTIVOS')?.saldo ?? 0;
    const pasivos = macros.find(m => m.nombre === 'PASIVOS')?.saldo ?? 0;
    const patrimonio = macros.find(m => m.nombre === 'PATRIMONIO')?.saldo ?? 0;
    const er = macros.find(m => m.nombre === 'ESTADO DE RESULTADOS')
                                    ?.categorias.find(c => c.id_cate === 8)
                                    ?.saldo ?? 0;

    console.log('Activos:', activos);
    console.log('Pasivos:', pasivos);
    console.log('Patrimonio:', patrimonio);
    console.log('Estado de Resultados:', er);

    const diferenciaBalance = activos - (pasivos + patrimonio );
    const balanceCuadrado = Math.abs(diferenciaBalance) < 1; // tolerancia

    return {
      balanceCuadrado,
      diferenciaBalance,
      estadoResultadosSaldo: er
    };
  }

  public positivizarSaldosParaPreview(macros: IMacroCategoria[]): IMacroCategoria[] {
  // Se itera sobre cada nivel de la estructura para acceder a cada saldo.
  for (const macro of macros) {
    macro.saldo = Math.abs(macro.saldo);
    
    for (const categoria of macro.categorias) {
      categoria.saldo = Math.abs(categoria.saldo);
      
      for (const subcategoria of categoria.subcategorias) {
        subcategoria.saldo = Math.abs(subcategoria.saldo);
        
        for (const cuenta of subcategoria.cuentas) {
          cuenta.saldo = Math.abs(cuenta.saldo);
        }
      }
    }
  }
  return macros;
}
  

// eeff.service.ts
public exportarCSV(macros: IMacroCategoria[]): void {
  let csv = 'MacroCategoria,Categoria,Subcategoria,Cuenta,Saldo\n';

  for (const macro of macros) {
    for (const categoria of macro.categorias) {
      for (const subcategoria of categoria.subcategorias) {
        for (const cuenta of subcategoria.cuentas) {
          csv += `"${macro.nombre}","${categoria.categoria}","${subcategoria.descripcion}","${cuenta.nombre}",${cuenta.saldo}\n`;
        }
      }
    }
  }

  // Crear blob y descargar
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'eeff.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

}