import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { adminGuard, authGuard, publicGuard } from './core/auth';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      { path: '', redirectTo: 'catalog', pathMatch: 'full' },
      { path: 'home', redirectTo: 'catalog', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/login/login.component').then((m) => m.LoginComponent),
        canActivate: [publicGuard],
      },
      {
        path: 'signup',
        loadComponent: () =>
          import('./features/signup/signup.component').then((m) => m.SignupComponent),
        canActivate: [publicGuard],
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./features/catalog/catalog.component').then((m) => m.CatalogComponent),
      },
      {
        path: 'search',
        loadComponent: () =>
          import('./features/search/search.component').then((m) => m.SearchComponent),
      },
      {
        path: 'products/:id',
        loadComponent: () =>
          import('./features/product-detail/product-detail.component').then(
            (m) => m.ProductDetailComponent,
          ),
      },
      {
        path: 'admin/add-product',
        loadComponent: () =>
          import('./features/admin/admin-add-product.component').then((m) => m.AdminAddProductComponent),
        canActivate: [authGuard, adminGuard],
      },
    ],
  },
  { path: '**', redirectTo: 'catalog' },
];
