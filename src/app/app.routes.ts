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
    path: '**',
    redirectTo: 'catalog',
  },
];
