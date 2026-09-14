import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DefinitionRow } from '../../catalog-detail/models/domain-sheet.model';

@Component({
  selector: 'app-definitions-view',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './definitions-view.component.html',
  styleUrls: ['./definitions-view.component.css'],
})
export class DefinitionsViewComponent {
  readonly rows = input.required<DefinitionRow[]>();
}
