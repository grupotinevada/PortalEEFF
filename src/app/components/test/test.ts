import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-test',
  imports: [CommonModule, ButtonModule],
  templateUrl: './test.html',
  styleUrl: './test.css'
})
export class Test {
filas = [
    { codigo: '110101000', nombre: 'Banco BCI', saldo: 7567730, ejercicio: 2024 },
    { codigo: '110101020', nombre: 'Banco Santander', saldo: 3564608, ejercicio: 2024 },
    { codigo: '110101030', nombre: 'Banco BCI', saldo: 7567730, ejercicio: 2024 },
    { codigo: '110101040', nombre: 'Banco Santander', saldo: 3564608, ejercicio: 2024 }
  ];

  private filaSeleccionada: number | null = null;

  abrirMenu(event: MouseEvent, index: number) {
    event.preventDefault(); // evitar menú nativo
    this.filaSeleccionada = index;

    const menu = document.getElementById('contextMenu')!;
    menu.style.display = 'block';
    menu.style.left = event.pageX + 'px';
    menu.style.top = event.pageY + 'px';

    // ocultar al hacer click afuera
    document.addEventListener('click', () => menu.style.display = 'none', { once: true });
  }

  insertarFila() {
    if (this.filaSeleccionada !== null) {
      this.filas.splice(this.filaSeleccionada + 1, 0, {
        codigo: '',
        nombre: '',
        saldo: 0,
        ejercicio: 2024
      });
    }
  }

}
