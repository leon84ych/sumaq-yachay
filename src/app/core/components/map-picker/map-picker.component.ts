import { Component, AfterViewInit, OnDestroy, input, output, effect, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';

export interface MapMarker {
  lat: number;
  lng: number;
  title: string;
  color?: string;
}

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="map-container-wrapper" [style.height]="height()">
      <div #mapContainer class="leaflet-map"></div>
    </div>
  `,
  styles: [`
    .map-container-wrapper {
      width: 100%;
      height: 300px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
      margin-top: 0.5rem;
    }
    .leaflet-map {
      width: 100%;
      height: 100%;
      z-index: 1;
    }
  `]
})
export class MapPickerComponent implements AfterViewInit, OnDestroy {
  // Coordenadas iniciales [lat, lng] (por defecto centro genérico o de la obra)
  readonly initialCoords = input<[number, number]>([0, 0]);
  readonly zoom = input<number>(6);
  readonly height = input<string>('300px');
  
  // Si es true, permite hacer clic para mover un pin y emitir coordenadas
  readonly interactive = input<boolean>(true);
  
  // Lista opcional de marcadores múltiples para visualización global
  readonly markers = input<MapMarker[]>([]);

  // Evento que emite las coordenadas seleccionadas al hacer clic
  readonly coordinatesChange = output<string>();

  private mapElement = viewChild.required<ElementRef>('mapContainer');
  private map?: L.Map;
  private currentMarker?: L.Marker;
  private groupMarkers: L.LayerGroup = L.layerGroup();

  constructor() {
    // Reacciona si cambian las coordenadas iniciales externamente
    effect(() => {
      const coords = this.initialCoords();
      if (this.map && this.interactive() && coords) {
        this.updateMainMarker(coords[0], coords[1]);
      }
    });

    // Re-render markers when the display-mode input changes.
    effect(() => {
      const allMarkers = this.markers();
      if (this.map && allMarkers) {
        this.renderAllMarkers(allMarkers);
      }
    });
  }

  ngAfterViewInit(): void {
    const [lat, lng] = this.initialCoords();
    
    // Inicializar mapa de OpenStreetMap
    this.map = L.map(this.mapElement().nativeElement).setView([lat, lng], this.zoom());

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.groupMarkers.addTo(this.map);

    // Si es interactivo, permitir clic para seleccionar ubicación
    if (this.interactive()) {
      this.updateMainMarker(lat, lng);
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        this.updateMainMarker(lat, lng);
        // Emitir en formato plano "lat, lng" compatible con el campo coordinates de Places
        this.coordinatesChange.emit(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      });
    } else {
      this.renderAllMarkers(this.markers());
    }

    // Solución al problema común de renderizado gris en contenedores ocultos/modales
    setTimeout(() => {
      this.map?.invalidateSize();
    }, 150);
  }

  private updateMainMarker(lat: number, lng: number): void {
    if (!this.map) return;
    
    if (this.currentMarker) {
      this.currentMarker.setLatLng([lat, lng]);
    } else {
      this.currentMarker = L.marker([lat, lng], { draggable: this.interactive() }).addTo(this.map);
      
      if (this.interactive()) {
        this.currentMarker.on('dragend', (event) => {
          const marker = event.target;
          const position = marker.getLatLng();
          this.coordinatesChange.emit(`${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`);
        });
      }
    }
    this.map.setView([lat, lng], this.map.getZoom());
  }

  private renderAllMarkers(items: MapMarker[]): void {
    this.groupMarkers.clearLayers();

    const validItems = items.filter(
      (item) =>
        Number.isFinite(item.lat) &&
        Number.isFinite(item.lng) &&
        item.lat >= -90 &&
        item.lat <= 90 &&
        item.lng >= -180 &&
        item.lng <= 180,
    );
    if (validItems.length === 0) {
      return;
    }

    for (const item of validItems) {
      const marker = L.circleMarker([item.lat, item.lng], {
        radius: 9,
        color: 'var(--surface)',
        weight: 2,
        fillColor: item.color || 'var(--primary)',
        fillOpacity: 1,
      });
      const label = document.createElement('span');
      label.textContent = item.title;
      marker.bindTooltip(label, { permanent: true, direction: 'top', offset: [0, -8] });
      this.groupMarkers.addLayer(marker);
    }

    if (validItems.length === 1) {
      this.map?.setView([validItems[0].lat, validItems[0].lng], 12);
      return;
    }

    this.map?.fitBounds(
      L.latLngBounds(validItems.map(({ lat, lng }) => [lat, lng] as L.LatLngTuple)).pad(0.12),
      { maxZoom: 12 },
    );
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}