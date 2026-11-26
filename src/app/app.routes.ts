import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'catalog',
    pathMatch: 'full',
  },
  {
    path: 'catalog',
    loadComponent: () => import('./features/book/book/book').then((m) => m.BookList),
  },
  {
    path: 'books',
    redirectTo: 'catalog',
    pathMatch: 'full',
  },
  {
    path: 'learn',
    loadComponent: () => import('./features/learn/learn/learn.component').then((m) => m.Learn),
  },
  {
    path: 'quiz',
    loadComponent: () =>
      import('./features/quiz/question-practice/question-practice.component').then(
        (m) => m.QuestionPracticeComponent,
      ),
  },
  {
    path: 'catalog/:id',
    loadComponent: () =>
      import('./features/domain/book-detail/book-detail/book-detail').then((m) => m.BookDetail),
  },
  {
    path: 'books/:id',
    redirectTo: 'catalog/:id',
  },
  {
    path: 'book/:id',
    redirectTo: 'catalog/:id',
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
