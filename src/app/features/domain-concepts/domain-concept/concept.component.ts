import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConceptRow } from '../../catalog-detail/models/domain-sheet.model';

@Component({
  selector: 'app-concepts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './concept.component.html',
  styleUrls: ['./concept.component.css'],
})
export class ConceptsComponent {
  readonly rows = input.required<ConceptRow[]>();
}
