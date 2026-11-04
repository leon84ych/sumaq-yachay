import { CatalogRecord } from "../../../features/domain-2/catalog-1/models/catalog-item.model";
import { CatalogRepositoryInterface } from "../catalog-repository-interface";

/**
 * Indexed implementation of all operations 
 */
export class CataloLocalRepository implements CatalogRepositoryInterface {


    getCatalogs(): Promise<CatalogRecord[]> {
        throw new Error("Method not implemented.");
    }

    getCatalogItem(id: string): Promise<unknown> {
        throw new Error("Method not implemented.");
    }

}