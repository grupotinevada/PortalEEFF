import { TestBed } from '@angular/core/testing';

import { DefaultMappingService } from './default-mapping.service';

describe('DefaultMappingService', () => {
  let service: DefaultMappingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DefaultMappingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
