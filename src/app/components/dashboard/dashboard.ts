import { Component, OnInit } from '@angular/core';
import { IBalance } from '../../models/balance.model';
import { IFsa } from '../../models/fsa.model';
import { BalanceService } from '../../services/balance';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Navbar } from "../navbar/navbar";
import { Spinner } from '../spinner/spinner';
import { FormsModule } from '@angular/forms';
import { MatExpansionModule } from '@angular/material/expansion';

interface CuentaComparada {
  num_cuenta: string;
  nombre: string;
  saldo_base?: number;
  saldo_comp?: number;
}


interface VistaCategoria {
  categoria: string;
  totalCategoria: number;
  grupos: {
    desc: string;
    totalFsa: number;
    cuentas: IBalance[];
  }[];
}
interface ComparativoFsa {
  desc: string;
  annio_base: number;
  totalBase: number;
  annio_comp: number;
  totalComp: number;
  variacionAbs: number;
  variacionPct: number;
  cuentasBase: IBalance[];
  cuentasComp: IBalance[];
  cuentasFusionadas?: CuentaComparada[];
}

interface ComparativoCategoria {
  categoria: string;
  totalBase: number;
  totalComp: number;
  variacionAbs: number;
  variacionPct: number;
  grupos: ComparativoFsa[];
}

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

  gruposExpandido: { [clave: string]: boolean } = {};

  constructor(
    private balanceService: BalanceService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.getBalancesData();
    this.getFsaData();
  }

  private getBalancesData(): void {
    this.showSpinner = true
    this.authService.checkAuth().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          this.balanceService.getAllBalances().subscribe({
            next: (response) => {
              if (response.success && Array.isArray(response.data)) {
                this.balances = response.data.filter(
                  (b) => b && typeof b.saldo === 'number'
                );
                this.showSpinner = false
                console.log('balance data: ', this.balances);
              } else {
                this.showSpinner = false
                console.warn('Respuesta inválida de balances');
                this.balances = [];
              }
            },
            error: (error) => {
              this.showSpinner = false
              console.error('Error al obtener balances:', error);
              this.balances = [];
            },
          });
        } else {
          this.showSpinner = false
          this.msgError = 'Usuario no autenticado';
        }
      },
      error: () => {
        this.showSpinner = false
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
            next: (data) => {
              if (Array.isArray(data)) {
                this.fsas = data.filter(
                  (f) => f.id_fsa && f.desc && f.id_cate && f.categoria
                );
                this.showSpinner = false;
                console.log('fsa data cargada:', this.fsas);
              } else {
                this.showSpinner = false;
                console.warn('Respuesta inválida del servicio FSA');
                this.fsas = [];
              }
            },
            error: (error) => {
              this.showSpinner = false;
              console.error('Error al obtener FSA:', error);
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

  procesarActivosComparado(annio_base: number, annio_comp: number): void {
    const fsaMap = new Map<string, IFsa>();
    this.fsas.forEach((f) => fsaMap.set(f.id_fsa, f));

    const agrupado: { [categoria: string]: ComparativoCategoria } = {};

    for (const balance of this.balances) {
      const annio = new Date(balance.fecha_procesado).getFullYear();
      if (annio !== annio_base && annio !== annio_comp) continue;

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

      if (annio === annio_base) {
        
        grupo.totalBase += saldo;
        grupo.cuentasBase.push(balance);
      } else if (annio === annio_comp) {
        grupo.totalComp += saldo;
        grupo.cuentasComp.push(balance);
        
      }
    grupo.cuentasFusionadas = this.fusionarCuentas(grupo);
    }

    

    // Cálculo de variaciones
    for (const categoria of Object.values(agrupado)) {
      for (const grupo of categoria.grupos) {
        
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

    // Resultado ordenado
    this.vistaActivosComparado = Object.values(agrupado).sort((a, b) =>
      a.categoria === 'No mapeados'
        ? 1
        : b.categoria === 'No mapeados'
        ? -1
        : a.categoria.localeCompare(b.categoria)
    );
    
    console.log('📊 vistaActivosComparado:', this.vistaActivosComparado);
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


}
