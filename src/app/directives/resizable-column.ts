import { Directive, ElementRef, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appResizableColumn]'
})
export class ResizableColumn implements OnInit, OnDestroy {
  
  // El ancho mínimo prudente que pediste. 
  @Input() minWidthPx: number = 120;

  private startX: number = 0;
  private startWidth: number = 0;
  private table: HTMLTableElement | null = null;
  private handle: HTMLDivElement | null = null;
  
  // --- NUEVO ---
  // Guardaremos el ancho inicial de la TABLA al empezar a arrastrar
  private tableStartWidth: number = 0; 
  // --- FIN NUEVO ---

  private onMouseMoveBound: (event: MouseEvent) => void;
  private onMouseUpBound: (event: MouseEvent) => void;

  constructor(private el: ElementRef<HTMLElement>, private renderer: Renderer2) {
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
  }

  ngOnInit(): void {
    this.table = this.el.nativeElement.closest('table');
    if (!this.table) return;

    this.handle = this.renderer.createElement('div');
    this.renderer.addClass(this.handle, 'resize-handle');
    this.renderer.appendChild(this.el.nativeElement, this.handle);

    this.renderer.setStyle(this.el.nativeElement, 'position', 'relative');
    this.renderer.listen(this.handle, 'mousedown', (event: MouseEvent) => {
      this.onMouseDown(event);
    });
  }

  private onMouseDown(event: MouseEvent): void {
    event.preventDefault(); 
    event.stopPropagation(); 

    this.startX = event.pageX;
    this.startWidth = this.el.nativeElement.offsetWidth;
    
    // --- ACTUALIZADO ---
    // 1. Guardamos el ancho inicial de la TABLA
    this.tableStartWidth = this.table!.offsetWidth; 

    // 2. Aplicamos 'table-layout: fixed'
    this.renderer.setStyle(this.table, 'table-layout', 'fixed');

    // 3. Fijamos el ancho actual de la tabla en píxeles.
    //    Esto la "libera" del 'min-width: 100%' y permite que CREZCA
    //    en lugar de forzar a las otras columnas a encogerse.
    this.renderer.setStyle(this.table, 'width', `${this.tableStartWidth}px`);
    // --- FIN ACTUALIZADO ---

    document.addEventListener('mousemove', this.onMouseMoveBound);
    document.addEventListener('mouseup', this.onMouseUpBound);
  }

  private onMouseMove(event: MouseEvent): void {
    // Delta (cambio) desde el inicio del arrastre
    const dx = event.pageX - this.startX;

    // --- ACTUALIZADO ---
    // 1. Calculamos el nuevo ancho de la COLUMNA
    let newColumnWidth = this.startWidth + dx;
    if (newColumnWidth < this.minWidthPx) {
      newColumnWidth = this.minWidthPx;
    }
    this.renderer.setStyle(this.el.nativeElement, 'width', `${newColumnWidth}px`);

    // 2. (NUEVO) Calculamos y aplicamos el nuevo ancho de la TABLA
    // El 'dx' (delta) se calcula solo una vez aquí, basado en el inicio.
    const deltaChange = newColumnWidth - this.startWidth;
    const newTableWidth = this.tableStartWidth + deltaChange;
    
    this.renderer.setStyle(this.table, 'width', `${newTableWidth}px`);
    // --- FIN ACTUALIZADO ---
  }

  private onMouseUp(): void {
    document.removeEventListener('mousemove', this.onMouseMoveBound);
    document.removeEventListener('mouseup', this.onMouseUpBound);
  }

  ngOnDestroy(): void {
    if (this.handle) {
      this.renderer.removeChild(this.el.nativeElement, this.handle);
    }
    this.onMouseUp(); 
  }
}
