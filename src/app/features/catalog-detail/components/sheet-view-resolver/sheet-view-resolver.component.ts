import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConceptsComponent } from '../../../domain-concepts/domain-concept/concept.component';
import { QuoteGalleryComponent } from '../../../domain-quotes/domain-quote/quote-gallery.component';
import { ConceptRow, DomainSheet, IndexRow, QuoteRow } from '../../models/domain-sheet.model';
import { TranslocoPipe } from '@jsverse/transloco';
import { IndexComponent } from '../../../domain-index/domain-index/domain-index';

@Component({
  selector: 'app-sheet-view-resolver',
  standalone: true,
  imports: [CommonModule, TranslocoPipe, IndexComponent, ConceptsComponent, QuoteGalleryComponent],
  templateUrl: './sheet-view-resolver.component.html',
})
export class SheetViewResolverComponent {
  readonly sheet = input<DomainSheet | null>(null);

  readonly viewKind = computed(() => {
    const current = this.sheet();
    return current ? current.name : 'unsupported';
  });

  readonly conceptRows = computed(() => (this.sheet()?.rows ?? []) as unknown as ConceptRow[]);
  readonly quoteRows = computed(() => (this.sheet()?.rows ?? []) as unknown as QuoteRow[]);
  readonly indexRows = computed(() => (this.sheet()?.rows ?? []) as unknown as IndexRow[]);
}
