import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalDetalle } from './modal-detalle';

describe('ModalDetalle', () => {
  let component: ModalDetalle;
  let fixture: ComponentFixture<ModalDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDetalle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
