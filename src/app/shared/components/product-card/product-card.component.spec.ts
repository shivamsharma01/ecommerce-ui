import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ProductCardComponent } from './product-card.component';
import type { Product } from '../../models/product.model';

describe('ProductCardComponent', () => {
  let fixture: ComponentFixture<ProductCardComponent>;

  const product: Product = {
    id: '1',
    name: 'Test',
    price: 9.99,
    description: 'Desc',
    category: 'Cat',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProductCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders product name and category', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Test');
    expect(el.textContent).toContain('Cat');
  });
});
