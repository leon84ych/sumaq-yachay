import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { BookService } from '../services/book.service';
import { ConfigService } from '../../../../core/services/config/config.service';
import { BookCardComponent } from '../components/book-card/book-card.component';
import { BookFilterComponent } from '../components/book-filter/book-filter.component';
import { BookFormModalComponent } from '../components/book-form-modal/book-form-modal.component';
import { AddBookModalComponent } from '../components/add-book-modal/add-book-modal.component';
import { GoogleAuthService } from '../../../authentication/services/google-auth-service';
import { PermissionService } from '../../../../core/services/permission/permission.service';
import { BookRecord } from '../models/book-item.model';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';

@Component({
  selector: 'app-book',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    BookCardComponent,
    BookFilterComponent,
    BookFormModalComponent,
    AddBookModalComponent,
  ],
  templateUrl: './book.html',
  styleUrl: './book.css',
})
export class BookList {
  readonly bookService = inject(BookService);
  readonly configService = inject(ConfigService);
  readonly authService = inject(GoogleAuthService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;

  private localDBService = inject(LocalDBService);
  private transloco = inject(TranslocoService);

  readonly canAddBook = computed(
    () =>
      !this.configService.isLocalSampleDataEnabled() &&
      !this.bookService.isLoading() &&
      this.bookService.items().length === 0,
  );

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isAddBookModalOpen = signal(false);
  readonly selectedItemForEdit = signal<BookRecord | null>(null);

  openCreateModal(): void {
    this.bookService.errorMessage.set(null);
    this.selectedItemForEdit.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(item: BookRecord): void {
    this.bookService.errorMessage.set(null);
    this.selectedItemForEdit.set(item);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedItemForEdit.set(null);
  }

  async handleSaveItem(
    event: { item: Omit<BookRecord, 'updatedAt' | 'syncStatus'>; isEdit: boolean },
  ): Promise<void> {
    this.bookService.errorMessage.set(null);
    try {
      await this.bookService.saveItem(event.item, event.isEdit);
      this.closeModal();
    } catch (error: unknown) {
      this.bookService.errorMessage.set(
        error instanceof Error && error.message === 'BOOK.ERRORS.duplicateBookId'
          ? error.message
          : 'BOOK.ERRORS.saveItemFailed',
      );
    }
  }

  openAddBookModal(): void {
    if (!this.canAddBook()) return;
    this.bookService.errorMessage.set(null);
    this.isAddBookModalOpen.set(true);
  }

  async handleCloneSource(sheetUrl: string): Promise<void> {
    if (await this.bookService.cloneBookRecordFromSheet(sheetUrl)) this.closeModal();
  }

  async handleAddBook(event: { sheetUrl: string }): Promise<void> {
    if (await this.bookService.addBookFromSheet(event.sheetUrl)) {
      this.isAddBookModalOpen.set(false);
    }
  }

  async handleToggleActive(item: BookRecord): Promise<void> {
    await this.bookService.toggleActive(item);
  }

  async handleDeleteItem(id: string): Promise<void> {
    const confirmMsg = this.transloco.translate('BOOK.CARD.DELETE_CONFIRM');
    const item = this.bookService.items().find((i) => i.id === id);
    if (item && confirm(confirmMsg)) {
      await this.bookService.deleteBookRecord(item);
    }
  }

  async handleSync(): Promise<void> {
    const books = await this.localDBService.indexedDB.books.toArray();

    if (books.length > 0) {
      const confirmMsg = this.transloco.translate('BOOK.HEADER.SYNC_WARNING');
      if (!confirm(confirmMsg)) return;
    }

    await this.bookService.syncFromRemote();
  }
}
