import { Injectable } from '@angular/core';
import {
  IBalanceGet,
  IMacroCategoria,
  IValidacionesEEFF,
  ICategoria,
  ICuenta,
  ISubcategoria,
  IMacroCategoriaComparativa,
  ICategoriaComparativa,
  ISubcategoriaComparativa,
  ICuentaComparativa,
} from '../models/balance.model';

@Injectable({
  providedIn: 'root',
})
export class EEFFService {
  public mostrarDetalles = false;



  toggleDetalles(): void {
    this.mostrarDetalles = !this.mostrarDetalles;
    console.log(
      '[SERVICE] llamado del servicio para mostrar saldos cero',
      this.mostrarDetalles
    );
  }


  generarVistaAgrupada(balances: any[], fsas: any[]): IMacroCategoria[] {
    const vistaPorCategoria = this.agruparBalancePorCategoria(balances, fsas);

    const existeCategoria8 = vistaPorCategoria.some((c) => c.id_cate === 8);

    if (!existeCategoria8) {
      const fsaCat8 = fsas.find((f) => f.id_cate === 8);
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
                nombre:
                  'No se encontraron cuentas asociadas en el mapping o la cuenta no existe en el 8 columnas',
                saldo: 0,
                id_fsa: 'fsa temporal',
              },
            ] as ICuenta[],
          },
        ] as ISubcategoria[],
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
      9: 'NO MAPEADO',
    };

    const ordenMacro: { [nombre: string]: number } = {
      ACTIVOS: 1,
      PASIVOS: 2,
      PATRIMONIO: 3,
      'PASIVO + PATRIMONIO': 3.5,
      'ESTADO DE RESULTADOS': 4,
    };

    // 🔹 Construcción inicial de macros
    for (const categoria of vistaPorCategoria) {
      const nombreMacro = mapaMacro[categoria.id_cate!] || categoria.categoria;

      if (!macroCategorias[nombreMacro]) {
        macroCategorias[nombreMacro] = {
          nombre: nombreMacro,
          saldo: 0,
          categorias: [],
          orden: ordenMacro[nombreMacro] ?? 999,
        };
      }

      macroCategorias[nombreMacro].categorias.push(categoria);
      macroCategorias[nombreMacro].saldo += categoria.saldo;
    }

    // 🔹 Ajustar saldo de la categoría 8 sumando el de la categoría 7
    const erMacro = macroCategorias['ESTADO DE RESULTADOS'];

    if (erMacro) {
      const categoria6 = erMacro.categorias.find((c) => c.id_cate === 6);
      const categoria7 = erMacro.categorias.find((c) => c.id_cate === 7);

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
            cuentas: [],
          } as ISubcategoria);
        }

        // tomamos la primera subcategoría y agregamos la cuenta especial
        categoria7.subcategorias[0].cuentas.push({
          num_cuenta: '---',
          nombre: 'Total Ganancia Bruta',
          saldo: saldoCat6,
          id_fsa: 'GB',
        } as ICuenta);

        // actualizar saldos de cat7 y del macro
        categoria7.saldo += saldoCat6;
        erMacro.saldo += saldoCat6;
      }

      // 🔹 luego seguimos con lo mismo de antes: sumar cat7 a cat8
      const saldoCategoria7 = categoria7?.saldo ?? 0;
      const categoria8 = erMacro.categorias.find((c) => c.id_cate === 8);

      if (categoria8) {
        categoria8.saldo += saldoCategoria7;
        erMacro.saldo += saldoCategoria7;
      }
    }

    // 🔹 Ordenar categorías internas por ID
    for (const nombreMacro in macroCategorias) {
      if (macroCategorias.hasOwnProperty(nombreMacro)) {
        macroCategorias[nombreMacro].categorias.sort(
          (a, b) => (a.id_cate ?? 999) - (b.id_cate ?? 999)
        );
      }
    }

    const macroPatrimonio = macroCategorias['PATRIMONIO'];
    const categoria8 = macroCategorias['ESTADO DE RESULTADOS']?.categorias.find(
      (c) => c.id_cate === 8
    );

    if (macroPatrimonio && categoria8) {
      const categoria5 = macroPatrimonio.categorias.find(
        (c) => c.id_cate === 5
      );
      if (categoria5) {
        categoria5.subcategorias.push({
          id_fsa: 'Estado de Resultado ',
          descripcion: categoria8.categoria,
          orden: 999,
          saldo: categoria8.saldo,
          cuentas: [],
        } as ISubcategoria);

        categoria5.saldo += categoria8.saldo;
        macroPatrimonio.saldo += categoria8.saldo;
      }
    }
    const saldoPasivos = macroCategorias['PASIVOS']?.saldo ?? 0;
    const saldoPatrimonio = macroCategorias['PATRIMONIO']?.saldo ?? 0;

    macroCategorias['PASIVO + PATRIMONIO'] = {
      nombre: 'PASIVO + PATRIMONIO',
      saldo: saldoPasivos + saldoPatrimonio,
      categorias: [],
      orden: ordenMacro['PASIVO + PATRIMONIO'],
    };
    const resultado = Object.values(macroCategorias);
    resultado.sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

    return resultado;
  }

  agruparBalancePorCategoria(
    balances: IBalanceGet[],
    fsas: any[]
  ): ICategoria[] {
    const agrupado: { [categoria: string]: ICategoria } = {};
    const idsSinFiltroSaldoCero = [6, 7, 8, 9];

    for (const item of balances) {
      const fsa = fsas.find((f) => f.id_fsa === item.id_fsa);
      const id_cate: number = fsa?.id_cate;

      const categoria = fsa?.categoria ?? 'No mapeados';
      const id_fsa = item.id_fsa ?? 'sin_fsa';
      const descripcion = fsa?.desc ?? 'Sin descripción';
      const ordenSubcategoria = fsa?.orden ?? 999;


      // Si el switch "Mostrar Detalles" está desactivado...
      if (
        !this.mostrarDetalles &&
        (id_cate === 9 || item.saldo === 0)
      ) {
        // ...y la cuenta es "No Mapeada" O tiene saldo cero, entonces la saltamos.
        continue;
      }

      if (!agrupado[categoria]) {
        agrupado[categoria] = {
          categoria,
          id_cate,
          saldo: 0,
          subcategorias: [],
        } as ICategoria;
      }

      const categoriaRef = agrupado[categoria];
      let subcategoria = categoriaRef.subcategorias.find(
        (s) => s.id_fsa === id_fsa
      );

      if (!subcategoria) {
        subcategoria = {
          id_fsa,
          descripcion,
          orden: ordenSubcategoria,
          saldo: 0,
          cuentas: [],
        } as ISubcategoria;
        categoriaRef.subcategorias.push(subcategoria);
      }

      subcategoria.cuentas.push({
        num_cuenta: item.num_cuenta,
        nombre: item.nombre,
        saldo: item.saldo,
        id_fsa: item.id_fsa || 'sin_fsa',
      } as ICuenta);

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
    const activos = macros.find((m) => m.nombre === 'ACTIVOS')?.saldo ?? 0;
    const pasivos = macros.find((m) => m.nombre === 'PASIVOS')?.saldo ?? 0;
    const patrimonio =
      macros.find((m) => m.nombre === 'PATRIMONIO')?.saldo ?? 0;
    const er =
      macros
        .find((m) => m.nombre === 'ESTADO DE RESULTADOS')
        ?.categorias.find((c) => c.id_cate === 8)?.saldo ?? 0;

    console.log('Activos:', activos);
    console.log('Pasivos:', pasivos);
    console.log('Patrimonio:', patrimonio);
    console.log('Estado de Resultados:', er);

    const diferenciaBalance = activos - (pasivos + patrimonio);
    const balanceCuadrado = Math.abs(diferenciaBalance) < 1; // tolerancia

    return {
      balanceCuadrado,
      diferenciaBalance,
      estadoResultadosSaldo: er,
    };
  }

  /**
   * Redondeo Simétrico: Asegura que positivos y negativos se redondeen con la misma magnitud.
   * Math.round(-343.5) = -343 (ERROR en JS) -> Queremos -344
   * redondear(-343.5) = -344 (CORRECTO)
   */
  public redondear(valor: number): number {
    return Math.round(Math.abs(valor)) * Math.sign(valor);
  }

  public positivizarSaldosParaPreview(
    macros: IMacroCategoria[]
  ): IMacroCategoria[] {
    console.log('🔄 Positivizando saldos...');

    // Se itera sobre cada nivel de la estructura para acceder a cada saldo.
    for (const macro of macros) {
      const saldoAntes = macro.saldo;
      macro.saldo = Math.abs(macro.saldo);

      // También positivizar saldoMiles si existe
      if (macro.saldoMiles !== undefined) {
        macro.saldoMiles = Math.abs(macro.saldoMiles);
      }

      if (saldoAntes !== macro.saldo) {
        console.log(`🔍 MACRO "${macro.nombre}": ${saldoAntes} → ${macro.saldo}`);
      }

      for (const categoria of macro.categorias) {
        categoria.saldo = Math.abs(categoria.saldo);
        if (categoria.saldoMiles !== undefined) {
          categoria.saldoMiles = Math.abs(categoria.saldoMiles);
        }

        for (const subcategoria of categoria.subcategorias) {
          subcategoria.saldo = Math.abs(subcategoria.saldo);
          if (subcategoria.saldoMiles !== undefined) {
            subcategoria.saldoMiles = Math.abs(subcategoria.saldoMiles);
          }

          for (const cuenta of subcategoria.cuentas) {
            const cuentaAntes = cuenta.saldo;
            cuenta.saldo = Math.abs(cuenta.saldo);
            if (cuenta.saldoMiles !== undefined) {
              cuenta.saldoMiles = Math.abs(cuenta.saldoMiles);
            }

            // Log solo si hay discrepancia significativa
            if (Math.abs(cuentaAntes) !== cuenta.saldo && Math.abs(Math.abs(cuentaAntes) - cuenta.saldo) > 0.5) {
              console.warn(`⚠️ CUENTA ${cuenta.num_cuenta}: ${cuentaAntes} → ${cuenta.saldo} (Diferencia: ${Math.abs(cuentaAntes) - cuenta.saldo})`);
            }
          }
        }
      }
    }
    return macros;
  }
  // ----------------------------------------------------
  // NUEVA FUNCIÓN COMPARATIVA
  // ----------------------------------------------------

  /**
   * Genera una vista comparativa entre dos estructuras de EEFF agrupadas.
   * Asume que `balanceActual` es el periodo más reciente y `balanceAnterior` es el de comparación.
   *
   * @param balanceActual Estructura EEFF agrupada del periodo actual.
   * @param balanceAnterior Estructura EEFF agrupada del periodo anterior.
   * @returns Estructura comparativa con saldos, diferencias y variaciones.
   */
  public generarVistaComparativa(
    balanceActual: IMacroCategoria[],
    balanceAnterior: IMacroCategoria[]
  ): IMacroCategoriaComparativa[] {
    const vistaComparativa: IMacroCategoriaComparativa[] = [];
    // Mapeamos el balance anterior por nombre de macro para búsqueda rápida
    const balancesAnterioresMap = new Map<string, IMacroCategoria>(
      balanceAnterior.map((m) => [m.nombre, m])
    );

    for (const macroActual of balanceActual) {
      const macroAnterior = balancesAnterioresMap.get(macroActual.nombre);

      // Crear la nueva macro comparativa
      const macroComp: IMacroCategoriaComparativa = this.crearMacroComp(
        macroActual,
        macroAnterior
      );

      // Mapear y comparar categorías
      // Mapeamos por id_cate para búsqueda rápida
      const categoriasAnterioresMap = new Map<number, ICategoria>(
        macroAnterior?.categorias.map((c) => [c.id_cate!, c]) ?? []
      );

      for (const categoriaActual of macroActual.categorias) {
        const categoriaAnterior = categoriasAnterioresMap.get(
          categoriaActual.id_cate!
        );

        const categoriaComp: ICategoriaComparativa = this.crearCategoriaComp(
          categoriaActual,
          categoriaAnterior
        );

        // Mapear y comparar subcategorías
        // Mapeamos por id_fsa para búsqueda rápida
        const subcategoriasAnterioresMap = new Map<string, ISubcategoria>(
          categoriaAnterior?.subcategorias.map((s) => [s.id_fsa, s]) ?? []
        );

        for (const subActual of categoriaActual.subcategorias) {
          const subAnterior = subcategoriasAnterioresMap.get(subActual.id_fsa);

          const subComp: ISubcategoriaComparativa = this.crearSubComp(
            subActual,
            subAnterior
          );

          // Mapear y comparar cuentas
          // Mapeamos por num_cuenta para búsqueda rápida
          const cuentasAnterioresMap = new Map<string, ICuenta>(
            subAnterior?.cuentas.map((c) => [c.num_cuenta, c]) ?? []
          );

          for (const cuentaActual of subActual.cuentas) {
            const cuentaAnterior = cuentasAnterioresMap.get(
              cuentaActual.num_cuenta
            );

            const cuentaComp: ICuentaComparativa = this.crearCuentaComp(
              cuentaActual,
              cuentaAnterior
            );

            subComp.cuentas.push(cuentaComp);
          }
          categoriaComp.subcategorias.push(subComp);
        }
        macroComp.categorias.push(categoriaComp);
      }

      vistaComparativa.push(macroComp);
    }

    return vistaComparativa;
  }

  // --- Funciones auxiliares para el cálculo (privadas) ---

  private calcularVariacion(saldoActual: number, saldoAnterior: number): number {
    const diferencia = saldoActual - saldoAnterior;

    // Evitar división por cero
    if (saldoAnterior === 0) {
      // Si el saldo anterior es 0 y el actual es diferente de 0, la variación es muy grande.
      return saldoActual === 0 ? 0 : 999999; // Usar un valor grande (999999%) para indicar cambio de 0 a X
    }

    return (diferencia / saldoAnterior) * 100;
  }

  private crearMacroComp(
    actual: IMacroCategoria,
    anterior?: IMacroCategoria
  ): IMacroCategoriaComparativa {
    const saldoAnterior = anterior?.saldo ?? 0;
    const diferencia = actual.saldo - saldoAnterior;

    return {
      ...actual,
      categorias: [],
      saldoAnterior,
      diferencia,
      variacion: this.calcularVariacion(actual.saldo, saldoAnterior),
    } as IMacroCategoriaComparativa;
  }

  private crearCategoriaComp(
    actual: ICategoria,
    anterior?: ICategoria
  ): ICategoriaComparativa {
    const saldoAnterior = anterior?.saldo ?? 0;
    const diferencia = actual.saldo - saldoAnterior;

    return {
      ...actual,
      subcategorias: [],
      saldoAnterior,
      diferencia,
      variacion: this.calcularVariacion(actual.saldo, saldoAnterior),
    } as ICategoriaComparativa;
  }

  private crearSubComp(
    actual: ISubcategoria,
    anterior?: ISubcategoria
  ): ISubcategoriaComparativa {
    const saldoAnterior = anterior?.saldo ?? 0;
    const diferencia = actual.saldo - saldoAnterior;

    return {
      ...actual,
      cuentas: [],
      saldoAnterior,
      diferencia,
      variacion: this.calcularVariacion(actual.saldo, saldoAnterior),
    } as ISubcategoriaComparativa;
  }

  private crearCuentaComp(
    actual: ICuenta,
    anterior?: ICuenta
  ): ICuentaComparativa {
    const saldoAnterior = anterior?.saldo ?? 0;
    const diferencia = actual.saldo - saldoAnterior;

    return {
      ...actual,
      saldoAnterior,
      diferencia,
      variacion: this.calcularVariacion(actual.saldo, saldoAnterior),
    } as ICuentaComparativa;
  }

  public aplicarVistaFinanciera(macros: IMacroCategoria[]): IMacroCategoria[] {
    console.log('🔄 Aplicando Vista Financiera...');
    // Definimos qué grupos deben invertirse para lectura financiera
    const macrosInvertir = ['PASIVOS', 'PATRIMONIO', 'ESTADO DE RESULTADOS', 'PASIVO + PATRIMONIO'];

    for (const macro of macros) {
      const factor = macrosInvertir.includes(macro.nombre) ? -1 : 1;

      macro.saldo = macro.saldo * factor;
      if (macro.saldoMiles !== undefined) {
        macro.saldoMiles = macro.saldoMiles * factor;
      }

      for (const categoria of macro.categorias) {
        categoria.saldo = categoria.saldo * factor;
        if (categoria.saldoMiles !== undefined) {
          categoria.saldoMiles = categoria.saldoMiles * factor;
        }

        for (const subcategoria of categoria.subcategorias) {
          subcategoria.saldo = subcategoria.saldo * factor;
          if (subcategoria.saldoMiles !== undefined) {
            subcategoria.saldoMiles = subcategoria.saldoMiles * factor;
          }

          for (const cuenta of subcategoria.cuentas) {
            cuenta.saldo = cuenta.saldo * factor;
            if (cuenta.saldoMiles !== undefined) {
              cuenta.saldoMiles = cuenta.saldoMiles * factor;
            }
          }
        }
      }
    }
    return macros;
  }
}
