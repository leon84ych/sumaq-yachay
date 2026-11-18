import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';

import { BookSyncBadgeComponent } from '../book-sync-badge/book-sync-badge.component';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { BookRecord } from '../../models/book-item.model';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslocoPipe, BookSyncBadgeComponent],
  templateUrl: './book-card.component.html', // Fixed property name
  styleUrls: ['./book-card.component.css'],  // Fixed property name and converted to array
})
export class BookCardComponent {
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  readonly item = input.required<BookRecord>();
  readonly highlighted = input(false);
  readonly progress = computed(() => {
    const { page, pages } = this.item();
    return pages > 0 ? Math.min(100, Math.max(0, Math.round((page / pages) * 100))) : 0;
  });
  readonly toggleActive = output<BookRecord>();
  readonly edit = output<BookRecord>();
  readonly delete = output<string>();
}

