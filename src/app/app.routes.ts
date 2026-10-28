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
    path: 'learn',
    loadComponent: () => import('./features/learn/learn/learn.component').then((m) => m.Learn),
  },
  {
    path: 'quiz',
    loadComponent: () =>
      import('./features/domain/domain-questions/practice/question-practice.component').then(
        (m) => m.QuestionPracticeComponent,
      ),
  },
  {
    path: 'catalog/:id',
    loadComponent: () =>
      import('./features/catalog-detail/catalog-detail/catalog-detail').then(
        (m) => m.CatalogDetail
      ),
  },
  {
    path: 'documentation',
    loadComponent: () =>
      import('./features/documentation/documentation.component').then((m) => m.DocumentationComponent),
  },
  {
    path: 'documentation/:manual',
    loadComponent: () =>
      import('./features/documentation/documentation.component').then((m) => m.DocumentationComponent),
  },
  {
    path: '**',
    redirectTo: 'catalog',
  },
];
