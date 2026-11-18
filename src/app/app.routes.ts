import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'books',
    pathMatch: 'full',
  },
  {
    path: 'books',
    loadComponent: () => import('./features/book/book/book').then((m) => m.BookList),
  },
  {
    path: 'catalog',
    redirectTo: 'books',
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
    path: 'books/:id',
    loadComponent: () =>
      import('./features/domain-1/book-detail/book-detail/book-detail').then((m) => m.BookDetail),
  },
  {
    path: 'catalog/:id',
    redirectTo: 'books/:id',
  },
  {
    path: 'book/:id',
    redirectTo: 'books/:id',
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
    redirectTo: 'books',
  },
];
