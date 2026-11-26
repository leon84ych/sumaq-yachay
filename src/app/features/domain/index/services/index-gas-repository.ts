import { inject, Injectable } from "@angular/core";
import { IndexRaw, IndexRawValues } from "../model/index-model";
import { GASDomainAPI } from "../../../../core/infrastructure/gas/gas-domain-api.service";
import { GASDomainRepositoryAbstract } from "../../../../core/infrastructure/gas/gas-domain-repository-abstract";
import { IndexRecord } from "../model/index-model";
import { IndexGASMapper } from "../model/index-gas.mapper";


@Injectable({
  providedIn: 'root',
})
export class IndexGASRepository extends GASDomainRepositoryAbstract<IndexRecord, IndexRaw, IndexRawValues> {
  
  override domain: string= "INDEX";
  override api = inject(GASDomainAPI<IndexRaw, IndexRawValues>);
  override mapper = inject(IndexGASMapper);



}