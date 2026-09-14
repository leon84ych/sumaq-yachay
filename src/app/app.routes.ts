import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'catalog',
    pathMatch: 'full',
  },
  {
    path: 'catalog',
    loadComponent: () =>
      import('./features/catalog/catalog/catalog').then((m) => m.Catalog),
  },
  {
    path: 'catalog/:id',
    loadComponent: () =>
      import('./features/catalog-detail/catalog-detail/catalog-detail').then(
        (m) => m.CatalogDetail
      ),
  },
  {
    path: '**',
    redirectTo: 'catalog',
  },
];
