import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarBalance } from './editar-balance';

describe('EditarBalance', () => {
  let component: EditarBalance;
  let fixture: ComponentFixture<EditarBalance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditarBalance]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditarBalance);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
