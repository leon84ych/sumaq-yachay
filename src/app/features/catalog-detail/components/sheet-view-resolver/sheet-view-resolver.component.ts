import { Component, computed, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConceptsComponent } from '../../../domain-concepts/domain-concept/concept.component';
import { QuoteGalleryComponent } from '../../../domain-quotes/domain-quote/quote-gallery.component';
import { PassageComponent } from '../../../domain-passages/domain-passage/passage.component';
import { ConceptRow, DomainSheet, PassagesRow, QuoteRow } from '../../models/domain-sheet.model';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  IndexViewComponent,
  IndexViewRow,
} from '../../../domain-index/domain-index/index-view.component';
import { DomainDataService } from '../../services/domain-data.service';

@Component({
  selector: 'app-sheet-view-resolver',
  standalone: true,
  imports: [
    CommonModule,
    TranslocoPipe,
    IndexViewComponent,
    ConceptsComponent,
    QuoteGalleryComponent,
    PassageComponent,
  ],
  templateUrl: './sheet-view-resolver.component.html',
})
export class SheetViewResolverComponent {
  readonly domainDataService = inject(DomainDataService);
  readonly sheet = input<DomainSheet | null>(null);
  readonly bookName = input<string>('');
  readonly bookAuthor = input<string>('');

  readonly isAddingEntry = input<boolean>(false);
  readonly closeEntry = output<void>();

  readonly viewKind = computed(() => {
    const current = this.sheet();
    return current ? current.name : 'unsupported';
  });

  readonly currentSheet = computed(() => this.sheet() as DomainSheet);
  readonly conceptRows = computed(() => (this.sheet()?.rows ?? []) as unknown as ConceptRow[]);
  readonly quoteRows = computed(() => (this.sheet()?.rows ?? []) as unknown as QuoteRow[]);
  readonly passageRows = computed(() => (this.sheet()?.rows ?? []) as unknown as PassagesRow[]);
  readonly indexRows = computed(() => (this.sheet()?.rows ?? []) as unknown as IndexViewRow[]);
}
