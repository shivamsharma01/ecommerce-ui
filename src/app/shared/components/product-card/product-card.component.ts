import { Component, input } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import type { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CurrencyPipe, RouterLink, MatCardModule, MatButtonModule, MatChipsModule],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  readonly product = input.required<Product>();

  protected primaryImage(): string | null {
    return this.product().gallery?.[0]?.thumbnailUrl ?? null;
  }
}
