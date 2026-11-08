
import { CatalogRecord } from "../../../features/domain-1/catalog/models/catalog-item.model";
import { CatalogResponse } from "../../../features/domain-1/shared/model/domain-shared-model";
import { CatalogRepositoryInterface } from "../catalog-repository-interface";

/**
 * Indexed implementation of all operations 
 */
export class CataloLocalRepository implements CatalogRepositoryInterface {


    getCatalogs(page: number, pageSize: number): Promise<CatalogResponse<CatalogRecord>> {
        throw new Error("Method not implemented.");
    }


    createItem(item: CatalogRecord): CatalogResponse<CatalogRecord> {
        throw new Error("Method not implemented.");
    }


    updateItem(item: CatalogRecord): CatalogResponse<CatalogRecord> {
        throw new Error("Method not implemented.");
    }


    deleteItem(catalogItemId: string): CatalogResponse<string> {
        throw new Error("Method not implemented.");
    }




}