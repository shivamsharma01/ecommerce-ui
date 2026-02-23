import { Component } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import type { Product } from '../../shared/models/product.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CurrencyPipe, MatCardModule, MatButtonModule, MatChipsModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css',
})
export class CatalogComponent {
  // Placeholder data - will be replaced with API call
  protected products: Product[] = [
    {
      id: '1',
      name: 'Sample Product 1',
      price: 29.99,
      description: 'A sample product for the catalog.',
      category: 'Electronics',
    },
    {
      id: '2',
      name: 'Sample Product 2',
      price: 49.99,
      description: 'Another sample product.',
      category: 'Accessories',
    },
    {
      id: '3',
      name: 'Sample Product 3',
      price: 19.99,
      description: 'One more sample product.',
      category: 'General',
    },
  ];
}
