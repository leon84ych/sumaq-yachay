import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CatalogService } from '../services/catalog.service';
import { ConfigService } from '../../../core/services/config.service';
import { CatalogCardComponent } from '../components/catalog-card/catalog-card.component';
import { CatalogFilterComponent } from '../components/catalog-filter/catalog-filter.component';
import { CatalogFormModalComponent } from '../components/catalog-form-modal/catalog-form-modal.component';
import { AddCatalogModalComponent } from '../components/add-catalog-modal/add-catalog-modal.component';
import { CatalogItem } from '../models/catalog-item.model';
import { GoogleAuthService } from '../../authentication/services/google-auth-service';
import { PermissionService } from '../../../core/services/permission.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    CatalogCardComponent,
    CatalogFilterComponent,
    CatalogFormModalComponent,
    AddCatalogModalComponent,
  ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.css',
})
export class Catalog {
  readonly catalogService = inject(CatalogService);
  readonly configService = inject(ConfigService);
  readonly authService = inject(GoogleAuthService);
  readonly permissionService = inject(PermissionService);
  readonly role = this.permissionService.role;
  private transloco = inject(TranslocoService);
  readonly canAddCatalog = computed(
    () =>
      !this.configService.isLocalSampleDataEnabled() &&
      !this.catalogService.isLoading() &&
      this.catalogService.items().length === 0,
  );

  // Modal State
  readonly isModalOpen = signal<boolean>(false);
  readonly isAddCatalogModalOpen = signal(false);
  readonly selectedItemForEdit = signal<CatalogItem | null>(null);

  openCreateModal(): void {
    this.catalogService.errorMessage.set(null);
    this.selectedItemForEdit.set(null);
    this.isModalOpen.set(true);
  }

  openEditModal(item: CatalogItem): void {
    this.catalogService.errorMessage.set(null);
    this.selectedItemForEdit.set(item);
    this.isModalOpen.set(true);
  }

  closeModal(): void {
    this.isModalOpen.set(false);
    this.selectedItemForEdit.set(null);
  }

  async handleSaveItem(
    event: { item: Omit<CatalogItem, 'updatedAt' | 'syncStatus'>; isEdit: boolean },
  ): Promise<void> {
    await this.catalogService.saveItem(event.item, event.isEdit);
    this.closeModal();
  }

  openAddCatalogModal(): void {
    if (!this.canAddCatalog()) return;
    this.catalogService.errorMessage.set(null);
    this.isAddCatalogModalOpen.set(true);
  }

  async handleCloneSource(sheetUrl: string): Promise<void> {
    if (await this.catalogService.cloneCatalogItemFromSheet(sheetUrl)) this.closeModal();
  }

  async handleAddCatalog(event: { sheetUrl: string }): Promise<void> {
    if (await this.catalogService.addCatalogFromSheet(event.sheetUrl)) {
      this.isAddCatalogModalOpen.set(false);
    }
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
