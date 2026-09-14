import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefinitionsViewComponent } from '../../../learning-views/definitions-view/definitions-view.component';
import { QuoteGalleryViewComponent } from '../../../learning-views/quote-gallery-view/quote-gallery-view.component';
import { DefinitionRow, DomainSheet, QuoteRow } from '../../models/domain-sheet.model';
import { resolveSheetViewKind } from '../../models/sheet-view.registry';

@Component({
  selector: 'app-sheet-view-resolver',
  standalone: true,
  imports: [CommonModule, DefinitionsViewComponent, QuoteGalleryViewComponent],
  templateUrl: './sheet-view-resolver.component.html',
})
export class SheetViewResolverComponent {
  readonly sheet = input<DomainSheet | null>(null);

  readonly viewKind = computed(() => {
    const current = this.sheet();
    return current ? resolveSheetViewKind(current.name) : 'unsupported';
  });

  readonly definitionRows = computed(() => (this.sheet()?.rows ?? []) as unknown as DefinitionRow[]);
  readonly quoteRows = computed(() => (this.sheet()?.rows ?? []) as unknown as QuoteRow[]);
}
