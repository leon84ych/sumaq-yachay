import { inject, Injectable } from "@angular/core";
import { IndexGASRepository } from "./index-gas-repository";
import { LocalDBService } from "../../../../shared/local-db/local-db.service";



@Injectable({
  providedIn: 'root',
})
export class IndexService {

    private repository: IndexGASRepository = inject(IndexGASRepository);
    private localDBService = inject(LocalDBService);



    async getAllItems(bookId: number, current: number, total: number) {



        const response = await this.repository.getDomainPaginated(bookId, current, 50);
        const database = this.localDBService.indexedDB;
        await database.transaction('rw', database.indexes, async () => {
            await database.indexes.bulkPut(response.rows);
        });
    }


}