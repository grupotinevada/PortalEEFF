import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserFormModal } from './user-form-modal';

describe('UserFormModal', () => {
  let component: UserFormModal;
  let fixture: ComponentFixture<UserFormModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserFormModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserFormModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
