import { CatalogItem } from '../models/catalog-item.model';
import { CatalogRowValues } from '../models/catalog-api.model';

export function mapCatalogItemToRowValues(item: CatalogItem): CatalogRowValues {
  return [
    item.id,
    item.subject || '',
    item.topic || '',
    item.name || '',
    item.author || '',
    item.description || '',
    item.source || 'PDF',
    item.active ?? true,
    item.updatedAt || new Date().toISOString(),
    item.count ?? 0,
    item.syncStatus || 'pending',
  ];
}
