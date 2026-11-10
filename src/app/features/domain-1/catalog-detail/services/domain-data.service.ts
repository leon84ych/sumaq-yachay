import { computed, Injectable, signal } from '@angular/core';
import { DomainSheet } from '../models/domain-sheet.model';




@Injectable({
  providedIn: 'root',
})
export class DomainDataService {


  readonly isLoading = signal<boolean>(false);

  readonly sheets = signal<DomainSheet[]>([]);
  readonly sheetNames = computed(() => this.sheets().filter(sheet => sheet.name != 'ID').map((sheet) => sheet.name));


}
