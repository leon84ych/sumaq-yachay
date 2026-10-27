import { Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MapMarker, MapPickerComponent } from '../../../../core/components/map-picker/map-picker.component';
import { PlaceRow } from '../../domain-places/model/domain-place-row.model';

@Component({
  selector: 'app-domain-map',
  imports: [TranslocoPipe, MapPickerComponent],
  templateUrl: './domain-map.component.html',
  styleUrl: './domain-map.component.css',
})
export class DomainMapComponent {
  readonly places = input.required<PlaceRow[]>();

  readonly markers = computed<MapMarker[]>(() =>
    this.places().flatMap((place) => {
      const coordinates = this.parseCoordinates(place.coordinates);
      if (!coordinates) {
        return [];
      }

      return [{
        lat: coordinates[0],
        lng: coordinates[1],
        title: place.name,
        color: place.color,
      }];
    }),
  );

  readonly initialCoords = computed<[number, number]>(() => {
    const firstMarker = this.markers()[0];
    return firstMarker ? [firstMarker.lat, firstMarker.lng] : [0, 0];
  });

  private parseCoordinates(value: string | undefined): [number, number] | null {
    const match = value?.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)$/);
    if (!match) {
      return null;
    }

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }

    return [latitude, longitude];
  }
}