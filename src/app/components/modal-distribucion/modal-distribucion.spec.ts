import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalDistribucion } from './modal-distribucion';

describe('ModalDistribucion', () => {
  let component: ModalDistribucion;
  let fixture: ComponentFixture<ModalDistribucion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalDistribucion]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalDistribucion);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
