import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProductService } from './product.service';
import type { Product } from '../../shared/models/product.model';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  const sample: Product[] = [
    {
      id: '1',
      name: 'A',
      price: 1,
      description: 'd',
      category: 'c',
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getCatalog requests /api/products', () => {
    service.getCatalog().subscribe((data) => expect(data).toEqual(sample));

    const req = httpMock.expectOne('/api/products');
    expect(req.request.method).toBe('GET');
    req.flush(sample);
  });

  it('search sends q param', () => {
    service.search('phone').subscribe((data) => expect(data).toEqual(sample));

    const req = httpMock.expectOne(
      (r) => r.url === '/api/products/search' && r.params.get('q') === 'phone',
    );
    expect(req.request.method).toBe('GET');
    req.flush(sample);
  });
});
