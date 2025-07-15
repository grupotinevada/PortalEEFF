import { Component, OnInit } from '@angular/core';
import { ComparativoCategoria, CuentaComparada, IBalance, VistaCategoria } from '../../models/balance.model';
import { IFsa } from '../../models/fsa.model';
import { BalanceService } from '../../services/balance.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Navbar } from "../navbar/navbar";
import { Spinner } from '../spinner/spinner';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';
import { EmpresaService } from '../../services/empresa.service';
import { Empresa } from '../../models/empresa.model';


@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, Navbar, Spinner, FormsModule, MatExpansionModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  fsas: IFsa[] = [];
  balances: IBalance[] = [];
  isLoading: boolean = false;
  vistaActivos: VistaCategoria[] = [];
  vistaActivosComparado: ComparativoCategoria[] = [];
  msgError: string = '';
  showSpinner: boolean = false;

  annioBaseSeleccionado: number = 2024;
  annioCompSeleccionado: number = 2023;

  fechaInicioBase: string = '';
  fechaFinBase: string = '';
  fechaInicioComp: string = '';
  fechaFinComp: string = '';

  empresas: Empresa[] = [];
  idEmpresaSeleccionada: string = '';
  gruposExpandido: { [clave: string]: boolean } = {};

  constructor(
    private balanceService: BalanceService,
    private authService: AuthService,
    private empresaService: EmpresaService
  ) {}

  ngOnInit() {
      this.getFsaData();
      this.cargarEmpresas();

  }


  private cargarEmpresas() {
      this.showSpinner = true;
    this.authService.checkAuth().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          this.empresaService.getEmpresas().subscribe({
            next: (res) => {
              if (res.success) {
                this.empresas = res.data;
              } else {
                this.showSpinner = false;
                console.warn('Error al obtener empresas');
              }
            },
            
            error: (err) => {
              this.showSpinner = false;
              console.error('Error de API', err)} 
          });
        } else {
          this.showSpinner = false;
          this.msgError = 'Usuario no autenticado';
        }
      },
      error: () => {
        this.showSpinner = false;
        this.msgError = 'Error al verificar autenticación';
      },
    });
  }

private getFsaData(): void {
  this.showSpinner = true;
  this.authService.checkAuth().subscribe({
    next: (isAuthenticated) => {
      if (isAuthenticated) {
        this.balanceService.getAllFsa().subscribe({
          next: (res) => {
            if (res.success && Array.isArray(res.data)) {
              this.fsas = res.data.filter(
                (f) => f.id_fsa && f.desc && f.id_cate && f.categoria
              );
              console.log('FSA data cargada:', this.fsas);
            } else {
              console.warn('Respuesta inválida del servicio FSA');
              this.fsas = [];
            }
            this.showSpinner = false;
          },
          error: (error) => {
            console.error('Error al obtener FSA:', error);
            this.showSpinner = false;
            this.fsas = [];
          },
        });
      } else {
        this.showSpinner = false;
        this.msgError = 'Usuario no autenticado';
      }
    },
    error: () => {
      this.showSpinner = false;
      this.msgError = 'Error al verificar autenticación';
    },
  });
}

  fusionarCuentas(grupo: any): CuentaComparada[] {
  const cuentasMap = new Map<string, CuentaComparada>();

  // Recorrer cuentas base
  for (const cuenta of grupo.cuentasBase) {
    cuentasMap.set(cuenta.num_cuenta, {
      num_cuenta: cuenta.num_cuenta,
      nombre: cuenta.nombre,
      saldo_base: cuenta.saldo,
    });
  }

  // Recorrer cuentas comparación
  for (const cuenta of grupo.cuentasComp) {
    const existente = cuentasMap.get(cuenta.num_cuenta);
    if (existente) {
      existente.saldo_comp = cuenta.saldo;
    } else {
      cuentasMap.set(cuenta.num_cuenta, {
        num_cuenta: cuenta.num_cuenta,
        nombre: cuenta.nombre,
        saldo_comp: cuenta.saldo,
      });
    }
  }

  return Array.from(cuentasMap.values());
}


cargarBalancesComparados(): void {
  if (!this.fechaInicioBase || !this.fechaFinBase || !this.fechaInicioComp || !this.fechaFinComp) {
    this.msgError = 'Debe completar todas las fechas de ambos periodos.';
    return;
  }


  this.showSpinner = true;
  this.msgError = '';

  Promise.all([
    this.balanceService.getBalancesPorPeriodo({
      id_empresa: this.idEmpresaSeleccionada,
      fecha_inicio: this.fechaInicioBase,
      fecha_fin: this.fechaFinBase
    }).toPromise(),

    this.balanceService.getBalancesPorPeriodo({
      id_empresa: this.idEmpresaSeleccionada,
      fecha_inicio: this.fechaInicioComp,
      fecha_fin: this.fechaFinComp
    }).toPromise()
  ])
    .then(([resBase, resComp]) => {
      if (resBase?.success && resComp?.success) {
        this.procesarActivosComparadoDesdeData(
          resBase.data,
          resComp.data,
          this.fechaInicioBase,
          this.fechaInicioComp
        );
      } else {
        this.msgError = 'No se pudieron obtener balances de ambos periodos.';
      }
    })
    .catch((error) => {
      console.error('Error al cargar balances comparados:', error);
      this.msgError = 'Ocurrió un error al cargar los balances.';
    })
    .finally(() => {
      this.showSpinner = false;
    });
}

procesarActivosComparadoDesdeData(
  balancesBase: IBalance[],
  balancesComp: IBalance[],
  fechaInicioBase: string,
  fechaInicioComp: string
): void {
  const fsaMap = new Map<string, IFsa>();
  this.fsas.forEach((f) => fsaMap.set(f.id_fsa, f));

  const agrupado: { [categoria: string]: ComparativoCategoria } = {};

  const annio_base = new Date(fechaInicioBase).getFullYear();
  const annio_comp = new Date(fechaInicioComp).getFullYear();

  // Primero procesar balancesBase
  for (const balance of balancesBase) {
    const fsa = fsaMap.get(balance.id_fsa || '');
    const categoria = fsa?.categoria || 'No mapeados';

    if (!agrupado[categoria]) {
      agrupado[categoria] = {
        categoria,
        totalBase: 0,
        totalComp: 0,
        variacionAbs: 0,
        variacionPct: 0,
        grupos: [],
      };
    }

    const descGrupo = fsa?.desc || 'Sin descripción';

    let grupo = agrupado[categoria].grupos.find((g) => g.desc === descGrupo);

    if (!grupo) {
      grupo = {
        desc: descGrupo,
        annio_base,
        totalBase: 0,
        annio_comp,
        totalComp: 0,
        variacionAbs: 0,
        variacionPct: 0,
        cuentasBase: [],
        cuentasComp: [],
      };
      agrupado[categoria].grupos.push(grupo);
    }

    const saldo = balance.saldo || 0;
    grupo.totalBase += saldo;
    grupo.cuentasBase.push(balance);
  }

  // Luego procesar balancesComp
  for (const balance of balancesComp) {
    const fsa = fsaMap.get(balance.id_fsa || '');
    const categoria = fsa?.categoria || 'No mapeados';

    if (!agrupado[categoria]) {
      agrupado[categoria] = {
        categoria,
        totalBase: 0,
        totalComp: 0,
        variacionAbs: 0,
        variacionPct: 0,
        grupos: [],
      };
    }

    const descGrupo = fsa?.desc || 'Sin descripción';

    let grupo = agrupado[categoria].grupos.find((g) => g.desc === descGrupo);

    if (!grupo) {
      grupo = {
        desc: descGrupo,
        annio_base,
        totalBase: 0,
        annio_comp,
        totalComp: 0,
        variacionAbs: 0,
        variacionPct: 0,
        cuentasBase: [],
        cuentasComp: [],
      };
      agrupado[categoria].grupos.push(grupo);
    }

    const saldo = balance.saldo || 0;
    grupo.totalComp += saldo;
    grupo.cuentasComp.push(balance);
  }

  // Fusión de cuentas y cálculo de variaciones
  for (const categoria of Object.values(agrupado)) {
    for (const grupo of categoria.grupos) {
      grupo.cuentasFusionadas = this.fusionarCuentas(grupo);

      grupo.variacionAbs = grupo.totalBase - grupo.totalComp;
      grupo.variacionPct =
        grupo.totalComp !== 0
          ? (grupo.variacionAbs / grupo.totalComp) * 100
          : 0;

      categoria.totalBase += grupo.totalBase;
      categoria.totalComp += grupo.totalComp;
    }

    categoria.variacionAbs = categoria.totalBase - categoria.totalComp;
    categoria.variacionPct =
      categoria.totalComp !== 0
        ? (categoria.variacionAbs / categoria.totalComp) * 100
        : 0;
  }

  this.vistaActivosComparado = Object.values(agrupado).sort((a, b) =>
    a.categoria === 'No mapeados'
      ? 1
      : b.categoria === 'No mapeados'
      ? -1
      : a.categoria.localeCompare(b.categoria)
  );

  console.log('📊 vistaActivosComparado (por fecha):', this.vistaActivosComparado);
}


imprimirComparativo(): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    console.error('No se pudo abrir la ventana de impresión.');
    return;
  }

  const contenido = this.vistaActivosComparado.map(cat => `
    <h2>Categoría: ${cat.categoria}</h2>
    <p><strong>Total Base:</strong> ${cat.totalBase.toLocaleString()}<br>
       <strong>Total Comparado:</strong> ${cat.totalComp.toLocaleString()}<br>
       <strong>Variación Absoluta:</strong> ${cat.variacionAbs.toLocaleString()}<br>
       <strong>Variación Porcentual:</strong> ${cat.variacionPct.toFixed(2)}%</p>
    <hr>
    ${cat.grupos.map(grupo => `
      <h3>Grupo: ${grupo.desc}</h3>
      <p><strong>Total Base:</strong> ${grupo.totalBase.toLocaleString()}<br>
         <strong>Total Comparado:</strong> ${grupo.totalComp.toLocaleString()}<br>
         <strong>Variación Absoluta:</strong> ${grupo.variacionAbs.toLocaleString()}<br>
         <strong>Variación Porcentual:</strong> ${grupo.variacionPct.toFixed(2)}%</p>
      <table border="1" cellpadding="5" cellspacing="0" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr>
            <th>N° Cuenta</th>
            <th>Nombre</th>
            <th>Saldo Base</th>
            <th>Saldo Comparado</th>
          </tr>
        </thead>
        <tbody>
          ${grupo.cuentasFusionadas?.map(c => `
            <tr>
              <td>${c.num_cuenta}</td>
              <td>${c.nombre}</td>
              <td>${c.saldo_base?.toLocaleString() || '-'}</td>
              <td>${c.saldo_comp?.toLocaleString() || '-'}</td>
            </tr>
          `).join('') || ''}
        </tbody>
      </table>
      <br>
    `).join('')}
  `).join('<hr style="border-top:2px solid #333;">');

  printWindow.document.write(`
    <html>
      <head>
        <title>Reporte Comparativo de Balances</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2 { color: #2c3e50; }
          h3 { color: #34495e; }
          table { margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <h1>Reporte Comparativo de Balances</h1>
        ${contenido}
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}


  // private getBalancesData(): void {
  //   this.showSpinner = true
  //   this.authService.checkAuth().subscribe({
  //     next: (isAuthenticated) => {
  //       if (isAuthenticated) {
  //         this.balanceService.getAllBalances().subscribe({
  //           next: (response) => {
  //             if (response.success && Array.isArray(response.data)) {
  //               this.balances = response.data.filter(
  //                 (b) => b && typeof b.saldo === 'number'
  //               );
  //               this.showSpinner = false
  //               console.log('balance data: ', this.balances);
  //             } else {
  //               this.showSpinner = false
  //               console.warn('Respuesta inválida de balances');
  //               this.balances = [];
  //             }
  //           },
  //           error: (error) => {
  //             this.showSpinner = false
  //             console.error('Error al obtener balances:', error);
  //             this.balances = [];
  //           },
  //         });
  //       } else {
  //         this.showSpinner = false
  //         this.msgError = 'Usuario no autenticado';
  //       }
  //     },
  //     error: () => {
  //       this.showSpinner = false
  //       this.msgError = 'Error al verificar autenticación';
  //     },
  //   });
  // }

}
