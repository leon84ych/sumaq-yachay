import { inject, Injectable } from "@angular/core";
import { IndexRaw, IndexRawValues } from "../model/index-model";
import { GASDomainAPI } from "../../../../core/infrastructure/gas/gas-domain-api.service";
import { GASDomainRepositoryAbstract } from "../../../../core/infrastructure/gas/gas-domain-repository-abstract";


@Injectable({
  providedIn: 'root',
})
export class IndexGASRepository extends  GASDomainRepositoryAbstract<IndexRaw, IndexRawValues> {
  
  override domain: string= "INDEX";
  override api = inject(GASDomainAPI<IndexRaw, IndexRawValues>);


}