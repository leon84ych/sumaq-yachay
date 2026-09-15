import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CatalogService } from '../services/catalog.service';
import { ConfigService } from '../../../core/services/config.service';
import { CatalogCardComponent } from '../components/catalog-card/catalog-card.component';
import { CatalogFilterComponent } from '../components/catalog-filter/catalog-filter.component';
import { CatalogFormModalComponent } from '../components/catalog-form-modal/catalog-form-modal.component';
import { CatalogItem } from '../models/catalog-item.model';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    CatalogCardComponent,
    CatalogFilterComponent,
    CatalogFormModalComponent,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog {
  readonly catalogService = inject(CatalogService);
  readonly configService = inject(ConfigService);
  private transloco = inject(TranslocoService);

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly selectedItemForEdit = signal<CatalogItem | null>(null);

  openCreateModal(): void {
    this.selectedItemForEdit.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(item: CatalogItem): void {
    this.selectedItemForEdit.set(item);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedItemForEdit.set(null);
  }

  async handleSaveItem(event: {
    item: Omit<CatalogItem, 'updatedAt' | 'syncStatus'>;
    isEdit: boolean;
  }): Promise<void> {
    await this.catalogService.saveItem(event.item, event.isEdit);
    this.closeModal();
  }

  async handleToggleActive(item: CatalogItem): Promise<void> {
    await this.catalogService.toggleActive(item);
  }

  async handleDeleteItem(id: string): Promise<void> {
    const confirmMsg = this.transloco.translate('CATALOG.CARD.DELETE_CONFIRM');
    if (confirm(confirmMsg)) {
      await this.catalogService.deleteItem(id);
    }
  }

  async handleSync(): Promise<void> {
    await this.catalogService.syncFromRemote();
  }
}
