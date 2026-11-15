
import { inject } from '@angular/core';
import { LocalDBService } from '../../../../shared/local-db/local-db.service';
import { IndexRepository } from './index-repository';


export class IndexService {

    private indexGasRepository = inject(IndexRepository);
    private localDBService = inject(LocalDBService);




}
